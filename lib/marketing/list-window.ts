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
 *   still known before the response. For a moment the account holds 1,001 — IF Resend accepts a create
 *   past the limit. That is unmeasured (conductor 10/30: the creates seen accepted at 1,277 were inside the
 *   old 5,000 plan), so a REFUSED create calls makeRoomAfterRejection() and the add is tried once more.
 *
 * trimToLimit() removes contacts until the account is back at LIST_WINDOW_LIMIT (at most
 * MAX_REMOVALS per run), in this order:
 *   1. unsubscribed contacts, oldest created_at first;
 *   2. subscribed contacts with no open and no click on any sent broadcast, oldest first
 *      (GET /broadcasts/{id}/recipients?type=opened|clicked — the per-person record, measured
 *      2026-10-30).
 *   Nobody who opened or clicked is removed. If no one qualifies, nothing is removed (logged).
 *
 * ★The DB, once: before an UNSUBSCRIBED contact is removed, its withdrawal is written to news_list_events
 *   (surface 'resend_footer', occurred_at NULL — Resend does not say when they unsubscribed; conductor 10/30). If that
 *   write fails, that person is NOT removed (the next run tries again) — so a withdrawal never leaves Resend before it
 *   is in our record. Nothing else here touches the DB; the no-engagement removals write nothing.
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

export type WindowContact = { id: string; created_at: string; unsubscribed: boolean; email?: string };
/** Writes a found-in-Resend withdrawal to our record; true = written. Injected in tests. */
export type RecordWithdrawal = (email: string) => Promise<boolean>;

// ★Imported lazily so that loading this module (every add path) does not load the DB client.
const recordFooterWithdrawal: RecordWithdrawal = async (email) => {
  const { recordNewsListEvent } = await import("@/lib/marketing/news-list-events");
  return recordNewsListEvent({ email, status: "withdrawn", surface: "resend_footer", source: "list_trim", occurredAt: null });
};
export type TrimResult =
  | { outcome: "within"; total: number } //                     at or under the limit — nothing removed
  | { outcome: "trimmed"; total: number; unsubscribed: number; noEngagement: number; notRecorded: number }
  | { outcome: "short"; total: number; unsubscribed: number; noEngagement: number; notRecorded: number } // still over
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

/** Every candidate, in removal order (the caller stops when it has made enough room). */
export function evictionOrder(contacts: WindowContact[], engagedIds: ReadonlySet<string>) {
  return pickEvictions(contacts, engagedIds, contacts.length);
}

