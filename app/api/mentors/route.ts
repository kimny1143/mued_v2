// 動的ルートフラグ
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma, User, LessonSlot, ReservationStatus } from '@prisma/client';

// レッスンスロットと予約の型を定義
interface SlotWithReservations extends LessonSlot {
  reservations: {
    id: string;
    bookedStartTime: Date;
    bookedEndTime: Date;
    status: ReservationStatus;
  }[];
}

// メンター評価のインターフェース
interface MentorRating {
  avgRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number;
  };
}

// メンター価格設定のインターフェース
interface MentorPricing {
  basePrice: number;
  currency: string;
  duration: string;
}

// 拡張メンター情報のインターフェース
interface EnhancedMentor extends Partial<User> {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  bio?: string;
  specialties?: string[];
  rating?: MentorRating;
  pricing?: MentorPricing;
  availableSlots?: SlotWithReservations[];
  availableSlotsCount?: number;
}

// メンターの評価データを生成するヘルパー関数（フェイクデータ - 将来的にはDBから取得）
function generateMentorRating(mentorId: string): MentorRating {
  // 一貫性のあるランダムな評価を生成（メンターIDをシードとして使用）
  const numericId = mentorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseRating = (numericId % 20 + 40) / 10; // 4.0～6.0の範囲で生成
  return {
    avgRating: parseFloat(baseRating.toFixed(1)),
    totalReviews: Math.floor(numericId % 50 + 5), // 5～54の範囲
    ratingDistribution: {
      5: Math.floor(numericId % 15 + 10),
      4: Math.floor(numericId % 10 + 5),
      3: Math.floor(numericId % 5 + 1),
      2: Math.floor(numericId % 3),
      1: Math.floor(numericId % 2)
    }
  };
}

// メンターの専門分野情報を生成するヘルパー関数（フェイクデータ - 将来的にはDBから取得）
function generateMentorSpecialties(mentorId: string): string[] {
  const specialties = [
    'ピアノ', 'ギター', 'ドラム', 'ベース', '作曲', '編曲',
    'ボーカル', '音楽理論', 'DTM', '楽器メンテナンス', 'レコーディング',
    'ジャズ', 'クラシック', 'ロック', 'ポップ', 'ヒップホップ', 'EDM'
  ];
  
  // メンターIDを基にしたシード値を生成
  const seed = mentorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // シード値を基に2-4個の専門分野をランダムに選択
  const count = (seed % 3) + 2; 
  const result = [];
  
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 11) % specialties.length;
    result.push(specialties[index]);
  }
  
  return result;
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

// メンター一覧を取得
export async function GET(request: NextRequest) {
  try {
    // URLパラメータを取得
    const { searchParams } = new URL(request.url);
    const withAvailability = searchParams.get('withAvailability') === 'true';
    const withDetails = searchParams.get('withDetails') === 'true'; // 詳細情報フラグ（新規）
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const skills = searchParams.get('skills')?.split(',') || [];
    const subjects = searchParams.get('subjects')?.split(',') || [];
    const sortBy = searchParams.get('sortBy') || 'name'; // name, rating, availability
    
    console.log('メンター取得API呼び出し:', {
      withAvailability,
      withDetails,
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
    
    // メンターの基本情報取得（詳細情報フラグに応じて取得データを変更）
    const selectFields = {
      id: true,
      name: true,
      image: true,
      email: true,
      // 詳細表示の場合に追加のフィールドを含める
      ...(withDetails && {
        // 将来的にUserモデルにこれらのフィールドが追加された場合に対応
        // 現時点ではbioやemailVerifiedなどの基本情報のみ追加
        emailVerified: true,
      })
    };
    
    const mentors = await executePrismaQuery(() => prisma.user.findMany({
      where: mentorQuery,
      select: selectFields,
      orderBy: sortBy === 'name' ? { name: 'asc' } : undefined
    }));
    
    // 拡張メンターデータを構築（詳細情報やフェイク評価データを追加）
    const enhancedMentors: EnhancedMentor[] = mentors.map(mentor => {
      // 基本データ
      const enhancedMentor: EnhancedMentor = {...mentor};
      
      // 詳細情報が要求された場合
      if (withDetails) {
        // 現在はフェイクデータを提供。将来的にはDBから取得予定
        enhancedMentor.bio = `${mentor.name}は情熱的な音楽教師で、生徒一人ひとりの個性を尊重した指導を行います。`;
        enhancedMentor.specialties = generateMentorSpecialties(mentor.id);
        enhancedMentor.rating = generateMentorRating(mentor.id);
        
        // デフォルト料金データ（将来的にはメンターごとの設定から取得）
        enhancedMentor.pricing = {
          basePrice: 5000,
          currency: 'JPY',
          duration: '60-90分'
        };
      }
      
      return enhancedMentor;
    });
    
    // 利用可能時間も一緒に取得する場合
    if (withAvailability && fromDate && toDate) {
      const mentorsWithAvailability: EnhancedMentor[] = await Promise.all(
        enhancedMentors.map(async (mentor) => {
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
        mentorsWithAvailability.sort((a, b) => (b.availableSlotsCount || 0) - (a.availableSlotsCount || 0));
      }
      
      // 評価でソート（オプション）
      if (sortBy === 'rating' && withDetails) {
        mentorsWithAvailability.sort((a, b) => {
          const ratingA = a.rating?.avgRating || 0;
          const ratingB = b.rating?.avgRating || 0;
          return ratingB - ratingA;
        });
      }
      
      return NextResponse.json(mentorsWithAvailability, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // 評価でソート（利用可能時間なしの場合）
    if (sortBy === 'rating' && withDetails) {
      enhancedMentors.sort((a, b) => {
        const ratingA = a.rating?.avgRating || 0;
        const ratingB = b.rating?.avgRating || 0;
        return ratingB - ratingA;
      });
    }
    
    return NextResponse.json(enhancedMentors, {
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