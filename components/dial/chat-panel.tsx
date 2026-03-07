'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parameterChanges?: ParameterChange[] | null;
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

export function ChatPanel({ sessionId, tracks, headers, onParametersApplied }: ChatPanelProps) {
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

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const message = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    // Optimistic: add user message immediately
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, {
      id: tempId,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    }]);

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

      // Auto-apply parameter changes immediately
      let applied = false;
      if (parameterChanges && parameterChanges.length > 0) {
        applied = await applyChanges(parameterChanges);
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.content,
          parameterChanges,
          applied,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      setError('Network error');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Strip JSON code block from display content
  const formatContent = (content: string) => {
    return content.replace(/```json\s*\n?[\s\S]*?\n?```/g, '').trim();
  };

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <span className="text-amber-400">Hoo</span>
          <span className="text-zinc-500">Mixing Assistant</span>
        </h3>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto px-4 py-3 space-y-4 bg-zinc-950/50">
        {loadingHistory ? (
          <div className="text-center text-zinc-600 text-sm py-8">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-8">
            Tell Hoo how you want to adjust your mix.
            <br />
            <span className="text-zinc-700">e.g. &quot;Bring the vocals forward&quot; or &quot;More reverb on guitars&quot;</span>
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

                {/* Parameter changes card */}
                {msg.role === 'assistant' && msg.parameterChanges && msg.parameterChanges.length > 0 && (() => {
                  const hasPreview = msg.parameterChanges.some((pc) => splitChanges(pc.changes).preview.length > 0);
                  const hasFinal = msg.parameterChanges.some((pc) => splitChanges(pc.changes).final.length > 0);

                  return (
                    <div className="mt-2 space-y-2">
                      {/* Preview params — auto-applied */}
                      {hasPreview && (
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
                            {msg.parameterChanges.map((pc, i) => {
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

                      {/* Final mix params — stored for final generation */}
                      {hasFinal && (
                        <div className="p-3 rounded-lg bg-amber-900/10 border border-amber-800/30">
                          <div className="text-xs font-medium mb-2 flex items-center gap-1.5 text-amber-400">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Final Mix Settings
                          </div>
                          <div className="space-y-1.5">
                            {msg.parameterChanges.map((pc, i) => {
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
            placeholder="Describe what you want to change..."
            disabled={sending}
            className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded-lg text-sm font-medium text-black transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
