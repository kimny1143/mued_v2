'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackReadinessStart, trackReadinessComplete, trackCtaClick } from '@/lib/analytics/gtag';

interface Answers {
  q1: 'yes' | 'no' | '';
  q2: 'have' | 'can_export' | 'unknown' | '';
  q3: 'done' | 'instrumental' | 'not_done' | 'unknown' | '';
  q4: 'omakase' | 'dialogue' | 'mastering' | 'unknown' | '';
}

function calcScore(answers: Answers): number {
  let score = 0;
  if (answers.q1 === 'yes') score++;
  if (answers.q2 === 'have' || answers.q2 === 'can_export') score++;
  if (answers.q3 === 'done' || answers.q3 === 'instrumental') score++;
  if (answers.q4 !== 'unknown' && answers.q4 !== '') score++;
  return score;
}

// note article links (Raw result) — write課から5/12以降提供予定、暫定
const RAW_ARTICLE_LINKS = [
  { href: 'https://note.com/mued_glasswerks/n/nb99163d87b30', label: 'ステム→マスターの全体像' },
  { href: 'https://note.com/mued_glasswerks/n/n83f75dcee4d4', label: 'ミックス環境の準備' },
  { href: 'https://note.com/mued_glasswerks/n/n76c9ca878b01', label: '判断疲労とミックス準備' },
];

export default function ReadinessPage() {
  const { t, locale } = useLocale();
  const r = t.readiness;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [answers, setAnswers] = useState<Answers>({ q1: '', q2: '', q3: '', q4: '' });
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [qualified, setQualified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackReadinessStart();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const score = calcScore(answers);
    const isQualified = score >= 3;
    setQualified(isQualified);

    const hasEmail = email.trim().length > 0;

    trackReadinessComplete({ score, qualified: isQualified, has_email: hasEmail });

    if (hasEmail) {
      setLoading(true);
      const utm = Object.fromEntries(
        ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].map((k) => [
          k,
          searchParams.get(k) ?? null,
        ])
      );
      try {
        await fetch('/api/research/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            locale,
            source: 'readiness',
            launches_within_30d: answers.q1 === 'yes',
            has_stems: answers.q2 === 'have' || answers.q2 === 'can_export',
            vocal_ready: answers.q3 === 'done' || answers.q3 === 'instrumental',
            product_intent: answers.q4 !== 'unknown' && answers.q4 !== '' ? answers.q4 : null,
            ...utm,
          }),
        });
      } catch {
        // Fail silently — results are still shown
      } finally {
        setLoading(false);
      }
    }
    setSubmitted(true);
  }

  function handleWaitlistCta(isQualified: boolean) {
    trackCtaClick('waitlist_from_readiness', isQualified ? 'result_qualified' : 'result_raw');
    const params = new URLSearchParams({
      from: 'readiness',
      qualified: String(isQualified),
    });
    router.push(`/waitlist?${params.toString()}`);
  }

  if (submitted) {
    if (qualified) {
      return (
        <div className="min-h-screen bg-bg-primary text-white flex flex-col items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full text-center">
            <div className="text-amber-400 text-5xl mb-6">🎚️</div>
            <h1 className="text-3xl font-bold mb-4">{r.resultQualified.h1}</h1>
            <p className="text-gray-300 mb-8 whitespace-pre-line">{r.resultQualified.sub}</p>
            <button
              onClick={() => handleWaitlistCta(true)}
              className="block w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors mb-4"
            >
              {r.resultQualified.cta}
            </button>
            <a
              href="https://dial.mued.jp"
              className="text-sm text-amber-400 hover:underline"
              onClick={() => trackCtaClick('muedial_try_now', 'readiness_qualified')}
            >
              {r.resultQualified.secondary}
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-bg-primary text-white flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full text-center">
          <div className="text-5xl mb-6">📚</div>
          <h1 className="text-3xl font-bold mb-4">{r.resultRaw.h1}</h1>
          <p className="text-gray-300 mb-6 whitespace-pre-line">{r.resultRaw.sub}</p>
          <div className="space-y-2 mb-8">
            {RAW_ARTICLE_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-amber-400 hover:underline text-sm"
              >
                → {link.label}
              </a>
            ))}
          </div>
          <p className="text-sm text-gray-400 mb-3">{r.resultRaw.secondary}</p>
          <button
            onClick={() => handleWaitlistCta(false)}
            className="inline-block px-6 py-2 border border-amber-500/40 text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors text-sm"
          >
            {r.resultRaw.secondaryCta}
          </button>
        </div>
      </div>
    );
  }

  const allAnswered = answers.q1 && answers.q2 && answers.q3 && answers.q4;

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      <section className="max-w-2xl mx-auto px-4 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-bold mb-3 whitespace-pre-line">{r.hero.h1}</h1>
        <p className="text-gray-300 mb-1">{r.hero.sub}</p>
        <p className="text-sm text-gray-500">{r.hero.duration}</p>
      </section>

      <section className="max-w-lg mx-auto px-4 pb-16">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Q1 */}
          <fieldset>
            <legend className="block font-semibold mb-3">{r.q1.question}</legend>
            <div className="space-y-2">
              {([['yes', r.q1.yes], ['no', r.q1.no]] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${answers.q1 === val ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 hover:border-white/30'}`}>
                  <input type="radio" name="q1" value={val} checked={answers.q1 === val} onChange={() => setAnswers((a) => ({ ...a, q1: val }))} className="accent-amber-400" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Q2 */}
          <fieldset>
            <legend className="block font-semibold mb-3">{r.q2.question}</legend>
            <div className="space-y-2">
              {([['have', r.q2.have], ['can_export', r.q2.can_export], ['unknown', r.q2.unknown]] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${answers.q2 === val ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 hover:border-white/30'}`}>
                  <input type="radio" name="q2" value={val} checked={answers.q2 === val} onChange={() => setAnswers((a) => ({ ...a, q2: val }))} className="accent-amber-400" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Q3 */}
          <fieldset>
            <legend className="block font-semibold mb-3">{r.q3.question}</legend>
            <div className="space-y-2">
              {([['done', r.q3.done], ['instrumental', r.q3.instrumental], ['not_done', r.q3.not_done], ['unknown', r.q3.unknown]] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${answers.q3 === val ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 hover:border-white/30'}`}>
                  <input type="radio" name="q3" value={val} checked={answers.q3 === val} onChange={() => setAnswers((a) => ({ ...a, q3: val }))} className="accent-amber-400" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Q4 */}
          <fieldset>
            <legend className="block font-semibold mb-3">{r.q4.question}</legend>
            <p className="text-xs text-amber-400/70 mb-3">{r.pricingNote}</p>
            <div className="space-y-2">
              {([['omakase', r.q4.omakase], ['dialogue', r.q4.dialogue], ['mastering', r.q4.mastering], ['unknown', r.q4.unknown]] as const).map(([val, label]) => (
                <label key={val} className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${answers.q4 === val ? 'border-amber-500/60 bg-amber-500/10' : 'border-white/10 hover:border-white/30'}`}>
                  <input type="radio" name="q4" value={val} checked={answers.q4 === val} onChange={() => setAnswers((a) => ({ ...a, q4: val }))} className="accent-amber-400" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Optional email */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">{r.emailOptional.label}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={r.emailOptional.placeholder}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-amber-500/50 text-white placeholder-gray-500 mb-1"
            />
            <p className="text-xs text-gray-500">{r.emailOptional.note}</p>
          </div>

          <button
            type="submit"
            disabled={!allAnswered || loading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
          >
            {loading ? r.submitting : r.submit}
          </button>
        </form>
      </section>
    </div>
  );
}
