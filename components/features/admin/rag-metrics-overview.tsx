'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, MessageSquare, Clock, DollarSign, Link2 } from 'lucide-react';

interface RAGMetrics {
  totalQueries: number;
  uniqueUsers: number;
  avgCitationRate: number;
  avgLatencyMs: number;
  avgCostJpy: number;
  avgRelevanceScore: number;
  trends: {
    queries: {
      current: number;
      previous: number;
      change: number;
      percentChange: number;
    };
    citationRate: {
      current: number;
      previous: number;
      change: number;
      percentChange: number;
    };
    latency: {
      current: number;
      previous: number;
      change: number;
      percentChange: number;
    };
    cost: {
      current: number;
      previous: number;
      change: number;
      percentChange: number;
    };
  };
}

export function RAGMetricsOverview() {
  const [metrics, setMetrics] = useState<RAGMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/rag-metrics');
      const data = await response.json();
      if (data.success) {
        setMetrics({
          totalQueries: data.totalQueries,
          uniqueUsers: data.uniqueUsers,
          avgCitationRate: data.avgCitationRate,
          avgLatencyMs: data.avgLatencyMs,
          avgCostJpy: data.avgCostJpy,
          avgRelevanceScore: data.avgRelevanceScore,
          trends: data.trends,
        });
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Current Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-12"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!metrics) {
    return null;
  }

  const getTrendIcon = (percentChange: number) => {
    if (percentChange > 5) return TrendingUp;
    if (percentChange < -5) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (percentChange: number, inverse = false) => {
    const isPositive = inverse ? percentChange < 0 : percentChange > 0;
    if (Math.abs(percentChange) < 5) return 'text-gray-500';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const statCards = [
    {
      icon: MessageSquare,
      label: 'Total Queries',
      value: metrics.totalQueries,
      trend: metrics.trends.queries,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      inverse: false,
    },
    {
      icon: Link2,
      label: 'Citation Rate',
      value: `${metrics.avgCitationRate.toFixed(1)}%`,
      trend: metrics.trends.citationRate,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      inverse: false,
    },
    {
      icon: Clock,
      label: 'Avg Latency',
      value: `${(metrics.avgLatencyMs / 1000).toFixed(2)}s`,
      trend: metrics.trends.latency,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      inverse: true, // Lower is better
    },
    {
      icon: DollarSign,
      label: 'Avg Cost',
      value: `¥${metrics.avgCostJpy.toFixed(2)}`,
      trend: metrics.trends.cost,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      inverse: true, // Lower is better
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Current Metrics (Last 7 Days)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const TrendIcon = getTrendIcon(card.trend.percentChange);
          const trendColor = getTrendColor(card.trend.percentChange, card.inverse);

          return (
            <Card key={index} hover>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">{card.label}</span>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
                <div className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">{card.value}</div>
                <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span>
                    {Math.abs(card.trend.percentChange).toFixed(1)}%
                  </span>
                  <span className="text-[var(--color-text-secondary)] ml-1">vs prev 7d</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {metrics.uniqueUsers}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Active users in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relevance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {metrics.avgRelevanceScore.toFixed(2)}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Average relevance score (0-1)
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
