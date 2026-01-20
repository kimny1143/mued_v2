'use client';

/**
 * Hoo AI Chat Page
 *
 * Thought organization assistant for MUEDnote.
 * Supports: Free (template), Basic (30/month), Premium (unlimited)
 * Turn limits: Soft limit 10, Hard limit 30 per conversation
 */

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { Button } from '@/components/ui/button';
import {
  Send,
  Loader2,
  RotateCcw,
  MessageSquare,
  History,
  Sparkles,
  AlertCircle,
  FileText,
  X,
  Settings,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface UsageInfo {
  used: number;
  limit: number;
}

interface TurnInfo {
  current: number;
  softLimit: number;
  hardLimit: number;
  extended: boolean;
  extensionCost: number;
}

interface ChatResponse {
  success: boolean;
  data?: {
    conversationId: string;
    content: string;
    model: string;
    provider: string;
    isAiResponse: boolean;
    usage?: UsageInfo & {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    turnInfo?: TurnInfo;
    latencyMs?: number;
  };
  error?: string;
}

interface QuickPrompt {
  label: string;
  text: string;
}

interface ConversationData {
  id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
  }>;
}

interface SessionContext {
  hasContext: boolean;
  recentSessions: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: string;
  }>;
  summary?: string;
}

const QUICK_PROMPTS: Record<'en' | 'ja', QuickPrompt[]> = {
  en: [
    { label: 'Organize thoughts', text: "I've been thinking about a lot of things but can't organize them." },
    { label: 'Creative block', text: "I can't finish my songs. I always get stuck partway through." },
    { label: 'Prioritize', text: "I have too many things to do and don't know where to start." },
    { label: 'Summarize', text: 'Can you summarize what we talked about?' },
  ],
  ja: [
    { label: '思考整理', text: '最近考えてることがバラバラで整理できてない。' },
    { label: '制作の悩み', text: '曲が完成しないんだよね。途中まではいいんだけど、いつも最後まで作れない。' },
    { label: '優先順位', text: 'やることが多すぎてどこから手をつけていいかわからない。' },
    { label: 'まとめて', text: 'ここまでの話をまとめて' },
  ],
};

