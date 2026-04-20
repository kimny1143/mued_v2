'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { useHooLocale } from '@/components/dial/hoo-locale-switcher';
import { Panel, Micro, Btn } from './atoms';
import { IconSend, IconSpinner, IconSparkle } from './icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EqBand {
  freq: number;
  gainDb: number;
  q: number;
}

interface ParameterChange {
  track: string;
  changes: {
    presenceSetting?: string;
    panPreference?: string;
    reverbPreference?: string;
    gainDb?: number;
    compRatio?: number;
    compThresholdDb?: number;
    compAttackMs?: number;
    compReleaseMs?: number;
    eqBands?: EqBand[];
    panAngleDegrees?: number;
  };
  reason: string;
}

type MixAction = 'adjust_preview' | 'request_mix_check' | 'request_final'
  | 'set_mastering_params' | 'request_mastering_final';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parameterChanges?: ParameterChange[] | null;
  action?: MixAction | null;
  applied?: boolean;
  createdAt: string;
}

interface Track {
  id: string;
  originalFilename: string;
  instrumentGroup: string;
  presenceSetting: string;
}

export interface ChatPanelV2Props {
  sessionId: string;
  tracks: Track[];
  headers: Record<string, string>;
  onParametersApplied: () => void;
  onPreviewRequested?: () => void;
  onMixCheckRequested?: () => void;
  onFinalRequested?: () => void;
  onMasteringPreviewRequested?: (desiredLoudness?: string) => void;
  onMasteringFinalRequested?: () => void;
  generating?: boolean;
  generatingLabel?: string;
  generatingElapsed?: string;
  generatingEta?: string;
  className?: string;
  phase?: 1 | 2 | 3;
  mode?: 'omakase' | 'dialogue';
  previewCount?: number;
  previewLimit?: number;
  isMasteringPhase?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_PRESENCE = ['NORMAL', 'LEAD', 'BACKGROUND'];
const VALID_PAN = ['NO_PREFERENCE', 'LEFT', 'CENTRE', 'RIGHT'];
const VALID_REVERB = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];

function stripJsonBlock(content: string) {
  return content.replace(/```json\s*\n?[\s\S]*?\n?```/g, '').trim();
}

// ─── HooAvatar ───────────────────────────────────────────────────────────────

function HooAvatar() {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] mono font-bold text-[#1a1200] flex-shrink-0"
      style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber-glow)' }}
    >
      H
    </span>
  );
}

// ─── ModeBadge ───────────────────────────────────────────────────────────────

interface ModeBadgeProps {
  mode: 'omakase' | 'dialogue';
}

function ModeBadge({ mode }: ModeBadgeProps) {
  return (
    <span
      className="mono text-[9px] tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-[2px]"
      style={
        mode === 'omakase'
          ? { background: 'var(--amber-glow)', color: 'var(--amber)' }
          : { background: 'rgba(78,166,116,0.12)', color: 'var(--emerald)' }
      }
    >
      {mode}
    </span>
  );
}

// ─── ParamChangeCard ──────────────────────────────────────────────────────────

interface ParamChangeCardProps {
  parameterChanges: ParameterChange[];
  action: MixAction;
  applied: boolean;
  onMarkApplied: () => void;
}

