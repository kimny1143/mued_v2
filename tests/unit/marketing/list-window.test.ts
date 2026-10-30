/**
 * The Resend "latest 1,000" window (kimny 2026-10-30 「どうぞ。OK」・conductor).
 *
 * Driven through a fake Resend HTTP that holds an in-memory account, so the order of removal, "only
 * down to the limit", never-throws and logs-carry-no-person are measured on what the module actually
 * sends — not on what it was meant to send.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
const { afterSpy, alertSpy } = vi.hoisted(() => ({ afterSpy: vi.fn(), alertSpy: vi.fn(async () => undefined) }));
vi.mock("next/server", () => ({ after: afterSpy }));
vi.mock("@/lib/plugins/audience-alert", () => ({ alertListTrimFailed: alertSpy, alertAudienceAddFailed: vi.fn() }));

import {
  LIST_WINDOW_LIMIT,
  makeRoomAfterRejection,
  pickEvictions,
  scheduleListTrim,
  trimToLimit,
  type ResendHttp,
  type WindowContact,
} from "@/lib/marketing/list-window";
import { addContactIfAbsent } from "@/lib/plugins/audience";
import { logger } from "@/lib/utils/logger";

type Contact = WindowContact & { email: string };

/** An in-memory Resend account: /contacts (paged), /broadcasts, recipients, DELETE /contacts/:id. */
function fakeAccount(
  contacts: Contact[],
  opts: { opened?: string[]; clicked?: string[]; failOn?: RegExp; recipientIdKey?: string; broadcastStatus?: string } = {},
) {
  const live = [...contacts];
  const calls: string[] = [];
  const page = <T extends { id: string }>(rows: T[], path: string) => {
    const q = new URLSearchParams(path.split("?")[1] ?? "");
    const limit = Number(q.get("limit") ?? 100);
    const after = q.get("after");
    const start = after ? rows.findIndex((r) => r.id === after) + 1 : 0;
    const data = rows.slice(start, start + limit);
    return { status: 200, body: { object: "list", has_more: start + limit < rows.length, data } };
  };
  const http: ResendHttp = async (method, path) => {
    calls.push(`${method} ${path}`);
    if (opts.failOn?.test(`${method} ${path}`)) return { status: 500, body: { message: "boom" } };
    if (method === "DELETE") {
      const id = path.split("/").pop()!;
      const i = live.findIndex((c) => c.id === id);
      if (i < 0) return { status: 404, body: null };
      live.splice(i, 1);
      return { status: 200, body: { object: "contact", id, deleted: true } };
    }
    if (path.startsWith("/contacts")) return page(live, path);
    if (path === "/broadcasts")
      return { status: 200, body: { data: [{ id: "b_sent", status: opts.broadcastStatus ?? "sent" }, { id: "b_draft", status: "draft" }] } };
    if (path.startsWith("/broadcasts/b_sent/recipients")) {
      const type = new URLSearchParams(path.split("?")[1]).get("type");
      const ids = type === "opened" ? opts.opened ?? [] : type === "clicked" ? opts.clicked ?? [] : [];
      return page(ids.map((cid, n) => ({ id: `r_${type}_${n}`, [opts.recipientIdKey ?? "contact_id"]: cid, email: "x", count: 1 })), path);
    }
    return { status: 404, body: null };
  };
  return { http, live, calls };
}

