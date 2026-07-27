'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';

type BalanceData = {
  totalCredits: number;
  subscriptionCredits: number;
  packCredits: number;
  /** Launch-bonus packs only. `packCredits` also includes packs the user paid for. */
  bonusCredits: number;
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

  // Bonus packs only — not every pack. #780 removed the subscription gate here so the badge could
  // finally appear, but it keyed on `packCredits`, which also counts packs the user bought. That
  // told anyone who had simply purchased credits that a "Launch bonus" was active. The gate fix was
  // right (people who held the bonus were being told they had nothing); the label just needs to
  // count the thing it names.
  const bonusCredits = data?.bonusCredits ?? 0;
  const purchasedCredits = (data?.packCredits ?? 0) - bonusCredits;
  const hasBonusActive = bonusCredits > 0;

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
              {purchasedCredits > 0 && data.subscriptionCredits > 0 && (
                <span className="mx-2 text-white/20">+</span>
              )}
              {purchasedCredits > 0 && (
                <span>
                  {purchasedCredits.toLocaleString()} {hub.credits.pack}
                </span>
              )}
              {bonusCredits > 0 && (purchasedCredits > 0 || data.subscriptionCredits > 0) && (
                <span className="mx-2 text-white/20">+</span>
              )}
              {bonusCredits > 0 && (
                <span className="text-amber-400/80">
                  {bonusCredits.toLocaleString()} {hub.credits.bonus}
                  {expiryStr && (
                    <span className="ml-1 text-white/30">
                      {hub.credits.exp.replace('{date}', expiryStr)}
                    </span>
                  )}
                </span>
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
