'use client';

import { useActiveSlots, useTodaysSessions } from '@/lib/hooks/queries/useActiveSlots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * フィーチャーフラグでビュー/テーブルを切り替えるコンポーネント例
 */
export function ActiveSlotsDisplay() {
  const { data, isLoading, error } = useActiveSlots();
  const { data: todaysData } = useTodaysSessions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-500">データの取得に失敗しました</p>
        </CardContent>
      </Card>
    );
  }

  const useDbViews = process.env.NEXT_PUBLIC_USE_DB_VIEWS === 'true';

  return (
    <div className="space-y-6">
      {/* デバッグ情報 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">
            データベースビュー使用状況
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={useDbViews ? 'default' : 'secondary'}>
              {useDbViews ? 'ビュー使用中' : 'テーブル直接アクセス'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              NEXT_PUBLIC_USE_DB_VIEWS={String(useDbViews)}
            </span>
          </div>
          {data?.usingView !== undefined && (
            <p className="mt-2 text-xs text-muted-foreground">
              API応答: {data.usingView ? 'ビュー使用' : 'テーブル使用'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* アクティブなスロット一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>アクティブなレッスンスロット</CardTitle>
          <p className="text-sm text-muted-foreground">
            予約可能な{data?.count || 0}件のスロット
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data?.slots.map((slot: any) => (
              <div
                key={slot.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(slot.start_time), 'M月d日(E) HH:mm', { locale: ja })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {slot.teacher?.name || 'メンター未設定'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">¥{slot.hourly_rate.toLocaleString()}</p>
                  <Badge variant="outline" className="text-xs">
                    {slot.is_available ? '予約可能' : '予約済み'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 今日のセッション */}
      {todaysData && (
        <Card>
          <CardHeader>
            <CardTitle>本日のレッスン</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge>予定: {todaysData.stats.scheduled}</Badge>
              <Badge variant="secondary">進行中: {todaysData.stats.inProgress}</Badge>
              <Badge variant="outline">完了: {todaysData.stats.completed}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysData.sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(session.scheduled_start_time), 'HH:mm')} - 
                      {format(new Date(session.scheduled_end_time), 'HH:mm')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.teacher_name} × {session.student_name}
                    </p>
                  </div>
                  <Badge
                    variant={
                      session.status === 'COMPLETED' ? 'default' :
                      session.status === 'IN_PROGRESS' ? 'secondary' :
                      session.status === 'CANCELED' ? 'destructive' :
                      'outline'
                    }
                  >
                    {session.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}