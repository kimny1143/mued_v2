// 動的ルートフラグ（キャッシュを無効化）
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma, ReservationStatus } from '@prisma/client';
import { generateHourlySlots } from '@/lib/utils';

// スロットの拡張型定義（動的プロパティへの対応）
interface SlotWithReservations {
  id: string;
  teacherId: string;
  startTime: Date;
  endTime: Date;
  hourlyRate: number;
  currency: string;
  minHours: number;
  maxHours: number | null;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
  reservations: {
    id: string;
    bookedStartTime: Date;
    bookedEndTime: Date;
    status: ReservationStatus;
  }[];
  // Prismaモデルに存在するが型定義に含まれていないminDuration, maxDurationの対応
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
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

/**
 * メンター別のレッスンスロットを取得するAPI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mentorId = params.id;
    if (!mentorId) {
      return NextResponse.json(
        { error: 'メンターIDが必要です' },
        { status: 400 }
      );
    }

    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const minDuration = searchParams.get('minDuration') ? parseInt(searchParams.get('minDuration')!) : null;
    const maxDuration = searchParams.get('maxDuration') ? parseInt(searchParams.get('maxDuration')!) : null;
    const availableOnly = searchParams.get('availableOnly') !== 'false'; // デフォルトはtrue
    
    console.log(`メンターID「${mentorId}」のレッスンスロット取得API呼び出し:`, {
      fromDate,
      toDate,
      minDuration,
      maxDuration,
      availableOnly
    });

    // まず、メンターが存在するか確認
    const mentor = await executePrismaQuery(() => prisma.user.findUnique({
      where: {
        id: mentorId,
        roleId: 'mentor'
      },
      select: {
        id: true,
        name: true,
        image: true
      }
    }));

    if (!mentor) {
      return NextResponse.json(
        { error: '指定されたメンターが見つかりません' },
        { status: 404 }
      );
    }
    
    // フィルタリング条件を構築
    const filter: Prisma.LessonSlotWhereInput = {
      teacherId: mentorId
    };
    
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
    
    // 時間の制約でフィルタリング（時間単位）
    if (minDuration !== null) {
      // 時間単位での検索条件
      filter.minHours = {
        lte: Math.ceil(minDuration / 60) // 分を時間に変換（切り上げ）
      };
    }
    
    if (maxDuration !== null) {
      // 時間単位での検索条件
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
    const slotsFromDB = await executePrismaQuery(() => prisma.lessonSlot.findMany({
      where: filter,
      orderBy: { startTime: 'asc' },
      include: {
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
    
    // 型を明示的に指定して扱いやすくする
    const slots: SlotWithReservations[] = slotsFromDB.map(slot => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const extendedSlot = slot as any;
      return {
        ...slot,
        // 明示的にminDuration/maxDurationを設定（データモデルにこれらが存在する前提）
        minDuration: extendedSlot.minDuration || 60,
        maxDuration: extendedSlot.maxDuration || 90
      };
    });
    
    // minDuration/maxDurationによるフィルタリング
    const filteredSlots = minDuration !== null || maxDuration !== null
      ? slots.filter(slot => {
          // 最小時間の制約をチェック
          if (minDuration !== null && slot.minDuration > minDuration) {
            return false;
          }
          
          // 最大時間の制約をチェック
          if (maxDuration !== null && slot.maxDuration < maxDuration) {
            return false;
          }
          
          return true;
        })
      : slots;
    
    // 各スロットの予約済み時間帯情報を整形して返す
    const enhancedSlots = filteredSlots.map(slot => {
      // 時間単位の予約状況を計算
      const hourlySlots = generateHourlySlots(slot);
      
      // 60-90分の固定枠制約を追加
      const durationConstraints = {
        minDuration: slot.minDuration,
        maxDuration: slot.maxDuration,
        minHours: slot.minHours,
        maxHours: slot.maxHours
      };
      
      return {
        ...slot,
        hourlySlots,
        durationConstraints,
        // メンター情報を追加
        teacher: mentor
      };
    });
    
    console.log(`🟢 メンター「${mentorId}」のレッスンスロット取得完了: ${enhancedSlots.length}件`);
    return NextResponse.json(enhancedSlots, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error(`🔴 メンター別レッスンスロット取得エラー:`, error);
    return NextResponse.json(
      { error: 'レッスンスロットの取得中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 