import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { hasPermission, normalizeRoleName } from '@/lib/role-utils';
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
    
    // メンターロールのチェック（role-utilsを使用した統一的な判定）
    console.log('🔍 拒否API - ロール判定詳細:', {
      sessionRole: session.role,
      roleType: typeof session.role,
      userId: session.user.id,
      userEmail: session.user.email
    });
    
    const normalizedRole = normalizeRoleName(session.role);
    const canRejectMentor = hasPermission(session.role || '', 'mentor');
    const canRejectAdmin = hasPermission(session.role || '', 'admin');
    
    console.log('🔍 拒否API - 権限チェック結果 (role-utils):', {
      originalRole: session.role,
      normalizedRole,
      canRejectMentor,
      canRejectAdmin,
      canReject: canRejectMentor || canRejectAdmin
    });
    
    if (!canRejectMentor && !canRejectAdmin) {
      return NextResponse.json(
        { 
          error: 'メンターのみが予約を拒否できます',
          debug: {
            providedRole: session.role,
            normalizedRole,
            canRejectMentor,
            canRejectAdmin
          }
        },
        { status: 403 }
      );
    }
    
    const reservationId = params.id;
    const { reason } = await request.json();
    
    // 予約の存在確認と権限チェック
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      include: {
        lesson_slots: {
          select: {
            teacher_id: true,
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
    
    // メンターが自分のレッスン枠の予約のみ拒否できることを確認
    if (reservation.lesson_slots.teacher_id !== session.user.id) {
      return NextResponse.json(
        { error: 'この予約を拒否する権限がありません' },
        { status: 403 }
      );
    }
    
    // 拒否可能な状態かチェック
    if (reservation.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `この予約は拒否できません。現在の状態: ${reservation.status}` },
        { status: 400 }
      );
    }
    
    // 予約を拒否状態に更新
    const updatedReservation = await prisma.reservations.update({
      where: { id: reservationId },
      data: {
        status: 'REJECTED',
        rejected_at: new Date(),
        rejection_reason: reason || '理由が指定されていません'
      }
    });
    
    // 型アサーションで一時的に回避（Prismaクライアントの型が更新されるまで）
    const reservationWithRejectedAt = updatedReservation as typeof updatedReservation & { rejectedAt: Date };
    
    console.log('❌ 予約拒否完了:', {
      reservationId: updatedReservation.id,
      mentorId: session.user.id,
      mentorName: (session.user as { name?: string }).name || 'Unknown',
      rejectionReason: reason,
      rejectedAt: reservationWithRejectedAt.rejectedAt
    });
    
    return NextResponse.json({
      success: true,
      message: '予約を拒否しました。生徒に通知が送信されます。',
      reservation: updatedReservation
    });
    
  } catch (error) {
    console.error('予約拒否エラー:', error);
    return NextResponse.json(
      { error: '予約の拒否中にエラーが発生しました', details: String(error) },
      { status: 500 }
    );
  }
} 