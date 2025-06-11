// テスト用エンドポイント：認証なしでビューの動作を確認
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServiceClient();
    
    // 1. アクティブなレッスンスロットの確認
    const { data: activeSlots, error: slotsError } = await supabase
      .from('active_lesson_slots')
      .select('id, start_time, end_time, teacher_id')
      .limit(5);
    
    if (slotsError) {
      console.error('active_lesson_slots ビューエラー:', slotsError);
    }
    
    // 2. アクティブな予約の確認
    const { data: activeReservations, error: reservationsError } = await supabase
      .from('active_reservations')
      .select('id, booked_start_time, booked_end_time, status')
      .limit(5);
    
    if (reservationsError) {
      console.error('active_reservations ビューエラー:', reservationsError);
    }
    
    // 3. 通常のテーブルとビューの件数比較
    const { count: totalSlots } = await supabase
      .from('lesson_slots')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeSlotCount } = await supabase
      .from('active_lesson_slots')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalReservations } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true });
    
    const { count: activeReservationCount } = await supabase
      .from('active_reservations')
      .select('*', { count: 'exact', head: true });
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      views: {
        active_lesson_slots: {
          error: slotsError?.message || null,
          count: activeSlotCount || 0,
          sample: activeSlots || [],
          working: !slotsError
        },
        active_reservations: {
          error: reservationsError?.message || null,
          count: activeReservationCount || 0,
          sample: activeReservations || [],
          working: !reservationsError
        }
      },
      comparison: {
        lesson_slots: {
          total: totalSlots || 0,
          active: activeSlotCount || 0,
          filtered_out: (totalSlots || 0) - (activeSlotCount || 0)
        },
        reservations: {
          total: totalReservations || 0,
          active: activeReservationCount || 0,
          filtered_out: (totalReservations || 0) - (activeReservationCount || 0)
        }
      },
      summary: {
        views_working: !slotsError && !reservationsError,
        active_slots_found: activeSlotCount || 0,
        active_reservations_found: activeReservationCount || 0
      }
    };
    
    console.log('ビューテスト結果:', JSON.stringify(result, null, 2));
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('テストエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}