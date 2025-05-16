import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { Resend } from 'https://esm.sh/resend@3.0.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts';

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
 * メール送信処理
 */
async function sendReservationEmail(reservation: any) {
  try {
    // レッスンスロット情報を取得
    const { data: slot, error: slotError } = await supabase
      .from('lesson_slots')
      .select('*')
      .eq('id', reservation.slotId)
      .single();
      
    if (slotError || !slot) {
      console.error('Failed to fetch lesson slot details:', slotError);
      return { success: false, error: 'Lesson slot not found' };
    }
    
    // 学生情報を取得
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', reservation.studentId)
      .single();
      
    if (studentError || !student || !student.email) {
      console.error('Failed to fetch student details:', studentError);
      return { success: false, error: 'Student information not found' };
    }
    
    // 講師情報を取得
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', slot.teacherId)
      .single();
      
    if (teacherError || !teacher) {
      console.error('Failed to fetch teacher details:', teacherError);
      return { success: false, error: 'Teacher information not found' };
    }
    
    // メールHTML生成（シンプル化）
    const startTime = new Date(slot.startTime).toLocaleString('ja-JP');
    const endTime = new Date(slot.endTime).toLocaleString('ja-JP');
    
    const emailHtml = `
      <html>
      <body>
        <h1>レッスン予約確認</h1>
        <p>${student.name || '受講者'}様、</p>
        <p>レッスンのご予約ありがとうございます。あなたの予約が確定しました。</p>
        <div>
          <h3>予約詳細</h3>
          <p><strong>日時:</strong> ${startTime} 〜 ${endTime}</p>
          <p><strong>講師:</strong> ${teacher.name || '担当講師'}</p>
          <p><strong>予約ID:</strong> ${reservation.id}</p>
          <p><strong>ステータス:</strong> 確定</p>
        </div>
        <p>よろしくお願いいたします。<br>MUED LMSチーム</p>
      </body>
      </html>
    `;
    
    // メール送信
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
        related_id: reservation.id,
        status: 'sent',
        metadata: { 
          reservation_id: reservation.id,
          slot_id: slot.id,
          teacher_id: teacher.id 
        }
      });
      
    if (logError) {
      console.error('Failed to save email log:', logError);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error };
  }
}

/**
 * 通知キュー処理関数
 */
async function processNotificationQueue() {
  console.log('Processing notification queue...');
  
  try {
    // 未処理の通知を最大10件取得
    const { data: notifications, error } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (error) {
      console.error('Failed to fetch notifications:', error);
      return;
    }
    
    if (!notifications || notifications.length === 0) {
      console.log('No pending notifications found');
      return;
    }
    
    console.log(`Found ${notifications.length} notifications to process`);
    
    // 各通知を処理
    for (const notification of notifications) {
      try {
        if (notification.notification_type === 'reservation_confirmation') {
          // 予約情報を取得
          const { data: reservation, error: reservationError } = await supabase
            .from('reservations')
            .select('*')
            .eq('id', notification.resource_id)
            .single();
          
          if (reservationError || !reservation) {
            console.error(`Reservation not found: ${notification.resource_id}`, reservationError);
            continue;
          }
          
          // メール送信
          const result = await sendReservationEmail(reservation);
          
          // 処理済みとしてマーク
          await supabase
            .from('notification_queue')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
          
          console.log(`Processed notification ${notification.id}: ${result.success ? 'Success' : 'Failed'}`);
        } else {
          console.log(`Unknown notification type: ${notification.notification_type}`);
          // 不明な通知タイプも処理済みとしてマーク
          await supabase
            .from('notification_queue')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString(),
            })
            .eq('id', notification.id);
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
      }
    }
    
  } catch (error) {
    console.error('Error in queue processing:', error);
  }
}

// 5分ごとに実行するCronジョブを設定
cron('*/5 * * * *', processNotificationQueue);

// 手動実行やテスト用のHTTPハンドラ
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // CRONからの呼び出しやGET/POSTリクエストで実行可能に
  try {
    await processNotificationQueue();
    return corsResponse({ success: true, message: 'Queue processing triggered' });
  } catch (error) {
    console.error('Error during manual queue processing:', error);
    return corsResponse({ error: 'Failed to process queue' }, 500);
  }
});