export interface Broadcast {
  id: string;
  name: string;
  status: string;
  sent_at: string | null;
}

export interface BroadcastMetricRow {
  broadcast_id: string;
  delivered?: unknown;
  unique_opened?: unknown;
  unique_clicked?: unknown;
  unsubscribed?: unknown;
  bounced?: unknown;
  complained?: unknown;
}

export interface Newsletter {
  id: string;
  name: string;
  sent_at: string;
  delivered: number | null;
  unique_opened: number | null;
  unique_clicked: number | null;
  unsubscribed: number | null;
  bounced: number | null;
  complained: number | null;
  open_tracked: true | null;
}

export const NEWSLETTERS_DEFINITION = "Sent broadcasts with non-null sent_at, newest first; cumulative counts matched by broadcast_id through collection time (generated_at), with missing rows/fields or non-finite/non-number values as null, never assumed zero; open_tracked is true only when unique_opened > 0, otherwise null (unknown), never false; no rates.";

// ★Resend returns sent_at Postgres-style ("2026-09-16 05:24:27.479028+00", measured 2026-09-24), which
//   V8 parses but Safari's Date does not reliably — and the reader is kimny's iPhone PWA. Normalise to
//   ISO here, on the Node side. An unparseable value is passed through verbatim rather than guessed.
function toIso(value: string): string {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : value;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Pure conversion: neither sort the caller's input nor infer historical tracking settings. */
export function toNewsletters(
  broadcasts: readonly Broadcast[],
  metricRows: readonly BroadcastMetricRow[],
): Newsletter[] {
  const metrics = new Map(metricRows.map((row) => [row.broadcast_id, row]));
  return broadcasts
    .filter((broadcast): broadcast is Broadcast & { sent_at: string } =>
      broadcast.status === "sent" && typeof broadcast.sent_at === "string",
    )
    .sort((a, b) => Date.parse(b.sent_at) - Date.parse(a.sent_at))
    .map((broadcast) => {
      const row = metrics.get(broadcast.id);
      const uniqueOpened = count(row?.unique_opened);
      return {
        id: broadcast.id,
        name: broadcast.name,
        sent_at: toIso(broadcast.sent_at),
        delivered: count(row?.delivered),
        unique_opened: uniqueOpened,
        unique_clicked: count(row?.unique_clicked),
        unsubscribed: count(row?.unsubscribed),
        bounced: count(row?.bounced),
        complained: count(row?.complained),
        open_tracked: uniqueOpened !== null && uniqueOpened > 0 ? true : null,
      };
    });
}
