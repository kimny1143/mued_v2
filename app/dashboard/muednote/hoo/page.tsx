'use client';

/**
 * Hoo Conversation History Page
 *
 * Read-only viewer for Hoo AI conversations.
 * Active chat is now on the iOS app — this page shows past conversations.
 *
 * - Default view: conversation list
 * - ?id=xxx: read-only message detail
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  MessageSquare,
  Sparkles,
  AlertCircle,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Smartphone,
  History,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  model: string;
  provider: string;
  startedAt: string;
  lastMessageAt: string;
}

interface ConversationDetail {
  id: string;
  title: string;
  messages: Message[];
  messageCount: number;
  model: string;
  provider: string;
  startedAt: string;
  lastMessageAt: string;
}

interface ConversationsResponse {
  success: boolean;
  data?: {
    conversations: Conversation[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  error?: string;
}

function HooHistoryContent() {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewId = searchParams.get('id');

  // List state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Detail state
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversation list
  const fetchConversations = useCallback(async (newOffset = 0) => {
    setIsLoadingList(true);
    try {
      const res = await fetch(`/api/hoo/conversations?limit=20&offset=${newOffset}`);
      const data: ConversationsResponse = await res.json();
      if (data.success && data.data) {
        if (newOffset === 0) {
          setConversations(data.data.conversations);
        } else {
          setConversations((prev) => [...prev, ...data.data!.conversations]);
        }
        setHasMore(data.data.pagination.hasMore);
        setOffset(newOffset);
        setTotal(data.data.pagination.total);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  // Fetch single conversation detail
  const fetchDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/hoo/conversations/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setDetail(data.data);
      } else {
        setError(data.error || (locale === 'ja' ? '会話の読み込みに失敗しました' : 'Failed to load conversation'));
      }
    } catch {
      setError(locale === 'ja' ? '会話の読み込みに失敗しました' : 'Failed to load conversation');
    } finally {
      setIsLoadingDetail(false);
    }
  }, [locale]);

  // Load list on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Load detail when ?id changes
  useEffect(() => {
    if (viewId) {
      fetchDetail(viewId);
    } else {
      setDetail(null);
    }
  }, [viewId, fetchDetail]);

  const handleLoadMore = () => {
    fetchConversations(offset + 20);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    const confirmed = window.confirm(
      locale === 'ja' ? 'この会話を削除しますか？' : 'Delete this conversation?'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/hoo/conversations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
        // If viewing this conversation, go back to list
        if (viewId === id) {
          router.push('/dashboard/muednote/hoo');
        }
      }
    } catch {
      // Silently fail
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ========================
  // Detail View (read-only)
  // ========================
  if (viewId) {
    return (
      <MuednoteLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/muednote/hoo')}
                className="bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {detail?.title || (locale === 'ja' ? '会話詳細' : 'Conversation')}
                </h1>
                {detail && (
                  <p className="text-slate-400 text-sm mt-1">
                    {detail.messageCount} {locale === 'ja' ? 'メッセージ' : 'messages'} ·{' '}
                    {formatDate(detail.startedAt)}
                  </p>
                )}
              </div>
            </div>
            {detail && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(detail.id)}
                className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Messages (read-only) */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : detail?.messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  {locale === 'ja' ? 'メッセージがありません' : 'No messages'}
                </div>
              ) : (
                detail?.messages.map((msg, idx) => (
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
                      {msg.timestamp && (
                        <p className="text-xs mt-1 opacity-50">
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* iOS App CTA */}
            <div className="px-6 py-4 border-t border-white/10">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  {locale === 'ja'
                    ? 'この会話を続けるには、iOSアプリのHooチャットをご利用ください。'
                    : 'To continue this conversation, use Hoo Chat in the iOS app.'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </MuednoteLayout>
    );
  }

  // ========================
  // List View (default)
  // ========================
  return (
    <MuednoteLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-400" />
              {locale === 'ja' ? 'Hoo - 会話履歴' : 'Hoo - Conversation History'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {locale === 'ja'
                ? 'iOSアプリでの会話を振り返る'
                : 'Review your conversations from the iOS app'}
            </p>
          </div>
        </div>

        {/* iOS App CTA Banner */}
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3">
          <Smartphone className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-white">
              {locale === 'ja'
                ? 'Hooとの新しい会話はiOSアプリで'
                : 'Start new conversations with Hoo on the iOS app'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {locale === 'ja'
                ? 'セッション後の振り返りに最適です'
                : 'Perfect for reflecting after your sessions'}
            </p>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {locale === 'ja' ? `会話一覧（${total}件）` : `Conversations (${total})`}
            </h2>
          </div>
          <div className="p-6">
            {isLoadingList && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-400" />
                <p className="text-slate-400">
                  {locale === 'ja'
                    ? 'まだ会話履歴がありません'
                    : 'No conversation history yet'}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {locale === 'ja'
                    ? 'iOSアプリでHooと会話すると、ここに履歴が表示されます'
                    : 'Chat with Hoo on the iOS app and your history will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition group cursor-pointer"
                    onClick={() => router.push(`/dashboard/muednote/hoo?id=${conv.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/dashboard/muednote/hoo?id=${conv.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MessageSquare className="w-5 h-5 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {conv.messageCount} {locale === 'ja' ? 'メッセージ' : 'messages'} ·{' '}
                          {formatDate(conv.lastMessageAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(conv.id, e)}
                      className="ml-2 opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="secondary"
                      onClick={handleLoadMore}
                      disabled={isLoadingList}
                      className="bg-white/10 hover:bg-white/20 text-white border-0"
                    >
                      {isLoadingList ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : locale === 'ja' ? (
                        'もっと見る'
                      ) : (
                        'Load more'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </MuednoteLayout>
  );
}

export default function HooHistoryPage() {
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
      <HooHistoryContent />
    </Suspense>
  );
}
