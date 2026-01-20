'use client';

/**
 * Hoo Conversation History Page
 */

import { useState, useEffect } from 'react';
import { MuednoteLayout } from '@/components/layouts/muednote-layout';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';
import Link from 'next/link';

interface Conversation {
  id: string;
  title: string;
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

export default function HooHistoryPage() {
  const { locale } = useLocale();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchConversations = async (newOffset = 0) => {
    setIsLoading(true);
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
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleLoadMore = () => {
    fetchConversations(offset + 20);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ja' ? 'この会話を削除しますか？' : 'Delete this conversation?')) {
      return;
    }

    try {
      const res = await fetch(`/api/hoo/conversations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch {
      // Handle error silently
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

  return (
    <MuednoteLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/muednote/hoo">
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {locale === 'ja' ? '会話履歴' : 'Conversation History'}
              </h1>
              <p className="text-slate-400 text-sm">
                {locale === 'ja'
                  ? `${total}件の会話`
                  : `${total} conversation${total !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {locale === 'ja' ? '過去の会話' : 'Past Conversations'}
            </h2>
          </div>
          <div className="p-6">
            {isLoading && conversations.length === 0 ? (
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
                <Link href="/dashboard/muednote/hoo">
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
                    {locale === 'ja' ? '会話を始める' : 'Start a conversation'}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition group"
                  >
                    <Link
                      href={`/dashboard/muednote/hoo?id=${conv.id}`}
                      className="flex-1 flex items-center gap-3"
                    >
                      <MessageSquare className="w-5 h-5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {conv.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {conv.messageCount} {locale === 'ja' ? 'メッセージ' : 'messages'} •{' '}
                          {formatDate(conv.lastMessageAt)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(conv.id);
                      }}
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
                      disabled={isLoading}
                      className="bg-white/10 hover:bg-white/20 text-white border-0"
                    >
                      {isLoading ? (
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
