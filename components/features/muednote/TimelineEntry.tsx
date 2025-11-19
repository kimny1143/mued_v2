'use client';

import { cn } from '@/lib/utils';
import type { LogEntry } from '@/db/schema/log-entries';
import { Calendar, Tag } from 'lucide-react';

interface TimelineEntryProps {
  entry: LogEntry;
  isLatest?: boolean;
}

/**
 * TimelineEntry - 個別のログエントリ表示
 *
 * UX心理学の原則:
 * - ビジュアルヒエラルキー: 最新のエントリを強調
 * - カードメタファー: 各記録をカードとして表現
 * - 色彩心理学: タグで視覚的な分類を実現
 */
export function TimelineEntry({ entry, isLatest }: TimelineEntryProps) {
  const createdAt = new Date(entry.createdAt);
  const formattedDate = createdAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // AI要約からデータを抽出
  const aiSummary = entry.aiSummary as any;
  const formatted = aiSummary?.formatted || entry.content;
  const tags = aiSummary?.tags || entry.tags || [];
  const comment = aiSummary?.comment;

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-5 transition-all hover:shadow-md',
        isLatest && 'border-primary shadow-sm'
      )}
    >
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formattedDate}</span>
        </div>
        {isLatest && (
          <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
            最新
          </span>
        )}
      </div>

      {/* オリジナルコンテンツ */}
      <div className="mb-3">
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          記録
        </h3>
        <p className="text-foreground whitespace-pre-wrap">{entry.content}</p>
      </div>

      {/* AI整形後 */}
      {formatted && formatted !== entry.content && (
        <div className="mb-3 bg-muted/20 rounded p-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            整形後
          </h3>
          <p className="text-foreground whitespace-pre-wrap">{formatted}</p>
        </div>
      )}

      {/* タグ */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {tags.map((tag: string, index: number) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
            >
              {tag.startsWith('#') ? tag : `#${tag}`}
            </span>
          ))}
        </div>
      )}

      {/* AIコメント */}
      {comment && (
        <div className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
          {comment}
        </div>
      )}
    </div>
  );
}
