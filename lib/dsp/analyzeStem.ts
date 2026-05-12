'use client';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface DiagnosisIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  fix?: string;
}

export interface DiagnosisResult {
  qualified: boolean;
  score: number;
  issues: DiagnosisIssue[];
  summary: string;
}

const MESSAGES = {
  ja: {
    'stem/sample-rate-non-standard': {
      message: (sr: number) => `サンプルレートが ${sr}Hz です`,
      fix: '44.1kHz または 48kHz で書き出してください',
    },
    'stem/clipping-detected': {
      message: () => 'クリッピングが検出されました',
      fix: 'ゲインを下げてから書き出してください',
    },
    'stem/mono-mixed-in-stereo': {
      message: () => 'ステレオファイルですがモノラル信号が検出されました',
      fix: 'ステレオで書き出すか、Hooにそのままお任せいただけます',
    },
    'stem/leading-silence-too-long': {
      message: () => '頭に無音区間が検出されました',
      fix: '頭の無音部分をカットしてから書き出してください',
    },
    'stem/no-audio-detected': {
      message: () => 'オーディオ信号が検出されません',
      fix: 'ファイルに音声が含まれているか確認してください',
    },
  },
  en: {
    'stem/sample-rate-non-standard': {
      message: (sr: number) => `Sample rate is ${sr}Hz`,
      fix: 'Export at 44.1kHz or 48kHz',
    },
    'stem/clipping-detected': {
      message: () => 'Clipping detected',
      fix: 'Lower the gain before exporting',
    },
    'stem/mono-mixed-in-stereo': {
      message: () => 'Mono signal detected in stereo file',
      fix: 'Export as true stereo, or let Hoo handle it',
    },
    'stem/leading-silence-too-long': {
      message: () => 'Leading silence detected at the start',
      fix: 'Trim the silence at the beginning before exporting',
    },
    'stem/no-audio-detected': {
      message: () => 'No audio signal detected',
      fix: 'Make sure the file contains audio',
    },
  },
} as const;

type LocaleKey = keyof typeof MESSAGES;
type MessageKey = keyof (typeof MESSAGES)['ja'];

function makeIssue(
  severity: IssueSeverity,
  code: MessageKey,
  locale: LocaleKey,
  sampleRate?: number,
): DiagnosisIssue {
  const entry = MESSAGES[locale][code];
  return {
    severity,
    code,
    message: (entry.message as (sr?: number) => string)(sampleRate),
    fix: entry.fix,
  };
}

export async function analyzeStem(
  buffer: AudioBuffer,
  locale: 'ja' | 'en' = 'ja',
): Promise<DiagnosisResult> {
  const issues: DiagnosisIssue[] = [];
  const l = locale as LocaleKey;

  // 1. Sample rate
  if (buffer.sampleRate !== 44100 && buffer.sampleRate !== 48000) {
    issues.push(makeIssue('warning', 'stem/sample-rate-non-standard', l, buffer.sampleRate));
  }

  // 2. Audio presence + leading silence (check first 500ms)
  const silenceWindowSamples = Math.min(
    Math.floor(buffer.sampleRate * 0.5),
    buffer.length,
  );
  const channelData = buffer.getChannelData(0);
  let hasAudio = false;
  let firstNonSilent = -1;
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > 0.001) {
      firstNonSilent = i;
      hasAudio = true;
      break;
    }
  }

  if (!hasAudio) {
    issues.push(makeIssue('critical', 'stem/no-audio-detected', l));
  } else if (firstNonSilent > silenceWindowSamples) {
    issues.push(makeIssue('warning', 'stem/leading-silence-too-long', l));
  }

  // 3. Clipping (sample peak >= 0.9999 on any channel)
  let clipCount = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) >= 0.9999) clipCount++;
    }
  }
  if (clipCount > 50) {
    issues.push(makeIssue('critical', 'stem/clipping-detected', l));
  }

  // 4. Mono-in-stereo detection (L/R cross-correlation)
  if (buffer.numberOfChannels >= 2) {
    const L = buffer.getChannelData(0);
    const R = buffer.getChannelData(1);
    const sampleCount = Math.min(L.length, 4096);
    let diffSum = 0;
    let energySum = 0;
    for (let i = 0; i < sampleCount; i++) {
      diffSum += Math.abs(L[i] - R[i]);
      energySum += Math.abs(L[i]) + Math.abs(R[i]);
    }
    const monoRatio = energySum > 0 ? diffSum / energySum : 0;
    if (monoRatio < 0.02) {
      issues.push(makeIssue('warning', 'stem/mono-mixed-in-stereo', l));
    }
  }

  // Scoring: qualified = critical 0 && score >= 70
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
