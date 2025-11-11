/**
 * ABC Notation Renderer
 * ABC記譜法レンダラー
 *
 * Renders ABC notation as interactive sheet music using abcjs
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';
import 'abcjs/abcjs-audio.css';

interface AbcNotationRendererProps {
  abcNotation: string;
  title?: string;
  className?: string;
  enableAudio?: boolean;
}

export function AbcNotationRenderer({
  abcNotation,
  title,
  className = '',
  enableAudio = true,
}: AbcNotationRendererProps) {
  const notationRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const [visualObj, setVisualObj] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Render sheet music
  useEffect(() => {
    if (!notationRef.current || !abcNotation) return;

    try {
      const renderResult = abcjs.renderAbc(notationRef.current, abcNotation, {
        responsive: 'resize',
        add_classes: true,
        scale: 1.2,
        staffwidth: 800,
      });

      if (renderResult && renderResult[0]) {
        setVisualObj(renderResult[0]);
        setError(null);
      }
    } catch (err) {
      console.error('ABC rendering error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render notation');
    }
  }, [abcNotation]);

  // Initialize audio synthesizer
  useEffect(() => {
    if (!enableAudio || !visualObj || !audioRef.current) return;

    const audioElement = audioRef.current;

    const initSynth = async () => {
      try {
        console.log('[ABC Audio] Initializing synthesizer...');

        // Create cursor control for visual feedback (using visualObj, not DOM element)
        const cursorControl = new abcjs.TimingCallbacks(visualObj, {
          eventCallback: (event: any) => {
            // Visual feedback during playback
            if (event && notationRef.current) {
              // Highlight current note
              console.log('[ABC Audio] Playing:', event);
            }
          },
        });

        // Create synth controller
        const synthControl = new abcjs.synth.SynthController();

        // Load the synth controller with options
        synthControl.load(audioElement, cursorControl, {
          displayLoop: true,
          displayRestart: true,
          displayPlay: true,
          displayProgress: true,
          displayWarp: true,
        });

        // Set the tune
        await synthControl.setTune(visualObj, false);

        console.log('[ABC Audio] Synthesizer initialized successfully');
      } catch (err) {
        console.error('[ABC Audio] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize audio');
      }
    };

    initSynth();
  }, [visualObj, enableAudio]);

  return (
    <div className={`abc-notation-container ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold mb-4 text-gray-900">{title}</h3>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p className="font-semibold">楽譜の表示エラー</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Sheet Music Display */}
      <div
        ref={notationRef}
        className="abc-notation-svg bg-white border border-gray-200 rounded-lg p-6 mb-4 overflow-x-auto"
      />

      {/* Audio Controls */}
      {enableAudio && (
        <div className="audio-controls mb-4">
          <div
            ref={audioRef}
            className="abcjs-inline-audio"
          />
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <p>💡 <strong>使い方:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          {enableAudio && (
            <>
              <li>▶️ 再生ボタンで楽譜を音声で確認できます</li>
              <li>⏸️ 一時停止やテンポ調整も可能です</li>
              <li>🔄 ループ再生で繰り返し練習できます</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
