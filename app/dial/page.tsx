'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';

type ServiceTier = 'omakase' | 'dialogue';


export default function DialPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { t } = useLocale();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  const MIX_OPTIONS = [
    { id: 'omakase' as ServiceTier, name: t.dial.checkout.omakaseName, price: 12, description: t.dial.checkout.omakaseDesc },
    { id: 'dialogue' as ServiceTier, name: t.dial.checkout.dialogueName, price: 35, description: t.dial.checkout.dialogueDesc },
  ];

  const [email, setEmail] = useState('');
  const [mixType, setMixType] = useState<ServiceTier | null>(null);
  const [masteringType, setMasteringType] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveEmail = isSignedIn ? clerkEmail : email;
  const hasSelection = mixType || masteringType;
  const totalPrice = (mixType ? MIX_OPTIONS.find((o) => o.id === mixType)!.price : 0)
    + (masteringType ? 5 : 0);

  const handleCheckout = async () => {
    if (!hasSelection || !effectiveEmail) {
      setError(isSignedIn ? t.dial.checkout.errorSelectService : t.dial.checkout.errorSelectServiceEmail);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dial/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mixType,
          masteringType,
          email: effectiveEmail,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || t.dial.checkout.checkoutFailed);
        return;
      }

      // Store guest token for later access (only for guests)
      if (!isSignedIn) {
        localStorage.setItem('dial_guest_token', data.data.guestToken);
      }
      localStorage.setItem('dial_session_id', data.data.sessionId);

      // Redirect to Stripe Checkout
      window.location.href = data.data.url;
    } catch {
      setError(t.dial.checkout.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            MUED<span className="text-indigo-400">ial</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            {t.dial.checkout.tagline}
          </p>
        </div>

        {/* Step 1: Mix */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">{t.dial.checkout.step1}</h2>
          <div className="grid md:grid-cols-2 gap-3" role="radiogroup" aria-label={t.dial.checkout.step1}>
            {MIX_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMixType(mixType === opt.id ? null : opt.id)}
                aria-pressed={mixType === opt.id}
                className={`text-left p-5 rounded-xl border transition-all ${
                  mixType === opt.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div className="text-xl font-bold mb-1">${opt.price}</div>
                <div className="text-sm font-medium text-white mb-1">{opt.name}</div>
                <div className="text-xs text-zinc-400">{opt.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Mastering */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">{t.dial.checkout.step2}</h2>
          <button
            onClick={() => setMasteringType(masteringType ? null : 'omakase')}
            aria-pressed={!!masteringType}
            className={`w-full text-left p-5 rounded-xl border transition-all ${
              masteringType
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <div className="text-xl font-bold mb-1">$5</div>
            <div className="text-sm font-medium text-white mb-1">{t.dial.checkout.masteringName}</div>
            <div className="text-xs text-zinc-400">{t.dial.checkout.masteringDesc}</div>
          </button>
        </div>

        {/* Total */}
        {hasSelection && (
          <div className="mb-8 text-center">
            <span className="text-3xl font-bold">${totalPrice}</span>
            <span className="text-zinc-400 ml-2 text-sm">{t.dial.checkout.total}</span>
          </div>
        )}

        {/* Checkout Form */}
        <div className="max-w-md mx-auto space-y-4">
          {isSignedIn ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg">
              <span className="text-sm text-zinc-400">{t.dial.checkout.signedInAs}</span>
              <span className="text-sm text-white">{clerkEmail}</span>
            </div>
          ) : (
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-zinc-400 mb-1"
              >
                {t.dial.checkout.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || !hasSelection || !effectiveEmail}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg font-medium transition-colors"
          >
            {loading ? t.dial.checkout.processing : hasSelection ? `${t.dial.checkout.continueToPayment} — $${totalPrice}` : t.dial.checkout.selectService}
          </button>

          <p className="text-xs text-zinc-600 text-center">
            {isSignedIn
              ? t.dial.checkout.securePayment
              : t.dial.checkout.noAccountRequired}
          </p>
        </div>

        {/* Already have a session */}
        <div className="mt-12 text-center">
          <button
            onClick={() => {
              const sessionId = localStorage.getItem('dial_session_id');
              if (sessionId) {
                router.push(`/dial/session/${sessionId}`);
              }
            }}
            className="text-sm text-zinc-500 hover:text-zinc-300 underline"
          >
            {t.dial.checkout.returnToSession}
          </button>
        </div>
      </div>
    </div>
  );
}
