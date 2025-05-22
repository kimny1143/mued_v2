// 動的ルートフラグ
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma, LessonSlot, User, Reservation } from '@prisma/client';
import { parseISO, isValid, isBefore } from 'date-fns';

// レッスンスロットと関連データの型定義
interface SlotWithRelations extends LessonSlot {
  teacher: Pick<User, 'id' | 'name' | 'email' | 'image'>;
  reservations: Array<Pick<Reservation, 'id' | 'status' | 'bookedStartTime' | 'bookedEndTime'>>;
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
 * メンター別にグループ化されたレッスンスロット一覧を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータから日付範囲を取得
    const { searchParams } = new URL(request.url);
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
    
    console.log(`レッスンスロット取得: ${fromParam} から ${toParam}`);
    
    // メンター一覧を取得
    const mentors = await executePrismaQuery(() => 
      prisma.user.findMany({
        where: {
          roleId: 'mentor'
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      })
    );
    
    console.log(`メンター数: ${mentors.length}`);
    
    // メンター別のレッスンスロットを取得
    const lessonSlots = await executePrismaQuery(() => 
      prisma.lessonSlot.findMany({
        where: {
          startTime: {
            gte: fromDate
          },
          endTime: {
            lte: toDate
          },
          isAvailable: true
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          reservations: {
            where: {
              status: { in: ['PENDING', 'CONFIRMED'] }
            },
            select: {
              id: true,
              status: true,
              bookedStartTime: true,
              bookedEndTime: true
            }
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      })
    );
    
    console.log(`レッスンスロット総数: ${lessonSlots.length}`);
    
    // メンターIDごとにレッスンスロットをグループ化
    const slotsByMentor = mentors.reduce((acc, mentor) => {
      // メンターのスロットをフィルタリング
      const mentorSlots = lessonSlots.filter(slot => slot.teacherId === mentor.id);
      
      if (mentorSlots.length > 0) {
        // 予約可能なスロットがあるメンターのみ
        acc[mentor.id] = mentorSlots;
      }
      
      return acc;
    }, {} as Record<string, SlotWithRelations[]>);
    
    console.log(`利用可能なスロットがあるメンター数: ${Object.keys(slotsByMentor).length}`);
    
    return NextResponse.json(slotsByMentor, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('メンター別レッスンスロット取得エラー:', error);
    return NextResponse.json(
      { error: 'レッスンスロット情報の取得中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 