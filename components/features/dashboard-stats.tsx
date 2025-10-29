'use client';

import { useEffect, useState } from 'react';
import { FileText, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useLocale } from '@/lib/i18n/locale-context';

interface DashboardStatsData {
  totalMaterials: number;
  totalReservations: number;
}

export function DashboardStats() {
  const { t } = useLocale();
  const [stats, setStats] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section>
        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{t.dashboard.overview}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const statCards = [
    {
      icon: FileText,
      label: t.dashboard.stats.totalMaterials,
      value: stats?.totalMaterials || 0,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Calendar,
      label: t.dashboard.stats.totalLessons,
      value: stats?.totalReservations || 0,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: CheckCircle,
      label: t.dashboard.stats.completed,
      value: 0, // TODO: Implement completed count
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Clock,
      label: t.dashboard.stats.inProgress,
      value: 0, // TODO: Implement in-progress count
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <section>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{t.dashboard.overview}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-600">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
