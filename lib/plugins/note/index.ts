/**
 * Note.com Plugin
 * note.comプラグイン
 *
 * Plugin module for fetching content from note.com
 */

import type { PluginManifest } from '@/types/plugin-system';
import { NoteContentFetcher } from './note-content-fetcher';
import { NoteContentAdapter } from './note-content-adapter';

/**
 * Plugin Manifest
 * プラグインマニフェスト
 */
export const manifest: PluginManifest = {
  id: 'note-com-plugin',
  name: 'note.com Content Plugin',
  version: '1.0.0',
  description: 'Fetches educational content from note.com RSS feed',
  author: 'MUED Team',
  license: 'MIT',

  runtime: {
    minNodeVersion: '18.0.0',
    requiredEnvVars: [],
    dependencies: {
      'rss-parser': '^3.13.0',
    },
  },

  capabilities: {
    supportsSearch: true,
    supportsFiltering: true,
    requiresAuth: false,
    cacheDuration: 3600,
    rateLimit: {
      requests: 60,
      period: 3600,
    },
  },

  entry: {
    fetcher: './note-content-fetcher',
    adapter: './note-content-adapter',
  },

  permissions: {
    network: ['note.com'],
    fileSystem: 'none',
    env: [],
  },
};

/**
 * Create fetcher instance
 * フェッチャーインスタンスを作成
 */
export function createFetcher(): NoteContentFetcher {
  return new NoteContentFetcher();
}

/**
 * Create adapter instance
 * アダプターインスタンスを作成
 */
export function createAdapter(): NoteContentAdapter {
  return new NoteContentAdapter();
}

/**
 * Default export for plugin loader
 * プラグインローダー用のデフォルトエクスポート
 */
const notePlugin = {
  manifest,
  createFetcher,
  createAdapter,
};

export default notePlugin;
