/**
 * Plugin Registry
 * プラグインレジストリ
 *
 * Central registry for managing content fetcher plugins
 */

import { Injectable } from '@/lib/di';
import type { PluginManifest, LoadedPlugin, PluginConfig } from '@/types/plugin-system';
import { logger } from '@/lib/utils/logger';

@Injectable()
export class PluginRegistry {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private configs: Map<string, PluginConfig> = new Map();

  /**
   * Register a plugin
   * プラグインを登録
   */
  register(plugin: LoadedPlugin): void {
    if (this.plugins.has(plugin.manifest.id)) {
      throw new Error(`Plugin ${plugin.manifest.id} is already registered`);
    }

    this.plugins.set(plugin.manifest.id, plugin);
    logger.debug(`[PluginRegistry] Registered plugin: ${plugin.manifest.name} v${plugin.manifest.version}`);
  }

  /**
   * Unregister a plugin
   * プラグインの登録を解除
   */
  unregister(pluginId: string): boolean {
    const result = this.plugins.delete(pluginId);
    if (result) {
      this.configs.delete(pluginId);
      logger.debug(`[PluginRegistry] Unregistered plugin: ${pluginId}`);
    }
    return result;
  }

  /**
   * Get a plugin by ID
   * IDでプラグインを取得
   */
  get(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   * 登録されたすべてのプラグインを取得
   */
  getAll(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all active plugins
   * アクティブなプラグインをすべて取得
   */
  getActive(): LoadedPlugin[] {
    return this.getAll().filter(plugin => plugin.isActive);
  }

  /**
   * Check if a plugin is registered
   * プラグインが登録されているか確認
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Set plugin configuration
   * プラグインの設定を行う
   */
  setConfig(pluginId: string, config: PluginConfig): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    this.configs.set(pluginId, config);

    // Update plugin active status
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.isActive = config.enabled;
    }
  }

  /**
   * Get plugin configuration
   * プラグインの設定を取得
   */
  getConfig(pluginId: string): PluginConfig | undefined {
    return this.configs.get(pluginId);
  }

  /**
   * Get plugin by capability
   * 機能でプラグインを取得
   */
  getByCapability(capability: keyof PluginManifest['capabilities']): LoadedPlugin[] {
    return this.getActive().filter(plugin => {
      const cap = plugin.manifest.capabilities[capability];
      return typeof cap === 'boolean' ? cap : Boolean(cap);
    });
  }

  /**
   * List all plugin IDs
   * すべてのプラグインIDをリスト表示
   */
  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Clear all plugins
   * すべてのプラグインをクリア
   */
  clear(): void {
    this.plugins.clear();
    this.configs.clear();
    logger.debug('[PluginRegistry] Cleared all plugins');
  }

  /**
   * Get plugin count
   * プラグイン数を取得
   */
  count(): number {
    return this.plugins.size;
  }

  /**
   * Validate plugin manifest
   * プラグインマニフェストを検証
   */
  validateManifest(manifest: PluginManifest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!manifest.id) errors.push('Missing required field: id');
    if (!manifest.name) errors.push('Missing required field: name');
    if (!manifest.version) errors.push('Missing required field: version');
    if (!manifest.description) errors.push('Missing required field: description');
    if (!manifest.author) errors.push('Missing required field: author');
    if (!manifest.license) errors.push('Missing required field: license');

    // Validate capabilities
    if (!manifest.capabilities) {
      errors.push('Missing required field: capabilities');
    } else {
      if (typeof manifest.capabilities.supportsSearch !== 'boolean') {
        errors.push('capabilities.supportsSearch must be boolean');
      }
      if (typeof manifest.capabilities.supportsFiltering !== 'boolean') {
        errors.push('capabilities.supportsFiltering must be boolean');
      }
      if (typeof manifest.capabilities.requiresAuth !== 'boolean') {
        errors.push('capabilities.requiresAuth must be boolean');
      }
      if (typeof manifest.capabilities.cacheDuration !== 'number') {
        errors.push('capabilities.cacheDuration must be number');
      }
    }

    // Validate entry points
    if (!manifest.entry) {
      errors.push('Missing required field: entry');
    } else {
      if (!manifest.entry.fetcher) errors.push('entry.fetcher is required');
      if (!manifest.entry.adapter) errors.push('entry.adapter is required');
    }

    // Validate permissions
    if (!manifest.permissions) {
      errors.push('Missing required field: permissions');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