const day = (n: number) => new Date(Date.UTC(2026, 6, 1) + n * 86_400_000).toISOString();
/** n subscribed contacts, created one day apart, ids c0000… (oldest first). */
const people = (n: number): Contact[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${String(i).padStart(4, "0")}`,
    email: `p${i}@example.com`,
    created_at: day(i),
    unsubscribed: false,
  }));
const opts0 = { gapMs: 0 };

beforeEach(() => vi.clearAllMocks());

describe("pickEvictions — the order", () => {
  it("unsubscribed first (oldest), then no open/click (oldest); anyone who opened or clicked stays", () => {
    const cs: WindowContact[] = [
      { id: "a", created_at: day(1), unsubscribed: false },
      { id: "b", created_at: day(5), unsubscribed: true },
      { id: "c", created_at: day(3), unsubscribed: true },
      { id: "d", created_at: day(0), unsubscribed: false },
    ];
    expect(pickEvictions(cs, new Set(), 1)).toEqual([{ id: "c", reason: "unsubscribed" }]);
    expect(pickEvictions(cs, new Set(), 3).map((v) => v.id)).toEqual(["c", "b", "d"]);
    expect(pickEvictions(cs, new Set(["d"]), 4).map((v) => v.id)).toEqual(["c", "b", "a"]);
    expect(pickEvictions(cs, new Set(["a", "d"]), 4).map((v) => v.id)).toEqual(["c", "b"]);
  });
});

describe("trimToLimit", () => {
  it("at the limit (1,000): counts and removes no one", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT));
    await expect(trimToLimit(acct.http, "t", opts0)).resolves.toEqual({ outcome: "within", total: LIST_WINDOW_LIMIT });
    expect(acct.calls.filter((c) => c.startsWith("DELETE"))).toHaveLength(0);
    expect(acct.calls.every((c) => c.startsWith("GET /contacts"))).toBe(true); // ★it paged through all of them
    expect(acct.calls.length).toBe(LIST_WINDOW_LIMIT / 100);
  });

  it("★1,001 with an unsubscribed contact: removes exactly the oldest unsubscribed, reads no engagement", async () => {
    const cs = people(LIST_WINDOW_LIMIT + 1);
    cs[700].unsubscribed = true;
    cs[300].unsubscribed = true; // older of the two
    const acct = fakeAccount(cs);
    await expect(trimToLimit(acct.http, "t", opts0)).resolves.toMatchObject({ outcome: "trimmed", total: LIST_WINDOW_LIMIT, unsubscribed: 1 });
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT);
    expect(acct.live.some((c) => c.id === "c0300")).toBe(false);
    expect(acct.live.some((c) => c.id === "c0700")).toBe(true);
    expect(acct.calls.some((c) => c.includes("/broadcasts"))).toBe(false);
  });

  it("★1,001, no unsubscribed: removes the oldest with no open and no click on any sent broadcast", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT + 1), { opened: ["c0000"], clicked: ["c0001"] });
    await expect(trimToLimit(acct.http, "t", opts0)).resolves.toMatchObject({ outcome: "trimmed", noEngagement: 1 });
    expect(acct.live.map((c) => c.id).slice(0, 2)).toEqual(["c0000", "c0001"]); // engaged — kept
    expect(acct.live.some((c) => c.id === "c0002")).toBe(false); // the oldest cold one — gone
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT);
    expect(acct.calls.some((c) => c.includes("b_draft"))).toBe(false); // only sent broadcasts count
  });

  it("a backlog comes down a few at a time (at most 5 per run), never below the limit", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT + 3), { opened: ["c0000"] });
    await trimToLimit(acct.http, "t", opts0);
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT);
    const big = fakeAccount(people(LIST_WINDOW_LIMIT + 8), { opened: ["c0000"] });
    await expect(trimToLimit(big.http, "t", opts0)).resolves.toMatchObject({ outcome: "short", total: LIST_WINDOW_LIMIT + 3 });
    expect(big.live).toHaveLength(LIST_WINDOW_LIMIT + 3);
  });

  it("over the limit and everyone opened or clicked: removes no one, says 'short'", async () => {
    const acct = fakeAccount(people(3), { opened: ["c0000", "c0001"], clicked: ["c0002"] });
    await expect(trimToLimit(acct.http, "t", { ...opts0, limit: 2 })).resolves.toMatchObject({ outcome: "short", total: 3 });
    expect(acct.live).toHaveLength(3);
  });

  it("★fails CLOSED on an engagement read that would make everyone look cold (CCO #1320) — 0 deleted", async () => {
    const everyoneOpened = people(LIST_WINDOW_LIMIT + 1).map((c) => c.id);
    // control: the real field name (measured 2026-10-30: id, contact_id, email, count) → nobody qualifies
    const control = fakeAccount(people(LIST_WINDOW_LIMIT + 1), { opened: everyoneOpened });
    await expect(trimToLimit(control.http, "t", opts0)).resolves.toMatchObject({ outcome: "short" });
    expect(control.live).toHaveLength(LIST_WINDOW_LIMIT + 1);
    for (const o of [
      { opened: everyoneOpened, recipientIdKey: "contactId" }, // the field renamed
      { opened: everyoneOpened, broadcastStatus: "delivered" }, // no broadcast says "sent"
      { opened: [] as string[] }, //                               sent broadcasts, no opens or clicks at all
    ]) {
      const acct = fakeAccount(people(LIST_WINDOW_LIMIT + 1), o);
      await expect(trimToLimit(acct.http, "t", opts0)).resolves.toEqual({ outcome: "failed" });
      expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT + 1);
    }
  });

  it("a contact without a string id or created_at fails closed (no DELETE /contacts/undefined)", async () => {
    const cs = people(LIST_WINDOW_LIMIT + 1) as Array<Record<string, unknown>>;
    delete cs[0].id;
    const acct = fakeAccount(cs as Contact[], { opened: ["c0500"] }); // engagement reads fine — only the id is bad
    await expect(trimToLimit(acct.http, "t", opts0)).resolves.toEqual({ outcome: "failed" });
    expect(acct.calls.some((c) => c.startsWith("DELETE"))).toBe(false);
  });

  it("DELETE 404 (already removed by another sign-up's trim) counts as removed, not as a failure", async () => {
    const cs = people(LIST_WINDOW_LIMIT + 1);
    cs[0].unsubscribed = true;
    const acct = fakeAccount(cs);
    const http: ResendHttp = async (m, p) => (m === "DELETE" ? { status: 404, body: null } : acct.http(m, p));
    await expect(trimToLimit(http, "t", opts0)).resolves.toMatchObject({ outcome: "trimmed", unsubscribed: 1 });
  });

  it("never throws: a failing count, engagement read or delete resolves to 'failed'", async () => {
    for (const failOn of [/^GET \/contacts/, /^GET \/broadcasts/, /^DELETE/]) {
      const acct = fakeAccount(people(LIST_WINDOW_LIMIT + 1), { failOn });
      await expect(trimToLimit(acct.http, "t", opts0)).resolves.toEqual({ outcome: "failed" });
      expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT + 1);
    }
    const throwing: ResendHttp = async () => {
      throw new Error("network down");
    };
    await expect(trimToLimit(throwing, "t", opts0)).resolves.toEqual({ outcome: "failed" });
  });

  it("★logs carry counts and outcomes only — no email, no contact id", async () => {
    const cs = people(LIST_WINDOW_LIMIT + 1);
    cs[5].unsubscribed = true;
    await trimToLimit(fakeAccount(cs).http, "t", opts0);
    await trimToLimit(fakeAccount(people(LIST_WINDOW_LIMIT + 1), { failOn: /^DELETE/ }).http, "t", opts0);
    const logged = JSON.stringify([...vi.mocked(logger.warn).mock.calls, ...vi.mocked(logger.error).mock.calls]);
    expect(logged).toContain("removed 1"); // ★positive control: the logs were written
    expect(logged).not.toMatch(/@example\.com|c\d{4}/);
  });
});

describe("scheduleListTrim — after the response", () => {
  it("★hands the trim to next/server after() and does no Resend call before returning", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchSpy = vi.mocked(global.fetch);
    scheduleListTrim("t");
    expect(afterSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    delete process.env.RESEND_API_KEY;
  });

  it("a failed trim alerts (at most once a day — the alert's own cap)", async () => {
    process.env.RESEND_API_KEY = "re_test";
    scheduleListTrim("t");
    const run = afterSpy.mock.calls[0][0] as () => Promise<void>;
    await run(); // global fetch is a stub in unit tests → the count fails
    expect(alertSpy).toHaveBeenCalledWith("t");
    delete process.env.RESEND_API_KEY;
  });

  it("★outside a request scope (after() throws): the trim is skipped and logged — never run loose", () => {
    process.env.RESEND_API_KEY = "re_test";
    afterSpy.mockImplementationOnce(() => {
      throw new Error("after() was called outside a request scope");
    });
    scheduleListTrim("t");
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).toContain("no request scope — trim skipped");
    delete process.env.RESEND_API_KEY;
  });

  it("no key → nothing scheduled", () => {
    delete process.env.RESEND_API_KEY;
    scheduleListTrim("t");
    expect(afterSpy).not.toHaveBeenCalled();
  });
});

describe("addContactIfAbsent — the trim follows a NEW contact only, after the add", () => {
  const notFound = { data: null, error: { statusCode: 404, name: "not_found", message: "Contact not found" } };
  function resendWith(found: unknown, created: unknown = { data: { id: "new" }, error: null }) {
    return { contacts: { get: vi.fn(async () => found), create: vi.fn(async () => created) } };
  }

  it("★new person: create, then the trim is scheduled — no counting before the add", async () => {
    const resend = resendWith(notFound);
    const onCreated = vi.fn();
    await expect(addContactIfAbsent(resend as never, "aud", "new@example.com", "t", onCreated)).resolves.toBe(true);
    expect(onCreated).toHaveBeenCalledWith("t");
    expect(resend.contacts.create.mock.invocationCallOrder[0]).toBeLessThan(onCreated.mock.invocationCallOrder[0]);
  });

  it("existing person, or a rejected create: no trim", async () => {
    const onCreated = vi.fn();
    await addContactIfAbsent(resendWith({ data: { id: "c1" }, error: null }) as never, "aud", "p@example.com", "t", onCreated);
    const noRoom = vi.fn(async () => ({ outcome: "within" as const, removed: 0, total: 999 }));
    await addContactIfAbsent(resendWith(notFound, { data: null, error: { message: "no" } }) as never, "aud", "p@example.com", "t", onCreated, noRoom);
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe("★Resend REFUSES the create (unmeasured past 1,000 — conductor 10/30): make room for one, retry once", () => {
  const notFound = { data: null, error: { statusCode: 404, name: "not_found", message: "Contact not found" } };
  const refused = { data: null, error: { statusCode: 403, name: "restricted", message: "contact limit" } };
  const ok = { data: { id: "new" }, error: null };
  function resendCreating(...results: unknown[]) {
    const create = vi.fn();
    for (const r of results) create.mockResolvedValueOnce(r);
    return { contacts: { get: vi.fn(async () => notFound), create } };
  }
  const logs = () => JSON.stringify([...vi.mocked(logger.warn).mock.calls, ...vi.mocked(logger.error).mock.calls]);

  it("makeRoomAfterRejection: at 1,000 removes exactly one (to 999); under 1,000 removes no one", async () => {
    const full = fakeAccount(people(LIST_WINDOW_LIMIT), { opened: ["c0000"] });
    await expect(makeRoomAfterRejection("t", full.http, opts0)).resolves.toEqual({ outcome: "trimmed", removed: 1, total: LIST_WINDOW_LIMIT - 1 });
    expect(full.live).toHaveLength(LIST_WINDOW_LIMIT - 1);
    const roomy = fakeAccount(people(LIST_WINDOW_LIMIT - 1));
    await expect(makeRoomAfterRejection("t", roomy.http, opts0)).resolves.toMatchObject({ outcome: "within", removed: 0 });
    expect(roomy.live).toHaveLength(LIST_WINDOW_LIMIT - 1);
    await expect(makeRoomAfterRejection("t", null, opts0)).resolves.toEqual({ outcome: "failed", removed: 0 });
  });

  it("★refused → room made → retry accepted: true, two creates, the trim-after is not also scheduled", async () => {
    const resend = resendCreating(refused, ok);
    const onCreated = vi.fn();
    const makeRoom = vi.fn(async () => ({ outcome: "trimmed" as const, removed: 1, total: 999 }));
    await expect(addContactIfAbsent(resend as never, "aud", "new@example.com", "t", onCreated, makeRoom)).resolves.toBe(true);
    expect(resend.contacts.create).toHaveBeenCalledTimes(2);
    expect(makeRoom.mock.invocationCallOrder[0]).toBeLessThan(resend.contacts.create.mock.invocationCallOrder[1]);
    expect(onCreated).not.toHaveBeenCalled();
    expect(logs()).toContain("retrying the subscribe once");
    expect(logs()).toContain("retry accepted after making room");
  });

  it("refused, and no room could be made (not full, or the count failed): no retry, false", async () => {
    for (const outcome of ["within", "failed"] as const) {
      const resend = resendCreating(refused);
      const makeRoom = vi.fn(async () => ({ outcome, removed: 0 }));
      await expect(addContactIfAbsent(resend as never, "aud", "new@example.com", "t", vi.fn(), makeRoom)).resolves.toBe(false);
      expect(resend.contacts.create).toHaveBeenCalledTimes(1);
    }
    expect(logs()).toContain("not retrying");
  });

  it("refused twice: exactly one retry, false — never a loop", async () => {
    const resend = resendCreating(refused, refused, ok);
    const makeRoom = vi.fn(async () => ({ outcome: "trimmed" as const, removed: 1, total: 999 }));
    await expect(addContactIfAbsent(resend as never, "aud", "new@example.com", "t", vi.fn(), makeRoom)).resolves.toBe(false);
    expect(resend.contacts.create).toHaveBeenCalledTimes(2);
    expect(makeRoom).toHaveBeenCalledTimes(1);
    expect(logs()).toContain("REJECTED the subscribe again after making room");
  });

  it("★the two paths log different words (so the first sign-up after 11/16 shows which one Resend takes)", async () => {
    // accepted over the limit → the after-the-add trim's line
    await trimToLimit(fakeAccount(people(LIST_WINDOW_LIMIT + 1), { opened: ["c0000"] }).http, "t", opts0);
    const accepted = logs();
    vi.clearAllMocks();
    // refused at the limit → the retry's lines
    await addContactIfAbsent(resendCreating(refused, ok) as never, "aud", "n@example.com", "t", vi.fn(), async () => ({ outcome: "trimmed", removed: 1, total: 999 }));
    const refusedLogs = logs();
    expect(accepted).toContain("over the limit — removed 1");
    expect(accepted).not.toContain("retry");
    expect(refusedLogs).toContain("made room (removed 1) after the rejection");
    expect(refusedLogs).not.toContain("over the limit — removed");
  });
});
