/**
 * Email Service - Core email sending functionality using Resend
 *
 * Provides type-safe email sending with templates for:
 * - Reservation confirmations (student/mentor)
 * - Payment notifications
 * - Cancellation notices
 * - Reminder emails
 */

import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';
import { MUEDSAT_DOWNLOAD_URL } from '@/lib/muedsat/config';
import { MUEDLIM_DOWNLOAD_URL } from '@/lib/muedlim/config';
import { signUnsubscribeToken } from '@/lib/plugins/unsubscribe-token';

// ========================================
// Configuration
// ========================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'MUED <noreply@mued.jp>';
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT || 'support@mued.jp';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

/**
 * Campaign tagging for links we send by email, so their traffic stops landing in GA4 as "direct".
 *
 * ★Where this actually takes effect today (measured against prod, not assumed):
 *   - `/muedsp` (forward hook) — the next.config redirect keeps the query, so gtag reads it. ✓
 *   - `dial.mued.jp` (waitlist beta) — served 200 directly. ✓
 *   - `/dashboard/plugins` (portal button) — ✗ **only for recipients who are already signed in.**
 *     A signed-out visit is bounced to `/sign-in?redirect_url=%2Fdashboard%2Fplugins`, which keeps the
 *     pathname and DROPS the query, and the post-auth landing has no parameters either. So the campaign
 *     never reaches gtag for exactly the cohort the welcome email is aimed at. Fixing that means making
 *     the auth redirect carry the original query — an auth-path change, tracked separately.
 * Tagging is still correct here: the parameters are right, the delivery path is what's lossy.
 *
 * Taxonomy owned by content/data (data課 PR #177 is canonical); this file only applies it.
 * `utm_campaign` says WHICH EMAIL, `utm_content` says WHICH LINK in it — a shared block used by two
 * different emails therefore has to be told its campaign, never hardcode one (it would still send,
 * just mis-attributed, which is the kind of bug nothing fails on).
 *
 * ★Only add this to links whose job is acquisition. Do NOT tag:
 *   - unsubscribe links,
 *   - transactional links (dashboard / receipt / session / update-payment / complete),
 *   - the plugin .pkg download URLs.
 * A campaign-tagged link starts a new attributed GA4 session, so tagging a receipt link would turn an
 * existing customer opening their receipt into "acquired via email". Over-tagging is much harder to
 * unwind afterwards than under-tagging. The .pkg links are excluded for a different reason: they are
 * direct file downloads, so no page loads and no gtag ever runs to read the parameters.
 *
 * Appends to the end, so a URL carrying a fragment (`#…`) would end up with the parameters inside the
 * fragment. No caller has one; split on `#` first if that ever changes.
 */
function withEmailUtm(url: string, campaign: string, content: string): string {
  const sep = url.includes('?') ? '&' : '?';
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'lifecycle',
    utm_campaign: campaign,
    utm_content: content,
  });
  return `${url}${sep}${params.toString()}`;
}

/** Campaign ids, one per email (content課 2026-07-24 / `email_` prefix mirrors the existing `zenn_` pattern). */
const UTM_CAMPAIGN = {
  welcomeMuedsat: 'email_welcome-muedsat',
  welcomeMuedlim: 'email_welcome-muedlim',
  waitlistMuedial: 'email_waitlist-muedial',
} as const;

/** One-click List-Unsubscribe URL for a plugin free-download subscriber (RFC 8058). */
function pluginUnsubscribeUrl(plugin: 'muedsat' | 'muedlim', email: string, locale: 'ja' | 'en'): string {
  const t = signUnsubscribeToken(plugin, email);
  return `${APP_URL}/api/plugins/unsubscribe?plugin=${plugin}&email=${encodeURIComponent(email)}&t=${t}&locale=${locale}`;
}

// Initialize Resend client (lazy initialization)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
}

// ========================================
// Type Definitions
// ========================================

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  /** File attachments (e.g. a text/calendar .ics invite). `content` = base64 string. */
  attachments?: { filename: string; content: string; contentType?: string }[];
  /** Extra SMTP headers (e.g. List-Unsubscribe / List-Unsubscribe-Post for one-click unsubscribe). */
  headers?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ========================================
// Email Templates
// ========================================

export interface ReservationEmailData {
  studentName: string;
  mentorName: string;
  lessonDate: string;
  lessonTime: string;
  duration: string;
  price: string;
  reservationId: string;
  dashboardUrl: string;
}

export interface PaymentEmailData {
  studentName: string;
  mentorName: string;
  lessonDate: string;
  amount: string;
  paymentId: string;
  receiptUrl?: string;
}

export interface CancellationEmailData {
  recipientName: string;
  otherPartyName: string;
  lessonDate: string;
  lessonTime: string;
  reason?: string;
  refundAmount?: string;
}

export interface ReminderEmailData {
  studentName: string;
  mentorName: string;
  lessonDate: string;
  lessonTime: string;
  hoursUntil: number;
  dashboardUrl: string;
}

export interface PaymentFailedEmailData {
  userName: string;
  tier: string;
  errorMessage?: string;
  updatePaymentUrl: string;
}

export interface DialPurchaseConfirmedEmailData {
  email: string;
  purchaseType: string;
  sessionUrl: string;
}

export interface DialResultsReadyEmailData {
  email: string;
  purchaseType: string;
  downloadUrl: string;
}

export interface DialAdditionalCycleEmailData {
  email: string;
  sessionUrl: string;
}

export interface GlasswerksInquiryNotifyEmailData {
  inquiryNumber: string;
  serviceType: string;
  budgetRange: string;
  description: string;
  urgency: string;
  language: string;
  userName: string | null;
  userEmail: string | null;
}

export interface GlasswerksInquiryConfirmEmailData {
  inquiryNumber: string;
  serviceType: string;
  userName: string | null;
  language: string;
}