/** A field the policy depends on must be a non-empty string — otherwise the run fails closed. */
function requireString(v: unknown, what: string): string {
  if (typeof v !== "string" || v === "") throw new Error(`${what} missing or not a string`);
  return v;
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
  opts: { limit?: number; gapMs?: number; recordWithdrawal?: RecordWithdrawal } = {},
): Promise<TrimResult> {
  const limit = opts.limit ?? LIST_WINDOW_LIMIT;
  const recordWithdrawal = opts.recordWithdrawal ?? recordFooterWithdrawal;
  const gapMs = opts.gapMs ?? CALL_GAP_MS;
  const gap = () => (gapMs > 0 ? new Promise<void>((r) => setTimeout(r, gapMs)) : Promise.resolve());
  try {
    const contacts = (await listAll(http, "/contacts", gap)).map((c) => ({
      id: requireString(c.id, "contact id"),
      created_at: requireString(c.created_at, "contact created_at"),
      unsubscribed: c.unsubscribed === true,
      email: typeof c.email === "string" ? c.email : undefined,
    }));
    const over = contacts.length - limit;
    if (over <= 0) return { outcome: "within", total: contacts.length };
    const want = Math.min(over, MAX_REMOVALS);

    const byId = new Map(contacts.map((c) => [c.id, c]));
    let removed = 0;
    let unsubscribed = 0;
    let noEngagement = 0;
    let notRecorded = 0;
    const remove = async (id: string) => {
      await gap();
      const { status } = await http("DELETE", `/contacts/${id}`);
      // 404 = removed in the meantime (another sign-up's trim) — it is gone either way.
      if (status !== 200 && status !== 404) throw new Error(`delete → ${status}`);
      removed++;
    };

    // 1. Unsubscribed, oldest first — each one's withdrawal goes into our record first; if it cannot, they stay
    //    in Resend (and in the next run's list).
    for (const v of evictionOrder(contacts.filter((c) => c.unsubscribed), new Set())) {
      if (removed >= want) break;
      const email = byId.get(v.id)?.email;
      const recorded = email ? await recordWithdrawal(email).catch(() => false) : false;
      if (!recorded) {
        notRecorded++;
        continue;
      }
      await remove(v.id);
      unsubscribed++;
    }

    // 2. Still short: no open and no click, oldest first. ★Engagement is read HERE, right before anyone subscribed is
    //    considered — never skipped because unsubscribed contacts existed (a failed withdrawal write must not turn
    //    into "nobody opened").
    if (removed < want) {
      const engaged = new Set<string>();
      await gap();
      const { status, body } = await http("GET", "/broadcasts");
      const broadcasts = (body as ListBody | null)?.data;
      if (status !== 200 || !Array.isArray(broadcasts)) throw new Error(`list /broadcasts → ${status}`);
      const sent = broadcasts.filter((b) => b.status === "sent");
      // ★Fail CLOSED (CCO #1320): an engagement read that comes back empty makes everyone look cold, and
      //   then the oldest person who DID open is deleted with no alert. Each way it could come back empty
      //   is an error here — so the run is "failed" (0 more deletes, alerted), never "trimmed".
      if (broadcasts.length > 0 && sent.length === 0) throw new Error("broadcasts listed, none with status 'sent'");
      for (const b of sent) {
        for (const type of ["opened", "clicked"] as const) {
          for (const r of await listAll(http, `/broadcasts/${requireString(b.id, "broadcast id")}/recipients?type=${type}`, gap)) {
            // ★null = that recipient's contact has since been deleted (measured 2026-10-30 14:3xZ, after the 277
            //   deletes: 163 of 1,958 records null, 0 with the key missing). They are not on the list, so there is
            //   no one to keep — skip. A MISSING key or any other non-string still fails closed (CCO #1320).
            if (r.contact_id === null) continue;
            engaged.add(requireString(r.contact_id, "recipient contact_id"));
          }
        }
      }
      if (sent.length > 0 && engaged.size === 0) throw new Error("sent broadcasts but no opens or clicks read");
      for (const v of evictionOrder(contacts.filter((c) => !c.unsubscribed), engaged)) {
        if (removed >= want) break;
        await remove(v.id);
        noEngagement++;
      }
    }

    const total = contacts.length - removed;
    const outcome = total > limit ? "short" : "trimmed";
    const log = outcome === "short" ? logger.error : logger.warn;
    log(`[list-window ${tag}] over the limit — removed ${removed}${outcome === "short" ? ", still over" : ""}`, {
      before: contacts.length,
      total,
      limit,
      unsubscribed,
      noEngagement,
      notRecorded,
    });
    return { outcome, total, unsubscribed, noEngagement, notRecorded };
  } catch (err) {
    logger.error(`[list-window ${tag}] could not trim the list`, { error: String(err instanceof Error ? err.message : err) });
    return { outcome: "failed" };
  }
}

export type RoomAfterRejection = { outcome: TrimResult["outcome"]; removed: number; total?: number };

/**
 * Resend REFUSED a create: make room for one person now (back to LIMIT − 1), so the caller can try the add once
 * more. Synchronous on purpose — it runs only on a refusal, and the caller needs the retry's result. Never throws.
 */
export async function makeRoomAfterRejection(
  tag: string,
  http: ResendHttp | null = process.env.RESEND_API_KEY ? resendHttp(process.env.RESEND_API_KEY) : null,
  opts: { limit?: number; gapMs?: number } = {},
): Promise<RoomAfterRejection> {
  if (!http) return { outcome: "failed", removed: 0 };
  const r = await trimToLimit(http, tag, { ...opts, limit: (opts.limit ?? LIST_WINDOW_LIMIT) - 1 });
  if (r.outcome === "failed") return { outcome: "failed", removed: 0 };
  return { outcome: r.outcome, removed: r.outcome === "within" ? 0 : r.unsubscribed + r.noEngagement, total: r.total };
}

/**
 * Trim after the response (next/server after()). Never throws, never blocks the caller.
 * ★Outside a request scope after() throws — then the trim is SKIPPED (logged), not run loose in the
 *   background: every production caller is a route handler, and an unowned background run outlives
 *   its caller (it leaked alerts across unit tests). The next sign-up's trim catches up (≤ 5 per run).
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
    logger.warn(`[list-window ${tag}] no request scope — trim skipped`);
  }
}