function HooChatContent() {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('id');

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [tier, setTier] = useState<string>('free');
  const [error, setError] = useState<string | null>(null);
  const [turnInfo, setTurnInfo] = useState<TurnInfo | null>(null);
  const [sessionContextEnabled, setSessionContextEnabled] = useState(false);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = QUICK_PROMPTS[locale] || QUICK_PROMPTS.en;

  // Load conversation from URL param (resume feature)
  const loadConversation = useCallback(async (id: string) => {
    setIsResuming(true);
    setError(null);
    try {
      const res = await fetch(`/api/hoo/conversations/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const conv: ConversationData = data.data;
        setConversationId(conv.id);
        setMessages(
          conv.messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }))
        );
      } else {
        setError(data.error || 'Failed to load conversation');
      }
    } catch {
      setError('Failed to load conversation');
    } finally {
      setIsResuming(false);
    }
  }, []);

  // Resume conversation from URL param on mount
  useEffect(() => {
    if (resumeId && !conversationId) {
      loadConversation(resumeId);
    }
  }, [resumeId, conversationId, loadConversation]);

  // Fetch session context for Hoo
  const fetchSessionContext = useCallback(async () => {
    setIsLoadingContext(true);
    try {
      const res = await fetch('/api/hoo/sessions/context?limit=3');
      const data = await res.json();
      if (data.success && data.data) {
        setSessionContext(data.data);
        return data.data as SessionContext;
      }
    } catch {
      // Silently fail, session context is optional
    } finally {
      setIsLoadingContext(false);
    }
    return null;
  }, []);

  // Toggle session context
  const handleToggleSessionContext = useCallback(async () => {
    if (!sessionContextEnabled) {
      // Enabling - fetch context first
      const context = await fetchSessionContext();
      if (context?.hasContext) {
        setSessionContextEnabled(true);
      }
    } else {
      // Disabling
      setSessionContextEnabled(false);
    }
  }, [sessionContextEnabled, fetchSessionContext]);

  // Fetch session context on initial load to check availability
  useEffect(() => {
    fetchSessionContext();
  }, [fetchSessionContext]);

  // Fetch initial usage info
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/hoo/chat');
        const data = await res.json();
        if (data.success) {
          setUsage(data.data.usage);
          setTier(data.data.tier);
        }
      } catch {
        // Silently fail, will show on first message
      }
    };
    fetchUsage();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/hoo/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(conversationId && { conversationId }),
          message: text.trim(),
          ...(sessionContextEnabled && { includeSessionContext: true }),
        }),
      });

      const result: ChatResponse = await response.json();

      if (result.success && result.data) {
        setConversationId(result.data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: result.data!.content,
            timestamp: new Date().toISOString(),
          },
        ]);
        if (result.data.usage) {
          setUsage({
            used: result.data.usage.used,
            limit: result.data.usage.limit,
          });
        }
        if (result.data.turnInfo) {
          setTurnInfo(result.data.turnInfo);
        }
      } else {
        setError(result.error || 'Failed to get response');
        // Remove the user message if failed
        setMessages((prev) => prev.slice(0, -1));
      }
    } catch {
      setError('Network error. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, sessionContextEnabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
    setTurnInfo(null);
    // Keep session context enabled state across new conversations
  };

  const isFreeTier = tier === 'free';
  const isLimitReached = usage && usage.limit > 0 && usage.used >= usage.limit;

  return (
    <MuednoteLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              {locale === 'ja' ? 'Hoo - 思考整理' : 'Hoo - Thought Organizer'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {locale === 'ja'
                ? 'アイデアや考えを整理するお手伝いをします'
                : 'Your AI assistant for organizing thoughts and ideas'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Session Context Toggle */}
            {sessionContext?.hasContext && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleToggleSessionContext}
                disabled={isLoadingContext}
                className={`border-0 ${
                  sessionContextEnabled
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                {isLoadingContext ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {locale === 'ja' ? 'セッション参照' : 'Session Context'}
              </Button>
            )}
            <Link href="/dashboard/settings">
              <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer">
                <Settings className="w-4 h-4" />
                {locale === 'ja' ? '設定' : 'Settings'}
              </Button>
            </Link>
            <Link href="/dashboard/muednote/hoo/history">
              <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-0">
                <History className="w-4 h-4" />
                {locale === 'ja' ? '履歴' : 'History'}
              </Button>
            </Link>
            {messages.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <RotateCcw className="w-4 h-4" />
                {locale === 'ja' ? '新規' : 'New'}
              </Button>
            )}
          </div>
        </div>

        {/* Usage Banner */}
        {usage && (
          <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">
                {locale === 'ja' ? '今月の利用:' : 'Monthly usage:'}
              </span>
              <span className="font-medium text-white">
                {usage.limit === -1
                  ? `${usage.used} (${locale === 'ja' ? '無制限' : 'unlimited'})`
                  : usage.limit === 0
                    ? locale === 'ja' ? 'テンプレートのみ' : 'Template only'
                    : `${usage.used} / ${usage.limit}`}
              </span>
            </div>
            {(isFreeTier || isLimitReached) && (
              <Link href="/dashboard/subscription">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {locale === 'ja' ? 'アップグレード' : 'Upgrade'}
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Session Context Banner */}
        {sessionContextEnabled && sessionContext?.hasContext && (
          <div className="flex items-center justify-between bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/20 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-300">
                {locale === 'ja' ? 'セッション参照: ON' : 'Session Context: ON'}
              </span>
              <span className="text-slate-400">
                {locale === 'ja' ? '直近:' : 'Recent:'} {sessionContext.summary}
              </span>
            </div>
            <button
              onClick={() => setSessionContextEnabled(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Chat Area */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col min-h-[500px]">
          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {conversationId ? (
                  <span className="text-slate-400 text-sm font-normal">
                    {locale === 'ja' ? '会話中' : 'In conversation'}
                  </span>
                ) : (
                  locale === 'ja' ? '新しい会話を始める' : 'Start a new conversation'
                )}
              </h2>
              {turnInfo && turnInfo.current > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-1 rounded-full ${
                    turnInfo.current >= turnInfo.softLimit
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/10 text-slate-400'
                  }`}>
                    {locale === 'ja'
                      ? `ターン ${turnInfo.current}/${turnInfo.hardLimit}`
                      : `Turn ${turnInfo.current}/${turnInfo.hardLimit}`}
                  </span>
                </div>
              )}
            </div>
            {/* Extension Alert */}
            {turnInfo && turnInfo.extended && (
              <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-3 h-3" />
                {locale === 'ja'
                  ? `この会話は延長されました（${turnInfo.extensionCost + 1}会話分を使用中）`
                  : `This conversation has been extended (using ${turnInfo.extensionCost + 1} conversation credits)`}
              </div>
            )}
            {/* Approaching Limit Warning */}
            {turnInfo && turnInfo.current >= turnInfo.softLimit - 2 && turnInfo.current < turnInfo.softLimit && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 bg-white/5 rounded-lg px-3 py-2">
                {locale === 'ja'
                  ? `あと${turnInfo.softLimit - turnInfo.current}ターンで延長（追加1会話分）になります`
                  : `${turnInfo.softLimit - turnInfo.current} turns until extension (costs +1 conversation)`}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 p-6 max-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">
                  {locale === 'ja'
                    ? 'Hooに話しかけてみましょう'
                    : 'Start talking with Hoo'}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      onClick={() => sendMessage(prompt.text)}
                      className="px-3 py-1.5 text-sm rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {msg.content}
                  </pre>
                </div>
              </div>
            ))}

            {(isLoading || isResuming) && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2 px-6 pb-4">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  onClick={() => sendMessage(prompt.text)}
                  disabled={isLoading}
                  className="px-2 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition disabled:opacity-50 cursor-pointer"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-3 p-6 border-t border-white/10">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                locale === 'ja'
                  ? 'メッセージを入力...'
                  : 'Type your message...'
              }
              className="flex-1 resize-none bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={2}
              onKeyDown={(e) => {
                // Don't send during IME composition (Japanese input etc.)
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 self-end cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </MuednoteLayout>
  );
}

export default function HooChatPage() {
  return (
    <Suspense
      fallback={
        <MuednoteLayout>
          <div className="flex items-center justify-center min-h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        </MuednoteLayout>
      }
    >
      <HooChatContent />
    </Suspense>
  );
}
