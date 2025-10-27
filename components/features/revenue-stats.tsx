'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface RevenueData {
  totalLessons: number;
  totalGrossRevenue: string;
  mentorShare: string;
  platformFee: string;
  sharePercentage: number;
  monthlyLessons: number;
  monthlyGrossRevenue: string;
  monthlyMentorShare: string;
  averageLessonPrice: string;
  averageMentorEarnings: string;
  recentLessons: Array<{
    id: string;
    amount: string;
    mentorShare: string;
    date: string;
  }>;
}

export function RevenueStats() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRevenue() {
      try {
        const response = await fetch('/api/teacher/revenue');
        if (!response.ok) {
          throw new Error('Failed to fetch revenue data');
        }
        const json = await response.json();
        setData(json.revenue);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchRevenue();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <LoadingSpinner size="lg" label="収益情報を読み込み中..." />
      </div>
    );
  }

  if (error) {
    return <ErrorBoundary error={error} />;
  }

  if (!data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">収益データがありません</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">
            累計収益 ({data.sharePercentage}%)
          </div>
          <div className="text-2xl font-bold mt-2">¥{Number(data.mentorShare).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            総売上: ¥{Number(data.totalGrossRevenue).toLocaleString()}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">今月の収益</div>
          <div className="text-2xl font-bold mt-2">
            ¥{Number(data.monthlyMentorShare).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.monthlyLessons}レッスン完了
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">累計レッスン数</div>
          <div className="text-2xl font-bold mt-2">{data.totalLessons}</div>
          <div className="text-xs text-muted-foreground mt-1">完了したレッスン</div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-medium text-muted-foreground">平均収益/レッスン</div>
          <div className="text-2xl font-bold mt-2">
            ¥{Number(data.averageMentorEarnings).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            レッスン単価: ¥{Number(data.averageLessonPrice).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">収益内訳</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">総売上</span>
            <span className="font-medium">¥{Number(data.totalGrossRevenue).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-green-600">
            <span className="text-sm">あなたの取り分 ({data.sharePercentage}%)</span>
            <span className="font-bold">¥{Number(data.mentorShare).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span className="text-sm">プラットフォーム手数料 ({100 - data.sharePercentage}%)</span>
            <span className="font-medium">¥{Number(data.platformFee).toLocaleString()}</span>
          </div>
        </div>
      </Card>

      {/* Recent Lessons */}
      {data.recentLessons.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">最近のレッスン</h2>
          <div className="space-y-3">
            {data.recentLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex justify-between items-center border-b pb-2 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium">
                    {new Date(lesson.date).toLocaleDateString('ja-JP')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    レッスン料金: ¥{Number(lesson.amount).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">
                    ¥{Number(lesson.mentorShare).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">あなたの収益</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
