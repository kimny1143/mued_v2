import { prisma } from '../../../../lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { Prisma } from '@prisma/client';

// 予約ステータスの列挙型
enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

// 支払いステータスの列挙型
enum PaymentStatus {
  UNPAID = 'UNPAID',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
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

// 予約を更新
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
    const isStudent = sessionInfo.user.id === existingReservation.studentId;
    const isTeacher = sessionInfo.user.id === existingReservation.slot.teacherId;
    const isAdmin = sessionInfo.role === 'admin';
    
    if (!isStudent && !isTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'この予約を更新する権限がありません' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 更新可能なフィールドを検証
    const updateData: Prisma.ReservationUpdateInput = {};
    
    // 予約のステータス更新 (PENDING, CONFIRMED, CANCELLED, COMPLETED)
    if (data.status) {
      // 予約ステータスの更新制限
      // - 生徒はPENDINGをCANCELLEDに変更可能
      // - 講師はPENDINGをCONFIRMEDに、CONFIRMEDをCOMPLETEDに変更可能
      // - 管理者はすべての変更が可能
      
      if (isAdmin) {
        // 管理者は全ての状態変更が可能
        updateData.status = data.status as ReservationStatus;
      } else if (isTeacher) {
        // 講師の場合
        if (
          (existingReservation.status === ReservationStatus.PENDING && data.status === ReservationStatus.CONFIRMED) ||
          (existingReservation.status === ReservationStatus.CONFIRMED && data.status === ReservationStatus.COMPLETED) ||
          (existingReservation.status === ReservationStatus.PENDING && data.status === ReservationStatus.CANCELLED)
        ) {
          updateData.status = data.status as ReservationStatus;
        } else {
          return NextResponse.json(
            { error: 'このステータス変更は許可されていません' },
            { status: 403 }
          );
        }
      } else if (isStudent) {
        // 生徒の場合
        if (existingReservation.status === ReservationStatus.PENDING && data.status === ReservationStatus.CANCELLED) {
          updateData.status = data.status as ReservationStatus;
        } else {
          return NextResponse.json(
            { error: 'このステータス変更は許可されていません' },
            { status: 403 }
          );
        }
      }
    }
    
    // 支払いステータスの更新 (管理者のみ)
    if (data.paymentStatus && isAdmin) {
      updateData.paymentStatus = data.paymentStatus as PaymentStatus;
    }
    
    // 支払いIDの更新 (管理者のみ)
    if (data.paymentId && isAdmin) {
      updateData.paymentId = data.paymentId;
    }
    
    // 備考の更新 (生徒、講師、管理者が可能)
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

// 予約を削除 (管理者のみ)
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
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });
    
    if (!reservation) {
      return NextResponse.json(
        { error: '指定された予約が見つかりませんでした' },
        { status: 404 }
      );
    }
    
    // 権限チェック (管理者のみ)
    if (sessionInfo.role !== 'admin') {
      return NextResponse.json(
        { error: '予約を削除する権限がありません (管理者のみ可能)' },
        { status: 403 }
      );
    }
    
    // 予約を削除
    await prisma.reservation.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: '予約の削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 