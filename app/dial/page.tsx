'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = [
  {
    id: 'omakase',
    name: 'Omakase Mix',
    price: '$12',
    description: 'AI auto-mix — upload stems, get a polished mix back.',
    mode: 'omakase' as const,
  },
  {
    id: 'dialogue',
    name: 'Dialogue Mix',
    price: '$23',
    description: 'Chat with Hoo to fine-tune your mix interactively.',
    mode: 'dialogue' as const,
  },
  {
    id: 'dialogue_mastering',
    name: 'Dialogue + Mastering',
    price: '$30',
    description: 'Full dialogue mix plus professional mastering.',
    mode: 'dialogue' as const,
  },
] as const;

export default function DialPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [musicalStyle, setMusicalStyle] = useState('pop');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!selectedPlan || !email) {
      setError('Please select a plan and enter your email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plan = PLANS.find((p) => p.id === selectedPlan);
      const res = await fetch('/api/dial/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseType: selectedPlan,
          email,
          musicalStyle,
          mode: plan?.mode,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Checkout failed');
        return;
      }

      // Store guest token for later access
      localStorage.setItem('dial_guest_token', data.data.guestToken);
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

        {/* Plan Selection */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`text-left p-6 rounded-xl border transition-all ${
                selectedPlan === plan.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
              }`}
            >
              <div className="text-2xl font-bold mb-1">{plan.price}</div>
              <div className="text-sm font-medium text-white mb-2">
                {plan.name}
              </div>
              <div className="text-sm text-zinc-400">{plan.description}</div>
            </button>
          ))}
        </div>

        {/* Checkout Form */}
        <div className="max-w-md mx-auto space-y-4">
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

          <div>
            <label
              htmlFor="style"
              className="block text-sm text-zinc-400 mb-1"
            >
              Musical Style
            </label>
            <select
              id="style"
              value={musicalStyle}
              onChange={(e) => setMusicalStyle(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="pop">Pop</option>
              <option value="rock">Rock</option>
              <option value="hiphop">Hip Hop</option>
              <option value="electronic">Electronic</option>
              <option value="jazz">Jazz</option>
              <option value="classical">Classical</option>
              <option value="rnb">R&B</option>
              <option value="country">Country</option>
              <option value="metal">Metal</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading || !selectedPlan || !email}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Processing...' : 'Continue to Payment'}
          </button>

          <p className="text-xs text-zinc-600 text-center">
            No account required. Secure payment via Stripe.
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
