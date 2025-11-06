/**
 * 音楽教材のマルチトラックJSON中間フォーマット定義
 * Phase 2: MIDI/MusicXML対応
 */

import { z } from 'zod';

// ========================================
// TypeScript型定義
// ========================================

/**
 * 音符の種類（Duration）
 */
export type NoteDuration =
  | 'whole'           // 全音符
  | 'half'            // 2分音符
  | 'quarter'         // 4分音符
  | 'eighth'          // 8分音符
  | 'sixteenth'       // 16分音符
  | 'thirty-second'   // 32分音符
  | 'dotted-half'     // 付点2分音符
  | 'dotted-quarter'  // 付点4分音符
  | 'dotted-eighth'   // 付点8分音符
  | 'triplet-quarter' // 3連符4分音符
  | 'triplet-eighth'; // 3連符8分音符

/**
 * 楽器名（General MIDI準拠）
 */
export type InstrumentName =
  // 弦楽器
  | 'Violin I'
  | 'Violin II'
  | 'Viola'
  | 'Cello'
  | 'Double Bass'
  | 'Acoustic Guitar'
  | 'Electric Guitar'
  // 鍵盤楽器
  | 'Piano'
  | 'Electric Piano'
  | 'Harpsichord'
  | 'Organ'
  // 管楽器
  | 'Flute'
  | 'Piccolo'
  | 'Oboe'
  | 'Clarinet'
  | 'Bassoon'
  | 'Trumpet'
  | 'Trombone'
  | 'French Horn'
  | 'Tuba'
  // その他
  | 'Drums'
  | 'Bass'
  | string; // カスタム楽器名も許可

/**
 * 音符データ
 */
export interface Note {
  /** 音高（例: "C4", "D#5", "Bb3"） */
  pitch: string;

  /** 音符の長さ */
  duration: NoteDuration;

  /** ベロシティ（音の強さ: 0-127） */
  velocity: number;

  /** 絶対時間（小節の開始からの秒数） */
  time: number;

  /** オプション: 和音の一部かどうか */
  isChord?: boolean;

  /** オプション: アーティキュレーション（スタッカート、レガート等） */
  articulation?: 'staccato' | 'legato' | 'accent' | 'tenuto';

  /** オプション: スライド・ポルタメント */
  slide?: {
    targetPitch: string;
    duration: number;
  };
}

/**
 * トラックデータ
 */
export interface Track {
  /** トラック名/楽器名 */
  instrument: InstrumentName;

  /** General MIDI Program Number (オプション、1-128) */
  midiProgram?: number;

  /** 音符のリスト */
  notes: Note[];

  /** オプション: トラックボリューム（0-127） */
  volume?: number;

  /** オプション: パンニング（-64〜63、0が中央） */
  pan?: number;

  /** オプション: リバーブ量（0-127） */
  reverb?: number;

  /** オプション: コーラス量（0-127） */
  chorus?: number;
}

/**
 * マルチトラックJSON中間フォーマット
 */
export interface MultiTrackJSON {
  /** トラックのリスト */
  tracks: Track[];

  /** テンポ（BPM） */
  tempo: number;

  /** 拍子（例: "4/4", "3/4", "6/8"） */
  timeSignature: string;

  /** 調号（例: "C major", "D minor", "G major"） */
  keySignature: string;

  /** オプション: 総小節数 */
  totalBars?: number;

