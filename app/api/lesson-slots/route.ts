// 動的ルートフラグ（キャッシュを無効化）
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { stripe } from '@/lib/stripe';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 予約ステータスの列挙型
enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

// Prismaクエリ実行のラッパー関数（エラーハンドリング強化）
async function executePrismaQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error('Prisma UnknownRequestError 詳細:', error.message);
    } else {
      console.error('Prismaクエリエラー:', error);
    }
    
    // PostgreSQL接続エラーの場合、再試行
    if (error instanceof Prisma.PrismaClientInitializationError || 
        error instanceof Prisma.PrismaClientKnownRequestError ||
        error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.log('Prisma接続リセット試行...');
      
      // エラー後の再試行（最大3回）
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          // 少し待機してから再試行
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          return await queryFn();
        } catch (retryError) {
          console.error(`再試行 ${attempt + 1}/3 失敗:`, retryError);
          if (attempt === 2) throw retryError; // 最後の試行でもエラーなら投げる
        }
      }
    }
    
    throw error;
  }
}

// Stripeから単体レッスン価格を取得する関数
async function getSingleLessonPrice() {
  try {
    const priceId = process.env.NEXT_PUBLIC_LESSON_PRICE_ID ?? 'price_1RPE4rRYtspYtD2zW8Lni2Gf';

    // 価格情報を取得
    const price = await stripe.prices.retrieve(priceId);
    
    return {
      priceId: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      productId: typeof price.product === 'string' ? price.product : price.product?.id
    };
  } catch (error) {
    console.error('単体レッスン価格取得エラー:', error);
    // エラー時はデフォルト値を返す
    return {
      priceId: 'price_1RPE4rRYtspYtD2zW8Lni2Gf',
      unitAmount: 5000, // 50ドル = 5000セント
      currency: 'usd',
      productId: 'prod_test_singlelesson'
    };
  }
}

// WhereInputの型を定義
type LessonSlotWhereInput = {
  teacherId?: string;
  startTime?: {
    gte?: Date;
    lte?: Date;
  };
  isAvailable?: boolean;
};

// レッスンスロット一覧を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'from and to parameters are required' },
        { status: 400 }
      );
    }

    const slots = await prisma.lessonSlot.findMany({
      where: {
        startTime: {
          gte: new Date(from),
          lte: new Date(to),
        },
        isAvailable: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching lesson slots:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// 新しいレッスンスロットを作成
export async function POST(request: NextRequest) {
  try {
    // リクエストヘッダーを詳細にログ出力（機密情報はマスク）
    const authHeader = request.headers.get('Authorization');
    console.log("認証ヘッダー存在:", authHeader ? "あり" : "なし");
    if (authHeader) {
      console.log("認証ヘッダー形式:", 
        authHeader.startsWith('Bearer ') ? 
        "Bearer形式（正しい）" : `不正な形式: ${authHeader.substring(0, 10)}...`);
    }
    
    // サーバー側のSupabase設定ログ
    console.log("Supabase URL確認:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "設定済み" : "未設定");
    console.log("環境:", process.env.NODE_ENV || "環境変数なし");
    
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      console.error('認証情報なし - レッスンスロット作成失敗', {
        headers: Object.fromEntries([...request.headers.entries()].map(([key, value]) => 
          key.toLowerCase() === 'authorization' ? 
          [key, value.substring(0, 15) + '...'] : [key, value]
        )),
        url: request.url
      });
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    console.log(`レッスンスロット作成 - ユーザー情報:`, {
      id: sessionInfo.user.id,
      email: sessionInfo.user.email,
      role: sessionInfo.role || 'ロールなし',
      sessionValid: !!sessionInfo.session,
    });
    
    // ロール文字列を安全に取得
    const userRole = sessionInfo.role || '';
    
    // 権限チェックをより堅牢に（緩い比較で大文字小文字の違いなども許容）
    const isMentor = 
      typeof userRole === 'string' && 
      (userRole.toLowerCase().includes('mentor') || 
       userRole.toLowerCase() === 'mentor');
       
    const isAdmin = 
      typeof userRole === 'string' && 
      (userRole.toLowerCase().includes('admin') || 
       userRole.toLowerCase() === 'admin');
    
    // ロール確認のログを詳細に出力
    console.log("ロール確認詳細:", {
      originalRole: userRole,
      isMentor,
      isAdmin,
      roleType: typeof userRole,
      roleLength: typeof userRole === 'string' ? userRole.length : 'not a string',
      lowerCased: typeof userRole === 'string' ? userRole.toLowerCase() : 'not a string'
    });
    
    // メンターまたは管理者の権限チェック
    if (!isMentor && !isAdmin) {
      console.error(`権限エラー - レッスンスロット作成:`, {
        userRole,
        isMentor,
        isAdmin,
        expectedRoles: ['mentor', 'admin'],
      });
      return NextResponse.json(
        { 
          error: '講師または管理者のみがレッスン枠を作成できます', 
          roleInfo: { 
            providedRole: userRole,
            isMentor,
            isAdmin 
          } 
        },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 入力検証
    if (!data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: '開始時間と終了時間は必須です' },
        { status: 400 }
      );
    }
    
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    
    // 開始時間が終了時間より前であることを確認
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: '開始時間は終了時間より前である必要があります' },
        { status: 400 }
      );
    }
    
    // スロットの重複をチェック
    const overlappingSlot = await executePrismaQuery(() => prisma.lessonSlot.findFirst({
      where: {
        teacherId: sessionInfo.user.id,
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    }));
    
    if (overlappingSlot) {
      return NextResponse.json(
        { error: '指定された時間帯に重複するスロットが存在します' },
        { status: 409 }
      );
    }
    
    // 新しいスロットを作成
    const newSlot = await executePrismaQuery(() => prisma.lessonSlot.create({
      data: {
        teacherId: sessionInfo.user.id,
        startTime,
        endTime,
        isAvailable: data.isAvailable ?? true,
      },
    }));
    
    console.log(`レッスンスロット作成成功: ID ${newSlot.id}, 講師ID ${sessionInfo.user.id}`);
    
    return NextResponse.json(newSlot, { 
      status: 201,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Error creating lesson slot:', error);
    return NextResponse.json(
      { error: 'レッスン枠の作成中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 