import { Resend } from 'resend';

// Resendインスタンスの初期化
const resend = new Resend(process.env.RESEND_API_KEY);

// メール送信の標準的なオプション
interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

/**
 * メールを送信する
 * @param options メール送信オプション
 * @returns 送信結果
 */
export async function sendEmail(options: EmailOptions) {
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'MUED LMS <noreply@muedlms.com>',
      ...options,
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * 予約確定メールテンプレート
 */
export function generateReservationConfirmationEmail({
  studentName,
  teacherName,
  startTime,
  endTime,
  reservationId,
}: {
  studentName: string;
  teacherName: string;
  startTime: Date;
  endTime: Date;
  reservationId: string;
}) {
  const formattedStartTime = startTime.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedEndTime = endTime.toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>予約確認 - MUED LMS</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4d7cfe;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 0 0 5px 5px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #666;
        }
        .info-box {
          background-color: white;
          border-left: 4px solid #4d7cfe;
          padding: 15px;
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background-color: #4d7cfe;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>レッスン予約確認</h1>
      </div>
      <div class="content">
        <p>${studentName || '受講者'}様、</p>
        
        <p>レッスンのご予約ありがとうございます。あなたの予約が確定しました。</p>
        
        <div class="info-box">
          <h3>予約詳細</h3>
          <p><strong>日時:</strong> ${formattedStartTime} 〜 ${formattedEndTime}</p>
          <p><strong>講師:</strong> ${teacherName || '担当講師'}</p>
          <p><strong>予約ID:</strong> ${reservationId}</p>
          <p><strong>ステータス:</strong> 確定</p>
        </div>
        
        <p>レッスンの24時間前には、リマインダーメールを送信いたします。</p>
        <p>予約のキャンセルや変更がある場合は、72時間前までにお願いいたします。</p>
        
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" class="button">マイダッシュボードへ</a>
        
        <p>何かご質問がありましたら、お気軽にお問い合わせください。</p>
        <p>よろしくお願いいたします。<br>MUED LMSチーム</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} MUED LMS - All rights reserved</p>
        <p>このメールにお心当たりがない場合は、お手数ですが破棄してください。</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * リマインダーメールテンプレート
 */
export function generateReminderEmail({
  studentName,
  teacherName,
  startTime,
  endTime,
  reservationId,
}: {
  studentName: string;
  teacherName: string;
  startTime: Date;
  endTime: Date;
  reservationId: string;
}) {
  const formattedStartTime = startTime.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedEndTime = endTime.toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>レッスンリマインダー - MUED LMS</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #ff9800;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 0 0 5px 5px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #666;
        }
        .info-box {
          background-color: white;
          border-left: 4px solid #ff9800;
          padding: 15px;
          margin: 15px 0;
        }
        .button {
          display: inline-block;
          background-color: #ff9800;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin-top: 15px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>レッスン リマインダー</h1>
      </div>
      <div class="content">
        <p>${studentName || '受講者'}様、</p>
        
        <p>明日のレッスンのリマインダーをお送りします。</p>
        
        <div class="info-box">
          <h3>レッスン詳細</h3>
          <p><strong>日時:</strong> ${formattedStartTime} 〜 ${formattedEndTime}</p>
          <p><strong>講師:</strong> ${teacherName || '担当講師'}</p>
          <p><strong>予約ID:</strong> ${reservationId}</p>
        </div>
        
        <p>以下のことを忘れないようにしてください：</p>
        <ul>
          <li>インターネット接続を確認する</li>
          <li>オーディオとビデオの設定をテストする</li>
          <li>事前の質問や疑問点をまとめておく</li>
        </ul>
        
        <a href="${process.env.NEXT_PUBLIC_URL}/dashboard" class="button">マイダッシュボードへ</a>
        
        <p>レッスンを楽しみにしています。<br>MUED LMSチーム</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} MUED LMS - All rights reserved</p>
        <p>このメールにお心当たりがない場合は、お手数ですが破棄してください。</p>
      </div>
    </body>
    </html>
  `;
} 