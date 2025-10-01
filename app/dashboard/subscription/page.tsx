'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UsageLimits {
  aiMaterialsLimit: number;
  aiMaterialsUsed: number;
  aiMaterialsRemaining: number;
  reservationsLimit: number;
  reservationsUsed: number;
  reservationsRemaining: number;
  tier: string;
}

const PLANS = [
  {
    id: 'freemium',
    name: 'Freemium',
    price: 0,
    description: 'Get started with AI-powered learning',
    features: [
      '3 AI materials per month',
      '1 mentor session per month',
      'Basic analytics',
      'Community support',
    ],
    highlighted: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    description: 'Perfect for getting started',
    features: [
      '3 AI materials per month',
      '1 mentor session per month',
      'Basic analytics',
      'Email support',
    ],
    highlighted: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 19.99,
    description: 'Unlimited AI materials',
    features: [
      'Unlimited AI materials',
      '5 mentor sessions per month',
      'Advanced analytics',
      'Priority email support',
      'Custom study plans',
    ],
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 49.99,
    description: 'Full access to everything',
    features: [
      'Unlimited AI materials',
      'Unlimited mentor sessions',
      'Advanced analytics',
      '24/7 priority support',
      'Custom study plans',
      '1-on-1 learning consultant',
      'Exclusive webinars',
    ],
    highlighted: false,
  },
];

export default function SubscriptionPage() {
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

  const handleUpgrade = async (planId: string) => {
    if (planId === 'freemium') return;

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: planId }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout process');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600">
          Unlock the full power of AI-assisted learning
        </p>
      </div>

      {/* Current Plan Info */}
      {limits && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Current Plan: {limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1)}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">AI Materials:</span>
                  <span className="font-medium">
                    {limits.aiMaterialsLimit === -1
                      ? 'Unlimited'
                      : `${limits.aiMaterialsUsed} / ${limits.aiMaterialsLimit} used`}
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
                  <span className="text-blue-700">Reservations:</span>
                  <span className="font-medium">
                    {limits.reservationsLimit === -1
                      ? 'Unlimited'
                      : `${limits.reservationsUsed} / ${limits.reservationsLimit} used`}
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
                  MOST POPULAR
                </div>
              )}
              {isCurrentPlan && (
                <div className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  CURRENT PLAN
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${plan.price}
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
                  ? 'Current Plan'
                  : canUpgrade
                  ? plan.id === 'freemium'
                    ? 'Free Forever'
                    : 'Upgrade Now'
                  : 'Downgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes, you can cancel your subscription at any time. You will continue to have access until the end of your billing period.',
            },
            {
              q: 'What happens if I reach my monthly limit?',
              a: "You can upgrade to a higher tier anytime to get more usage, or wait until next month when your limits reset.",
            },
            {
              q: 'Do unused AI materials roll over to the next month?',
              a: 'No, usage limits reset at the start of each billing period. We recommend upgrading to Basic or Premium for unlimited access.',
            },
            {
              q: 'Can I downgrade my plan?',
              a: 'Yes, you can downgrade at any time. The change will take effect at the end of your current billing period.',
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
