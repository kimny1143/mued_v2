/**
 * ABC Analyzer
 *
 * ABC記法を分析し、教育的品質スコアを計算
 */

import abcjs, { type TuneObject } from 'abcjs';
import {
  getInstrumentCoefficients,
  getInstrumentRange,
  type InstrumentRange,
} from './metrics/instrument-coefficients';

export interface AbcAnalysis {
  // 基本統計
  note_count: number; // 音符の総数
  measure_count: number; // 小節数
  unique_pitches: number; // 使用音高の種類数

  // 音域分析
  range_min: number; // MIDI note number（最低音）
  range_max: number; // MIDI note number（最高音）
  range_span: number; // 音域幅（半音数）
  range_ok: boolean; // 楽器の快適音域内か

  // 跳躍分析
  leap_mean: number; // 平均跳躍幅（半音数）
  leap_max: number; // 最大跳躍幅（半音数）
  leap_count: number; // 4度以上の跳躍の回数

  // 密度分析
  chromatic_density: number; // 半音階密度（0-1）
  notes_per_measure: number; // 小節あたりの音符数

  // 反復分析
  repetition_ratio: number; // 反復パターンの割合（0-1）
  sequence_count: number; // 反復シーケンスの数

  // テンポ
  tempo_qpm: number; // Quarters Per Minute (BPM)

  // 品質スコア
  playability_score: number; // 演奏可能性スコア（0-10）
  learning_value_score: number; // 学習価値スコア（0-10）

