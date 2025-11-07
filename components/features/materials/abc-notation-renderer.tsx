/**
 * ABC Notation Renderer
 * ABC記譜法レンダラー
 *
 * Renders ABC notation as interactive sheet music using abcjs
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import abcjs from 'abcjs';

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
  const [synth, setSynth] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render sheet music
  useEffect(() => {
    if (!notationRef.current || !abcNotation) return;

    try {
      const renderResult = abcjs.renderAbc(notationRef.current, abcNotation, {
        responsive: 'resize',
        add_classes: true,
        clickListener: (abcelem: any) => {
          console.log('Clicked note:', abcelem);
        },
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

    // Store ref to ensure type safety in async function
    const audioElement = audioRef.current;

    const initSynth = async () => {
      try {
        const synthControl = new abcjs.synth.SynthController();
        synthControl.load(audioElement, null, {
          displayLoop: true,
          displayRestart: true,
          displayPlay: true,
          displayProgress: true,
          displayWarp: true,
        });

        await synthControl.setTune(visualObj, false);
        setSynth(synthControl);
      } catch (err) {
        console.error('Audio initialization error:', err);
      }
    };

    initSynth();

    return () => {
      if (synth) {
        synth.destroy();
      }
    };
  }, [visualObj, enableAudio]);

  const handlePlay = async () => {
    if (!synth || !visualObj) return;

    try {
      if (isPlaying) {
        synth.pause();
        setIsPlaying(false);
      } else {
        await synth.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

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
        <div className="audio-controls">
          <div
            ref={audioRef}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          />
        </div>
      )}

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <p>💡 <strong>使い方:</strong></p>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li>五線譜をクリックすると音符の詳細が表示されます</li>
          {enableAudio && (
            <>
              <li>再生ボタンで楽譜を音声で確認できます</li>
              <li>テンポ調整やループ再生も可能です</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
