// ビューを使用した新しい実装（テスト用）
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSessionFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get('viewMode') || 'own';
    
    const supabase = createServiceClient();
    
    // ビューを使用（過去のデータは自動的に除外される）
    let query = supabase
      .from('active_lesson_slots')  // ← ビューを使用
      .select(`
        *,
        users!teacher_id(id, name, image),
        reservations!inner(
          id,
          booked_start_time,
          booked_end_time,
          status,
          users!student_id(id, name, email)
        )
      `)
      .order('start_time', { ascending: true });

    // viewModeに基づくフィルタリング
    if (viewMode === 'own') {
      query = query.eq('teacher_id', sessionInfo.user.id);
    }
    
    const { data: slots, error } = await query;
    
    if (error) {
      console.error('Supabaseエラー:', error);
      throw new Error(error.message);
    }
    
    // 予約情報を別途取得（ビューを使用）
    const slotIds = (slots || []).map(slot => slot.id);
    const { data: reservations } = await supabase
      .from('active_reservations')  // ← ビューを使用
      .select(`
        id,
        lesson_slot_id,
        booked_start_time,
        booked_end_time,
        status,
        users!student_id(id, name, email)
      `)
      .in('lesson_slot_id', slotIds);

    // スロットと予約を結合
    const slotsWithReservations = (slots || []).map(slot => ({
      ...slot,
      reservations: reservations?.filter(r => r.lesson_slot_id === slot.id) || []
    }));
    
    // レスポンス形式は既存APIと同じ
    const formattedSlots = slotsWithReservations.map(slot => ({
      id: slot.id,
      teacherId: slot.teacher_id,
      startTime: slot.start_time,
      endTime: slot.end_time,
      hourlyRate: slot.hourly_rate,
      currency: slot.currency,
      isAvailable: slot.is_available,
      teacher: slot.users,
      reservations: slot.reservations,
      // タイムゾーン処理は不要（表示層で処理）
    }));
    
    console.log(`✅ V2 API: ${formattedSlots.length}件のアクティブスロットを返却`);
    
    return NextResponse.json(formattedSlots);
  } catch (error) {
    console.error('V2 APIエラー:', error);
    return NextResponse.json(
      { error: 'レッスンスロットの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}