/**
 * Keep the Resend contact list at most LIST_WINDOW_LIMIT people — "the latest 1,000" window
 * (kimny 2026-10-30 「どうぞ。OK」・conductor).
 *
 * ★Why: the Resend marketing plan is now the free tier (1,000 contacts, counted across the whole
 *   account, not per segment).
 *
 * ★When: AFTER a new contact is created, and after the response — scheduleListTrim() hands the work
 *   to next/server's after(). Counting pages through every contact (10 calls at 1,000) and, with no
 *   unsubscribed contact to remove, reads every sent broadcast's opens and clicks (about 30 more):
 *   1–5 s that a person waiting for their download link should not wait (conductor 10/30). The add
 *   itself stays where it was, so its result (the caller's alert, demo_signups.audience_added) is
 *   still known before the response. For a moment the account holds 1,001; Resend kept accepting
 *   creates over the limit (conductor 10/30: POST /contacts 201 at 1,277), so the add is not lost.
 *
 * trimToLimit() removes contacts until the account is back at LIST_WINDOW_LIMIT (at most
 * MAX_REMOVALS per run), in this order:
 *   1. unsubscribed contacts, oldest created_at first;
 *   2. subscribed contacts with no open and no click on any sent broadcast, oldest first
 *      (GET /broadcasts/{id}/recipients?type=opened|clicked — the per-person record, measured
 *      2026-10-30).
 *   Nobody who opened or clicked is removed. If no one qualifies, nothing is removed (logged).
 *
 * ★Resend only. Nothing here reads or writes the DB.
 * ★Logs carry counts and outcomes only — never an email or a contact id.
 * ★Never throws. A failure is logged at error and alerted at most once a day (the same as a failed add).
 * ★Rate limit: Resend allows 10 req/s per account. Calls here are spaced CALL_GAP_MS apart (≤ 8/s).
 *   Two sign-ups at the same moment each trim, and each sees the other's contact — at worst one extra
 *   person comes off; the count still ends at or under the limit.
 */
import { after } from "next/server";
import { logger } from "@/lib/utils/logger";
import { alertListTrimFailed } from "@/lib/plugins/audience-alert";

export const LIST_WINDOW_LIMIT = 1000;
const MAX_REMOVALS = 5; // one per sign-up is the normal case; a backlog is cleared a few at a time
const CALL_GAP_MS = 125;
const PAGE = 100;
const MAX_PAGES = 50; // 5,000 contacts — far past the limit; stops a runaway cursor

export type WindowContact = { id: string; created_at: string; unsubscribed: boolean };
export type TrimResult =
  | { outcome: "within"; total: number } //                     at or under the limit — nothing removed
  | { outcome: "trimmed"; total: number; unsubscribed: number; noEngagement: number }
  | { outcome: "short"; total: number; unsubscribed: number; noEngagement: number } // removed what qualified, still over
  | { outcome: "failed" };

/** The minimal HTTP surface used here, so tests can drive it without the network. */
export type ResendHttp = (method: "GET" | "DELETE", path: string) => Promise<{ status: number; body: unknown }>;

export function resendHttp(apiKey: string): ResendHttp {
  return async (method, path) => {
    const res = await fetch(`https://api.resend.com${path}`, { method, headers: { Authorization: `Bearer ${apiKey}` } });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  };
}

const byAge = (a: WindowContact, b: WindowContact) =>
  a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Who goes first, `count` of them. Pure — the order is the whole policy, so it is tested on its own. */
export function pickEvictions(
  contacts: WindowContact[],
  engagedIds: ReadonlySet<string>,
  count: number,
): Array<{ id: string; reason: "unsubscribed" | "no_engagement" }> {
  const unsub = contacts.filter((c) => c.unsubscribed).sort(byAge).map((c) => ({ id: c.id, reason: "unsubscribed" as const }));
  const cold = contacts
    .filter((c) => !c.unsubscribed && !engagedIds.has(c.id))
    .sort(byAge)
    .map((c) => ({ id: c.id, reason: "no_engagement" as const }));
  return [...unsub, ...cold].slice(0, Math.max(0, count));
}

