'use client';

import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';
import Image from 'next/image';

type ServiceTier = 'omakase' | 'dialogue';

// ─── Chat Mockup ────────────────────────────────────────────────────────────

function ChatMockup({ t }: { t: Record<string, unknown> }) {
  const lp = (t as { dial: { lp: Record<string, string> } }).dial.lp;
  return (
    <div className="w-full max-w-sm">
      <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">{lp.chatMockLabel}</p>
      <div className="border border-zinc-800 rounded-[var(--radius-lg)] overflow-hidden bg-zinc-950">
        {/* Header */}
        <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Image src="/hoo-animated.svg" alt="" width={24} height={24} />
            <span className="text-amber-400 text-sm font-medium">Hoo</span>
            <span className="text-zinc-500 text-xs">Mixing Assistant</span>
          </div>
        </div>
        {/* Messages */}
        <div className="p-3 space-y-2.5">
          <div className="flex justify-end">
            <div className="max-w-[85%] px-3 py-2 rounded-[var(--radius-md)] bg-indigo-600/30 text-white text-sm leading-relaxed">
              {lp.chatMockUser1}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3 py-2 rounded-[var(--radius-md)] bg-zinc-800 text-zinc-200 text-sm leading-relaxed">
              {lp.chatMockHoo1}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="px-2.5 py-1 rounded-[var(--radius-sm)] bg-green-900/10 border border-green-800/30">
              <span className="text-xs text-green-400 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Preview updated
              </span>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[85%] px-3 py-2 rounded-[var(--radius-md)] bg-indigo-600/30 text-white text-sm leading-relaxed">
              {lp.chatMockUser2}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DialPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { t } = useLocale();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  const lp = t.dial.lp;

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
        body: JSON.stringify({ mixType, masteringType, email: effectiveEmail }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || t.dial.checkout.checkoutFailed);
        return;
      }

      if (!isSignedIn) {
        localStorage.setItem('dial_guest_token', data.data.guestToken);
      }
      localStorage.setItem('dial_session_id', data.data.sessionId);
      window.location.href = data.data.url;
    } catch {
      setError(t.dial.checkout.networkError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ─── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <div className="flex items-center gap-2">
            <Image src="/hoo-animated.svg" alt="" width={28} height={28} />
            <span className="text-lg font-bold tracking-tight">
              MUED<span className="text-amber-400">ial</span>
            </span>
          </div>
        </div>
      </nav>

      {/* ─── Main: Hook + Checkout ────────────────────────────────────── */}
      <main className="pt-14">
        <div className="relative min-h-[calc(100vh-3.5rem)] flex items-center px-6 py-16 lg:py-0">
          {/* Background image */}
          <Image
            src="/muedial-hoo-mixing-console.jpg"
            alt=""
            fill
            className="object-cover object-[center_30%]"
            priority
          />
          {/* Dark overlay — heavier on right (checkout side) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/45 to-black/65" />
          {/* Bottom fade to solid black (seamless transition to next section) */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

          <div className="relative z-10 max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: Hook */}
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                {lp.heroTitle}
              </h1>
              <p className="text-lg text-white/70 mb-16 max-w-md">
                {lp.heroSub}
              </p>
              {/* ChatMockup — desktop only (mobile shows after checkout) */}
              <div className="hidden lg:block">
                <ChatMockup t={t as unknown as Record<string, unknown>} />
              </div>
            </div>

            {/* Right: Checkout */}
            <div className="lg:max-w-md lg:ml-auto bg-black/50 backdrop-blur-sm rounded-[var(--radius-lg)] p-6 lg:p-8 border border-white/5">
              {/* Mix options */}
              <div className="space-y-3 mb-4" role="radiogroup" aria-label={t.dial.checkout.step1}>
                {MIX_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setMixType(mixType === opt.id ? null : opt.id)}
                    aria-pressed={mixType === opt.id}
                    className={`w-full text-left p-5 rounded-[var(--radius-lg)] border-2 transition-colors cursor-pointer ${
                      mixType === opt.id
                        ? 'border-white bg-white/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-base font-medium text-white">{opt.name}</span>
                      <span className="text-2xl font-bold">${opt.price}</span>
                    </div>
                    <div className="text-sm text-white/60">{opt.description}</div>
                  </button>
                ))}
              </div>

              {/* Mastering addon */}
              <button
                onClick={() => setMasteringType(masteringType ? null : 'omakase')}
                aria-pressed={!!masteringType}
                className={`w-full text-left p-4 rounded-[var(--radius-lg)] border-2 transition-colors cursor-pointer mb-6 ${
                  masteringType
                    ? 'border-white bg-white/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold">+$5</span>
                  <span className="text-sm font-medium">{t.dial.checkout.masteringName}</span>
                </div>
                <div className="text-xs text-white/60 mt-1">{t.dial.checkout.masteringDesc}</div>
              </button>

              {/* Email (guest) or signed-in indicator */}
              {isSignedIn ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-black/30 border border-white/10 rounded-[var(--radius-md)] mb-4">
                  <span className="text-sm text-zinc-400">{t.dial.checkout.signedInAs}</span>
                  <span className="text-sm text-white">{clerkEmail}</span>
                </div>
              ) : (
                <div className="mb-4">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.dial.checkout.email}
                    aria-label={t.dial.checkout.email}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-[var(--radius-md)] text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

              {/* CTA */}
              <button
                onClick={handleCheckout}
                disabled={loading || !hasSelection || !effectiveEmail}
                className="w-full py-4 bg-white text-black font-medium rounded-[var(--radius-md)] hover:bg-white/90 disabled:bg-zinc-800 disabled:text-white/50 transition-colors cursor-pointer"
              >
                {loading
                  ? t.dial.checkout.processing
                  : hasSelection
                    ? `${t.dial.checkout.continueToPayment} — $${totalPrice}`
                    : t.dial.checkout.selectService}
              </button>

              <p className="text-xs text-white/30 text-center mt-3">
                {isSignedIn ? t.dial.checkout.securePayment : t.dial.checkout.noAccountRequired}
              </p>
            </div>

            {/* ChatMockup — mobile only, after checkout */}
            <div className="lg:hidden">
              <ChatMockup t={t as unknown as Record<string, unknown>} />
            </div>
          </div>
        </div>

        {/* ─── Before / After ─────────────────────────────────────────── */}
        <section className="py-20 px-6 border-t border-zinc-900">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-white/50 uppercase tracking-wider mb-8 text-center">{lp.beforeAfterLabel}</p>
            <div className="grid grid-cols-2 gap-4">
              {/* Before */}
              <div className="p-4 rounded-[var(--radius-lg)] border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/60 font-medium">{lp.before}</span>
                  <button disabled className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center cursor-not-allowed" aria-label="Play before">
                    <svg className="w-3 h-3 text-zinc-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                {/* Waveform placeholder */}
                <div className="flex items-end gap-[2px] h-10">
                  {[3, 5, 4, 7, 6, 4, 8, 5, 3, 6, 9, 7, 5, 4, 6, 8, 5, 3, 7, 4, 6, 5, 3, 4, 7, 5, 3, 6, 4, 5, 3, 4].map((h, i) => (
                    <div key={i} className="flex-1 bg-zinc-700 rounded-sm" style={{ height: `${h * 10}%` }} />
                  ))}
                </div>
              </div>
              {/* After */}
              <div className="p-4 rounded-[var(--radius-lg)] border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-amber-400 font-medium">{lp.after}</span>
                  <button disabled className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center cursor-not-allowed" aria-label="Play after">
                    <svg className="w-3 h-3 text-zinc-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
                {/* Waveform placeholder — more dynamic shape */}
                <div className="flex items-end gap-[2px] h-10">
                  {[4, 7, 6, 9, 8, 6, 10, 7, 5, 8, 10, 9, 7, 6, 8, 10, 7, 5, 9, 6, 8, 7, 5, 6, 9, 7, 5, 8, 6, 7, 5, 6].map((h, i) => (
                    <div key={i} className="flex-1 bg-amber-400/40 rounded-sm" style={{ height: `${h * 10}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-white/40 text-center mt-4">{lp.comingSoon}</p>
          </div>
        </section>

        {/* ─── Footer ─────────────────────────────────────────────────── */}
        <div className="border-t border-zinc-900 py-6 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span className="text-xs text-white/30">MUED</span>
            <div className="flex items-center gap-4">
              <a
                href="https://mued.jp/ja/tokushoho"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                {t.dial.checkout.tokushoho}
              </a>
              <a
                href="https://mued.jp/ja/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-white/30 hover:text-white/50 transition-colors"
              >
                {t.dial.checkout.privacy}
              </a>
              <button
                onClick={() => {
                  const sessionId = localStorage.getItem('dial_session_id');
                  if (sessionId) {
                    window.location.href = `/dial/session/${sessionId}`;
                  }
                }}
                className="text-xs text-white/30 hover:text-white/50 transition-colors cursor-pointer"
              >
                {t.dial.checkout.returnToSession}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
