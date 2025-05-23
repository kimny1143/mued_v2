// 動的ルートフラグ（キャッシュを無効化）
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma, ReservationStatus } from '@prisma/client';
import { generateHourlySlots, formatToJstIsoString } from '@/lib/utils';
import { parseISO, isValid, isBefore } from 'date-fns';

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
    const { id: mentorId } = params;
    const searchParams = request.nextUrl.searchParams;
    
    // クエリパラメータから日付範囲を取得
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    
    // 日付バリデーション
    if (!fromParam || !toParam) {
      return NextResponse.json(
        { error: '開始日と終了日の両方を指定してください (from, to)' },
        { status: 400 }
      );
    }
    
    const fromDate = parseISO(fromParam);
    const toDate = parseISO(toParam);
    
    if (!isValid(fromDate) || !isValid(toDate)) {
      return NextResponse.json(
        { error: '無効な日付形式です。YYYY-MM-DD形式で指定してください。' },
        { status: 400 }
      );
    }
    
    if (isBefore(toDate, fromDate)) {
      return NextResponse.json(
        { error: '終了日は開始日より後である必要があります。' },
        { status: 400 }
      );
    }
    
    // mentorIdがUUIDの有効な形式かチェック（簡易的なバリデーション）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(mentorId)) {
      return NextResponse.json(
        { error: '無効なメンターIDです。' },
        { status: 400 }
      );
    }
    
    // 指定されたメンターの予約可能枠を取得
    const lessonSlots = await prisma.lessonSlot.findMany({
      where: {
        teacherId: mentorId,
        startTime: {
          gte: fromDate,
          lte: toDate,
        },
      },
      include: {
        reservations: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });
    
    // クライアントに返すデータ形式に変換
    const formattedSlots = lessonSlots.map(slot => ({
      id: slot.id,
      mentorId: slot.teacherId,
      startTime: formatToJstIsoString(slot.startTime),
      endTime: formatToJstIsoString(slot.endTime),
      isBooked: Boolean(slot.reservations.length > 0 && slot.reservations.some(r => r.status !== 'CANCELED')),
    }));
    
    return NextResponse.json(formattedSlots);
    
  } catch (error) {
    console.error('Error fetching mentor lesson slots:', error);
    return NextResponse.json(
      { error: 'メンターの予約可能枠取得中にエラーが発生しました。' },
      { status: 500 }
    );
  }
} 