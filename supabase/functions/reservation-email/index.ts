import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Resend } from 'https://esm.sh/resend@3.0.0';

// 環境変数の取得
const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

// Supabaseクライアントとリゼンドの初期化
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(resendApiKey);

// CORSヘッダー付きのレスポンス生成
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function corsResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * 予約メールのHTMLテンプレートを生成
 */
function generateEmailHtml(reservation: any, student: any, teacher: any, slot: any): string {
  const startTime = new Date(slot.startTime).toLocaleString('ja-JP', {
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const endTime = new Date(slot.endTime).toLocaleString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit'
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
        <p>${student.name || '受講者'}様、</p>
        
        <p>レッスンのご予約ありがとうございます。あなたの予約が確定しました。</p>
        
        <div class="info-box">
          <h3>予約詳細</h3>
          <p><strong>日時:</strong> ${startTime} 〜 ${endTime}</p>
          <p><strong>講師:</strong> ${teacher.name || '担当講師'}</p>
          <p><strong>予約ID:</strong> ${reservation.id}</p>
          <p><strong>ステータス:</strong> 確定</p>
        </div>
        
        <p>レッスンの24時間前には、リマインダーメールを送信いたします。</p>
        <p>予約のキャンセルや変更がある場合は、72時間前までにお願いいたします。</p>
        
        <a href="${Deno.env.get('NEXT_PUBLIC_URL') || ''}/dashboard" class="button">マイダッシュボードへ</a>
        
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

// メインハンドラ関数
serve(async (req) => {
  // PREFLIGHTリクエストに対応
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  
  try {
    // POSTリクエストのみを処理
    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // リクエストボディを解析
    const body = await req.json();
    const { type, record, old_record } = body;
    
    // 予約レコードの確認
    if (!record || !record.id) {
      return corsResponse({ error: 'Invalid request body' }, 400);
    }
    
    // 予約レコードからデータを取得
    const reservationId = record.id;
    console.log(`Processing email notification for reservation ${reservationId}`);
    
    // 予約に関連する詳細情報を取得
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single();
      
    if (reservationError || !reservation) {
      console.error('Failed to fetch reservation details:', reservationError);
      return corsResponse({ error: 'Reservation not found' }, 404);
    }
    
    // レッスンスロット情報を取得
    const { data: slot, error: slotError } = await supabase
      .from('lesson_slots')
      .select('*')
      .eq('id', reservation.slotId)
      .single();
      
    if (slotError || !slot) {
      console.error('Failed to fetch lesson slot details:', slotError);
      return corsResponse({ error: 'Lesson slot not found' }, 404);
    }
    
    // 学生情報を取得
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', reservation.studentId)
      .single();
      
    if (studentError || !student || !student.email) {
      console.error('Failed to fetch student details:', studentError);
      return corsResponse({ error: 'Student information not found' }, 404);
    }
    
    // 講師情報を取得
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', slot.teacherId)
      .single();
      
    if (teacherError || !teacher) {
      console.error('Failed to fetch teacher details:', teacherError);
      return corsResponse({ error: 'Teacher information not found' }, 404);
    }
    
    // 予約確定メールのHTMLを生成
    const emailHtml = generateEmailHtml(reservation, student, teacher, slot);
    
    // メールの送信
    try {
      const emailResponse = await resend.emails.send({
        from: 'MUED LMS <noreply@muedlms.com>',
        to: student.email,
        subject: 'レッスン予約確認 - MUED LMS',
        html: emailHtml,
        cc: teacher.email ? [teacher.email] : undefined,
      });
      
      console.log('Email sent successfully:', emailResponse);
      
      // メール送信ログをデータベースに保存
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          recipient_id: student.id,
          recipient_email: student.email,
          email_type: 'reservation_confirmation',
          related_id: reservationId,
          status: 'sent',
          metadata: { 
            reservation_id: reservationId,
            slot_id: slot.id,
            teacher_id: teacher.id 
          }
        });
        
      if (logError) {
        console.error('Failed to save email log:', logError);
      }
      
      return corsResponse({
        success: true,
        message: 'Reservation confirmation email sent successfully'
      });
      
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      
      // 失敗ログを保存
      await supabase
        .from('email_logs')
        .insert({
          recipient_id: student.id,
          recipient_email: student.email,
          email_type: 'reservation_confirmation',
          related_id: reservationId,
          status: 'failed',
          error_message: String(emailError),
          metadata: { 
            reservation_id: reservationId,
            slot_id: slot.id,
            teacher_id: teacher.id 
          }
        });
        
      return corsResponse({ error: 'Failed to send email' }, 500);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
}); 