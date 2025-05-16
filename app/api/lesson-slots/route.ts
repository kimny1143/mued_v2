// 動的ルートフラグ（キャッシュを無効化）
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { stripe } from '@/lib/stripe';
import { Prisma } from '@prisma/client';

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
    console.error('Prismaクエリエラー:', error);
    
    // PostgreSQL接続エラーの場合、再試行
    if (error instanceof Prisma.PrismaClientInitializationError || 
        error instanceof Prisma.PrismaClientKnownRequestError) {
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
    // 単体レッスン用の価格ID
    const LESSON_PRICE_ID = 'price_1ROXvxRYtspYtD2zVhMlsy6M';
    
    // 価格情報を取得
    const price = await stripe.prices.retrieve(LESSON_PRICE_ID);
    
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
      priceId: 'price_1ROXvxRYtspYtD2zVhMlsy6M',
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
};

// レッスンスロット一覧を取得
export async function GET(request: NextRequest) {
  try {
    // セッション情報を取得
    const sessionInfo = await getSessionFromRequest(request);
    
    console.log("認証状態:", sessionInfo ? "認証済み" : "未認証", 
                sessionInfo?.user?.email || "メール情報なし");
    
    if (!sessionInfo) {
      // 認証ヘッダーの詳細ログ（値は機密情報なのでマスク）
      const authHeader = request.headers.get('Authorization');
      console.log("認証ヘッダー:", authHeader ? "あり" : "なし");
      
      if (authHeader) {
        console.log("認証ヘッダー形式:", 
          authHeader.startsWith('Bearer ') ? 
            "Bearer形式（正しい）" : 
            "不正な形式"
        );
      }
      
      return NextResponse.json(
        { 
          error: '認証が必要です',
          details: {
            timestamp: new Date().toISOString(),
            hasAuthHeader: !!request.headers.get('Authorization'),
            environment: process.env.NODE_ENV,
            path: request.url
          }
        },
        { status: 401 }
      );
    }

    const currentUserId = sessionInfo.user.id;
    console.log(`ユーザーID: ${currentUserId}, ロール: ${sessionInfo.role}`);
    
    // 現在以降の利用可能なレッスン枠を取得
    try {
      console.log("レッスンスロット取得開始 - ユーザー:", sessionInfo.user.email);
      
      // 現在日時から6時間前まで含めた範囲で検索（タイムゾーンの問題に対応）
      const searchStartTime = new Date();
      searchStartTime.setHours(searchStartTime.getHours() - 6);
      
      console.log("検索日時範囲:", { 
        from: searchStartTime.toISOString(),
        currentServerTime: new Date().toISOString() 
      });
      
      const lessonSlots = await executePrismaQuery(() => prisma.lessonSlot.findMany({
        where: {
          startTime: {
            gte: searchStartTime, // 現在時刻から6時間前以降を含める
          },
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          // 予約情報も取得（すべてのステータスを含む）
          reservations: {
            select: {
              id: true,
              status: true,
              studentId: true,
              createdAt: true,
              updatedAt: true,
            }
          }
        },
        orderBy: {
          startTime: 'asc',
        },
      }));

      console.log(`DB検索結果: ${lessonSlots.length}件のレッスンスロット発見`);
      if (lessonSlots.length > 0) {
        console.log("レッスンスロット詳細:", lessonSlots.map(slot => ({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: slot.teacherId,
          teacherName: slot.teacher?.name,
          isAvailable: slot.isAvailable,
          reservationsCount: slot.reservations.length
        })));
      } else {
        console.log("利用可能なレッスンスロットはありません");
      }

      // Stripeから単体レッスン価格を取得
      const priceInfo = await getSingleLessonPrice();
      
      // レスポンスデータを整形
      const formattedSlots = lessonSlots.map(slot => {
        // 予約状況の解析（アクティブな予約のみ）
        const activeReservations = slot.reservations.filter(res => 
          res.status === ReservationStatus.CONFIRMED
        );

        // 自分の予約とそれ以外を分ける
        const myReservations = activeReservations.filter(res => 
          res.studentId === currentUserId
        );
        
        const otherReservations = activeReservations.filter(res => 
          res.studentId !== currentUserId
        );
        
        // スロットの利用可能性を判定
        // 1. スロット自体がisAvailable=falseならどのユーザーにも予約不可
        // 2. 他のユーザーの確定済み予約があれば予約不可
        // 3. 自分自身の予約がある場合は特別扱い（UIで「あなたの予約」として表示）
        const hasMyReservation = myReservations.length > 0;
        const hasOtherConfirmedReservation = otherReservations.some(res => 
          res.status === ReservationStatus.CONFIRMED
        );

        // 実際の予約可能状態を計算
        const isActuallyAvailable = slot.isAvailable && !hasOtherConfirmedReservation;

        // 各スロットに対するフラグをログ
        console.log(`スロットID ${slot.id}: isAvailable=${slot.isAvailable}, ` +
          `hasMyReservation=${hasMyReservation}, ` +
          `hasOtherConfirmedReservation=${hasOtherConfirmedReservation}, ` +
          `isActuallyAvailable=${isActuallyAvailable}`);
        
        return {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: slot.teacherId,
          teacher: slot.teacher ? {
            id: slot.teacher.id,
            name: slot.teacher.name,
            image: slot.teacher.image,
          } : null,
          mentorName: slot.teacher?.name || undefined,
          // スロット利用可能性
          isAvailable: isActuallyAvailable,
          // 自分が予約済みかどうか
          isReservedByMe: hasMyReservation,
          // 自分の予約情報（存在する場合）
          myReservation: myReservations.length > 0 
            ? myReservations.reduce((latest, res) => 
                !latest || new Date(res.updatedAt) > new Date(latest.updatedAt) ? res : latest
              ) 
            : null,
          // Stripe価格情報を追加
          price: priceInfo.unitAmount,
          currency: priceInfo.currency,
          priceId: priceInfo.priceId,
          // 全予約情報（管理者とメンター用）
          reservations: sessionInfo.role === 'admin' || 
                        (sessionInfo.role === 'mentor' && slot.teacherId === currentUserId)
                        ? slot.reservations
                        : undefined,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        };
      });

      console.log(`クライアントへの返却データ: ${formattedSlots.length}件のレッスンスロット`);

      return NextResponse.json(formattedSlots, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache', 
          'Expires': '0'
        }
      });
    } catch (dbError) {
      console.error("データベースからのレッスンスロット取得エラー:", dbError);
      return NextResponse.json(
        { 
          error: 'レッスンスロットの取得中にデータベースエラーが発生しました', 
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("レッスンスロット取得エラー:", error);
    
    return NextResponse.json(
      { 
        error: 'レッスンスロットの取得中にエラーが発生しました', 
        details: error instanceof Error ? error.message : String(error),
        database_url: process.env.DATABASE_URL ? '設定済み (形式非表示)' : '未設定',
        timestamp: new Date().toISOString()
      },
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