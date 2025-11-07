/**
 * Admin Plugins API
 * プラグイン管理API
 *
 * GET /api/admin/plugins - List all registered plugins
 */

import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';
import { withAdminAuth } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiServerError,
} from '@/lib/api-response';

export const GET = withAdminAuth(async () => {
  try {
    // Get all registered plugins
    const plugins = ragPluginRegistry.getAll();

    // Format plugin data for response
    const pluginList = plugins.map(plugin => ({
      name: plugin.name,
      source: plugin.source,
      version: plugin.version,
      capabilities: plugin.capabilities,
      apiEndpoint: plugin.apiEndpoint,
      healthStatus: ragPluginRegistry.getHealthStatus(plugin.source) || {
        healthy: false,
        lastCheck: null,
        message: 'Not checked yet'
      }
    }));

    return apiSuccess({
      plugins: pluginList,
      total: pluginList.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plugins API] Error:', error);
    return apiServerError(
      error instanceof Error ? error : new Error('Failed to fetch plugins')
    );
  }
});