function ParamChangeCard({
  parameterChanges,
  action,
  applied,
  onMarkApplied,
}: ParamChangeCardProps) {
  const isPreview = action === 'adjust_preview';
  const isMixCheck = action === 'request_mix_check';
  const isFinal = action === 'request_final';
  const isMasteringPreview = action === 'set_mastering_params';
  const isMasteringFinal = action === 'request_mastering_final';
  const hasParams = parameterChanges.length > 0;
  const isMixAction = isMixCheck || isFinal;

  const accentColor = isFinal || isMasteringFinal
    ? 'var(--emerald)'
    : applied
      ? 'var(--emerald)'
      : 'var(--amber)';

  return (
    <div
      className="mt-1.5 rounded-[3px] border overflow-hidden"
      style={{
        borderColor: applied ? 'var(--emerald-dim)' : isMixAction || isMasteringFinal ? 'var(--amber-dim)' : 'var(--line)',
        background: applied ? 'rgba(43,92,66,0.12)' : isMixAction || isMasteringFinal ? 'var(--amber-glow)' : 'var(--ink-2)',
      }}
    >
      {/* Card header */}
      <div className="px-2.5 py-1.5 flex items-center gap-1.5 border-b" style={{ borderColor: 'var(--line-soft)' }}>
        {applied ? (
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--emerald)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        ) : (
          <IconSparkle size={10} className="flex-shrink-0" />
        )}
        <Micro tone={applied ? 'var(--emerald)' : accentColor}>
          {isPreview && (applied ? 'Applied' : 'Preview params')}
          {isMixCheck && 'Mix Check settings'}
          {isFinal && 'Final mix'}
          {isMasteringPreview && (applied ? 'Mastering generating' : 'Mastering settings')}
          {isMasteringFinal && 'Final master'}
        </Micro>
      </div>

      {/* Param rows — stem tag + direction reason (dB/Hz values hidden) */}
      {hasParams && (
        <div className="px-2.5 py-1.5 space-y-1">
          {parameterChanges.map((pc, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <span
                className="shrink-0 px-1 py-0.5 rounded font-mono text-[10px]"
                style={{ background: 'rgba(245,165,36,0.12)', color: 'var(--amber)' }}
              >
                {pc.track}
              </span>
              {pc.reason && (
                <span style={{ color: isMixAction ? 'rgba(245,165,36,0.75)' : 'var(--fg-1)' }}>
                  {pc.reason}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty final state */}
      {!hasParams && isFinal && (
        <div className="px-2.5 py-1.5 text-[11px]" style={{ color: 'var(--fg-2)' }}>
          Mix check applied as-is
        </div>
      )}

      {/* Submitted indicator */}
      {applied && (isMixAction || isMasteringFinal) && (
        <div className="px-2.5 pb-2 flex items-center gap-1" style={{ color: 'var(--emerald)' }}>
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
          <Micro tone="var(--emerald)">Submitted</Micro>
        </div>
      )}
    </div>
  );
}

// ─── ChatPanelV2 ─────────────────────────────────────────────────────────────

export function ChatPanelV2({
  sessionId,
  tracks,
  headers,
  onParametersApplied,
  onPreviewRequested,
  onMasteringPreviewRequested,
  generating = false,
  generatingLabel,
  generatingElapsed,
  generatingEta,
  className,
  phase = 1,
  mode = 'dialogue',
  previewCount = 0,
  previewLimit = 0,
  isMasteringPhase = false,
}: ChatPanelV2Props) {
  const { t, locale } = useLocale();
  const { hooLocale } = useHooLocale();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const applyChanges = useCallback(async (changes: ParameterChange[]): Promise<boolean> => {
    const updates = changes
      .map((change) => {
        const track = tracks.find((t) =>
          t.originalFilename.toLowerCase().includes(change.track.toLowerCase()) ||
          change.track.toLowerCase().includes(t.originalFilename.toLowerCase().replace(/\.[^.]+$/, ''))
        );
        if (!track) return null;
        const update: Record<string, string> = { trackId: track.id };
        if (change.changes.presenceSetting && VALID_PRESENCE.includes(change.changes.presenceSetting))
          update.presenceSetting = change.changes.presenceSetting;
        if (change.changes.panPreference && VALID_PAN.includes(change.changes.panPreference))
          update.panPreference = change.changes.panPreference;
        if (change.changes.reverbPreference && VALID_REVERB.includes(change.changes.reverbPreference))
          update.reverbPreference = change.changes.reverbPreference;
        return Object.keys(update).length > 1 ? update : null;
      })
      .filter(Boolean);

    if (updates.length === 0) return false;
    try {
      const res = await fetch('/api/dial/tracks', { method: 'PATCH', headers, body: JSON.stringify({ sessionId, updates }) });
      const data = await res.json();
      if (data.success) { onParametersApplied(); return true; }
    } catch { /* silent */ }
    return false;
  }, [tracks, headers, sessionId, onParametersApplied]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/dial/chat?sessionId=${sessionId}`, { headers });
        const data = await res.json();
        if (data.success) {
          const BUTTON_ACTIONS = new Set(['request_mix_check', 'request_final', 'request_mastering_final']);
          const msgs = data.data.messages as ChatMessage[];
          setMessages(msgs.map((m: ChatMessage, idx: number) => {
            const isBtn = m.role === 'assistant' && m.action && BUTTON_ACTIONS.has(m.action);
            if (isBtn) {
              const hasNext = msgs.slice(idx + 1).some((s) => s.role === 'user');
              return { ...m, applied: hasNext };
            }
            return { ...m, applied: (m.parameterChanges?.length ?? 0) > 0 || !!m.action ? true : undefined };
          }));
        }
      } catch { /* silent */ }
      finally { setLoadingHistory(false); }
    };
    load();
  }, [sessionId, headers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (message: string, { showInChat = true }: { showInChat?: boolean } = {}) => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);

    const tempId = `temp-${Date.now()}`;
    if (showInChat) {
      setMessages((prev) => [...prev, { id: tempId, role: 'user', content: message, createdAt: new Date().toISOString() }]);
    }

    try {
      const res = await fetch('/api/dial/chat', { method: 'POST', headers, body: JSON.stringify({ sessionId, message, locale, hooLocale }) });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Chat failed');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const parameterChanges: ParameterChange[] | null = data.data.parameterChanges;
      const action: MixAction | null = data.data.action ?? null;
      const desiredLoudness: string | null = data.data.desiredLoudness ?? null;

      let applied = false;
      let effectiveAction = action;

      if (action === 'adjust_preview' && phase === 3 && !isMasteringPhase) {
        effectiveAction = 'request_final';
      }

      if (effectiveAction === 'adjust_preview' && parameterChanges && parameterChanges.length > 0) {
        applied = await applyChanges(parameterChanges);
        if (applied && onPreviewRequested) onPreviewRequested();
      }

      if (effectiveAction === 'set_mastering_params' && onMasteringPreviewRequested) {
        onMasteringPreviewRequested(desiredLoudness ?? undefined);
        applied = true;
      }

      if (data.data.styleSet) onParametersApplied();

      setMessages((prev) => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.data.content,
        parameterChanges,
        action: effectiveAction,
        applied,
        createdAt: new Date().toISOString(),
      }]);
    } catch {
      setError(t.dial.chat.networkError);
      if (showInChat) setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [sending, sessionId, headers, phase, applyChanges, onPreviewRequested, isMasteringPhase, onMasteringPreviewRequested, onParametersApplied, t, locale, hooLocale]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  };

  const greetingSentRef = useRef(false);
  const masteringGreetingSentRef = useRef(false);

  useEffect(() => {
    if (tracks.length > 0 && messages.length === 0 && !loadingHistory && !sending && !greetingSentRef.current) {
      greetingSentRef.current = true;
      let greeting: string;
      if (isMasteringPhase && !masteringGreetingSentRef.current) {
        masteringGreetingSentRef.current = true;
        greeting = '2-Mixをアップロードしました。マスタリングをお願いします。';
      } else if (mode === 'omakase') {
        greeting = 'トラックをアップロードしました。Omakaseミックスをお願いします。';
      } else {
        greeting = 'トラックをアップロードしました。ミックスの相談をお願いします。';
      }
      sendMessage(greeting, { showInChat: false });
    }
  }, [tracks.length, messages.length, loadingHistory, sending, sendMessage, isMasteringPhase, mode]);

  useEffect(() => {
    if (isMasteringPhase && !masteringGreetingSentRef.current && !sending && messages.length > 0) {
      masteringGreetingSentRef.current = true;
      sendMessage('ミックスが完了しました。マスタリングに進みたいです。', { showInChat: false });
    }
  }, [isMasteringPhase, sending, messages.length, sendMessage]);

  const canSend = !sending && !!input.trim() && tracks.length > 0;

  return (
    <div className={`flex flex-col overflow-hidden ${className ?? ''}`} style={{ background: 'var(--ink-1)', border: '1px solid var(--line)', borderRadius: 3 }}>

      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--line-soft)' }}>
        <div className="flex items-center gap-2">
          <HooAvatar />
          <Micro>{isMasteringPhase ? 'Mastering' : 'Mix'}</Micro>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'omakase' && previewLimit > 0 && (
            <Micro tone={previewCount >= previewLimit ? 'var(--red)' : 'var(--fg-3)'}>
              Preview {previewCount}/{previewLimit}
            </Micro>
          )}
          <ModeBadge mode={mode} />
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 chat-scroll"
        style={{ background: 'var(--ink-0)' }}
        role="log"
        aria-live="polite"
        aria-label={t.dial.session.chatMessages}
      >
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--fg-3)' }}>
            <IconSpinner size={12} />
            <Micro>{t.dial.chat.loading}</Micro>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <HooAvatar />
            <p className="text-[12px]" style={{ color: 'var(--fg-1)' }}>
              {tracks.length === 0
                ? (isMasteringPhase ? t.dial.chat.upload2mix : t.dial.chat.uploadStems)
                : t.dial.chat.adjustMix}
            </p>
            {tracks.length === 0 && (
              <p className="text-[11px]" style={{ color: 'var(--fg-3)' }}>
                {isMasteringPhase ? t.dial.chat.tellMasterSound : t.dial.chat.tellMixSound}
              </p>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] ${msg.role === 'assistant' ? 'flex gap-2' : ''}`}>

                {msg.role === 'assistant' && (
                  <div className="pt-0.5 flex-shrink-0">
                    <HooAvatar />
                  </div>
                )}

                <div>
                  <div
                    className="px-3 py-2 rounded-[5px] text-[12px] leading-relaxed"
                    style={
                      msg.role === 'user'
                        ? { background: '#1e1e32', border: '1px solid #2a2a4a', color: 'var(--fg-0)' }
                        : { background: 'var(--ink-3)', border: '1px solid var(--line)', color: 'var(--fg-1)' }
                    }
                  >
                    {msg.role === 'assistant' ? stripJsonBlock(msg.content) : msg.content}
                  </div>

                  {/* ParamChangeCard */}
                  {msg.role === 'assistant' && (() => {
                    const hasParams = (msg.parameterChanges?.length ?? 0) > 0;
                    if (!hasParams && !msg.action) return null;
                    if (!msg.action) return null;
                    const noCardActions: MixAction[] = [];
                    if (noCardActions.includes(msg.action)) return null;

                    return (
                      <ParamChangeCard
                        parameterChanges={msg.parameterChanges ?? []}
                        action={msg.action}
                        applied={!!msg.applied}
                        onMarkApplied={() => setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, applied: true } : m))}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex gap-2 items-center">
            <HooAvatar />
            <div className="px-3 py-2 rounded-[5px]" style={{ background: 'var(--ink-3)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <IconSpinner size={11} />
                <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>{t.dial.chat.thinking}</span>
              </div>
            </div>
          </div>
        )}

        {generating && !sending && (
          <div className="rounded-[3px] border px-2.5 py-1.5 flex items-center gap-2" data-testid="dial-chat-processing-indicator"
            style={{ borderColor: 'var(--amber-dim)', background: 'var(--amber-glow)' }}>
            <IconSpinner size={10} />
            <Micro tone="var(--amber)">{generatingLabel || t.dial.chat.generating}</Micro>
            {generatingEta && (
              <Micro tone="var(--fg-3)">est. {generatingEta}</Micro>
            )}
            {generatingElapsed && (
              <Micro tone="var(--fg-3)" className="tabular-nums ml-auto">{generatingElapsed}</Micro>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-1.5 text-[11px]" style={{ background: 'rgba(224,90,74,0.1)', borderTop: '1px solid rgba(224,90,74,0.3)', color: 'var(--red)' }}>
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2.5 flex-shrink-0" style={{ borderTop: '1px solid var(--line-soft)' }}>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && handleSend()}
            placeholder={
              tracks.length === 0
                ? (isMasteringPhase ? t.dial.chat.upload2mixFirst : t.dial.chat.uploadStemsFirst)
                : t.dial.chat.placeholder
            }
            disabled={sending || tracks.length === 0}
            aria-label={t.dial.chat.placeholder}
            data-testid="dial-chat-input"
            className="flex-1 px-2.5 py-1.5 text-[12px] rounded-[3px] bevel-in outline-none disabled:opacity-40"
            style={{
              background: 'var(--ink-2)',
              border: '1px solid var(--line)',
              color: 'var(--fg-0)',
            }}
          />
          <Btn
            onClick={handleSend}
            disabled={!canSend}
            aria-label={t.dial.chat.send}
            data-testid="dial-chat-send"
            active={canSend}
            className="px-3"
          >
            {sending ? <IconSpinner size={10} /> : <IconSend size={10} />}
          </Btn>
        </div>
      </div>
    </div>
  );
}
