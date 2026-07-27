'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackMuednoteToDialCta } from '@/lib/analytics/gtag';
import { MUEDEAR_APP_STORE_URL } from '@/lib/muedear/constants';

export type SessionProduct = 'dial' | 'muednote' | 'muedear';

export interface UnifiedSession {
  id: string;
  product: SessionProduct;
  status: string;
  displayName: string;
  createdAt: Date | null;
  href: string;
  hasDownload?: boolean;
  daysRemaining?: number | null;
  durationSec?: number | null;
}

interface SessionLedgerProps {
  sessions: UnifiedSession[];
  showDialOnly?: boolean;
}

const STATUS_DOT: Record<string, { symbol: string; color: string }> = {
  completed:  { symbol: '●', color: 'text-amber-400' },
  mixing:     { symbol: '●', color: 'text-blue-400' },
  mastering:  { symbol: '●', color: 'text-blue-400' },
  previewing: { symbol: '●', color: 'text-white/50' },
  uploading:  { symbol: '○', color: 'text-white/30' },
  archived:   { symbol: '○', color: 'text-white/20' },
  note:       { symbol: '○', color: 'text-indigo-400' },
};

const PRODUCT_COLOR: Record<SessionProduct, string> = {
  dial:     'text-amber-400/60',
  muednote: 'text-indigo-400/60',
  muedear:  'text-white/20',
};

const PRODUCT_LABEL: Record<SessionProduct, string> = {
  dial:     'MUEDial',
  muednote: 'MUEDnote',
  muedear:  'MUEDear',
};

function groupByProduct(sessions: UnifiedSession[], dialOnly: boolean): Array<{ product: SessionProduct; items: UnifiedSession[] }> {
  const order: SessionProduct[] = dialOnly ? ['dial'] : ['dial', 'muednote'];
  const groups: Record<string, UnifiedSession[]> = { dial: [], muednote: [] };
  for (const s of sessions) {
    if (groups[s.product]) groups[s.product].push(s);
  }
  return order.filter(p => groups[p].length > 0).map(p => ({ product: p as SessionProduct, items: groups[p] }));
}

// The ledger is a six-column register on a real screen: badge(40) date(110) dot(20)
// name(1fr) status(120) arrow(24). Those fixed tracks plus five 12px gaps come to 374px,
// so on a phone (390px viewport => 342px content box inside `container ... px-6`) there is
// nothing left for the name. Measured on origin/main at 390px before this change: the
// session-name column resolved to 0px wide — every session title was invisible — and the
// MUEDear row, whose text is not truncated, forced the row to 444px and made the whole
// document scroll sideways with the arrow off-screen.
//
// So the six-column register is a >=sm layout. Below that the same cells reflow to two
// lines — name on top, date/dot/status beneath — which is what a phone can actually show.
//
// On why the two rows failed differently (measured at a 342px content box, not reasoned):
//
//   1fr           + truncate ->   0px      1fr           (no truncate) -> 167.8px
//   minmax(0,1fr) + truncate ->   0px      minmax(0,1fr) (no truncate) ->   0px
//
// `truncate` sets `overflow:hidden`, which makes the grid item a scroll container and drops
// its automatic minimum size to 0 — so the session-name cell collapsed *because* it was
// truncated, not despite it. The MUEDear label had no `truncate`, so its min-content floor
// (167.8px) held the track open and pushed the row past the viewport instead. Same cause,
// opposite symptom: one vanished silently, the other overflowed loudly.
// `minmax(0,1fr)` is kept as defence for cells that are not truncated (it is what changes
// 167.8px to 0px above); it does nothing for the truncated ones.
const ROW_CLASS =
  'grid items-center gap-x-3 gap-y-1 grid-cols-[32px_minmax(0,1fr)_16px] ' +
  'sm:gap-y-0 sm:grid-cols-[40px_110px_20px_minmax(0,1fr)_120px_24px]';

function SessionTypeBadge({ product, className = '' }: { product: SessionProduct; className?: string }) {
  if (product === 'dial') {
    return (
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ background: 'rgba(245,165,36,0.15)' }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1"  y="6" width="2.5" height="6"  rx="1" fill="white"/>
          <rect x="5"  y="3" width="2.5" height="12" rx="1" fill="white"/>
          <rect x="9"  y="5" width="2.5" height="8"  rx="1" fill="white"/>
          <rect x="13" y="2" width="2.5" height="14" rx="1" fill="white"/>
          <rect x="17" y="7" width="2.5" height="4"  rx="1" fill="white"/>
        </svg>
      </div>
    );
  }
  if (product === 'muednote') {
    return (
      <div
        className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ background: '#141417' }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 2h9l3 3v11H3V2z" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M12 2v3h3" stroke="white" strokeWidth="1.5" fill="none"/>
          <line x1="6" y1="8"  x2="12" y2="8"  stroke="white" strokeWidth="1.5"/>
          <line x1="6" y1="11" x2="12" y2="11" stroke="white" strokeWidth="1.5"/>
        </svg>
      </div>
    );
  }
  return <span aria-hidden className={className} />;
}

