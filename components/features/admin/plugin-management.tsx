'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { Activity, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { PluginList } from './plugin-list';
import { PluginHealthStatus } from './plugin-health-status';

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

interface PluginsResponse {
  plugins: Plugin[];
  total: number;
  timestamp: string;
  error?: string;
  message?: string;
}

export function PluginManagement() {
  const { t } = useLocale();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<string | null>(null);

  // Fetch plugins
  const fetchPlugins = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/plugins');
      const data: PluginsResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch plugins');
      }

      setPlugins(data.plugins);
    } catch (err) {
      console.error('[Plugin Management] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch plugins');
    } finally {
      setLoading(false);
    }
  };

  // Check health for specific plugin
  const checkPluginHealth = async (source: string) => {
    try {
      setCheckingHealth(source);

      const response = await fetch(`/api/admin/plugins/${source}/health`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Health check failed');
      }

      // Refresh plugins list to show updated health status
      await fetchPlugins();

    } catch (err) {
      console.error(`[Plugin Management] Health check error for ${source}:`, err);
      alert(`Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCheckingHealth(null);
    }
  };

  // Check health for all plugins
  const checkAllHealth = async () => {
    for (const plugin of plugins) {
      await checkPluginHealth(plugin.source);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-[var(--color-text-secondary)]">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>{t.common.loading}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <button
          onClick={fetchPlugins}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          {t.common.retry || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          {t.plugins.title}
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          {t.plugins.subtitle}
        </p>
      </section>

      {/* Overall Health Status */}
      <PluginHealthStatus plugins={plugins} onCheckAll={checkAllHealth} />

      {/* Plugin List */}
      <PluginList
        plugins={plugins}
        checkingHealth={checkingHealth}
        onCheckHealth={checkPluginHealth}
      />
    </div>
  );
}
