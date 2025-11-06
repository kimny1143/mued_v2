#!/usr/bin/env tsx
/**
 * Phase 2 Proof of Concept テスト
 * MIDI/MusicXML生成機能の動作確認
 */

import { createSampleMultiTrackJSON } from '../lib/types/music';
import { generateMIDI, generateMIDIBlob } from '../lib/utils/midi-generator';
import { generateMusicXML, generateMusicXMLBlob } from '../lib/utils/musicxml-generator';
import * as fs from 'fs';
import * as path from 'path';

console.log('🎵 Phase 2 Proof of Concept - MIDI/MusicXML生成テスト\n');

// テスト用ディレクトリ
const testOutputDir = path.join(process.cwd(), 'tmp', 'phase2-poc-test');
if (!fs.existsSync(testOutputDir)) {
  fs.mkdirSync(testOutputDir, { recursive: true });
}

// ========================================
// Test 1: MultiTrackJSON型定義の検証
// ========================================
console.log('📋 Test 1: MultiTrackJSON型定義の検証');
const sampleJSON = createSampleMultiTrackJSON();

console.log(`✓ サンプルMultiTrackJSON生成成功`);
console.log(`  - トラック数: ${sampleJSON.tracks.length}`);
console.log(`  - テンポ: ${sampleJSON.tempo} BPM`);
console.log(`  - 拍子: ${sampleJSON.timeSignature}`);
console.log(`  - 調号: ${sampleJSON.keySignature}`);
console.log(`  - 総小節数: ${sampleJSON.totalBars}`);

sampleJSON.tracks.forEach((track, i) => {
  console.log(`  - Track ${i + 1}: ${track.instrument} (${track.notes.length} notes)`);
});

console.log('');

// ========================================
// Test 2: MIDI生成
// ========================================
console.log('🎹 Test 2: MIDI生成テスト');

try {
  const midiBase64 = generateMIDI(sampleJSON);
  console.log(`✓ MIDIファイル生成成功`);
  console.log(`  - Base64長: ${midiBase64.length} 文字`);
  console.log(`  - 推定サイズ: ${Math.round((midiBase64.length * 3) / 4)} bytes`);

  // ファイルに保存
  const midiFilePath = path.join(testOutputDir, 'test-sample.mid');
  const midiBuffer = Buffer.from(midiBase64, 'base64');
  fs.writeFileSync(midiFilePath, midiBuffer);
  console.log(`✓ MIDIファイル保存: ${midiFilePath}`);
  console.log(`  - 実サイズ: ${midiBuffer.length} bytes`);
} catch (error) {
  console.error('✗ MIDI生成失敗:', error);
  process.exit(1);
}

console.log('');

// ========================================
// Test 3: MusicXML生成
// ========================================
console.log('🎼 Test 3: MusicXML生成テスト');

try {
  const musicXml = generateMusicXML(sampleJSON);
  console.log(`✓ MusicXMLファイル生成成功`);
  console.log(`  - XML長: ${musicXml.length} 文字`);
  console.log(`  - 推定サイズ: ${Math.round(musicXml.length)} bytes`);

  // ファイルに保存
  const xmlFilePath = path.join(testOutputDir, 'test-sample.musicxml');
  fs.writeFileSync(xmlFilePath, musicXml, 'utf-8');
  console.log(`✓ MusicXMLファイル保存: ${xmlFilePath}`);

  // XMLの基本構造を検証
  const hasXmlDeclaration = musicXml.startsWith('<?xml version="1.0"');
  const hasScorePartwise = musicXml.includes('<score-partwise');
  const hasPartList = musicXml.includes('<part-list>');
  const hasParts = musicXml.includes('<part id=');

  console.log(`  - XML宣言: ${hasXmlDeclaration ? '✓' : '✗'}`);
  console.log(`  - score-partwise: ${hasScorePartwise ? '✓' : '✗'}`);
  console.log(`  - part-list: ${hasPartList ? '✓' : '✗'}`);
  console.log(`  - parts: ${hasParts ? '✓' : '✗'}`);

  if (!hasXmlDeclaration || !hasScorePartwise || !hasPartList || !hasParts) {
    throw new Error('MusicXML構造が不正です');
  }
} catch (error) {
  console.error('✗ MusicXML生成失敗:', error);
  process.exit(1);
}

console.log('');

// ========================================
// Test 4: 複雑なMultiTrackJSONのテスト
// ========================================
console.log('🎻 Test 4: 複雑なMultiTrackJSON（弦楽四重奏）のテスト');

