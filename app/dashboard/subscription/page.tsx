'use client';

import { useEffect, useState } from 'react';

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
    currency: 'JPY',
    description: 'AI教材とレッスンを無料で体験',
    features: [
      'AI教材: 月3本まで',
      'レッスン予約: 月1件まで',
      '基本的な分析機能',
      'コミュニティサポート',
      '広告表示あり',
    ],
    highlighted: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 2480,
    currency: 'JPY',
    description: 'AI教材無制限で本格的な学習',
    features: [
      'AI教材: 無制限',
      'レッスン予約: 月5件まで',
      'チャットサポート',
      '個別レッスン予約',
      '高度な分析機能',
    ],
    highlighted: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 5980,
    currency: 'JPY',
    description: 'すべての機能を無制限で利用',
    features: [
      'AI教材: 無制限＋PDF取込',
      'レッスン予約: 無制限',
      'メンターマッチング優先',
      'グループ／個別レッスン対応',
      '24/7優先サポート',
      '専任学習コンサルタント',
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
          プランを選択
        </h1>
        <p className="text-xl text-gray-600">
          AI支援学習の力を最大限に活用しましょう
        </p>
      </div>

      {/* Current Plan Info */}
      {limits && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                現在のプラン: {limits.tier.charAt(0).toUpperCase() + limits.tier.slice(1)}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700">AI教材:</span>
                  <span className="font-medium">
                    {limits.aiMaterialsLimit === -1
                      ? '無制限'
                      : `${limits.aiMaterialsUsed} / ${limits.aiMaterialsLimit} 使用中`}
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
                  <span className="text-blue-700">予約:</span>
                  <span className="font-medium">
                    {limits.reservationsLimit === -1
                      ? '無制限'
                      : `${limits.reservationsUsed} / ${limits.reservationsLimit} 使用中`}
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
                  人気No.1
                </div>
              )}
              {isCurrentPlan && (
                <div className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-4">
                  現在のプラン
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
                <span className="text-gray-600">/月</span>
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
                  ? '現在のプラン'
                  : canUpgrade
                  ? plan.id === 'freemium'
                    ? '永久無料'
                    : 'アップグレード'
                  : 'ダウングレード'}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          よくある質問
        </h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              q: 'いつでも解約できますか？',
              a: 'はい、いつでも解約可能です。課金期間の終了まで引き続きご利用いただけます。',
            },
            {
              q: '月間利用上限に達したらどうなりますか？',
              a: 'いつでも上位プランにアップグレードできます。または、翌月まで待つと上限がリセットされます。',
            },
            {
              q: '未使用のAI教材は翌月に繰り越されますか？',
              a: 'いいえ、利用上限は毎月リセットされます。無制限にご利用いただくにはBasicまたはPremiumプランへのアップグレードをお勧めします。',
            },
            {
              q: 'プランをダウングレードできますか？',
              a: 'はい、いつでもダウングレード可能です。変更は現在の課金期間終了時に適用されます。',
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
