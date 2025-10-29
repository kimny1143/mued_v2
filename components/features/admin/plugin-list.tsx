'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import { Package, CheckCircle, XCircle, RefreshCw, Activity } from 'lucide-react';

interface Plugin {
  name: string;
  source: string;
  version: string;
  capabilities: {
    list: boolean;
    search: boolean;
    filter: boolean;
    fetch: boolean;
    transform: boolean;
  };
  apiEndpoint?: string;
  healthStatus: {
    healthy: boolean;
    lastCheck: Date | null;
    message?: string;
  };
}

interface PluginListProps {
  plugins: Plugin[];
  checkingHealth: string | null;
  onCheckHealth: (source: string) => void;
}

export function PluginList({ plugins, checkingHealth, onCheckHealth }: PluginListProps) {
  const { t } = useLocale();

  if (plugins.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          {t.plugins.noPlugins}
        </h3>
        <p className="text-[var(--color-text-secondary)]">
          {t.plugins.noPluginsDesc}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
        {t.plugins.registered}
      </h2>

      <div className="grid gap-4">
        {plugins.map((plugin) => (
          <div
            key={plugin.source}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-[var(--color-primary)] transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-[var(--color-primary)]/10 rounded-lg">
                  <Package className="w-6 h-6 text-[var(--color-primary)]" />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
                    {plugin.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                    <span className="font-mono">{plugin.source}</span>
                    <span>•</span>
                    <span>v{plugin.version}</span>
                  </div>
                  {plugin.apiEndpoint && (
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1 font-mono">
                      {plugin.apiEndpoint}
                    </p>
                  )}
                </div>
              </div>

              {/* Health Status Badge */}
              <div className="flex items-center gap-2">
                {plugin.healthStatus.healthy ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    {t.plugins.status.healthy}
                  </div>
                ) : plugin.healthStatus.lastCheck ? (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    <XCircle className="w-4 h-4" />
                    {t.plugins.status.unhealthy}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    <Activity className="w-4 h-4" />
                    {t.plugins.status.unknown}
                  </div>
                )}
              </div>
            </div>

            {/* Capabilities */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t.plugins.capabilities.title}
              </h4>
              <div className="flex flex-wrap gap-2">
                {plugin.capabilities.list && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {t.plugins.capabilities.list}
                  </span>
                )}
                {plugin.capabilities.search && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    {t.plugins.capabilities.search}
                  </span>
                )}
                {plugin.capabilities.filter && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {t.plugins.capabilities.filter}
                  </span>
                )}
                {plugin.capabilities.fetch && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    {t.plugins.capabilities.fetch}
                  </span>
                )}
                {plugin.capabilities.transform && (
                  <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium">
                    {t.plugins.capabilities.transform}
                  </span>
                )}
              </div>
            </div>

            {/* Health Check Info */}
            {plugin.healthStatus.lastCheck && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-[var(--color-text-secondary)]">
                  <strong>{t.plugins.health.lastCheck}:</strong>{' '}
                  {new Date(plugin.healthStatus.lastCheck).toLocaleString()}
                </div>
                {plugin.healthStatus.message && (
                  <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                    <strong>{t.plugins.health.message}:</strong> {plugin.healthStatus.message}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onCheckHealth(plugin.source)}
                disabled={checkingHealth === plugin.source}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingHealth === plugin.source ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t.plugins.health.checking}
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    {t.plugins.actions.checkHealth}
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
