/**
 * MusicXML生成ユーティリティ
 * Phase 2: MultiTrackJSON → MusicXMLファイル変換
 */

import type { MultiTrackJSON, NoteDuration, Track, Note } from '@/lib/types/music';

/**
 * 音符の長さ（Duration）をMusicXML typeに変換
 */
function durationToMusicXMLType(duration: NoteDuration): string {
  const typeMap: Record<NoteDuration, string> = {
    'whole': 'whole',
    'half': 'half',
    'quarter': 'quarter',
    'eighth': 'eighth',
    'sixteenth': '16th',
    'thirty-second': '32nd',
    'dotted-half': 'half',
    'dotted-quarter': 'quarter',
    'dotted-eighth': 'eighth',
    'triplet-quarter': 'quarter',
    'triplet-eighth': 'eighth',
  };

  return typeMap[duration];
}

/**
 * 音符が付点音符かどうか
 */
function isDotted(duration: NoteDuration): boolean {
  return duration.startsWith('dotted-');
}

/**
 * 音符がトリプレットかどうか
 */
function isTriplet(duration: NoteDuration): boolean {
  return duration.startsWith('triplet-');
}

/**
 * 音符の長さをdivisions単位に変換
 * @param duration 音符の長さ
 * @param divisionsPerQuarter 4分音符あたりのdivisions（通常1, 2, 4のいずれか）
 */
function durationToDivisions(duration: NoteDuration, divisionsPerQuarter: number = 1): number {
  const durationMap: Record<NoteDuration, number> = {
    'whole': divisionsPerQuarter * 4,
    'half': divisionsPerQuarter * 2,
    'quarter': divisionsPerQuarter,
    'eighth': divisionsPerQuarter / 2,
    'sixteenth': divisionsPerQuarter / 4,
    'thirty-second': divisionsPerQuarter / 8,
    'dotted-half': divisionsPerQuarter * 3,
    'dotted-quarter': divisionsPerQuarter * 1.5,
    'dotted-eighth': divisionsPerQuarter * 0.75,
    'triplet-quarter': divisionsPerQuarter * (2/3),
    'triplet-eighth': divisionsPerQuarter * (1/3),
  };

  return durationMap[duration];
}

/**
 * 音高（Pitch）をMusicXMLのstep/alter/octaveに分解
 * @param pitch 音高（例: "C4", "D#5", "Bb3"）
 */
