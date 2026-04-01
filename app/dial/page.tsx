'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignInButton, UserButton } from '@clerk/nextjs';
import { useLocale } from '@/lib/i18n/locale-context';
import Image from 'next/image';
import Link from 'next/link';

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

// ─── Before/After Audio Demo ────────────────────────────────────────────────

const DEMO_TRACKS = [
  { key: 'before', src: '/audio/demo/Liberation_Before.mp3' },
  { key: 'after', src: '/audio/demo/Liberation_After.mp3' },
  { key: 'mastered', src: '/audio/demo/Liberation_RoEx_Final_Master.mp3' },
] as const;

function BeforeAfterDemo({ lp }: { lp: Record<string, string> }) {
  const [activeTrack, setActiveTrack] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  const switchTrack = useCallback((idx: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const wasPlaying = !audio.paused;
    const currentTime = audio.currentTime;
    setActiveTrack(idx);
    audio.src = DEMO_TRACKS[idx].src;
    audio.currentTime = currentTime;
    if (wasPlaying) audio.play();
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => { setIsPlaying(false); setProgress(0); };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  };

  const labels: Record<string, string> = {
    before: lp.before,
    after: lp.after,
    mastered: lp.mastered,
  };

  return (
    <section className="py-20 px-6 border-t border-zinc-900">
      <div className="max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2">{lp.beforeAfterLabel}</h2>
        <p className="text-sm text-white/50 text-center mb-10">{lp.beforeAfterSub}</p>

        {/* Track selector */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-800 mb-6">
          {DEMO_TRACKS.map((track, i) => (
            <button
              key={track.key}
              onClick={() => switchTrack(i)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTrack === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {labels[track.key]}
            </button>
          ))}
        </div>

        {/* Player */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-2">
                Liberation — <span className="text-indigo-400">{labels[DEMO_TRACKS[activeTrack].key]}</span>
              </div>
              <div
                className="h-1.5 bg-zinc-800 rounded-full cursor-pointer"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-indigo-500 rounded-full transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          <audio ref={audioRef} src={DEMO_TRACKS[0].src} preload="metadata" />
        </div>

      </div>
    </section>
  );
}

// ─── Video Promo Modal ──────────────────────────────────────────────────────

function VideoPromo({ lp, locale }: { lp: Record<string, string>; locale: string }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  const videoSrc = locale === 'ja'
    ? '/videos/muedial-promo-30-ja.mp4'
    : '/videos/muedial-promo-30-en.mp4';

  return (
    <>
      <section className="py-20 px-6 border-t border-zinc-900">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-8">{lp.promoLabel}</p>

          {/* Thumbnail with play button */}
          <button
            onClick={() => setOpen(true)}
            className="group relative w-full aspect-[9/16] max-w-[280px] mx-auto rounded-[var(--radius-lg)] overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer"
          >
            <Image
              src="/muedial-hoo-mixing-console.jpg"
              alt=""
              fill
              className="object-cover brightness-75 group-hover:brightness-90 transition-all"
            />
            {/* Play icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            {/* Label */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <span className="text-sm text-white/90">{lp.promoPlay}</span>
            </div>
          </button>
        </div>
      </section>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full max-w-[360px] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={close}
              className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <video
              ref={videoRef}
              src={videoSrc}
              controls
              autoPlay
              playsInline
              className="w-full rounded-[var(--radius-lg)]"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DialPage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { t, locale } = useLocale();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? '';

  const lp = t.dial.lp;

  const MIX_OPTIONS = [
    { id: 'omakase' as ServiceTier, name: t.dial.checkout.omakaseName, price: 8, description: t.dial.checkout.omakaseDesc },
    { id: 'dialogue' as ServiceTier, name: t.dial.checkout.dialogueName, price: 15, description: t.dial.checkout.dialogueDesc },
  ];

  const [email, setEmail] = useState('');
  const [mixType, setMixType] = useState<ServiceTier | null>('omakase');
  const [masteringType, setMasteringType] = useState<ServiceTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveEmail = isSignedIn ? clerkEmail : email;
  const hasSelection = mixType || masteringType;
  const totalPrice = (mixType ? MIX_OPTIONS.find((o) => o.id === mixType)!.price : 0)
    + (masteringType ? 6 : 0);

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

      if (data.data.guestToken) {
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
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/hoo-animated.svg" alt="" width={28} height={28} />
            <span className="text-lg font-bold tracking-tight">
              MUED<span className="text-amber-400">ial</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dial/pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              {lp.navPricing}
            </Link>
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Sign in
                </button>
              </SignInButton>
            )}
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
                    data-testid={`dial-mix-option-${opt.id}`}
                    className={`w-full text-left p-5 rounded-[var(--radius-lg)] border-2 transition-colors cursor-pointer ${
                      mixType === opt.id
                        ? 'border-white bg-white/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-base font-medium text-white">{opt.name}</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold">${opt.price}</span>
                      </div>
                    </div>
                    <div className="text-sm text-white/60">{opt.description}</div>
                  </button>
                ))}
              </div>

              {/* Mastering addon */}
              <button
                onClick={() => setMasteringType(masteringType ? null : 'omakase')}
                aria-pressed={!!masteringType}
                data-testid="dial-mastering-addon"
                className={`w-full text-left p-4 rounded-[var(--radius-lg)] border-2 transition-colors cursor-pointer mb-6 ${
                  masteringType
                    ? 'border-white bg-white/10'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold">+$6</span>
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
                    data-testid="dial-checkout-email"
                    required
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-[var(--radius-md)] text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 transition-colors"
                  />
                </div>
              )}

              {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

              {/* CTA */}
              <button
                onClick={handleCheckout}
                disabled={loading || !hasSelection || !effectiveEmail}
                data-testid="dial-checkout-submit"
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

              {/* Save with a Plan banner */}
              <Link
                href="/dial/pricing"
                className="mt-6 flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-300">{lp.planBannerTitle}</p>
                  <p className="text-xs text-white/40 mt-0.5">{lp.planBannerDesc}</p>
                </div>
                <span className="text-xs font-medium text-amber-400 group-hover:text-amber-300 shrink-0">
                  {lp.planBannerCta} →
                </span>
              </Link>
            </div>

            {/* ChatMockup — mobile only, after checkout */}
            <div className="lg:hidden">
              <ChatMockup t={t as unknown as Record<string, unknown>} />
            </div>
          </div>
        </div>

        {/* ─── Before/After Audio Demo ─────────────────────────────── */}
        <BeforeAfterDemo lp={lp} />

        {/* ─── Video Promo ────────────────────────────────────────────── */}
        <VideoPromo lp={lp as unknown as Record<string, string>} locale={locale} />

        {/* ─── FAQ ──────────────────────────────────────────────────── */}
        <section className="py-20 px-6 border-t border-zinc-900">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-10 text-center">{lp.faqTitle}</h2>
            <dl className="space-y-6">
              {([1, 2, 3, 4, 5, 6] as const).map((n) => (
                <div key={n} className="border-b border-zinc-800 pb-6 last:border-0">
                  <dt className="text-base font-medium text-white mb-2">
                    {lp[`faq${n}q` as keyof typeof lp]}
                  </dt>
                  <dd className="text-sm text-white/60 leading-relaxed">
                    {lp[`faq${n}a` as keyof typeof lp]}
                  </dd>
                </div>
              ))}
            </dl>
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
