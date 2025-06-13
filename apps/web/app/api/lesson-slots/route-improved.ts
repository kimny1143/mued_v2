// 改善されたAPIルート（ビューを使用）
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const supabase = createServiceClient();
    
    // アクティブなスロットのビューを使用（過去データは自動的に除外される）
    let query = supabase
      .from('active_lesson_slots')  // ビューを使用
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
    
    // 日付範囲でのフィルタリング（必要な場合）
    if (startDate && endDate) {
      // ストアドファンクションを使用
      const { data: slots, error } = await supabase
        .rpc('get_slots_in_jst_range', {
          start_date_jst: startDate,
          end_date_jst: endDate
        });
        
      if (error) throw error;
      
      return NextResponse.json(slots || []);
    }
    
    const { data: slots, error } = await query;
    
    if (error) {
      console.error('Supabaseエラー:', error);
      throw new Error(error.message);
    }
    
    // シンプルな変換（タイムゾーン処理は不要）
    const formattedSlots = (slots || []).map(slot => ({
      id: slot.id,
      teacherId: slot.teacher_id,
      startTime: slot.start_time,
      endTime: slot.end_time,
      hourlyRate: slot.hourly_rate,
      currency: slot.currency,
      isAvailable: slot.is_available,
      teacher: slot.users,
      reservations: slot.reservations || []
    }));
    
    return NextResponse.json(formattedSlots);
  } catch (error) {
    console.error('エラー:', error);
    return NextResponse.json(
      { error: 'レッスンスロットの取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}