type ListBody = { data?: Array<Record<string, unknown>>; has_more?: boolean };

async function listAll(http: ResendHttp, base: string, gap: () => Promise<void>): Promise<Array<Record<string, unknown>>> {
  const out: Array<Record<string, unknown>> = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    await gap();
    const sep = base.includes("?") ? "&" : "?";
    const { status, body } = await http("GET", `${base}${sep}limit=${PAGE}${after ? `&after=${after}` : ""}`);
    const list = body as ListBody | null;
    if (status !== 200 || !Array.isArray(list?.data)) throw new Error(`list ${base.replace(/\?.*/, "")} → ${status}`);
    out.push(...list.data);
    if (!list.has_more || list.data.length === 0) return out;
    after = String(list.data[list.data.length - 1].id);
  }
  throw new Error(`list ${base.replace(/\?.*/, "")} did not end`);
}

export async function trimToLimit(
  http: ResendHttp,
  tag: string,
  opts: { limit?: number; gapMs?: number } = {},
): Promise<TrimResult> {
  const limit = opts.limit ?? LIST_WINDOW_LIMIT;
  const gapMs = opts.gapMs ?? CALL_GAP_MS;
  const gap = () => (gapMs > 0 ? new Promise<void>((r) => setTimeout(r, gapMs)) : Promise.resolve());
  try {
    const contacts = (await listAll(http, "/contacts", gap)).map((c) => ({
      id: String(c.id),
      created_at: String(c.created_at),
      unsubscribed: c.unsubscribed === true,
    }));
    const over = contacts.length - limit;
    if (over <= 0) return { outcome: "within", total: contacts.length };
    const want = Math.min(over, MAX_REMOVALS);

    // Engagement is read only when the unsubscribed contacts alone cannot make the room.
    const engaged = new Set<string>();
    if (contacts.filter((c) => c.unsubscribed).length < want) {
      await gap();
      const { status, body } = await http("GET", "/broadcasts");
      const broadcasts = (body as ListBody | null)?.data;
      if (status !== 200 || !Array.isArray(broadcasts)) throw new Error(`list /broadcasts → ${status}`);
      for (const b of broadcasts.filter((b) => b.status === "sent")) {
        for (const type of ["opened", "clicked"] as const) {
          for (const r of await listAll(http, `/broadcasts/${String(b.id)}/recipients?type=${type}`, gap)) {
            engaged.add(String(r.contact_id));
          }
        }
      }
    }

    const victims = pickEvictions(contacts, engaged, want);
    let unsubscribed = 0;
    let noEngagement = 0;
    for (const v of victims) {
      await gap();
      const { status } = await http("DELETE", `/contacts/${v.id}`);
      // 404 = removed in the meantime (another sign-up's trim) — it is gone either way.
      if (status !== 200 && status !== 404) throw new Error(`delete → ${status}`);
      if (v.reason === "unsubscribed") unsubscribed++;
      else noEngagement++;
    }
    const total = contacts.length - victims.length;
    const outcome = total > limit ? "short" : "trimmed";
    const log = outcome === "short" ? logger.error : logger.warn;
    log(`[list-window ${tag}] over the limit — removed ${victims.length}${outcome === "short" ? ", still over" : ""}`, {
      before: contacts.length,
      total,
      limit,
      unsubscribed,
      noEngagement,
    });
    return { outcome, total, unsubscribed, noEngagement };
  } catch (err) {
    logger.error(`[list-window ${tag}] could not trim the list`, { error: String(err instanceof Error ? err.message : err) });
    return { outcome: "failed" };
  }
}

/**
 * Trim after the response (next/server after()). Outside a request scope (scripts, some tests) after()
 * throws — then the trim simply runs in the background. Never throws, never blocks the caller.
 */
export function scheduleListTrim(tag: string): void {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const run = async () => {
    const r = await trimToLimit(resendHttp(apiKey), tag);
    if (r.outcome === "failed" || r.outcome === "short") await alertListTrimFailed(tag).catch(() => undefined);
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
