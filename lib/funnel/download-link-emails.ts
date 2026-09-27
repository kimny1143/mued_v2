//
// ★Clicks on the download-link email (MUEDlim / MUEDsat / MUEDrive) — the transactional mail a user
// gets right after signing up, NOT the newsletter (that is `newsletters`, from broadcasts).
//
// ★WHY (conductor, 2026-09-27; kimny: 「今の時点で集計してから正確に入れたい」). conductor counted the
// window by hand first (conductor repo docs/growth/download-link-clicks-20260927.md); this makes the
// same count daily so the two can be compared.
//
// ★The start is FIXED, not rolling. Click tracking was off before 2026-09-23 15:51 JST, so an older
// mail can never be `clicked` — mixing it in would pull the rate down with mails that could not
// have scored. ★The start is a property of the data, not a choice of window.
//
// ★What a status means: Resend keeps ONE status per mail, its latest event. A mail that was opened
// and then clicked is `clicked`, and a `delivered` mail can become `clicked` tomorrow — ∴ the same
// window counted later can only move toward clicked. ★`delivered` is not "unopened": clients that
// block images never record an open.
//
// ★No addresses leave this module. Recipients are only compared for equality to count people.
//

/** First send after click tracking was switched on (2026-09-23 15:51 JST). Earlier mails are excluded. */
export const DOWNLOAD_LINK_SINCE = "2026-09-23T06:51:00.000Z";

export const DOWNLOAD_LINK_EMAILS_DEFINITION =
  "登録直後に自動で届くダウンロードリンクメール（Resend の transactional・broadcast は含まない）。" +
  "件名が /download|ダウンロード/i に一致し、かつ製品キー（muedlim / muedsat / muedrive・大小無視）を含むものを、その製品に数える。" +
  "リンクの無い代替件名（「〜をありがとうございます」）は含まない。" +
  "all_time は since（クリック計測 on・2026-09-23T06:51Z）から until まで、last_24h は until の 24 時間前から until まで。until は集計時刻。" +
  "状態は各メールの最新の 1 つ（last_event）: clicked / opened / delivered / bounced / complained、それ以外は other。" +
  "reached = clicked + opened + delivered + complained（届いた分）。" +
  "unique_recipients は届いた分の宛先の重複を除いた人数、unique_clicked_recipients はそのうち 1 通でも clicked の人数、" +
  "unique_opened_or_clicked_recipients は 1 通でも opened か clicked の人数（宛先アドレスは出力しない）。" +
  "後から押されると delivered/opened が clicked に変わるので、同じ期間でも後で数えると clicked は増えうる。" +
  "delivered は「開いていない」ではない（画像を読まないメールソフトでは開封が記録されない）。" +
  "リンク確認の自動スキャンで clicked になる場合がある。クリックはダウンロードページへの到達で、インストール完了ではない。" +
  "取得が失敗した日、または since より前まで一覧を遡れなかった日は null（0 ではない）。";

export interface ResendEmail {
  id: string;
  to?: string[] | string | null;
  subject?: string | null;
  last_event?: string | null;
  created_at?: string | null;
}

export interface DownloadLinkStats {
  sent: number;
  bounced: number;
  reached: number;
  clicked: number;
  opened: number;
  delivered: number;
  complained: number;
  other: number;
  unique_recipients: number;
  unique_clicked_recipients: number;
  unique_opened_or_clicked_recipients: number;
}

export interface DownloadLinkWindow<K extends string = string> {
  from: string;
  until: string;
  total: DownloadLinkStats;
  by_product: Record<K, DownloadLinkStats>;
}

export interface DownloadLinkEmails<K extends string = string> {
  since: string;
  all_time: DownloadLinkWindow<K>;
  last_24h: DownloadLinkWindow<K>;
}

const DOWNLOAD_RE = /download|ダウンロード/i;

/** The product a download-link subject names, or null if the subject is not a download-link mail. */
export function downloadLinkProduct<K extends string>(subject: string | null | undefined, keys: readonly K[]): K | null {
  const s = subject || "";
  if (!DOWNLOAD_RE.test(s)) return null;
  const lower = s.toLowerCase();
  return keys.find((k) => lower.includes(k.toLowerCase())) ?? null;
}

