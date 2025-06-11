import { NextRequest, NextResponse } from 'next/server';
import { sessionCache, jwtCache } from '@/lib/cache/session-cache';
import { getSessionFromRequest } from '@/lib/session';

// キャッシュクリアAPIエンドポイント（開発・デバッグ用）
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // キャッシュクリア前の統計情報
    const beforeStats = {
      sessionCacheSize: sessionCache.size,
      jwtCacheSize: jwtCache.size
    };

    // キャッシュをクリア
    sessionCache.clear();
    jwtCache.clear();

    // キャッシュクリア後の統計情報
    const afterStats = {
      sessionCacheSize: sessionCache.size,
      jwtCacheSize: jwtCache.size
    };

    console.log('[Cache Clear] User:', session.user.email);
    console.log('[Cache Clear] Before:', beforeStats);
    console.log('[Cache Clear] After:', afterStats);

    return NextResponse.json({
      success: true,
      message: 'キャッシュをクリアしました',
      stats: {
        before: beforeStats,
        after: afterStats,
        clearedEntries: {
          session: beforeStats.sessionCacheSize,
          jwt: beforeStats.jwtCacheSize
        }
      }
    });
  } catch (error) {
    console.error('[Cache Clear Error]', error);
    return NextResponse.json(
      { error: 'キャッシュクリア中にエラーが発生しました' },
      { status: 500 }
    );
  }
}