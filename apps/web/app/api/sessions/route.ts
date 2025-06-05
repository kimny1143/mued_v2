import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';

// このルートは動的である必要があります（認証ヘッダーを使用するため）
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id') || session.user.id;
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Where条件を構築
    const where: any = {
      reservation: {
        OR: [
          { student_id: userId },
          { lesson_slots: { teacher_id: userId } }
        ]
      }
    };

    // ステータスフィルター
    if (status) {
      where.status = status;
    }

    // 日付範囲フィルター
    if (from || to) {
      where.scheduled_start = {};
      if (from) {
        where.scheduled_start.gte = new Date(from);
      }
      if (to) {
        where.scheduled_start.lte = new Date(to);
      }
    }

    // セッション一覧を取得
    const [sessions, total] = await Promise.all([
      prisma.lesson_sessions.findMany({
        where,
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
              }
            }
          }
        },
        orderBy: { scheduled_start: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.lesson_sessions.count({ where })
    ]);

    // ユーザーロールに応じて情報をフィルタリング
    const formattedSessions = sessions.map(session => {
      const isStudent = session.reservation.student_id === userId;
      const isTeacher = session.reservation.lesson_slots.teacher_id === userId;

      const baseSession = {
        id: session.id,
        status: session.status,
        scheduled_start: session.scheduled_start,
        scheduled_end: session.scheduled_end,
        actual_start: session.actual_start,
        actual_end: session.actual_end,
        reservation: {
          id: session.reservation.id,
          status: session.reservation.status,
          total_amount: session.reservation.total_amount,
          booked_start_time: session.reservation.booked_start_time,
          booked_end_time: session.reservation.booked_end_time
        },
        teacher: session.reservation.lesson_slots.users,
        student: session.reservation.users
      };

      // メンターは全情報を見られる
      if (isTeacher) {
        return {
          ...baseSession,
          lesson_notes: session.lesson_notes,
          homework: session.homework,
          materials_used: session.materials_used,
          student_feedback: session.student_feedback,
          mentor_feedback: session.mentor_feedback,
          rating: session.rating
        };
      }

      // 生徒は公開情報のみ
      if (isStudent) {
        return {
          ...baseSession,
          homework: session.homework,
          materials_used: session.materials_used,
          student_feedback: session.student_feedback,
          mentor_feedback: session.mentor_feedback,
          rating: session.rating,
          // レッスンメモは完了後のみ表示
          lesson_notes: session.status === 'COMPLETED' ? session.lesson_notes : null
        };
      }

      // その他のユーザー（管理者など）
      return baseSession;
    });

    return NextResponse.json({
      sessions: formattedSessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('セッション一覧取得エラー:', error);
    return NextResponse.json(
      { error: 'セッション一覧の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}