export function SessionLedger({ sessions, showDialOnly = false }: SessionLedgerProps) {
  const { locale, t } = useLocale();
  const hub = t.muednote.dashboardHub;
  const groups = groupByProduct(sessions, showDialOnly);

  const formatDate = (d: Date | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : 'en-CA',
      { year: 'numeric', month: '2-digit', day: '2-digit' }
    );
  };

  return (
    <section className="mb-10">
      <h2 className="dashboard-section-title">{hub.sections.sessions}</h2>

      <div className="border-t border-white/[0.08]">
        {sessions.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-white/40 text-sm mb-4">{hub.sessions.empty}</p>
            <Link
              href="/dial"
              className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
              onClick={() => trackMuednoteToDialCta('empty_state', 'session_ledger')}
            >
              {hub.sessions.startFirst}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {groups.map(({ product, items }) => (
          <div key={product}>
            {/* Product group divider */}
            <div className="flex items-center gap-3 pt-4 pb-2">
              <span className={`text-[10px] font-medium uppercase tracking-widest ${PRODUCT_COLOR[product]}`}>
                {PRODUCT_LABEL[product]}
              </span>
              <div className="flex-1 border-t border-dotted border-white/[0.08]" />
            </div>

            {items.map((session) => {
              const dot = STATUS_DOT[session.status] ?? STATUS_DOT.uploading;
              const statusKey = session.status as keyof typeof t.dial.dashboard.status;
              const statusLabel = product === 'muednote'
                ? hub.sessions.noteStatus
                : (t.dial.dashboard.status[statusKey] ?? session.status);
              const displayName = (product === 'muednote' && !session.displayName)
                ? (session.durationSec
                    ? hub.sessions.durationSession.replace('{duration}', String(Math.round(session.durationSec / 60)))
                    : hub.sessions.practiceSession)
                : session.displayName;

              return (
                <Link
                  key={session.id}
                  href={session.href}
                  className={`group border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors py-3 sm:py-0 ${ROW_CLASS}`}
                >
                  <SessionTypeBadge product={product} className="row-span-2 sm:row-span-1" />
                  {/* The name leads on a phone — it is the only cell that says which session
                      this is. On >=sm it drops back into the register's 4th column. */}
                  <span className="mono text-xs text-white/80 truncate col-start-2 row-start-1 sm:col-start-4">
                    {displayName}
                  </span>
                  {/* date / dot / status share the second line on a phone. `sm:contents`
                      dissolves this wrapper so the three become grid cells again in their
                      original columns — one DOM, no duplicated markup. */}
                  <div className="col-start-2 row-start-2 flex items-center gap-2 min-w-0 sm:contents">
                    <span className="mono text-xs text-white/40 truncate sm:col-start-2 sm:row-start-1 sm:py-3 sm:pl-1">
                      {formatDate(session.createdAt)}
                    </span>
                    <span className={`text-xs shrink-0 ${dot.color} sm:col-start-3 sm:row-start-1 sm:text-center`} aria-hidden>
                      {dot.symbol}
                    </span>
                    <span className={`mono text-xs truncate sm:col-start-5 sm:row-start-1 ${session.status === 'completed' ? 'text-amber-400' : 'text-white/30'}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors justify-self-end mr-1 col-start-3 row-start-1 row-span-2 sm:col-start-6 sm:row-span-1" />
                </Link>
              );
            })}
          </div>
        ))}

        {/* MUEDear — shipped, so this row links out instead of promising a launch. The same deploy's
            landing page already sends people to the App Store; the signed-in view said "coming soon"
            until 2026-07-27, i.e. the people furthest along were the only ones told it wasn't out. */}
        <div>
          <div className="flex items-center gap-3 pt-4 pb-2">
            <span className={`text-[10px] font-medium uppercase tracking-widest ${PRODUCT_COLOR.muedear}`}>
              {PRODUCT_LABEL.muedear}
            </span>
            <div className="flex-1 border-t border-dotted border-white/[0.08]" />
          </div>
          <a
            href={MUEDEAR_APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`group border-b border-white/[0.04] py-3 hover:bg-white/[0.02] transition-colors ${ROW_CLASS}`}
          >
            <span aria-hidden />
            {/* This label is the longest string in the ledger and, unlike the session rows,
                it was never truncated — that is why this row alone forced the whole grid past
                the viewport and wrapped to four lines on a phone. It is also the one row that
                renders for every user, including one with no sessions at all. */}
            <span className="mono text-xs text-white/50 truncate col-start-2 row-start-1 sm:col-start-4">
              {hub.sessions.appStore}
            </span>
            {/* Placeholder date/status only — nothing to say, so this earns no second line on
                a phone. `sm:contents` restores the two cells in the wide register. */}
            <div className="hidden sm:contents">
              <span className="mono text-xs text-white/20 sm:col-start-2 sm:row-start-1 sm:pl-1">—</span>
              <span className="text-xs text-white/20 shrink-0 sm:col-start-3 sm:row-start-1 sm:text-center" aria-hidden>○</span>
              <span className="sm:col-start-5 sm:row-start-1" />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors justify-self-end mr-1 col-start-3 row-start-1 sm:col-start-6" />
          </a>
        </div>

        {/* MUEDlobe profile link */}
        <div className="pt-4 pb-1 flex justify-end">
          <Link
            href="/lobe"
            className="text-xs text-indigo-400/60 hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            {hub.sessions.muedlobeProfile}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
