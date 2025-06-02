import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { hasPermission } from '@/lib/role-utils';

// 動的ルートとして設定
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // 管理者権限チェック
    if (!hasPermission(session.role || '', 'admin')) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }
    
    console.log('=== 手動実行: 決済Cronジョブテスト ===');
    console.log('実行者:', session.user.email);
    console.log('実行時刻:', new Date().toISOString());
    
    // 実際のCronエンドポイントを呼び出し
    const baseUrl = process.env.NEXT_PUBLIC_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const response = await fetch(`${baseUrl}/api/cron/execute-payments`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    
    console.log('Cron実行結果:', {
      status: response.status,
      result
    });
    
    return NextResponse.json({
      success: response.ok,
      message: '決済Cronジョブを手動実行しました',
      executedBy: session.user.email,
      executedAt: new Date().toISOString(),
      cronResult: result
    });
    
  } catch (error) {
    console.error('手動実行エラー:', error);
    return NextResponse.json(
      { 
        error: '手動実行に失敗しました',
        details: String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // POSTメソッドでも同じ処理を実行
  return GET(request);
}