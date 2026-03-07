'use client';

import { useState, useEffect, useRef } from 'react';

interface ParameterChange {
  track: string;
  changes: {
    presenceSetting?: string;
    gainDb?: number;
    panPreference?: string;
    reverbPreference?: string;
  };
  reason: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  parameterChanges?: ParameterChange[] | null;
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

export function ChatPanel({ sessionId, tracks, headers, onParametersApplied }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load message history on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/dial/chat?sessionId=${sessionId}`, {
          headers,
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.data.messages);
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
        // Remove optimistic message
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.data.content,
          parameterChanges: data.data.parameterChanges,
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

  const handleApplyChanges = async (changes: ParameterChange[]) => {
    setApplying(true);
    setError(null);

    const VALID_PRESENCE = ['NORMAL', 'LEAD', 'BACKGROUND'];
    const VALID_PAN = ['NO_PREFERENCE', 'LEFT', 'CENTRE', 'RIGHT'];
    const VALID_REVERB = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];

    // Map parameter changes to track updates using filename matching
    const updates = changes
      .map((change) => {
        const track = tracks.find((t) =>
          t.originalFilename.toLowerCase().includes(change.track.toLowerCase()) ||
          change.track.toLowerCase().includes(t.originalFilename.toLowerCase().replace(/\.[^.]+$/, ''))
        );
        if (!track) return null;

        // Only include valid track-level parameters (filter out gainDb etc.)
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

        // Skip if no valid changes remain
        return Object.keys(update).length > 1 ? update : null;
      })
      .filter(Boolean);

    if (updates.length === 0) {
      setError('Could not match parameter changes to tracks');
      setApplying(false);
      return;
    }

    try {
      const res = await fetch('/api/dial/tracks', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sessionId, updates }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to apply changes');
        return;
      }

      onParametersApplied();
    } catch {
      setError('Failed to apply changes');
    } finally {
      setApplying(false);
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
                {msg.role === 'assistant' && msg.parameterChanges && msg.parameterChanges.length > 0 && (
                  <div className="mt-2 p-3 bg-amber-900/10 border border-amber-800/30 rounded-lg">
                    <div className="text-xs text-amber-400 font-medium mb-2">
                      Suggested Changes
                    </div>
                    <div className="space-y-1.5">
                      {msg.parameterChanges.map((pc, i) => (
                        <div key={i} className="text-xs">
                          <span className="text-white font-medium">{pc.track}</span>
                          <span className="text-zinc-500 mx-1">&rarr;</span>
                          <span className="text-zinc-400">
                            {Object.entries(pc.changes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </span>
                          {pc.reason && (
                            <span className="text-zinc-600 ml-1">({pc.reason})</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleApplyChanges(msg.parameterChanges!)}
                      disabled={applying}
                      className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-700 rounded text-xs font-medium text-black transition-colors"
                    >
                      {applying ? 'Applying...' : 'Apply Changes'}
                    </button>
                  </div>
                )}
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
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
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
