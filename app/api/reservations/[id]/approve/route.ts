import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    
    // メンターロールのチェック
    if (session.role !== 'mentor') {
      return NextResponse.json(
        { error: 'メンターのみが予約を承認できます' },
        { status: 403 }
      );
    }
    
    const reservationId = params.id;
    
    // 予約の存在確認と権限チェック
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        lesson_slots: {
          select: {
            teacherId: true,
            users: {
              select: { name: true, email: true }
            }
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
    
    // メンターが自分のレッスン枠の予約のみ承認できることを確認
    if (reservation.lesson_slots.teacherId !== session.user.id) {
      return NextResponse.json(
        { error: 'この予約を承認する権限がありません' },
        { status: 403 }
      );
    }
    
    // 承認可能な状態かチェック
    if (reservation.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `この予約は承認できません。現在の状態: ${reservation.status}` },
        { status: 400 }
      );
    }
    
    // 予約を承認状態に更新
    const updatedReservation = await prisma.reservations.update({
      where: { id: reservationId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: session.user.id
      }
    });
    
    // 型アサーションで一時的に回避（Prismaクライアントの型が更新されるまで）
    const reservationWithApprovedAt = updatedReservation as typeof updatedReservation & { approvedAt: Date };
    
    console.log('✅ 予約承認完了:', {
      reservationId: updatedReservation.id,
      mentorId: session.user.id,
      mentorName: (session.user as { name?: string }).name || 'Unknown',
      approvedAt: reservationWithApprovedAt.approvedAt
    });
    
    return NextResponse.json({
      success: true,
      message: '予約を承認しました。生徒に決済手続きの案内が送信されます。',
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error('予約承認エラー:', error);
    return NextResponse.json(
      { error: '予約の承認中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 