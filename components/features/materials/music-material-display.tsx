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
    // Simple extraction - look for note names in ABC
    // _E = Eb, ^F = F#, _B = Bb
    const blueNotePatterns = ['_E', '^F', '_B'];
    const allNotes: string[] = [];
    const blueNotes: string[] = [];

    // Parse ABC and extract notes (simplified)
    const noteMatches = abc.match(/[_^]?[A-Ga-g][',]*/g) || [];
    noteMatches.forEach((note) => {
      let cleanNote = note.replace(/[',]/g, '');

      // Convert ABC to scientific notation
      if (cleanNote.startsWith('_E')) {
        blueNotes.push('Eb4');
        allNotes.push('Eb4');
      } else if (cleanNote.startsWith('^F')) {
        blueNotes.push('F#4');
        allNotes.push('F#4');
      } else if (cleanNote.startsWith('_B')) {
        blueNotes.push('Bb4');
        allNotes.push('Bb4');
      }
    });

    // Add basic scale notes for C blues
    allNotes.push('C4', 'Eb4', 'F4', 'F#4', 'G4', 'Bb4', 'C5');

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
