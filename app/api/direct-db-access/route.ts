import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/auth';

// 管理者クライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * サブスクリプションデータを直接データベースに追加するAPIエンドポイント
 * クライアントサイドでの使用が簡単なように設計
 */
export async function POST(request: Request) {
  try {
    // セッションチェック
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log(`ユーザー ${userId} のサブスクリプション情報を作成します`);

    // 現在時刻とサブスクリプション期間を設定
    const now = Math.floor(Date.now() / 1000);
    const oneMonthLater = now + 30 * 24 * 60 * 60; // 30日後

    // サブスクリプションデータを作成
    const subscriptionData = {
      userId: userId,
      customerId: `cus_test_${Date.now()}`,
      subscriptionId: `sub_test_${Date.now()}`,
      priceId: 'price_1RMJdXRYtspYtD2zESbuO5mG', // テスト用プランID
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater,
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString()
    };

    // データベースに直接挿入（管理者権限）
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'userId'
      })
      .select();

    if (error) {
      console.error('DB挿入エラー:', error);
      return NextResponse.json({ 
        error: 'サブスクリプションデータの保存に失敗しました',
        details: error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'サブスクリプションステータスを正常に更新しました',
      subscription: data
    });
  } catch (error) {
    console.error('予期しないエラー:', error);
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 