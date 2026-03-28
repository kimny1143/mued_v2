import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { db } from "@/db";
import { muednoteMobileSessions } from "@/db/schema/muednote-mobile";
import { cognitiveProfiles } from "@/db/schema/cognitive-profiles";
import { hooConversations } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { MuednoteTabs } from "./muednote-tabs";
import { MuednoteDashboardContent } from "./muednote-dashboard-content";
import { hooMemoriesRepository } from "@/lib/repositories/hoo-memories.repository";
import { getUserIdFromClerkId } from "@/lib/utils/auth-helpers";

/**
 * MUEDnote Dashboard - "Hoo's View of You"
 *
 * Profile-first dashboard centered on Hoo's understanding of the user.
 * Data sources: MUEDlobe scores, Hoo conversations, custom instructions, timer stats.
 */
export default async function MuednoteDashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Resolve internal UUID for tables that reference users.id (UUID)
  // cognitiveProfiles and muednoteMobileSessions use Clerk ID (text) directly
  const internalUserId = await getUserIdFromClerkId(user.id);

  // Fetch all data sources in parallel
  const [
    cognitiveProfile,
    hooStats,
    recentConversations,
    customInstructions,
    sessionsResult,
    recentSessions,
    todayResult,
    weekResult,
    monthResult,
  ] = await Promise.all([
    // MUEDlobe cognitive profile
    db
      .select()
      .from(cognitiveProfiles)
      .where(eq(cognitiveProfiles.userId, user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    // Hoo conversation stats (hooConversations.userId is UUID)
    db
      .select({
        totalConversations: sql<number>`count(*)`,
        totalMessages: sql<number>`COALESCE(sum(message_count), 0)`,
      })
      .from(hooConversations)
      .where(eq(hooConversations.userId, internalUserId))
      .then((rows) => ({
        totalConversations: Number(rows[0]?.totalConversations ?? 0),
        totalMessages: Number(rows[0]?.totalMessages ?? 0),
      })),

    // Recent Hoo conversations (last 3 with titles)
    db
      .select({
        id: hooConversations.id,
        title: hooConversations.title,
        messageCount: hooConversations.messageCount,
        updatedAt: hooConversations.updatedAt,
      })
      .from(hooConversations)
      .where(eq(hooConversations.userId, internalUserId))
      .orderBy(desc(hooConversations.updatedAt))
      .limit(3),

    // Custom instructions (hooMemories.userId is UUID)
    hooMemoriesRepository.getCustomInstructions(internalUserId),

    // Session count
    db
      .select({ count: sql<number>`count(*)` })
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id)),

    // Recent sessions
    db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id))
      .orderBy(desc(muednoteMobileSessions.createdAt))
      .limit(3),

    // Today's time
    (() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return db
        .select({
          total: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)`,
        })
        .from(muednoteMobileSessions)
        .where(
          and(
            eq(muednoteMobileSessions.userId, user.id),
            gte(muednoteMobileSessions.startedAt, todayStart),
            sql`ended_at IS NOT NULL`
          )
        );
    })(),

    // Week's time
    (() => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + mondayOffset
      );
      return db
        .select({
          total: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)`,
        })
        .from(muednoteMobileSessions)
        .where(
          and(
            eq(muednoteMobileSessions.userId, user.id),
            gte(muednoteMobileSessions.startedAt, weekStart),
            sql`ended_at IS NOT NULL`
          )
        );
    })(),

    // Month's time
    (() => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return db
        .select({
          total: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)`,
        })
        .from(muednoteMobileSessions)
        .where(
          and(
            eq(muednoteMobileSessions.userId, user.id),
            gte(muednoteMobileSessions.startedAt, monthStart),
            sql`ended_at IS NOT NULL`
          )
        );
    })(),
  ]);

  const sessionCount = Number(sessionsResult[0]?.count) || 0;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return { value: hours, unit: "h", sub: `${mins}m` };
    return { value: mins, unit: "m", sub: null };
  };

  // Build profile data for client
  const profileData = {
    cognitiveScores: cognitiveProfile
      ? {
          wm: cognitiveProfile.wmScore ?? 0,
          ps: cognitiveProfile.psScore ?? 0,
          vc: cognitiveProfile.vcScore ?? 0,
          pr: cognitiveProfile.prScore ?? 0,
          att: cognitiveProfile.attScore ?? 0,
          measuredAt: cognitiveProfile.measuredAt?.toISOString() ?? null,
        }
      : null,
    hooStats: {
      totalConversations: hooStats.totalConversations,
      totalMessages: hooStats.totalMessages,
    },
    recentConversations: recentConversations.map((c) => ({
      id: c.id,
      title: c.title,
      messageCount: c.messageCount,
      updatedAt: c.updatedAt?.toISOString() ?? null,
    })),
    customInstructions,
    timerStats: {
      sessionCount,
      todayTime: formatTime(Number(todayResult[0]?.total) || 0),
      weekTime: formatTime(Number(weekResult[0]?.total) || 0),
      monthTime: formatTime(Number(monthResult[0]?.total) || 0),
    },
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      sessionMemo: s.sessionMemo,
      durationSec: s.durationSec,
      createdAt: s.createdAt?.toISOString() ?? null,
    })),
  };

  const userName = user.firstName || user.username || "Creator";

  return (
    <MuednoteLayout>
      <MuednoteTabs />
      <MuednoteDashboardContent userName={userName} profile={profileData} />
    </MuednoteLayout>
  );
}
