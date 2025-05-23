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
    const { searchParams } = new URL(request.url);
    console.log('my-reservations API - リクエスト受信', { 
      params: Object.fromEntries(searchParams.entries()),
      url: request.url
    });
    
    // 「全表示モード」を最初にチェック
    if (searchParams.get('all') === 'true') {
      console.log('my-reservations API - 全表示モード');
      const all = await prisma.reservation.findMany({
        include: {
          slot: { include: { teacher: true } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = all.map(r => ({
        id: r.id,
        status: r.status,
        lessonSlot: {
          id: r.slot.id,
          startTime: r.slot.startTime,
          endTime: r.slot.endTime,
          teacher: r.slot.teacher,
        },
        bookedStartTime: r.bookedStartTime,
        bookedEndTime: r.bookedEndTime,
        payment: r.payment
          ? {
              id: r.payment.id,
              amount: r.payment.amount,
              currency: r.payment.currency,
              status: r.payment.status,
            }
          : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));

      console.log(`my-reservations API - 全表示結果: ${formatted.length}件`);
      return NextResponse.json(formatted);
    }

    // 以下、通常の認証付きクエリ処理
    const sessionInfo = await getSessionFromRequest(request);
    console.log('my-reservations API - 認証情報:', sessionInfo ? `ユーザーID: ${sessionInfo.user.id}` : 'なし');
    
    if (!sessionInfo) {
      console.warn('my-reservations API - 認証エラー: 401');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const status = searchParams.get('status') as ReservationStatus | null;
    const take = Number(searchParams.get('take') ?? 20);
    const skip = Number(searchParams.get('skip') ?? 0);

    // キャッシュキーの生成
    const cacheKey = generateCacheKey(sessionInfo.user.id, status, take, skip);

    console.log('my-reservations API: user', sessionInfo.user.id);
    // 予約情報の取得
    const reservations = await prisma.reservation.findMany({
      where: {
        studentId: sessionInfo.user.id,
        ...(status && { status }),
      },
      include: {
        slot: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        payment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      skip,
    });

    console.log('my-reservations API: found', reservations.length);
    // レスポンスデータの整形
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      status: reservation.status,
      lessonSlot: {
        id: reservation.slot.id,
        startTime: reservation.slot.startTime,
        endTime: reservation.slot.endTime,
        teacher: reservation.slot.teacher,
      },
      bookedStartTime: reservation.bookedStartTime,
      bookedEndTime: reservation.bookedEndTime,
      payment: reservation.payment ? {
        id: reservation.payment.id,
        amount: reservation.payment.amount,
        currency: reservation.payment.currency,
        status: reservation.payment.status,
      } : null,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    }));

    return NextResponse.json(formattedReservations, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': cacheKey,
        'X-Cache-Key': cacheKey
      }
    });
  } catch (error) {
    console.error("予約情報取得エラー:", error);
    return NextResponse.json(
      { 
        error: '予約情報の取得中にエラーが発生しました', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 