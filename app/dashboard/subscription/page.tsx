'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';

interface UsageLimits {
  aiMaterialsLimit: number;
  aiMaterialsUsed: number;
  aiMaterialsRemaining: number;
  reservationsLimit: number;
  reservationsUsed: number;
  reservationsRemaining: number;
  tier: string;
}


export default function SubscriptionPage() {
  const { t } = useLocale();
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageLimits();
  }, []);

  const fetchUsageLimits = async () => {
    try {
      const response = await fetch('/api/subscription/limits');
      const data = await response.json();
      if (data.success) {
        setLimits(data.limits);
      }
    } catch (error) {
      console.error('Failed to fetch limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const PLANS = [
    {
      id: 'freemium',
      name: t.subscription.plans.freemium.name,
      price: 0,
      priceId: null,
      currency: 'JPY',
      description: t.subscription.plans.freemium.description,
      features: t.subscription.plans.freemium.features,
      highlighted: false,
    },
    {
      id: 'starter',
      name: t.subscription.plans.starter.name,
      price: 999,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER?.trim(),
      currency: 'JPY',
      description: t.subscription.plans.starter.description,
      features: t.subscription.plans.starter.features,
      highlighted: false,
    },
    {
      id: 'basic',
      name: t.subscription.plans.basic.name,
      price: 1999,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC?.trim(),
      currency: 'JPY',
      description: t.subscription.plans.basic.description,
      features: t.subscription.plans.basic.features,
      highlighted: true,
    },
    {
      id: 'premium',
      name: t.subscription.plans.premium.name,
      price: 4999,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM?.trim(),
      currency: 'JPY',
      description: t.subscription.plans.premium.description,
      features: t.subscription.plans.premium.features,
      highlighted: false,
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (planId === 'freemium') return;

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
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t.subscription.title}
        </h1>
        <p className="text-xl text-gray-600">
          {t.subscription.subtitle}
        </p>
      </div>

      {/* Current Plan Info */}
      {limits && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                {t.subscription.currentPlan} {limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1)}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">{t.subscription.aiMaterials}</span>
                  <span className="font-medium">
                    {limits.aiMaterialsLimit === -1
                      ? t.subscription.unlimited
                      : `${limits.aiMaterialsUsed} / ${limits.aiMaterialsLimit} ${t.subscription.used}`}
                  </span>
                  {limits.aiMaterialsLimit !== -1 && (
                    <div className="flex-1 max-w-xs bg-white rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(limits.aiMaterialsUsed / limits.aiMaterialsLimit) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">{t.subscription.reservations}</span>
                  <span className="font-medium">
                    {limits.reservationsLimit === -1
                      ? t.subscription.unlimited
                      : `${limits.reservationsUsed} / ${limits.reservationsLimit} ${t.subscription.used}`}
                  </span>
                  {limits.reservationsLimit !== -1 && (
                    <div className="flex-1 max-w-xs bg-white rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(limits.reservationsUsed / limits.reservationsLimit) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isCurrentPlan = limits?.tier === plan.id;
          const canUpgrade = limits && PLANS.findIndex(p => p.id === limits.tier) < PLANS.findIndex(p => p.id === plan.id);

          return (
            <div
              key={plan.id}
              className={`rounded-lg border-2 p-6 ${
                plan.highlighted
                  ? 'border-blue-600 shadow-lg scale-105'
                  : 'border-gray-200'
              } ${isCurrentPlan ? 'bg-green-50 border-green-600' : 'bg-white'}`}
            >
              {plan.highlighted && (
                <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  {t.subscription.mostPopular}
                </div>
              )}
              {isCurrentPlan && (
                <div className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  {t.subscription.currentPlanBadge}
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.currency === 'JPY' ? '¥' : '$'}{plan.price.toLocaleString()}
                </span>
                <span className="text-gray-600">/month</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan || !canUpgrade}
                className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  isCurrentPlan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : canUpgrade
                    ? plan.highlighted
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isCurrentPlan
                  ? t.subscription.currentPlanBadge
                  : canUpgrade
                  ? plan.id === 'freemium'
                    ? t.subscription.freeForever
                    : t.subscription.upgrade
                  : t.subscription.downgrade}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          {t.subscription.faq.title}
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              q: t.subscription.faq.q1,
              a: t.subscription.faq.a1,
            },
            {
              q: t.subscription.faq.q2,
              a: t.subscription.faq.a2,
            },
            {
              q: t.subscription.faq.q3,
              a: t.subscription.faq.a3,
            },
            {
              q: t.subscription.faq.q4,
              a: t.subscription.faq.a4,
            },
          ].map((faq, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