// ========================================
// Template Generators
// ========================================

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MUED</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; }
    .footer { background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 24px;">MUED</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">Music Education Platform</p>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>このメールは自動送信されています。</p>
    <p>ご質問がございましたら、<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> までお問い合わせください。</p>
    <p>&copy; ${new Date().getFullYear()} MUED. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * User portal promo block for the free-download welcome emails (P-3 / C-1 — the "定着装置" hook).
 * Woven per Chief C′: (1) ownership feel — "your plugins have a home", never "register/sign up";
 * (2) the permanent passwordless door — the same email is the key (tap → emailed code → in, no
 * password); (3) the portal button itself (this block). Links to /dashboard/plugins. Shared by both
 * welcome templates so the copy never drifts.
 */
function portalPromoBlock(isJa: boolean, campaign: string): { html: string; text: string } {
  const url = withEmailUtm(`${APP_URL}/dashboard/plugins`, campaign, 'portal-button');
  const html = `
      <div style="margin: 28px 0 8px; padding: 18px 20px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fafafa;">
        <p style="margin: 0 0 6px; font-weight: 600;">${isJa ? 'あなたのプラグインの置き場所ができました。' : 'Your plugins have a home now.'}</p>
        <p style="margin: 0 0 14px; color: #4b5563; font-size: 14px;">${isJa
          ? '入手したプラグインはあなたのポータルにまとまっています。いつでも最新版がワンクリック。次回からメールのリンクを探す必要はありません。'
          : "Everything you've grabbed lives in your portal — always the latest build, one click away. No email link to dig up next time."}</p>
        <p style="text-align: center; margin: 0 0 12px;">
          <a href="${url}" class="button" style="background: transparent; color: #b57a14; border: 1px solid #f5a524; font-weight: 600;">
            ${isJa ? 'ポータルを開く' : 'Open your portal'}
          </a>
        </p>
        <p style="margin: 0; color: #6b7280; font-size: 12px;">${isJa
          ? 'メールアドレスが鍵です。ボタンを押すとコードが届き、それだけで入れます。パスワードは要りません。'
          : "Your email is the key: tap the button, we email you a code, and you're in — no password to remember."}</p>
      </div>`;
  const text = isJa
    ? `\n\nあなたのプラグインの置き場所ができました。\n入手したプラグインはあなたのポータルにまとまっています（いつでも最新版がワンクリック）。\nポータルを開く: ${url}\nメールアドレスが鍵です。ボタンからコードが届き、それだけで入れます（パスワード不要）。`
    : `\n\nYour plugins have a home now.\nEverything you've grabbed lives in your portal — always the latest build, one click away.\nOpen your portal: ${url}\nYour email is the key: tap the link, we email you a code, and you're in — no password to remember.`;
  return { html, text };
}

/**
 * Road to 10k 層1 #2 — the zero-friction sharing hook. One subtle line in the free-download welcome
 * (and future update) emails: forwarding costs nothing and the plugins are free for anyone, so every
 * email touch becomes a sharing channel. Points forwarded recipients at /muedsp — the DL entry, NOT the
 * portal (a portal link needs the recipient's OWN email, so it can't be forwarded). Zero spam feel by
 * design (「役立ちそうな人がいたら」, not 「拡散して」). Shared by both welcome templates so copy never drifts.
 */
function forwardHookBlock(isJa: boolean, campaign: string): { html: string; text: string } {
  const url = withEmailUtm(`${APP_URL}/muedsp`, campaign, 'forward-hook');
  const link = `<a href="${url}" style="color: #b57a14; text-decoration: underline;">mued.jp/muedsp</a>`;
  const html = `
      <p style="margin: 18px 0 0; color: #6b7280; font-size: 13px;">${isJa
        ? `役に立ちそうな人がいたら、このメールを転送してください。MUEDsat と MUEDlim は、どなたでも無料でお使いいただけます（${link}）。`
        : `Know someone who'd use these? Forward this along — MUEDsat and MUEDlim are free for anyone at ${link}.`}</p>`;
  const text = isJa
    ? `\n\n役に立ちそうな人がいたら、このメールを転送してください。MUEDsat と MUEDlim は、どなたでも無料でお使いいただけます（${url}）。`
    : `\n\nKnow someone who'd use these? Forward this along — MUEDsat and MUEDlim are free for anyone at ${url}.`;
  return { html, text };
}

export const emailTemplates = {
  /**
   * Reservation confirmed - sent to student
   */
  reservationConfirmedStudent(data: ReservationEmailData): { subject: string; html: string; text: string } {
    const subject = `予約が確定しました - ${data.lessonDate}`;

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">予約が確定しました</h2>
      <p>${data.studentName} 様</p>
      <p>レッスンの予約が確定しましたのでお知らせします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">講師</span>
          <span class="value">${data.mentorName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
        <div class="info-row">
          <span class="label">時間</span>
          <span class="value">${data.duration}</span>
        </div>
        <div class="info-row">
          <span class="label">料金</span>
          <span class="value">${data.price}</span>
        </div>
        <div class="info-row">
          <span class="label">予約ID</span>
          <span class="value">${data.reservationId.slice(0, 8)}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">ダッシュボードで確認</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        キャンセルする場合は、レッスン開始24時間前までにダッシュボードからお手続きください。
      </p>
    `);

    const text = `
予約が確定しました

${data.studentName} 様

レッスンの予約が確定しましたのでお知らせします。

講師: ${data.mentorName}
日時: ${data.lessonDate} ${data.lessonTime}
時間: ${data.duration}
料金: ${data.price}
予約ID: ${data.reservationId.slice(0, 8)}

ダッシュボード: ${data.dashboardUrl}

キャンセルする場合は、レッスン開始24時間前までにダッシュボードからお手続きください。
    `.trim();

    return { subject, html, text };
  },

  /**
   * Reservation confirmed - sent to mentor
   */
  reservationConfirmedMentor(data: ReservationEmailData): { subject: string; html: string; text: string } {
    const subject = `新規予約 - ${data.lessonDate}`;

    const html = baseTemplate(`
      <h2 style="color: #2563eb; margin-top: 0;">新しい予約が入りました</h2>
      <p>${data.mentorName} 様</p>
      <p>新しいレッスンの予約が入りましたのでお知らせします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">生徒</span>
          <span class="value">${data.studentName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
        <div class="info-row">
          <span class="label">時間</span>
          <span class="value">${data.duration}</span>
        </div>
        <div class="info-row">
          <span class="label">料金</span>
          <span class="value">${data.price}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">ダッシュボードで確認</a>
      </p>
    `);

    const text = `
新しい予約が入りました

${data.mentorName} 様

新しいレッスンの予約が入りましたのでお知らせします。

生徒: ${data.studentName}
日時: ${data.lessonDate} ${data.lessonTime}
時間: ${data.duration}
料金: ${data.price}

ダッシュボード: ${data.dashboardUrl}
    `.trim();

    return { subject, html, text };
  },

  /**
   * Payment completed notification
   */
  paymentCompleted(data: PaymentEmailData): { subject: string; html: string; text: string } {
    const subject = `お支払いが完了しました`;

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">お支払いが完了しました</h2>
      <p>${data.studentName} 様</p>
      <p>レッスン料金のお支払いが完了しました。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">講師</span>
          <span class="value">${data.mentorName}</span>
        </div>
        <div class="info-row">
          <span class="label">レッスン日</span>
          <span class="value">${data.lessonDate}</span>
        </div>
        <div class="info-row">
          <span class="label">金額</span>
          <span class="value">${data.amount}</span>
        </div>
        <div class="info-row">
          <span class="label">決済ID</span>
          <span class="value">${data.paymentId.slice(0, 12)}</span>
        </div>
      </div>

      ${data.receiptUrl ? `
      <p style="text-align: center;">
        <a href="${data.receiptUrl}" class="button">領収書を表示</a>
      </p>
      ` : ''}
    `);

    const text = `
お支払いが完了しました

${data.studentName} 様

レッスン料金のお支払いが完了しました。

講師: ${data.mentorName}
レッスン日: ${data.lessonDate}
金額: ${data.amount}
決済ID: ${data.paymentId.slice(0, 12)}

${data.receiptUrl ? `領収書: ${data.receiptUrl}` : ''}
    `.trim();

    return { subject, html, text };
  },

  /**
   * Cancellation notification
   */
  cancellation(data: CancellationEmailData): { subject: string; html: string; text: string } {
    const subject = `レッスンがキャンセルされました - ${data.lessonDate}`;

    const html = baseTemplate(`
      <h2 style="color: #dc2626; margin-top: 0;">レッスンがキャンセルされました</h2>
      <p>${data.recipientName} 様</p>
      <p>以下のレッスンがキャンセルされましたのでお知らせします。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">相手</span>
          <span class="value">${data.otherPartyName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
        ${data.reason ? `
        <div class="info-row">
          <span class="label">理由</span>
          <span class="value">${data.reason}</span>
        </div>
        ` : ''}
        ${data.refundAmount ? `
        <div class="info-row">
          <span class="label">返金額</span>
          <span class="value">${data.refundAmount}</span>
        </div>
        ` : ''}
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        ご不明な点がございましたら、サポートまでお問い合わせください。
      </p>
    `);

    const text = `
レッスンがキャンセルされました

${data.recipientName} 様

以下のレッスンがキャンセルされましたのでお知らせします。

相手: ${data.otherPartyName}
日時: ${data.lessonDate} ${data.lessonTime}
${data.reason ? `理由: ${data.reason}` : ''}
${data.refundAmount ? `返金額: ${data.refundAmount}` : ''}

ご不明な点がございましたら、サポートまでお問い合わせください。
    `.trim();

    return { subject, html, text };
  },

  /**
   * Lesson reminder
   */
  reminder(data: ReminderEmailData): { subject: string; html: string; text: string } {
    const subject = `レッスンリマインダー - ${data.hoursUntil}時間後`;

    const html = baseTemplate(`
      <h2 style="color: #f59e0b; margin-top: 0;">レッスンが近づいています</h2>
      <p>${data.studentName} 様</p>
      <p>レッスン開始まであと <strong>${data.hoursUntil}時間</strong> です。</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">講師</span>
          <span class="value">${data.mentorName}</span>
        </div>
        <div class="info-row">
          <span class="label">日時</span>
          <span class="value">${data.lessonDate} ${data.lessonTime}</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.dashboardUrl}" class="button">ダッシュボードで確認</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        レッスンの準備をお忘れなく!
      </p>
    `);

    const text = `
レッスンが近づいています

${data.studentName} 様

レッスン開始まであと ${data.hoursUntil}時間 です。

講師: ${data.mentorName}
日時: ${data.lessonDate} ${data.lessonTime}

ダッシュボード: ${data.dashboardUrl}

レッスンの準備をお忘れなく!
    `.trim();

    return { subject, html, text };
  },

  /**
   * MUEDial purchase confirmed — sent after checkout
   */
  dialPurchaseConfirmed(data: DialPurchaseConfirmedEmailData): { subject: string; html: string; text: string } {
    const isDialogue = data.purchaseType === 'dialogue';
    const subject = 'MUEDial — セッションの準備ができました / Your session is ready';

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">ご購入ありがとうございます！ / Purchase Confirmed</h2>

      <p>MUEDialをご利用いただきありがとうございます。セッションの準備ができました。</p>
      <p style="color: #6b7280;">Thank you for your MUEDial purchase. Your session is ready to start.</p>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #1f2937;">ミックス開始の手順 / How to Start</h3>

        <div style="margin: 12px 0;">
          <strong style="color: #059669;">Step 1</strong> — セッションページを開く<br>
          <span style="color: #6b7280; font-size: 14px;">Open your session page via the button below.</span>
        </div>

        <div style="margin: 12px 0;">
          <strong style="color: #059669;">Step 2</strong> — ステムをアップロードする<br>
          <span style="color: #6b7280; font-size: 14px;">Upload your stem files (WAV/MP3). DAWからトラックをバウンスして個別ファイルとして書き出してください。Export each track from your DAW as a separate file.</span>
        </div>

        <div style="margin: 12px 0;">
          <strong style="color: #059669;">Step 3</strong> — ${isDialogue ? 'AIと対話しながら調整する' : 'AIに自動処理を任せる'}<br>
          <span style="color: #6b7280; font-size: 14px;">${isDialogue
            ? '「ボーカルをもう少し前に出して」など、感覚的な言葉でAIに伝えてください。Tell AI your direction in natural language.'
            : 'AIが自動でミックスを仕上げます。1ラウンドのフィードバック調整が可能です。AI will automatically mix your tracks. One round of feedback included.'
          }</span>
        </div>

        <div style="margin: 12px 0;">
          <strong style="color: #059669;">Step 4</strong> — 完成ファイルを受け取る<br>
          <span style="color: #6b7280; font-size: 14px;">ミックス完成後にメールでお知らせします。You'll receive an email when your mix is ready.</span>
        </div>
      </div>

      <p style="text-align: center;">
        <a href="${data.sessionUrl}" class="button">セッションを開く / Go to Session</a>
      </p>

      <div class="info-box" style="background: #f9fafb;">
        <h4 style="margin-top: 0; color: #374151;">よくある質問 / FAQ</h4>
        <p style="margin: 8px 0;"><strong>Q: どんなファイルが必要ですか？</strong><br>
        <span style="color: #6b7280; font-size: 14px;">WAVまたはMP3形式のステムファイル。ドラム・ベース・ボーカル等、トラックごとに個別のファイルとして書き出してください。</span></p>
        <p style="margin: 8px 0;"><strong>Q: How long does it take?</strong><br>
        <span style="color: #6b7280; font-size: 14px;">Processing typically takes a few minutes after upload. You'll receive an email when your mix is ready.</span></p>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin-top: 16px;">
        セッションリンクは7日間有効です。Session link valid for 7 days.<br>
        ご不明な点は <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> までどうぞ。
      </p>
    `);

    const text = `
ご購入ありがとうございます！MUEDial セッション準備完了

ミックス開始の手順:
1. セッションページを開く: ${data.sessionUrl}
2. ステムをアップロード（DAWからトラックを個別にバウンス・WAV/MP3）
3. ${isDialogue ? 'AIと対話しながら方向性を調整（感覚的な言葉でOK）' : 'AIが自動でミックスを処理（フィードバック1ラウンド含む）'}
4. 完成後にメールでお知らせします

よくある質問:
- ステムとは？ → ドラム・ベース・ボーカル等を個別ファイルとして書き出したもの
- 処理時間は？ → アップロード後、数分〜で完成メールが届きます

セッションリンクは7日間有効です。
ご不明な点は ${SUPPORT_EMAIL} までどうぞ。
    `.trim();

    return { subject, html, text };
  },

  /**
   * MUEDial results ready — sent when mix is completed
   */
  dialResultsReady(data: DialResultsReadyEmailData): { subject: string; html: string; text: string } {
    const subject = 'Your MUEDial mix is ready!';

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">Your Mix is Ready!</h2>
      <p>Great news — your <strong>${data.purchaseType}</strong> mix has been completed.</p>

      <p style="text-align: center;">
        <a href="${data.downloadUrl}" class="button">Download Your Mix</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        Download links are available for 7 days. If you need help, contact us at ${SUPPORT_EMAIL}.
      </p>
    `);

    const text = `
Your MUEDial Mix is Ready!

Your ${data.purchaseType} mix has been completed.

Download: ${data.downloadUrl}

Download links are available for 7 days.
    `.trim();

    return { subject, html, text };
  },

  /**
   * MUEDial additional cycle purchased
   */
  dialAdditionalCyclePurchased(data: DialAdditionalCycleEmailData): { subject: string; html: string; text: string } {
    const subject = 'Your additional mix cycle is ready';

    const html = baseTemplate(`
      <h2 style="color: #059669; margin-top: 0;">Additional Cycle Activated</h2>
      <p>Your additional retake cycle has been added to your session. You can now continue adjusting your mix.</p>

      <p style="text-align: center;">
        <a href="${data.sessionUrl}" class="button">Continue Your Session</a>
      </p>
    `);

    const text = `
Additional Cycle Activated

Your additional retake cycle has been added to your session.

Continue: ${data.sessionUrl}
    `.trim();

    return { subject, html, text };
  },

  /**
   * Payment failed notification
   */
  paymentFailed(data: PaymentFailedEmailData): { subject: string; html: string; text: string } {
    const subject = `【重要】お支払いに失敗しました - ご確認ください`;

    const html = baseTemplate(`
      <h2 style="color: #dc2626; margin-top: 0;">お支払いに失敗しました</h2>
      <p>${data.userName} 様</p>
      <p>サブスクリプション（${data.tier}プラン）の請求処理中にエラーが発生しました。</p>

      ${data.errorMessage ? `
      <div class="info-box" style="background: #fef2f2; border-color: #fecaca;">
        <p style="color: #dc2626; margin: 0;">
          <strong>エラー内容:</strong> ${data.errorMessage}
        </p>
      </div>
      ` : ''}

      <p>サービスを継続してご利用いただくため、お支払い方法の更新をお願いいたします。</p>

      <p style="text-align: center;">
        <a href="${data.updatePaymentUrl}" class="button" style="background: #dc2626;">お支払い方法を更新</a>
      </p>

      <p style="color: #6b7280; font-size: 14px;">
        お支払い方法を更新されない場合、サブスクリプションは自動的にキャンセルされる場合があります。
        ご不明な点がございましたら、サポートまでお問い合わせください。
      </p>
    `);

    const text = `
【重要】お支払いに失敗しました

${data.userName} 様

サブスクリプション（${data.tier}プラン）の請求処理中にエラーが発生しました。

${data.errorMessage ? `エラー内容: ${data.errorMessage}\n` : ''}

サービスを継続してご利用いただくため、お支払い方法の更新をお願いいたします。

お支払い方法の更新: ${data.updatePaymentUrl}

お支払い方法を更新されない場合、サブスクリプションは自動的にキャンセルされる場合があります。
ご不明な点がございましたら、サポートまでお問い合わせください。
    `.trim();

    return { subject, html, text };
  },

  /**
   * glasswerks inquiry — admin notification to kimny
   */
  glasswerksInquiryNotify(data: GlasswerksInquiryNotifyEmailData): { subject: string; html: string; text: string } {
    const serviceNames: Record<string, string> = {
      composition: 'Composition (作曲)',
      arrangement: 'Arrangement (編曲)',
      recording: 'Recording (レコーディング)',
      mixing: 'Mixing (ミキシング)',
      mastering: 'Mastering (マスタリング)',
      sound_design: 'Sound Design (音響設計)',
      other: 'Other',
    };

    const urgencyNames: Record<string, string> = {
      flexible: 'フレキシブル',
      within_2_weeks: '2週間以内',
      within_1_week: '1週間以内',
      asap: '至急',
    };

    const serviceName = serviceNames[data.serviceType] ?? data.serviceType;
    const urgencyName = urgencyNames[data.urgency] ?? data.urgency;

    const subject = `[glasswerks] 新規問い合わせ: ${serviceName} - ${data.inquiryNumber}`;

    const html = baseTemplate(`
      <h2 style="color: #1e40af; margin-top: 0;">glasswerks 新規問い合わせ</h2>

      <div class="info-box">
        <div class="info-row">
          <span class="label">問い合わせ番号</span>
          <span class="value">${data.inquiryNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">サービス</span>
          <span class="value">${serviceName}</span>
        </div>
        <div class="info-row">
          <span class="label">予算感</span>
          <span class="value">${data.budgetRange}</span>
        </div>
        <div class="info-row">
          <span class="label">希望納期</span>
          <span class="value">${urgencyName}</span>
        </div>
        <div class="info-row">
          <span class="label">言語</span>
          <span class="value">${data.language === 'ja' ? '日本語' : 'English'}</span>
        </div>
      </div>

      <h3>詳細</h3>
      <div class="info-box">
        <p style="margin: 0; white-space: pre-wrap;">${data.description}</p>
      </div>

      <h3>ユーザー情報</h3>
      <div class="info-box">
        <div class="info-row">
          <span class="label">名前</span>
          <span class="value">${data.userName ?? '未設定'}</span>
        </div>
        <div class="info-row">
          <span class="label">メール</span>
          <span class="value">${data.userEmail ?? '未設定'}</span>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
        Hoo MCP経由の自動送信
      </p>
    `);

    const text = `
glasswerks 新規問い合わせ
━━━━━━━━━━━━━━━━━━━━━━━

問い合わせ番号: ${data.inquiryNumber}

■ サービス: ${serviceName}
■ 予算感: ${data.budgetRange}
■ 希望納期: ${urgencyName}
■ 言語: ${data.language === 'ja' ? '日本語' : 'English'}

■ 詳細:
${data.description}

■ ユーザー情報:
- 名前: ${data.userName ?? '未設定'}
- メール: ${data.userEmail ?? '未設定'}

━━━━━━━━━━━━━━━━━━━━━━━
Hoo MCP経由の自動送信
    `.trim();

    return { subject, html, text };
  },

  /**
   * MUEDial research beta waitlist — welcome email
   */
  researchWaitlistWelcome(data: { locale: 'ja' | 'en' }): { subject: string; html: string; text: string } {
    const isJa = data.locale === 'ja';
    const dialBetaUrl = withEmailUtm('https://dial.mued.jp', UTM_CAMPAIGN.waitlistMuedial, 'beta-button');

    const subject = isJa
      ? '[MUEDial] ほほう、登録完了ですね。'
      : '[MUEDial] You\'re on the list.';

    const html = baseTemplate(`
      <h2 style="color: #f5a524; margin-top: 0;">${isJa ? 'ほほう、登録完了ですね。' : 'You\'re on the list.'}</h2>

      <p>${isJa
        ? 'Hooが確認しました。迷惑メールフォルダも確認してみてください。'
        : 'Hoo received your registration. Check your spam folder if you don\'t see future emails.'}</p>

      <p>${isJa
        ? 'Q3ローンチの際に、あなたのメアドに一番先に届けます。<br>それまで、ミックスで止まってる曲を温めておいてください。'
        : 'When Q3 launches, you\'ll be the first to know.<br>Keep working on those tracks in the meantime.'}</p>

      <div style="margin: 24px 0;">
        <a href="${dialBetaUrl}" class="button" style="background: #f5a524; color: #000; font-weight: 600;">
          ${isJa ? '先行βで今すぐ試す →' : 'Try the beta now →'}
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        ${isJa
          ? `ご不明な点がございましたら ${SUPPORT_EMAIL} までお問い合わせください。`
          : `Questions? Reach us at ${SUPPORT_EMAIL}.`}
      </p>
    `);

    const text = isJa
      ? `ほほう、登録完了ですね。\n\nHooが確認しました。Q3ローンチの際に一番先にお知らせします。\n\n先行βで今すぐ試す: ${dialBetaUrl}\n\nMUEDial team`.trim()
      : `You're on the list.\n\nHoo received your registration. You'll be the first to know when Q3 launches.\n\nTry the beta: ${dialBetaUrl}\n\nMUEDial team`.trim();

    return { subject, html, text };
  },

  /**
   * MUEDsat free-download gate — download-link email (maker voice, honest tone).
   * Includes the download button only when MUEDSAT_DOWNLOAD_URL is configured; while the dsp
   * package isn't uploaded yet it honestly says the link is on the way.
   */
  muedsatDownloadWelcome(data: { locale: 'ja' | 'en'; unsubscribeUrl?: string }): { subject: string; html: string; text: string } {
    const isJa = data.locale === 'ja';
    const hasLink = !!MUEDSAT_DOWNLOAD_URL;
    // The shared blocks carry this email's campaign — MUEDlim's welcome passes its own.
    const portal = portalPromoBlock(isJa, UTM_CAMPAIGN.welcomeMuedsat);
    const forward = forwardHookBlock(isJa, UTM_CAMPAIGN.welcomeMuedsat);

    const subject = isJa ? '[MUEDsat] ダウンロードリンクをお届けします' : '[MUEDsat] Your download link';

    const unsubHtml = `<p style="color: #9ca3af; font-size: 12px;">${data.unsubscribeUrl
      ? `<a href="${data.unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">${isJa ? 'メール配信を解除する' : 'Unsubscribe from these emails'}</a>`
      : (isJa ? 'メール配信はいつでも解除できます。' : 'Unsubscribe anytime.')}</p>`;
    const unsubText = data.unsubscribeUrl
      ? `${isJa ? 'メール配信の解除' : 'Unsubscribe'}: ${data.unsubscribeUrl}`
      : (isJa ? 'メール配信はいつでも解除できます。' : 'Unsubscribe anytime.');

    const linkBlockHtml = hasLink
      ? `<p style="text-align: center;">
           <a href="${MUEDSAT_DOWNLOAD_URL}" class="button" style="background: #f5a524; color: #000; font-weight: 600;">
             ${isJa ? 'MUEDsat をダウンロード' : 'Download MUEDsat'}
           </a>
         </p>
         <p style="color: #6b7280; font-size: 13px; text-align: center;">VST3 · AU · AAX (Pro Tools) · macOS (Universal — Apple Silicon &amp; Intel)</p>`
      : `<div class="info-box">
           <p style="margin: 0;">${isJa
             ? 'ダウンロードの準備が整い次第、このメールアドレスにリンクをお送りします。少しだけお待ちください。'
             : "I'm putting the finishing touches on the download — I'll email the link to this address shortly."}</p>
         </div>`;

    const html = baseTemplate(`
      <h2 style="color: #f5a524; margin-top: 0;">${isJa ? 'MUEDsat をありがとうございます' : 'Thanks for grabbing MUEDsat'}</h2>

      <p>${isJa
        ? '無料のトランス・サチュレーション・プラグイン、MUEDsat です。機能の制限も、期限も、課金の壁もありません。'
        : "MUEDsat is a free transformer-saturation plugin. Nothing in it is locked, time-limited, or paywalled."}</p>

      ${linkBlockHtml}

      <p style="color: #6b7280; font-size: 14px;">
        ${isJa
          ? '僕の言葉より、あなた自身の耳で決めてください。アップデートや MUEDsp masterchain の情報も、追ってお知らせします。'
          : "I'd rather you decide with your own ears than take my word for it. I'll also let you know about updates — and when MUEDsp masterchain is ready."}
      </p>
      ${portal.html}
      ${forward.html}
      ${unsubHtml}
    `);

    const text = isJa
      ? `MUEDsat をありがとうございます。\n\n無料のトランス・サチュレーション・プラグインです。\n${hasLink ? `ダウンロード: ${MUEDSAT_DOWNLOAD_URL}\nVST3 · AU · AAX（Pro Tools）· macOS` : '準備が整い次第、このメールアドレスにリンクをお送りします。'}\n\nアップデートや MUEDsp masterchain の情報も追ってお知らせします。${portal.text}${forward.text}\n\n${unsubText}\n\nglasswerks inc. — mued.jp`.trim()
      : `Thanks for grabbing MUEDsat.\n\nA free transformer-saturation plugin.\n${hasLink ? `Download: ${MUEDSAT_DOWNLOAD_URL}\nVST3 · AU · AAX (Pro Tools) · macOS` : "I'll email the download link to this address shortly."}\n\nI'll also let you know about updates and when MUEDsp masterchain is ready.${portal.text}${forward.text}\n\n${unsubText}\n\nglasswerks inc. — mued.jp`.trim();

    return { subject, html, text };
  },

  /**
   * MUEDlim free-download gate — download-link email (maker voice, honest tone). Mirrors
   * muedsatDownloadWelcome; download button only when MUEDLIM_DOWNLOAD_URL is set (else "on the way").
   * Claim discipline: own-value only — no competitor names / reproduction claims, and NO latency /
   * oversampling claims (dsp did not state them, so the MUEDsat ADAA line is intentionally not reused).
   */
  muedlimDownloadWelcome(data: { locale: 'ja' | 'en'; unsubscribeUrl?: string }): { subject: string; html: string; text: string } {
    const isJa = data.locale === 'ja';
    const hasLink = !!MUEDLIM_DOWNLOAD_URL;
    const portal = portalPromoBlock(isJa, UTM_CAMPAIGN.welcomeMuedlim);
    const forward = forwardHookBlock(isJa, UTM_CAMPAIGN.welcomeMuedlim);

    const subject = isJa ? 'MUEDlim のダウンロードリンクです' : 'Your MUEDlim download link';

    const unsubHtml = `<p style="color: #9ca3af; font-size: 12px;">${data.unsubscribeUrl
      ? `<a href="${data.unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">${isJa ? 'メール配信を解除する' : 'Unsubscribe from these emails'}</a>`
      : (isJa ? 'メール配信はいつでも解除できます。' : 'Unsubscribe anytime.')}</p>`;
    const unsubText = data.unsubscribeUrl
      ? `${isJa ? 'メール配信の解除' : 'Unsubscribe'}: ${data.unsubscribeUrl}`
      : (isJa ? 'メール配信はいつでも解除できます。' : 'Unsubscribe anytime.');

    const linkBlockHtml = hasLink
      ? `<p style="text-align: center;">
           <a href="${MUEDLIM_DOWNLOAD_URL}" class="button" style="background: #f5a524; color: #000; font-weight: 600;">
             ${isJa ? 'MUEDlim をダウンロード' : 'Download MUEDlim'}
           </a>
         </p>
         <p style="color: #6b7280; font-size: 13px; text-align: center;">VST3 · AU · AAX (Pro Tools) · macOS (Universal — Apple Silicon / Intel)</p>`
      : `<div class="info-box">
           <p style="margin: 0;">${isJa
             ? 'ダウンロードの準備が整い次第、このメールアドレスにリンクをお送りします。少しだけお待ちください。'
             : "We're putting the finishing touches on the download — we'll email the link to this address shortly."}</p>
         </div>`;

    const html = baseTemplate(`
      <h2 style="color: #f5a524; margin-top: 0;">${isJa ? 'MUEDlim をありがとうございます' : 'Thanks for grabbing MUEDlim'}</h2>

      <p>${isJa
        ? 'MUEDlim は無料のトゥルーピーク・リミッター。INPUT で音圧、CEILING で天井を決めるだけ。macOS（Universal）、VST3 と AU に対応しています。'
        : 'MUEDlim is a free true-peak limiter — INPUT for loudness, CEILING for the ceiling. macOS (Universal), VST3 and AU.'}</p>

      ${linkBlockHtml}

      <p style="color: #6b7280; font-size: 14px;">
        ${isJa
          ? '完成形の MUEDsp masterchain も、いま作っています。アップデートがあればお知らせします。'
          : "I'm still building the finished MUEDsp masterchain; I'll let you know when there's an update."}
      </p>
      ${portal.html}
      ${forward.html}
      ${unsubHtml}
    `);

    const text = isJa
      ? `MUEDlim をありがとうございます。\n\n無料のトゥルーピーク・リミッターです。INPUT で音圧、CEILING で天井を決めるだけ。\n${hasLink ? `ダウンロード: ${MUEDLIM_DOWNLOAD_URL}\nmacOS（Universal）、VST3 · AU · AAX（Pro Tools）` : '準備が整い次第、このメールアドレスにリンクをお送りします。'}\n\n完成形の MUEDsp masterchain も、いま作っています。アップデートがあればお知らせします。${portal.text}${forward.text}\n\n${unsubText}\n\nglasswerks inc. — mued.jp`.trim()
      : `Thanks for grabbing MUEDlim.\n\nA free true-peak limiter — INPUT for loudness, CEILING for the ceiling.\n${hasLink ? `Download: ${MUEDLIM_DOWNLOAD_URL}\nmacOS (Universal), VST3 · AU · AAX (Pro Tools)` : "We'll email the download link to this address shortly."}\n\nI'm still building the finished MUEDsp masterchain; I'll let you know when there's an update.${portal.text}${forward.text}\n\n${unsubText}\n\nglasswerks inc. — mued.jp`.trim();

    return { subject, html, text };
  },

  /**
   * glasswerks inquiry — user confirmation email
   */
  glasswerksInquiryConfirm(data: GlasswerksInquiryConfirmEmailData): { subject: string; html: string; text: string } {
    const serviceNames: Record<string, string> = {
      composition: 'Composition (作曲)',
      arrangement: 'Arrangement (編曲)',
      recording: 'Recording (レコーディング)',
      mixing: 'Mixing (ミキシング)',
      mastering: 'Mastering (マスタリング)',
      sound_design: 'Sound Design (音響設計)',
      other: 'Other',
    };

    const serviceName = serviceNames[data.serviceType] ?? data.serviceType;
    const isJa = data.language === 'ja';
    const greeting = data.userName ? `${data.userName}さん` : (isJa ? 'お客様' : 'Hello');

    const subject = isJa
      ? `[glasswerks] お問い合わせを受け付けました - ${data.inquiryNumber}`
      : `[glasswerks] Your inquiry has been received - ${data.inquiryNumber}`;

    const html = baseTemplate(`
      <h2 style="color: #1e40af; margin-top: 0;">${isJa ? 'お問い合わせを受け付けました' : 'Inquiry Received'}</h2>

      <p>${greeting}</p>

      <p>${isJa
        ? 'glasswerksへのお問い合わせありがとうございます。'
        : 'Thank you for your inquiry to glasswerks.'}</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">${isJa ? '問い合わせ番号' : 'Inquiry Number'}</span>
          <span class="value">${data.inquiryNumber}</span>
        </div>
        <div class="info-row">
          <span class="label">${isJa ? 'サービス' : 'Service'}</span>
          <span class="value">${serviceName}</span>
        </div>
      </div>

      <p>${isJa
        ? '担当者が内容を確認し、1-2営業日以内にご連絡いたします。'
        : 'Our team will review your request and get back to you within 1-2 business days.'}</p>

      <p style="color: #6b7280; font-size: 14px;">
        ${isJa
          ? `ご不明な点がございましたら ${SUPPORT_EMAIL} までお問い合わせください。`
          : `If you have any questions, please contact us at ${SUPPORT_EMAIL}.`}
      </p>
    `);

    const text = isJa
      ? `
${greeting}

glasswerksへのお問い合わせありがとうございます。

問い合わせ番号: ${data.inquiryNumber}
サービス: ${serviceName}

担当者が内容を確認し、1-2営業日以内にご連絡いたします。

glasswerks inc.
      `.trim()
      : `
${greeting}

Thank you for your inquiry to glasswerks.

Inquiry Number: ${data.inquiryNumber}
Service: ${serviceName}

Our team will review your request and get back to you within 1-2 business days.

glasswerks inc.
      `.trim();

    return { subject, html, text };
  },
};

// ========================================
// Email Service Class
// ========================================

class EmailService {
  /**
   * Send a single email
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const resend = getResendClient();

      const toAddresses = Array.isArray(options.to)
        ? options.to.map(r => r.email)
        : [options.to.email];

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || SUPPORT_EMAIL,
        tags: options.tags,
        ...(options.attachments ? { attachments: options.attachments } : {}),
        ...(options.headers ? { headers: options.headers } : {}),
      });

      if (error) {
        logger.error('[EmailService] Failed to send email', {
          error: error.message,
          to: toAddresses,
          subject: options.subject,
        });
        return { success: false, error: error.message };
      }

      logger.info('[EmailService] Email sent successfully', {
        messageId: data?.id,
        to: toAddresses,
        subject: options.subject,
      });

      return { success: true, messageId: data?.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[EmailService] Exception while sending email', {
        error: errorMessage,
        subject: options.subject,
      });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send reservation confirmation to student
   */
  async sendReservationConfirmationToStudent(
    to: EmailRecipient,
    data: ReservationEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.reservationConfirmedStudent(data);
    return this.send({
      to,
      ...template,
      tags: [
        { name: 'type', value: 'reservation_confirmed' },
        { name: 'role', value: 'student' },
      ],
    });
  }

  /**
   * Send reservation notification to mentor
   */
  async sendReservationNotificationToMentor(
    to: EmailRecipient,
    data: ReservationEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.reservationConfirmedMentor(data);
    return this.send({
      to,
      ...template,
      tags: [
        { name: 'type', value: 'reservation_confirmed' },
        { name: 'role', value: 'mentor' },
      ],
    });
  }

  /**
   * Send payment completion notification
   */
  async sendPaymentCompleted(
    to: EmailRecipient,
    data: PaymentEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.paymentCompleted(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'payment_completed' }],
    });
  }

  /**
   * Send cancellation notification
   */
  async sendCancellation(
    to: EmailRecipient,
    data: CancellationEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.cancellation(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'cancellation' }],
    });
  }

  /**
   * Send lesson reminder
   */
  async sendReminder(
    to: EmailRecipient,
    data: ReminderEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.reminder(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'reminder' }],
    });
  }

  /**
   * Send MUEDial purchase confirmation
   */
  async sendDialPurchaseConfirmed(
    to: EmailRecipient,
    data: DialPurchaseConfirmedEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.dialPurchaseConfirmed(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'dial_purchase_confirmed' }],
    });
  }

  /**
   * Send MUEDial additional cycle purchased notification
   */
  async sendDialAdditionalCyclePurchased(
    to: EmailRecipient,
    data: DialAdditionalCycleEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.dialAdditionalCyclePurchased(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'dial_additional_cycle' }],
    });
  }

  /**
   * Send MUEDial results ready notification
   */
  async sendDialResultsReady(
    to: EmailRecipient,
    data: DialResultsReadyEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.dialResultsReady(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'dial_results_ready' }],
    });
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(
    to: EmailRecipient,
    data: PaymentFailedEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.paymentFailed(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'payment_failed' }],
    });
  }

  /**
   * Send glasswerks inquiry notification to admin
   */
  async sendGlasswerksInquiryNotify(
    to: EmailRecipient,
    data: GlasswerksInquiryNotifyEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.glasswerksInquiryNotify(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'glasswerks_inquiry_notify' }],
    });
  }

  /**
   * Send glasswerks inquiry confirmation to user
   */
  async sendGlasswerksInquiryConfirm(
    to: EmailRecipient,
    data: GlasswerksInquiryConfirmEmailData
  ): Promise<EmailResult> {
    const template = emailTemplates.glasswerksInquiryConfirm(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'glasswerks_inquiry_confirm' }],
    });
  }

  async sendResearchWaitlistWelcome(
    to: EmailRecipient,
    data: { locale: 'ja' | 'en' }
  ): Promise<EmailResult> {
    const template = emailTemplates.researchWaitlistWelcome(data);
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'research_waitlist_welcome' }],
    });
  }

  async sendMuedsatDownloadWelcome(
    to: EmailRecipient,
    data: { locale: 'ja' | 'en' }
  ): Promise<EmailResult> {
    const unsubscribeUrl = pluginUnsubscribeUrl('muedsat', to.email, data.locale);
    const template = emailTemplates.muedsatDownloadWelcome({ ...data, unsubscribeUrl });
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'muedsat_download_welcome' }],
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  }

  async sendMuedlimDownloadWelcome(
    to: EmailRecipient,
    data: { locale: 'ja' | 'en' }
  ): Promise<EmailResult> {
    const unsubscribeUrl = pluginUnsubscribeUrl('muedlim', to.email, data.locale);
    const template = emailTemplates.muedlimDownloadWelcome({ ...data, unsubscribeUrl });
    return this.send({
      to,
      ...template,
      tags: [{ name: 'type', value: 'muedlim_download_welcome' }],
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  }

  async sendAdminAlert(toEmail: string, message: string): Promise<void> {
    await this.send({
      to: { email: toEmail },
      subject: '[MUED Alert] Bonus campaign budget threshold',
      html: `<pre>${message}</pre>`,
      text: message,
    });
  }

  // ========================================
  // Advisory storefront #8
  // ========================================

  /** Booking confirmation to the booker — carries the Meet link + an .ics attachment. */
  async sendAdvisoryBookingConfirmed(
    to: EmailRecipient,
    data: { name?: string; locale: 'ja' | 'en'; dateTimeLabel: string; meetingUrl: string; icsBase64: string },
  ): Promise<EmailResult> {
    const esc = (s?: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ja = data.locale !== 'en';
    const greeting = data.name ? (ja ? `${esc(data.name)} 様` : `Hi ${esc(data.name)},`) : ja ? 'こんにちは' : 'Hello,';
    const intro = ja
      ? '無料60分のご相談を承りました。下記の日時にオンライン（Google Meet）でお会いしましょう。'
      : "Your free 60-minute consultation is booked. We'll meet online (Google Meet) at the time below.";
    const html = baseTemplate(
      `<p>${greeting}</p><p>${intro}</p>` +
        `<div class="info-box"><div class="info-row"><span class="label">${ja ? '日時' : 'When'}</span><span class="value">${esc(data.dateTimeLabel)}</span></div>` +
        `<div class="info-row"><span class="label">${ja ? '所要' : 'Duration'}</span><span class="value">${ja ? '60分' : '60 min'}</span></div></div>` +
        `<a class="button" href="${data.meetingUrl}">${ja ? 'Google Meet に参加' : 'Join Google Meet'}</a>` +
        `<p style="font-size:13px;color:#6b7280;">${ja ? '添付のカレンダー招待（.ics）から予定に追加できます。' : 'Add it to your calendar from the attached invite (.ics).'}</p>`,
    );
    const text = `${data.name ? (ja ? `${data.name} 様` : `Hi ${data.name},`) : ''}\n${intro}\n${ja ? '日時' : 'When'}: ${data.dateTimeLabel}\nGoogle Meet: ${data.meetingUrl}`;
    return this.send({
      to,
      subject: ja ? 'ご予約を受け付けました｜MUED 無料60分相談' : 'Your booking is confirmed | MUED free 60-min consultation',
      html,
      text,
      tags: [{ name: 'type', value: 'advisory_booking_confirm' }],
      attachments: [{ filename: 'invite.ics', content: data.icsBase64, contentType: 'text/calendar; method=REQUEST; charset=UTF-8' }],
    });
  }

  /** New-booking notification to the operator (kimny) — includes the one-tap "mark conducted" link. */
  async sendAdvisoryBookingNotify(
    to: EmailRecipient,
    data: { name?: string; email: string; dateTimeLabel: string; meetingUrl: string; completeUrl: string },
  ): Promise<EmailResult> {
    const esc = (s?: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = baseTemplate(
      `<h2 style="margin-top:0;">新規 壁打ち予約</h2>` +
        `<div class="info-box"><div class="info-row"><span class="label">お名前</span><span class="value">${esc(data.name) || '(未入力)'}</span></div>` +
        `<div class="info-row"><span class="label">メール</span><span class="value">${esc(data.email)}</span></div>` +
        `<div class="info-row"><span class="label">日時</span><span class="value">${esc(data.dateTimeLabel)}</span></div></div>` +
        `<a class="button" href="${data.meetingUrl}">Google Meet</a>` +
        `<p><a href="${data.completeUrl}">▶ この相談を「実施済み」にする</a></p>`,
    );
    const text = `新規 壁打ち予約\nお名前: ${data.name || '(未入力)'}\nメール: ${data.email}\n日時: ${data.dateTimeLabel}\nMeet: ${data.meetingUrl}\n実施済みにする: ${data.completeUrl}`;
    return this.send({
      to,
      subject: `[MUED advisory] 新規予約: ${data.name || data.email} — ${data.dateTimeLabel}`,
      html,
      text,
      tags: [{ name: 'type', value: 'advisory_booking_notify' }],
    });
  }

  /** Inquiry acknowledgement to the inquirer (lane B — no recording). */
  async sendAdvisoryInquiryConfirm(
    to: EmailRecipient,
    data: { name?: string; locale: 'ja' | 'en' },
  ): Promise<EmailResult> {
    const esc = (s?: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const ja = data.locale !== 'en';
    const greeting = data.name ? (ja ? `${esc(data.name)} 様` : `Hi ${esc(data.name)},`) : ja ? 'こんにちは' : 'Hello,';
    const body = ja ? 'お問い合わせありがとうございます。担当より折り返しご連絡します。' : "Thank you for your inquiry. We'll get back to you shortly.";
    return this.send({
      to,
      subject: ja ? 'お問い合わせを受け付けました｜MUED advisory' : 'We received your inquiry | MUED advisory',
      html: baseTemplate(`<p>${greeting}</p><p>${body}</p>`),
      text: `${data.name ? (ja ? `${data.name} 様` : `Hi ${data.name},`) : ''}\n${body}`,
      tags: [{ name: 'type', value: 'advisory_inquiry_confirm' }],
    });
  }

  /** New-inquiry notification to the operator (kimny) — lane B. */
  async sendAdvisoryInquiryNotify(
    to: EmailRecipient,
    data: { name?: string; email: string; product?: string; message?: string },
  ): Promise<EmailResult> {
    const esc = (s?: string) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = baseTemplate(
      `<h2 style="margin-top:0;">新規 問い合わせ</h2>` +
        `<div class="info-box"><div class="info-row"><span class="label">お名前</span><span class="value">${esc(data.name) || '(未入力)'}</span></div>` +
        `<div class="info-row"><span class="label">メール</span><span class="value">${esc(data.email)}</span></div>` +
        `<div class="info-row"><span class="label">関心</span><span class="value">${esc(data.product) || '-'}</span></div></div>` +
        `<p style="white-space:pre-wrap;">${esc(data.message) || '(本文なし)'}</p>`,
    );
    const text = `新規 問い合わせ\nお名前: ${data.name || '(未入力)'}\nメール: ${data.email}\n関心: ${data.product || '-'}\n\n${data.message || ''}`;
    return this.send({
      to,
      subject: `[MUED advisory] 新規問い合わせ: ${data.name || data.email}`,
      html,
      text,
      tags: [{ name: 'type', value: 'advisory_inquiry_notify' }],
    });
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return !!RESEND_API_KEY;
  }
}

// ========================================
// Singleton Instance
// ========================================

export const emailService = new EmailService();
export { EmailService };
