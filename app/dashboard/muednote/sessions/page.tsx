import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Mic, Calendar, Clock, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { muednoteMobileSessions, muednoteMobileLogs } from "@/db/schema/muednote-mobile";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";

/**
 * MUEDnote Sessions List Page
 *
 * UX Psychology:
 * - Visual hierarchy with status badges
 * - Scannable list with consistent layout
 * - Empty state with clear guidance
 */
export default async function MuednoteSessionsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch sessions with log counts
  const sessions = await db
    .select({
      session: muednoteMobileSessions,
      logCount: sql<number>`(
        SELECT COUNT(*) FROM muednote_mobile_logs
        WHERE session_id = ${muednoteMobileSessions.id}
      )`,
    })
    .from(muednoteMobileSessions)
    .where(eq(muednoteMobileSessions.userId, user.id))
    .orderBy(desc(muednoteMobileSessions.createdAt))
    .limit(50);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <MuednoteLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">セッション</h1>
        <p className="text-slate-400">
          録音したセッションの一覧です。タップして詳細を確認できます。
        </p>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <GlassCard hover={false}>
          <div className="text-center py-12">
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
          {sessions.map(({ session, logCount }) => (
            <Link
              key={session.id}
              href={`/dashboard/muednote/sessions/${session.id}`}
              className="block"
            >
              <GlassCard className="cursor-pointer">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mic className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white mb-1 truncate">
                        {session.sessionMemo || "無題のセッション"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDuration(session.durationSec)}
                        </span>
                        <span className="text-slate-500">
                          {Number(logCount)}件のログ
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={`hidden sm:inline-block px-2 py-1 rounded text-xs font-medium ${
                        session.status === "synced"
                          ? "bg-emerald-600/20 text-emerald-400"
                          : session.status === "completed"
                          ? "bg-amber-600/20 text-amber-400"
                          : "bg-slate-600/20 text-slate-400"
                      }`}
                    >
                      {session.status === "synced"
                        ? "同期済み"
                        : session.status === "completed"
                        ? "完了"
                        : "進行中"}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}
    </MuednoteLayout>
  );
}