function parsePitch(pitch: string): { step: string; alter?: number; octave: number } {
  const match = pitch.match(/^([A-G])([#b]?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid pitch format: ${pitch}`);
  }

  const [, step, accidental, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);

  const result: { step: string; alter?: number; octave: number } = {
    step,
    octave,
  };

  if (accidental === '#') {
    result.alter = 1;
  } else if (accidental === 'b') {
    result.alter = -1;
  }

  return result;
}

/**
 * 調号（Key Signature）をfifths値に変換
 * @param keySignature 調号（例: "C major", "D minor"）
 */
function keySignatureToFifths(keySignature: string): number {
  const keyMap: Record<string, number> = {
    // Major keys
    'C major': 0,
    'G major': 1,
    'D major': 2,
    'A major': 3,
    'E major': 4,
    'B major': 5,
    'F# major': 6,
    'C# major': 7,
    'F major': -1,
    'Bb major': -2,
    'Eb major': -3,
    'Ab major': -4,
    'Db major': -5,
    'Gb major': -6,
    'Cb major': -7,

    // Minor keys
    'A minor': 0,
    'E minor': 1,
    'B minor': 2,
    'F# minor': 3,
    'C# minor': 4,
    'G# minor': 5,
    'D# minor': 6,
    'A# minor': 7,
    'D minor': -1,
    'G minor': -2,
    'C minor': -3,
    'F minor': -4,
    'Bb minor': -5,
    'Eb minor': -6,
    'Ab minor': -7,
  };

  return keyMap[keySignature] || 0;
}

/**
 * 調号のモード（major/minor）を取得
 */
function getKeyMode(keySignature: string): 'major' | 'minor' {
  return keySignature.toLowerCase().includes('minor') ? 'minor' : 'major';
}

/**
 * 音符をMusicXML <note>要素に変換
 */
function noteToMusicXML(note: Note, divisionsPerQuarter: number = 1): string {
  const { step, alter, octave } = parsePitch(note.pitch);
  const duration = durationToDivisions(note.duration, divisionsPerQuarter);
  const type = durationToMusicXMLType(note.duration);

  let noteXML = '      <note>\n';
  noteXML += '        <pitch>\n';
  noteXML += `          <step>${step}</step>\n`;
  if (alter !== undefined) {
    noteXML += `          <alter>${alter}</alter>\n`;
  }
  noteXML += `          <octave>${octave}</octave>\n`;
  noteXML += '        </pitch>\n';
  noteXML += `        <duration>${duration}</duration>\n`;
  noteXML += `        <type>${type}</type>\n`;

  // 付点音符
  if (isDotted(note.duration)) {
    noteXML += '        <dot/>\n';
  }

  // ベロシティ → ダイナミクス（概算）
  if (note.velocity < 40) {
    noteXML += '        <dynamics>pp</dynamics>\n';
  } else if (note.velocity < 60) {
    noteXML += '        <dynamics>p</dynamics>\n';
  } else if (note.velocity < 80) {
    noteXML += '        <dynamics>mp</dynamics>\n';
  } else if (note.velocity < 100) {
    noteXML += '        <dynamics>mf</dynamics>\n';
  } else if (note.velocity < 115) {
    noteXML += '        <dynamics>f</dynamics>\n';
  } else {
    noteXML += '        <dynamics>ff</dynamics>\n';
  }

  noteXML += '      </note>\n';

  return noteXML;
}

/**
 * トラックをMusicXML <part>要素に変換
 */
function trackToPartXML(
  track: Track,
  partId: string,
  tempo: number,
  timeSignature: string,
  keySignature: string,
  divisionsPerQuarter: number = 1
): string {
  const [beats, beatType] = timeSignature.split('/');
  const fifths = keySignatureToFifths(keySignature);
  const mode = getKeyMode(keySignature);

  let partXML = `  <part id="${partId}">\n`;
  partXML += '    <measure number="1">\n';

  // Attributes（最初の小節のみ）
  partXML += '      <attributes>\n';
  partXML += `        <divisions>${divisionsPerQuarter}</divisions>\n`;
  partXML += '        <key>\n';
  partXML += `          <fifths>${fifths}</fifths>\n`;
  partXML += `          <mode>${mode}</mode>\n`;
  partXML += '        </key>\n';
  partXML += '        <time>\n';
  partXML += `          <beats>${beats}</beats>\n`;
  partXML += `          <beat-type>${beatType}</beat-type>\n`;
  partXML += '        </time>\n';
  partXML += '      </attributes>\n';

  // テンポ指定（メトロノームマーク）
  partXML += '      <direction placement="above">\n';
  partXML += '        <direction-type>\n';
  partXML += '          <metronome>\n';
  partXML += '            <beat-unit>quarter</beat-unit>\n';
  partXML += `            <per-minute>${tempo}</per-minute>\n`;
  partXML += '          </metronome>\n';
  partXML += '        </direction-type>\n';
  partXML += '      </direction>\n';

  // 音符を追加
  track.notes.forEach((note) => {
    partXML += noteToMusicXML(note, divisionsPerQuarter);
  });

  partXML += '    </measure>\n';
  partXML += '  </part>\n';

  return partXML;
}

/**
 * MultiTrackJSONからMusicXMLを生成
 * @param multiTrackJSON MultiTrackJSON中間フォーマット
 * @returns MusicXML文字列
 */
export function generateMusicXML(multiTrackJSON: MultiTrackJSON): string {
  const { tracks, tempo, timeSignature, keySignature, metadata } = multiTrackJSON;
  const divisionsPerQuarter = 1;  // シンプルに1を使用

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="3.1">\n';

  // メタデータ
  if (metadata?.title) {
    xml += '  <work>\n';
    xml += `    <work-title>${escapeXML(metadata.title)}</work-title>\n`;
    xml += '  </work>\n';
  }

  // パートリスト
  xml += '  <part-list>\n';
  tracks.forEach((track, index) => {
    const partId = `P${index + 1}`;
    xml += `    <score-part id="${partId}">\n`;
    xml += `      <part-name>${escapeXML(track.instrument)}</part-name>\n`;

    // MIDI情報
    if (track.midiProgram) {
      xml += '      <midi-instrument id="P1-I1">\n';
      xml += `        <midi-channel>1</midi-channel>\n`;
      xml += `        <midi-program>${track.midiProgram}</midi-program>\n`;
      xml += '      </midi-instrument>\n';
    }

    xml += '    </score-part>\n';
  });
  xml += '  </part-list>\n';

  // 各パート
  tracks.forEach((track, index) => {
    const partId = `P${index + 1}`;
    xml += trackToPartXML(track, partId, tempo, timeSignature, keySignature, divisionsPerQuarter);
  });

  xml += '</score-partwise>\n';

  return xml;
}

/**
 * XML特殊文字をエスケープ
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * MusicXMLファイルをダウンロード可能なBlobとして生成
 */
export function generateMusicXMLBlob(multiTrackJSON: MultiTrackJSON): Blob {
  const xml = generateMusicXML(multiTrackJSON);
  return new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
}

/**
 * MusicXMLファイルをダウンロード
 */
export function downloadMusicXML(multiTrackJSON: MultiTrackJSON, filename: string = 'music.musicxml'): void {
  const blob = generateMusicXMLBlob(multiTrackJSON);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * サンプルMusicXML生成（テスト用）
 */
export function generateSampleMusicXML(): string {
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
    metadata: {
      title: 'Sample Exercise',
      composer: 'AI Music Pedagogue',
    },
  };

  return generateMusicXML(sampleJSON);
}
