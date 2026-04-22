import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { db } from "@/db";
import { muednoteMobileSessions } from "@/db/schema/muednote-mobile";
import {
  cognitiveProfiles,
  measurementHistory,
} from "@/db/schema/cognitive-profiles";
import { hooConversations, userProfiles, dialSessions } from "@/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { SessionLedger, type UnifiedSession } from "@/components/dashboard/session-ledger";
import { CreditsLedger } from "@/components/dashboard/credits-ledger";
import { AccountSection } from "@/components/dashboard/account-section";
import { hooMemoriesRepository } from "@/lib/repositories/hoo-memories.repository";
import { getUserIdFromClerkId } from "@/lib/utils/auth-helpers";

/**
 * Unified Dashboard — MUED
 *
 * Consolidates MUEDnote, MUEDial, and MUEDear into a single tabbed view.
 * Data for all services is fetched in parallel at the server level.
 */
export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // ========================================
  // Phase 1: Parallel data fetching (Clerk-ID-based + UUID resolution)
  // ========================================

  const now = new Date();

  const [
    internalUserId,
    cognitiveProfile,
    sessionsResult,
    recentSessions,
    todayResult,
    weekResult,
    monthResult,
    gameCompletions,
    rawDialSessions,
  ] = await Promise.all([
    getUserIdFromClerkId(user.id),

    // MUEDlobe cognitive profile (Clerk ID)
    db
      .select()
      .from(cognitiveProfiles)
      .where(eq(cognitiveProfiles.userId, user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),

    // Session count (Clerk ID)
    db
      .select({ count: sql<number>`count(*)` })
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id)),

    // Recent sessions (Clerk ID)
    db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id))
      .orderBy(desc(muednoteMobileSessions.createdAt))
      .limit(3),

    // Today's time (Clerk ID)
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

    // Week's time (Clerk ID)
    (() => {
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

    // Month's time (Clerk ID)
    (() => {
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

    // MUEDlobe game completions (Clerk ID)
    db
      .select({
        gameType: measurementHistory.gameType,
        measuredAt: sql<string>`MAX(${measurementHistory.measuredAt})`,
      })
      .from(measurementHistory)
      .where(eq(measurementHistory.userId, user.id))
      .groupBy(measurementHistory.gameType),

    // MUEDial sessions (Clerk ID)
    db.query.dialSessions.findMany({
      where: eq(dialSessions.userId, user.id),
      orderBy: [desc(dialSessions.createdAt)],
      with: {
        tracks: { columns: { id: true } },
        tasks: {
          columns: {
            id: true,
            taskType: true,
            status: true,
            r2FinalUrl: true,
            r2ExpiresAt: true,
          },
        },
      },
    }),
  ]);

  // ========================================
  // Phase 2: UUID-dependent queries (MUEDnote)
  // ========================================

  const [hooStats, recentConversations, customInstructions, userProfile] =
    await Promise.all([
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

      hooMemoriesRepository.getCustomInstructions(internalUserId),

      db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, internalUserId))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);

  // ========================================
  // Build MUEDnote profile data
  // ========================================

  const sessionCount = Number(sessionsResult[0]?.count) || 0;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return { value: hours, unit: "h", sub: `${mins}m` };
    return { value: mins, unit: "m", sub: null };
  };

  const completedGames = new Set(gameCompletions.map((g) => g.gameType));

  const profileChecks = {
    gamesCompleted: completedGames.size >= 7,
    hasProfile: !!cognitiveProfile,
    hasCustomInstructions: !!customInstructions,
    hasConversations: hooStats.totalConversations > 0,
    hasSessions: sessionCount > 0,
    hasUserProfile: !!userProfile,
  };
  const completenessTotal = Object.values(profileChecks).filter(Boolean).length;
  const completenessMax = Object.keys(profileChecks).length;

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
    gameProgress: {
      completedGames: Array.from(completedGames),
      totalGames: 7,
    },
    completeness: {
      score: completenessTotal,
      max: completenessMax,
      checks: profileChecks,
    },
  };

  // ========================================
  // Build MUEDial sessions data
  // ========================================

  const dialSessionsData = rawDialSessions.map((s) => {
    const downloadableTasks = s.tasks.filter(
      (t) =>
        t.r2FinalUrl &&
        t.r2ExpiresAt &&
        t.status === "completed" &&
        (t.taskType === "final_basic" ||
          t.taskType === "final_advanced" ||
          t.taskType === "mastering")
    );
    const earliestExpiry =
      downloadableTasks.length > 0
        ? downloadableTasks.reduce((min, t) => {
            const exp = new Date(t.r2ExpiresAt!);
            return exp < min ? exp : min;
          }, new Date(downloadableTasks[0].r2ExpiresAt!))
        : null;
    const daysRemaining = earliestExpiry
      ? Math.ceil(
          (earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    return {
      id: s.id,
      mode: s.mode,
      status: s.status,
      musicalStyle: s.musicalStyle,
      title: s.title,
      createdAt: s.createdAt,
      trackCount: s.tracks.length,
      hasFinal: s.tasks.some(
        (t) =>
          (t.taskType === "final_basic" || t.taskType === "final_advanced") &&
          t.status === "completed"
      ),
      hasDownload: downloadableTasks.length > 0,
      daysRemaining,
      downloadTaskIds: downloadableTasks.map((t) => t.id),
    };
  });

  // ========================================
  // Render
  // ========================================

  // ========================================
  // Build unified session list (dial + muednote, sorted by date desc)
  // ========================================

  const dialUnified: UnifiedSession[] = dialSessionsData.map((s) => ({
    id: s.id,
    product: 'dial' as const,
    status: s.status,
    displayName: s.title || s.musicalStyle || s.id.replace(/-/g, '').slice(0, 8),
    createdAt: s.createdAt,
    href: `/dial/session/${s.id}`,
    hasDownload: s.hasDownload,
    daysRemaining: s.daysRemaining,
  }));

  const muednoteUnified: UnifiedSession[] = profileData.recentSessions.map((s) => ({
    id: s.id,
    product: 'muednote' as const,
    status: 'note',
    displayName: s.sessionMemo ? s.sessionMemo.slice(0, 40) : '',
    createdAt: s.createdAt ? new Date(s.createdAt) : null,
    href: '/lobe',
    durationSec: s.durationSec ?? null,
  }));

  const unifiedSessions: UnifiedSession[] = [
    ...dialUnified,
    ...muednoteUnified,
  ];

  const host = (await headers()).get('host') ?? '';
  const isDialDomain = host.startsWith('dial.');

  return (
    <MuednoteLayout>
      <CreditsLedger />
      <SessionLedger sessions={unifiedSessions} showDialOnly={isDialDomain} />
      <AccountSection />
    </MuednoteLayout>
  );
}
