import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { createCorsResponse, handleOptions } from '@/lib/cors';
import { getFeature } from '@/lib/config/features';

// このルートは動的である必要があります（認証ヘッダーを使用するため）
export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request.headers.get('origin'));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return createCorsResponse({ error: '認証が必要です' }, origin, 401);
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
      reservations: {
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
      where.actual_start_time = {};
      if (from) {
        where.actual_start_time.gte = new Date(from);
      }
      if (to) {
        where.actual_start_time.lte = new Date(to);
      }
    }

    // フィーチャーフラグでビュー使用を判定
    const useDbViews = getFeature('USE_DB_VIEWS');
    // lesson_sessionsテーブルがないため、ビューは使用しない
    const tableName = 'lesson_sessions';
    
    console.log(`sessions API: ${tableName}を使用 (ビュー利用: 無効)`);
    
    // セッション一覧を取得
    let sessions: any[];
    let total: number;
    
    try {
      // 通常のPrismaクエリを使用
      [sessions, total] = await Promise.all([
        prisma.lesson_sessions.findMany({
          where,
          include: {
            reservations: {
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
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.lesson_sessions.count({ where })
      ]);
    } catch (error) {
      console.error('lesson_sessionsテーブルエラー:', error);
      // テーブルが存在しない場合は空の結果を返す
      sessions = [];
      total = 0;
    }

    // ユーザーロールに応じて情報をフィルタリング
    const formattedSessions = sessions.map(session => {
      const isStudent = session.reservations.student_id === userId;
      const isTeacher = session.reservations.lesson_slots.teacher_id === userId;

      const baseSession = {
        id: session.id,
        status: session.status,
        scheduled_start: session.reservations.booked_start_time,
        scheduled_end: session.reservations.booked_end_time,
        actual_start: session.actual_start_time,
        actual_end: session.actual_end_time,
        reservation: {
          id: session.reservations.id,
          status: session.reservations.status,
          total_amount: session.reservations.total_amount,
          booked_start_time: session.reservations.booked_start_time,
          booked_end_time: session.reservations.booked_end_time
        },
        teacher: session.reservations.lesson_slots.users,
        student: session.reservations.users
      };

      // メンターは全情報を見られる
      if (isTeacher) {
        return {
          ...baseSession,
          lesson_notes: session.notes,
          homework: session.homework_assigned,
          materials_used: session.materials_used,
          student_feedback: session.student_feedback,
          mentor_feedback: session.teacher_feedback,
          rating: session.student_rating
        };
      }

      // 生徒は公開情報のみ
      if (isStudent) {
        return {
          ...baseSession,
          homework: session.homework_assigned,
          materials_used: session.materials_used,
          student_feedback: session.student_feedback,
          mentor_feedback: session.teacher_feedback,
          rating: session.teacher_rating,
          // レッスンメモは完了後のみ表示
          lesson_notes: session.status === 'COMPLETED' ? session.notes : null
        };
      }

      // その他のユーザー（管理者など）
      return baseSession;
    });

    return createCorsResponse({
      sessions: formattedSessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }, origin);

  } catch (error) {
    console.error('セッション一覧取得エラー:', error);
    return createCorsResponse(
      { error: 'セッション一覧の取得中にエラーが発生しました' },
      origin,
      500
    );
  }
}