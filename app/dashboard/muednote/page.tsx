import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { Mic, Clock, ArrowRight } from "lucide-react";
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
      {/* Hero: iOS-First Messaging */}
      <div className="mb-12 lg:mb-16">
        <p className="text-indigo-400/80 text-sm mb-3">
          ようこそ、{user.firstName || user.username || "クリエイター"}さん
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
          「なぜそうしたか」を、残しておこう。
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-lg mb-8">
          制作中の判断は、iPhoneアプリで声で残す。<br className="hidden sm:block" />
          このページでは、その記録を振り返れます。
        </p>

        {/* iOS App Store Badge - Official Style */}
        <a
          href="https://apps.apple.com/app/muednote"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <div className="bg-black hover:bg-zinc-900 text-white px-4 py-2.5 rounded-xl inline-flex items-center gap-3 transition-colors border border-white/10">
            {/* Apple Logo SVG */}
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

      {/* Two-Column Asymmetric Layout */}
      <div className="grid lg:grid-cols-[1fr,280px] gap-8 lg:gap-12">
        {/* Left: Recent Sessions (Primary) */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">あなたの記録</h2>
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
                <div
                  key={session.id}
                  className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-xl p-4 transition-colors cursor-pointer"
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Stats (Secondary, smaller) */}
        <div className="lg:pt-12">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">統計</p>
          <div className="space-y-3">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg px-4 py-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-white">{sessionCount}</span>
                <span className="text-sm text-slate-500">セッション</span>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2.5">
                <p className="text-lg font-semibold text-white">{logCount}</p>
                <p className="text-xs text-slate-500">ログ数</p>
              </div>
              <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2.5">
                <p className="text-lg font-semibold text-white">{totalMinutes}<span className="text-xs font-normal text-slate-500">分</span></p>
                <p className="text-xs text-slate-500">録音時間</p>
              </div>
            </div>
          </div>

          {/* Subtle hint */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-xs text-slate-600 leading-relaxed">
              📱 アプリで録音 → 自動文字起こし → ここで閲覧
            </p>
          </div>
        </div>
      </div>
    </MuednoteLayout>
  );
}
