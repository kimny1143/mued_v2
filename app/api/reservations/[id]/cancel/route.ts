import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { CancelReservationRequest } from '@/lib/types/reservation';
import { CancellationPolicy, checkCancellationPolicy } from '@/lib/cancellation-policy';
import { sendEmail } from '@/lib/resend';
import { hasPermission, normalizeRoleName } from '@/lib/role-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservationId = params.id;
    const body: CancelReservationRequest = await request.json();
    const { reason, notes } = body;

    // 1. 認証・権限チェック
    const sessionInfo = await getSessionFromRequest(request);
    if (!sessionInfo) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 2. 予約存在確認
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        payments: true,
        users: {
          select: { id: true, name: true, email: true }
        },
        lesson_slots: {
          include: {
            users: {
              select: { id: true, name: true, email: true }
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

    // 権限チェック（生徒は自分の予約のみ、講師・管理者は関連する予約のみ）
    const normalizedRole = normalizeRoleName(sessionInfo.role);
    const isStudent = sessionInfo.user.id === reservation.student_id;
    const isTeacher = sessionInfo.user.id === reservation.lesson_slots.teacher_id;
    const hasAdminPermission = hasPermission(sessionInfo.role || '', 'admin');
    
    console.log('🔍 キャンセル権限チェック (role-utils):', {
      originalRole: sessionInfo.role,
      normalizedRole,
      isStudent,
      isTeacher,
      hasAdminPermission,
      canCancel: isStudent || isTeacher || hasAdminPermission
    });

    if (!isStudent && !isTeacher && !hasAdminPermission) {
      return NextResponse.json(
        { error: 'この予約をキャンセルする権限がありません' },
        { status: 403 }
      );
    }

    // 基本的なステータスチェック
    if (reservation.status === 'CANCELED') {
      return NextResponse.json(
        { error: 'この予約は既にキャンセル済みです' },
        { status: 400 }
      );
    }

    if (reservation.status === 'COMPLETED') {
      return NextResponse.json(
        { error: '完了済みの予約はキャンセルできません' },
        { status: 400 }
      );
    }

    // ユーザーロールの決定
    let roleForPolicy: 'student' | 'mentor' | 'admin';
    if (hasAdminPermission) {
      roleForPolicy = 'admin';
    } else if (isTeacher) {
      roleForPolicy = 'mentor';
    } else {
      roleForPolicy = 'student';
    }

    // キャンセル理由の妥当性チェック
    if (!CancellationPolicy.isValidCancelReason(reason, roleForPolicy)) {
      return NextResponse.json(
        { error: '無効なキャンセル理由です' },
        { status: 400 }
      );
    }

    // 3. キャンセル可能時間チェック
    const policyResult = checkCancellationPolicy(
      roleForPolicy,
      reservation.booked_start_time,
      reservation.total_amount,
      reason
    );

    if (!policyResult.canCancel) {
      return NextResponse.json(
        { 
          error: policyResult.reason || 'キャンセル期限を過ぎています',
          cancellationFee: policyResult.cancellationFee,
          timeUntilDeadline: policyResult.timeUntilDeadline
        },
        { status: 400 }
      );
    }

    // 4. 決済状態確認（簡易版 - Stripe返金は管理者が手動で行う）
    let refundInfo = null;
    if (reservation.payments && reservation.payments.status === 'SUCCEEDED') {
      if (policyResult.cancellationFee === 0) {
        refundInfo = {
          shouldRefund: true,
          refundAmount: reservation.total_amount,
          message: '全額返金対象です。管理者が返金処理を行います。'
        };
      } else {
        const refundAmount = reservation.total_amount - policyResult.cancellationFee;
        refundInfo = {
          shouldRefund: refundAmount > 0,
          refundAmount: refundAmount,
          cancellationFee: policyResult.cancellationFee,
          message: `キャンセル料${policyResult.cancellationFee}円を差し引いた${refundAmount}円が返金対象です。`
        };
      }
    }

    // 5. DB更新（トランザクション）- 型安全な方法で実装
    const result = await prisma.$transaction(async (tx) => {
      // 予約をキャンセル状態に更新（型安全な方法）
      const updatedReservation = await tx.reservations.update({
        where: { id: reservationId },
        data: {
          status: 'CANCELED',
          // 型エラーを回避するため、rawクエリで更新
          notes: notes ? `${reservation.notes || ''}\n[キャンセル理由] ${notes}` : reservation.notes,
          updated_at: new Date()
        }
      });

      // キャンセル関連フィールドをrawクエリで更新（文字列として保存）
      await tx.$executeRaw`
        UPDATE reservations 
        SET 
          canceledat = NOW(),
          canceledby = ${sessionInfo.user.id},
          cancelreason = ${reason}
        WHERE id = ${reservationId}
      `;

      // レッスンスロットを利用可能に戻す
      await tx.lesson_slots.update({
        where: { id: reservation.slot_id },
        data: { 
          is_available: true,
          updated_at: new Date()
        }
      });

      return updatedReservation;
    });

    // 6. メール通知送信
    try {
      // 生徒への通知
      await sendEmail({
        to: reservation.users.email!,
        subject: 'レッスンキャンセルのお知らせ - MUED LMS',
        html: `
          <h2>レッスンキャンセルのお知らせ</h2>
          <p>${reservation.users.name}様、</p>
          <p>以下のレッスンがキャンセルされました。</p>
          <ul>
            <li>講師: ${reservation.lesson_slots.users.name}</li>
            <li>日時: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
            <li>キャンセル理由: ${reason}</li>
            ${notes ? `<li>備考: ${notes}</li>` : ''}
            ${refundInfo ? `<li>返金について: ${refundInfo.message}</li>` : ''}
          </ul>
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        `
      });

      // 講師への通知（生徒がキャンセルした場合）
      if (roleForPolicy === 'student') {
        await sendEmail({
          to: reservation.lesson_slots.users.email!,
          subject: 'レッスンキャンセルのお知らせ - MUED LMS',
          html: `
            <h2>レッスンキャンセルのお知らせ</h2>
            <p>${reservation.lesson_slots.users.name}様、</p>
            <p>以下のレッスンが生徒によりキャンセルされました。</p>
            <ul>
              <li>生徒: ${reservation.users.name}</li>
              <li>日時: ${reservation.booked_start_time.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</li>
              <li>キャンセル理由: ${reason}</li>
              ${notes ? `<li>備考: ${notes}</li>` : ''}
            </ul>
            <p>スケジュールが空きましたので、新しい予約を受け付けることができます。</p>
          `
        });
      }

    } catch (emailError) {
      console.error('メール送信エラー:', emailError);
      // メール送信エラーは処理を止めない
    }

    console.log('✅ キャンセル処理完了:', {
      reservationId,
      canceledBy: sessionInfo.user.id,
      reason,
      refundAmount: refundInfo?.refundAmount || 0,
      cancellationFee: policyResult.cancellationFee
    });

    return NextResponse.json({
      success: true,
      message: 'レッスンをキャンセルしました',
      reservation: result,
      refund: refundInfo,
      cancellationFee: policyResult.cancellationFee
    });

  } catch (error) {
    console.error('キャンセル処理エラー:', error);
    return NextResponse.json(
      { error: 'キャンセル処理中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 