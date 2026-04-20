'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

export interface LedgerSession {
  id: string;
  mode: string | null;
  status: string;
  musicalStyle: string | null;
  title: string | null;
  createdAt: Date;
  hasDownload: boolean;
  daysRemaining: number | null;
}

interface SessionLedgerProps {
  sessions: LedgerSession[];
}

const STATUS_DOT: Record<string, { symbol: string; color: string }> = {
  completed: { symbol: '●', color: 'text-amber-400' },
  mixing: { symbol: '●', color: 'text-blue-400' },
  mastering: { symbol: '●', color: 'text-blue-400' },
  previewing: { symbol: '●', color: 'text-white/50' },
  uploading: { symbol: '○', color: 'text-white/30' },
  archived: { symbol: '○', color: 'text-white/20' },
};

export function SessionLedger({ sessions }: SessionLedgerProps) {
  const { locale, t } = useLocale();
  const hub = t.muednote.dashboardHub;

  return (
    <section className="mb-10">
      <h2
        className="text-xs font-medium tracking-widest uppercase text-white/40 mb-3"
        style={{ letterSpacing: '0.12em' }}
      >
        {hub.sections.sessions}
      </h2>

      <div className="border-t border-white/[0.08]">
        {sessions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-white/40 text-sm mb-4">{hub.sessions.empty}</p>
            <Link
              href="/dial"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              {hub.sessions.startFirst}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          sessions.map((session) => {
            const dot = STATUS_DOT[session.status] ?? STATUS_DOT.uploading;
            const date = new Date(session.createdAt).toLocaleDateString(
              locale === 'ja' ? 'ja-JP' : 'en-CA', // en-CA gives YYYY-MM-DD
              locale === 'ja'
                ? { year: 'numeric', month: '2-digit', day: '2-digit' }
                : { year: 'numeric', month: '2-digit', day: '2-digit' }
            );
            const shortId = session.id.replace(/-/g, '').slice(0, 8);
            const statusKey = session.status as keyof typeof t.dial.dashboard.status;
            const statusLabel =
              t.dial.dashboard.status[statusKey] ?? session.status;
            const displayName =
              session.title || session.musicalStyle || shortId;

            return (
              <Link
                key={session.id}
                href={`/dial/session/${session.id}`}
                className="group flex items-center gap-0 border-b border-white/[0.05] hover:bg-white/[0.025] transition-colors"
              >
                {/* Date */}
                <span
                  className="w-[7.5rem] flex-shrink-0 py-3 pl-1 text-xs text-white/40 tabular-nums"
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {date}
                </span>

                {/* Status dot */}
                <span
                  className={`w-5 flex-shrink-0 text-center text-xs ${dot.color}`}
                  aria-hidden
                >
                  {dot.symbol}
                </span>

                {/* Product tag */}
                <span className="w-20 flex-shrink-0 text-xs text-white/70 font-normal">
                  MUEDial
                </span>

                {/* Session name / ID */}
                <span
                  className="flex-1 min-w-0 py-3 text-xs text-white/80 truncate"
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {displayName}
                </span>

                {/* Status label */}
                <span
                  className={`w-24 flex-shrink-0 text-xs tabular-nums ${
                    session.status === 'completed'
                      ? 'text-amber-400'
                      : 'text-white/30'
                  }`}
                  style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
                >
                  {statusLabel}
                </span>

                {/* Arrow */}
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mr-1" />
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
