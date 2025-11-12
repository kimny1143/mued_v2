/**
 * Plugin Loader
 * プラグインローダー
 *
 * Dynamically loads and initializes plugins at runtime
 */

import { Injectable, Inject, TYPES } from '@/lib/di';
import type { PluginManifest, LoadedPlugin } from '@/types/plugin-system';
import type { PluginRegistry } from './plugin-registry';
import { logger } from '@/lib/utils/logger';

interface PluginModule {
  default: {
    manifest: PluginManifest;
    createFetcher: () => unknown;
    createAdapter: () => unknown;
    createValidator?: () => unknown;
  };
}

@Injectable()
export class PluginLoader {
  constructor(
    @Inject(TYPES.PluginRegistry) private registry: PluginRegistry
  ) {}

  /**
   * Load a plugin from a module path
   * モジュールパスからプラグインを読み込む
   *
   * @param modulePath - Path to the plugin module
   * @returns Loaded plugin
   */
  async load(modulePath: string): Promise<LoadedPlugin> {
    try {
      logger.debug(`[PluginLoader] Loading plugin from: ${modulePath}`);

      // Dynamically import the plugin module
      const pluginModule = await import(modulePath) as PluginModule;

      if (!pluginModule.default) {
        throw new Error('Plugin module must have a default export');
      }

      const { manifest, createFetcher, createAdapter, createValidator } = pluginModule.default;

      // Validate manifest
      const validation = this.registry.validateManifest(manifest);
      if (!validation.valid) {
        throw new Error(`Invalid plugin manifest: ${validation.errors.join(', ')}`);
      }

      // Create plugin instances
      const fetcher = createFetcher();
      const adapter = createAdapter();
      const validator = createValidator ? createValidator() : undefined;

      const plugin: LoadedPlugin = {
        manifest,
        fetcher,
        adapter,
        validator,
        loadedAt: new Date(),
        isActive: true,
      };

      // Register the plugin
      this.registry.register(plugin);

      logger.debug(`[PluginLoader] Successfully loaded plugin: ${manifest.name}`);
      return plugin;
    } catch (error) {
      logger.error(`[PluginLoader] Failed to load plugin from ${modulePath}:`, error);
      throw error;
    }
  }

  /**
   * Load multiple plugins
   * 複数のプラグインを読み込む
   *
   * @param modulePaths - Array of plugin module paths
   * @returns Array of loaded plugins
   */
  async loadMultiple(modulePaths: string[]): Promise<LoadedPlugin[]> {
    const results = await Promise.allSettled(
      modulePaths.map(path => this.load(path))
    );

    const loaded: LoadedPlugin[] = [];
    const failed: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        loaded.push(result.value);
      } else {
        failed.push(modulePaths[index]);
        logger.error(`Failed to load plugin ${modulePaths[index]}:`, result.reason);
      }
    });

    if (failed.length > 0) {
      logger.warn(`[PluginLoader] Failed to load ${failed.length} plugins:`, failed);
    }

    logger.debug(`[PluginLoader] Successfully loaded ${loaded.length}/${modulePaths.length} plugins`);
    return loaded;
  }

  /**
   * Unload a plugin
   * プラグインをアンロード
   *
   * @param pluginId - Plugin ID to unload
   * @returns True if unloaded successfully
   */
  unload(pluginId: string): boolean {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      logger.warn(`[PluginLoader] Plugin ${pluginId} not found`);
      return false;
    }

    // Perform cleanup if needed
    // Future: Add lifecycle hooks (onUnload, etc.)

    const result = this.registry.unregister(pluginId);
    if (result) {
      logger.debug(`[PluginLoader] Unloaded plugin: ${pluginId}`);
    }

    return result;
  }

  /**
   * Reload a plugin
   * プラグインを再読み込み
   *
   * @param pluginId - Plugin ID to reload
   * @param modulePath - Path to the plugin module
   * @returns Reloaded plugin
   */
  async reload(pluginId: string, modulePath: string): Promise<LoadedPlugin> {
    logger.debug(`[PluginLoader] Reloading plugin: ${pluginId}`);

    // Unload existing plugin
    this.unload(pluginId);

    // Load the plugin again
    return this.load(modulePath);
  }

  /**
   * Get load statistics
   * 読み込み統計を取得
   */
  getStats(): {
    total: number;
    active: number;
    inactive: number;
  } {
    const all = this.registry.getAll();
    const active = all.filter(p => p.isActive);

    return {
      total: all.length,
      active: active.length,
      inactive: all.length - active.length,
    };
  }
}
