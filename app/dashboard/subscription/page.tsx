'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { CancellationModal } from '@/components/features/subscription/cancellation-modal';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { Sparkles, Check, AlertTriangle } from 'lucide-react';

interface UsageLimits {
  hooConversationsLimit: number;
  hooConversationsUsed: number;
  hooConversationsRemaining: number;
  tier: string;
  canUseHooAI: boolean;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
}

export default function SubscriptionPage() {
  const { t, locale } = useLocale();
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    fetchUsageLimits();
  }, []);

  const fetchUsageLimits = async () => {
    try {
      const response = await fetch('/api/subscription/limits');
      const data = await response.json();
      if (data.success && data.data?.limits) {
        setLimits(data.data.limits);
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success) {
        await fetchUsageLimits();
      } else {
        throw new Error(data.error || 'Reactivation failed');
      }
    } catch (error) {
      console.error('Reactivate error:', error);
      alert(locale === 'ja' ? '再アクティブ化に失敗しました' : 'Reactivation failed. Please try again.');
    } finally {
      setReactivating(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const PLANS = [
    {
      id: 'free',
      name: t.subscription.plans.free.name,
      price: 0,
      priceId: null,
      currency: 'JPY',
      description: t.subscription.plans.free.description,
      features: t.subscription.plans.free.features,
      highlighted: false,
    },
    {
      id: 'basic',
      name: t.subscription.plans.basic.name,
      price: 1980,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC?.trim(),
      currency: 'JPY',
      description: t.subscription.plans.basic.description,
      features: t.subscription.plans.basic.features,
      highlighted: true,
    },
    {
      id: 'premium',
      name: t.subscription.plans.premium.name,
      price: 2980,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM?.trim(),
      currency: 'JPY',
      description: t.subscription.plans.premium.description,
      features: t.subscription.plans.premium.features,
      highlighted: false,
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') return;

    const plan = PLANS.find(p => p.id === planId);
    if (!plan || !plan.priceId) {
      alert('Plan not found');
      return;
    }

    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: plan.priceId,
          tier: planId
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  return (
    <MuednoteLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold text-white">
              {t.subscription.title}
            </h1>
          </div>
          <p className="text-lg text-slate-400">
            {t.subscription.subtitle}
          </p>
        </div>

        {/* Current Plan Info */}
        {limits && !loading && (
          <div className={`bg-white/5 backdrop-blur-xl border rounded-2xl p-6 mb-12 ${
            limits.cancelAtPeriodEnd
              ? 'border-orange-500/30'
              : 'border-white/10'
          }`}>
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {t.subscription.currentPlan} {limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1)}
                  </h3>
                  {limits.cancelAtPeriodEnd && (
                    <span className="flex items-center gap-1 bg-orange-500/20 text-orange-400 text-xs font-semibold px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      {t.subscription.scheduledCancel || 'Scheduled to cancel'}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">
                      {t.subscription.hooConversations}
                    </span>
                    <span className="font-medium text-white">
                      {limits.hooConversationsLimit === -1
                        ? t.subscription.unlimited
                        : limits.hooConversationsLimit === 0
                        ? t.subscription.notAvailable
                        : `${limits.hooConversationsUsed} / ${limits.hooConversationsLimit} ${t.subscription.used}`}
                    </span>
                    {limits.hooConversationsLimit > 0 && (
                      <div className="flex-1 max-w-xs bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            limits.cancelAtPeriodEnd ? 'bg-orange-500' : 'bg-indigo-500'
                          }`}
                          style={{
                            width: `${Math.min(100, (limits.hooConversationsUsed / limits.hooConversationsLimit) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  {limits.cancelAtPeriodEnd && limits.currentPeriodEnd && (
                    <p className="text-orange-400">
                      {t.subscription.cancel?.periodEnd || 'Your subscription will end on'}{' '}
                      <span className="font-semibold">{formatDate(limits.currentPeriodEnd)}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Reactivate Button */}
              {limits.tier !== 'free' && limits.cancelAtPeriodEnd && (
                <button
                  onClick={handleReactivate}
                  disabled={reactivating}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {reactivating
                    ? (locale === 'ja' ? '処理中...' : 'Processing...')
                    : (t.subscription.reactivate || 'Reactivate')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const isCurrentPlan = limits?.tier === plan.id;
            const canUpgrade = limits && PLANS.findIndex(p => p.id === limits.tier) < PLANS.findIndex(p => p.id === plan.id);

            return (
              <div
                key={plan.id}
                className={`relative bg-white/5 backdrop-blur-xl border rounded-2xl p-6 transition-all ${
                  plan.highlighted
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105'
                    : isCurrentPlan
                    ? 'border-green-500/50'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t.subscription.mostPopular}
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t.subscription.currentPlanBadge}
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white mb-2 mt-2">
                  {plan.name}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">
                    {plan.currency === 'JPY' ? '¥' : '$'}{plan.price.toLocaleString()}
                  </span>
                  <span className="text-slate-400">/month</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <Check className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Downgrade to Free button */}
                {plan.id === 'free' && !isCurrentPlan && limits?.tier !== 'free' ? (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full py-3 rounded-xl font-medium transition-colors border border-orange-500/50 text-orange-400 hover:bg-orange-500/10 cursor-pointer"
                  >
                    {t.subscription.downgrade}
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan || !canUpgrade}
                    className={`w-full py-3 rounded-xl font-medium transition-colors ${
                      isCurrentPlan
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : canUpgrade
                        ? plan.highlighted
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                          : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isCurrentPlan
                      ? t.subscription.currentPlanBadge
                      : canUpgrade
                      ? t.subscription.upgrade
                      : t.subscription.downgrade}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div>
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            {t.subscription.faq.title}
          </h2>
          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: t.subscription.faq.q1, a: t.subscription.faq.a1 },
              { q: t.subscription.faq.q2, a: t.subscription.faq.a2 },
              { q: t.subscription.faq.q3, a: t.subscription.faq.a3 },
              { q: t.subscription.faq.q4, a: t.subscription.faq.a4 },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        tier={limits?.tier || 'free'}
        periodEndDate={limits?.currentPeriodEnd}
        onCancelled={() => {
          setShowCancelModal(false);
          fetchUsageLimits();
        }}
      />
    </MuednoteLayout>
  );
}
