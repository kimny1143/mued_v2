import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/session';
import { createCorsResponse, handleOptions } from '@/lib/cors';

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

    const userId = session.user.id;
    const userRole = session.role;
    const isMentor = userRole === 'mentor' || userRole === 'teacher';

    // 予約データを取得
    const reservations = await prisma.reservations.findMany({
      where: {
        OR: [
          { student_id: userId },
          { lesson_slots: { teacher_id: userId } }
        ],
        status: {
          in: ['APPROVED', 'CONFIRMED', 'COMPLETED']
        }
      },
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
      },
      orderBy: { booked_start_time: 'desc' }
    });

    // lesson_sessionsテーブルから関連データを取得
    const reservationIds = reservations.map(r => r.id);
    const lessonSessions = await prisma.lesson_sessions.findMany({
      where: {
        reservation_id: { in: reservationIds }
      }
    });

    // reservation_idをキーとしたMapを作成
    const sessionMap = new Map(lessonSessions.map(s => [s.reservation_id, s]));

    // レッスンデータをフォーマット
    const formattedLessons = reservations.map(reservation => {
      const lessonSession = sessionMap.get(reservation.id);
      
      // 現在時刻を取得
      const now = new Date();
      const startTime = new Date(reservation.booked_start_time);
      const endTime = new Date(reservation.booked_end_time);
      
      // lesson_sessionが存在する場合はそのステータスを使用
      // 存在しない場合は時刻ベースでステータスを判定
      let status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' = 'SCHEDULED';
      if (lessonSession) {
        status = lessonSession.status as any;
      } else if (reservation.status === 'COMPLETED') {
        status = 'COMPLETED';
      } else if (now >= endTime) {
        status = 'COMPLETED';
      } else if (now >= startTime && now < endTime) {
        status = 'IN_PROGRESS';
      }
      
      return {
        id: reservation.id,
        status,
        scheduled_start: reservation.booked_start_time.toISOString(),
        scheduled_end: reservation.booked_end_time.toISOString(),
        teacher: reservation.lesson_slots.users,
        student: reservation.users,
        // lesson_sessionsのデータがあれば含める
        actual_start: lessonSession?.actual_start_time?.toISOString() || null,
        actual_end: lessonSession?.actual_end_time?.toISOString() || null,
        lesson_notes: lessonSession?.notes || null,
        homework: lessonSession?.homework_assigned || null,
        student_feedback: lessonSession?.student_feedback || null,
        mentor_feedback: lessonSession?.teacher_feedback || null,
        materials_used: lessonSession?.materials_used || []
      };
    });

    return createCorsResponse({
      sessions: formattedLessons,
      pagination: {
        total: formattedLessons.length,
        limit: 100,
        offset: 0,
        hasMore: false
      }
    }, origin);

  } catch (error) {
    console.error('マイレッスン取得エラー:', error);
    return createCorsResponse(
      { error: 'レッスン一覧の取得中にエラーが発生しました' },
      origin,
      500
    );
  }
}