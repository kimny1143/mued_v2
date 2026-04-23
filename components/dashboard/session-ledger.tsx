'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackMuednoteToDialCta } from '@/lib/analytics/gtag';

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

// grid: badge(40px) date(110px) dot(20px) name(1fr) status(120px) arrow(24px)
const ROW_GRID = '40px 110px 20px 1fr 120px 24px';

function SessionTypeBadge({ product }: { product: SessionProduct }) {
  if (product === 'dial') {
    return (
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
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
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
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
  return <span aria-hidden />;
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
                  className="group grid border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors items-center"
                  style={{ gridTemplateColumns: ROW_GRID, gap: '12px' }}
                >
                  <SessionTypeBadge product={product} />
                  <span className="mono text-xs text-white/40 py-3 pl-1 truncate">
                    {formatDate(session.createdAt)}
                  </span>
                  <span className={`text-center text-xs ${dot.color}`} aria-hidden>
                    {dot.symbol}
                  </span>
                  <span className="mono text-xs text-white/80 truncate">
                    {displayName}
                  </span>
                  <span className={`mono text-xs truncate ${session.status === 'completed' ? 'text-amber-400' : 'text-white/30'}`}>
                    {statusLabel}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors justify-self-end mr-1" />
                </Link>
              );
            })}
          </div>
        ))}

        {/* MUEDear coming soon — always at bottom */}
        <div>
          <div className="flex items-center gap-3 pt-4 pb-2">
            <span className={`text-[10px] font-medium uppercase tracking-widest ${PRODUCT_COLOR.muedear}`}>
              {PRODUCT_LABEL.muedear}
            </span>
            <div className="flex-1 border-t border-dotted border-white/[0.08]" />
          </div>
          <div
            className="grid border-b border-white/[0.04] items-center py-3"
            style={{ gridTemplateColumns: ROW_GRID, gap: '12px' }}
          >
            <span aria-hidden />
            <span className="mono text-xs text-white/20 pl-1">—</span>
            <span className="text-center text-xs text-white/20" aria-hidden>○</span>
            <span className="mono text-xs text-white/25">{hub.sessions.comingSoon}</span>
            <span />
            <span />
          </div>
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
