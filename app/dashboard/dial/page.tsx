import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { dialSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Headphones, Music, Clock, CheckCircle, Loader2, Upload, ArrowRight } from "lucide-react";

const STATUS_CONFIG = {
  uploading: { label: "Uploading", icon: Upload, color: "text-slate-400" },
  previewing: { label: "Previewing", icon: Loader2, color: "text-blue-400" },
  mixing: { label: "Mixing", icon: Loader2, color: "text-amber-400" },
  mastering: { label: "Mastering", icon: Loader2, color: "text-purple-400" },
  completed: { label: "Completed", icon: CheckCircle, color: "text-green-400" },
  archived: { label: "Archived", icon: Clock, color: "text-slate-500" },
} as const;

const MODE_LABELS: Record<string, string> = {
  omakase: "Omakase",
  dialogue: "Dialogue",
};

export default async function DialDashboardPage() {
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
          <h1 className="text-2xl font-bold text-white">Mix History</h1>
          <p className="text-slate-400 text-sm mt-1">
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`
              : "No sessions yet"}
          </p>
        </div>
        <Link
          href="/dial"
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors text-sm"
        >
          <Headphones className="w-4 h-4" />
          New Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400 mb-6">
            Upload your stems and let AI mix your track.
          </p>
          <Link
            href="/dial"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors"
          >
            Start Your First Mix
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const status = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.uploading;
            const StatusIcon = status.icon;
            const date = new Date(session.createdAt);
            const dateStr = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 flex-shrink-0">
                      {session.mode ? MODE_LABELS[session.mode] : 'Mastering'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>{dateStr}</span>
                    <span>{session.trackCount} tracks</span>
                    {session.hasFinal && (
                      <span className="text-green-500">Final ready</span>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 text-xs ${status.color} flex-shrink-0`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${session.status === "previewing" || session.status === "mixing" ? "animate-spin" : ""}`} />
                  {status.label}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
