'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';

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
    const load = () => {
      fetch('/api/dial/credits/balance')
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
        .catch(() => {});
    };
    load();
    // Refresh every 5 minutes (Phase 2: tighten to 1min with user activity detection)
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const statusLine = () => {
    if (!balance) return t.muednote.dashboardHub.hoo.statusLoading;
    if (!balance.hasSubscription) return t.muednote.dashboardHub.hoo.statusNoSub;
    const total = balance.totalCredits.toLocaleString();
    if (balance.packCredits > 0) {
      return t.muednote.dashboardHub.hoo.statusBonus
        .replace('{total}', total)
        .replace('{bonus}', balance.packCredits.toLocaleString());
    }
    return t.muednote.dashboardHub.hoo.statusCredits.replace('{total}', total);
  };

  const hasBonusActive = balance?.hasSubscription && (balance?.packCredits ?? 0) > 0;

  return (
    <div className="flex items-center gap-2">
      <Link href="/dial/pricing" className="flex items-center gap-2 group">
        <div className="relative w-8 h-8 flex-shrink-0">
          <Image
            src="/images/hoo-icon.png"
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
