/**
 * Readiness Stem Analysis API
 * POST /api/dial/readiness/analyze?locale=ja|en
 *
 * Accepts a single audio file (FormData), uploads to Vercel Blob,
 * runs RoEx Mix Analysis, returns DiagnosisResult, then deletes the blob.
 * No authentication required — public pre-signup funnel.
 */

import { put, del } from '@vercel/blob';
import { createRoExClient, analyzeMix, isRoExDevKey } from '@/lib/roex';
import { MusicalStyle } from '@/lib/roex';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import type { DiagnosisIssue, DiagnosisResult } from '@/lib/dsp/analyzeStem';

export const maxDuration = 60;

const MAX_SIZE = 30 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = new Set(['wav', 'mp3', 'aif', 'aiff', 'flac']);

interface AnalysisRaw {
  loudnessLufs: number;
  peakDbfs: number;
  stereoField: string;
  monoCompatible: boolean;
  clipping: string;
  tonalProfile: Record<string, string>;
  sampleRate: number;
  bitDepth: number;
  raw: Record<string, unknown>;
}

// Dev-mode dummy result
const DEV_ANALYSIS: AnalysisRaw = {
  loudnessLufs: -14.2,
  peakDbfs: -1.8,
  stereoField: 'STEREO',
  monoCompatible: true,
  clipping: 'NONE',
  tonalProfile: {},
  sampleRate: 44100,
  bitDepth: 24,
  raw: {},
};

type Locale = 'ja' | 'en';
type RoExCode = keyof typeof ROEX_MESSAGES['ja'];

const ROEX_MESSAGES = {
  ja: {
    'roex/peak-too-high': {
      message: (v: number) => `ピークレベルが高すぎます（${v.toFixed(1)} dBFS）`,
      fix: 'ゲインを下げてから書き出してください',
    },
    'roex/clipping-major': {
      message: () => 'クリッピングが検出されました（深刻）',
      fix: 'ゲインを大幅に下げてから書き出してください',
    },
    'roex/clipping-minor': {
      message: () => '軽微なクリッピングが検出されました',
      fix: 'ゲインを少し下げてから書き出してください',
    },
    'roex/loudness-too-hot': {
      message: (v: number) => `音量が大きすぎます（${v.toFixed(1)} LUFS）`,
      fix: 'フェーダーを下げて適切なラウドネスで書き出してください',
    },
    'roex/mono-compat-issue': {
      message: () => 'モノラル互換性に問題があります',
      fix: 'モノラル再生時に音が崩れないか確認してください',
    },
  },
  en: {
    'roex/peak-too-high': {
      message: (v: number) => `Peak level is too high (${v.toFixed(1)} dBFS)`,
      fix: 'Lower the gain before exporting',
    },
    'roex/clipping-major': {
      message: () => 'Clipping detected (severe)',
      fix: 'Significantly lower the gain before exporting',
    },
    'roex/clipping-minor': {
      message: () => 'Minor clipping detected',
      fix: 'Slightly lower the gain before exporting',
    },
    'roex/loudness-too-hot': {
      message: (v: number) => `Loudness is too high (${v.toFixed(1)} LUFS)`,
      fix: 'Lower the fader and export at an appropriate level',
    },
    'roex/mono-compat-issue': {
      message: () => 'Mono compatibility issue detected',
      fix: 'Check that your mix does not collapse when played in mono',
    },
  },
} as const;

function makeIssue(
  severity: DiagnosisIssue['severity'],
  code: RoExCode,
  locale: Locale,
  value?: number,
): DiagnosisIssue {
  const entry = ROEX_MESSAGES[locale][code];
  return {
    severity,
    code,
    message: (entry.message as (v?: number) => string)(value),
    fix: entry.fix,
  };
}

function buildDiagnosis(
  raw: AnalysisRaw,
  locale: Locale,
): DiagnosisResult {
  const issues: DiagnosisIssue[] = [];

  if (raw.clipping === 'MAJOR') {
    issues.push(makeIssue('critical', 'roex/clipping-major', locale));
  } else if (raw.clipping === 'MINOR') {
    issues.push(makeIssue('warning', 'roex/clipping-minor', locale));
  }

  if (raw.peakDbfs >= -0.1) {
    issues.push(makeIssue('critical', 'roex/peak-too-high', locale, raw.peakDbfs));
  }

  if (raw.loudnessLufs > -6) {
    issues.push(makeIssue('warning', 'roex/loudness-too-hot', locale, raw.loudnessLufs));
  }

  if (!raw.monoCompatible) {
    issues.push(makeIssue('warning', 'roex/mono-compat-issue', locale));
  }

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'critical') score -= 30;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 2;
  }
  score = Math.max(0, score);
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const qualified = criticalCount === 0 && score >= 70;

  const summary =
    locale === 'ja'
      ? qualified
        ? 'ファイルの状態は良好です。次のステップへ進みましょう。'
        : `${criticalCount > 0 ? `${criticalCount}件の問題が見つかりました。` : ''}修正後に再度お試しください。`
      : qualified
        ? 'Your file looks good. Ready for the next step.'
        : `${criticalCount > 0 ? `${criticalCount} issue(s) found. ` : ''}Please fix and try again.`;

  return { qualified, score, issues, summary };
}

export async function POST(request: Request) {
  const rateLimitResponse = await rateLimit(request, 'research');
  if (rateLimitResponse) return rateLimitResponse;

  let blobUrl: string | null = null;
  try {
    const url = new URL(request.url);
    const locale: Locale = url.searchParams.get('locale') === 'en' ? 'en' : 'ja';

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return apiValidationError('No file provided', []);
    }
    if (file.size > MAX_SIZE) {
      return apiValidationError('File too large (max 30MB)', []);
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ACCEPTED_EXTENSIONS.has(ext)) {
      return apiValidationError('Unsupported file format (WAV/MP3/AIF/FLAC only)', []);
    }

    // Dev key: return dummy diagnosis without uploading
    if (isRoExDevKey()) {
      return apiSuccess({ diagnosis: buildDiagnosis(DEV_ANALYSIS, locale) });
    }

    const blob = await put(`readiness-temp/${Date.now()}-${file.name}`, file, {
      access: 'public',
    });
    blobUrl = blob.url;

    const client = createRoExClient();
    const result = await analyzeMix(client, {
      audioUrl: blobUrl,
      musicalStyle: MusicalStyle.OTHER,
      isMaster: false,
    });

    const analysisRaw: AnalysisRaw = {
      loudnessLufs: result.loudnessLufs,
      peakDbfs: result.peakDbfs,
      stereoField: result.stereoField,
      monoCompatible: result.monoCompatible,
      clipping: result.clipping,
      tonalProfile: result.tonalProfile,
      sampleRate: result.sampleRate ?? 0,
      bitDepth: result.bitDepth ?? 0,
      raw: (result.raw ?? {}) as Record<string, unknown>,
    };

    return apiSuccess({ diagnosis: buildDiagnosis(analysisRaw, locale) });
  } catch (error) {
    console.error('[readiness/analyze] Analysis error:', error);
    return apiServerError('Analysis failed. Please try again.');
  } finally {
    if (blobUrl) {
      try { await del(blobUrl); } catch { /* ignore cleanup errors */ }
    }
  }
}
