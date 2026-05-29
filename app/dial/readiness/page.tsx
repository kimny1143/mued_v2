'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from '@/lib/i18n/locale-context';
import { trackReadinessStart, trackReadinessComplete, trackCtaClick } from '@/lib/analytics/gtag';
import { analyzeStem } from '@/lib/dsp/analyzeStem';
import type { DiagnosisResult, DiagnosisIssue } from '@/lib/dsp/analyzeStem';

type Step = 'questionnaire' | 'upload' | 'diagnosis';
type AnalyzeState = 'idle' | 'browser' | 'server' | 'done' | 'error';

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

function mergeDiagnoses(
  browser: DiagnosisResult | null,
  server: DiagnosisResult | null,
): DiagnosisResult {
  const allIssues: DiagnosisIssue[] = [
    ...(browser?.issues ?? []),
    ...(server?.issues ?? []),
  ];
  let score = 100;
  for (const issue of allIssues) {
    if (issue.severity === 'critical') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 2;
  }
  score = Math.max(0, score);
  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const qualified = criticalCount === 0 && score >= 70;
  const summary = browser?.summary ?? server?.summary ?? '';
  return { qualified, score, issues: allIssues, summary };
}

const RAW_ARTICLE_LINKS = [
  { href: 'https://note.com/mued_glasswerks/n/nb99163d87b30', label: 'ステム→マスターの全体像' },
  { href: 'https://note.com/mued_glasswerks/n/n83f75dcee4d4', label: 'ミックス環境の準備' },
  { href: 'https://note.com/mued_glasswerks/n/n76c9ca878b01', label: '判断疲労とミックス準備' },
];

