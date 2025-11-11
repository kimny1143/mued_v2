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
  const [isDownloadingMidi, setIsDownloadingMidi] = useState(false);

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

  // Download MIDI file
  const handleDownloadMidi = () => {
    if (!abcNotation) return;

    try {
      setIsDownloadingMidi(true);

      // Extract tempo from ABC notation (Q: field)
      const tempoMatch = abcNotation.match(/Q:\s*1\/4\s*=\s*(\d+)/i);
      const bpm = tempoMatch ? parseInt(tempoMatch[1]) : 120;

      // Use abcjs to convert ABC notation to MIDI
      const midiBuffer = abcjs.synth.getMidiFile(abcNotation, {
        midiOutputType: 'binary',
        bpm: bpm,
      });

      if (!midiBuffer) {
        throw new Error('Failed to generate MIDI data');
      }

      // Create Blob from binary MIDI data
      const midiBlob = new Blob([midiBuffer], { type: 'audio/midi' });

      // Create download link
      const url = URL.createObjectURL(midiBlob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename from title or default
      const filename = title
        ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mid`
        : 'music_material.mid';

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[ABC MIDI] Downloaded MIDI file:', filename);
    } catch (err) {
      console.error('[ABC MIDI] Download error:', err);
      setError(err instanceof Error ? err.message : 'Failed to download MIDI file');
    } finally {
      setIsDownloadingMidi(false);
    }
  };

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

      {/* MIDI Download Button */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleDownloadMidi}
          disabled={isDownloadingMidi || !abcNotation}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          {isDownloadingMidi ? 'ダウンロード中...' : 'MIDIファイルをダウンロード'}
        </button>
        <span className="text-sm text-gray-600">
          DAW や音楽制作ソフトで使用可能な SMF (Standard MIDI File) 形式
        </span>
      </div>

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
          <li>💾 MIDIファイルをダウンロードしてDAWや音楽ソフトで編集できます</li>
        </ul>
      </div>
    </div>
  );
}
