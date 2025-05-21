// 動的ルートフラグ
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma } from '@prisma/client';

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

// メンター一覧を取得
export async function GET(request: NextRequest) {
  try {
    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const withAvailability = searchParams.get('withAvailability') === 'true';
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const skills = searchParams.get('skills')?.split(',') || [];
    const subjects = searchParams.get('subjects')?.split(',') || [];
    const sortBy = searchParams.get('sortBy') || 'name'; // name, rating, availability
    
    console.log('メンター取得API呼び出し:', {
      withAvailability,
      fromDate,
      toDate,
      skills,
      subjects,
      sortBy
    });
    
    // メンター（role=mentor）のユーザーを取得
    const mentorQuery: Prisma.UserWhereInput = {
      roleId: 'mentor' // roleIdでフィルタリング
    };
    
    // スキルフィルター（将来的なユーザーメタデータテーブルを想定）
    // TODO: 実際のスキルテーブル実装時に修正
    if (skills.length > 0) {
      console.log(`スキルフィルター: ${skills.join(', ')} - 現在は仮実装`);
    }
    
    // 科目フィルター（将来的なユーザーメタデータテーブルを想定）
    // TODO: 実際の科目テーブル実装時に修正
    if (subjects.length > 0) {
      console.log(`科目フィルター: ${subjects.join(', ')} - 現在は仮実装`);
    }
    
    // メンターの基本情報取得
    const mentors = await executePrismaQuery(() => prisma.user.findMany({
      where: mentorQuery,
      select: {
        id: true,
        name: true,
        image: true,
        email: true
      },
      orderBy: sortBy === 'name' ? { name: 'asc' } : undefined
    }));
    
    // 利用可能時間も一緒に取得する場合
    if (withAvailability && fromDate && toDate) {
      const mentorsWithAvailability = await Promise.all(
        mentors.map(async (mentor) => {
          // メンターの利用可能時間スロットを取得
          const availableSlots = await executePrismaQuery(() => prisma.lessonSlot.findMany({
            where: {
              teacherId: mentor.id,
              isAvailable: true,
              startTime: {
                gte: new Date(fromDate)
              },
              endTime: {
                lte: new Date(toDate)
              }
            },
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
          
          return {
            ...mentor,
            availableSlots,
            // 空き枠数（ソート用）
            availableSlotsCount: availableSlots.length
          };
        })
      );
      
      // 空き枠数でソート（オプション）
      if (sortBy === 'availability') {
        mentorsWithAvailability.sort((a, b) => b.availableSlotsCount - a.availableSlotsCount);
      }
      
      return NextResponse.json(mentorsWithAvailability, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    return NextResponse.json(mentors, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('メンター取得エラー:', error);
    return NextResponse.json(
      { error: 'メンター情報の取得中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 