/** Resend returns "2026-09-23 06:51:27.479028+00"; V8 parses it. ★Unparseable is an error, not a skip. */
export function emailTime(email: ResendEmail): number {
  const ms = Date.parse(email.created_at ?? "");
  if (!Number.isFinite(ms)) {
    throw new Error(`[download-link-emails] email ${email.id} has unparseable created_at ${JSON.stringify(email.created_at)}`);
  }
  return ms;
}

function recipientKey(email: ResendEmail): string {
  const to = Array.isArray(email.to) ? email.to : email.to ? [email.to] : [];
  const key = to.map((a) => a.trim().toLowerCase()).filter(Boolean).sort().join(",");
  // ★A mail with no recipient cannot be merged with anyone — count it as its own person rather than
  //   collapsing every such mail into one "" person.
  return key || `(no-recipient:${email.id})`;
}

const REACHED = new Set(["clicked", "opened", "delivered", "complained"]);

export function stats(emails: readonly ResendEmail[]): DownloadLinkStats {
  const s: DownloadLinkStats = {
    sent: 0, bounced: 0, reached: 0, clicked: 0, opened: 0, delivered: 0, complained: 0, other: 0,
    unique_recipients: 0, unique_clicked_recipients: 0, unique_opened_or_clicked_recipients: 0,
  };
  const reached = new Set<string>();
  const clicked = new Set<string>();
  const openedOrClicked = new Set<string>();
  for (const e of emails) {
    s.sent++;
    const ev = e.last_event ?? "";
    if (ev === "clicked") s.clicked++;
    else if (ev === "opened") s.opened++;
    else if (ev === "delivered") s.delivered++;
    else if (ev === "complained") s.complained++;
    else if (ev === "bounced") s.bounced++;
    else s.other++;
    if (!REACHED.has(ev)) continue;
    s.reached++;
    const who = recipientKey(e);
    reached.add(who);
    if (ev === "clicked") clicked.add(who);
    if (ev === "clicked" || ev === "opened") openedOrClicked.add(who);
  }
  s.unique_recipients = reached.size;
  s.unique_clicked_recipients = clicked.size;
  s.unique_opened_or_clicked_recipients = openedOrClicked.size;
  return s;
}

function windowOf<K extends string>(
  emails: readonly ResendEmail[], keys: readonly K[], fromMs: number, untilMs: number,
): DownloadLinkWindow<K> {
  const inWindow: { e: ResendEmail; k: K }[] = [];
  for (const e of emails) {
    const k = downloadLinkProduct(e.subject, keys);
    if (k === null) continue;
    const t = emailTime(e);
    if (t >= fromMs && t <= untilMs) inWindow.push({ e, k });
  }
  return {
    from: new Date(fromMs).toISOString(),
    until: new Date(untilMs).toISOString(),
    total: stats(inWindow.map((x) => x.e)),
    by_product: Object.fromEntries(
      keys.map((k) => [k, stats(inWindow.filter((x) => x.k === k).map((x) => x.e))]),
    ) as Record<K, DownloadLinkStats>,
  };
}

/**
 * Pure: count download-link mails. `emails` may contain any transactional mail from any time; only
 * download-link subjects inside each window are counted. The caller must have listed back past
 * `since` — this function cannot tell a short list from a quiet week.
 */
export function toDownloadLinkEmails<K extends string>(
  emails: readonly ResendEmail[], keys: readonly K[], untilIso: string, sinceIso: string = DOWNLOAD_LINK_SINCE,
): DownloadLinkEmails<K> {
  const sinceMs = Date.parse(sinceIso);
  const untilMs = Date.parse(untilIso);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || untilMs < sinceMs) {
    throw new Error(`[download-link-emails] bad window since=${sinceIso} until=${untilIso}`);
  }
  return {
    since: new Date(sinceMs).toISOString(),
    all_time: windowOf(emails, keys, sinceMs, untilMs),
    last_24h: windowOf(emails, keys, Math.max(sinceMs, untilMs - 24 * 3600 * 1000), untilMs),
  };
}
