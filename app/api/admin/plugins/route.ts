/**
 * Admin Plugins API
 * プラグイン管理API
 *
 * GET /api/admin/plugins - List all registered plugins
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user';
import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';

export async function GET(request: NextRequest) {
  try {
    // Admin authentication check
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

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

    return NextResponse.json({
      plugins: pluginList,
      total: pluginList.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plugins API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch plugins'
      },
      { status: 500 }
    );
  }
}
