'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface Plugin {
  name: string;
  source: string;
  healthStatus: {
    healthy: boolean;
    lastCheck: Date | null;
    message?: string;
  };
}

interface PluginHealthStatusProps {
  plugins: Plugin[];
  onCheckAll: () => void;
}

export function PluginHealthStatus({ plugins, onCheckAll }: PluginHealthStatusProps) {
  const { t } = useLocale();

  const totalPlugins = plugins.length;
  const healthyPlugins = plugins.filter(p => p.healthStatus.healthy).length;
  const unhealthyPlugins = plugins.filter(
    p => p.healthStatus.lastCheck && !p.healthStatus.healthy
  ).length;
  const unknownPlugins = plugins.filter(p => !p.healthStatus.lastCheck).length;

  const allHealthy = totalPlugins > 0 && healthyPlugins === totalPlugins;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          {t.plugins.health.title}
        </h2>
        <button
          onClick={onCheckAll}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          {t.plugins.health.checkAll}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Plugins */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {t.plugins.registered}
            </span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{totalPlugins}</div>
        </div>

        {/* Healthy Plugins */}
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              {t.plugins.status.healthy}
            </span>
          </div>
          <div className="text-2xl font-bold text-green-900">{healthyPlugins}</div>
        </div>

        {/* Unhealthy Plugins */}
        <div className="p-4 bg-red-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-900">
              {t.plugins.status.unhealthy}
            </span>
          </div>
          <div className="text-2xl font-bold text-red-900">{unhealthyPlugins}</div>
        </div>

        {/* Unknown Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">
              {t.plugins.status.unknown}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{unknownPlugins}</div>
        </div>
      </div>

      {/* Overall Status Message */}
      {totalPlugins > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-gray-50">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {allHealthy ? (
              <span className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <strong>{t.plugins.health.message}:</strong> All plugins are operating normally
              </span>
            ) : unhealthyPlugins > 0 ? (
              <span className="flex items-center gap-2 text-red-700">
                <XCircle className="w-4 h-4" />
                <strong>{t.plugins.health.message}:</strong> {unhealthyPlugins} plugin
                {unhealthyPlugins > 1 ? 's' : ''} require attention
              </span>
            ) : unknownPlugins > 0 ? (
              <span className="flex items-center gap-2 text-gray-700">
                <AlertCircle className="w-4 h-4" />
                <strong>{t.plugins.health.message}:</strong> {unknownPlugins} plugin
                {unknownPlugins > 1 ? 's' : ''} need health check
              </span>
            ) : null}
          </p>
        </div>
      )}
    </div>
  );
}
