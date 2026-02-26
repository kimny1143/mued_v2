'use client';

import { useState, useEffect } from 'react';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Lock,
  ArrowRight,
  Loader2,
  Sparkles,
  BarChart3,
  MessageCircle,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import Link from 'next/link';

const LOBE_FEATURES = {
  en: [
    {
      icon: Brain,
      title: '7 Cognitive Games',
      description: 'Tone Sequence, Mental Math, Symbol Match, Word Bridge, Pattern Complete, Focus Flow, Code Fill.',
    },
    {
      icon: BarChart3,
      title: 'Cognitive Profile',
      description: 'Your results are analyzed into a unique cognitive profile — your strengths, patterns, and growth areas.',
    },
    {
      icon: MessageCircle,
      title: 'Personalized Hoo',
      description: 'Your profile shapes how Hoo talks with you. More relevant suggestions, tailored to how you think.',
    },
  ],
  ja: [
    {
      icon: Brain,
      title: '7つの認知ゲーム',
      description: 'トーンシーケンス、暗算、シンボルマッチ、ワードブリッジ、パターンコンプリート、フォーカスフロー、コードフィル。',
    },
    {
      icon: BarChart3,
      title: '認知プロファイル',
      description: '結果をもとに、あなただけの認知プロファイルを生成。強み・パターン・成長領域が見える。',
    },
    {
      icon: MessageCircle,
      title: 'Hooの個人化',
      description: 'プロファイルに基づいて、Hooの会話があなた専用に。思考スタイルに合った提案が届く。',
    },
  ],
};

export default function LobeIntroPage() {
  const { locale } = useLocale();
  const [tier, setTier] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/subscription/limits')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTier(data.data.limits.tier);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const isPremium = tier === 'premium';
  const features = LOBE_FEATURES[locale] || LOBE_FEATURES.en;

  return (
    <MuednoteLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Brain className="w-7 h-7 text-violet-400" />
            MUEDlobe
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {locale === 'ja'
              ? '認知プロファイルで、Hooをあなた専用に'
              : 'Build your cognitive profile, personalize Hoo'}
          </p>
        </div>

        {/* Feature Cards */}
        <div className={`grid md:grid-cols-3 gap-6 ${!isPremium && !isLoading ? 'opacity-40' : ''} transition-opacity`}>
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Area */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : isPremium ? (
          /* Premium: Go to MUEDlobe */
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-6 text-center">
            <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">
              {locale === 'ja' ? '準備完了' : 'Ready to Go'}
            </h2>
            <p className="text-white/60 text-sm mb-4">
              {locale === 'ja'
                ? '7つのゲームをプレイして、あなたの認知プロファイルを作成しましょう。'
                : 'Play 7 games and build your cognitive profile.'}
            </p>
            <Link href="/lobe">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
                {locale === 'ja' ? 'MUEDlobeを始める' : 'Start MUEDlobe'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          /* Free/Basic: Upgrade prompt */
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <Lock className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">
              {locale === 'ja' ? 'Premiumプラン限定' : 'Premium Plan Only'}
            </h2>
            <p className="text-white/60 text-sm mb-4">
              {locale === 'ja'
                ? 'MUEDlobeはPremiumプランで利用できます。認知プロファイルを作成し、Hooの会話をパーソナライズ。'
                : 'MUEDlobe is available on the Premium plan. Build your cognitive profile and personalize Hoo.'}
            </p>
            <Link href="/dashboard/subscription">
              <Button className="bg-violet-600 hover:bg-violet-700 text-white cursor-pointer">
                {locale === 'ja' ? 'プランを見る' : 'View Plans'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </MuednoteLayout>
  );
}
