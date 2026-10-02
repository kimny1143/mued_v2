/**
 * `newsletter-metrics/v1` — the file gw-dash's "メール" tab reads (conductor 2026-10-02, kimny「OK進めましょう」).
 * Same schema as conductor's hand-made docs/reports/newsletter/newsletter-metrics.json; this builds it
 * every morning from Resend so nobody has to.
 *
 * ★Pure: the Resend fetching lives in scripts/emit-newsletter-metrics.ts. Everything worth being sure
 *   about (rates, the 24-hour JST window, link grouping, null handling) is here, under unit test.
 * ★A value Resend did not give us is null, never 0, and the reason goes into notes[].
 * ★No URL, token or address is written: links are reduced to (lang, kind) and their counts.
 */

export const NEWSLETTER_METRICS_SCHEMA = "newsletter-metrics/v1";

export interface BroadcastInfo {
  id: string;
  name: string | null;
  subject: string | null;
  sent_at: string; // as Resend gives it (Postgres-style UTC)
}

/** One row of GET /emails/metrics?dimensions=broadcast (fields may be missing). */
export interface TotalsRow {
  sent?: unknown;
  delivered?: unknown;
  bounced?: unknown;
  bounced_transient?: unknown;
  bounced_permanent?: unknown;
  suppressed?: unknown;
  unique_opened?: unknown;
  unique_clicked?: unknown;
  unsubscribed?: unknown;
  complained?: unknown;
}

/** One row of GET /emails/metrics?dimensions=period&granularity=hourly — `period` is UTC, no zone. */
export interface HourlyRow {
  period: string;
  unique_opened?: unknown;
  unique_clicked?: unknown;
  unsubscribed?: unknown;
}

/** One row of GET /broadcasts/{id}/clicked-links. */
export interface ClickedLinkRow {
  url: string;
  clicks?: unknown;
  unique_clicks?: unknown;
}

export interface BroadcastInput {
  broadcast: BroadcastInfo;
  /** null = the request failed; the reason is in `errors`. */
  totals: TotalsRow | null;
  hourly: HourlyRow[] | null;
  links: ClickedLinkRow[] | null;
  errors: string[];
}

const TOTAL_KEYS = [
  "sent",
  "delivered",
  "bounced",
  "bounced_transient",
  "bounced_permanent",
  "suppressed",
  "unique_opened",
  "unique_clicked",
  "unsubscribed",
  "complained",
] as const;
type TotalKey = (typeof TOTAL_KEYS)[number];

export interface NewsletterMetrics {
  schema: typeof NEWSLETTER_METRICS_SCHEMA;
  generated_at: string;
  source: string;
  notes: string[];
  broadcasts: Array<{
    id: string;
    label: string;
    subject: string | null;
    sent_at: string;
    campaign: string | null;
    totals: Record<TotalKey, number | null>;
    rates: { delivery: number | null; open: number | null; click: number | null; unsubscribe: number | null; complaint: number | null };
    hourly: Array<{ hour: string; opened: number; clicked: number; unsubscribed: number }> | null;
    links: Array<{ label: string; lang: string; kind: string; unique: number | null; clicks: number | null }> | null;
  }>;
}

/** The notes conductor's hand-made file carried — they explain how to read the numbers, so they stay. */
export const STANDING_NOTES = [
  "「押した人」には配信停止のリンクを押した人も入る（Resend の数え方）。製品へのリンクの数は下のリンク別を見る。",
  "届かなかった（bounced）は一時的なもの（相手のメールボックスがいっぱい等）と恒久的なものの合計。",
  "送らなかった（suppressed）は、過去に届かなかった・配信停止した宛先で、Resend が自動で送信から外したもの。",
  "時間帯は日本時間・送ってから 24 時間まで（それ以降は合計だけを更新する）。数は「その 1 時間の中で開いた・押した人」で、時間をまたいで開いた人はそれぞれの時間に数える（∴時間帯を足すと合計より多い。2026-10-02 実測: 発売便 302 対 合計 259）。",
  "「送った」は再送も数える（一時的に届かなかった宛先への再試行）。届いた数は変わらない。",
  "時間帯で Resend が数を返さなかった時間は 0 として並べている（Resend は数のある時間だけを返す）。",
  "リンク別は、同じ言語・同じ種類のリンクを 1 行にまとめた。1 行の中に URL が 2 つ以上ある時、押した人の数は足し算なので、両方押した人は 2 回数えている（上限の値）。",
] as const;

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Resend's "2026-09-30 22:13:13.198114+00" (also plain ISO) → epoch ms, or NaN. */
export function parseResendTime(value: string): number {
  const s = value.trim().replace(" ", "T").replace(/\+00$/, "Z").replace(/\+00:00$/, "Z");
  return Date.parse(/Z$|[+-]\d\d:\d\d$/.test(s) ? s : `${s}Z`);
}

