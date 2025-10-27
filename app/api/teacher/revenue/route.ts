import { NextResponse } from 'next/server';
import { getAuthenticatedUser, requireMentor } from '@/lib/auth';
import { db } from '@/db';
import { reservations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/teacher/revenue
 *
 * Get mentor's revenue statistics
 * Calculates 70% revenue share from completed lessons
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    requireMentor(user);

    // Get all completed reservations for this mentor
    const completedReservations = await db
      .select({
        id: reservations.id,
        amount: reservations.amount,
        status: reservations.status,
        paymentStatus: reservations.paymentStatus,
        createdAt: reservations.createdAt,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.mentorId, user.id),
          eq(reservations.status, 'completed'),
          eq(reservations.paymentStatus, 'succeeded')
        )
      );

    // Calculate revenue with 70% share
    const MENTOR_SHARE = 0.7; // 70% to mentor, 30% to platform

    const totalGrossRevenue = completedReservations.reduce(
      (sum, r) => sum + parseFloat(r.amount.toString()),
      0
    );

    const mentorShare = totalGrossRevenue * MENTOR_SHARE;
    const platformFee = totalGrossRevenue * (1 - MENTOR_SHARE);

    // Calculate monthly revenue (current month)
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const monthlyReservations = completedReservations.filter(
      (r) => new Date(r.createdAt) >= monthStart
    );

    const monthlyGrossRevenue = monthlyReservations.reduce(
      (sum, r) => sum + parseFloat(r.amount.toString()),
      0
    );

    const monthlyMentorShare = monthlyGrossRevenue * MENTOR_SHARE;

    // Calculate average lesson price
    const averageLessonPrice =
      completedReservations.length > 0
        ? totalGrossRevenue / completedReservations.length
        : 0;

    const averageMentorEarnings = averageLessonPrice * MENTOR_SHARE;

    return NextResponse.json({
      success: true,
      revenue: {
        // All-time stats
        totalLessons: completedReservations.length,
        totalGrossRevenue: totalGrossRevenue.toFixed(2),
        mentorShare: mentorShare.toFixed(2),
        platformFee: platformFee.toFixed(2),
        sharePercentage: MENTOR_SHARE * 100,

        // Monthly stats
        monthlyLessons: monthlyReservations.length,
        monthlyGrossRevenue: monthlyGrossRevenue.toFixed(2),
        monthlyMentorShare: monthlyMentorShare.toFixed(2),

        // Averages
        averageLessonPrice: averageLessonPrice.toFixed(2),
        averageMentorEarnings: averageMentorEarnings.toFixed(2),

        // Recent lessons
        recentLessons: completedReservations.slice(0, 10).map((r) => ({
          id: r.id,
          amount: r.amount.toString(),
          mentorShare: (parseFloat(r.amount.toString()) * MENTOR_SHARE).toFixed(2),
          date: r.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Revenue fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch revenue',
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}
