'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SlotCreateForm } from '@/components/features/slot-create-form';
import { SlotList } from '@/components/features/slot-list';
import type { SlotFilters } from '@/hooks/use-mentor-slots';

export default function TeacherSlotsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState<SlotFilters>({});

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">レッスンスロット管理</h1>
          <p className="text-muted-foreground">
            レッスン枠の作成・編集・削除を行います
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          {showCreateForm ? '閉じる' : '新規作成'}
        </Button>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        <Button
          variant={!filters.status ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilters({})}
        >
          すべて
        </Button>
        <Button
          variant={filters.status === 'available' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilters({ status: 'available' })}
        >
          予約可能
        </Button>
        <Button
          variant={filters.status === 'booked' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilters({ status: 'booked' })}
        >
          予約済み
        </Button>
        <Button
          variant={filters.status === 'cancelled' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setFilters({ status: 'cancelled' })}
        >
          キャンセル
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <SlotCreateForm
          onSuccess={() => setShowCreateForm(false)}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Slot list */}
      <SlotList filters={filters} />
    </div>
  );
}