/** epoch ms → "2026-10-01T07:13:13+09:00" (seconds, no ms — the hand-made file's shape). */
export function toJstIso(ms: number): string {
  return new Date(ms + JST_OFFSET_MS).toISOString().replace(/\.\d{3}Z$/, "+09:00");
}

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

/** Resend's default broadcast name is "Untitled" — that is not a label, so fall back to the subject. */
export function broadcastLabel(b: BroadcastInfo): string {
  const name = (b.name ?? "").trim();
  if (name && name !== "Untitled") return name;
  return (b.subject ?? "").trim() || b.id;
}

/**
 * Hourly rows for the 24 hours after sending, in JST: from the send hour through send hour + 24
 * (25 slots, like the hand-made file), stopping at `nowMs`. Labels are "07" … "23", then "翌00" …
 * Hours Resend did not return are 0 (it only returns hours with activity — STANDING_NOTES).
 */
export function hourlyWindow(sentMs: number, rows: readonly HourlyRow[], nowMs: number) {
  const byHour = new Map<number, HourlyRow>();
  for (const row of rows) {
    const ms = parseResendTime(row.period);
    if (Number.isFinite(ms)) byHour.set(Math.floor(ms / HOUR_MS) * HOUR_MS, row);
  }
  const startHour = Math.floor(sentMs / HOUR_MS) * HOUR_MS;
  const startJstDay = Math.floor((startHour + JST_OFFSET_MS) / (24 * HOUR_MS));
  const out: Array<{ hour: string; opened: number; clicked: number; unsubscribed: number }> = [];
  for (let i = 0; i <= 24; i++) {
    const h = startHour + i * HOUR_MS;
    if (h > nowMs) break;
    const jst = h + JST_OFFSET_MS;
    const hh = String(new Date(jst).getUTCHours()).padStart(2, "0");
    const nextDay = Math.floor(jst / (24 * HOUR_MS)) > startJstDay;
    const row = byHour.get(h);
    out.push({
      hour: nextDay ? `翌${hh}` : hh,
      opened: count(row?.unique_opened) ?? 0,
      clicked: count(row?.unique_clicked) ?? 0,
      unsubscribed: count(row?.unsubscribed) ?? 0,
    });
  }
  return out;
}

const KIND_LABEL: Record<string, string> = {
  product: "製品ページ",
  windows: "Windows の段",
  learn: "読み物（/learn）",
  unsubscribe: "配信停止",
};
const LANG_LABEL: Record<string, string> = { en: "英語の", ja: "日本語の" };

/**
 * A clicked URL → (lang, kind, place). ★Never the query string (unsubscribe links carry a per-recipient
 * token): `place` is the path on mued.jp, or only the hostname elsewhere — the label for a link that
 * has no utm_content and no known kind.
 */
export function classifyLink(rawUrl: string): { lang: string; kind: string; place: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { lang: "", kind: "other", place: "（URL でない）" };
  }
  if (url.hostname === "unsubscribe.resend.com" || /unsubscribe/i.test(url.pathname)) return { lang: "", kind: "unsubscribe", place: "" };
  const own = url.hostname === "mued.jp" || url.hostname.endsWith(".mued.jp");
  const place = own ? url.pathname : url.hostname;
  const lang = own ? (url.pathname.match(/^\/(ja|en)(?:\/|$)/)?.[1] ?? "") : "";
  if (own && /(^|\/)learn(\/|$)/.test(url.pathname)) return { lang, kind: "learn", place };
  const content = url.searchParams.get("utm_content");
  if (content && /^[\w-]{1,40}$/.test(content)) return { lang, kind: content, place };
  if (!own) return { lang: "", kind: "external", place };
  const segment = url.pathname.split("/").filter(Boolean).filter((s) => s !== "ja" && s !== "en")[0];
  return { lang, kind: segment && /^[\w-]{1,40}$/.test(segment) ? segment : "top", place };
}

