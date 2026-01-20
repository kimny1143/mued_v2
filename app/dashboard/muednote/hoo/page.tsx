'use client';

/**
 * Hoo AI Chat Page
 *
 * Thought organization assistant for MUEDnote.
 * Supports: Free (template), Basic (150/month), Premium (unlimited)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
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
    latencyMs?: number;
  };
  error?: string;
}

interface QuickPrompt {
  label: string;
  text: string;
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

export default function HooChatPage() {
  const { locale } = useLocale();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [tier, setTier] = useState<string>('free');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = QUICK_PROMPTS[locale] || QUICK_PROMPTS.en;

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
          conversationId,
          message: text.trim(),
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
  }, [conversationId, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
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
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {conversationId ? (
                <span className="text-slate-400 text-sm font-normal">
                  {locale === 'ja' ? '会話中' : 'In conversation'}
                </span>
              ) : (
                locale === 'ja' ? '新しい会話を始める' : 'Start a new conversation'
              )}
            </h2>
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

            {isLoading && (
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
                if (e.key === 'Enter' && !e.shiftKey) {
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
