import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { dialSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Headphones, Music, Clock, CheckCircle, Loader2, Upload, ArrowRight, Download } from "lucide-react";
import { SessionTitle } from "./session-title";
import { CreditBalance } from "./credit-balance";

const STATUS_ICONS = {
  uploading: { icon: Upload, color: "text-white/60" },
  previewing: { icon: Loader2, color: "text-blue-400" },
  mixing: { icon: Loader2, color: "text-amber-400" },
  mastering: { icon: Loader2, color: "text-purple-400" },
  completed: { icon: CheckCircle, color: "text-green-400" },
  archived: { icon: Clock, color: "text-white/40" },
} as const;

export default async function DialDashboardPage() {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value ?? 'en') as 'en' | 'ja';
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const t = messages;

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const rawSessions = await db.query.dialSessions.findMany({
    where: eq(dialSessions.userId, user.id),
    orderBy: [desc(dialSessions.createdAt)],
    with: {
      tracks: { columns: { id: true } },
      tasks: { columns: { id: true, taskType: true, status: true, r2FinalUrl: true, r2ExpiresAt: true } },
    },
  });

  const now = new Date();
  const sessions = rawSessions.map((s) => {
    const downloadableTasks = s.tasks.filter(
      (t) => t.r2FinalUrl && t.r2ExpiresAt && t.status === "completed"
        && (t.taskType === "final_basic" || t.taskType === "final_advanced" || t.taskType === "mastering"),
    );
    const earliestExpiry = downloadableTasks.length > 0
      ? downloadableTasks.reduce((min, t) => {
          const exp = new Date(t.r2ExpiresAt!);
          return exp < min ? exp : min;
        }, new Date(downloadableTasks[0].r2ExpiresAt!))
      : null;
    const daysRemaining = earliestExpiry
      ? Math.ceil((earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
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
        (t) => (t.taskType === "final_basic" || t.taskType === "final_advanced") && t.status === "completed",
      ),
      hasDownload: downloadableTasks.length > 0,
      daysRemaining,
      downloadTaskIds: downloadableTasks.map((t) => t.id),
    };
  });

  return (
    <div>
      <CreditBalance t={t.dial.creditsBalance} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.dial.dashboard.mixHistory}</h1>
          <p className="text-white/60 text-sm mt-1">
            {sessions.length > 0
              ? `${sessions.length} ${t.dial.dashboard.sessions}`
              : t.dial.dashboard.noSessionsYet}
          </p>
        </div>
        <Link
          href="/dial"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors text-sm"
        >
          <Headphones className="w-4 h-4" />
          {t.dial.dashboard.newSession}
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/60 mb-6">
            {t.dial.dashboard.uploadStemsPrompt}
          </p>
          <Link
            href="/dial"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
          >
            {t.dial.dashboard.startFirstMix}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const statusKey = session.status as keyof typeof STATUS_ICONS;
            const status = STATUS_ICONS[statusKey] ?? STATUS_ICONS.uploading;
            const StatusIcon = status.icon;
            const date = new Date(session.createdAt);
            const dateStr = date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const statusLabel = t.dial.dashboard.status[statusKey] ?? t.dial.dashboard.status.uploading;
            const modeLabel = session.mode
              ? (t.dial.dashboard.mode[session.mode as keyof typeof t.dial.dashboard.mode] ?? session.mode)
              : t.dial.dashboard.mode.mastering;

            return (
              <Link
                key={session.id}
                href={`/dial/session/${session.id}`}
                className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl transition-colors group"
              >
                <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Headphones className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <SessionTitle
                      sessionId={session.id}
                      currentTitle={session.title || ""}
                      placeholder={session.musicalStyle || "Untitled"}
                    />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60 flex-shrink-0">
                      {modeLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                    <span>{dateStr}</span>
                    <span>{session.trackCount} {t.dial.dashboard.tracks}</span>
                    {session.hasFinal && (
                      <span className="text-green-500">{t.dial.dashboard.finalReady}</span>
                    )}
                    {session.hasDownload && session.daysRemaining !== null && (
                      session.daysRemaining > 7
                        ? <span className="text-white/50">
                            {t.dial.dashboard.expiresIn.replace("{days}", String(session.daysRemaining))}
                          </span>
                        : session.daysRemaining > 0
                          ? <span className="text-amber-400 font-medium">
                              {t.dial.dashboard.expiresSoon.replace("{days}", String(session.daysRemaining))}
                            </span>
                          : <span className="text-red-400">
                              {t.dial.dashboard.expired}
                            </span>
                    )}
                  </div>
                </div>
                {session.hasDownload && session.daysRemaining !== null && session.daysRemaining > 0 && (
                  <span
                    className="flex items-center gap-1 px-2.5 py-1 bg-green-500/10 text-green-400 text-xs rounded-md flex-shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    {t.dial.dashboard.downloadReady}
                  </span>
                )}
                <div className={`flex items-center gap-1.5 text-xs ${status.color} flex-shrink-0`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${session.status === "previewing" || session.status === "mixing" ? "animate-spin" : ""}`} />
                  {statusLabel}
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
