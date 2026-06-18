'use client';

/**
 * /dial/sessions — dial-scoped session history (PWA Phase 0.5).
 *
 * Lets a signed-in user list and resume their MUEDial sessions from inside the
 * dial.mued.jp surface (same-origin → the installed PWA never leaves to Safari).
 * Positioning: this is the signed-in / returning-user surface; guests reach their
 * single session via their session link (out of scope here).
 *
 * NOTE: we render a lean, dial-only list rather than reusing <SessionLedger>, because
 * SessionLedger unconditionally renders cross-product chrome (MUEDear "coming soon" +
 * a /lobe link that is cross-origin from dial.mued.jp and would leave the PWA).
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, SignInButton } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';
import type { UnifiedSession } from '@/components/dashboard/session-ledger';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; sessions: UnifiedSession[] };

const STATUS_DOT: Record<string, string> = {
  completed: 'text-amber-400',
  uploading: 'text-white/30',
  previewing: 'text-indigo-400',
  mix_review: 'text-indigo-400',
  mix_final: 'text-indigo-400',
  mastering_review: 'text-indigo-400',
  mastered_final: 'text-amber-400',
};

function SessionRow({ session, statusLabel }: { session: UnifiedSession; statusLabel: string }) {
  const dotColor = STATUS_DOT[session.status] ?? 'text-white/30';
  const date = session.createdAt
    ? new Date(session.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
    : '—';
  return (
    <Link
      href={session.href}
      className="group flex items-center gap-3 px-3 py-3.5 border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors min-h-[44px]"
    >
      <span className={`text-xs ${dotColor}`} aria-hidden>
        ●
      </span>
      <span className="mono text-xs text-white/40 w-[88px] shrink-0 tabular-nums">{date}</span>
      <span className="flex-1 min-w-0 truncate text-sm text-white/85">{session.displayName}</span>
      {session.hasDownload && typeof session.daysRemaining === 'number' && (
        <span className="mono text-[10px] text-amber-400/80 shrink-0 whitespace-nowrap">
          ↓ {session.daysRemaining}d
        </span>
      )}
      <span className={`mono text-[11px] shrink-0 truncate max-w-[96px] ${session.status === 'completed' ? 'text-amber-400' : 'text-white/35'}`}>
        {statusLabel}
      </span>
      <span className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" aria-hidden>
        →
      </span>
    </Link>
  );
}

export default function DialSessionsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { t } = useLocale();
  const s = t.dial.history;
  const statusMap = t.dial.dashboard.status as Record<string, string>;
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = await getToken();
      const res = await fetch('/api/dial/sessions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setState({ kind: 'ready', sessions: (data.sessions ?? []) as UnifiedSession[] });
    } catch {
      setState({ kind: 'error' });
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) load();
  }, [isLoaded, isSignedIn, load]);

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dial" className="text-sm text-zinc-400 hover:text-white transition-colors shrink-0">
            ← {s.back}
          </Link>
          <div className="flex-1 text-center">
            <span className="text-sm font-semibold">{s.title}</span>
          </div>
          <span className="w-[64px] shrink-0" aria-hidden />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {!isLoaded && <p className="text-sm text-white/40 py-12 text-center">{s.loading}</p>}

        {isLoaded && !isSignedIn && (
          <div className="py-12 text-center">
            <p className="text-base font-medium text-white mb-2">{s.signInTitle}</p>
            <p className="text-sm text-white/50 mb-6 max-w-sm mx-auto">{s.signInBody}</p>
            <SignInButton mode="modal">
              <button className="px-5 py-2.5 bg-amber-400 text-black font-semibold rounded-[var(--radius-md)] hover:bg-amber-300 transition-colors cursor-pointer">
                {s.signInCta}
              </button>
            </SignInButton>
            <p className="text-xs text-white/30 mt-6 max-w-sm mx-auto">{s.guestNote}</p>
          </div>
        )}

        {isLoaded && isSignedIn && state.kind === 'loading' && (
          <p className="text-sm text-white/40 py-12 text-center">{s.loading}</p>
        )}

        {isLoaded && isSignedIn && state.kind === 'error' && (
          <div className="py-12 text-center">
            <p className="text-sm text-white/50 mb-4">{s.error}</p>
            <button
              onClick={load}
              className="px-4 py-2 text-sm border border-white/15 rounded-[var(--radius-md)] text-white/80 hover:bg-white/5 transition-colors cursor-pointer"
            >
              {s.retry}
            </button>
          </div>
        )}

        {isLoaded && isSignedIn && state.kind === 'ready' && state.sessions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-white/40 mb-4">{s.empty}</p>
            <Link
              href="/dial"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              {s.emptyCta} →
            </Link>
          </div>
        )}

        {isLoaded && isSignedIn && state.kind === 'ready' && state.sessions.length > 0 && (
          <div className="border-t border-white/[0.06]">
            {state.sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                statusLabel={statusMap[session.status] ?? session.status}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
