'use client';

/**
 * Profile Import Page
 *
 * Accepts Claude/ChatGPT/Gemini conversation export files (JSON).
 * Processes entirely in the browser:
 * 1. Parse JSON
 * 2. Filter music-related conversations by keywords
 * 3. Extract user messages only
 * 4. Split into 10K chunks
 * 5. POST each chunk to /api/muednote/profile/import
 * 6. Show progress
 */

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// ========================================
// Constants
// ========================================

const MUSIC_KEYWORDS = [
  // English
  'mix', 'master', 'eq', 'compress', 'reverb', 'delay', 'guitar', 'bass', 'drum',
  'vocal', 'synth', 'piano', 'chord', 'melody', 'harmony', 'arrangement', 'production',
  'daw', 'ableton', 'logic', 'cubase', 'pro tools', 'fl studio', 'plugin', 'vst',
  'frequency', 'gain', 'stereo', 'mono', 'panning', 'sidechain', 'limiter',
  'tempo', 'bpm', 'beat', 'groove', 'rhythm', 'song', 'track', 'album',
  'genre', 'rock', 'pop', 'jazz', 'hip hop', 'electronic', 'classical', 'metal',
  'indie', 'r&b', 'funk', 'soul', 'ambient', 'lo-fi',
  // Japanese
  '作曲', '編曲', 'ミキシング', 'マスタリング', 'ミックス', '音楽', '曲', '楽曲',
  '楽器', 'ギター', 'ベース', 'ドラム', 'ピアノ', 'シンセ', 'ボーカル',
  'コード', 'メロディ', 'ハーモニー', 'アレンジ', '制作', 'プロダクション',
  '音圧', '音像', '空間', 'リバーブ', 'ディレイ', 'コンプ', 'イコライザー',
  'テンポ', 'リズム', 'グルーブ', 'ビート',
];

const CHUNK_SIZE = 9000; // Leave room for metadata in the 10K limit
const MAX_CONCURRENT = 3;

// ========================================
// Types
// ========================================

type ImportState = 'idle' | 'parsing' | 'filtering' | 'processing' | 'done' | 'error';
type FileFormat = 'claude' | 'chatgpt' | 'gemini' | 'unknown';

interface ProcessingStats {
  totalConversations: number;
  filteredConversations: number;
  totalChunks: number;
  processedChunks: number;
  updatedFields: string[];
  errors: number;
}

// ========================================
// JSON Parsers (per platform format)
// ========================================

function detectFormat(data: unknown): FileFormat {
  if (Array.isArray(data)) {
    const first = data[0];
    if (first?.mapping) return 'chatgpt';
    if (first?.uuid && first?.chat_messages) return 'claude';
    if (first?.name && first?.messages) return 'claude';
  }
  return 'unknown';
}

function extractMessages(data: unknown, format: FileFormat): { role: string; text: string; conversationName?: string }[] {
  const messages: { role: string; text: string; conversationName?: string }[] = [];

  if (format === 'chatgpt' && Array.isArray(data)) {
    for (const conv of data) {
      const name = conv.title || conv.name || '';
      const mapping = conv.mapping;
      if (mapping && typeof mapping === 'object') {
        for (const node of Object.values(mapping) as { message?: { author?: { role?: string }; content?: { parts?: string[] } } }[]) {
          const msg = node?.message;
          if (msg?.author?.role === 'user' && msg?.content?.parts) {
            const text = msg.content.parts.filter((p: unknown) => typeof p === 'string').join('\n');
            if (text.trim()) messages.push({ role: 'user', text, conversationName: name });
          }
        }
      }
    }
  } else if (format === 'claude' && Array.isArray(data)) {
    for (const conv of data) {
      const name = conv.name || conv.title || '';
      const chatMessages = conv.chat_messages || conv.messages || [];
      for (const msg of chatMessages) {
        if (msg.sender === 'human' || msg.role === 'user') {
          const text = typeof msg.text === 'string' ? msg.text
            : typeof msg.content === 'string' ? msg.content
            : Array.isArray(msg.content) ? msg.content.filter((c: unknown) => typeof c === 'string' || (typeof c === 'object' && c !== null && 'text' in c)).map((c: unknown) => typeof c === 'string' ? c : (c as { text: string }).text).join('\n')
            : '';
          if (text.trim()) messages.push({ role: 'user', text, conversationName: name });
        }
      }
    }
  } else {
    // Generic: try to find any array of messages
    const tryExtract = (obj: unknown): void => {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item?.role === 'user' && typeof item?.content === 'string') {
            messages.push({ role: 'user', text: item.content });
          }
          tryExtract(item);
        }
      } else if (obj && typeof obj === 'object') {
        for (const val of Object.values(obj)) {
          tryExtract(val);
        }
      }
    };
    tryExtract(data);
  }

  return messages;
}

function filterMusicRelated(messages: { role: string; text: string; conversationName?: string }[]): typeof messages {
  const keywordRegex = new RegExp(MUSIC_KEYWORDS.join('|'), 'i');
  return messages.filter(m => keywordRegex.test(m.text) || (m.conversationName && keywordRegex.test(m.conversationName)));
}

