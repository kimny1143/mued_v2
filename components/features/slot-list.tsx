'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMentorSlots, type MentorSlot, type SlotFilters } from '@/hooks/use-mentor-slots';
import { formatDateWithWeekday, formatTime } from '@/lib/utils';

interface SlotListProps {
  onEdit?: (slot: MentorSlot) => void;
  filters?: SlotFilters;
}

const STATUS_LABELS = {
  available: { label: '予約可能', variant: 'default' as const },
  booked: { label: '予約済み', variant: 'secondary' as const },
  cancelled: { label: 'キャンセル', variant: 'outline' as const },
};

export function SlotList({ onEdit, filters }: SlotListProps) {
  const { slots, stats, isLoading, error, deleteSlot, isDeleting, refresh } = useMentorSlots(filters);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (slotId: string, action: 'delete' | 'cancel') => {
    if (action === 'delete') {
      const confirmed = window.confirm('このスロットを完全に削除しますか？この操作は取り消せません。');
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm('このスロットをキャンセルしますか？');
      if (!confirmed) return;
    }

    setDeletingId(slotId);
    await deleteSlot(slotId, action);
    setDeletingId(null);
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return `¥${num.toLocaleString('ja-JP')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center text-muted-foreground">読み込み中...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={() => refresh()}>
              再読み込み
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalSlots}</div>
              <p className="text-xs text-muted-foreground">総スロット数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.availableSlots}</div>
              <p className="text-xs text-muted-foreground">予約可能</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{stats.bookedSlots}</div>
              <p className="text-xs text-muted-foreground">予約済み</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-400">{stats.cancelledSlots}</div>
              <p className="text-xs text-muted-foreground">キャンセル</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Slot list */}
      <Card>
        <CardHeader>
          <CardTitle>スロット一覧</CardTitle>
          <CardDescription>
            {slots.length === 0
              ? 'スロットがありません'
              : `${slots.length}件のスロット`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {slots.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              スロットがありません。新しいスロットを作成してください。
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDateWithWeekday(new Date(slot.startTime))}
                      </span>
                      <span className="text-muted-foreground">
                        {formatTime(new Date(slot.startTime))} - {formatTime(new Date(slot.endTime))}
                      </span>
                      <Badge variant={STATUS_LABELS[slot.status]?.variant || 'outline'}>
                        {STATUS_LABELS[slot.status]?.label || slot.status}
                      </Badge>
                      {slot.recurringId && (
                        <Badge variant="outline" className="text-xs">
                          繰り返し
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{formatPrice(slot.price)}</span>
                      <span>
                        定員: {slot.currentCapacity}/{slot.maxCapacity}名
                      </span>
                      {slot.tags && slot.tags.length > 0 && (
                        <div className="flex gap-1">
                          {slot.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {slot.status === 'available' && (
                      <>
                        {onEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(slot)}
                          >
                            編集
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(slot.id, 'cancel')}
                          disabled={isDeleting && deletingId === slot.id}
                        >
                          {isDeleting && deletingId === slot.id ? 'キャンセル中...' : 'キャンセル'}
                        </Button>
                      </>
                    )}
                    {slot.status !== 'booked' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(slot.id, 'delete')}
                        disabled={isDeleting && deletingId === slot.id}
                      >
                        {isDeleting && deletingId === slot.id ? '削除中...' : '削除'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
