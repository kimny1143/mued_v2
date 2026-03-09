'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';

type ServiceTier = 'omakase' | 'dialogue';

const MIX_OPTIONS = [
  { id: 'omakase' as ServiceTier, name: 'Omakase Mix', price: 12, description: 'AI auto-mix — upload stems, get a polished mix back.' },
  { id: 'dialogue' as ServiceTier, name: 'Dialogue Mix', price: 35, description: 'Chat with Hoo to fine-tune your mix interactively.' },
];


export default function DialPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';

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
      setError(isSignedIn ? 'Please select at least one service.' : 'Please select a service and enter your email.');
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
        setError(data.error || 'Checkout failed');
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
      setError('Network error. Please try again.');
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
            AI-powered mixing and mastering. Upload your stems, get a
            professional mix — no account required.
          </p>
        </div>

        {/* Step 1: Mix */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Step 1: Mixing</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {MIX_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setMixType(mixType === opt.id ? null : opt.id)}
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
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Step 2: Mastering</h2>
          <button
            onClick={() => setMasteringType(masteringType ? null : 'omakase')}
            className={`w-full text-left p-5 rounded-xl border transition-all ${
              masteringType
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <div className="text-xl font-bold mb-1">$5</div>
            <div className="text-sm font-medium text-white mb-1">Mastering</div>
            <div className="text-xs text-zinc-400">AI auto-master — optimized loudness and polish for release.</div>
          </button>
        </div>

        {/* Total */}
        {hasSelection && (
          <div className="mb-8 text-center">
            <span className="text-3xl font-bold">${totalPrice}</span>
            <span className="text-zinc-400 ml-2 text-sm">total</span>
          </div>
        )}

        {/* Checkout Form */}
        <div className="max-w-md mx-auto space-y-4">
          {isSignedIn ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg">
              <span className="text-sm text-zinc-400">Signed in as</span>
              <span className="text-sm text-white">{clerkEmail}</span>
            </div>
          ) : (
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-zinc-400 mb-1"
              >
                Email
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
            {loading ? 'Processing...' : hasSelection ? `Continue to Payment — $${totalPrice}` : 'Select a service'}
          </button>

          <p className="text-xs text-zinc-600 text-center">
            {isSignedIn
              ? 'Secure payment via Stripe.'
              : 'No account required. Secure payment via Stripe.'}
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
            Return to existing session
          </button>
        </div>
      </div>
    </div>
  );
}
