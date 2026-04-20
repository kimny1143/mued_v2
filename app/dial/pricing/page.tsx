'use client';

import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { useUser } from '@clerk/nextjs';
import { Check, Zap, CreditCard, ArrowRight, AlertCircle } from 'lucide-react';
import {
  DIAL_SUB_PLANS,
  DIAL_CREDIT_PACKS,
  DIAL_SINGLE_PRICES,
  DIAL_CREDIT_COSTS,
  type DialSubTier,
  type DialCreditPackSize,
} from '@/lib/dial/pricing';
import Link from 'next/link';

const TIER_ORDER: DialSubTier[] = ['basic', 'pro', 'studio'];

const TIER_BADGES: Record<DialSubTier, { labelKey: 'popular' | 'bestValue' | null }> = {
  basic: { labelKey: null },
  pro: { labelKey: 'popular' },
  studio: { labelKey: 'bestValue' },
};

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function DialPricingPage() {
  const { t } = useLocale();
  const { isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const p = t.dial.pricing;

  const utmParams = {
    utmSource: searchParams.get('utm_source') ?? undefined,
    utmMedium: searchParams.get('utm_medium') ?? undefined,
    utmCampaign: searchParams.get('utm_campaign') ?? undefined,
  };

  const clearError = useCallback(() => {
    if (error) setTimeout(() => setError(null), 5000);
  }, [error]);

  async function handleSubscribe(tier: DialSubTier) {
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch('/api/dial/checkout/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, ...utmParams }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error?.message || 'Checkout failed. Please try again.');
        clearError();
      }
    } catch {
      setError('Network error. Please try again.');
      clearError();
    } finally {
      setLoading(null);
    }
  }

  async function handleBuyCreditPack(packSize: DialCreditPackSize) {
    setLoading(packSize);
    setError(null);
    try {
      const res = await fetch('/api/dial/checkout/credit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSize, ...utmParams }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data.error?.message || 'Checkout failed. Please try again.');
        clearError();
      }
    } catch {
      setError('Network error. Please try again.');
      clearError();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur-md border-b border-white/5">
        <Link href="/dial" className="flex items-center gap-2 text-amber-400 font-bold text-lg">
          MUEDial
        </Link>
        <div className="flex items-center gap-4">
          {isSignedIn ? (
            <Link href="/dashboard" className="text-sm text-white/60 hover:text-white transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/sign-in" className="text-sm text-white/60 hover:text-white transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Error toast */}
      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-red-500/90 backdrop-blur-sm text-white text-sm rounded-xl shadow-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-3">{p.title}</h1>
          <p className="text-white/60 text-lg">{p.subtitle}</p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {TIER_ORDER.map((tier) => {
            const plan = DIAL_SUB_PLANS[tier];
            const badge = TIER_BADGES[tier];
            const isHighlighted = tier === 'pro';
            const perCredit = (plan.priceUsdCents / plan.credits).toFixed(3);

            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-6 border transition-all ${
                  isHighlighted
                    ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {badge.labelKey && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      tier === 'pro' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-black'
                    }`}>
                      {p[badge.labelKey]}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold capitalize mb-1">{tier}</h3>
                  <p className="text-sm text-white/50">
                    {p[`${tier}Desc` as keyof typeof p]}
                  </p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{formatUsd(plan.priceUsdCents)}</span>
                    <span className="text-white/40">/{p.monthly}</span>
                  </div>
                </div>

                <div className="mb-6 py-4 border-t border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{p.credits}</span>
                    <span className="text-lg font-semibold text-amber-400">
                      {plan.credits.toLocaleString()}cr
                    </span>
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    ${perCredit} {p.perCredit}
                  </div>
                </div>

                <button
                  onClick={() => handleSubscribe(tier)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
                    isHighlighted
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  } disabled:opacity-50`}
                >
                  {loading === tier ? '...' : p.subscribe}
                </button>
              </div>
            );
          })}
        </div>

        {/* Included Features */}
        <div className="mb-20 text-center">
          <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">
            {p.includedFeatures}
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            {(['feature1', 'feature2', 'feature3', 'feature4'] as const).map((key) => (
              <div key={key} className="flex items-center gap-2 text-sm text-white/60">
                <Check className="w-4 h-4 text-green-400" />
                {p[key]}
              </div>
            ))}
          </div>
        </div>

        {/* Credit Usage Table */}
        <div className="mb-20">
          <h3 className="text-lg font-bold text-center mb-6">{p.creditUsage}</h3>
          <div className="max-w-md mx-auto bg-white/[0.03] rounded-xl border border-white/10 overflow-hidden">
            {Object.entries(DIAL_CREDIT_COSTS).map(([op, cr]) => (
              <div key={op} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                <span className="text-sm text-white/70 capitalize">
                  {op.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-mono text-amber-400">{cr}cr</span>
              </div>
            ))}
          </div>
        </div>

        {/* Single Purchase */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">{p.singleTitle}</h2>
            <p className="text-white/50">{p.singleDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { key: 'omakase', price: DIAL_SINGLE_PRICES.omakase, nameKey: 'omakaseName', descKey: 'omakaseDesc' },
              { key: 'dialogue', price: DIAL_SINGLE_PRICES.dialogue, nameKey: 'dialogueName', descKey: 'dialogueDesc' },
              { key: 'mastering', price: DIAL_SINGLE_PRICES.mastering_addon, nameKey: 'masteringName', descKey: 'masteringDesc' },
            ].map(({ key, price, nameKey, descKey }) => (
              <div key={key} className="rounded-xl p-5 border border-white/10 bg-white/[0.03]">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-white/40" />
                  <h4 className="font-medium">{p[nameKey as keyof typeof p]}</h4>
                </div>
                <p className="text-xs text-white/40 mb-3">{p[descKey as keyof typeof p]}</p>
                <div className="text-xl font-bold">{formatUsd(price)}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/dial"
              className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Start a session <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Credit Packs */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">
              <Zap className="w-5 h-5 inline-block mr-2 text-amber-400" />
              {p.creditPackTitle}
            </h2>
            <p className="text-white/50">{p.creditPackDesc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {(['small', 'large'] as const).map((size) => {
              const pack = DIAL_CREDIT_PACKS[size];
              const labelKey = size === 'small' ? 'creditPackSmall' : 'creditPackLarge';
              return (
                <div key={size} className="rounded-xl p-5 border border-white/10 bg-white/[0.03] flex items-center justify-between">
                  <div>
                    <h4 className="font-medium mb-1">{p[labelKey as keyof typeof p]}</h4>
                    <div className="text-amber-400 font-semibold">{pack.credits.toLocaleString()}cr</div>
                    <div className="text-xs text-white/30 mt-1">{p.noRollover}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold mb-2">{formatUsd(pack.priceUsdCents)}</div>
                    <button
                      onClick={() => handleBuyCreditPack(size)}
                      disabled={loading !== null}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition-all disabled:opacity-50"
                    >
                      {loading === size ? '...' : p.buyCredits}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
