import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { MuednoteLayout } from "@/components/layouts/muednote-layout";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Mic,
  Calendar,
  Clock,
  ArrowLeft,
  MessageSquare,
  Sliders,
  Volume2,
} from "lucide-react";
import { db } from "@/db";
import {
  muednoteMobileSessions,
  muednoteMobileLogs,
} from "@/db/schema/muednote-mobile";
import { eq, and, asc } from "drizzle-orm";
import Link from "next/link";
import { dawSessionMatcher } from "@/lib/services/daw-session-matcher.service";
import { SessionLogTabs } from "./session-log-tabs";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * MUEDnote Session Detail Page
 *
 * セッションの詳細と思考ログ・DAWログを表示
 * UX Psychology:
 * - 時系列でログを表示し、思考の流れを可視化
 * - 実時間を表示（予定時間ではなく）
 * - DAWログと音声ログを統合表示
 */
export default async function MuednoteSessionDetailPage({ params }: PageProps) {
  const user = await currentUser();
  const { id } = await params;

  if (!user) {
    redirect("/sign-in");
  }

  // セッション取得
  const session = await db.query.muednoteMobileSessions.findFirst({
    where: and(
      eq(muednoteMobileSessions.id, id),
      eq(muednoteMobileSessions.userId, user.id)
    ),
  });

  if (!session) {
    notFound();
  }

  // 音声ログ取得（時系列順）
  const voiceLogs = await db
    .select()
    .from(muednoteMobileLogs)
    .where(eq(muednoteMobileLogs.sessionId, id))
    .orderBy(asc(muednoteMobileLogs.timestampSec));

  // DAWログ取得（時間マッチング）
  const dawLogs = await dawSessionMatcher.getLogsForSession(id);
  const dawStats = await dawSessionMatcher.getStatsForSession(id);

  // 実時間計算（ended_at - started_at）
  const actualDurationSec = session.endedAt
    ? Math.floor(
        (session.endedAt.getTime() - session.startedAt.getTime()) / 1000
      )
    : null;

  // モード推定（選択した予定時間から）
  const inferMode = (durationSec: number): { label: string; color: string } => {
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

  const mode = inferMode(session.durationSec);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <MuednoteLayout>
      {/* Back Link */}
      <Link
        href="/dashboard/muednote/sessions"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>セッション一覧に戻る</span>
      </Link>

      {/* Session Header */}
      <GlassCard className="mb-6" hover={false}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Mic className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl md:text-2xl font-bold text-white truncate">
                {session.sessionMemo || "無題のセッション"}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${mode.color}`}
              >
                {mode.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(session.startedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {actualDurationSec !== null ? (
                  <>
                    <span className="text-white">
                      {formatDuration(actualDurationSec)}
                    </span>
                    <span className="text-slate-500">
                      （予定: {formatDuration(session.durationSec)}）
                    </span>
                  </>
                ) : (
                  <span className="text-amber-400">進行中</span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {voiceLogs.length}件
              </span>
              {dawStats.totalLogs > 0 && (
                <span className="flex items-center gap-1">
                  <Sliders className="w-4 h-4" />
                  {dawStats.totalLogs}件
                </span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Logs Section with Tabs */}
      <SessionLogTabs
        voiceLogs={voiceLogs.map((log) => ({
          id: log.id,
          timestampSec: log.timestampSec,
          text: log.text,
          confidence: log.confidence,
        }))}
        dawLogs={dawLogs.map((log) => ({
          id: log.id,
          relativeTimeSec: log.relativeTimeSec,
          action: log.action,
          trackId: log.trackId,
          deviceId: log.deviceId,
          paramId: log.paramId,
          valueString: log.valueString,
        }))}
        dawStats={dawStats}
      />
    </MuednoteLayout>
  );
}