const stringQuartetJSON = {
  tracks: [
    {
      instrument: 'Violin I' as const,
      midiProgram: 41,
      notes: [
        { pitch: 'D5', duration: 'quarter' as const, velocity: 85, time: 0 },
        { pitch: 'E5', duration: 'quarter' as const, velocity: 88, time: 0.5 },
        { pitch: 'F5', duration: 'quarter' as const, velocity: 82, time: 1.0 },
        { pitch: 'G5', duration: 'quarter' as const, velocity: 90, time: 1.5 },
      ],
      volume: 100,
      pan: -30,
    },
    {
      instrument: 'Violin II' as const,
      midiProgram: 41,
      notes: [
        { pitch: 'A4', duration: 'quarter' as const, velocity: 80, time: 0 },
        { pitch: 'B4', duration: 'quarter' as const, velocity: 83, time: 0.5 },
        { pitch: 'C5', duration: 'quarter' as const, velocity: 78, time: 1.0 },
        { pitch: 'D5', duration: 'quarter' as const, velocity: 85, time: 1.5 },
      ],
      volume: 95,
      pan: -10,
    },
    {
      instrument: 'Viola' as const,
      midiProgram: 42,
      notes: [
        { pitch: 'D4', duration: 'half' as const, velocity: 75, time: 0 },
        { pitch: 'G4', duration: 'half' as const, velocity: 78, time: 1.0 },
      ],
      volume: 90,
      pan: 10,
    },
    {
      instrument: 'Cello' as const,
      midiProgram: 43,
      notes: [
        { pitch: 'D3', duration: 'whole' as const, velocity: 70, time: 0 },
      ],
      volume: 85,
      pan: 30,
    },
  ],
  tempo: 90,
  timeSignature: '4/4',
  keySignature: 'D minor',
  totalBars: 2,
  metadata: {
    title: 'String Quartet Exercise',
    composer: 'AI Music Pedagogue',
    difficulty: 'intermediate' as const,
  },
};

try {
  // MIDI生成
  const quartetMidiBase64 = generateMIDI(stringQuartetJSON);
  const quartetMidiPath = path.join(testOutputDir, 'string-quartet.mid');
  const quartetMidiBuffer = Buffer.from(quartetMidiBase64, 'base64');
  fs.writeFileSync(quartetMidiPath, quartetMidiBuffer);
  console.log(`✓ 弦楽四重奏 MIDI生成成功: ${quartetMidiPath}`);
  console.log(`  - サイズ: ${quartetMidiBuffer.length} bytes`);

  // MusicXML生成
  const quartetXml = generateMusicXML(stringQuartetJSON);
  const quartetXmlPath = path.join(testOutputDir, 'string-quartet.musicxml');
  fs.writeFileSync(quartetXmlPath, quartetXml, 'utf-8');
  console.log(`✓ 弦楽四重奏 MusicXML生成成功: ${quartetXmlPath}`);
  console.log(`  - サイズ: ${quartetXml.length} bytes`);
} catch (error) {
  console.error('✗ 弦楽四重奏生成失敗:', error);
  process.exit(1);
}

console.log('');

// ========================================
// Test 5: エッジケースのテスト
// ========================================
console.log('🔬 Test 5: エッジケースのテスト');

// 付点音符のテスト
const dottedNotesJSON = {
  tracks: [
    {
      instrument: 'Piano' as const,
      notes: [
        { pitch: 'C4', duration: 'dotted-quarter' as const, velocity: 80, time: 0 },
        { pitch: 'E4', duration: 'eighth' as const, velocity: 75, time: 0.75 },
        { pitch: 'G4', duration: 'dotted-half' as const, velocity: 85, time: 1.0 },
      ],
    },
  ],
  tempo: 100,
  timeSignature: '4/4',
  keySignature: 'C major',
};

try {
  const dottedMidi = generateMIDI(dottedNotesJSON);
  const dottedXml = generateMusicXML(dottedNotesJSON);
  console.log(`✓ 付点音符テスト成功`);
  console.log(`  - MIDI: ${dottedMidi.length} 文字`);
  console.log(`  - MusicXML: ${dottedXml.length} 文字`);
} catch (error) {
  console.error('✗ 付点音符テスト失敗:', error);
  process.exit(1);
}

// シャープ・フラットのテスト
const accidentalsJSON = {
  tracks: [
    {
      instrument: 'Guitar' as const,
      notes: [
        { pitch: 'C4', duration: 'quarter' as const, velocity: 80, time: 0 },
        { pitch: 'C#4', duration: 'quarter' as const, velocity: 80, time: 0.5 },
        { pitch: 'Db4', duration: 'quarter' as const, velocity: 80, time: 1.0 },
        { pitch: 'D4', duration: 'quarter' as const, velocity: 80, time: 1.5 },
      ],
    },
  ],
  tempo: 120,
  timeSignature: '4/4',
  keySignature: 'C major',
};

try {
  const accidentalsMidi = generateMIDI(accidentalsJSON);
  const accidentalsXml = generateMusicXML(accidentalsJSON);
  console.log(`✓ シャープ・フラットテスト成功`);
  console.log(`  - MIDI: ${accidentalsMidi.length} 文字`);
  console.log(`  - MusicXML: ${accidentalsXml.length} 文字`);
} catch (error) {
  console.error('✗ シャープ・フラットテスト失敗:', error);
  process.exit(1);
}

console.log('');

// ========================================
// まとめ
// ========================================
console.log('📊 テスト結果まとめ\n');
console.log('✅ 全てのテストが成功しました！\n');
console.log('生成されたファイル:');
console.log(`  📁 ${testOutputDir}`);
fs.readdirSync(testOutputDir).forEach((file) => {
  const filePath = path.join(testOutputDir, file);
  const stats = fs.statSync(filePath);
  console.log(`    - ${file} (${stats.size} bytes)`);
});

console.log('\n次のステップ:');
console.log('  1. 生成されたMIDIファイルをDAWソフト（GarageBand, Logic等）で開いて確認');
console.log('  2. MusicXMLファイルを楽譜ソフト（MuseScore, Finale等）で開いて確認');
console.log('  3. フロントエンド統合の準備（OSMD, Tone.js）\n');

console.log('🎉 Phase 2 Proof of Concept テスト完了！');
