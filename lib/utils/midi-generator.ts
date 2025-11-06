/**
 * MIDI生成ユーティリティ
 * Phase 2: MultiTrackJSON → MIDIファイル変換
 */

import MidiWriter from 'midi-writer-js';
import type { MultiTrackJSON, NoteDuration } from '@/lib/types/music';
import { durationToSeconds, pitchToMidiNumber } from '@/lib/types/music';

/**
 * 音符の長さ（Duration）をMIDI ticks に変換
 * @param duration 音符の長さ
 * @param ticksPerBeat 1拍あたりのticks（通常128または256）
 * @returns MIDI ticks
 */
function durationToTicks(duration: NoteDuration, ticksPerBeat: number = 128): number {
  const durationMap: Record<NoteDuration, number> = {
    'whole': ticksPerBeat * 4,
    'half': ticksPerBeat * 2,
    'quarter': ticksPerBeat,
    'eighth': ticksPerBeat / 2,
    'sixteenth': ticksPerBeat / 4,
    'thirty-second': ticksPerBeat / 8,
    'dotted-half': ticksPerBeat * 3,
    'dotted-quarter': ticksPerBeat * 1.5,
    'dotted-eighth': ticksPerBeat * 0.75,
    'triplet-quarter': ticksPerBeat * (2/3),
    'triplet-eighth': ticksPerBeat * (1/3),
  };

  return Math.round(durationMap[duration]);
}

/**
 * 楽器名からGeneral MIDI Program番号を取得
 * @param instrumentName 楽器名
 * @returns General MIDI Program番号（1-128）
 */
function getDefaultMidiProgram(instrumentName: string): number {
  const programMap: Record<string, number> = {
    // Pianos
    'Piano': 1,
    'Electric Piano': 5,
    'Harpsichord': 7,
    'Organ': 20,

    // Strings
    'Violin I': 41,
    'Violin II': 41,
    'Viola': 42,
    'Cello': 43,
    'Double Bass': 44,

    // Guitar
    'Acoustic Guitar': 25,
    'Electric Guitar': 30,

    // Winds
    'Flute': 74,
    'Piccolo': 73,
    'Oboe': 69,
    'Clarinet': 72,
    'Bassoon': 71,

    // Brass
    'Trumpet': 57,
    'Trombone': 58,
    'French Horn': 61,
    'Tuba': 59,

    // Bass
    'Bass': 34,
  };

  return programMap[instrumentName] || 1;  // デフォルトはピアノ
}

/**
 * MultiTrackJSONからMIDIファイルを生成
 * @param multiTrackJSON MultiTrackJSON中間フォーマット
 * @returns MIDIファイル（base64エンコード）
 */
