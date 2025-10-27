import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { materials, reservations, lessonSlots, users } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get recent materials (last 5)
    const recentMaterials = await db
      .select({
        id: materials.id,
        title: materials.title,
        type: materials.type,
        difficulty: materials.difficulty,
        createdAt: materials.createdAt,
      })
      .from(materials)
      .where(eq(materials.creatorId, user.id))
      .orderBy(desc(materials.createdAt))
      .limit(5);

    // Get upcoming reservations
    const now = new Date();
    const upcomingReservations = await db
      .select({
        id: reservations.id,
        status: reservations.status,
        paymentStatus: reservations.paymentStatus,
        notes: reservations.notes,
        createdAt: reservations.createdAt,
        slot: {
          startTime: lessonSlots.startTime,
          endTime: lessonSlots.endTime,
        },
        mentor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(reservations)
      .innerJoin(lessonSlots, eq(reservations.slotId, lessonSlots.id))
      .innerJoin(users, eq(reservations.mentorId, users.id))
      .where(
        and(
          eq(reservations.studentId, user.id),
          gte(lessonSlots.startTime, now)
        )
      )
      .orderBy(lessonSlots.startTime)
      .limit(5);

    // Get total counts
    const [materialCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(materials)
      .where(eq(materials.creatorId, user.id));

    const [reservationCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reservations)
      .where(eq(reservations.studentId, user.id));

    return NextResponse.json({
      success: true,
      stats: {
        totalMaterials: materialCount?.count || 0,
        totalReservations: reservationCount?.count || 0,
      },
      recentMaterials: recentMaterials.map((m) => ({
        id: m.id,
        title: m.title,
        type: m.type,
        difficulty: m.difficulty,
        createdAt: m.createdAt.toISOString(),
      })),
      upcomingReservations: upcomingReservations.map((r) => ({
        id: r.id,
        status: r.status,
        paymentStatus: r.paymentStatus,
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        startTime: r.slot.startTime.toISOString(),
        endTime: r.slot.endTime.toISOString(),
        mentor: {
          id: r.mentor.id,
          name: r.mentor.name,
          email: r.mentor.email,
        },
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
