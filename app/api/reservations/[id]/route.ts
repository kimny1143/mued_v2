import { prisma } from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma } from '@prisma/client';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// 予約ステータスの列挙型
enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

// 特定の予約を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        slot: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });
    
    if (!reservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 権限チェック：生徒本人、担当講師、管理者のみアクセス可能
    const isStudent = sessionInfo.user.id === reservation.studentId;
    const isTeacher = sessionInfo.user.id === reservation.slot.teacherId;
    const isAdmin = sessionInfo.role === 'admin';
    
    if (!isStudent && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'この予約の詳細を閲覧する権限がありません' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: '予約の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 予約を更新（レッスン完了のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // 予約が存在するか確認
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        slot: true,
      },
    });
    
    if (!existingReservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 権限チェック
    const isTeacher = sessionInfo.user.id === existingReservation.slot.teacherId;
    const isAdmin = sessionInfo.role === 'admin';
    
    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'この予約を更新する権限がありません' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 更新可能なフィールドを検証
    const updateData: Prisma.ReservationUpdateInput = {};
    
    // レッスン完了への状態更新のみ許可
    if (data.status === ReservationStatus.COMPLETED && 
        existingReservation.status === ReservationStatus.CONFIRMED) {
      updateData.status = ReservationStatus.COMPLETED;
    } else {
      return NextResponse.json(
        { error: '確定済みの予約をCOMPLETEDに変更する操作のみ許可されています' },
        { status: 400 }
      );
    }
    
    // 備考の更新 (講師、管理者が可能)
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    
    // 更新データがない場合
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '更新するデータがありません' },
        { status: 400 }
      );
    }
    
    // 予約を更新
    const updatedReservation = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        slot: {
          include: {
            teacher: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: '予約の更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 予約をキャンセル（削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const sessionInfo = await getSessionFromRequest(request);
    
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // 予約が存在するか確認
    const existingReservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        slot: true,
      },
    });
    
    if (!existingReservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 権限チェック
    const isStudent = sessionInfo.user.id === existingReservation.studentId;
    const isAdmin = sessionInfo.role === 'admin';
    
    if (!isStudent && !isAdmin) {
      return NextResponse.json(
        { error: 'この予約をキャンセルする権限がありません' },
        { status: 403 }
      );
    }
    
    // 過去の予約はキャンセル不可（レッスン開始時間より後）
    const now = new Date();
    if (new Date(existingReservation.slot.startTime) < now) {
      return NextResponse.json(
        { error: '過去のレッスンはキャンセルできません' },
        { status: 400 }
      );
    }
    
    // レッスン完了済みはキャンセル不可
    if (existingReservation.status === ReservationStatus.COMPLETED) {
      return NextResponse.json(
        { error: '完了済みのレッスンはキャンセルできません' },
        { status: 400 }
      );
    }
    
    // Stripeでの返金処理（必要な場合）
    if (existingReservation.paymentId) {
      try {
        // 支払いIDがpayment_intentの場合
        if (existingReservation.paymentId.startsWith('pi_')) {
          await stripe.refunds.create({
            payment_intent: existingReservation.paymentId,
          });
        } 
        // 支払いIDがチェックアウトセッションの場合
        else if (existingReservation.paymentId.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(existingReservation.paymentId);
          if (session.payment_intent) {
            await stripe.refunds.create({
              payment_intent: session.payment_intent as string,
            });
          }
        }
        console.log(`予約ID ${id} の返金処理が完了しました`);
      } catch (refundError) {
        console.error('返金処理中にエラーが発生しました:', refundError);
        // 返金処理に失敗しても、予約のキャンセル自体は続行
      }
    }
    
    // トランザクションで予約の削除とスロットの解放を実行
    const [deletedReservation, updatedSlot] = await prisma.$transaction([
      // 1. 予約レコードを削除
      prisma.reservation.delete({
        where: { id },
      }),
      
      // 2. スロットを利用可能に更新
              prisma.lesson_slots.update({
        where: { id: existingReservation.slotId },
        data: { isAvailable: true }
      })
    ]);
    
    return NextResponse.json({ 
      message: '予約をキャンセルしました',
      success: true
    });
  } catch (error) {
    console.error('Error canceling reservation:', error);
    return NextResponse.json(
      { error: '予約のキャンセル中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 