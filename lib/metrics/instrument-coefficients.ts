/**
 * Instrument Coefficients
 *
 * 楽器別の難易度係数と音域定義
 */

export interface InstrumentCoefficients {
  tempo_coefficient: number; // テンポ到達の難易度係数
  leap_coefficient: number; // 跳躍の難易度係数
}

export interface InstrumentRange {
  min: number; // MIDI note number (最低音)
  max: number; // MIDI note number (最高音)
  comfortable_min: number; // 快適な演奏範囲の最低音
  comfortable_max: number; // 快適な演奏範囲の最高音
}

/**
 * 楽器別の難易度係数
 * 同じBPM到達でも楽器ごとの負荷が異なる
 */
export const INSTRUMENT_DIFFICULTY_COEFFICIENTS: Record<string, InstrumentCoefficients> = {
  // 鍵盤楽器（視覚フィードバック強、物理的負荷中）
  piano: { tempo_coefficient: 1.0, leap_coefficient: 1.0 },
  keyboard: { tempo_coefficient: 1.0, leap_coefficient: 1.0 },
  organ: { tempo_coefficient: 1.0, leap_coefficient: 1.0 },

  // 弦楽器（運指複雑、ポジション移動負荷高）
  guitar: { tempo_coefficient: 1.2, leap_coefficient: 1.3 },
  bass: { tempo_coefficient: 1.1, leap_coefficient: 1.2 },
  violin: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },
  viola: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },
  cello: { tempo_coefficient: 1.2, leap_coefficient: 1.3 },
  ukulele: { tempo_coefficient: 1.1, leap_coefficient: 1.2 },

  // 管楽器（呼吸管理、音程制御高負荷）
  trumpet: { tempo_coefficient: 1.4, leap_coefficient: 1.5 },
  trombone: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },
  french_horn: { tempo_coefficient: 1.5, leap_coefficient: 1.6 },
  tuba: { tempo_coefficient: 1.3, leap_coefficient: 1.3 },
  flute: { tempo_coefficient: 1.2, leap_coefficient: 1.3 },
  clarinet: { tempo_coefficient: 1.2, leap_coefficient: 1.3 },
  saxophone: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },
  oboe: { tempo_coefficient: 1.3, leap_coefficient: 1.4 },

  // 打楽器（リズム精度特化）
  drums: { tempo_coefficient: 1.5, leap_coefficient: 0.5 },
  percussion: { tempo_coefficient: 1.4, leap_coefficient: 0.5 },

  // ボーカル（音程制御、呼吸管理）
  vocal: { tempo_coefficient: 1.3, leap_coefficient: 1.5 },
};

/**
 * 楽器別の音域定義（MIDI note number）
 */
export const INSTRUMENT_RANGES: Record<string, InstrumentRange> = {
  // 鍵盤楽器
  piano: { min: 21, max: 108, comfortable_min: 40, comfortable_max: 88 }, // A0-C8
  keyboard: { min: 21, max: 108, comfortable_min: 40, comfortable_max: 88 },
  organ: { min: 21, max: 108, comfortable_min: 36, comfortable_max: 96 },

  // 弦楽器
  guitar: { min: 40, max: 84, comfortable_min: 40, comfortable_max: 76 }, // E2-C6
  bass: { min: 28, max: 67, comfortable_min: 28, comfortable_max: 60 }, // E1-G4
  violin: { min: 55, max: 103, comfortable_min: 55, comfortable_max: 91 }, // G3-G7
  viola: { min: 48, max: 91, comfortable_min: 48, comfortable_max: 84 }, // C3-G6
  cello: { min: 36, max: 84, comfortable_min: 36, comfortable_max: 76 }, // C2-C6
  ukulele: { min: 60, max: 84, comfortable_min: 60, comfortable_max: 81 }, // C4-C6

  // 管楽器
  trumpet: { min: 55, max: 82, comfortable_min: 60, comfortable_max: 79 }, // F#3-A#5
  trombone: { min: 40, max: 72, comfortable_min: 46, comfortable_max: 67 }, // E2-C5
  french_horn: { min: 41, max: 77, comfortable_min: 46, comfortable_max: 72 }, // F2-F5
  tuba: { min: 28, max: 58, comfortable_min: 33, comfortable_max: 53 }, // E1-A#3
  flute: { min: 60, max: 96, comfortable_min: 60, comfortable_max: 91 }, // C4-G7
  clarinet: { min: 50, max: 91, comfortable_min: 50, comfortable_max: 84 }, // D3-G6
  saxophone: { min: 49, max: 87, comfortable_min: 54, comfortable_max: 82 }, // C#3-D#6
  oboe: { min: 58, max: 91, comfortable_min: 58, comfortable_max: 84 }, // A#3-G6

  // 打楽器（音程楽器の場合）
  drums: { min: 36, max: 81, comfortable_min: 36, comfortable_max: 81 }, // リズム主体
  percussion: { min: 48, max: 84, comfortable_min: 48, comfortable_max: 84 },

  // ボーカル
  vocal: { min: 48, max: 84, comfortable_min: 55, comfortable_max: 79 }, // C3-C6 (一般的な範囲)
};

/**
 * 楽器の係数を取得（デフォルト値あり）
 */
export function getInstrumentCoefficients(instrument: string): InstrumentCoefficients {
  const normalized = instrument.toLowerCase().replace(/\s+/g, '_');
  return INSTRUMENT_DIFFICULTY_COEFFICIENTS[normalized] || {
    tempo_coefficient: 1.0,
    leap_coefficient: 1.0,
  };
}

/**
 * 楽器の音域を取得（デフォルト値あり）
 */
export function getInstrumentRange(instrument: string): InstrumentRange {
  const normalized = instrument.toLowerCase().replace(/\s+/g, '_');
  return INSTRUMENT_RANGES[normalized] || {
    min: 40,
    max: 88,
    comfortable_min: 48,
    comfortable_max: 84,
  };
}

/**
 * 係数適用後のテンポ到達率を計算
 */
export function calculateAdjustedTempo(
  achievedTempo: number,
  targetTempo: number,
  instrument: string
): number {
  const coefficient = getInstrumentCoefficients(instrument).tempo_coefficient;

  // 係数適用後の到達率
  const adjustedRate = (achievedTempo / targetTempo) * coefficient;

  return Math.min(100, adjustedRate * 100);
}

/**
 * 係数適用後の跳躍難易度を計算
 */
export function calculateAdjustedLeap(
  leapMean: number,
  instrument: string
): number {
  const coefficient = getInstrumentCoefficients(instrument).leap_coefficient;

  // 係数適用後の跳躍難易度
  return leapMean * coefficient;
}

/**
 * MIDI note number から音名を取得
 */
export function midiNoteToName(midiNote: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
}

/**
 * 音名から MIDI note number を取得
 */
export function noteNameToMidi(noteName: string): number {
  const noteMap: Record<string, number> = {
    C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5,
    'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
  };

  const match = noteName.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 60; // デフォルトはC4

  const note = match[1];
  const octave = parseInt(match[2], 10);

  return (octave + 1) * 12 + noteMap[note];
}