export function generateMIDI(multiTrackJSON: MultiTrackJSON): string {
  const { tracks, tempo, timeSignature } = multiTrackJSON;

  // 拍子のパース（例: "4/4" → numerator=4, denominator=4）
  const [numerator, denominator] = timeSignature.split('/').map(Number);

  // MIDIトラックの配列
  const midiTracks: MidiWriter.Track[] = [];

  // 各トラックを処理
  tracks.forEach((track) => {
    const midiTrack = new MidiWriter.Track();

    // トラック名を設定
    midiTrack.addEvent(
      new MidiWriter.MetaEvent({
        type: MidiWriter.MetaEvent.TRACK_NAME,
        data: track.instrument,
      })
    );

    // 楽器を設定（Program Change）
    const midiProgram = track.midiProgram || getDefaultMidiProgram(track.instrument);
    midiTrack.addEvent(
      new MidiWriter.ProgramChangeEvent({
        instrument: midiProgram,
      })
    );

    // ボリューム設定（CC7）
    if (track.volume !== undefined) {
      midiTrack.addEvent(
        new MidiWriter.ControllerChangeEvent({
          controllerNumber: 7,  // Volume
          controllerValue: track.volume,
        })
      );
    }

    // パンニング設定（CC10）
    if (track.pan !== undefined) {
      const panValue = Math.max(0, Math.min(127, track.pan + 64));  // -64〜63 → 0〜127
      midiTrack.addEvent(
        new MidiWriter.ControllerChangeEvent({
          controllerNumber: 10,  // Pan
          controllerValue: panValue,
        })
      );
    }

    // リバーブ設定（CC91）
    if (track.reverb !== undefined) {
      midiTrack.addEvent(
        new MidiWriter.ControllerChangeEvent({
          controllerNumber: 91,  // Reverb
          controllerValue: track.reverb,
        })
      );
    }

    // 音符を時間順にソート
    const sortedNotes = [...track.notes].sort((a, b) => a.time - b.time);

    // 音符をMIDIイベントに変換
    sortedNotes.forEach((note) => {
      try {
        const midiNumber = pitchToMidiNumber(note.pitch);
        const duration = durationToTicks(note.duration);

        midiTrack.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiNumber],
            duration: `T${duration}`,  // Ticks指定
            velocity: note.velocity,
            wait: 0,  // 待機時間は後で調整
          })
        );
      } catch (error) {
        console.error(`Failed to convert note: ${note.pitch}`, error);
      }
    });

    midiTracks.push(midiTrack);
  });

  // MIDIライターを作成
  const writer = new MidiWriter.Writer(midiTracks);

  // テンポとタイムシグネチャを設定（最初のトラックに）
  if (midiTracks.length > 0) {
    midiTracks[0].setTempo(tempo);
    midiTracks[0].setTimeSignature(numerator, denominator);
  }

  // MIDIファイルをbase64で返す
  return writer.base64();
}

/**
 * MIDIファイルをData URIとして生成
 * @param multiTrackJSON MultiTrackJSON中間フォーマット
 * @returns Data URI（ブラウザでダウンロード可能）
 */
export function generateMIDIDataURI(multiTrackJSON: MultiTrackJSON): string {
  const base64 = generateMIDI(multiTrackJSON);
  return `data:audio/midi;base64,${base64}`;
}

/**
 * MIDIファイルをダウンロード可能なBlobとして生成
 * @param multiTrackJSON MultiTrackJSON中間フォーマット
 * @returns Blob
 */
export function generateMIDIBlob(multiTrackJSON: MultiTrackJSON): Blob {
  const dataURI = generateMIDIDataURI(multiTrackJSON);

  // Data URIからbase64部分を抽出
  const base64 = dataURI.split(',')[1];

  // base64をバイナリに変換
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new Blob([bytes], { type: 'audio/midi' });
}

/**
 * MIDIファイルをダウンロード
 * @param multiTrackJSON MultiTrackJSON中間フォーマット
 * @param filename ファイル名（デフォルト: "music.mid"）
 */
export function downloadMIDI(multiTrackJSON: MultiTrackJSON, filename: string = 'music.mid'): void {
  const blob = generateMIDIBlob(multiTrackJSON);
  const url = URL.createObjectURL(blob);

  // ダウンロードリンクを作成してクリック
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // オブジェクトURLを解放
  URL.revokeObjectURL(url);
}

/**
 * サンプルMIDI生成（テスト用）
 */
export function generateSampleMIDI(): string {
  const sampleJSON: MultiTrackJSON = {
    tracks: [
      {
        instrument: 'Piano',
        midiProgram: 1,
        notes: [
          { pitch: 'C4', duration: 'quarter', velocity: 80, time: 0 },
          { pitch: 'E4', duration: 'quarter', velocity: 85, time: 0.5 },
          { pitch: 'G4', duration: 'quarter', velocity: 82, time: 1.0 },
          { pitch: 'C5', duration: 'quarter', velocity: 88, time: 1.5 },
        ],
        volume: 100,
      },
    ],
    tempo: 120,
    timeSignature: '4/4',
    keySignature: 'C major',
  };

  return generateMIDI(sampleJSON);
}
