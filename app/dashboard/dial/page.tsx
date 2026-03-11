import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { dialSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Headphones, Music, Clock, CheckCircle, Loader2, Upload, ArrowRight } from "lucide-react";

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
      tasks: { columns: { id: true, taskType: true, status: true } },
    },
  });

  const sessions = rawSessions.map((s) => ({
    id: s.id,
    mode: s.mode,
    status: s.status,
    musicalStyle: s.musicalStyle,
    title: s.title,
    createdAt: s.createdAt,
    trackCount: s.tracks.length,
    hasFinal: s.tasks.some(
      (t) => (t.taskType === "final_basic" || t.taskType === "final_advanced") && t.status === "completed"
    ),
  }));

  return (
    <div>
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
                    <span className="text-white font-medium truncate">
                      {session.title || session.musicalStyle}
                    </span>
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
                  </div>
                </div>
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
