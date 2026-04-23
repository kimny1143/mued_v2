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

// ========================================
// Configuration
// ========================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'MUED <noreply@mued.jp>';
const SUPPORT_EMAIL = process.env.EMAIL_SUPPORT || 'support@mued.jp';

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

  async sendAdminAlert(toEmail: string, message: string): Promise<void> {
    await this.send({
      to: { email: toEmail },
      subject: '[MUED Alert] Bonus campaign budget threshold',
      html: `<pre>${message}</pre>`,
      text: message,
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
