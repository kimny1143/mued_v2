'use client';

import { useEffect, useState } from 'react';
import { TimelineEntry } from './TimelineEntry';
import { TagFilter } from './TagFilter';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { LogEntry } from '@/db/schema/log-entries';

interface LogsResponse {
  entries: LogEntry[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * TimelineContainer - MUEDnote タイムライン表示コンテナ
 *
 * UX心理学の原則:
 * - ザイガルニク効果: 未完了タスクを視覚化して継続を促す
 * - プログレスバイアス: 蓄積された記録で成長を実感
 * - ピークエンド・ルール: 最新の記録を強調表示
 */
export function TimelineContainer() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });

  // 初回ロードとタグ変更時のリロード
  useEffect(() => {
    loadEntries(0);
  }, [selectedTags]); // selectedTagsが変更されたら再ロード

  const loadEntries = async (offset: number) => {
    try {
      const isInitial = offset === 0;
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // タグフィルタパラメータを追加
      const tagsParam = selectedTags.length > 0 ? `&tags=${selectedTags.join(',')}` : '';

      const response = await fetch(
        `/api/muednote/logs?limit=${pagination.limit}&offset=${offset}${tagsParam}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch log entries');
      }

      const data: LogsResponse = await response.json();

      if (isInitial) {
        setEntries(data.entries);
      } else {
        setEntries((prev) => [...prev, ...data.entries]);
      }

      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to load entries:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    loadEntries(pagination.offset + pagination.limit);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <p className="text-lg text-muted-foreground">
            まだ記録がありません
          </p>
          <p className="text-sm text-muted-foreground">
            チャットで今日の音楽活動を記録してみましょう
          </p>
          <a href="/muednote">
            <Button variant="default">チャットを開く</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* タグフィルタ (Phase 1.1) */}
      <div className="bg-muted/30 rounded-lg p-4">
        <TagFilter selectedTags={selectedTags} onTagsChange={setSelectedTags} />
      </div>

      {/* 統計情報 */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          {selectedTags.length > 0 ? (
            <>
              絞り込み結果: {pagination.total}件
              <span className="text-xs ml-2">
                (全体からフィルタ適用)
              </span>
            </>
          ) : (
            <>全{pagination.total}件の記録</>
          )}
        </p>
      </div>

      {/* タイムラインエントリ一覧 */}
      <div className="space-y-4">
        {entries.map((entry, index) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            isLatest={index === 0}
          />
        ))}
      </div>

      {/* もっと読み込むボタン */}
      {pagination.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                読み込み中...
              </>
            ) : (
              'もっと見る'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
