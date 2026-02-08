/**
 * Tone Sequence (WM-1) - Game Logic
 *
 * ワーキングメモリを測定。
 * 音列を聴いて、Forward/Backward/Sequencing の3モードで再現。
 */

/** Note frequencies (C4 to C5) */
export const TONE_NOTES: { name: string; freq: number }[] = [
  { name: 'C4', freq: 261.63 },
  { name: 'D4', freq: 293.66 },
  { name: 'E4', freq: 329.63 },
  { name: 'F4', freq: 349.23 },
  { name: 'G4', freq: 392.00 },
  { name: 'A4', freq: 440.00 },
  { name: 'B4', freq: 493.88 },
  { name: 'C5', freq: 523.25 },
];

export const TONE_DURATION_MS = 500;
export const TONE_GAP_MS = 500;

export type ToneMode = 'forward' | 'backward' | 'sequencing';

export interface ToneSequenceConfig {
  mode: ToneMode;
  startLength: number;
  maxLength: number;
}

export const TONE_MODES: ToneSequenceConfig[] = [
  { mode: 'forward', startLength: 3, maxLength: 12 },
  { mode: 'backward', startLength: 2, maxLength: 10 },
  { mode: 'sequencing', startLength: 2, maxLength: 12 },
];

export interface ToneSequenceResult {
  forwardSpan: number;
  backwardSpan: number;
  sequencingSpan: number;
  rawScore: number;
}

/** Generate random sequence of note indices */
export function generateSequence(length: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(Math.floor(Math.random() * TONE_NOTES.length));
  }
  return seq;
}

/** Get expected answer based on mode */
export function getExpectedAnswer(sequence: number[], mode: ToneMode): number[] {
  switch (mode) {
    case 'forward':
      return [...sequence];
    case 'backward':
      return [...sequence].reverse();
    case 'sequencing':
      return [...sequence].sort((a, b) => a - b);
  }
}

/** Check if user answer matches expected */
export function checkAnswer(userAnswer: number[], expected: number[]): boolean {
  if (userAnswer.length !== expected.length) return false;
  return userAnswer.every((v, i) => v === expected[i]);
}

/** Score the completed game */
export function scoreToneSequence(
  forwardSpan: number,
  backwardSpan: number,
  sequencingSpan: number,
): ToneSequenceResult {
  const rawScore =
    forwardSpan * 1.0 +
    backwardSpan * 1.2 +
    sequencingSpan * 1.3;

  return { forwardSpan, backwardSpan, sequencingSpan, rawScore };
}

/** Play a tone using Web Audio API */
export function playTone(
  audioContext: AudioContext,
  frequency: number,
  duration: number = TONE_DURATION_MS,
): Promise<void> {
  return new Promise((resolve) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);

    setTimeout(resolve, duration);
  });
}

/** Play a sequence of tones */
export async function playSequence(
  audioContext: AudioContext,
  noteIndices: number[],
): Promise<void> {
  for (let i = 0; i < noteIndices.length; i++) {
    await playTone(audioContext, TONE_NOTES[noteIndices[i]].freq);
    if (i < noteIndices.length - 1) {
      await new Promise(r => setTimeout(r, TONE_GAP_MS));
    }
  }
}