  /** オプション: メタデータ */
  metadata?: {
    title?: string;
    composer?: string;
    arranger?: string;
    copyright?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

// ========================================
// Zodバリデーションスキーマ
// ========================================

/**
 * 音符の長さのZodスキーマ
 */
export const NoteDurationSchema = z.enum([
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
  'thirty-second',
  'dotted-half',
  'dotted-quarter',
  'dotted-eighth',
  'triplet-quarter',
  'triplet-eighth',
]);

/**
 * 楽器名のZodスキーマ
 */
export const InstrumentNameSchema = z.string().min(1);

/**
 * 音符データのZodスキーマ
 */
export const NoteSchema = z.object({
  pitch: z.string().regex(/^[A-G][#b]?[0-9]$/),  // 例: C4, D#5, Bb3
  duration: NoteDurationSchema,
  velocity: z.number().min(0).max(127),
  time: z.number().min(0),
  isChord: z.boolean().optional(),
  articulation: z.enum(['staccato', 'legato', 'accent', 'tenuto']).optional(),
  slide: z.object({
    targetPitch: z.string().regex(/^[A-G][#b]?[0-9]$/),
    duration: z.number().min(0),
  }).optional(),
});

/**
 * トラックデータのZodスキーマ
 */
export const TrackSchema = z.object({
  instrument: InstrumentNameSchema,
  midiProgram: z.number().min(1).max(128).optional(),
  notes: z.array(NoteSchema),
  volume: z.number().min(0).max(127).optional(),
  pan: z.number().min(-64).max(63).optional(),
  reverb: z.number().min(0).max(127).optional(),
  chorus: z.number().min(0).max(127).optional(),
});

/**
 * マルチトラックJSON中間フォーマットのZodスキーマ
 */
export const MultiTrackJSONSchema = z.object({
  tracks: z.array(TrackSchema).min(1),
  tempo: z.number().min(20).max(300),
  timeSignature: z.string().regex(/^\d+\/\d+$/),  // 例: 4/4, 3/4
  keySignature: z.string(),  // 例: C major, D minor
  totalBars: z.number().min(1).optional(),
  metadata: z.object({
    title: z.string().optional(),
    composer: z.string().optional(),
    arranger: z.string().optional(),
    copyright: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  }).optional(),
});

// ========================================
// ヘルパー関数
// ========================================

/**
 * MultiTrackJSONをバリデーションする
 */
export function validateMultiTrackJSON(data: unknown): MultiTrackJSON {
  return MultiTrackJSONSchema.parse(data);
}

/**
 * 音符の長さ（Duration）を秒数に変換
 * @param duration 音符の長さ
 * @param tempo テンポ（BPM）
 * @returns 秒数
 */
export function durationToSeconds(duration: NoteDuration, tempo: number): number {
  const quarterNoteSeconds = 60 / tempo;  // 4分音符1つの秒数

  const durationMap: Record<NoteDuration, number> = {
    'whole': quarterNoteSeconds * 4,
    'half': quarterNoteSeconds * 2,
    'quarter': quarterNoteSeconds,
    'eighth': quarterNoteSeconds * 0.5,
    'sixteenth': quarterNoteSeconds * 0.25,
    'thirty-second': quarterNoteSeconds * 0.125,
    'dotted-half': quarterNoteSeconds * 3,
    'dotted-quarter': quarterNoteSeconds * 1.5,
    'dotted-eighth': quarterNoteSeconds * 0.75,
    'triplet-quarter': quarterNoteSeconds * (2/3),
    'triplet-eighth': quarterNoteSeconds * (1/3),
  };

  return durationMap[duration];
}

/**
 * 音高（Pitch）をMIDIノート番号に変換
 * @param pitch 音高（例: "C4", "D#5"）
 * @returns MIDIノート番号（0-127）
 */
export function pitchToMidiNumber(pitch: string): number {
  const noteMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11,
  };

  const match = pitch.match(/^([A-G][#b]?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`);
  }

  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const noteOffset = noteMap[noteName];

  if (noteOffset === undefined) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  // MIDI番号計算: C4 = 60
  return (octave + 1) * 12 + noteOffset;
}

/**
 * MIDIノート番号を音高（Pitch）に変換
 * @param midiNumber MIDIノート番号（0-127）
 * @returns 音高（例: "C4"）
 */
export function midiNumberToPitch(midiNumber: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;
  return `${noteNames[noteIndex]}${octave}`;
}

/**
 * サンプルMultiTrackJSONを生成（テスト用）
 */
export function createSampleMultiTrackJSON(): MultiTrackJSON {
  return {
    tracks: [
      {
        instrument: 'Violin I',
        midiProgram: 41,  // Violin
        notes: [
          { pitch: 'D4', duration: 'quarter', velocity: 80, time: 0 },
          { pitch: 'E4', duration: 'quarter', velocity: 85, time: 0.5 },
          { pitch: 'F4', duration: 'quarter', velocity: 82, time: 1.0 },
          { pitch: 'G4', duration: 'quarter', velocity: 88, time: 1.5 },
        ],
        volume: 100,
        pan: -20,  // やや左
      },
      {
        instrument: 'Cello',
        midiProgram: 43,  // Cello
        notes: [
          { pitch: 'D2', duration: 'half', velocity: 70, time: 0 },
          { pitch: 'G2', duration: 'half', velocity: 72, time: 1.0 },
        ],
        volume: 90,
        pan: 20,  // やや右
      },
    ],
    tempo: 120,
    timeSignature: '4/4',
    keySignature: 'D minor',
    totalBars: 2,
    metadata: {
      title: 'Sample Multi-Track Exercise',
      composer: 'AI Music Pedagogue',
      difficulty: 'intermediate',
    },
  };
}
