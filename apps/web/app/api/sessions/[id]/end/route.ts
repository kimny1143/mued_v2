import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { hasPermission } from '@/lib/role-utils';

interface EndSessionBody {
  lesson_notes?: string;
  homework?: string;
  materials_used?: {
    type: 'note_article' | 'youtube' | 'custom';
    id?: string;
    url?: string;
    title?: string;
  }[];
}

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
        { error: 'メンターのみがレッスンを終了できます' },
        { status: 403 }
      );
    }

    const sessionId = params.id;
    const body: EndSessionBody = await request.json();

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

    // メンターが自分のレッスンのみ終了できることを確認
    if (lessonSession.reservation.lesson_slots.teacher_id !== session.user.id) {
      return NextResponse.json(
        { error: 'このレッスンを終了する権限がありません' },
        { status: 403 }
      );
    }

    // ステータスチェック
    if (lessonSession.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: `このレッスンは終了できません。現在の状態: ${lessonSession.status}` },
        { status: 400 }
      );
    }

    // レッスンメモの必須チェック
    if (!body.lesson_notes || body.lesson_notes.trim().length === 0) {
      return NextResponse.json(
        { error: 'レッスンメモは必須です' },
        { status: 400 }
      );
    }

    const now = new Date();

    // トランザクションでセッションと予約を更新
    const result = await prisma.$transaction(async (tx) => {
      // レッスンセッションを完了に更新
      const updatedSession = await tx.lesson_sessions.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          actual_end: now,
          lesson_notes: body.lesson_notes,
          homework: body.homework,
          materials_used: body.materials_used || undefined
        }
      });

      // 予約ステータスも完了に更新
      await tx.reservations.update({
        where: { id: lessonSession.reservation_id },
        data: {
          status: 'COMPLETED'
        }
      });

      return updatedSession;
    });

    console.log('✅ レッスン終了:', {
      sessionId: result.id,
      mentorId: session.user.id,
      actualEnd: result.actual_end,
      duration: result.actual_start && result.actual_end 
        ? Math.round((result.actual_end.getTime() - result.actual_start.getTime()) / (1000 * 60))
        : null
    });

    return NextResponse.json({
      success: true,
      message: 'レッスンを終了しました',
      session: {
        id: result.id,
        status: result.status,
        actual_start: result.actual_start,
        actual_end: result.actual_end,
        lesson_notes: result.lesson_notes,
        homework: result.homework,
        materials_used: result.materials_used
      }
    });

  } catch (error) {
    console.error('レッスン終了エラー:', error);
    return NextResponse.json(
      { error: 'レッスンの終了中にエラーが発生しました' },
      { status: 500 }
    );
  }
}