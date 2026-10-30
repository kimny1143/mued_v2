/**
 * Keep the Resend contact list at most LIST_WINDOW_LIMIT people — "the latest 1,000" window
 * (kimny 2026-10-30 「どうぞ。OK」・conductor).
 *
 * ★Why: the Resend marketing plan is now the free tier (1,000 contacts, counted across the whole
 *   account, not per segment). What Resend does past the limit — refuse the add or stop the
 *   broadcast — is not documented, so the app makes room BEFORE it adds anyone.
 *
 * Call makeRoomForOne() right before creating a NEW contact (never for an existing one). When the
 * account holds LIST_WINDOW_LIMIT or more contacts, it deletes ONE contact, in this order:
 *   1. an unsubscribed contact, oldest created_at first;
 *   2. a subscribed contact with no open and no click on any sent broadcast, oldest first
 *      (GET /broadcasts/{id}/recipients?type=opened|clicked — the per-person record, measured
 *      2026-10-30).
 *   Nobody who opened or clicked is removed. If no one qualifies, nothing is removed and the
 *   caller still tries the add (Resend decides).
 *
 * ★Resend only. Nothing here reads or writes the DB.
 * ★Logs carry counts and outcomes only — never an email or a contact id.
 * ★Never throws: every failure resolves to an outcome the caller can log; the caller's add (and the
 *   download email after it) carries on exactly as before.
 * ★Rate limit: Resend allows 10 req/s per account. Calls here are spaced CALL_GAP_MS apart (≤ 8/s).
 *   Two adds at the same moment can each see 999 and land on 1,001; at ~6 adds a day that is
 *   accepted, and the next add brings the count back under.
 */
import { logger } from "@/lib/utils/logger";

export const LIST_WINDOW_LIMIT = 1000;
const CALL_GAP_MS = 125;
const PAGE = 100;
const MAX_PAGES = 50; // 5,000 contacts — far past the limit; stops a runaway cursor

export type WindowContact = { id: string; created_at: string; unsubscribed: boolean };
export type RoomOutcome =
  | "room" //            under the limit — nothing removed
  | "removed_unsubscribed"
  | "removed_no_engagement"
  | "full_no_candidate" // at the limit and everyone left has opened or clicked
  | "failed"; //         could not count, read engagement or delete — nothing (more) removed

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

/** Who goes first. Pure — the order is the whole policy, so it is tested on its own. */
export function pickEviction(
  contacts: WindowContact[],
  engagedIds: ReadonlySet<string>,
): { id: string; reason: "unsubscribed" | "no_engagement" } | null {
  const unsub = contacts.filter((c) => c.unsubscribed).sort(byAge);
  if (unsub.length) return { id: unsub[0].id, reason: "unsubscribed" };
  const cold = contacts.filter((c) => !c.unsubscribed && !engagedIds.has(c.id)).sort(byAge);
  if (cold.length) return { id: cold[0].id, reason: "no_engagement" };
  return null;
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

export async function makeRoomForOne(
  http: ResendHttp,
  tag: string,
  opts: { limit?: number; gapMs?: number } = {},
): Promise<RoomOutcome> {
  const limit = opts.limit ?? LIST_WINDOW_LIMIT;
  const gapMs = opts.gapMs ?? CALL_GAP_MS;
  const gap = () => (gapMs > 0 ? new Promise<void>((r) => setTimeout(r, gapMs)) : Promise.resolve());
  try {
    const contacts = (await listAll(http, "/contacts", gap)).map((c) => ({
      id: String(c.id),
      created_at: String(c.created_at),
      unsubscribed: c.unsubscribed === true,
    }));
    if (contacts.length < limit) return "room";

    const engaged = new Set<string>();
    if (!contacts.some((c) => c.unsubscribed)) {
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

    const victim = pickEviction(contacts, engaged);
    if (!victim) {
      logger.warn(`[list-window ${tag}] at the limit and no one qualifies to remove — adding anyway`, { total: contacts.length, limit });
      return "full_no_candidate";
    }
    await gap();
    const { status } = await http("DELETE", `/contacts/${victim.id}`);
    // 404 = someone else removed it in the meantime — the room is there either way.
    if (status !== 200 && status !== 404) throw new Error(`delete → ${status}`);
    logger.warn(`[list-window ${tag}] at the limit — removed 1 (${victim.reason})`, { total: contacts.length, limit });
    return victim.reason === "unsubscribed" ? "removed_unsubscribed" : "removed_no_engagement";
  } catch (err) {
    logger.error(`[list-window ${tag}] could not make room — adding anyway`, { error: String(err instanceof Error ? err.message : err) });
    return "failed";
  }
}
