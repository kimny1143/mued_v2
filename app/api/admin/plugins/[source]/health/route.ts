/**
 * Plugin Health Check API
 * プラグインヘルスチェックAPI
 *
 * POST /api/admin/plugins/[source]/health - Run health check for specific plugin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/user';
import { ragPluginRegistry } from '@/lib/plugins/rag-plugin-registry';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  try {
    // Admin authentication check
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { source } = await params;

    // Check if plugin exists
    const plugin = ragPluginRegistry.get(source);
    if (!plugin) {
      return NextResponse.json(
        { error: 'Not Found', message: `Plugin "${source}" not found` },
        { status: 404 }
      );
    }

    // Run health check
    const startTime = Date.now();
    const health = await ragPluginRegistry.checkHealth(source);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      source,
      pluginName: plugin.name,
      health: {
        ...health,
        checkDuration: duration
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Plugin Health Check API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}
