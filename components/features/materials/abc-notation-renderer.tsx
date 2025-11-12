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
  const [visualObj, setVisualObj] = useState<import('abcjs').TuneObject | null>(null);
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
  const handleDownloadMidi = async () => {
    if (!abcNotation || !visualObj) {
      setError('楽譜が表示されていません。しばらく待ってから再試行してください。');
      return;
    }

    try {
      setIsDownloadingMidi(true);

      // Extract tempo from ABC notation (Q: field)
      const tempoMatch = abcNotation.match(/Q:\s*1\/4\s*=\s*(\d+)/i);
      const bpm = tempoMatch ? parseInt(tempoMatch[1]) : 120;

      console.log('[ABC MIDI] Generating MIDI file with BPM:', bpm);
      console.log('[ABC MIDI] Using visualObj:', visualObj);

      // Use abcjs to convert ABC notation to MIDI
      // Pass the visualObj (rendered tune) instead of raw ABC string
      // BPM is already specified in the ABC notation (Q: field)
      const midiData = abcjs.synth.getMidiFile(visualObj, {
        midiOutputType: 'encoded', // Get array of byte values
      });

      console.log('[ABC MIDI] MIDI data type:', typeof midiData);
      console.log('[ABC MIDI] MIDI data length:', Array.isArray(midiData) ? midiData.length : midiData?.length);
      console.log('[ABC MIDI] First 100 chars:', typeof midiData === 'string' ? midiData.substring(0, 100) : 'not a string');

      if (!midiData) {
        throw new Error('Failed to generate MIDI data');
      }

      // Convert to Blob
      let midiBlob: Blob;
      if (typeof midiData === 'string') {
        // Check if it's a data URI
        if (midiData.startsWith('data:audio/midi,')) {
          console.log('[ABC MIDI] Converting data URI to blob...');
          // Fetch the data URI and convert to blob directly
          const response = await fetch(midiData);
          midiBlob = await response.blob();
          console.log('[ABC MIDI] Blob size:', midiBlob.size, 'bytes');

          // Read first 16 bytes for verification
          const arrayBuffer = await midiBlob.slice(0, 16).arrayBuffer();
          const firstBytes = new Uint8Array(arrayBuffer);
          console.log('[ABC MIDI] First 16 bytes (hex):', Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
        } else {
          // If it's a comma-separated string like "77,84,104,100,..."
          console.log('[ABC MIDI] Converting comma-separated string to bytes...');
          const byteValues = midiData.split(',').map(s => parseInt(s.trim(), 10));
          console.log('[ABC MIDI] Converted byte count:', byteValues.length);
          const midiBytes = new Uint8Array(byteValues);
          midiBlob = new Blob([midiBytes], { type: 'audio/midi' });
        }
      } else if (Array.isArray(midiData)) {
        // If it's already an array of numbers
        console.log('[ABC MIDI] Using array directly, length:', midiData.length);
        const midiBytes = new Uint8Array(midiData);
        midiBlob = new Blob([midiBytes], { type: 'audio/midi' });
      } else {
        // If it's already a buffer
        console.log('[ABC MIDI] Using buffer directly');
        const midiBytes = new Uint8Array(midiData);
        midiBlob = new Blob([midiBytes], { type: 'audio/midi' });
      }

      // Create download link
      const url = URL.createObjectURL(midiBlob);
      const link = document.createElement('a');
      link.href = url;

      // Generate filename from title or default
      let filename = 'music_material.mid';
      if (title) {
        // Romanize Japanese and preserve alphanumeric characters
        const sanitized = title
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
          .substring(0, 100); // Limit length
        filename = sanitized ? `${sanitized}.mid` : 'music_material.mid';
      }

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

        // Create synth controller
        const synthControl = new abcjs.synth.SynthController();

        // Load the synth controller with options
        synthControl.load(audioElement, null, {
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
