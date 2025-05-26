import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { ReservationStatus } from '@prisma/client';

// キャッシュ設定
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// SWRのキャッシュキーを生成する関数
function generateCacheKey(userId: string, status: ReservationStatus | null, take: number, skip: number): string {
  return `reservations:${userId}:${status ?? 'all'}:${take}:${skip}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // 生徒の予約一覧を取得
    const reservations = await prisma.reservations.findMany({
      where: {
        studentId: session.user.id,
      },
      include: {
        lesson_slots: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // フロントエンド用の形式に変換
    const formattedReservations = reservations.map((reservation) => ({
      id: reservation.id,
      status: reservation.status,
      lessonSlot: {
        id: reservation.lesson_slots.id,
        startTime: reservation.lesson_slots.startTime.toISOString(),
        endTime: reservation.lesson_slots.endTime.toISOString(),
        teacher: {
          id: reservation.lesson_slots.users.id,
          name: reservation.lesson_slots.users.name,
          image: null, // 画像情報がない場合
        },
      },
      bookedStartTime: reservation.bookedStartTime.toISOString(),
      bookedEndTime: reservation.bookedEndTime.toISOString(),
      payment: reservation.payments ? {
        id: reservation.payments.id,
        amount: reservation.payments.amount,
        currency: reservation.payments.currency,
        status: reservation.payments.status,
      } : null,
      createdAt: reservation.createdAt.toISOString(),
      updatedAt: reservation.updatedAt.toISOString(),
    }));
    
    return NextResponse.json(formattedReservations);
  } catch (error) {
    console.error('予約一覧取得エラー:', error);
    return NextResponse.json(
      { error: '予約一覧の取得中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 