  // メタデータ
  instrument: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * ABC記法を分析
 */
export function analyzeAbc(
  abc: string,
  instrument: string = 'piano'
): AbcAnalysis | null {
  try {
    // ABC記法をパース
    const parseResult = abcjs.parseOnly(abc);
    if (!parseResult || parseResult.length === 0) {
      console.error('[AbcAnalyzer] Failed to parse ABC');
      return null;
    }

    const tune = parseResult[0];

    // MIDI note numberの配列を抽出
    const notes = extractMidiNotes(tune);
    if (notes.length === 0) {
      console.error('[AbcAnalyzer] No notes found in ABC');
      return null;
    }

    // 基本統計
    const note_count = notes.length;
    const measure_count = countMeasures(tune);
    const unique_pitches = new Set(notes).size;

    // 音域分析
    const range_min = Math.min(...notes);
    const range_max = Math.max(...notes);
    const range_span = range_max - range_min;
    const instrumentRange = getInstrumentRange(instrument);
    const range_ok = isRangeComfortable(range_min, range_max, instrumentRange);

    // 跳躍分析
    const leaps = calculateLeaps(notes);
    const leap_mean = leaps.length > 0 ? leaps.reduce((a, b) => a + b, 0) / leaps.length : 0;
    const leap_max = leaps.length > 0 ? Math.max(...leaps) : 0;
    const leap_count = leaps.filter((l) => l >= 5).length; // 4度以上 = 5半音以上

    // 密度分析
    const chromatic_density = calculateChromaticDensity(notes);
    const notes_per_measure = note_count / Math.max(measure_count, 1);

    // 反復分析
    const { repetition_ratio, sequence_count } = analyzeRepetition(notes);

    // テンポ
    const tempo_qpm = extractTempo(abc);

    // 難易度レベル推定
    const difficulty_level = estimateDifficulty(
      range_span,
      leap_mean,
      notes_per_measure,
      tempo_qpm
    );

    // 演奏可能性スコア（0-10）
    const playability_score = calculatePlayabilityScore(
      range_ok,
      leap_mean,
      chromatic_density,
      tempo_qpm,
      instrument
    );

    // 学習価値スコア（0-10）
    const learning_value_score = calculateLearningValueScore(
      playability_score,
      repetition_ratio,
      sequence_count,
      notes_per_measure,
      difficulty_level
    );

    return {
      note_count,
      measure_count,
      unique_pitches,
      range_min,
      range_max,
      range_span,
      range_ok,
      leap_mean,
      leap_max,
      leap_count,
      chromatic_density,
      notes_per_measure,
      repetition_ratio,
      sequence_count,
      tempo_qpm,
      playability_score,
      learning_value_score,
      instrument,
      difficulty_level,
    };
  } catch (error) {
    console.error('[AbcAnalyzer] Analysis failed:', error);
    return null;
  }
}

/**
 * MIDI note number の配列を抽出
 */
function extractMidiNotes(tune: TuneObject): number[] {
  const notes: number[] = [];

  if (!tune.lines) return notes;

  for (const line of tune.lines) {
    if (!line.staff) continue;

    for (const staff of line.staff) {
      if (!staff.voices) continue;

      for (const voice of staff.voices) {
        for (const element of voice) {
          // pitchは配列形式で格納されている
          if (element.pitches && Array.isArray(element.pitches)) {
            for (const pitch of element.pitches) {
              if (typeof pitch.pitch === 'number') {
                // abcjsのpitch値はMIDI note numberに相当
                notes.push(pitch.pitch);
              }
            }
          }
        }
      }
    }
  }

  return notes;
}

/**
 * 小節数をカウント
 */
function countMeasures(tune: TuneObject): number {
  let count = 0;

  if (!tune.lines) return 0;

  for (const line of tune.lines) {
    if (!line.staff) continue;

    for (const staff of line.staff) {
      if (!staff.voices) continue;

      for (const voice of staff.voices) {
        for (const element of voice) {
          if (element.el_type === 'bar') {
            count++;
          }
        }
      }
    }
  }

  // 最終小節を含める（最後のbarがない場合があるため+1）
  return count > 0 ? count : 1;
}

/**
 * 音域が楽器の快適範囲内か確認
 */
function isRangeComfortable(
  min: number,
  max: number,
  range: InstrumentRange
): boolean {
  return min >= range.comfortable_min && max <= range.comfortable_max;
}

/**
 * 連続する音符間の跳躍幅を計算
 */
function calculateLeaps(notes: number[]): number[] {
  const leaps: number[] = [];

  for (let i = 1; i < notes.length; i++) {
    const leap = Math.abs(notes[i] - notes[i - 1]);
    if (leap > 0) {
      leaps.push(leap);
    }
  }

  return leaps;
}

/**
 * 半音階密度を計算（0-1）
 * 連続する半音階進行が多いほど高くなる
 */
function calculateChromaticDensity(notes: number[]): number {
  if (notes.length < 2) return 0;

  let chromaticSteps = 0;
  for (let i = 1; i < notes.length; i++) {
    const interval = Math.abs(notes[i] - notes[i - 1]);
    if (interval === 1) {
      chromaticSteps++;
    }
  }

  return chromaticSteps / (notes.length - 1);
}

/**
 * 反復パターンを分析
 */
function analyzeRepetition(notes: number[]): {
  repetition_ratio: number;
  sequence_count: number;
} {
  if (notes.length < 4) {
    return { repetition_ratio: 0, sequence_count: 0 };
  }

  const sequences = new Map<string, number>();
  const windowSize = 4; // 4音のシーケンスを検出

  for (let i = 0; i <= notes.length - windowSize; i++) {
    const sequence = notes.slice(i, i + windowSize).join(',');
    sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
  }

  // 2回以上出現するシーケンス
  const repeatedSequences = Array.from(sequences.entries()).filter(
    ([_, count]) => count >= 2
  );

  const sequence_count = repeatedSequences.length;
  const repetition_ratio =
    repeatedSequences.reduce((sum, [_, count]) => sum + count, 0) /
    Math.max(sequences.size, 1);

  return { repetition_ratio, sequence_count };
}

/**
 * ABC記法からテンポを抽出（デフォルト120）
 */
function extractTempo(abc: string): number {
  const tempoMatch = abc.match(/Q:\s*\d+\/\d+=(\d+)/);
  if (tempoMatch) {
    return parseInt(tempoMatch[1], 10);
  }

  // Q: 1/4=120 形式でない場合
  const simpleMatch = abc.match(/Q:\s*(\d+)/);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }

  return 120; // デフォルト
}

/**
 * 難易度レベルを推定
 */
function estimateDifficulty(
  range_span: number,
  leap_mean: number,
  notes_per_measure: number,
  tempo_qpm: number
): 'beginner' | 'intermediate' | 'advanced' {
  let score = 0;

  // 音域幅
  if (range_span > 24) score += 2; // 2オクターブ以上
  else if (range_span > 12) score += 1; // 1オクターブ以上

  // 平均跳躍幅
  if (leap_mean > 5) score += 2; // 4度以上が平均
  else if (leap_mean > 3) score += 1; // 3度以上が平均

  // 音符密度
  if (notes_per_measure > 8) score += 2; // 高密度
  else if (notes_per_measure > 4) score += 1; // 中密度

  // テンポ
  if (tempo_qpm > 140) score += 2; // 高速
  else if (tempo_qpm > 100) score += 1; // 中速

  if (score >= 6) return 'advanced';
  if (score >= 3) return 'intermediate';
  return 'beginner';
}

/**
 * 演奏可能性スコアを計算（0-10）
 */
