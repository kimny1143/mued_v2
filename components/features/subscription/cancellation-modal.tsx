'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';

type CancelStep = 'confirm' | 'reason' | 'final' | 'completed';

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: string;
  periodEndDate?: string | null;
  onCancelled: () => void;
}

const CANCEL_REASONS = [
  { id: 'price', labelEn: 'Too expensive', labelJa: '価格が高い' },
  { id: 'not_using', labelEn: 'Not using the features', labelJa: '機能を使っていない' },
  { id: 'other_service', labelEn: 'Found another service', labelJa: '他のサービスを見つけた' },
  { id: 'other', labelEn: 'Other', labelJa: 'その他' },
];

const FEATURES_LOST = {
  basic: {
    en: ['Hoo AI conversation (unlimited)', 'Cloud sync & unlimited log storage', 'DAW log integration', 'Practice data visualization'],
    ja: ['Hoo AI会話（無制限）', 'クラウド同期・ログ保存無制限', 'DAWログ連携', '練習データの見える化'],
  },
  premium: {
    en: ['Hoo personalized conversation', 'MUEDlobe cognitive profile', 'Accumulated data analysis'],
    ja: ['Hoo個人化会話', 'MUEDlobe認知プロファイル', '蓄積データ分析'],
  },
};

export function CancellationModal({
  isOpen,
  onClose,
  tier,
  periodEndDate,
  onCancelled,
}: CancellationModalProps) {
  const { t, locale } = useLocale();
  const [step, setStep] = useState<CancelStep>('confirm');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('confirm');
    setSelectedReason('');
    setComment('');
    onClose();
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: selectedReason, comment }),
      });

      const data = await response.json();
      if (data.success) {
        setStep('completed');
        onCancelled();
      } else {
        throw new Error(data.error || 'Cancel failed');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      alert(locale === 'ja' ? '解約に失敗しました' : 'Cancellation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const featuresLost = FEATURES_LOST[tier as keyof typeof FEATURES_LOST]?.[locale] ||
    FEATURES_LOST.basic[locale];

  const planName = tier === 'premium'
    ? t.subscription.plans.premium.name
    : t.subscription.plans.basic.name;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Step 1: Confirm */}
        {step === 'confirm' && (
          <>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {t.subscription.cancel?.title || 'Downgrade Plan'}
                </h3>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {t.subscription.cancel?.confirmTitle || 'Are you sure?'}
                </h4>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-3">
                  {t.subscription.cancel?.loseAccess || "You'll lose access to:"}
                </p>
                <ul className="space-y-2">
                  {featuresLost.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700">
                      <span className="text-red-500 mr-2">✕</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={() => setStep('reason')}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all"
              >
                {locale === 'ja' ? '続ける' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {/* Step 2: Reason */}
        {step === 'reason' && (
          <>
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {t.subscription.cancel?.reason || 'Why are you leaving?'}
                </h3>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason.id}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedReason === reason.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reason.id}
                      checked={selectedReason === reason.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mr-3 accent-orange-500"
                    />
                    <span className="text-gray-700">
                      {locale === 'ja' ? reason.labelJa : reason.labelEn}
                    </span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  {locale === 'ja' ? 'コメント（任意）' : 'Comment (optional)'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  rows={3}
                  placeholder={locale === 'ja' ? 'ご意見をお聞かせください...' : 'Tell us more...'}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all"
              >
                {locale === 'ja' ? '戻る' : 'Back'}
              </button>
              <button
                onClick={() => setStep('final')}
                disabled={!selectedReason}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {locale === 'ja' ? '続ける' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Final Confirm */}
        {step === 'final' && (
          <>
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {t.subscription.cancel?.finalConfirm || 'Cancel subscription'}
                </h3>
                <button
                  onClick={handleClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-6 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <p className="text-lg text-gray-900">
                  {locale === 'ja' ? `${planName}を解約します` : `Cancel ${planName}`}
                </p>
              </div>

              {periodEndDate && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">
                      {t.subscription.cancel?.periodEnd || 'Your subscription will end on'}
                    </span>
                    <br />
                    <span className="text-lg font-bold">{formatDate(periodEndDate)}</span>
                  </p>
                </div>
              )}

              <p className="text-sm text-gray-500 text-center">
                {locale === 'ja'
                  ? 'この操作は取り消すことができます。期間終了まで引き続きご利用いただけます。'
                  : 'You can undo this action. You will continue to have access until your period ends.'}
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setStep('reason')}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-all"
              >
                {locale === 'ja' ? '戻る' : 'Back'}
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {isLoading
                  ? (locale === 'ja' ? '処理中...' : 'Processing...')
                  : (locale === 'ja' ? '解約を確定' : 'Confirm cancellation')}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Completed */}
        {step === 'completed' && (
          <>
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-5">
              <h3 className="text-xl font-bold text-white text-center">
                {t.subscription.cancel?.completed || 'Cancellation confirmed'}
              </h3>
            </div>

            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 mb-2">
                {t.subscription.cancel?.keepUntil?.replace('{tier}', planName) ||
                  `You can keep using ${planName} until`}
              </p>
              {periodEndDate && (
                <p className="text-xl font-bold text-gray-900">{formatDate(periodEndDate)}</p>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleClose}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
              >
                {locale === 'ja' ? '閉じる' : 'Close'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
