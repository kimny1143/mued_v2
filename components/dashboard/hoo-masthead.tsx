'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackMuednoteToDialCta } from '@/lib/analytics/gtag';

type BalanceSummary = {
  totalCredits: number;
  subscriptionCredits: number;
  packCredits: number;
  hasSubscription: boolean;
};

export function HooMasthead() {
  const { t } = useLocale();
  const [balance, setBalance] = useState<BalanceSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      fetch('/api/dial/credits/balance', { signal: controller.signal })
        .then((r) => r.json())
        .then((res) => {
          if (res.success) {
            setBalance({
              totalCredits: res.data.totalCredits,
              subscriptionCredits: res.data.subscriptionCredits,
              packCredits: res.data.packCredits,
              hasSubscription: !!res.data.subscription,
            });
          }
        })
        .catch((e) => { if (e?.name !== 'AbortError') console.error(e); });
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => { controller.abort(); clearInterval(id); };
  }, []);

  // ★Credits, not subscription. MUEDial has had no purchasable subscription since Hoo Pass was
  // retired (2026-07, #650), so `hasSubscription` is false for every user — which meant this line
  // returned "サブスク未加入" to everyone and the two credit branches below were unreachable.
  // Worse, the launch bonus IS being granted (lib/dial/bonus-campaign.ts, 400cr), so the people who
  // received it were the ones told they had nothing. The balance is what the user has; show that.
  const statusLine = () => {
    if (!balance) return t.muednote.dashboardHub.hoo.statusLoading;
    const total = balance.totalCredits.toLocaleString();
    if (balance.packCredits > 0) {
      return t.muednote.dashboardHub.hoo.statusBonus
        .replace('{total}', total)
        .replace('{bonus}', balance.packCredits.toLocaleString());
    }
    // 0cr shows as "Hoo: 0cr" rather than being hidden: it is the true balance, it reads the same as
    // any other balance, and hiding it would leave the masthead silently different for some users.
    return t.muednote.dashboardHub.hoo.statusCredits.replace('{total}', total);
  };

  const hasBonusActive = (balance?.packCredits ?? 0) > 0;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/dial"
        className="flex items-center gap-2 group"
        onClick={() => trackMuednoteToDialCta('masthead', 'hoo_masthead')}
      >
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image
            src="/images/hoo-icon.webp"
            alt="Hoo"
            fill
            className="object-contain rounded-full"
            sizes="32px"
          />
        </div>
        <span
          className={`text-xs font-mono tabular-nums whitespace-nowrap transition-colors ${
            hasBonusActive
              ? 'text-amber-400'
              : 'text-white/50 group-hover:text-white/80'
          }`}
          style={{ fontFamily: 'var(--font-jetbrains), monospace' }}
        >
          {statusLine()}
        </span>
      </Link>
    </div>
  );
}
