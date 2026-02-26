'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';
import { Suspense } from 'react';

const PLAN_FEATURES: Record<string, string[]> = {
  basic: [
    'Voice transcription (Whisper)',
    'Unlimited log storage',
    'DAW log integration',
    'Dashboard & Export',
    'Hoo AI: 150 conversations/month',
  ],
  premium: [
    'All Basic features',
    'Hoo AI: Unlimited (BYOK)',
    'MUEDlobe cognitive profile',
    'Personalized Hoo conversation',
    'Accumulated data analysis',
  ],
};

const PLAN_FEATURES_JA: Record<string, string[]> = {
  basic: [
    '音声文字起こし（Whisper）',
    'ログ保存：無制限',
    'DAWログ連携',
    'ダッシュボード・エクスポート',
    'Hoo AI：月150回まで',
  ],
  premium: [
    'ベーシックの全機能',
    'Hoo AI：無制限（BYOK）',
    'MUEDlobe認知プロファイル',
    'Hoo個人化会話',
    '蓄積データ分析',
  ],
};

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();

  const tier = searchParams.get('tier') || 'basic';
  const planName = tier === 'premium' ? t.subscription.plans.premium.name : t.subscription.plans.basic.name;
  const features = locale === 'ja' ? PLAN_FEATURES_JA[tier] || PLAN_FEATURES_JA.basic : PLAN_FEATURES[tier] || PLAN_FEATURES.basic;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header with success icon */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {t.subscription.success?.title?.replace('{tier}', planName) || `Welcome to ${planName}!`}
          </h1>
          <p className="text-green-100 text-lg">
            {t.subscription.success?.subtitle || 'Your subscription is now active'}
          </p>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {/* Features list */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              {t.subscription.success?.features || 'You now have access to:'}
            </h3>
            <ul className="space-y-3">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard/muednote/hoo"
              className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center py-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
            >
              {t.subscription.success?.cta || 'Start using Hoo'}
            </Link>
            {tier === 'premium' && (
              <Link
                href="/lobe"
                className="block w-full bg-violet-50 text-violet-700 text-center py-3 rounded-xl font-medium hover:bg-violet-100 transition-colors border border-violet-200"
              >
                {locale === 'ja'
                  ? 'MUEDlobeを受けてみる（後からでもOK）'
                  : 'Try MUEDlobe now (or anytime later)'}
              </Link>
            )}
            <Link
              href="/dashboard"
              className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {t.subscription.success?.backToDashboard || 'Back to Dashboard'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}
