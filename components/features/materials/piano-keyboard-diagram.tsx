/**
 * Piano Keyboard Diagram
 * ピアノ鍵盤図
 *
 * Displays interactive piano keyboard with highlighted notes
 */

'use client';

import { useEffect, useRef } from 'react';
import { renderPiano } from 'svg-piano';

interface PianoKeyboardDiagramProps {
  highlightedNotes?: string[];
  blueNotes?: string[];
  range?: [string, string];
  className?: string;
  title?: string;
}

export function PianoKeyboardDiagram({
  highlightedNotes = [],
  blueNotes = [],
  range = ['C4', 'C6'],
  className = '',
  title,
}: PianoKeyboardDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = '';

    // Create colorize array for individual note colors
    const colorize = highlightedNotes.map((note) => ({
      keys: [note],
      color: blueNotes.includes(note) ? '#6366f1' : '#75bc11', // Blue notes in indigo, others in green
    }));

    // Render piano with highlighted notes
    renderPiano(containerRef.current, {
      range,
      colorize,
    });
  }, [highlightedNotes, blueNotes, range]);

  return (
    <div className={`piano-keyboard-diagram ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold mb-4 text-gray-900">{title}</h3>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div ref={containerRef} className="flex justify-center" />

        {/* Legend */}
        {(highlightedNotes.length > 0 || blueNotes.length > 0) && (
          <div className="mt-4 flex gap-4 justify-center text-sm">
            {highlightedNotes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#75bc11' }} />
                <span className="text-gray-700">使用する音</span>
              </div>
            )}
            {blueNotes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6366f1' }} />
                <span className="text-gray-700">ブルーノート</span>
              </div>
            )}
          </div>
        )}

        {/* Note names */}
        {highlightedNotes.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              <strong>音名:</strong> {highlightedNotes.join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
