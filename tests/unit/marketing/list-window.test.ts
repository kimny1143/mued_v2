/**
 * The Resend "latest 1,000" window (kimny 2026-10-30 「どうぞ。OK」・conductor).
 *
 * Driven through a fake Resend HTTP that holds an in-memory account, so the order of removal, the
 * "only one comes off", the never-throws and the logs-carry-no-person rules are measured on what the
 * module actually sends — not on what it was meant to send.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils/logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

import { LIST_WINDOW_LIMIT, makeRoomForOne, pickEviction, type ResendHttp, type WindowContact } from "@/lib/marketing/list-window";
import { addContactIfAbsent } from "@/lib/plugins/audience";
import { logger } from "@/lib/utils/logger";

type Contact = WindowContact & { email: string };

/** An in-memory Resend account: /contacts (paged), /broadcasts, recipients, DELETE /contacts/:id. */
function fakeAccount(contacts: Contact[], opts: { opened?: string[]; clicked?: string[]; failOn?: RegExp } = {}) {
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
      return { status: 200, body: { data: [{ id: "b_sent", status: "sent" }, { id: "b_draft", status: "draft" }] } };
    if (path.startsWith("/broadcasts/b_sent/recipients")) {
      const type = new URLSearchParams(path.split("?")[1]).get("type");
      const ids = type === "opened" ? opts.opened ?? [] : type === "clicked" ? opts.clicked ?? [] : [];
      return page(ids.map((cid, n) => ({ id: `r_${type}_${n}`, contact_id: cid, email: "x", count: 1 })), path);
    }
    return { status: 404, body: null };
  };
  return { http, live, calls };
}

