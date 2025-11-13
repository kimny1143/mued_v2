'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useLocale } from '@/lib/i18n/locale-context';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface HistoricalMetrics {
  date: string;
  citationRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  costPerAnswer: number;
  totalQueries: number;
}

export function RAGMetricsHistory() {
  const { t } = useLocale();
  const [history, setHistory] = useState<HistoricalMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'7d' | '30d'>('7d');

  const fetchHistory = useCallback(async () => {
    try {
      const limit = selectedView === '7d' ? 7 : 30;
      const response = await fetch(`/api/admin/rag-metrics/history?limit=${limit}&sortBy=date&sortOrder=asc`);
      const data = await response.json();

      console.log('History API response:', data); // Debug log

      if (data.history && Array.isArray(data.history)) {
        setHistory(data.history.map((item: HistoricalMetrics) => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
        })));
      } else if (data.error) {
        console.error('History API error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedView]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{t.ragMetrics.historical.title}</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-16">
              <div className="animate-pulse text-[var(--color-text-secondary)]">{t.common.loading}</div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (history.length === 0) {
    return (
      <section>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{t.ragMetrics.historical.title}</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-16 text-[var(--color-text-secondary)]">
              {t.ragMetrics.historical.noData}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{t.ragMetrics.historical.title}</h2>
        <div className="flex gap-2">
          <button
            data-testid="period-7d"
            data-selected={selectedView === '7d'}
            onClick={() => setSelectedView('7d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.ragMetrics.historical.period7d}
          </button>
          <button
            data-testid="period-30d"
            data-selected={selectedView === '30d'}
            onClick={() => setSelectedView('30d')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedView === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.ragMetrics.historical.period30d}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Citation Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.ragMetrics.historical.citationRateChart}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                  label={{ value: 'Citation Rate (%)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${Number(value).toFixed(1)}%`, t.ragMetrics.historical.citationRateLabel]}
                />
                <Line
                  type="monotone"
                  dataKey="citationRate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.ragMetrics.historical.latencyChart}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                  label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${Number(value).toFixed(0)}ms`,
                    name === 'latencyP50Ms' ? t.ragMetrics.historical.latencyP50Label : t.ragMetrics.historical.latencyP95Label,
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="latencyP50Ms"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.3}
                  name="P50 Latency"
                />
                <Area
                  type="monotone"
                  dataKey="latencyP95Ms"
                  stroke="#ec4899"
                  fill="#ec4899"
                  fillOpacity={0.2}
                  name="P95 Latency"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost and Queries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.ragMetrics.historical.costChart}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                  label={{ value: 'Cost (¥)', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  stroke="#9ca3af"
                  label={{ value: 'Queries', angle: 90, position: 'insideRight', fill: '#6b7280' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'costPerAnswer' ? `¥${Number(value).toFixed(2)}` : value,
                    name === 'costPerAnswer' ? t.ragMetrics.historical.costLabel : t.ragMetrics.historical.queriesLabel,
                  ]}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="costPerAnswer"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  name="Cost per Answer"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="totalQueries"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Total Queries"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
