import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { Mic, Clock, ArrowRight, Calendar, TrendingUp, Sliders } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { muednoteMobileSessions, muednoteMobileLogs } from "@/db/schema/muednote-mobile";
import { muednoteDawLogs } from "@/db/schema/muednote-daw-logs";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { MuednoteTabs } from "./muednote-tabs";

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

  const params = await searchParams;
  const activeTab = params.tab === "daw" ? "daw" : "overview";

  // Fetch real stats from DB
  const [sessionsResult, logsResult, durationResult, recentSessions, dawLogsResult, recentDawLogs] = await Promise.all([
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
    // DAW logs count
    db
      .select({ count: sql<number>`count(*)` })
      .from(muednoteDawLogs)
      .where(eq(muednoteDawLogs.userId, user.id)),
    // Recent DAW logs
    db
      .select()
      .from(muednoteDawLogs)
      .where(eq(muednoteDawLogs.userId, user.id))
      .orderBy(desc(muednoteDawLogs.ts))
      .limit(50),
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
  const dawLogCount = Number(dawLogsResult[0]?.count) || 0;

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date);
  };

  // Action type labels
  const actionLabels: Record<string, { label: string; color: string }> = {
    track_volume: { label: "Volume", color: "bg-blue-500/20 text-blue-300" },
    track_pan: { label: "Pan", color: "bg-green-500/20 text-green-300" },
    parameter_change: { label: "Param", color: "bg-purple-500/20 text-purple-300" },
    device_config_change: { label: "Config", color: "bg-amber-500/20 text-amber-300" },
  };

  return (
    <MuednoteLayout>
      {/* Hero: iOS-First Messaging */}
      <div className="mb-8">
        <p className="text-indigo-400/80 text-sm mb-3">
          ようこそ、{user.firstName || user.username || "クリエイター"}さん
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
          「なぜそうしたか」を、残しておこう。
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg">
          制作中の判断は、iPhoneアプリで声で残す。<br className="hidden sm:block" />
          DAWの操作ログも自動で記録されます。
        </p>
      </div>

      {/* Tabs */}
      <MuednoteTabs activeTab={activeTab} dawLogCount={dawLogCount} sessionCount={sessionCount} />

      {activeTab === "overview" ? (
        /* Overview Tab Content */
        <div className="grid lg:grid-cols-[1fr,280px] gap-8 lg:gap-12">
          {/* Left: Recent Sessions (Primary) */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">最近のセッション</h2>
              {recentSessions.length > 0 && (
                <Link
                  href="/dashboard/muednote/sessions"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  すべて見る →
                </Link>
              )}
            </div>

            {recentSessions.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl px-6 py-12 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-white font-medium mb-1">まだ記録がありません</p>
                <p className="text-sm text-slate-500">
                  アプリで最初の録音をしてみましょう
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session, index) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/muednote/sessions/${session.id}`}
                    className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-4 transition-colors block"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-2xl font-light text-slate-600 w-8 text-right">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {session.sessionMemo || "無題のセッション"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDuration(session.durationSec)}
                          </span>
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* iOS App Store Badge */}
            <div className="mt-8">
              <a
                href="https://apps.apple.com/app/muednote"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <div className="bg-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl inline-flex items-center gap-3 transition-colors border border-white/10">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] leading-none opacity-80">Download on the</p>
                    <p className="text-lg font-semibold leading-tight -mt-0.5">App Store</p>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Right: Stats (Secondary, smaller) */}
          <div className="lg:pt-0">
            {/* 累計時間セクション */}
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <p className="text-xs text-slate-500 uppercase tracking-wider">累計セッション時間</p>
            </div>
            <div className="space-y-2 mb-6">
              {/* 今日 - メインカード */}
              <div className="bg-indigo-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-indigo-300">今日</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{todayTime.value}</span>
                    <span className="text-sm text-slate-400">{todayTime.unit}</span>
                    {todayTime.sub && (
                      <span className="text-sm text-slate-500 ml-1">{todayTime.sub}</span>
                    )}
                  </div>
                </div>
              </div>
              {/* 今週・今月 */}
              <div className="flex gap-2">
                <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-slate-500 mb-1">今週</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-white">{weekTime.value}</span>
                    <span className="text-xs text-slate-500">{weekTime.unit}</span>
                  </div>
                </div>
                <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-slate-500 mb-1">今月</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-white">{monthTime.value}</span>
                    <span className="text-xs text-slate-500">{monthTime.unit}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 週間カレンダー */}
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wider">今週のセッション</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 mb-6">
              <div className="grid grid-cols-7 gap-1">
                {weekCalendar.map((day) => (
                  <div
                    key={day.dateStr}
                    className={`flex flex-col items-center py-2 rounded-lg transition-colors ${
                      day.isToday
                        ? "bg-indigo-500/20 border border-indigo-500/30"
                        : day.hasSession
                        ? "bg-white/5"
                        : ""
                    }`}
                  >
                    <span
                      className={`text-[10px] ${
                        day.isToday ? "text-indigo-300" : "text-slate-500"
                      }`}
                    >
                      {day.label}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        day.isFuture
                          ? "text-slate-600"
                          : day.isToday
                          ? "text-white"
                          : day.hasSession
                          ? "text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {day.date}
                    </span>
                    {day.hasSession && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 基本統計 */}
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-500 uppercase tracking-wider">全体統計</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                <p className="text-lg font-semibold text-white">{sessionCount}</p>
                <p className="text-xs text-slate-500">セッション</p>
              </div>
              <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5">
                <p className="text-lg font-semibold text-white">{logCount}</p>
                <p className="text-xs text-slate-500">音声ログ</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* DAW Logs Tab Content */
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">DAW操作ログ</h2>
            <p className="text-sm text-slate-500">{dawLogCount} 件</p>
          </div>

          {recentDawLogs.length === 0 ? (
            <div className="border border-dashed border-white/10 rounded-2xl px-6 py-12 text-center">
              <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sliders className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-white font-medium mb-1">DAWログがありません</p>
              <p className="text-sm text-slate-500">
                DAW Hub を起動して Ableton Live を操作してください
              </p>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="px-4 py-3 text-slate-500 font-medium">時刻</th>
                      <th className="px-4 py-3 text-slate-500 font-medium">タイプ</th>
                      <th className="px-4 py-3 text-slate-500 font-medium">トラック</th>
                      <th className="px-4 py-3 text-slate-500 font-medium">値</th>
                      <th className="px-4 py-3 text-slate-500 font-medium">セッション</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDawLogs.map((log) => {
                      const actionInfo = actionLabels[log.action || "parameter_change"];
                      return (
                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                            {formatTime(log.ts)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">
                            {(log.metadata as { track_name?: string })?.track_name || `Track ${log.trackId}`}
                            {log.deviceId >= 0 && (
                              <span className="text-slate-500"> / {(log.metadata as { device_name?: string })?.device_name || `Device ${log.deviceId}`}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-white">
                            {(log.metadata as { param_name?: string })?.param_name && (
                              <span className="text-slate-400 text-xs block">
                                {(log.metadata as { param_name?: string })?.param_name}
                              </span>
                            )}
                            <span className="font-medium">{log.valueString}</span>
                          </td>
                          <td className="px-4 py-3">
                            {log.sessionId ? (
                              <Link
                                href={`/dashboard/muednote/sessions/${log.sessionId}`}
                                className="text-indigo-400 hover:text-indigo-300 text-xs"
                              >
                                Linked
                              </Link>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </MuednoteLayout>
  );
}