export function calculatePlayabilityScore(
  range_ok: boolean,
  leap_mean: number,
  chromatic_density: number,
  tempo_qpm: number,
  instrument: string
): number {
  let score = 10.0;

  // 音域ペナルティ
  if (!range_ok) {
    score -= 3.0;
  }

  // 跳躍ペナルティ（楽器係数適用）
  const coefficients = getInstrumentCoefficients(instrument);
  const adjusted_leap = leap_mean * coefficients.leap_coefficient;

  if (adjusted_leap > 7) {
    score -= 2.5; // 5度以上の跳躍が多い
  } else if (adjusted_leap > 5) {
    score -= 1.5; // 4度の跳躍が多い
  } else if (adjusted_leap > 3) {
    score -= 0.5; // 3度の跳躍が多い
  }

  // 半音階密度ペナルティ
  if (chromatic_density > 0.4) {
    score -= 1.5; // 半音階進行が40%以上
  } else if (chromatic_density > 0.2) {
    score -= 0.5; // 半音階進行が20%以上
  }

  // テンポペナルティ（楽器係数適用）
  const adjusted_tempo = tempo_qpm * coefficients.tempo_coefficient;

  if (adjusted_tempo > 160) {
    score -= 2.0; // 非常に高速
  } else if (adjusted_tempo > 120) {
    score -= 1.0; // 高速
  } else if (adjusted_tempo < 60) {
    score -= 0.5; // 非常に低速（練習には不向き）
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * 学習価値スコアを計算（0-10）
 */
export function calculateLearningValueScore(
  playability_score: number,
  repetition_ratio: number,
  sequence_count: number,
  notes_per_measure: number,
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
): number {
  let score = playability_score; // ベースは演奏可能性スコア

  // 反復パターンによるボーナス（学習効果）
  if (repetition_ratio >= 0.3 && repetition_ratio <= 0.6) {
    score += 1.5; // 適度な反復（記憶定着に有効）
  } else if (repetition_ratio > 0.6) {
    score -= 1.0; // 過度な反復（単調）
  } else if (repetition_ratio < 0.1) {
    score -= 0.5; // 反復が少なすぎる（学習負荷高）
  }

  // シーケンス数によるボーナス
  if (sequence_count >= 3 && sequence_count <= 8) {
    score += 1.0; // 適切なパターン数（構造的学習）
  } else if (sequence_count > 8) {
    score -= 0.5; // パターンが多すぎる（混乱）
  }

  // 音符密度による調整
  if (notes_per_measure >= 4 && notes_per_measure <= 8) {
    score += 0.5; // 適切な密度（集中力維持）
  } else if (notes_per_measure > 12) {
    score -= 1.0; // 過密（読譜困難）
  } else if (notes_per_measure < 2) {
    score -= 0.5; // 過疎（学習効率低）
  }

  // 難易度レベルによる調整
  if (difficulty_level === 'intermediate') {
    score += 0.5; // 中級は学習曲線に最適
  } else if (difficulty_level === 'beginner') {
    score += 0.3; // 初級も有効
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * 品質ゲートを通過するか判定
 */
export function passesQualityGate(
  analysis: AbcAnalysis,
  threshold: number = 6.0
): boolean {
  return analysis.learning_value_score >= threshold;
}

/**
 * 分析結果をテキストで説明
 */
export function explainAnalysis(analysis: AbcAnalysis): string {
  const lines: string[] = [];

  lines.push(`**楽器:** ${analysis.instrument}`);
  lines.push(`**難易度:** ${analysis.difficulty_level}`);
  lines.push(`**音符数:** ${analysis.note_count}`);
  lines.push(`**小節数:** ${analysis.measure_count}`);
  lines.push(`**テンポ:** ${analysis.tempo_qpm} BPM`);
  lines.push('');
  lines.push(`**音域:** ${analysis.range_min}-${analysis.range_max} (${analysis.range_span}半音)`);
  lines.push(`**音域OK:** ${analysis.range_ok ? 'はい' : 'いいえ（快適範囲外）'}`);
  lines.push(`**平均跳躍:** ${analysis.leap_mean.toFixed(1)}半音`);
  lines.push(`**最大跳躍:** ${analysis.leap_max}半音`);
  lines.push(`**半音階密度:** ${(analysis.chromatic_density * 100).toFixed(1)}%`);
  lines.push('');
  lines.push(`**反復パターン:** ${analysis.sequence_count}個 (${(analysis.repetition_ratio * 100).toFixed(1)}%)`);
  lines.push(`**小節あたり音符数:** ${analysis.notes_per_measure.toFixed(1)}`);
  lines.push('');
  lines.push(`**演奏可能性スコア:** ${analysis.playability_score.toFixed(1)}/10`);
  lines.push(`**学習価値スコア:** ${analysis.learning_value_score.toFixed(1)}/10`);
  lines.push('');

  if (passesQualityGate(analysis)) {
    lines.push('✅ **品質ゲート:** 合格（公開可能）');
  } else {
    lines.push('⚠️ **品質ゲート:** 不合格（下書きのみ）');
  }

  return lines.join('\n');
}
