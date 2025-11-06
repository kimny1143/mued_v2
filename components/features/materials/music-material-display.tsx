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
    // ABC notation: C,, C, C c c' (lower to higher octaves)
    // Accidentals: _E = Eb, ^F = F#
    const noteMatches = abc.match(/[_^]?[A-Ga-g][',]*/g) || [];

    noteMatches.forEach((note) => {
      // Determine octave based on case and octave markers
      let octave = 4; // Default middle octave
      let noteName = note.replace(/[_^',]/g, '');

      // Count commas (lower octaves) and apostrophes (higher octaves)
      const commas = (note.match(/,/g) || []).length;
      const apostrophes = (note.match(/'/g) || []).length;

      // Uppercase = octave 3-4, lowercase = octave 4-5
      if (noteName === noteName.toUpperCase()) {
        octave = 4 - commas;
      } else {
        octave = 5 + apostrophes;
      }

      // Convert to uppercase for scientific notation
      noteName = noteName.toUpperCase();

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

    return {
      all: [...new Set(allNotes)],
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
            title="五線譜"
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
                    <span className="flex-shrink-0 w-8 h-8 bg-[var(--color-brand-green)] text-white rounded-full flex items-center justify-center font-semibold">
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