const day = (n: number) => new Date(Date.UTC(2026, 6, 1) + n * 86_400_000).toISOString();
/** n subscribed contacts, created one day apart, ids c0000… (oldest first). */
const people = (n: number, from = 0): Contact[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${String(i + from).padStart(4, "0")}`,
    email: `p${i + from}@example.com`,
    created_at: day(i + from),
    unsubscribed: false,
  }));

beforeEach(() => vi.clearAllMocks());

describe("pickEviction — the order", () => {
  it("unsubscribed first (oldest), then no open/click (oldest); anyone who opened or clicked stays", () => {
    const cs: WindowContact[] = [
      { id: "a", created_at: day(1), unsubscribed: false },
      { id: "b", created_at: day(5), unsubscribed: true },
      { id: "c", created_at: day(3), unsubscribed: true },
      { id: "d", created_at: day(0), unsubscribed: false },
    ];
    expect(pickEviction(cs, new Set())).toEqual({ id: "c", reason: "unsubscribed" });
    const subscribed = cs.filter((c) => !c.unsubscribed);
    expect(pickEviction(subscribed, new Set())).toEqual({ id: "d", reason: "no_engagement" });
    expect(pickEviction(subscribed, new Set(["d"]))).toEqual({ id: "a", reason: "no_engagement" });
    expect(pickEviction(subscribed, new Set(["a", "d"]))).toBeNull();
  });
});

describe("makeRoomForOne", () => {
  it("under the limit: counts and removes no one", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT - 1));
    await expect(makeRoomForOne(acct.http, "t", { gapMs: 0 })).resolves.toBe("room");
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT - 1);
    expect(acct.calls.filter((c) => c.startsWith("DELETE"))).toHaveLength(0);
    expect(acct.calls.every((c) => c.startsWith("GET /contacts"))).toBe(true); // ★it paged through all of them
    expect(acct.calls.length).toBe(Math.ceil((LIST_WINDOW_LIMIT - 1) / 100));
  });

  it("★at 1,000 with an unsubscribed contact: removes exactly that one (the oldest unsubscribed), reads no engagement", async () => {
    const cs = people(LIST_WINDOW_LIMIT);
    cs[700].unsubscribed = true;
    cs[300].unsubscribed = true; // older of the two
    const acct = fakeAccount(cs);
    await expect(makeRoomForOne(acct.http, "t", { gapMs: 0 })).resolves.toBe("removed_unsubscribed");
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT - 1);
    expect(acct.live.some((c) => c.id === "c0300")).toBe(false);
    expect(acct.live.some((c) => c.id === "c0700")).toBe(true);
    expect(acct.calls.some((c) => c.includes("/broadcasts"))).toBe(false);
  });

  it("★at 1,000, no unsubscribed: removes the oldest with no open and no click on any sent broadcast", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT), { opened: ["c0000"], clicked: ["c0001"] });
    await expect(makeRoomForOne(acct.http, "t", { gapMs: 0 })).resolves.toBe("removed_no_engagement");
    expect(acct.live.map((c) => c.id).slice(0, 2)).toEqual(["c0000", "c0001"]); // engaged — kept
    expect(acct.live.some((c) => c.id === "c0002")).toBe(false); // the oldest cold one — gone
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT - 1);
    expect(acct.calls.some((c) => c.includes("b_draft"))).toBe(false); // only sent broadcasts count
  });

  it("at 1,000 and everyone opened or clicked: removes no one", async () => {
    const cs = people(3);
    const acct = fakeAccount(cs, { opened: ["c0000", "c0001"], clicked: ["c0002"] });
    await expect(makeRoomForOne(acct.http, "t", { gapMs: 0, limit: 3 })).resolves.toBe("full_no_candidate");
    expect(acct.live).toHaveLength(3);
  });

  it("never throws: a failing count, engagement read or delete resolves to 'failed' and removes no one", async () => {
    for (const failOn of [/^GET \/contacts/, /^GET \/broadcasts/, /^DELETE/]) {
      const acct = fakeAccount(people(LIST_WINDOW_LIMIT), { failOn });
      await expect(makeRoomForOne(acct.http, "t", { gapMs: 0 })).resolves.toBe("failed");
      expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT);
    }
    const throwing: ResendHttp = async () => {
      throw new Error("network down");
    };
    await expect(makeRoomForOne(throwing, "t", { gapMs: 0 })).resolves.toBe("failed");
  });

  it("★logs carry counts and outcomes only — no email, no contact id", async () => {
    const cs = people(LIST_WINDOW_LIMIT);
    cs[5].unsubscribed = true;
    await makeRoomForOne(fakeAccount(cs).http, "t", { gapMs: 0 });
    await makeRoomForOne(fakeAccount(people(LIST_WINDOW_LIMIT), { failOn: /^DELETE/ }).http, "t", { gapMs: 0 });
    const logged = JSON.stringify([...vi.mocked(logger.warn).mock.calls, ...vi.mocked(logger.error).mock.calls]);
    expect(logged).toContain("removed 1"); // ★positive control: the logs were written
    expect(logged).not.toMatch(/@example\.com|c\d{4}/);
  });
});

describe("addContactIfAbsent — the window runs only for a new contact, and the add always follows", () => {
  const notFound = { data: null, error: { statusCode: 404, name: "not_found", message: "Contact not found" } };
  function resendWith(found: unknown) {
    return {
      contacts: {
        get: vi.fn(async () => found),
        create: vi.fn(async () => ({ data: { id: "new" }, error: null })),
      },
    } as never;
  }

  it("★new person at 1,000: one comes off first, then the add — 1,000 stays 1,000", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT));
    const resend = resendWith(notFound) as { contacts: { create: ReturnType<typeof vi.fn> } };
    const http: ResendHttp = (m, p) => acct.http(m, p);
    await expect(addContactIfAbsent(resend as never, "aud", "new@example.com", "t", http)).resolves.toBe(true);
    expect(acct.live).toHaveLength(LIST_WINDOW_LIMIT - 1); // the fake doesn't see the SDK's create
    expect(resend.contacts.create).toHaveBeenCalledTimes(1);
  });

  it("existing person: no counting, no removal", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT));
    const resend = resendWith({ data: { id: "c0001" }, error: null }) as { contacts: { create: ReturnType<typeof vi.fn> } };
    await expect(addContactIfAbsent(resend as never, "aud", "p1@example.com", "t", acct.http)).resolves.toBe(true);
    expect(acct.calls).toHaveLength(0);
    expect(resend.contacts.create).not.toHaveBeenCalled();
  });

  it("★the window failing does not stop the add", async () => {
    const acct = fakeAccount(people(LIST_WINDOW_LIMIT), { failOn: /^GET \/contacts/ });
    const resend = resendWith(notFound) as { contacts: { create: ReturnType<typeof vi.fn> } };
    await expect(addContactIfAbsent(resend as never, "aud", "new@example.com", "t", acct.http)).resolves.toBe(true);
    expect(resend.contacts.create).toHaveBeenCalledTimes(1);
  });
});
