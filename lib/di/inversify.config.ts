/**
 * InversifyJS Container Configuration
 * InversifyJSコンテナ設定
 *
 * Central DI container for the application
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { PluginRegistry } from '@/lib/plugins/plugin-registry';
import { PluginLoader } from '@/lib/plugins/plugin-loader';
import { ContentFetcherRegistry } from '@/lib/content/content-fetcher-registry';

/**
 * Create and configure the DI container
 * DIコンテナの作成と設定
 */
export function createContainer(): Container {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  // Core services
  // コアサービス
  container.bind(TYPES.PluginRegistry).to(PluginRegistry).inSingletonScope();
  container.bind(TYPES.PluginLoader).to(PluginLoader).inSingletonScope();
  container.bind(TYPES.ContentFetcherRegistry).to(ContentFetcherRegistry).inSingletonScope();

  return container;
}

/**
 * Global container instance
 * グローバルコンテナインスタンス
 *
 * Use this for accessing services throughout the application
 */
let globalContainer: Container | null = null;

export function getContainer(): Container {
  if (!globalContainer) {
    globalContainer = createContainer();
  }
  return globalContainer;
}

/**
 * Reset container (useful for testing)
 * コンテナのリセット（テスト用）
 */
export function resetContainer(): void {
  globalContainer = null;
}
