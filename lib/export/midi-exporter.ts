/**
 * MIDI Exporter
 *
 * ABC記法からMIDIファイルを生成してダウンロード
 */

import abcjs from 'abcjs';

export interface MidiExportOptions {
  tempo?: number; // BPM (Quarters Per Minute)
  program?: number; // MIDI program number (0-127)
  filename?: string;
}

/**
 * ABC記法からMIDIファイルを生成してダウンロード
 */
export function exportAbcToMidi(
  abc: string,
  options: MidiExportOptions = {}
): void {
  const {
    tempo = 120,
    program = 0, // 0 = Acoustic Grand Piano
    filename = 'music',
  } = options;

  try {
    // abcjs の MIDI 変換機能を使用
    const midiBuffer = abcjs.synth.getMidiFile(abc, {
      qpm: tempo,
      program: program,
    });

    // Blobとしてダウンロード
    const blob = new Blob([midiBuffer], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(filename)}.mid`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // メモリ解放
    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log(`[MidiExporter] Exported: ${filename}.mid`);
  } catch (error) {
    console.error('[MidiExporter] Export failed:', error);
    throw new Error(`Failed to export MIDI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 複数のABCブロックを一括でMIDIエクスポート
 */
export function exportMultipleAbcToMidi(
  abcBlocks: Array<{ abc: string; title: string }>,
  options: Omit<MidiExportOptions, 'filename'> = {}
): void {
  for (const block of abcBlocks) {
    try {
      exportAbcToMidi(block.abc, {
        ...options,
        filename: block.title || `untitled-${Date.now()}`,
      });
    } catch (error) {
      console.error(`[MidiExporter] Failed to export "${block.title}":`, error);
    }
  }
}

/**
 * ファイル名のサニタイズ
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-\s]/gi, '') // 英数字、アンダースコア、ハイフン、スペースのみ
    .replace(/\s+/g, '-') // スペースをハイフンに
    .toLowerCase()
    .substring(0, 100); // 最大100文字
}

/**
 * MIDIプログラム番号から楽器名を取得
 */
export function getMidiProgramName(program: number): string {
  const MIDI_PROGRAMS: Record<number, string> = {
    0: 'Acoustic Grand Piano',
    1: 'Bright Acoustic Piano',
    6: 'Harpsichord',
    24: 'Acoustic Guitar (nylon)',
    25: 'Acoustic Guitar (steel)',
    32: 'Acoustic Bass',
    40: 'Violin',
    48: 'String Ensemble 1',
    56: 'Trumpet',
    65: 'Alto Sax',
    73: 'Flute',
    // ... 必要に応じて追加
  };

  return MIDI_PROGRAMS[program] || `MIDI Program ${program}`;
}

/**
 * 楽器名からMIDIプログラム番号を取得
 */
export function getMidiProgramNumber(instrument: string): number {
  const INSTRUMENT_TO_MIDI: Record<string, number> = {
    piano: 0,
    guitar: 24,
    bass: 32,
    violin: 40,
    trumpet: 56,
    saxophone: 65,
    flute: 73,
    drums: 0, // ドラムはチャンネル10で制御
    // ... 必要に応じて追加
  };

  return INSTRUMENT_TO_MIDI[instrument.toLowerCase()] || 0;
}
