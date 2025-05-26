import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RescheduleReservationRequest } from '@/lib/types/reservation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;
    const body: RescheduleReservationRequest = await request.json();

    // TODO: Phase 4で詳細実装
    // 1. 権限チェック（講師・管理者のみ）
    // 2. 新しい時間枠の空き確認
    // 3. トランザクション処理:
    //    - 元予約をCANCELED状態に
    //    - 新予約作成（決済情報引き継ぎ）
    //    - rescheduledFrom/To関連付け
    // 4. メール通知送信

    // 基本的な予約存在確認のみ実装
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        payments: true,
        users: true,
        lesson_slots: {
          include: {
            users: true
          }
        }
      }
    });

    if (!reservation) {
      return NextResponse.json(
        { error: '予約が見つかりません' },
        { status: 404 }
      );
    }

    // 基本的なステータスチェック
    if (reservation.status === 'CANCELED' || reservation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'この予約はリスケジュールできません' },
        { status: 400 }
      );
    }

    // 新しいスロットの存在確認
    const newSlot = await prisma.lesson_slots.findUnique({
      where: { id: body.newSlotId }
    });

    if (!newSlot) {
      return NextResponse.json(
        { error: '指定されたレッスンスロットが見つかりません' },
        { status: 404 }
      );
    }

    // 暫定的なレスポンス（Phase 4で完全実装）
    return NextResponse.json({
      message: 'リスケジュール処理を受け付けました（Phase 4で完全実装予定）',
      reservationId,
      currentStatus: reservation.status,
      newSlotId: body.newSlotId,
      newStartTime: body.newStartTime,
      newEndTime: body.newEndTime
    });

  } catch (error) {
    console.error('リスケジュール処理エラー:', error);
    return NextResponse.json(
      { error: 'リスケジュール処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 