'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/locale-context';
import {
  trackWaitlistView,
  trackWaitlistSubmit,
  trackWaitlistSuccess,
  trackCtaClick,
} from '@/lib/analytics/gtag';

type DtmYears = 'under_1y' | '1_3y' | '3_5y' | 'over_5y' | '';

export default function WaitlistPage() {
  const { t, locale } = useLocale();
  const w = t.waitlist;
  const searchParams = useSearchParams();
  const fromReadiness = searchParams.get('from') === 'readiness';
  const qualifiedFromReadiness = searchParams.get('qualified') === 'true';

  const [email, setEmail] = useState('');
  const [dtmYears, setDtmYears] = useState<DtmYears>('');
  const [challenge, setChallenge] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [qualifiedResult, setQualifiedResult] = useState(false);

  useEffect(() => {
    trackWaitlistView();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;

    const utm = Object.fromEntries(
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].map((k) => [
        k,
        searchParams.get(k) ?? null,
      ])
    );

    trackWaitlistSubmit({
      dtm_years: dtmYears || null,
      has_pain_point: challenge.trim().length > 0,
      from: fromReadiness ? 'readiness' : 'direct',
    });

    setLoading(true);
    try {
      const res = await fetch('/api/research/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          locale,
          source: fromReadiness ? 'readiness' : 'lp',
          dtm_years: dtmYears || undefined,
          challenge: challenge.trim() || undefined,
          ...utm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQualifiedResult(data.data?.qualified_waitlist ?? false);
        trackWaitlistSuccess({ qualified: data.data?.qualified_waitlist ?? false });
        setDone(true);
      } else {
        setError(locale === 'ja' ? '登録に失敗しました。もう一度お試しください。' : 'Registration failed. Please try again.');
      }
    } catch {
      setError(locale === 'ja' ? 'ネットワークエラーが発生しました。' : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg-primary text-white flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="text-amber-400 text-5xl mb-6">🎚️</div>
          <h1 className="text-3xl font-bold mb-4">{w.thankyou.h1}</h1>
          <p className="text-gray-300 mb-8 whitespace-pre-line">{w.thankyou.sub}</p>
          <a
            href="https://dial.mued.jp"
            onClick={() => trackCtaClick('muedial_from_waitlist_thanks', 'waitlist_thankyou')}
            className="inline-block px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
          >
            {w.thankyou.cta}
          </a>
          {qualifiedResult && (
            <p className="mt-4 text-sm text-amber-400">✓ {locale === 'ja' ? '診断スコア: qualified' : 'Readiness: qualified'}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium mb-6">
          🟡 {w.hero.badge}
        </div>
        {fromReadiness && qualifiedFromReadiness && (
          <div className="mb-4 inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
            ✓ {w.hero.qualifiedBadge}
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 whitespace-pre-line">
          {w.hero.h1}
        </h1>
        <p className="text-lg text-gray-300 mb-8 whitespace-pre-line">{w.hero.sub}</p>
        <a
          href="#form"
          className="inline-block px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors"
        >
          {w.hero.cta}
        </a>
      </section>

      {/* Differentiator */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">{w.diff.title}</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {w.diff.cols.map((col) => (
            <div key={col.title} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="text-3xl mb-3">{col.icon}</div>
              <h3 className="font-bold text-amber-400 mb-2">{col.title}</h3>
              <p className="text-sm text-gray-300">{col.desc}</p>
            </div>
          ))}
        </div>
        {/* Comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-white/5">
                <th className="px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-amber-400 font-bold">MUEDial</th>
                <th className="px-4 py-3 text-gray-400">eMastered</th>
                <th className="px-4 py-3 text-gray-400">LANDR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {[
                { label: locale === 'ja' ? '会話でリテイク' : 'Revise by talking', muedial: true, emastered: false, landr: null },
                { label: locale === 'ja' ? '日本語対応' : 'Japanese support', muedial: true, emastered: false, landr: null },
                { label: locale === 'ja' ? 'ミキシング対応' : 'Mixing', muedial: true, emastered: false, landr: null },
                { label: locale === 'ja' ? 'マスタリング対応' : 'Mastering', muedial: true, emastered: true, landr: true },
              ].map((row) => (
                <tr key={row.label} className="hover:bg-white/3">
                  <td className="px-4 py-3 text-gray-300">{row.label}</td>
                  <td className="px-4 py-3 text-center text-green-400">✅</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.emastered ? '✅' : '✗'}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.landr === true ? '✅' : row.landr === null ? '△' : '✗'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">{w.diff.tableNote}</p>
        <p className="text-xs text-gray-500 mt-1 text-center">{w.diff.pricingNote}</p>
      </section>

      {/* Benefits */}
      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-center mb-8">{w.benefits.title}</h2>
        <div className="space-y-4">
          {w.benefits.items.map((item) => (
            <div key={item.title} className="flex gap-4 bg-white/5 rounded-xl p-5 border border-white/10">
              <span className="text-2xl shrink-0">{item.icon}</span>
              <div>
                <h3 className="font-bold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-300">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section id="form" className="max-w-lg mx-auto px-4 py-12 scroll-mt-8">
        <h2 className="text-2xl font-bold text-center mb-8">{w.form.title}</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              {w.form.emailLabel} <span className="text-amber-400">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={w.form.emailPlaceholder}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-500/50 text-white placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{w.form.dtmLabel}</label>
            <select
              value={dtmYears}
              onChange={(e) => setDtmYears(e.target.value as DtmYears)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-500/50 text-white"
            >
              <option value="">{w.form.dtmNone}</option>
              <option value="under_1y">{w.form.dtmUnder1y}</option>
              <option value="1_3y">{w.form.dtm1_3y}</option>
              <option value="3_5y">{w.form.dtm3_5y}</option>
              <option value="over_5y">{w.form.dtmOver5y}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{w.form.challengeLabel}</label>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder={w.form.challengePlaceholder}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-500/50 text-white placeholder-gray-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
          >
            {loading ? w.form.submitting : w.form.submit}
          </button>
          <p className="text-xs text-gray-500 text-center">
            {w.form.notice}{' '}
            <Link href="/privacy" className="underline hover:text-gray-300">{w.form.privacyLink}</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
