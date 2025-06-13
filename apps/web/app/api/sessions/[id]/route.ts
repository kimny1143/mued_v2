import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const sessionId = params.id;

    // セッション詳細を取得
    const lessonSession = await prisma.lesson_sessions.findUnique({
      where: { id: sessionId },
      include: {
        reservation: {
          include: {
            lesson_slots: {
              include: {
                users: {
                  select: { id: true, name: true, email: true, image: true }
                }
              }
            },
            users: {
              select: { id: true, name: true, email: true, image: true }
            },
            payments: true
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

    // アクセス権限のチェック
    const userId = session.user.id;
    const isStudent = lessonSession.reservation.student_id === userId;
    const isTeacher = lessonSession.reservation.lesson_slots.teacher_id === userId;

    if (!isStudent && !isTeacher) {
      return NextResponse.json(
        { error: 'このセッションへのアクセス権限がありません' },
        { status: 403 }
      );
    }

    // ユーザーロールに応じて情報をフィルタリング
    const baseSession = {
      id: lessonSession.id,
      status: lessonSession.status,
      scheduled_start: lessonSession.scheduled_start,
      scheduled_end: lessonSession.scheduled_end,
      actual_start: lessonSession.actual_start,
      actual_end: lessonSession.actual_end,
      reservation: {
        id: lessonSession.reservation.id,
        status: lessonSession.reservation.status,
        total_amount: lessonSession.reservation.total_amount,
        booked_start_time: lessonSession.reservation.booked_start_time,
        booked_end_time: lessonSession.reservation.booked_end_time,
        notes: lessonSession.reservation.notes,
        payment_status: lessonSession.reservation.payments?.status
      },
      teacher: lessonSession.reservation.lesson_slots.users,
      student: lessonSession.reservation.users,
      lesson_slot: {
        id: lessonSession.reservation.lesson_slots.id,
        description: lessonSession.reservation.lesson_slots.description,
        hourly_rate: lessonSession.reservation.lesson_slots.hourly_rate
      }
    };

    // メンターは全情報を見られる
    if (isTeacher) {
      return NextResponse.json({
        ...baseSession,
        lesson_notes: lessonSession.lesson_notes,
        homework: lessonSession.homework,
        materials_used: lessonSession.materials_used,
        student_feedback: lessonSession.student_feedback,
        mentor_feedback: lessonSession.mentor_feedback,
        rating: lessonSession.rating,
        created_at: lessonSession.created_at,
        updated_at: lessonSession.updated_at
      });
    }

    // 生徒は公開情報のみ
    if (isStudent) {
      return NextResponse.json({
        ...baseSession,
        homework: lessonSession.homework,
        materials_used: lessonSession.materials_used,
        student_feedback: lessonSession.student_feedback,
        mentor_feedback: lessonSession.mentor_feedback,
        rating: lessonSession.rating,
        // レッスンメモは完了後のみ表示
        lesson_notes: lessonSession.status === 'COMPLETED' ? lessonSession.lesson_notes : null,
        created_at: lessonSession.created_at,
        updated_at: lessonSession.updated_at
      });
    }

  } catch (error) {
    console.error('セッション詳細取得エラー:', error);
    return NextResponse.json(
      { error: 'セッション詳細の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}