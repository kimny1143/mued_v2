'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Tag {
  name: string;
  count: number;
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

/**
 * TagFilter - MUEDnote タグフィルタリングコンポーネント
 *
 * UX心理学の原則:
 * - 視覚的フィードバック: 選択されたタグをハイライト表示
 * - プログレッシブディスクロージャー: タグ数が多い場合は展開/折りたたみ
 * - 認知負荷削減: クリアボタンで一括解除
 */
export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/muednote/tags');
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data: { tags: Tag[] } = await response.json();
      setTags(data.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      // Remove tag
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      // Add tag
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">読み込み中...</div>;
  }

  if (tags.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        まだタグがありません。記録を作成するとタグが表示されます。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">タグで絞り込み</h3>
        {selectedTags.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            クリア ({selectedTags.length})
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.name}
            variant={selectedTags.includes(tag.name) ? 'default' : 'outline'}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => toggleTag(tag.name)}
          >
            {tag.name} ({tag.count})
          </Badge>
        ))}
      </div>
    </div>
  );
}
