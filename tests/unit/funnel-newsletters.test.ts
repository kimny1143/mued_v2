import { describe, it, expect } from "vitest";
import { toNewsletters, NEWSLETTERS_DEFINITION, type Broadcast } from "@/lib/funnel/newsletters";

const NL1: Broadcast = {
  id: "nl-1",
  name: "NL#1",
  status: "sent",
  sent_at: "2026-09-01T09:00:00.000Z",
};
const NL1_METRICS = {
  broadcast_id: NL1.id,
  delivered: 866,
  unique_opened: 346,
  unique_clicked: 0,
  unsubscribed: 25,
  bounced: 0,
  complained: 0,
};
const COUNT_FIELDS = [
  "delivered", "unique_opened", "unique_clicked", "unsubscribed", "bounced", "complained",
] as const;

describe("newsletter results", () => {
  it("keeps only sent broadcasts with sent_at, newest first, without mutating the input", () => {
    const broadcasts = [
      NL1,
      { ...NL1, id: "draft", status: "draft" },
      { ...NL1, id: "scheduled", status: "scheduled" },
      { ...NL1, id: "no-date", sent_at: null },
      { ...NL1, id: "nl-3", sent_at: "2026-09-03T09:00:00.000Z" },
      { ...NL1, id: "nl-2", sent_at: "2026-09-02T09:00:00.000Z" },
    ];
    const original = broadcasts.slice();
    expect(toNewsletters(broadcasts, []).map((item) => item.id)).toEqual(["nl-3", "nl-2", "nl-1"]);
    expect(broadcasts).toEqual(original);
  });

  it("sorts timestamps chronologically even with different UTC offsets", () => {
    const later = { ...NL1, id: "later", sent_at: "2026-09-01T08:30:00-01:00" };
    expect(toNewsletters([NL1, later], []).map((item) => item.id)).toEqual(["later", "nl-1"]);
  });

  it("★normalises Resend's Postgres-style sent_at to ISO (the PWA reader is Safari)", () => {
    const real = { ...NL1, sent_at: "2026-09-16 05:24:27.479028+00" };
    expect(toNewsletters([real], [])[0].sent_at).toBe("2026-09-16T05:24:27.479Z");
    const junk = { ...NL1, sent_at: "not a date" };
    expect(toNewsletters([junk], [])[0].sent_at).toBe("not a date");
  });

  it("matches metrics by broadcast_id and carries the real NL#1 counts without rates", () => {
    const result = toNewsletters([NL1], [
      { ...NL1_METRICS, broadcast_id: "unrelated", delivered: 999 },
      NL1_METRICS,
    ]);
    expect(result).toEqual([{
      id: "nl-1",
      name: "NL#1",
      sent_at: NL1.sent_at,
      delivered: 866,
      unique_opened: 346,
      unique_clicked: 0,
      unsubscribed: 25,
      bounced: 0,
      complained: 0,
      open_tracked: true,
    }]);
  });

  it("emits null for all six counts when no matching metrics row exists", () => {
    const [result] = toNewsletters([NL1], [{ ...NL1_METRICS, broadcast_id: "unrelated" }]);
    for (const field of COUNT_FIELDS) expect(result[field]).toBeNull();
    expect(result.open_tracked).toBeNull();
  });

  describe.each(COUNT_FIELDS)("%s", (field) => {
    it.each([undefined, null, NaN, Infinity, -Infinity, "0", true, {}])(
      "treats invalid/missing value %s as null, without losing other counts",
      (value) => {
        const [result] = toNewsletters([NL1], [{ ...NL1_METRICS, [field]: value }]);
        expect(result[field]).toBeNull();
        for (const other of COUNT_FIELDS.filter((key) => key !== field)) {
          expect(result[other]).toBe(NL1_METRICS[other]);
        }
      },
    );

    it("preserves measured zero", () => {
      expect(toNewsletters([NL1], [{ ...NL1_METRICS, [field]: 0 }])[0][field]).toBe(0);
    });
  });

  it.each([
    { opened: 346, expected: true },
    { opened: 1, expected: true },
    { opened: 0, expected: null },
    { opened: null, expected: null },
    { opened: undefined, expected: null },
    { opened: NaN, expected: null },
    { opened: Infinity, expected: null },
    { opened: "346", expected: null },
    { opened: -1, expected: null },
  ])("open_tracked for $opened opens is $expected, never false", ({ opened, expected }) => {
    const [result] = toNewsletters([NL1], [{ ...NL1_METRICS, unique_opened: opened }]);
    expect(result.open_tracked).toBe(expected);
    expect(result.open_tracked).not.toBe(false);
  });

  it("returns an empty array when there are no sent broadcasts", () => {
    expect(toNewsletters([], [])).toEqual([]);
    expect(toNewsletters([{ ...NL1, status: "draft" }], [NL1_METRICS])).toEqual([]);
  });

  it("ships the missing-count and unknown-tracking definitions alongside the values", () => {
    expect(NEWSLETTERS_DEFINITION).toContain("broadcast_id");
    expect(NEWSLETTERS_DEFINITION).toContain("null");
    expect(NEWSLETTERS_DEFINITION).toContain("unique_opened > 0");
    expect(NEWSLETTERS_DEFINITION).toContain("never false");
    expect(NEWSLETTERS_DEFINITION).toContain("no rates");
  });
});
