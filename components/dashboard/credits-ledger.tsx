'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackMuednoteToDialCta } from '@/lib/analytics/gtag';

type BalanceData = {
  totalCredits: number;
  subscriptionCredits: number;
  packCredits: number;
  subscription: {
    tier: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  grants: Array<{
    creditsRemaining: number;
    expiresAt: string | null;
  }>;
  packs: Array<{
    creditsRemaining: number;
    expiresAt: string | null;
  }>;
};

export function CreditsLedger() {
  const { locale, t } = useLocale();
  const hub = t.muednote.dashboardHub;
  const [data, setData] = useState<BalanceData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/dial/credits/balance', { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((e) => { if (e?.name !== 'AbortError') console.error(e); });
    return () => controller.abort();
  }, []);

  const hasBonusActive = data
    ? data.packCredits > 0 && !!data.subscription
    : false;

  // Nearest pack expiry
  const nearestPackExpiry = data?.packs
    .filter((p) => p.expiresAt !== null)
    .map((p) => new Date(p.expiresAt!))
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

  const expiryStr = nearestPackExpiry
    ? nearestPackExpiry.toLocaleDateString(
        locale === 'ja' ? 'ja-JP' : 'en-CA',
        locale === 'ja'
          ? { year: 'numeric', month: '2-digit', day: '2-digit' }
          : { year: 'numeric', month: '2-digit', day: '2-digit' }
      )
    : null;

  return (
    <section className="mb-10">
      <h2 className="dashboard-section-title">{hub.sections.credits}</h2>

      <div className="border-t border-white/[0.08] pt-4 pb-2">
        {!data ? (
          <p
            className="text-xs text-white/30 tabular-nums"
            style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
          >
            —
          </p>
        ) : (
          <div className="space-y-2">
            {/* Total credits */}
            <div className="flex items-baseline gap-3">
              <span className="credit-total">
                {data.totalCredits.toLocaleString()}
              </span>
              <span className="text-xs text-white/40">cr</span>
              <Link
                href="/dial/pricing"
                className="ml-auto text-xs text-white/30 hover:text-amber-400 transition-colors"
                onClick={() => trackMuednoteToDialCta('buy_more', 'credits_ledger')}
              >
                {hub.credits.buyMore}
              </Link>
            </div>

            {/* Breakdown line */}
            <div
              className="text-xs text-white/40 tabular-nums"
              style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
            >
              {data.subscriptionCredits > 0 && (
                <span>
                  {data.subscriptionCredits.toLocaleString()} {hub.credits.sub}
                </span>
              )}
              {data.packCredits > 0 && data.subscriptionCredits > 0 && (
                <span className="mx-2 text-white/20">+</span>
              )}
              {data.packCredits > 0 && (
                <span className={hasBonusActive ? 'text-amber-400/80' : ''}>
                  {data.packCredits.toLocaleString()} {hub.credits.bonus}
                  {expiryStr && (
                    <span className="ml-1 text-white/30">
                      {hub.credits.exp.replace('{date}', expiryStr)}
                    </span>
                  )}
                </span>
              )}
              {!data.subscription && (
                <Link
                  href="/dial/pricing"
                  className="text-amber-400/70 hover:text-amber-400 transition-colors"
                  onClick={() => trackMuednoteToDialCta('no_sub', 'credits_ledger')}
                >
                  {hub.credits.noSub}
                </Link>
              )}
            </div>

            {/* Subscription tier */}
            {data.subscription && (
              <p className="text-xs text-white/30 capitalize">
                {data.subscription.tier}
                {data.subscription.cancelAtPeriodEnd && ` ${hub.credits.cancelling}`}
              </p>
            )}

            {/* Bonus active badge */}
            {hasBonusActive && (
              <p className="text-xs text-amber-400/70 flex items-center gap-1.5">
                <span className="text-amber-400">●</span>
                {hub.credits.bonusActive}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
