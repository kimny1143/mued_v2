'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface EqBand {
  freq: number;
  gainDb: number;
  q: number;
}

interface ParameterChange {
  track: string;
  changes: {
    // Preview params
    presenceSetting?: string;
    panPreference?: string;
    reverbPreference?: string;
    // Final params
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

const PREVIEW_KEYS = new Set(['presenceSetting', 'panPreference', 'reverbPreference']);
const FINAL_KEYS = new Set(['gainDb', 'compRatio', 'compThresholdDb', 'compAttackMs', 'compReleaseMs', 'eqBands', 'panAngleDegrees']);

type MixAction = 'adjust_preview' | 'request_mix_check' | 'request_final';

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

interface ChatPanelProps {
  sessionId: string;
  tracks: Track[];
  headers: Record<string, string>;
  onParametersApplied: () => void;
  onPreviewRequested?: () => void;
  onMixCheckRequested?: () => void;
  onFinalRequested?: () => void;
  generating?: boolean;
  className?: string;
  /** Current mixing phase — prevents preview regeneration in Phase 3 */
  phase?: 1 | 2 | 3;
}

const VALID_PRESENCE = ['NORMAL', 'LEAD', 'BACKGROUND'];
const VALID_PAN = ['NO_PREFERENCE', 'LEFT', 'CENTRE', 'RIGHT'];
const VALID_REVERB = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];

function formatParamValue(key: string, value: unknown): string {
  if (key === 'eqBands' && Array.isArray(value)) {
    return value
      .map((b: EqBand) => `${b.freq >= 1000 ? `${b.freq / 1000}k` : b.freq}Hz ${b.gainDb > 0 ? '+' : ''}${b.gainDb}dB`)
      .join(', ');
  }
  if (key === 'panAngleDegrees') return `${value}°`;
  if (key === 'gainDb') return `${value}dB`;
  if (key === 'compRatio') return `${value}:1`;
  if (key === 'compThresholdDb') return `${value}dB`;
  if (key === 'compAttackMs') return `${value}ms`;
  if (key === 'compReleaseMs') return `${value}ms`;
  return String(value);
}

function splitChanges(changes: ParameterChange['changes']) {
  const preview: [string, unknown][] = [];
  const final_: [string, unknown][] = [];
  for (const [k, v] of Object.entries(changes)) {
    if (v === undefined || v === null) continue;
    if (PREVIEW_KEYS.has(k)) preview.push([k, v]);
    else if (FINAL_KEYS.has(k)) final_.push([k, v]);
  }
  return { preview, final: final_ };
}

export function ChatPanel({ sessionId, tracks, headers, onParametersApplied, onPreviewRequested, onMixCheckRequested, onFinalRequested, generating = false, className, phase = 1 }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Apply parameter changes to tracks via PATCH
  const applyChanges = useCallback(async (changes: ParameterChange[]): Promise<boolean> => {
    const updates = changes
      .map((change) => {
        const track = tracks.find((t) =>
          t.originalFilename.toLowerCase().includes(change.track.toLowerCase()) ||
          change.track.toLowerCase().includes(t.originalFilename.toLowerCase().replace(/\.[^.]+$/, ''))
        );
        if (!track) return null;

        const update: Record<string, string> = { trackId: track.id };
        if (change.changes.presenceSetting && VALID_PRESENCE.includes(change.changes.presenceSetting)) {
          update.presenceSetting = change.changes.presenceSetting;
        }
        if (change.changes.panPreference && VALID_PAN.includes(change.changes.panPreference)) {
          update.panPreference = change.changes.panPreference;
        }
        if (change.changes.reverbPreference && VALID_REVERB.includes(change.changes.reverbPreference)) {
          update.reverbPreference = change.changes.reverbPreference;
        }

        return Object.keys(update).length > 1 ? update : null;
      })
      .filter(Boolean);

    if (updates.length === 0) return false;

    try {
      const res = await fetch('/api/dial/tracks', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sessionId, updates }),
      });
      const data = await res.json();
      if (data.success) {
        onParametersApplied();
        return true;
      }
    } catch {
      // Silent — changes card will show without checkmark
    }
    return false;
  }, [tracks, headers, sessionId, onParametersApplied]);

  // Load message history on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/dial/chat?sessionId=${sessionId}`, {
          headers,
        });
        const data = await res.json();
        if (data.success) {
          // Mark all historical messages with parameterChanges as already applied
          setMessages(data.data.messages.map((m: ChatMessage) => ({
            ...m,
            applied: m.parameterChanges && m.parameterChanges.length > 0 ? true : undefined,
          })));
        }
      } catch {
        // Silent fail — empty chat is fine
      } finally {
        setLoadingHistory(false);
      }
    };
    loadMessages();
  }, [sessionId, headers]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Core send logic — accepts message directly (used by handleSend and auto-greeting)
  const sendMessage = useCallback(async (message: string, { showInChat = true }: { showInChat?: boolean } = {}) => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);

    // Optimistic: add user message immediately
    const tempId = `temp-${Date.now()}`;
    if (showInChat) {
      setMessages((prev) => [...prev, {
        id: tempId,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      }]);
    }

    try {
      const res = await fetch('/api/dial/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId, message }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Chat failed');
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      const parameterChanges: ParameterChange[] | null = data.data.parameterChanges;
      const action: MixAction | null = data.data.action ?? null;

      // Action-based handling (from tool call):
      // - adjust_preview: auto-apply preview params + regenerate (Phase 1 only)
      // - request_mix_check / request_final: show action button, don't auto-apply
      //
      // Phase 3 guard: if Hoo mistakenly sends adjust_preview after Mix Check,
      // treat it as request_final instead of regenerating a preview.
      let applied = false;
      let effectiveAction = action;

      if (action === 'adjust_preview' && phase === 3) {
        // AI sent wrong action for Phase 3 — upgrade to request_final
        effectiveAction = 'request_final';
      }

      if (effectiveAction === 'adjust_preview' && parameterChanges && parameterChanges.length > 0) {
        applied = await applyChanges(parameterChanges);
        if (applied && onPreviewRequested) {
          onPreviewRequested();
        }
      }

      // If Hoo set the musical style, refresh session data
      if (data.data.styleSet) {
        onParametersApplied();
      }

      // Add assistant response (use effectiveAction for correct UI rendering)
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.content,
          parameterChanges,
          action: effectiveAction,
          applied,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setError('Network error');
      if (showInChat) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } finally {
      setSending(false);
    }
  }, [sending, sessionId, headers, phase, applyChanges, onPreviewRequested]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
  };

  // Auto-greeting: when tracks exist but no conversation yet, trigger Hoo's intro
  const greetingSentRef = useRef(false);
  useEffect(() => {
    if (
      tracks.length > 0 &&
      messages.length === 0 &&
      !loadingHistory &&
      !sending &&
      !greetingSentRef.current
    ) {
      greetingSentRef.current = true;
      sendMessage('トラックをアップロードしました。ミックスの相談をお願いします。', { showInChat: false });
    }
  }, [tracks.length, messages.length, loadingHistory, sending, sendMessage]);

  // Strip JSON code block from display content
  const formatContent = (content: string) => {
    return content.replace(/```json\s*\n?[\s\S]*?\n?```/g, '').trim();
  };

  // Last assistant message with a pending mix action (for action button placement)
  const lastActionableId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (
        msg.role === 'assistant' &&
        !msg.applied &&
        (msg.action === 'request_mix_check' || msg.action === 'request_final')
      ) {
        return msg.id;
      }
    }
    return null;
  }, [messages]);

  return (
    <div className={`border border-zinc-800 rounded-xl overflow-hidden flex flex-col ${className ?? ''}`}>
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <span className="text-amber-400">Hoo</span>
          <span className="text-zinc-500">Mixing Assistant</span>
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-[320px] overflow-y-auto px-4 py-3 space-y-4 bg-zinc-950/50">
        {loadingHistory ? (
          <div className="text-center text-zinc-600 text-sm py-8">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-8">
            {tracks.length === 0 ? (
              <>
                <span className="text-amber-400 text-base">Hoo</span>
                <p className="mt-2 text-zinc-400">
                  Upload your stems from the sidebar to get started.
                </p>
                <p className="mt-1 text-zinc-600 text-xs">
                  Once uploaded, tell me how you want your mix to sound.
                </p>
              </>
            ) : (
              <>
                <span className="text-amber-400 text-base">Hoo</span>
                <p className="mt-2 text-zinc-400">
                  Tell me how you want to adjust your mix.
                </p>
                <p className="mt-1 text-zinc-600 text-xs">
                  e.g. &quot;Bring the vocals forward&quot; or &quot;More reverb on guitars&quot;
                </p>
              </>
            )}
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                <div
                  className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600/30 text-white'
                      : 'bg-zinc-800 text-zinc-200'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? formatContent(msg.content)
                    : msg.content}
                </div>

                {/* Parameter changes card — based on action type */}
                {msg.role === 'assistant' && (() => {
                  const hasParams = msg.parameterChanges && msg.parameterChanges.length > 0;
                  const isPreviewAction = msg.action === 'adjust_preview';
                  const isMixAction = msg.action === 'request_mix_check' || msg.action === 'request_final';

                  if (!hasParams && !isMixAction) return null;

                  return (
                    <div className="mt-2 space-y-2">
                      {/* Preview params — auto-applied */}
                      {isPreviewAction && hasParams && (
                        <div className={`p-3 rounded-lg ${
                          msg.applied
                            ? 'bg-green-900/10 border border-green-800/30'
                            : 'bg-zinc-800/50 border border-zinc-700/30'
                        }`}>
                          <div className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${
                            msg.applied ? 'text-green-400' : 'text-zinc-500'
                          }`}>
                            {msg.applied && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {msg.applied ? 'Preview Applied' : 'No valid changes'}
                          </div>
                          <div className="space-y-1.5">
                            {msg.parameterChanges!.map((pc, i) => {
                              const { preview } = splitChanges(pc.changes);
                              if (preview.length === 0) return null;
                              return (
                                <div key={i} className="text-xs">
                                  <span className="text-white font-medium">{pc.track}</span>
                                  <span className="text-zinc-500 mx-1">&rarr;</span>
                                  <span className="text-zinc-400">
                                    {preview.map(([k, v]) => `${k}: ${formatParamValue(k, v)}`).join(', ')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Mix Check / Final params + action button */}
                      {isMixAction && (
                        <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-800/30">
                          <div className="text-xs font-medium mb-2 flex items-center gap-1.5 text-amber-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {msg.action === 'request_final' ? 'Final Mix' : 'Mix Check Settings'}
                          </div>
                          {hasParams && (
                            <div className="space-y-1.5">
                              {msg.parameterChanges!.map((pc, i) => {
                                const { final: finalParams } = splitChanges(pc.changes);
                                if (finalParams.length === 0) return null;
                                return (
                                  <div key={i} className="text-xs">
                                    <span className="text-white font-medium">{pc.track}</span>
                                    <span className="text-zinc-500 mx-1">&rarr;</span>
                                    <span className="text-amber-300/70">
                                      {finalParams.map(([k, v]) => `${k}: ${formatParamValue(k, v)}`).join(', ')}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {!hasParams && msg.action === 'request_final' && (
                            <div className="text-xs text-zinc-400">
                              Mix Check settings will be applied as-is.
                            </div>
                          )}
                          {msg.id === lastActionableId && (
                            <button
                              onClick={() => {
                                if (msg.action === 'request_final') {
                                  onFinalRequested?.();
                                } else {
                                  onMixCheckRequested?.();
                                }
                                setMessages((prev) => prev.map((m) =>
                                  m.id === msg.id ? { ...m, applied: true } : m,
                                ));
                              }}
                              disabled={generating}
                              className={`mt-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                msg.action === 'request_final'
                                  ? 'bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white'
                                  : 'bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 text-black'
                              }`}
                            >
                              {generating
                                ? 'Generating...'
                                : msg.action === 'request_final'
                                  ? 'Generate Final Mix'
                                  : 'Generate Mix Check'}
                            </button>
                          )}
                          {msg.applied && (
                            <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Submitted
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="px-3 py-2 bg-zinc-800 rounded-xl text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Hoo is thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && handleSend()}
            placeholder={tracks.length === 0 ? 'Upload stems first...' : 'Describe what you want to change...'}
            disabled={sending || tracks.length === 0}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim() || tracks.length === 0}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium text-black transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
