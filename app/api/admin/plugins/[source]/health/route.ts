/**
 * Plugin Health Check API
 * プラグインヘルスチェックAPI
 *
 * POST /api/admin/plugins/[source]/health - Run health check for specific plugin
 */

import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';
import { withAuthParams } from '@/lib/middleware/with-auth';
import { auth } from '@clerk/nextjs/server';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

export const POST = withAuthParams<{ source: string }>(
  async ({ params }) => {
    try {
      // Manual admin check (withAdminAuth doesn't support params yet)
      const { sessionClaims } = await auth();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const metadata = (sessionClaims as any)?.metadata;
      const isAdmin = metadata?.role === 'admin';

      if (!isAdmin) {
        return apiForbidden('Admin access required');
      }

      // Check if plugin exists
      const plugin = ragPluginRegistry.get(params.source);
      if (!plugin) {
        return apiNotFound(`Plugin "${params.source}" not found`);
      }

      // Run health check
      const startTime = Date.now();
      const health = await ragPluginRegistry.checkHealth(params.source);
      const duration = Date.now() - startTime;

      return apiSuccess({
        source: params.source,
        pluginName: plugin.name,
        health: {
          ...health,
          checkDuration: duration
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[Plugin Health Check API] Error:', error);
      return apiServerError(
        error instanceof Error ? error : new Error('Health check failed')
      );
    }
  }
);