function chunkMessages(messages: { text: string }[]): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const msg of messages) {
    const entry = msg.text + '\n\n';
    if (current.length + entry.length > CHUNK_SIZE) {
      if (current.trim()) chunks.push(current.trim());
      current = entry.length > CHUNK_SIZE ? entry.slice(0, CHUNK_SIZE) : entry;
    } else {
      current += entry;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// ========================================
// Component
// ========================================

export default function ImportPage() {
  const [state, setState] = useState<ImportState>('idle');
  const [stats, setStats] = useState<ProcessingStats>({
    totalConversations: 0,
    filteredConversations: 0,
    totalChunks: 0,
    processedChunks: 0,
    updatedFields: [],
    errors: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<FileFormat>('unknown');
  const abortRef = useRef(false);

  const processFile = useCallback(async (file: File) => {
    abortRef.current = false;
    setError(null);
    setState('parsing');

    try {
      // 1. Parse JSON
      const text = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        setError('Invalid JSON file. Please select a valid conversation export.');
        setState('error');
        return;
      }

      // 2. Detect format
      const detected = detectFormat(data);
      setFormat(detected);

      // 3. Extract user messages
      setState('filtering');
      const allMessages = extractMessages(data, detected);
      const musicMessages = filterMusicRelated(allMessages);

      setStats(s => ({
        ...s,
        totalConversations: allMessages.length,
        filteredConversations: musicMessages.length,
      }));

      if (musicMessages.length === 0) {
        setError('No music-related conversations found in this file.');
        setState('error');
        return;
      }

      // 4. Chunk
      const chunks = chunkMessages(musicMessages);
      setStats(s => ({ ...s, totalChunks: chunks.length }));

      // 5. Process chunks
      setState('processing');
      const updatedFields = new Set<string>();
      let errors = 0;

      // Process with limited concurrency
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
        if (abortRef.current) break;

        const batch = chunks.slice(i, i + MAX_CONCURRENT);
        const results = await Promise.allSettled(
          batch.map(chunk =>
            fetch('/api/muednote/profile/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: chunk,
                source: detected === 'unknown' ? 'other' : detected,
              }),
            }).then(r => r.json())
          )
        );

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value?.data?.updated) {
            const profile = result.value.data.profile;
            if (profile?.musical?.genres?.length) updatedFields.add('genres');
            if (profile?.musical?.instruments?.length) updatedFields.add('instruments');
            if (profile?.musical?.influences?.length) updatedFields.add('influences');
            if (profile?.musical?.productionStyle) updatedFields.add('productionStyle');
            if (profile?.creative?.strengths?.length) updatedFields.add('strengths');
            if (profile?.creative?.focusAreas?.length) updatedFields.add('focusAreas');
            if (profile?.bio) updatedFields.add('bio');
          } else {
            errors++;
          }
        }

        setStats(s => ({
          ...s,
          processedChunks: Math.min(i + batch.length, chunks.length),
          updatedFields: [...updatedFields],
          errors,
        }));
      }

      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setState('error');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const progressPct = stats.totalChunks > 0
    ? Math.round((stats.processedChunks / stats.totalChunks) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0F0F1A] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <Link href="/dashboard/muednote" className="text-slate-500 hover:text-white text-sm mb-8 inline-block">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold mb-2">Import AI Conversations</h1>
        <p className="text-slate-400 mb-8">
          Upload your Claude, ChatGPT, or Gemini conversation exports.
          Hoo will learn about your music preferences from the conversations.
        </p>

        {/* Drop Zone */}
        {(state === 'idle' || state === 'error') && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
          >
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg text-slate-300 mb-2">Drop your JSON export here</p>
            <p className="text-sm text-slate-500 mb-6">
              Supports: Claude (conversations.json), ChatGPT (conversations.json), Gemini
            </p>
            <label className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl cursor-pointer transition-colors">
              Select File
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Processing Status */}
        {(state === 'parsing' || state === 'filtering' || state === 'processing' || state === 'done') && (
          <div className="bg-white/5 rounded-2xl p-8 space-y-6">
            {/* Format detected */}
            {format !== 'unknown' && (
              <div className="text-sm text-slate-400">
                Detected: <span className="text-white font-medium capitalize">{format}</span> format
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Total Messages</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-indigo-400">{stats.filteredConversations.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Music Related</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalChunks}</div>
                <div className="text-xs text-slate-500 mt-1">Chunks</div>
              </div>
            </div>

            {/* Progress Bar */}
            {(state === 'processing' || state === 'done') && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">
                    {state === 'done' ? 'Complete' : `Processing chunk ${stats.processedChunks}/${stats.totalChunks}`}
                  </span>
                  <span className="text-white font-medium">{progressPct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${state === 'done' ? 'bg-green-500' : 'bg-indigo-500'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Parsing/Filtering indicator */}
            {(state === 'parsing' || state === 'filtering') && (
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                {state === 'parsing' ? 'Parsing JSON...' : 'Filtering music-related conversations...'}
              </div>
            )}

            {/* Updated Fields */}
            {stats.updatedFields.length > 0 && (
              <div>
                <div className="text-sm text-slate-400 mb-2">Hoo learned about:</div>
                <div className="flex flex-wrap gap-2">
                  {stats.updatedFields.map(field => (
                    <span key={field} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {stats.errors > 0 && (
              <div className="text-sm text-amber-400">
                {stats.errors} chunk(s) failed to process (profile was still updated from successful chunks)
              </div>
            )}

            {/* Done actions */}
            {state === 'done' && (
              <div className="flex gap-4 pt-4">
                <Link
                  href="/dashboard/muednote"
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
                >
                  View Profile
                </Link>
                <button
                  onClick={() => { setState('idle'); setStats({ totalConversations: 0, filteredConversations: 0, totalChunks: 0, processedChunks: 0, updatedFields: [], errors: 0 }); }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300"
                >
                  Import Another File
                </button>
              </div>
            )}
          </div>
        )}

        {/* Privacy note */}
        <p className="text-xs text-slate-600 mt-8 text-center">
          Your file is processed entirely in the browser. Only music-related excerpts are sent to the server for profile extraction.
        </p>
      </div>
    </div>
  );
}