function SeverityBadge({ severity, labels }: {
  severity: DiagnosisIssue['severity'];
  labels: { critical: string; warning: string; info: string };
}) {
  const map = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/40',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  };
  const text = { critical: labels.critical, warning: labels.warning, info: labels.info };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${map[severity]}`}>
      {text[severity]}
    </span>
  );
}

export default function ReadinessPage() {
  const { t, locale } = useLocale();
  const r = t.readiness;
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('questionnaire');
  const [answers, setAnswers] = useState<Answers>({ q1: '', q2: '', q3: '', q4: '' });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionnaireQualified, setQuestionnaireQualified] = useState(false);

  // Upload / diagnosis state
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  useEffect(() => {
    trackReadinessStart();
  }, []);

  async function handleQuestionnaireSubmit(e: React.FormEvent) {
    e.preventDefault();
    const score = calcScore(answers);
    const isQualified = score >= 3;
    setQuestionnaireQualified(isQualified);

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
        // Fail silently
      } finally {
        setLoading(false);
      }
    }

    setStep('upload');
  }

  const processFile = useCallback(async (file: File) => {
    const MAX = 30 * 1024 * 1024;
    const exts = new Set(['wav', 'mp3', 'aif', 'aiff', 'flac']);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (file.size > MAX || !exts.has(ext)) {
      setAnalyzeError(
        locale === 'ja'
          ? 'ファイルが大きすぎるか、対応していない形式です（WAV/MP3/AIF/FLAC、最大30MB）'
          : 'File too large or unsupported format (WAV/MP3/AIF/FLAC, max 30MB)',
      );
      return;
    }

    setAnalyzeError(null);
    setAnalyzeState('browser');
    setDiagnosis(null);

    // Browser analysis (Web Audio API)
    const browserPromise = (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new AudioContext();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        await audioCtx.close();
        return await analyzeStem(audioBuffer, locale as 'ja' | 'en');
      } catch {
        return null;
      }
    })();

    // Server analysis (RoEx via API)
    setAnalyzeState('server');
    const serverPromise = (async () => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/dial/readiness/analyze?locale=${locale}`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error('Server analysis failed');
      const json = await res.json();
      return json.data?.diagnosis as DiagnosisResult | null;
    })();

    const [browserResult, serverResult] = await Promise.allSettled([browserPromise, serverPromise]);

    const bDiag = browserResult.status === 'fulfilled' ? browserResult.value : null;
    const sDiag = serverResult.status === 'fulfilled' ? serverResult.value : null;

    if (!bDiag && !sDiag) {
      setAnalyzeState('error');
      setAnalyzeError(
        locale === 'ja'
          ? '解析に失敗しました。ファイルを確認して再度お試しください。'
          : 'Analysis failed. Please check your file and try again.',
      );
      return;
    }

    setDiagnosis(mergeDiagnoses(bDiag, sDiag));
    setAnalyzeState('done');
    setStep('diagnosis');
  }, [locale]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleWaitlistCta(isQualified: boolean) {
    trackCtaClick('waitlist_from_readiness', isQualified ? 'result_qualified' : 'result_raw');
    const params = new URLSearchParams({ from: 'readiness', qualified: String(isQualified) });
    // Pass readiness answers so the waitlist API can re-run calcReadinessScore accurately
    params.set('launches_within_30d', String(answers.q1 === 'yes'));
    params.set('has_stems', String(answers.q2 === 'have' || answers.q2 === 'can_export'));
    params.set('vocal_ready', String(answers.q3 === 'done' || answers.q3 === 'instrumental'));
    if (answers.q4 && answers.q4 !== 'unknown') params.set('product_intent', answers.q4);
    router.push(`/dial/waitlist?${params.toString()}`);
  }

  function handleSkipUpload() {
    setStep('diagnosis');
    setDiagnosis(null);
  }

  function handleRetry() {
    setAnalyzeState('idle');
    setDiagnosis(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const severityLabels = {
    critical: r.diagnosisStep.severityCritical,
    warning: r.diagnosisStep.severityWarning,
    info: r.diagnosisStep.severityInfo,
  };

  // ── Step 3: Diagnosis ─────────────────────────────────────────────────────
  if (step === 'diagnosis') {
    const d = diagnosis;
    const effectiveQualified = d ? d.qualified : questionnaireQualified;

    if (effectiveQualified) {
      return (
        <div className="min-h-screen bg-bg-primary text-white flex flex-col items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full">
            {d && (
              <section className="mb-8 p-5 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">{r.diagnosisStep.h2}</h2>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">{r.diagnosisStep.score}</span>
                    <span className="ml-2 text-2xl font-bold text-amber-400">{d.score}</span>
                    <span className="text-gray-400 text-sm">/100</span>
                  </div>
                </div>
                {d.issues.length === 0 ? (
                  <p className="text-green-400 text-sm">{r.diagnosisStep.noIssues}</p>
                ) : (
                  <ul className="space-y-3">
                    {d.issues.map((issue, i) => (
                      <li key={i} className="text-sm">
                        <div className="flex items-start gap-2 mb-0.5">
                          <SeverityBadge severity={issue.severity} labels={severityLabels} />
                          <span className="text-white">{issue.message}</span>
                        </div>
                        {issue.fix && (
                          <p className="text-gray-400 pl-[60px] text-xs">{issue.fix}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
            <div className="text-center">
              <div className="text-amber-400 text-5xl mb-6">🎚️</div>
              <h1 className="text-3xl font-bold mb-4">{r.resultQualified.h1}</h1>
              <p className="text-gray-300 mb-8 whitespace-pre-line">{r.resultQualified.sub}</p>
              <button
                onClick={() => handleWaitlistCta(true)}
                className="block w-full py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-colors mb-4"
              >
                {r.resultQualified.cta}
              </button>
              <a
                href="https://dial.mued.jp/pricing"
                className="text-sm text-amber-400 hover:underline"
                onClick={() => trackCtaClick('muedial_try_now', 'readiness_qualified')}
              >
                {r.resultQualified.secondary}
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-bg-primary text-white flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          {d && (
            <section className="mb-8 p-5 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{r.diagnosisStep.h2}</h2>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{r.diagnosisStep.score}</span>
                  <span className="ml-2 text-2xl font-bold text-red-400">{d.score}</span>
                  <span className="text-gray-400 text-sm">/100</span>
                </div>
              </div>
              {d.issues.length === 0 ? (
                <p className="text-green-400 text-sm">{r.diagnosisStep.noIssues}</p>
              ) : (
                <ul className="space-y-3">
                  {d.issues.map((issue, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-start gap-2 mb-0.5">
                        <SeverityBadge severity={issue.severity} labels={severityLabels} />
                        <span className="text-white">{issue.message}</span>
                      </div>
                      {issue.fix && (
                        <p className="text-gray-400 pl-[60px] text-xs">{issue.fix}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={handleRetry}
                className="mt-4 text-xs text-amber-400 hover:underline"
              >
                {r.diagnosisStep.retry} →
              </button>
            </section>
          )}
          <div className="text-center">
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
      </div>
    );
  }

  // ── Step 2: Upload ────────────────────────────────────────────────────────
  if (step === 'upload') {
    const isAnalyzing = analyzeState === 'browser' || analyzeState === 'server';
    const analyzingLabel =
      analyzeState === 'browser' ? r.uploadStep.analyzingBrowser : r.uploadStep.analyzingServer;

    return (
      <div className="min-h-screen bg-bg-primary text-white">
        <section className="max-w-2xl mx-auto px-4 pt-8 md:pt-16 pb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{r.uploadStep.h2}</h1>
          <p className="text-gray-300">{r.uploadStep.sub}</p>
        </section>

        <section className="max-w-lg mx-auto px-4 pb-16">
          <div
            role="button"
            tabIndex={isAnalyzing ? -1 : 0}
            aria-label={r.uploadStep.dropzone}
            className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
              isDragOver
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-white/20 hover:border-amber-500/50 hover:bg-white/5'
            } ${isAnalyzing ? 'pointer-events-none opacity-60' : ''}`}
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && !isAnalyzing && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.aif,.aiff,.flac,audio/*"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={isAnalyzing}
            />
            {isAnalyzing ? (
              <>
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-amber-400 font-medium">{analyzingLabel}</p>
              </>
            ) : isDragOver ? (
              <p className="text-amber-400 font-medium text-lg">{r.uploadStep.dropzoneActive}</p>
            ) : (
              <>
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-white whitespace-pre-line font-medium">{r.uploadStep.dropzone}</p>
                <p className="text-xs text-gray-500">{r.uploadStep.accept}</p>
                <p className="text-xs text-gray-600">{r.uploadStep.privacyNote}</p>
              </>
            )}
          </div>

          {analyzeError && (
            <p className="mt-4 text-center text-sm text-red-400">{analyzeError}</p>
          )}

          {!isAnalyzing && (
            <button
              onClick={handleSkipUpload}
              className="mt-6 block w-full text-center text-sm text-gray-400 hover:text-amber-400 transition-colors py-2"
            >
              {r.uploadStep.skip}
            </button>
          )}
        </section>
      </div>
    );
  }

  // ── Step 1: Questionnaire ─────────────────────────────────────────────────
  const allAnswered = answers.q1 && answers.q2 && answers.q3 && answers.q4;

  return (
    <div className="min-h-screen bg-bg-primary text-white">
      <section className="max-w-2xl mx-auto px-4 pt-8 md:pt-16 pb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{r.hero.h1}</h1>
        <p className="text-gray-300 mb-1">{r.hero.sub}</p>
        <p className="text-sm text-gray-500">{r.hero.duration}</p>
      </section>

      <section className="max-w-lg mx-auto px-4 pb-16">
        <form onSubmit={handleQuestionnaireSubmit} className="space-y-8">
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
            className="w-full py-3 min-h-[44px] bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
          >
            {loading ? r.submitting : r.submit}
          </button>
        </form>
      </section>
    </div>
  );
}
