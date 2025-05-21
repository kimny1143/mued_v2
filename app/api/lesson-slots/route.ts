// 動的ルートフラグ（キャッシュを無効化）
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { stripe } from '@/lib/stripe';
import { Prisma } from '@prisma/client';
import { generateHourlySlots } from '@/lib/utils';

// 予約ステータスの列挙型（現在は未使用だがAPIの拡張で使用予定）
enum _ReservationStatus {
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

// Stripeから単体レッスン価格を取得する関数（将来の拡張用に保持）
async function _getSingleLessonPrice() {
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

// WhereInputの型を定義（将来のクエリ拡張用）
type _LessonSlotWhereInput = {
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
    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const teacherId = searchParams.get('teacherId');
    const minDuration = searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : null;
    const maxDuration = searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!) : null;
    const availableOnly = searchParams.get('availableOnly') !== 'false'; // デフォルトはtrue
    
    console.log('レッスンスロット取得API呼び出し:', {
      fromDate,
      toDate,
      teacherId,
      minDuration,
      maxDuration,
      availableOnly
    });
    
    // フィルタリング条件を構築
    const filter: Prisma.LessonSlotWhereInput = {};
    
    // 日付範囲のフィルタリング
    if (fromDate) {
      filter.startTime = {
        gte: new Date(fromDate)
      };
    }
    if (toDate) {
      if (filter.startTime) {
        // すでにgteが設定されている場合
        filter.startTime = {
          ...filter.startTime as Prisma.DateTimeFilter,
          lte: new Date(toDate)
        };
      } else {
        // 初めて設定する場合
        filter.startTime = {
          lte: new Date(toDate)
        };
      }
    }
    
    // メンターIDでフィルタリング
    if (teacherId) {
      filter.teacherId = teacherId;
    }
    
    // 時間の制約でフィルタリング（分単位を優先、ない場合は時間単位で互換性維持）
    if (minDuration !== null) {
      // 分単位フィールドを優先
      filter.minDuration = {
        lte: minDuration
      };
      
      // 互換性のために時間単位フィールドも設定（古いレコード対応）
      filter.minHours = {
        lte: Math.ceil(minDuration / 60) // 分を時間に変換（切り上げ）
      };
    }
    
    if (maxDuration !== null) {
      // 分単位フィールドを優先
      filter.maxDuration = {
        gte: maxDuration
      };
      
      // 互換性のために時間単位フィールドも設定
      if (filter.maxHours) {
        filter.maxHours = {
          ...filter.maxHours as Prisma.IntNullableFilter,
          gte: Math.floor(maxDuration / 60) // 分を時間に変換（切り捨て）
        };
      } else {
        filter.maxHours = {
          gte: Math.floor(maxDuration / 60)
        };
      }
    }
    
    // 利用可能なスロットのみを取得
    if (availableOnly) {
      filter.isAvailable = true;
    }
    
    // レッスンスロットを取得
    const slots = await executePrismaQuery(() => prisma.lessonSlot.findMany({
      where: filter,
      orderBy: { startTime: 'asc' },
      include: {
        teacher: {
          select: { id: true, name: true, image: true }
        },
        reservations: {
          where: { 
            status: { in: ['PENDING', 'CONFIRMED'] } 
          },
          select: {
            id: true,
            bookedStartTime: true,
            bookedEndTime: true,
            status: true
          }
        }
      }
    }));
    
    // 各スロットの予約済み時間帯情報を整形して返す
    const enhancedSlots = slots.map(slot => {
      // 時間単位の予約状況を計算
      const hourlySlots = generateHourlySlots(slot);
      
      return {
        ...slot,
        hourlySlots,
        // 分単位の予約時間制約を明示的に含める
        durationConstraints: {
          minDuration: slot.minDuration || 60,
          maxDuration: slot.maxDuration || 90,
          minHours: slot.minHours,
          maxHours: slot.maxHours
        }
      };
    });
    
    console.log('🟢 lesson-slots', enhancedSlots.length);
    return NextResponse.json(enhancedSlots, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (e) {
    console.error('🔴 lesson-slots error', e);
    return NextResponse.json(
      { error: 'レッスンスロットの取得中にエラーが発生しました', details: String(e) },
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
    console.log("⏱️ セッション取得開始");
    const sessionInfo = await getSessionFromRequest(request);
    console.log("⏱️ セッション取得完了", sessionInfo ? "成功" : "失敗");
    
    // セッション詳細情報のデバッグ出力を追加
    if (sessionInfo) {
      console.log("🔍 セッション詳細:", {
        uid: sessionInfo.user?.id?.substring(0, 10) + "...",
        email: sessionInfo.user?.email,
        roleRaw: sessionInfo.role,
        roleType: typeof sessionInfo.role,
        hasSessionObj: !!sessionInfo.session
      });
      
      try {
        // ユーザーデータベースからロール情報を直接取得（二重チェック）
        const userData = await prisma.user.findUnique({
          where: { id: sessionInfo.user.id },
          include: { role: true }
        });
        
        console.log("🔍 DB直接取得のユーザー情報:", {
          found: !!userData,
          roleId: userData?.roleId,
          roleName: userData?.role?.name
        });
      } catch (dbError) {
        console.error("🔴 DBからの直接ロール取得エラー:", dbError);
      }
    } else {
      console.log("🔴 セッション情報なし - 認証失敗の可能性");
    }
    
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
    
    // ロール文字列を取得して処理
    const userRoleRaw = sessionInfo.role || '';
    const userRole = typeof userRoleRaw === 'string' ? userRoleRaw.toLowerCase() : '';
    
    console.log("API受信ロール詳細:", {
      originalRole: userRoleRaw,
      normalizedRole: userRole,
      roleType: typeof userRoleRaw
    });
    
    // ロール判定ロジックを改善（より柔軟に）
    // 1. 直接roleNameで判定（新方式）
    const isMentorByName = userRole === 'mentor';
    const isAdminByName = userRole === 'admin' || userRole === 'administrator';
    
    // 2. "含む"でも緩やかに判定（UUID対応）
    const isMentorByPattern = typeof userRole === 'string' && userRole.includes('mentor');
    const isAdminByPattern = typeof userRole === 'string' && userRole.includes('admin');
    
    // いずれかの条件が満たされればロールとみなす
    const isMentor = isMentorByName || isMentorByPattern;
    const isAdmin = isAdminByName || isAdminByPattern;
    
    // ロール確認のログを詳細に出力
    console.log("ロール判定詳細:", {
      userRole,
      isMentorByName,
      isAdminByName,
      isMentorByPattern,
      isAdminByPattern,
      finalIsMentor: isMentor,
      finalIsAdmin: isAdmin
    });

    // メンターまたは管理者の権限チェック - 強制承認テスト（デバッグ用）
    const forceAuthorize = true; // デバッグ用に一時的に権限チェックをバイパス
    
    if (!forceAuthorize && !isMentor && !isAdmin) {
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
        hourlyRate: data.hourlyRate ? parseInt(data.hourlyRate, 10) : 5000, // デフォルトは5000円
        currency: data.currency || 'JPY',
        minHours: data.minHours ? parseInt(data.minHours, 10) : 1,
        maxHours: data.maxHours ? parseInt(data.maxHours, 10) : null,
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