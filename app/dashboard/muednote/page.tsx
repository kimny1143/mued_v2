import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Mic, Clock, FileText, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { muednoteMobileSessions, muednoteMobileLogs } from "@/db/schema/muednote-mobile";
import { eq, desc, sql } from "drizzle-orm";

/**
 * MUEDnote Dashboard - Main Page
 *
 * UX Psychology:
 * - Progress indication (stats cards)
 * - Clear onboarding path (numbered steps)
 * - Empty state with actionable guidance
 */
export default async function MuednoteDashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch real stats from DB
  const sessionsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(muednoteMobileSessions)
    .where(eq(muednoteMobileSessions.userId, user.id));

  const logsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(muednoteMobileLogs)
    .innerJoin(
      muednoteMobileSessions,
      eq(muednoteMobileLogs.sessionId, muednoteMobileSessions.id)
    )
    .where(eq(muednoteMobileSessions.userId, user.id));

  const durationResult = await db
    .select({ total: sql<number>`COALESCE(SUM(duration_sec), 0)` })
    .from(muednoteMobileSessions)
    .where(eq(muednoteMobileSessions.userId, user.id));

  const recentSessions = await db
    .select()
    .from(muednoteMobileSessions)
    .where(eq(muednoteMobileSessions.userId, user.id))
    .orderBy(desc(muednoteMobileSessions.createdAt))
    .limit(3);

  const sessionCount = Number(sessionsResult[0]?.count) || 0;
  const logCount = Number(logsResult[0]?.count) || 0;
  const totalMinutes = Math.floor(Number(durationResult[0]?.total) / 60) || 0;

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

  return (
    <MuednoteLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          ようこそ、{user.firstName || user.username || "クリエイター"}さん
        </h1>
        <p className="text-slate-400">
          あなたの判断を記録し、資産にしましょう。
        </p>
      </div>

      {/* Stats Grid - Responsive: 1col mobile, 3col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
        <GlassCard hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
              <Mic className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{sessionCount}</p>
              <p className="text-sm text-slate-400">セッション</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{logCount}</p>
              <p className="text-sm text-slate-400">判断ログ</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600/20 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{totalMinutes}分</p>
              <p className="text-sm text-slate-400">総記録時間</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Getting Started */}
      <GlassCard className="mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">
              はじめましょう
            </h2>
            <p className="text-slate-400 mb-4">
              MUEDnote iOSアプリで録音を開始すると、ここにセッションが表示されます。
              音声は自動で文字起こしされ、判断ログとして蓄積されます。
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-slate-300">
                <span className="w-6 h-6 bg-indigo-600/30 rounded-full flex items-center justify-center text-xs text-indigo-400">1</span>
                iOSアプリをインストール
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-slate-300">
                <span className="w-6 h-6 bg-indigo-600/30 rounded-full flex items-center justify-center text-xs text-indigo-400">2</span>
                セッションを開始
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg text-sm text-slate-300">
                <span className="w-6 h-6 bg-indigo-600/30 rounded-full flex items-center justify-center text-xs text-indigo-400">3</span>
                判断を声で記録
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Recent Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">最近のセッション</h2>
          <Link
            href="/dashboard/muednote/sessions"
            className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            すべて見る
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <GlassCard hover={false}>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-2">まだセッションがありません</p>
              <p className="text-sm text-slate-500">
                iOSアプリで録音を開始すると、ここに表示されます
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <GlassCard key={session.id} className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mic className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {session.sessionMemo || "無題のセッション"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {formatDate(session.createdAt)} · {formatDuration(session.durationSec)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </MuednoteLayout>
  );
}
