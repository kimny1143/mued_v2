import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
// TODO: v1.1.0 - DAW Logs feature
// import { Sliders } from "lucide-react";
import { db } from "@/db";
import { muednoteMobileSessions, muednoteMobileLogs } from "@/db/schema/muednote-mobile";
// TODO: v1.1.0 - DAW Logs feature
// import { muednoteDawLogs } from "@/db/schema/muednote-daw-logs";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { MuednoteTabs } from "./muednote-tabs";
import { MuednoteDashboardContent } from "./muednote-dashboard-content";

/**
 * MUEDnote Dashboard - Main Page
 *
 * UX Psychology:
 * - Progress indication (stats cards)
 * - Clear onboarding path (numbered steps)
 * - Empty state with actionable guidance
 */
export default async function MuednoteDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const _params = await searchParams;
  // TODO: v1.1.0 - DAW Logs tab
  // const activeTab = _params.tab === "daw" ? "daw" : "overview";
  const activeTab = "overview";

  // Fetch real stats from DB
  const [sessionsResult, logsResult, _durationResult, recentSessions] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(muednoteMobileLogs)
      .innerJoin(
        muednoteMobileSessions,
        eq(muednoteMobileLogs.sessionId, muednoteMobileSessions.id)
      )
      .where(eq(muednoteMobileSessions.userId, user.id)),
    db
      .select({ total: sql<number>`COALESCE(SUM(duration_sec), 0)` })
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id)),
    db
      .select()
      .from(muednoteMobileSessions)
      .where(eq(muednoteMobileSessions.userId, user.id))
      .orderBy(desc(muednoteMobileSessions.createdAt))
      .limit(3),
    // TODO: v1.1.0 - DAW Logs feature
    // // DAW logs count
    // db
    //   .select({ count: sql<number>`count(*)` })
    //   .from(muednoteDawLogs)
    //   .where(eq(muednoteDawLogs.userId, user.id)),
    // // Recent DAW logs
    // db
    //   .select()
    //   .from(muednoteDawLogs)
    //   .where(eq(muednoteDawLogs.userId, user.id))
    //   .orderBy(desc(muednoteDawLogs.ts))
    //   .limit(50),
  ]);

  // 累計時間クエリ（今日/今週/今月）
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 今週の開始日（月曜日）
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

  // 今月の開始日
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 実時間 = ended_at - started_at（ended_atがnullの場合は除外）
  const actualTimeExpr = sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)`;

  const [todayResult, weekResult, monthResult, weekSessions] = await Promise.all([
    db.select({ total: actualTimeExpr })
      .from(muednoteMobileSessions)
      .where(and(
        eq(muednoteMobileSessions.userId, user.id),
        gte(muednoteMobileSessions.startedAt, todayStart),
        sql`ended_at IS NOT NULL`
      )),
    db.select({ total: actualTimeExpr })
      .from(muednoteMobileSessions)
      .where(and(
        eq(muednoteMobileSessions.userId, user.id),
        gte(muednoteMobileSessions.startedAt, weekStart),
        sql`ended_at IS NOT NULL`
      )),
    db.select({ total: actualTimeExpr })
      .from(muednoteMobileSessions)
      .where(and(
        eq(muednoteMobileSessions.userId, user.id),
        gte(muednoteMobileSessions.startedAt, monthStart),
        sql`ended_at IS NOT NULL`
      )),
    // 週間セッション（日別集計用）- 実時間ベース
    db.select({
      date: sql<string>`DATE(started_at)`,
      count: sql<number>`COUNT(*)`,
      totalSec: sql<number>`SUM(EXTRACT(EPOCH FROM (ended_at - started_at)))`,
    })
      .from(muednoteMobileSessions)
      .where(and(
        eq(muednoteMobileSessions.userId, user.id),
        gte(muednoteMobileSessions.startedAt, weekStart),
        sql`ended_at IS NOT NULL`
      ))
      .groupBy(sql`DATE(started_at)`),
  ]);

  const sessionCount = Number(sessionsResult[0]?.count) || 0;
  const logCount = Number(logsResult[0]?.count) || 0;
  // TODO: v1.1.0 - DAW Logs feature
  // const dawLogCount = Number(dawLogsResult[0]?.count) || 0;
  const dawLogCount = 0;

  // 累計時間（秒→時間:分 形式）
  const todaySeconds = Number(todayResult[0]?.total) || 0;
  const weekSeconds = Number(weekResult[0]?.total) || 0;
  const monthSeconds = Number(monthResult[0]?.total) || 0;

  const formatHoursMinutes = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return { value: hours, unit: "時間", sub: `${mins}分` };
    }
    return { value: mins, unit: "分", sub: null };
  };

  const todayTime = formatHoursMinutes(todaySeconds);
  const weekTime = formatHoursMinutes(weekSeconds);
  const monthTime = formatHoursMinutes(monthSeconds);

  // 週間カレンダーデータ
  const weekDays = ["月", "火", "水", "木", "金", "土", "日"];
  const sessionsByDate = new Map(
    weekSessions.map((s) => [s.date, { count: Number(s.count), totalSec: Number(s.totalSec) }])
  );

  const weekCalendar = weekDays.map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const dateStr = date.toISOString().split("T")[0];
    const session = sessionsByDate.get(dateStr);
    const isToday = dateStr === todayStart.toISOString().split("T")[0];
    const isFuture = date > now;

    return {
      label,
      date: date.getDate(),
      dateStr,
      isToday,
      isFuture,
      hasSession: !!session,
      sessionCount: session?.count || 0,
      totalMinutes: session ? Math.floor(session.totalSec / 60) : 0,
    };
  });

  // Prepare session data for client component
  const sessionsForClient = recentSessions.map((session) => ({
    id: session.id,
    sessionMemo: session.sessionMemo,
    durationSec: session.durationSec,
    createdAt: session.createdAt,
  }));

  const userName = user.firstName || user.username || "Creator";

  return (
    <MuednoteLayout>
      {/* Tabs */}
      <MuednoteTabs activeTab={activeTab} dawLogCount={dawLogCount} sessionCount={sessionCount} />

      {activeTab === "overview" ? (
        <MuednoteDashboardContent
          userName={userName}
          recentSessions={sessionsForClient}
          sessionCount={sessionCount}
          logCount={logCount}
          todayTime={todayTime}
          weekTime={weekTime}
          monthTime={monthTime}
          weekCalendar={weekCalendar}
        />
      ) : null}
    </MuednoteLayout>
  );
}
