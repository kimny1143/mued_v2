/**
 * Music Material Display
 * 音楽教材表示コンポーネント
 *
 * Displays music materials with sheet music, keyboard diagram, and instructions
 */

'use client';

import { useState } from 'react';
import { AbcNotationRenderer } from './abc-notation-renderer';
import { PianoKeyboardDiagram } from './piano-keyboard-diagram';

interface MusicMaterialContent {
  type: 'music';
  title: string;
  description: string;
  abcNotation: string;
  learningPoints: string[];
  practiceInstructions: string[];
}

interface MusicMaterialDisplayProps {
  content: MusicMaterialContent;
}

export function MusicMaterialDisplay({ content }: MusicMaterialDisplayProps) {
  const [activeTab, setActiveTab] = useState<'sheet' | 'keyboard' | 'learning' | 'practice'>('sheet');

  // Extract notes from ABC notation for keyboard display
  const extractNotes = (abc: string): { all: string[]; blue: string[] } => {
    const allNotes: string[] = [];
    const blueNotes: string[] = [];

    // Parse ABC and extract notes
    // ABC notation octave rules:
    // C,, = C2, C, = C3, C = C4 (middle C), c = C5, c' = C6

    // Extract only the music data (after K: key signature line)
    const lines = abc.split('\n');
    const keyIndex = lines.findIndex(line => line.trim().startsWith('K:'));
    const musicData = keyIndex >= 0
      ? lines.slice(keyIndex + 1).join('\n')
      : abc;

    const noteMatches = musicData.match(/[_^]?[A-Ga-g][',]*/g) || [];

    noteMatches.forEach((note) => {
      // Get base note name (A-G)
      const baseNote = note.replace(/[_^',]/g, '');
      const isUpperCase = baseNote === baseNote.toUpperCase();

      // Count octave modifiers
      const commas = (note.match(/,/g) || []).length;
      const apostrophes = (note.match(/'/g) || []).length;

      // Determine octave
      // Uppercase: base octave 4, subtract commas
      // Lowercase: base octave 5, add apostrophes
      let octave: number;
      if (isUpperCase) {
        octave = 4 - commas;
      } else {
        octave = 5 + apostrophes;
      }

      // Convert to uppercase for scientific notation
      let noteName = baseNote.toUpperCase();

      // Handle accidentals
      if (note.startsWith('_')) {
        // Flat
        noteName = noteName + 'b';
        blueNotes.push(noteName + octave);
      } else if (note.startsWith('^')) {
        // Sharp
        noteName = noteName + '#';
        blueNotes.push(noteName + octave);
      }

      allNotes.push(noteName + octave);
    });

    // Sort notes by pitch (octave first, then note name)
    const noteOrder = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
    const sortedNotes = [...new Set(allNotes)].sort((a, b) => {
      const octaveA = parseInt(a.match(/\d+$/)?.[0] || '4');
      const octaveB = parseInt(b.match(/\d+$/)?.[0] || '4');
      const nameA = a.replace(/\d+$/, '');
      const nameB = b.replace(/\d+$/, '');

      if (octaveA !== octaveB) {
        return octaveA - octaveB;
      }
      return noteOrder.indexOf(nameA) - noteOrder.indexOf(nameB);
    });

    return {
      all: sortedNotes,
      blue: [...new Set(blueNotes)],
    };
  };

  const notes = extractNotes(content.abcNotation);

  return (
    <div className="music-material-display space-y-6">
      {/* Description */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-900">{content.description}</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'sheet'
                ? 'border-[var(--color-brand-green)] text-[var(--color-brand-green)]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📄 楽譜
          </button>
          <button
            onClick={() => setActiveTab('keyboard')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'keyboard'
                ? 'border-[var(--color-brand-green)] text-[var(--color-brand-green)]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🎹 鍵盤図
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'learning'
                ? 'border-[var(--color-brand-green)] text-[var(--color-brand-green)]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📚 学習ポイント
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'practice'
                ? 'border-[var(--color-brand-green)] text-[var(--color-brand-green)]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🎯 練習指示
          </button>
        </nav>
      </div>

      {/* Content Display */}
      <div className="tab-content">
        {activeTab === 'sheet' && (
          <AbcNotationRenderer
            abcNotation={content.abcNotation}
            title={content.title}
            enableAudio={true}
          />
        )}

        {activeTab === 'keyboard' && (
          <PianoKeyboardDiagram
            title="ピアノ鍵盤図"
            highlightedNotes={notes.all}
            blueNotes={notes.blue}
            range={['C4', 'C6']}
          />
        )}

        {activeTab === 'learning' && (
          <div className="learning-points">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">学習ポイント</h3>
            <div className="space-y-4">
              {content.learningPoints.map((point, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--color-brand-green)] text-[var(--color-brand-text)] rounded-full flex items-center justify-center font-semibold">
                      {idx + 1}
                    </span>
                    <p className="text-gray-700 flex-1">{point}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="practice-instructions">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">練習指示</h3>
            <div className="space-y-4">
              {content.practiceInstructions.map((instruction, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-700">{instruction}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
