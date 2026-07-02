/**
 * Advisory #8 — hand-rolled RFC 5545 .ics builder. Guards the three things that silently break
 * .ics rendering in strict clients: UTC formatting, TEXT escaping, and 75-octet line folding.
 */
import { describe, it, expect } from "vitest";
import {
  formatIcsUtc,
  escapeIcsText,
  foldIcsLine,
  buildAdvisoryIcs,
} from "@/lib/advisory/ics";

describe("formatIcsUtc", () => {
  it("emits iCalendar basic UTC form YYYYMMDDTHHMMSSZ (no punctuation, no millis)", () => {
    expect(formatIcsUtc(new Date("2026-07-10T11:00:00.000Z"))).toBe("20260710T110000Z");
  });
});

describe("escapeIcsText", () => {
  it("escapes backslash, semicolon, comma, and newline per §3.3.11", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
  it("leaves plain text untouched", () => {
    expect(escapeIcsText("MUED 壁打ち (60分)")).toBe("MUED 壁打ち (60分)");
  });
});

describe("foldIcsLine — 75-octet folding", () => {
  it("does not fold a short line", () => {
    expect(foldIcsLine("SUMMARY:hi")).toBe("SUMMARY:hi");
  });

  it("folds a long ASCII line with CRLF + single leading space, and each physical line stays <=75 octets", () => {
    const long = "DESCRIPTION:" + "x".repeat(200);
    const folded = foldIcsLine(long);
    expect(folded).toContain("\r\n ");
    for (const [i, physical] of folded.split("\r\n").entries()) {
      // continuation lines carry a leading space that counts toward the 75-octet limit
      expect(Buffer.byteLength(physical, "utf8")).toBeLessThanOrEqual(75);
      if (i > 0) expect(physical.startsWith(" ")).toBe(true);
    }
    // unfolding (strip CRLF+space) restores the original
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });

  it("never splits a multi-byte (Japanese) character across a fold boundary", () => {
    const line = "SUMMARY:" + "壁".repeat(40); // 3 bytes each → forces folds
    const folded = foldIcsLine(line);
    for (const physical of folded.split("\r\n")) {
      // if a multibyte char were split, decoding would produce U+FFFD replacement chars
      expect(physical).not.toContain("�");
      expect(Buffer.byteLength(physical, "utf8")).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(line);
  });
});

describe("buildAdvisoryIcs", () => {
  const ics = buildAdvisoryIcs({
    uid: "inq-1@mued.jp",
    start: new Date("2026-07-10T11:00:00.000Z"),
    end: new Date("2026-07-10T12:00:00.000Z"),
    summary: "MUED 壁打ち (60分)",
    description: "無料相談。Google Meet で。",
    location: "https://meet.google.com/abc-defg-hij",
    organizerName: "MUED",
    organizerEmail: "noreply@mued.jp",
    attendeeName: "山田",
    attendeeEmail: "yamada@example.com",
    dtstamp: new Date("2026-07-02T00:00:00.000Z"),
  });

  it("wraps a single VEVENT in a VCALENDAR with METHOD:REQUEST and CRLF endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("METHOD:REQUEST");
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(1);
    expect(ics.includes("\r\n")).toBe(true);
  });

  it("carries the stable UID, UTC DTSTART/DTEND, the Meet URL, and an RSVP attendee", () => {
    // The ATTENDEE line legitimately folds (>75 octets), so unfold before checking field content.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("UID:inq-1@mued.jp");
    expect(unfolded).toContain("DTSTART:20260710T110000Z");
    expect(unfolded).toContain("DTEND:20260710T120000Z");
    expect(unfolded).toContain("LOCATION:https://meet.google.com/abc-defg-hij");
    expect(unfolded).toContain("ORGANIZER;CN=MUED:mailto:noreply@mued.jp");
    expect(unfolded).toContain("RSVP=TRUE");
    expect(unfolded).toContain("mailto:yamada@example.com");
    expect(unfolded).toContain("SEQUENCE:0");
    expect(unfolded).toContain("STATUS:CONFIRMED");
  });
});
