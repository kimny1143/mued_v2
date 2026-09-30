//
// ★The launch numbers kimny reads on the PWA (Chief window 2026-09-30, kimny 逐語「その指標に基づいて
// 数える仕組みだけ作っとくか。PWAの数のところで見れるようにしたい。」).
//
// Counted from LAUNCH_AT (the send time of the launch newsletter) — no new instrument:
//   1. demo downloads  = people who got the masterchain demo receipt email (Resend, by exact subject).
//      The demo entry writes nothing to the DB; the receipt is sent right as the download starts, so
//      "got the receipt" = "the download started". ★Not installs. People blocked by the honeypot or a
//      rate limit, or whose receipt failed to send, are not counted.
//   2. purchases       = masterchain purchase emails sent (webhook → license delivery email). One mail
//      per order, so this counts ORDERS, not people.
//   3/4. launch newsletter opens / clicks = the first broadcast sent at or after LAUNCH_AT, straight
//      from the `newsletters` the collector already reads (unique counts from Resend).
//
// ★LAUNCH_AT is null until the launch newsletter is sent. While null nothing is counted and the board
// says "not started" — never 0. Set it in a one-line PR right after the send (conductor 2026-09-30:
// kimny's own verification purchase happens BEFORE the send, so it is outside the window).
//
// ★No addresses leave this module; recipients are only compared for equality.
import type { Newsletter } from "./newsletters";
import { emailTime, type ResendEmail } from "./download-link-emails";

/** Send time of the launch newsletter (ISO, UTC). null = not sent yet → nothing is counted. */
export const LAUNCH_AT: string | null = null;

/**
 * Exact subjects, copied from lib/services/email.service.ts (masterchainDemoDownload /
 * masterchainLicenseDelivery). ★Pinned against the templates by tests/unit/funnel-launch.test.ts, so a
 * subject edited there without editing here fails CI instead of silently counting 0.
 */
export const DEMO_SUBJECTS: readonly string[] = [
  "MUEDsp masterchain デモのダウンロード",
  "Your MUEDsp masterchain demo download",
];
export const PURCHASE_SUBJECTS: readonly string[] = [
  "[MUEDsp] masterchain のダウンロードとライセンスの受け取り",
  "[MUEDsp] Your masterchain download and how to get your license",
  "[MUEDsp] masterchain のライセンスはポータルで受け取れます",
  "[MUEDsp] Your masterchain license is ready in your portal",
];

export const LAUNCH_DEFINITION =
  "起点は発売便の送信時刻（launch_at）。all_time は起点から集計時刻まで、last_24h は集計時刻の 24 時間前から（起点より前は含まない）。" +
  "demo_downloads は masterchain のデモの控えのメール（件名で判別）を送った宛先の人数（重複を除く）＝デモの入口で DL が始まった人数。インストール完了ではない。控えのメールの送信に失敗した人、honeypot・rate limit で弾いた人は含まない。" +
  "purchases は masterchain の購入の案内メール（件名で判別・webhook から送られる）の通数＝注文数（人数ではない）。" +
  "launch_newsletter は起点以降に送った最初の broadcast の unique_opened / unique_clicked（Resend の値のまま・無い時は null）。" +
  "launch_at が null の間は started=false で、何も数えない（0 ではない）。取得が失敗した日は null。";

export interface LaunchWindow {
  from: string;
  until: string;
  demo_downloads: number;
  purchases: number;
}

export interface LaunchNewsletter {
  id: string;
  name: string;
  sent_at: string;
  unique_opened: number | null;
  unique_clicked: number | null;
}

export type LaunchNumbers =
  | { started: false; launch_at: null }
  | {
      started: true;
      launch_at: string;
      all_time: LaunchWindow;
      last_24h: LaunchWindow;
      launch_newsletter: LaunchNewsletter | null;
    };

function recipientKey(email: ResendEmail): string {
  const to = Array.isArray(email.to) ? email.to : email.to ? [email.to] : [];
  const key = to.map((a) => a.trim().toLowerCase()).filter(Boolean).sort().join(",");
  return key || `(no-recipient:${email.id})`;
}

function windowOf(emails: readonly ResendEmail[], fromMs: number, untilMs: number): LaunchWindow {
  const demoPeople = new Set<string>();
  let purchases = 0;
  for (const e of emails) {
    const subject = e.subject ?? "";
    const isDemo = DEMO_SUBJECTS.includes(subject);
    const isPurchase = PURCHASE_SUBJECTS.includes(subject);
    if (!isDemo && !isPurchase) continue;
    const t = emailTime(e);
    if (t < fromMs || t > untilMs) continue;
    if (isDemo) demoPeople.add(recipientKey(e));
    else purchases++;
  }
  return {
    from: new Date(fromMs).toISOString(),
    until: new Date(untilMs).toISOString(),
    demo_downloads: demoPeople.size,
    purchases,
  };
}

/**
 * Pure. `emails` may hold any transactional mail from any time (the collector lists back to
 * 2026-09-23, before any launch) — only the two subject families inside each window are counted.
 * `newsletters` is the collector's list (null when that fetch failed → launch_newsletter null).
 */
export function toLaunchNumbers(
  emails: readonly ResendEmail[],
  newsletters: readonly Newsletter[] | null,
  untilIso: string,
  launchAt: string | null = LAUNCH_AT,
): LaunchNumbers {
  if (launchAt === null) return { started: false, launch_at: null };
  const fromMs = Date.parse(launchAt);
  const untilMs = Date.parse(untilIso);
  if (!Number.isFinite(fromMs) || !Number.isFinite(untilMs)) {
    throw new Error(`[launch] bad window launch_at=${launchAt} until=${untilIso}`);
  }
  // ★Before the launch the window is empty, not negative: the board still says "started" (the
  //   constant is set) but every count is 0 until mail arrives.
  const until = Math.max(fromMs, untilMs);
  const first = (newsletters ?? [])
    .filter((n) => Date.parse(n.sent_at) >= fromMs)
    .sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))[0];
  return {
    started: true,
    launch_at: new Date(fromMs).toISOString(),
    all_time: windowOf(emails, fromMs, until),
    last_24h: windowOf(emails, Math.max(fromMs, until - 24 * 3600 * 1000), until),
    launch_newsletter: first
      ? {
          id: first.id,
          name: first.name,
          sent_at: first.sent_at,
          unique_opened: first.unique_opened,
          unique_clicked: first.unique_clicked,
        }
      : null,
  };
}