export function campaignOf(links: readonly ClickedLinkRow[] | null): string | null {
  for (const link of links ?? []) {
    try {
      const c = new URL(link.url).searchParams.get("utm_campaign");
      if (c) return c;
    } catch {
      /* not a URL — skip */
    }
  }
  return null;
}

export function groupLinks(links: readonly ClickedLinkRow[]) {
  const groups = new Map<string, { label: string; lang: string; kind: string; unique: number | null; clicks: number | null }>();
  const add = (a: number | null, b: number | null) => (a === null || b === null ? null : a + b);
  for (const link of links) {
    const { lang, kind, place } = classifyLink(link.url);
    const key = `${lang}|${kind}`;
    const unique = count(link.unique_clicks);
    const clicks = count(link.clicks);
    const prev = groups.get(key);
    if (prev) {
      prev.unique = add(prev.unique, unique);
      prev.clicks = add(prev.clicks, clicks);
    } else {
      const kindLabel = KIND_LABEL[kind] ?? place;
      const prefix = kind === "unsubscribe" || kind === "learn" || !lang || !KIND_LABEL[kind] ? "" : (LANG_LABEL[lang] ?? "");
      // "英語の Windows の段" — a space before Latin script, as in the hand-made file.
      const label = prefix && /^[A-Za-z]/.test(kindLabel) ? `${prefix} ${kindLabel}` : `${prefix}${kindLabel}`;
      groups.set(key, { label, lang, kind, unique, clicks });
    }
  }
  // Most-clicked first; 配信停止 always last (it is not a product link).
  return [...groups.values()].sort((a, b) => {
    if ((a.kind === "unsubscribe") !== (b.kind === "unsubscribe")) return a.kind === "unsubscribe" ? 1 : -1;
    return (b.clicks ?? -1) - (a.clicks ?? -1);
  });
}

export function toNewsletterMetrics(inputs: readonly BroadcastInput[], nowMs: number, source: string): NewsletterMetrics {
  const notes: string[] = [...STANDING_NOTES];
  const broadcasts = [...inputs]
    .sort((a, b) => parseResendTime(b.broadcast.sent_at) - parseResendTime(a.broadcast.sent_at))
    .map(({ broadcast, totals, hourly, links, errors }) => {
      const sentMs = parseResendTime(broadcast.sent_at);
      for (const e of errors) notes.push(`${broadcast.id.slice(0, 8)}: ${e}`);
      const t = Object.fromEntries(TOTAL_KEYS.map((k) => [k, totals ? count(totals[k]) : null])) as Record<TotalKey, number | null>;
      if (totals) {
        const missing = TOTAL_KEYS.filter((k) => t[k] === null);
        if (missing.length) notes.push(`${broadcast.id.slice(0, 8)}: Resend の合計に ${missing.join("・")} が無かった（null）`);
      }
      return {
        id: broadcast.id,
        label: broadcastLabel(broadcast),
        subject: broadcast.subject,
        sent_at: Number.isFinite(sentMs) ? toJstIso(sentMs) : broadcast.sent_at,
        campaign: campaignOf(links),
        totals: t,
        rates: {
          delivery: pct(t.delivered, t.sent),
          open: pct(t.unique_opened, t.delivered),
          click: pct(t.unique_clicked, t.delivered),
          unsubscribe: pct(t.unsubscribed, t.delivered),
          complaint: pct(t.complained, t.delivered),
        },
        hourly: hourly && Number.isFinite(sentMs) ? hourlyWindow(sentMs, hourly, nowMs) : null,
        links: links ? groupLinks(links) : null,
      };
    });
  return { schema: NEWSLETTER_METRICS_SCHEMA, generated_at: toJstIso(nowMs), source, notes, broadcasts };
}
