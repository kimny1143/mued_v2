import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { hasPermission } from '@/lib/role-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // メンター権限チェック
    const isMentor = hasPermission(session.role || '', 'mentor');
    const isAdmin = hasPermission(session.role || '', 'admin');
    
    if (!isMentor && !isAdmin) {
      return NextResponse.json(
        { error: 'メンターのみがレッスンを開始できます' },
        { status: 403 }
      );
    }

    const sessionId = params.id;

    // セッションの存在確認と権限チェック
    const lessonSession = await prisma.lesson_sessions.findUnique({
      where: { id: sessionId },
      include: {
        reservation: {
          include: {
            lesson_slots: true
          }
        }
      }
    });

    if (!lessonSession) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // メンターが自分のレッスンのみ開始できることを確認
    if (lessonSession.reservation.lesson_slots.teacher_id !== session.user.id) {
      return NextResponse.json(
        { error: 'このレッスンを開始する権限がありません' },
        { status: 403 }
      );
    }

    // ステータスチェック
    if (lessonSession.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: `このレッスンは開始できません。現在の状態: ${lessonSession.status}` },
        { status: 400 }
      );
    }

    // 予約が確定済みかチェック
    if (lessonSession.reservation.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'レッスン開始には予約の確定（支払い完了）が必要です' },
        { status: 400 }
      );
    }

    // レッスン開始時刻のチェック（前後30分の許容範囲）
    const now = new Date();
    const scheduledStart = new Date(lessonSession.scheduled_start);
    const diffMinutes = Math.abs(now.getTime() - scheduledStart.getTime()) / (1000 * 60);
    
    if (diffMinutes > 30) {
      return NextResponse.json(
        { 
          error: 'レッスン開始は予定時刻の前後30分以内に行ってください',
          details: {
            current_time: now.toISOString(),
            scheduled_time: scheduledStart.toISOString(),
            diff_minutes: Math.round(diffMinutes)
          }
        },
        { status: 400 }
      );
    }

    // レッスンを開始
    const updatedSession = await prisma.lesson_sessions.update({
      where: { id: sessionId },
      data: {
        status: 'IN_PROGRESS',
        actual_start: now
      }
    });

    console.log('🎯 レッスン開始:', {
      sessionId: updatedSession.id,
      mentorId: session.user.id,
      actualStart: updatedSession.actual_start,
      scheduledStart: updatedSession.scheduled_start
    });

    return NextResponse.json({
      success: true,
      message: 'レッスンを開始しました',
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        scheduled_start: updatedSession.scheduled_start,
        actual_start: updatedSession.actual_start
      }
    });

  } catch (error) {
    console.error('レッスン開始エラー:', error);
    return NextResponse.json(
      { error: 'レッスンの開始中にエラーが発生しました' },
      { status: 500 }
    );
  }
}