import { ReservationStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { createCorsResponse, handleOptions } from '@/lib/cors';

// キャッシュ設定
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// SWRのキャッシュキーを生成する関数
function generateCacheKey(userId: string, status: ReservationStatus | null, take: number, skip: number): string {
  return `reservations:${userId}:${status ?? 'all'}:${take}:${skip}`;
}

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request.headers.get('origin'));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return createCorsResponse({ error: '認証が必要です' }, origin, 401);
    }
    
    // 生徒の予約一覧を取得
    const reservations = await prisma.reservations.findMany({
      where: {
        student_id: session.user.id,
      },
      include: {
        lesson_slots: {
          select: {
            id: true,
            start_time: true,
            end_time: true,
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
        created_at: 'desc',
      },
    });
    
    // フロントエンド用の形式に変換
    const formattedReservations = reservations.map((reservation) => ({
      id: reservation.id,
      status: reservation.status,
      lessonSlot: {
        id: reservation.lesson_slots.id,
        start_time: reservation.lesson_slots.start_time.toISOString(),
        end_time: reservation.lesson_slots.end_time.toISOString(),
        teacher: {
          id: reservation.lesson_slots.users.id,
          name: reservation.lesson_slots.users.name,
          image: null, // 画像情報がない場合
        },
      },
      bookedStartTime: reservation.booked_start_time.toISOString(),
      bookedEndTime: reservation.booked_end_time.toISOString(),
      payment: reservation.payments ? {
        id: reservation.payments.id,
        amount: reservation.payments.amount,
        currency: reservation.payments.currency,
        status: reservation.payments.status,
      } : null,
      createdAt: reservation.created_at.toISOString(),
      updatedAt: reservation.updated_at.toISOString(),
    }));
    
    return createCorsResponse(formattedReservations, origin);
  } catch (error) {
    console.error('予約一覧取得エラー:', error);
    return createCorsResponse(
      { error: '予約一覧の取得中にエラーが発生しました', details: String(error) },
      origin,
      500
    );
  }
} 