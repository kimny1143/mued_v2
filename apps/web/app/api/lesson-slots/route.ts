// 動的ルートフラグ（キャッシュを無効化）
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { convertLessonSlotRequestToDb } from '@/lib/caseConverter';
import { getSessionFromRequest } from '@/lib/session';
import { stripe } from '@/lib/stripe';
import { generateHourlySlots } from '@/lib/utils';
import { isPastJst, addJstFields, parseAsUTC } from '@/lib/utils/timezone';
import { getFeature } from '@/lib/config/features';

// データベースの時刻文字列をUTCとして解釈するヘルパー関数
function ensureUTCTimestamp(timestamp: string): string {
  // parseAsUTCで変換してISO文字列として返す
  return parseAsUTC(timestamp).toISOString();
}

// 予約ステータスの列挙型（現在は未使用だがAPIの拡張で使用予定）
enum _ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

// Supabaseクエリ実行のラッパー関数（エラーハンドリング強化）
async function executeSupabaseQuery<T>(queryFn: () => Promise<{ data: T | null; error: any }>): Promise<T> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      console.error('Supabaseクエリエラー:', error);
      throw new Error(error.message || 'Database query failed');
    }
    
    return data as T;
  } catch (error) {
    console.error('Supabaseクエリ実行エラー:', error);
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const debug = searchParams.get('debug') === 'true'; // デバッグモード
    
    console.log('レッスンスロット取得API呼び出し:', {
      userId: sessionInfo.user.id,
      viewMode, // 🆕 表示モード
      minDuration,
      maxDuration,
      availableOnly,
      startDate,
      endDate,
      note: viewMode === 'own' ? '認証ユーザーのスロットのみ取得' : '全メンターのスロット取得'
    });
    
    const supabase = createServiceClient();
    
    // フィーチャーフラグでビュー使用を判定
    const useDbViews = getFeature('USE_DB_VIEWS');
    const tableName = useDbViews ? 'active_lesson_slots' : 'lesson_slots';
    
    console.log(`APIレスポンス: ${tableName}を使用 (ビュー利用: ${useDbViews})`);
    
    // Supabaseクエリを構築
    let query = supabase
      .from(tableName)
      .select(`
        *,
        teacher:users(id, name, image)
      `)
      .order('start_time', { ascending: true });

    // 🆕 viewModeに基づいてteacherIdフィルターを設定
    if (viewMode === 'own') {
      // 自分のスロットのみ（メンター視点）
      query = query.eq('teacher_id', sessionInfo.user.id);
    }
    // viewMode === 'all' の場合はteacherIdフィルターなし（全メンターのスロット）
    
    // 日付範囲でフィルタリング
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query = query.gte('start_time', start.toISOString());
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('start_time', end.toISOString());
    }
    
    // 過去のスロットを除外（ビューを使用しない場合のみ）
    if (!useDbViews) {
      const now = new Date().toISOString();
      query = query.gte('end_time', now);
    }
    
    // 時間の制約でフィルタリング（分単位を優先）
    if (minDuration !== null) {
      query = query.lte('min_duration', minDuration);
    }
    
    if (maxDuration !== null) {
      query = query.gte('max_duration', maxDuration);
    }
    
    // 利用可能なスロットのみを取得
    if (availableOnly) {
      query = query.eq('is_available', true);
    }
    
    // レッスンスロットを取得
    const { data: slots, error } = await query;
    
    if (error) {
      console.error('Supabaseスロット取得エラー:', error);
      throw new Error(error.message);
    }
    
    if (!slots) {
      console.log('スロット取得結果: 空配列');
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // 予約情報を別途取得（inner joinでは予約がないスロットが除外されるため）
    const reservationTableName = useDbViews ? 'active_reservations' : 'reservations';
    let reservationQuery = supabase
      .from(reservationTableName)
      .select(`
        id,
        slot_id,
        booked_start_time,
        booked_end_time,
        status,
        users!student_id(id, name, email)
      `)
      .in('slot_id', slots.map(slot => slot.id));
    
    // ビューを使用しない場合はステータスでフィルタリング
    if (!useDbViews) {
      reservationQuery = reservationQuery.in('status', ['PENDING', 'CONFIRMED', 'APPROVED', 'PENDING_APPROVAL']);
    }
    
    const { data: reservations } = await reservationQuery;
    
    // 🔍 デバッグ: 予約情報取得結果
    console.log('🔍 予約情報取得:', {
      reservationCount: reservations?.length || 0,
      sampleReservation: reservations?.[0],
      viewMode,
      useDbViews,
      startDate,
      endDate,
      slotIds: slots.map(s => s.id).slice(0, 3)
    });

    // スロットと予約を結合
    const slotsWithReservations = slots.map(slot => {
      const slotReservations = reservations?.filter(r => r.slot_id === slot.id) || [];
      return {
        ...slot,
        reservations: slotReservations
      };
    });
    
    // DBレベルで既にフィルタリング済みのため、アプリケーション層でのフィルタは不要
    const activeSlotsWithReservations = slotsWithReservations;
    
    // 各スロットの予約済み時間帯情報を整形して返す（スネークケース→キャメルケース変換）
    const enhancedSlots = activeSlotsWithReservations.map(slot => {
      // generateHourlySlots用にデータを変換
      const slotForHourlyGeneration = {
        id: slot.id,
        startTime: ensureUTCTimestamp(slot.start_time),
        endTime: ensureUTCTimestamp(slot.end_time),
        teacherId: slot.teacher_id,
        isAvailable: slot.is_available,
        reservations: slot.reservations.map((reservation: any) => ({
          id: reservation.id,
          bookedStartTime: ensureUTCTimestamp(reservation.booked_start_time),
          bookedEndTime: ensureUTCTimestamp(reservation.booked_end_time),
          status: reservation.status
        })),
        hourlyRate: slot.hourly_rate,
        currency: slot.currency
      };
      
      const hourlySlots = generateHourlySlots(slotForHourlyGeneration, slotForHourlyGeneration.reservations);
      
      // フロントエンドが期待するキャメルケース形式に変換
      const baseSlot = {
        id: slot.id,
        teacherId: slot.teacher_id,               // teacher_id → teacherId
        startTime: ensureUTCTimestamp(slot.start_time),  // UTC時刻として解釈
        endTime: ensureUTCTimestamp(slot.end_time),      // UTC時刻として解釈
        hourlyRate: slot.hourly_rate,             // hourly_rate → hourlyRate
        currency: slot.currency,
        minHours: slot.min_hours,                 // min_hours → minHours
        maxHours: slot.max_hours,                 // max_hours → maxHours
        isAvailable: slot.is_available,           // is_available → isAvailable
        createdAt: ensureUTCTimestamp(slot.created_at),  // UTC時刻として解釈
        updatedAt: ensureUTCTimestamp(slot.updated_at),  // UTC時刻として解釈
        // フロントエンドが期待するteacher形式に変換
        teacher: slot.teacher || slot.users,
        // 予約情報もキャメルケースに変換（過去の予約も除外）
        reservations: slot.reservations
          .filter((reservation: any) => !isPastJst(ensureUTCTimestamp(reservation.booked_end_time)))
          .map((reservation: any) => ({
            id: reservation.id,
            bookedStartTime: ensureUTCTimestamp(reservation.booked_start_time),  // UTC時刻として解釈
            bookedEndTime: ensureUTCTimestamp(reservation.booked_end_time),      // UTC時刻として解釈
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
      
      // JST表示用フィールドを追加
      return addJstFields(baseSlot, ['startTime', 'endTime', 'createdAt', 'updatedAt'], debug);
    });
    
    // PENDING_APPROVALの予約を確認
    const pendingApprovalCount = enhancedSlots.reduce((count, slot) => {
      return count + slot.reservations.filter((res: any) => res.status === 'PENDING_APPROVAL').length;
    }, 0);
    
    console.log(`🟢 lesson-slots (${viewMode}モード): ${enhancedSlots.length}件`);
    console.log(`🔍 PENDING_APPROVAL予約: ${pendingApprovalCount}件`);
    
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
        const supabase = createServiceClient();
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, role_id, roles(name)')
          .eq('id', sessionInfo.user.id)
          .single();
        
        console.log("🔍 DB直接取得のユーザー情報:", {
          found: !!userData,
          roleId: userData?.role_id,
          roleName: (userData?.roles as any)?.name,
          error: error?.message
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

    // メンターまたは管理者の権限チェック
    const forceAuthorize = false; // 権限チェックを有効化
    
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
      endTime: new Date(data.endTime),
      startTimeISO: new Date(data.startTime).toISOString(),
      endTimeISO: new Date(data.endTime).toISOString()
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
    const supabase = createServiceClient();
    const { data: overlappingSlot } = await supabase
      .from('lesson_slots')
      .select('id')
      .eq('teacher_id', sessionInfo.user.id)
      .or(`and(start_time.lte.${start_time.toISOString()},end_time.gt.${start_time.toISOString()}),and(start_time.lt.${end_time.toISOString()},end_time.gte.${end_time.toISOString()}),and(start_time.gte.${start_time.toISOString()},end_time.lte.${end_time.toISOString()})`)
      .limit(1)
      .single();
    
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
    const newSlotId = crypto.randomUUID();
    const { data: newSlot, error: createError } = await supabase
      .from('lesson_slots')
      .insert({
        id: newSlotId,
        teacher_id: sessionInfo.user.id,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        ...convertedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        teacher:users(id, name, email, image)
      `)
      .single();
    
    if (createError || !newSlot) {
      console.error('スロット作成エラー:', createError);
      throw new Error(createError?.message || 'Failed to create slot');
    }
    
    console.log(`レッスンスロット作成成功: ID ${newSlot.id}, 講師ID ${sessionInfo.user.id}`);
    console.log('作成されたスロットデータ:', {
      ...newSlot,
      start_time_raw: newSlot.start_time,
      end_time_raw: newSlot.end_time,
      start_time_jst: new Date(newSlot.start_time).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      end_time_jst: new Date(newSlot.end_time).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    });
    
    // レスポンスもキャメルケース形式に変換
    const responseSlot = {
      id: newSlot.id,
      teacherId: newSlot.teacher_id,           // teacher_id → teacherId
      startTime: ensureUTCTimestamp(newSlot.start_time),  // UTC時刻として解釈
      endTime: ensureUTCTimestamp(newSlot.end_time),      // UTC時刻として解釈
      hourlyRate: newSlot.hourly_rate,         // hourly_rate → hourlyRate
      currency: newSlot.currency,
      minHours: newSlot.min_hours,             // min_hours → minHours
      maxHours: newSlot.max_hours,             // max_hours → maxHours
      minDuration: newSlot.min_duration,       // min_duration → minDuration
      maxDuration: newSlot.max_duration,       // max_duration → maxDuration
      isAvailable: newSlot.is_available,       // is_available → isAvailable
      createdAt: ensureUTCTimestamp(newSlot.created_at),  // UTC時刻として解釈
      updatedAt: ensureUTCTimestamp(newSlot.updated_at),  // UTC時刻として解釈
      // descriptionフィールドは存在しないため除外
      // teacher情報をincludeから取得
      teacher: newSlot.teacher || newSlot.users,
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