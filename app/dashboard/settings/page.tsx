'use client';

/**
 * MUEDnote Settings Page
 *
 * Centralized settings for:
 * - Account & subscription management
 * - Hoo AI custom instructions
 * - (Future) Notification preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Save,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  User,
  Bell,
  CreditCard,
  ExternalLink,
  Brain,
  Lock,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

// ========================================
// Types
// ========================================

interface MemorySettings {
  customInstructions: string | null;
  customInstructionsEnabled: boolean;
  muedlobeInstructions: string[] | null;
  hasMuedlobeProfile: boolean;
}

const MAX_INSTRUCTIONS_LENGTH = 2000;

// ========================================
// Section Components
// ========================================

interface SectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  comingSoon?: boolean;
}

function SettingsSection({ title, description, icon, children, comingSoon }: SectionProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 ${comingSoon ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {comingSoon && (
              <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ========================================
// Main Component
// ========================================

export default function SettingsPage() {
  const { locale } = useLocale();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Hoo settings state
  const [hooSettings, setHooSettings] = useState<MemorySettings | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [hooEnabled, setHooEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  // Fetch Hoo settings + tier
  const fetchHooSettings = useCallback(async () => {
    try {
      const [memRes, tierRes] = await Promise.all([
        fetch('/api/hoo/memory'),
        fetch('/api/subscription/limits'),
      ]);
      const memData = await memRes.json();
      if (memData.success && memData.data) {
        setHooSettings(memData.data);
        setCustomInstructions(memData.data.customInstructions ?? '');
        setHooEnabled(memData.data.customInstructionsEnabled);
      }
      const tierData = await tierRes.json();
      if (tierData.success) {
        setTier(tierData.data.limits.tier);
      }
    } catch {
      // Silent fail on initial load
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHooSettings();
  }, [fetchHooSettings]);

  // Track changes
  useEffect(() => {
    if (hooSettings) {
      const changed = customInstructions !== (hooSettings.customInstructions ?? '');
      setHasChanges(changed);
    }
  }, [customInstructions, hooSettings]);

  // Save custom instructions
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/hoo/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customInstructions: customInstructions.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setHooSettings(data.data);
        setHasChanges(false);
        setSuccess(locale === 'ja' ? '保存しました' : 'Saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle enabled
  const handleToggle = async () => {
    setIsToggling(true);
    setError(null);
    try {
      const res = await fetch('/api/hoo/memory/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !hooEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setHooSettings(data.data);
        setHooEnabled(data.data.customInstructionsEnabled);
      } else {
        setError(data.error || 'Failed to toggle');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsToggling(false);
    }
  };

  const remainingChars = MAX_INSTRUCTIONS_LENGTH - customInstructions.length;
  const isOverLimit = remainingChars < 0;

  return (
    <MuednoteLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            {locale === 'ja' ? '設定' : 'Settings'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {locale === 'ja'
              ? 'MUEDnoteの設定を管理'
              : 'Manage your MUEDnote preferences'}
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm text-green-400">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hoo Custom Instructions */}
            <SettingsSection
              title={locale === 'ja' ? 'Hoo カスタム指示' : 'Hoo Custom Instructions'}
              description={
                locale === 'ja'
                  ? 'Hooに事前に知っておいてほしい情報を設定します'
                  : 'Set information you want Hoo to know about you'
              }
              icon={<MessageSquare className="w-5 h-5 text-indigo-400" />}
            >
              <div className="space-y-4">
                {/* Toggle */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-300">
                    {locale === 'ja' ? 'カスタム指示を有効化' : 'Enable custom instructions'}
                  </span>
                  <button
                    onClick={handleToggle}
                    disabled={isToggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      hooEnabled ? 'bg-indigo-600' : 'bg-slate-600'
                    } ${isToggling ? 'opacity-50' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        hooEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Textarea */}
                <div className="space-y-2">
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={
                      locale === 'ja'
                        ? '例: 私はEDMプロデューサーで、Ableton Liveを使っています。主にDubstepを制作していて、音作りに興味があります。'
                        : "Example: I'm an EDM producer using Ableton Live. I mainly produce Dubstep and I'm interested in sound design."
                    }
                    disabled={!hooEnabled}
                    className={`w-full h-32 resize-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm ${
                      !hooEnabled ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isOverLimit ? 'border-red-500/50' : ''}`}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">
                      {locale === 'ja'
                        ? 'すべてのHoo会話で参照されます'
                        : 'Referenced in all Hoo conversations'}
                    </span>
                    <span className={isOverLimit ? 'text-red-400' : 'text-slate-500'}>
                      {remainingChars.toLocaleString()} / {MAX_INSTRUCTIONS_LENGTH.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges || isOverLimit || !hooEnabled}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {locale === 'ja' ? '保存' : 'Save'}
                  </Button>
                </div>
              </div>
            </SettingsSection>

            {/* MUEDlobe Cognitive Profile (Premium only) */}
            <SettingsSection
              title={locale === 'ja' ? 'MUEDlobe 認知プロファイル' : 'MUEDlobe Cognitive Profile'}
              description={
                locale === 'ja'
                  ? 'MUEDlobeの結果から生成された、Hoo向けの認知特性指示'
                  : 'Cognitive profile instructions for Hoo, derived from MUEDlobe results'
              }
              icon={<Brain className="w-5 h-5 text-violet-400" />}
            >
              {tier === 'premium' ? (
                hooSettings?.hasMuedlobeProfile && hooSettings.muedlobeInstructions ? (
                  <div className="space-y-3">
                    <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl px-4 py-3">
                      <ul className="space-y-2 text-sm text-slate-300">
                        {hooSettings.muedlobeInstructions.map((instruction, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                            {instruction}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-slate-500">
                      {locale === 'ja'
                        ? 'これらの指示はMUEDlobeの結果に基づいて自動生成され、すべてのHoo会話に適用されます。'
                        : 'These instructions are auto-generated from your MUEDlobe results and applied to all Hoo conversations.'}
                    </p>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-sm text-slate-400">
                      {locale === 'ja'
                        ? 'MUEDlobeのゲームを完了してプロファイルを作成すると、ここに認知特性の指示が表示されます。'
                        : 'Complete MUEDlobe games and generate your profile to see cognitive instructions here.'}
                    </p>
                    <Link href="/dashboard/muednote/lobe">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-3 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border-0 cursor-pointer"
                      >
                        <Brain className="w-4 h-4 mr-1.5" />
                        {locale === 'ja' ? 'MUEDlobeへ' : 'Go to MUEDlobe'}
                      </Button>
                    </Link>
                  </div>
                )
              ) : (
                <div className="py-4 text-center">
                  <Lock className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {locale === 'ja'
                      ? 'Premiumプランで利用できます。MUEDlobeの認知プロファイルに基づいて、Hooの会話があなた専用にパーソナライズされます。'
                      : 'Available on Premium plan. Your Hoo conversations will be personalized based on your MUEDlobe cognitive profile.'}
                  </p>
                  <Link href="/dashboard/subscription">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      {locale === 'ja' ? 'プランを見る' : 'View Plans'}
                    </Button>
                  </Link>
                </div>
              )}
            </SettingsSection>

            {/* Account Settings */}
            <SettingsSection
              title={locale === 'ja' ? 'アカウント' : 'Account'}
              description={
                locale === 'ja'
                  ? 'アカウント情報とサブスクリプション'
                  : 'Account information and subscription'
              }
              icon={<User className="w-5 h-5 text-indigo-400" />}
            >
              <div className="space-y-4">
                {/* User Info */}
                {isUserLoaded && user ? (
                  <div className="flex items-center gap-4 py-2">
                    {user.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.imageUrl}
                        alt=""
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {user.fullName || user.username || 'User'}
                      </p>
                      <p className="text-slate-400 text-sm truncate">
                        {user.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 py-2">
                    <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/10 rounded animate-pulse w-32" />
                      <div className="h-3 bg-white/10 rounded animate-pulse w-48" />
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* Manage Plan Button */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm text-slate-300">
                      {locale === 'ja' ? 'サブスクリプション' : 'Subscription'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {locale === 'ja'
                        ? 'プランの変更や請求情報の管理'
                        : 'Manage your plan and billing'}
                    </p>
                  </div>
                  <Link href="/dashboard/subscription">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      {locale === 'ja' ? 'プラン管理' : 'Manage Plan'}
                      <ExternalLink className="w-3 h-3 ml-1.5 opacity-50" />
                    </Button>
                  </Link>
                </div>
              </div>
            </SettingsSection>

            {/* Notifications - Coming Soon */}
            <SettingsSection
              title={locale === 'ja' ? '通知' : 'Notifications'}
              description={
                locale === 'ja'
                  ? '通知とリマインダーの設定'
                  : 'Notification and reminder preferences'
              }
              icon={<Bell className="w-5 h-5 text-indigo-400" />}
              comingSoon
            >
              <div className="py-4 text-center text-slate-500 text-sm">
                {locale === 'ja'
                  ? '通知設定は近日公開予定です'
                  : 'Notification settings coming soon'}
              </div>
            </SettingsSection>
          </div>
        )}
      </div>
    </MuednoteLayout>
  );
}
