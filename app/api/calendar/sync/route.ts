import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { syncCalendarToLessonSlots, syncLessonSlotsToCalendar } from '@/lib/googleCalendar';

// カスタムユーザー型
interface CustomUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// サーバーサイドでSupabaseクライアントを作成
const createServerSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
};

export async function POST(req: NextRequest) {
  try {
    // Supabaseクライアントを作成
    const supabase = createServerSupabase();
    
    // セッション取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // リクエストボディからmentorIdを取得
    const { mentorId, direction = 'both' } = await req.json();

    if (!mentorId) {
      return NextResponse.json({ error: 'mentorIdが必要です' }, { status: 400 });
    }

    // ユーザーIDを取得
    const userId = session.user.id || '';

    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが見つかりません' }, { status: 400 });
    }

    let results = {};

    // 同期方向に応じた処理を実行
    if (direction === 'both' || direction === 'to_google') {
      // DBからGoogleカレンダーへ同期
      const toGoogleResults = await syncLessonSlotsToCalendar(userId, mentorId);
      results = { ...results, toGoogle: toGoogleResults };
    }

    if (direction === 'both' || direction === 'from_google') {
      // GoogleカレンダーからDBへ同期
      const fromGoogleResults = await syncCalendarToLessonSlots(userId, mentorId);
      results = { ...results, fromGoogle: fromGoogleResults };
    }

    return NextResponse.json({
      success: true,
      message: 'カレンダー同期が完了しました',
      results
    });
  } catch (error) {
    console.error('カレンダー同期エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// 同期状態を取得するGETエンドポイント
export async function GET(req: NextRequest) {
  try {
    // Supabaseクライアントを作成
    const supabase = createServerSupabase();
    
    // セッション取得
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // URL Searchパラメータからmentor_idを取得
    const { searchParams } = new URL(req.url);
    const mentorId = searchParams.get('mentor_id');

    if (!mentorId) {
      return NextResponse.json({ error: 'mentor_idクエリパラメータが必要です' }, { status: 400 });
    }

    // TODO: 最後の同期状態を取得する処理を実装
    // 仮の実装として現在時刻を返す
    return NextResponse.json({
      success: true,
      lastSyncedAt: new Date().toISOString(),
      status: 'ready',
    });
  } catch (error) {
    console.error('同期状態取得エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 