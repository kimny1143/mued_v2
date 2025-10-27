/**
 * Plugin System Type Definitions
 * プラグインシステム型定義
 *
 * Based on: NOTE_MATERIALS_INTEGRATION_PROPOSAL_V4_JA.md
 */

export interface PluginManifest {
  id: string;                        // 一意識別子
  name: string;                       // 表示名
  version: string;                    // セマンティックバージョン
  description: string;
  author: string;
  license: string;

  // ランタイム要件
  runtime: {
    minNodeVersion?: string;
    requiredEnvVars?: string[];
    dependencies?: Record<string, string>;
  };

  // 機能宣言
  capabilities: {
    supportsSearch: boolean;
    supportsFiltering: boolean;
    requiresAuth: boolean;
    cacheDuration: number;           // 秒
    rateLimit?: {
      requests: number;
      period: number;                // 秒
    };
  };

  // エントリポイント
  entry: {
    fetcher: string;                 // ContentFetcher実装へのパス
    adapter: string;                 // ContentAdapter実装へのパス
    validator?: string;              // オプションのカスタムバリデーター
  };

  // 設定スキーマ (JSON Schema)
  configSchema?: Record<string, unknown>;

  // セキュリティ
  permissions: {
    network?: string[];              // 許可されたドメイン
    fileSystem?: 'read' | 'write' | 'none';
    env?: string[];                  // アクセス可能な環境変数
  };
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  fetcher: unknown;                  // ContentFetcher instance
  adapter: unknown;                  // ContentAdapter instance
  validator?: unknown;               // Optional validator
  loadedAt: Date;
  isActive: boolean;
}

export interface PluginConfig {
  enabled: boolean;
  config?: Record<string, unknown>;
  overrides?: Partial<PluginManifest['capabilities']>;
}
