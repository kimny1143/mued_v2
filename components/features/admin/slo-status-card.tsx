'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SLOStatus {
  citationRate: {
    current: number;
    target: number;
    met: boolean;
  };
  latency: {
    current: number;
    target: number;
    met: boolean;
  };
  cost: {
    current: number;
    target: number;
    met: boolean;
  };
  overallMet: boolean;
}

export function SLOStatusCard() {
  const [sloStatus, setSloStatus] = useState<SLOStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSLOStatus();
  }, []);

  const fetchSLOStatus = async () => {
    try {
      const response = await fetch('/api/admin/rag-metrics');
      const data = await response.json();
      if (data.success) {
        setSloStatus(data.sloStatus);
      }
    } catch (error) {
      console.error('Failed to fetch SLO status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLO Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-[var(--color-text-secondary)]">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sloStatus) {
    return null;
  }

  const StatusIcon = sloStatus.overallMet ? CheckCircle : AlertCircle;

  return (
    <Card className={`border-l-4 ${sloStatus.overallMet ? 'border-l-green-500' : 'border-l-orange-500'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Service Level Objectives (SLO)</CardTitle>
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-6 h-6 ${sloStatus.overallMet ? 'text-green-600' : 'text-orange-600'}`} />
            <span className={`text-sm font-semibold ${sloStatus.overallMet ? 'text-green-600' : 'text-orange-600'}`}>
              {sloStatus.overallMet ? 'All SLOs Met' : 'SLO Issues'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Citation Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Citation Rate</span>
              {sloStatus.citationRate.met ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              {sloStatus.citationRate.current.toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Target: ≥{sloStatus.citationRate.target}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${sloStatus.citationRate.met ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (sloStatus.citationRate.current / sloStatus.citationRate.target) * 100)}%` }}
              />
            </div>
          </div>

          {/* Latency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Latency (P50)</span>
              {sloStatus.latency.met ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              {(sloStatus.latency.current / 1000).toFixed(2)}s
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Target: ≤{(sloStatus.latency.target / 1000).toFixed(1)}s
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${sloStatus.latency.met ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, 100 - ((sloStatus.latency.current - sloStatus.latency.target) / sloStatus.latency.target) * 50)}%` }}
              />
            </div>
          </div>

          {/* Cost */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Cost per Answer</span>
              {sloStatus.cost.met ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">
              ¥{sloStatus.cost.current.toFixed(2)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              Target: ≤¥{sloStatus.cost.target.toFixed(2)}
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${sloStatus.cost.met ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, 100 - ((sloStatus.cost.current - sloStatus.cost.target) / sloStatus.cost.target) * 50)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
