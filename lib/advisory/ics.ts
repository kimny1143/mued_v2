/**
 * Minimal RFC 5545 .ics builder for the advisory 壁打ち booking invite.
 *
 * Hand-rolled (no dependency) because the event is fully controlled — a single VEVENT with a fixed
 * shape and only two user-supplied strings (booker name/email, which we escape). This avoids adding
 * an npm dep (and its audit surface) for ~one template, while still handling the three things that
 * silently break .ics rendering in strict clients (Apple Mail especially): CRLF line endings,
 * 75-OCTET line folding (UTF-8 bytes, not chars — SUMMARY carries Japanese), and TEXT-value
 * escaping. Emitted with METHOD:REQUEST + ORGANIZER + ATTENDEE(RSVP=TRUE) so it reads as an invite;
 * Resend sends it as a text/calendar attachment, so treat it as "add to calendar" (the fixed slot
 * is already confirmed) rather than a two-way RSVP.
 *
 * Times are emitted in UTC (YYYYMMDDTHHMMSSZ) — the most portable form (no VTIMEZONE block needed).
 */

/** UTC date-time in iCalendar basic form: 20260710T110000Z. */
export function formatIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape an iCalendar TEXT value (RFC 5545 §3.3.11): backslash, semicolon, comma, newline. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n");
}

/**
 * Fold a content line to <=75 OCTETS per RFC 5545 §3.1, continuing with CRLF + a single space.
 * Counts UTF-8 bytes and never splits a multi-byte character across a fold (Japanese SUMMARY).
 */
export function foldIcsLine(line: string): string {
  const out: string[] = [];
  let cur = "";
  let curBytes = 0;
  let first = true;
  for (const ch of line) {
    const chBytes = Buffer.byteLength(ch, "utf8");
    // continuation lines start with a space, so their budget is 74 octets of content
    const limit = first ? 75 : 74;
    if (curBytes + chBytes > limit) {
      out.push(cur);
      cur = ch;
      curBytes = chBytes;
      first = false;
    } else {
      cur += ch;
      curBytes += chBytes;
    }
  }
  out.push(cur);
  return out.join("\r\n ");
}

export interface AdvisoryIcsInput {
  uid: string; // stable per booking (e.g. `${inquiryId}@mued.jp`) so updates/cancels dedupe
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string; // the fixed Google Meet URL
  organizerName: string;
  organizerEmail: string;
  attendeeName?: string;
  attendeeEmail: string;
  sequence?: number; // bump on reschedule/cancel; default 0
  dtstamp?: Date; // default now
}

/** Build a complete VCALENDAR/VEVENT invite string (CRLF-terminated, folded). */
export function buildAdvisoryIcs(input: AdvisoryIcsInput): string {
  const seq = input.sequence ?? 0;
  const dtstamp = input.dtstamp ?? new Date();
  const organizer = `ORGANIZER;CN=${escapeIcsText(input.organizerName)}:mailto:${input.organizerEmail}`;
  const attendee =
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE` +
    (input.attendeeName ? `;CN=${escapeIcsText(input.attendeeName)}` : "") +
    `:mailto:${input.attendeeEmail}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MUED//advisory//EN",
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `SEQUENCE:${seq}`,
    `DTSTAMP:${formatIcsUtc(dtstamp)}`,
    `DTSTART:${formatIcsUtc(input.start)}`,
    `DTEND:${formatIcsUtc(input.end)}`,
    `SUMMARY:${escapeIcsText(input.summary)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `LOCATION:${escapeIcsText(input.location)}`,
    organizer,
    attendee,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
