'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMentorSlots, DAYS_OF_WEEK, type CreateSlotInput, type CreateRecurringInput } from '@/hooks/use-mentor-slots';
import { cn } from '@/lib/utils';

interface SlotCreateFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SlotCreateForm({ onSuccess, onCancel }: SlotCreateFormProps) {
  const { createSlot, createRecurring, isCreating, error } = useMentorSlots();

  // Form state
  const [isRecurring, setIsRecurring] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Single slot fields
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('1');

  // Recurring fields
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!price || parseFloat(price) < 0) {
      setFormError('料金を入力してください');
      return;
    }

    if (!startTime || !endTime) {
      setFormError('開始時刻と終了時刻を入力してください');
      return;
    }

    if (isRecurring) {
      // Recurring validation
      if (selectedDays.length === 0) {
        setFormError('曜日を1つ以上選択してください');
        return;
      }

      if (!startDate || !endDate) {
        setFormError('開始日と終了日を入力してください');
        return;
      }

      if (new Date(endDate) <= new Date(startDate)) {
        setFormError('終了日は開始日より後に設定してください');
        return;
      }

      const input: CreateRecurringInput = {
        recurring: true,
        startTime,
        endTime,
        price,
        maxCapacity: parseInt(maxCapacity, 10) || 1,
        daysOfWeek: selectedDays,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };

      const result = await createRecurring(input);

      if (result) {
        onSuccess?.();
      }
    } else {
      // Single slot validation
      if (!date) {
        setFormError('日付を入力してください');
        return;
      }

      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (endDateTime <= startDateTime) {
        setFormError('終了時刻は開始時刻より後に設定してください');
        return;
      }

      const input: CreateSlotInput = {
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        price,
        maxCapacity: parseInt(maxCapacity, 10) || 1,
      };

      const result = await createSlot(input);

      if (result) {
        onSuccess?.();
      }
    }
  };

  const displayError = formError || error;

  return (
    <Card>
      <CardHeader>
        <CardTitle>スロットを作成</CardTitle>
        <CardDescription>
          {isRecurring
            ? '繰り返しパターンでまとめてスロットを作成します'
            : '新しいレッスンスロットを作成します'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recurring toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="recurring">繰り返し設定</Label>
              <p className="text-sm text-muted-foreground">
                毎週同じ曜日・時間にスロットを作成
              </p>
            </div>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* Time fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startTime">開始時刻</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">終了時刻</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Single slot: Date picker */}
          {!isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="date">日付</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          )}

          {/* Recurring: Day selection */}
          {isRecurring && (
            <>
              <div className="space-y-2">
                <Label>曜日</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-colors',
                        selectedDays.includes(day.value)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">開始日</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">終了日</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Price and capacity */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">料金（円）</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                placeholder="3000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxCapacity">最大人数</Label>
              <Input
                id="maxCapacity"
                type="number"
                min="1"
                max="100"
                value={maxCapacity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxCapacity(e.target.value)}
              />
            </div>
          </div>

          {/* Error display */}
          {displayError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {displayError}
            </div>
          )}

          {/* Preview for recurring */}
          {isRecurring && selectedDays.length > 0 && startDate && endDate && (
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm font-medium">プレビュー:</p>
              <p className="text-sm text-muted-foreground mt-1">
                {startDate} 〜 {endDate} の間、
                毎週 {selectedDays.sort().map(d => DAYS_OF_WEEK.find(day => day.value === d)?.labelFull).join('・')} の
                {startTime}〜{endTime} にスロットを作成します。
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                キャンセル
              </Button>
            )}
            <Button type="submit" disabled={isCreating}>
              {isCreating ? '作成中...' : isRecurring ? 'まとめて作成' : '作成'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
