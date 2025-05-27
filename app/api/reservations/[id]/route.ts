import { prisma } from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma, ReservationStatus } from '@prisma/client';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

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
    
    const reservation = await prisma.reservations.findUnique({
      where: { id },
      include: {
        lesson_slots: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        users: {
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
    const isStudent = sessionInfo.user.id === reservation.student_id;
    const isTeacher = sessionInfo.user.id === reservation.lesson_slots.teacher_id;
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
    const existingReservation = await prisma.reservations.findUnique({
      where: { id },
      include: {
        lesson_slots: true,
      },
    });
    
    if (!existingReservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 権限チェック
    const isTeacher = sessionInfo.user.id === existingReservation.lesson_slots.teacher_id;
    const isAdmin = sessionInfo.role === 'admin';
    
    if (!isTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'この予約を更新する権限がありません' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 更新可能なフィールドを検証
    const updateData: Prisma.reservationsUpdateInput = {};
    
    // レッスン完了への状態更新のみ許可
    if (data.status === 'COMPLETED' && 
        existingReservation.status === 'CONFIRMED') {
      updateData.status = 'COMPLETED';
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
    const updatedReservation = await prisma.reservations.update({
      where: { id },
      data: updateData,
      include: {
        lesson_slots: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        users: {
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
    const existingReservation = await prisma.reservations.findUnique({
      where: { id },
      include: {
        lesson_slots: true,
      },
    });
    
    if (!existingReservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 権限チェック
    const isStudent = sessionInfo.user.id === existingReservation.student_id;
    const isAdmin = sessionInfo.role === 'admin';
    
    if (!isStudent && !isAdmin) {
      return NextResponse.json(
        { error: 'この予約をキャンセルする権限がありません' },
        { status: 403 }
      );
    }
    
    // 過去の予約はキャンセル不可（レッスン開始時間より後）
    const now = new Date();
    if (new Date(existingReservation.lesson_slots.start_time) < now) {
      return NextResponse.json(
        { error: '過去のレッスンはキャンセルできません' },
        { status: 400 }
      );
    }
    
    // レッスン完了済みはキャンセル不可
    if (existingReservation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: '完了済みのレッスンはキャンセルできません' },
        { status: 400 }
      );
    }
    
    // Stripeでの返金処理（必要な場合）
    if (existingReservation.payment_id) {
      try {
        // 支払いIDがpayment_intentの場合
        if (existingReservation.payment_id.startsWith('pi_')) {
          await stripe.refunds.create({
            payment_intent: existingReservation.payment_id,
          });
        } 
        // 支払いIDがチェックアウトセッションの場合
        else if (existingReservation.payment_id.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(existingReservation.payment_id);
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
    const [_deletedReservation, _updatedSlot] = await prisma.$transaction([
      // 1. 予約レコードを削除
      prisma.reservations.delete({
        where: { id },
      }),
      
      // 2. スロットを利用可能に更新
      prisma.lesson_slots.update({
        where: { id: existingReservation.slot_id },
        data: { is_available: true }
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