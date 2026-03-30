'use client';

import { useEffect, useState } from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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
};

type Translations = {
  title: string;
  totalCredits: string;
  subscriptionCredits: string;
  packCredits: string;
  noSubscription: string;
  expiresOn: string;
  viewPlans: string;
  buyMore: string;
};

export function CreditBalance({ t }: { t: Translations }) {
  const [data, setData] = useState<BalanceData | null>(null);

  useEffect(() => {
    fetch('/api/dial/credits/balance')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch(() => {});
  }, []);

  if (!data) return null;

  // Find nearest expiry (skip null = no expiry grants)
  const expiringGrant = data.grants.find(g => g.expiresAt !== null);
  const nearestExpiry = expiringGrant
    ? new Date(expiringGrant.expiresAt!).toLocaleDateString()
    : null;

  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-medium text-sm">{t.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dial/pricing"
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {data.subscription ? t.buyMore : t.viewPlans}
          </Link>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-bold text-amber-400">
          {data.totalCredits.toLocaleString()}
        </span>
        <span className="text-sm text-white/40">cr {t.totalCredits}</span>
      </div>

      <div className="flex gap-4 text-xs text-white/40">
        {data.subscriptionCredits > 0 && (
          <span>{t.subscriptionCredits}: {data.subscriptionCredits.toLocaleString()}cr</span>
        )}
        {data.packCredits > 0 && (
          <span>{t.packCredits}: {data.packCredits.toLocaleString()}cr</span>
        )}
      </div>

      {data.subscription ? (
        <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/5">
          <span className="text-xs text-white/50 capitalize">
            {data.subscription.tier}
            {data.subscription.cancelAtPeriodEnd && ' (cancelling)'}
          </span>
          {nearestExpiry && (
            <span className="text-xs text-white/30">
              {t.expiresOn.replace('{date}', nearestExpiry)}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-white/5">
          <Link
            href="/dial/pricing"
            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {t.noSubscription} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
