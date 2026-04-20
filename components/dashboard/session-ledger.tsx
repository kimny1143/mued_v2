'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

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
}

interface SessionLedgerProps {
  sessions: UnifiedSession[];
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

function groupByProduct(sessions: UnifiedSession[]): Array<{ product: SessionProduct; items: UnifiedSession[] }> {
  const order: SessionProduct[] = ['dial', 'muednote'];
  const groups: Record<string, UnifiedSession[]> = { dial: [], muednote: [] };
  for (const s of sessions) {
    if (groups[s.product]) groups[s.product].push(s);
  }
  return order.filter(p => groups[p].length > 0).map(p => ({ product: p as SessionProduct, items: groups[p] }));
}

// grid: date(110px) dot(20px) name(1fr) status(120px) arrow(24px)
const ROW_GRID = '110px 20px 1fr 120px 24px';

export function SessionLedger({ sessions }: SessionLedgerProps) {
  const { locale, t } = useLocale();
  const hub = t.muednote.dashboardHub;
  const groups = groupByProduct(sessions);

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
                ? session.status
                : (t.dial.dashboard.status[statusKey] ?? session.status);

              return (
                <Link
                  key={session.id}
                  href={session.href}
                  className="group grid border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors items-center"
                  style={{ gridTemplateColumns: ROW_GRID, gap: '12px' }}
                >
                  <span className="mono text-xs text-white/40 py-3 pl-1 truncate">
                    {formatDate(session.createdAt)}
                  </span>
                  <span className={`text-center text-xs ${dot.color}`} aria-hidden>
                    {dot.symbol}
                  </span>
                  <span className="mono text-xs text-white/80 truncate">
                    {session.displayName}
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
