import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

interface FeedbackBody {
  feedback: string;
  rating?: number;
  role: 'student' | 'mentor';
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

    const sessionId = params.id;
    const body: FeedbackBody = await request.json();

    // バリデーション
    if (!body.feedback || body.feedback.trim().length === 0) {
      return NextResponse.json(
        { error: 'フィードバックの内容は必須です' },
        { status: 400 }
      );
    }

    if (!['student', 'mentor'].includes(body.role)) {
      return NextResponse.json(
        { error: '無効なロールです' },
        { status: 400 }
      );
    }

    // 評価の範囲チェック（生徒のみ）
    if (body.role === 'student' && body.rating !== undefined) {
      if (body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)) {
        return NextResponse.json(
          { error: '評価は1から5の整数で指定してください' },
          { status: 400 }
        );
      }
    }

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

    // ユーザーの権限チェック
    const userId = session.user.id;
    const isStudent = lessonSession.reservation.student_id === userId;
    const isTeacher = lessonSession.reservation.lesson_slots.teacher_id === userId;

    if (body.role === 'student' && !isStudent) {
      return NextResponse.json(
        { error: 'このレッスンの生徒のみフィードバックを投稿できます' },
        { status: 403 }
      );
    }

    if (body.role === 'mentor' && !isTeacher) {
      return NextResponse.json(
        { error: 'このレッスンのメンターのみフィードバックを投稿できます' },
        { status: 403 }
      );
    }

    // ステータスチェック（完了したレッスンのみ）
    if (lessonSession.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'フィードバックは完了したレッスンにのみ投稿できます' },
        { status: 400 }
      );
    }

    // フィードバックを更新
    const updateData: any = {};
    
    if (body.role === 'student') {
      updateData.student_feedback = body.feedback;
      if (body.rating !== undefined) {
        updateData.rating = body.rating;
      }
    } else {
      updateData.mentor_feedback = body.feedback;
    }

    const updatedSession = await prisma.lesson_sessions.update({
      where: { id: sessionId },
      data: updateData,
      select: {
        id: true,
        student_feedback: true,
        mentor_feedback: true,
        rating: true,
        updated_at: true
      }
    });

    console.log('💬 フィードバック投稿:', {
      sessionId: updatedSession.id,
      userId,
      role: body.role,
      hasRating: body.rating !== undefined
    });

    return NextResponse.json({
      success: true,
      message: 'フィードバックを投稿しました',
      feedback: {
        id: updatedSession.id,
        student_feedback: updatedSession.student_feedback,
        mentor_feedback: updatedSession.mentor_feedback,
        rating: updatedSession.rating,
        updated_at: updatedSession.updated_at
      }
    });

  } catch (error) {
    console.error('フィードバック投稿エラー:', error);
    return NextResponse.json(
      { error: 'フィードバックの投稿中にエラーが発生しました' },
      { status: 500 }
    );
  }
}