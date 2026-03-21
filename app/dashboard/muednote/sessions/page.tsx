import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { GlassCard } from "@/components/ui/glass-card";
import { Mic, Calendar, Clock, ChevronRight, Sliders } from "lucide-react";
import { db } from "@/db";
import { muednoteMobileSessions } from "@/db/schema/muednote-mobile";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { dawSessionMatcher } from "@/lib/services/daw-session-matcher.service";

// Unified session type for rendering
type UnifiedSession =
  | {
      type: "mobile";
      id: string;
      sessionMemo: string | null;
      durationSec: number;
      startedAt: Date;
      createdAt: Date | null;
      status: string | null;
      voiceLogCount: number;
      dawLogCount: number;
    }
  | {
      type: "daw-only";
      id: string;
      startedAt: Date;
      durationSec: number;
      logCount: number;
      daw: string;
    };

/**
 * MUEDnote Sessions List Page
 *
 * Shows mobile sessions + virtual DAW-only sessions in unified timeline
 */
export default async function MuednoteSessionsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch mobile sessions with voice log counts
  const mobileSessions = await db
    .select({
      session: muednoteMobileSessions,
      voiceLogCount: sql<number>`(
        SELECT COUNT(*) FROM muednote_mobile_logs
        WHERE session_id = ${muednoteMobileSessions.id}
      )`,
    })
    .from(muednoteMobileSessions)
    .where(eq(muednoteMobileSessions.userId, user.id))
    .orderBy(desc(muednoteMobileSessions.createdAt))
    .limit(50);

  // Get DAW log counts for mobile sessions
  const sessionIds = mobileSessions.map((s) => s.session.id);
  const dawLogCounts = await dawSessionMatcher.getLogCountsForSessions(
    sessionIds
  );

  // Get virtual DAW-only sessions
  const virtualSessions = await dawSessionMatcher.getVirtualDawSessions(
    user.id
  );

  // Merge into unified list sorted by startedAt desc
  const unified: UnifiedSession[] = [
    ...mobileSessions.map(({ session, voiceLogCount }) => ({
      type: "mobile" as const,
      id: session.id,
      sessionMemo: session.sessionMemo,
      durationSec: session.durationSec,
      startedAt: session.startedAt,
      createdAt: session.createdAt,
      status: session.status,
      voiceLogCount: Number(voiceLogCount),
      dawLogCount: dawLogCounts.get(session.id) ?? 0,
    })),
    ...virtualSessions.map((vs) => ({
      type: "daw-only" as const,
      id: vs.id,
      startedAt: vs.startedAt,
      durationSec: vs.durationSec,
      logCount: vs.logCount,
      daw: vs.daw,
    })),
  ].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const inferMode = (
    durationSec: number
  ): { label: string; color: string } => {
    if (durationSec >= 1350 && durationSec <= 1650) {
      return {
        label: "ポモドーロ",
        color: "bg-emerald-600/20 text-emerald-400",
      };
    }
    if (durationSec >= 2700 && durationSec <= 3300) {
      return { label: "スタンダード", color: "bg-blue-600/20 text-blue-400" };
    }
    if (durationSec >= 4860 && durationSec <= 5940) {
      return {
        label: "ディープワーク",
        color: "bg-purple-600/20 text-purple-400",
      };
    }
    return { label: "カスタム", color: "bg-slate-600/20 text-slate-400" };
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
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          セッション
        </h1>
        <p className="text-slate-400">
          録音セッションとDAW操作の一覧です
        </p>
      </div>

      {/* Sessions List */}
      {unified.length === 0 ? (
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
          {unified.map((item) => {
            if (item.type === "mobile") {
              const mode = inferMode(item.durationSec);
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/muednote/sessions/${item.id}`}
                  className="block"
                >
                  <GlassCard className="cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Mic className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-white truncate">
                              {item.sessionMemo || "無題のセッション"}
                            </h3>
                            <span
                              className={`hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-medium ${mode.color}`}
                            >
                              {mode.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(item.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDuration(item.durationSec)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mic className="w-3 h-3" />
                              {item.voiceLogCount}
                            </span>
                            {item.dawLogCount > 0 && (
                              <span className="flex items-center gap-1 text-amber-400">
                                <Sliders className="w-3 h-3" />
                                {item.dawLogCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span
                          className={`hidden sm:inline-block px-2 py-1 rounded text-xs font-medium ${
                            item.status === "synced"
                              ? "bg-emerald-600/20 text-emerald-400"
                              : item.status === "completed"
                                ? "bg-amber-600/20 text-amber-400"
                                : "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {item.status === "synced"
                            ? "同期済み"
                            : item.status === "completed"
                              ? "完了"
                              : "進行中"}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-500" />
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              );
            }

            // DAW-only virtual session
            return (
              <Link
                key={item.id}
                href={`/dashboard/muednote/sessions/${item.id}`}
                className="block"
              >
                <GlassCard className="cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sliders className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">
                            DAW Activity
                          </h3>
                          <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-amber-600/20 text-amber-400">
                            {item.daw}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(item.startedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDuration(item.durationSec)}
                          </span>
                          <span className="flex items-center gap-1 text-amber-400">
                            <Sliders className="w-3 h-3" />
                            {item.logCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="hidden sm:inline-block px-2 py-1 rounded text-xs font-medium bg-amber-600/20 text-amber-400">
                        DAW のみ
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </MuednoteLayout>
  );
}
