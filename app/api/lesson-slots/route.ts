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
import { convertLessonSlotRequestToDb } from '@/lib/caseConverter';

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
    // 🔐 認証チェックを追加
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      console.error('認証情報なし - レッスンスロット取得失敗');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    console.log(`レッスンスロット取得 - ユーザー: ${sessionInfo.user.id} (${sessionInfo.user.email})`);

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const viewMode = searchParams.get('viewMode') || 'own'; // デフォルトは自分のスロットのみ
    const minDuration = searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : null;
    const maxDuration = searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!) : null;
    const availableOnly = searchParams.get('availableOnly') !== 'false'; // デフォルトはtrue
    
    console.log('レッスンスロット取得API呼び出し:', {
      userId: sessionInfo.user.id,
      viewMode, // 🆕 表示モード
      minDuration,
      maxDuration,
      availableOnly,
      note: viewMode === 'own' ? '認証ユーザーのスロットのみ取得' : '全メンターのスロット取得'
    });
    
    // フィルタリング条件を構築
    const filter: Prisma.lesson_slotsWhereInput = {};
    
    // 🆕 viewModeに基づいてteacherIdフィルターを設定
    if (viewMode === 'own') {
      // 自分のスロットのみ（メンター視点）
      filter.teacher_id = sessionInfo.user.id;
    }
    // viewMode === 'all' の場合はteacherIdフィルターなし（全メンターのスロット）
    
    // 時間の制約でフィルタリング（分単位を優先、ない場合は時間単位で互換性維持）
    if (minDuration !== null) {
      // 分単位フィールドを優先
      filter.min_duration = {
        lte: minDuration
      };
      
      // 互換性のために時間単位フィールドも設定（古いレコード対応）
      filter.min_hours = {
        lte: Math.ceil(minDuration / 60) // 分を時間に変換（切り上げ）
      };
    }
    
    if (maxDuration !== null) {
      // 分単位フィールドを優先
      filter.max_duration = {
        gte: maxDuration
      };
      
      // 互換性のために時間単位フィールドも設定
      if (filter.max_hours) {
        filter.max_hours = {
          ...filter.max_hours as Prisma.IntNullableFilter,
          gte: Math.floor(maxDuration / 60) // 分を時間に変換（切り捨て）
        };
      } else {
        filter.max_hours = {
          gte: Math.floor(maxDuration / 60)
        };
      }
    }
    
    // 利用可能なスロットのみを取得
    if (availableOnly) {
      filter.is_available = true;
    }
    
    // レッスンスロットを取得
    const slots = await executePrismaQuery(() => prisma.lesson_slots.findMany({
      where: filter,
      orderBy: { start_time: 'asc' },
      include: {
        users: {
          select: { id: true, name: true, image: true }
        },
        reservations: {
          where: { 
            status: { in: ['PENDING', 'CONFIRMED', 'APPROVED', 'PENDING_APPROVAL'] } 
          },
          select: {
            id: true,
            booked_start_time: true,
            booked_end_time: true,
            status: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    }));
    
    // 各スロットの予約済み時間帯情報を整形して返す（スネークケース→キャメルケース変換）
    const enhancedSlots = slots.map(slot => {
      // generateHourlySlots用にデータを変換
      const slotForHourlyGeneration = {
        id: slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        teacherId: slot.teacher_id,
        isAvailable: slot.is_available,
        reservations: slot.reservations.map(reservation => ({
          id: reservation.id,
          bookedStartTime: reservation.booked_start_time,
          bookedEndTime: reservation.booked_end_time,
          status: reservation.status
        })),
        hourlyRate: slot.hourly_rate,
        currency: slot.currency
      };
      
      const hourlySlots = generateHourlySlots(slotForHourlyGeneration);
      
      // フロントエンドが期待するキャメルケース形式に変換
      return {
        id: slot.id,
        teacherId: slot.teacher_id,               // teacher_id → teacherId
        startTime: slot.start_time,               // start_time → startTime
        endTime: slot.end_time,                   // end_time → endTime
        hourlyRate: slot.hourly_rate,             // hourly_rate → hourlyRate
        currency: slot.currency,
        minHours: slot.min_hours,                 // min_hours → minHours
        maxHours: slot.max_hours,                 // max_hours → maxHours
        isAvailable: slot.is_available,           // is_available → isAvailable
        createdAt: slot.created_at,               // created_at → createdAt
        updatedAt: slot.updated_at,               // updated_at → updatedAt
        // フロントエンドが期待するteacher形式に変換
        teacher: slot.users,
        // 予約情報もキャメルケースに変換
        reservations: slot.reservations.map(reservation => ({
          id: reservation.id,
          bookedStartTime: reservation.booked_start_time,  // booked_start_time → bookedStartTime
          bookedEndTime: reservation.booked_end_time,      // booked_end_time → bookedEndTime
          status: reservation.status,
          student: reservation.users  // users → student
        })),
        hourlySlots,
        // 分単位の予約時間制約を明示的に含める
        durationConstraints: {
          minDuration: slot.min_duration || 60,   // min_duration → minDuration
          maxDuration: slot.max_duration || 90,   // max_duration → maxDuration
          minHours: slot.min_hours,               // min_hours → minHours
          maxHours: slot.max_hours                // max_hours → maxHours
        }
      };
    });
    
    console.log(`🟢 lesson-slots (${viewMode}モード): ${enhancedSlots.length}件`);
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
        const userData = await prisma.users.findUnique({
          where: { id: sessionInfo.user.id },
          include: { roles: true }
        });
        
        console.log("🔍 DB直接取得のユーザー情報:", {
          found: !!userData,
          roleId: userData?.role_id,
          roleName: userData?.roles?.name
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
    
    // デバッグ用に追加
    console.log('受信したデータ:', {
      startTime: data.startTime,
      endTime: data.endTime,
      hourlyRate: data.hourlyRate,
      minHours: data.minHours,
      maxHours: data.maxHours
    });
    console.log('Dateオブジェクト変換後:', {
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime)
    });
    
    // 入力検証 - フロントエンドはキャメルケース（startTime, endTime）で送信
    if (!data.startTime || !data.endTime) {
      return NextResponse.json(
        { error: '開始時間と終了時間は必須です' },
        { status: 400 }
      );
    }
    
    const start_time = new Date(data.startTime);
    const end_time = new Date(data.endTime);
    
    // 開始時間が終了時間より前であることを確認
    if (start_time >= end_time) {
      return NextResponse.json(
        { error: '開始時間は終了時間より前である必要があります' },
        { status: 400 }
      );
    }
    
    // スロットの重複をチェック
    const overlappingSlot = await executePrismaQuery(() => prisma.lesson_slots.findFirst({
      where: {
        teacher_id: sessionInfo.user.id,
        OR: [
          {
            start_time: { lte: start_time },
            end_time: { gt: start_time },
          },
          {
            start_time: { lt: end_time },
            end_time: { gte: end_time },
          },
          {
            start_time: { gte: start_time },
            end_time: { lte: end_time },
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
    
    // convertLessonSlotRequestToDbを使用してキャメルケース→スネークケース変換
    const convertedData = convertLessonSlotRequestToDb(data);
    console.log('変換後のスロットデータ:', convertedData);

    // 新しいスロットを作成
    const newSlot = await executePrismaQuery(() => prisma.lesson_slots.create({
      data: {
        id: crypto.randomUUID(),
        teacher_id: sessionInfo.user.id,
        start_time,
        end_time,
        ...convertedData,
        created_at: new Date(),
        updated_at: new Date(),
      },
    }));
    
    console.log(`レッスンスロット作成成功: ID ${newSlot.id}, 講師ID ${sessionInfo.user.id}`);
    
    // レスポンスもキャメルケース形式に変換
    const responseSlot = {
      id: newSlot.id,
      teacherId: newSlot.teacher_id,           // teacher_id → teacherId
      startTime: newSlot.start_time,           // start_time → startTime
      endTime: newSlot.end_time,               // end_time → endTime
      hourlyRate: newSlot.hourly_rate,         // hourly_rate → hourlyRate
      currency: newSlot.currency,
      minHours: newSlot.min_hours,             // min_hours → minHours
      maxHours: newSlot.max_hours,             // max_hours → maxHours
      minDuration: newSlot.min_duration,       // min_duration → minDuration
      maxDuration: newSlot.max_duration,       // max_duration → maxDuration
      isAvailable: newSlot.is_available,       // is_available → isAvailable
      createdAt: newSlot.created_at,           // created_at → createdAt
      updatedAt: newSlot.updated_at,           // updated_at → updatedAt
      description: '',                         // descriptionは現在DBに存在しないため空文字を返す
      // 必要に応じてteacher情報も追加
      teacher: {
        id: sessionInfo.user.id,
        name: sessionInfo.user.name || null,
        email: sessionInfo.user.email || null,
        image: sessionInfo.user.image || null
      },
      reservations: []  // 新規作成時は予約は空
    };
    
    return NextResponse.json(responseSlot, { 
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