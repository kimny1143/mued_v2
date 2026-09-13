'use client';

/**
 * MUEDnote Profile Import Page
 *
 * Accepts Claude/ChatGPT/Gemini conversation export files (JSON).
 * Processes entirely in the browser, sends music-related excerpts to API.
 */

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  detectFormat,
  extractMessages,
  filterMusicRelated,
  chunkMessages,
  MAX_CONCURRENT,
  type FileFormat,
} from '@/lib/utils/chat-import-parser';

// ========================================
// Types
// ========================================

type ImportState = 'idle' | 'parsing' | 'filtering' | 'processing' | 'done' | 'error';

interface ProcessingStats {
  totalConversations: number;
  filteredConversations: number;
  totalChunks: number;
  processedChunks: number;
  updatedFields: string[];
  errors: number;
}

// ========================================
// Component
// ========================================

export default function ImportPage() {
  const t = useTranslations('dial.dashboard.import');
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
        setError(t('invalidJson'));
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
        setError(t('noMusicFound'));
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
  }, [t]);

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
    <div className="min-h-screen bg-[var(--bg-surface)] text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm mb-8 inline-block">
          &larr; {t('backToDashboard')}
        </Link>
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-slate-400 mb-8">
          {t('description')}
        </p>

        {/* Drop Zone */}
        {(state === 'idle' || state === 'error') && (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-accent/50 transition-colors cursor-pointer"
          >
            <div className="text-4xl mb-4">📁</div>
            <p className="text-lg text-slate-300 mb-2">{t('dropTitle')}</p>
            <p className="text-sm text-slate-500 mb-6">
              {t('dropFormats')}
            </p>
            <label className="inline-block px-6 py-3 bg-accent text-[var(--ink-0)] hover:bg-accent text-[var(--ink-0)] rounded-xl cursor-pointer transition-colors">
              {t('selectFile')}
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
                {t('detected')}: <span className="text-white font-medium capitalize">{format}</span> {t('format')}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{t('totalMessages')}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-accent">{stats.filteredConversations.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{t('musicRelated')}</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalChunks}</div>
                <div className="text-xs text-slate-500 mt-1">{t('chunks')}</div>
              </div>
            </div>

            {/* Progress Bar */}
            {(state === 'processing' || state === 'done') && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">
                    {state === 'done' ? t('complete') : t('processingChunk', { current: stats.processedChunks, total: stats.totalChunks })}
                  </span>
                  <span className="text-white font-medium">{progressPct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${state === 'done' ? 'bg-green-500' : 'bg-accent text-[var(--ink-0)]'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Parsing/Filtering indicator */}
            {(state === 'parsing' || state === 'filtering') && (
              <div className="flex items-center gap-3 text-slate-400">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                {state === 'parsing' ? t('parsing') : t('filtering')}
              </div>
            )}

            {/* Updated Fields */}
            {stats.updatedFields.length > 0 && (
              <div>
                <div className="text-sm text-slate-400 mb-2">{t('hooLearned')}</div>
                <div className="flex flex-wrap gap-2">
                  {stats.updatedFields.map(field => (
                    <span key={field} className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Errors */}
            {stats.errors > 0 && (
              <div className="text-sm text-amber-400">
                {t('chunksFailed', { count: stats.errors })}
              </div>
            )}

            {/* Done actions */}
            {state === 'done' && (
              <div className="flex gap-4 pt-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-accent text-[var(--ink-0)] hover:bg-accent text-[var(--ink-0)] rounded-xl transition-colors"
                >
                  {t('viewProfile')}
                </Link>
                <button
                  onClick={() => { setState('idle'); setStats({ totalConversations: 0, filteredConversations: 0, totalChunks: 0, processedChunks: 0, updatedFields: [], errors: 0 }); }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300"
                >
                  {t('importAnother')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Privacy note */}
        <p className="text-xs text-slate-600 mt-8 text-center">
          {t('privacyNote')}
        </p>
      </div>
    </div>
  );
}
