'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Clock, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/locale-context';

interface TrialStatus {
  isInTrial: boolean;
  hasTrialStarted: boolean;
  trialUsed: boolean;
  turnsUsed: number;
  turnsRemaining: number;
  daysRemaining: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
}

interface TrialBannerProps {
  className?: string;
}

/**
 * Trial Banner Component
 *
 * Displays different states:
 * 1. Trial not started - CTA to start trial
 * 2. Trial in progress - Shows remaining days/turns
 * 3. Trial expired/exhausted - Upgrade CTA
 * 4. Paid tier - Hidden
 */
export function TrialBanner({ className = '' }: TrialBannerProps) {
  const { t } = useLocale();
  const [trial, setTrial] = useState<TrialStatus | null>(null);
  const [tier, setTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch('/api/hoo/chat');
      const data = await response.json();
      if (data.success && data.data) {
        setTrial(data.data.trial);
        setTier(data.data.tier);
      }
    } catch (error) {
      console.error('Failed to fetch trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show for paid tiers
  if (loading || tier !== 'free' || !trial) {
    return null;
  }

  const trialT = t.trial?.banner;

  // Trial not started - Show start trial CTA
  if (!trial.hasTrialStarted) {
    return (
      <div className={`bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl p-6 ${className}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">
                {trialT?.title || 'Try Hoo AI free for 3 days'}
              </h3>
            </div>
            <p className="text-slate-300 text-sm">
              {trialT?.description || '50 turns to experience AI-powered music reflection'}
            </p>
          </div>
          <Link href="/dashboard/muednote/hoo">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap">
              {trialT?.startTrial || 'Start Free Trial'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Trial in progress - Show status
  if (trial.isInTrial) {
    const remainingText = (trialT?.remaining || '{days} days, {turns} turns remaining')
      .replace('{days}', String(trial.daysRemaining))
      .replace('{turns}', String(trial.turnsRemaining));

    return (
      <div className={`bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-emerald-300">
                {trialT?.inProgress || 'Free Trial Active'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {remainingText}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress bar */}
            <div className="hidden sm:block w-32">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{trial.turnsUsed}/50</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((trial.turnsUsed / 50) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Link href="/dashboard/muednote/hoo">
              <Button size="sm" variant="outline" className="border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/20">
                Use Hoo AI
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Trial expired or turns exhausted - Show upgrade CTA
  const isExpired = trial.trialUsed || trial.daysRemaining === 0;
  const isTurnsExhausted = trial.turnsRemaining === 0;

  return (
    <div className={`bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-300">
              {isTurnsExhausted
                ? (trialT?.turnsExhausted || 'Trial turns used up')
                : (trialT?.expired || 'Trial ended')}
            </h3>
            <p className="text-xs text-slate-400">
              {isTurnsExhausted
                ? (trialT?.turnsExhaustedDescription || 'Upgrade to Basic for 150 turns/month')
                : (trialT?.expiredDescription || 'Upgrade to Basic for continued Hoo AI access')}
            </p>
          </div>
        </div>
        <Link href="/dashboard/subscription">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap">
            {trialT?.upgradeNow || 'Upgrade to Basic'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
