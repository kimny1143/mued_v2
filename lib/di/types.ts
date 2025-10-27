/**
 * DI Service Type Identifiers
 * DIサービス型識別子
 *
 * Service tokens for dependency injection
 */

export const TYPES = {
  // Core services
  ContentFetcherRegistry: Symbol.for('ContentFetcherRegistry'),
  PluginRegistry: Symbol.for('PluginRegistry'),
  PluginLoader: Symbol.for('PluginLoader'),

  // Content fetchers
  ContentFetcher: Symbol.for('ContentFetcher'),
  NoteContentFetcher: Symbol.for('NoteContentFetcher'),
  AIContentFetcher: Symbol.for('AIContentFetcher'),

  // Adapters
  ContentAdapter: Symbol.for('ContentAdapter'),
  NoteContentAdapter: Symbol.for('NoteContentAdapter'),

  // Validators
  ContentValidator: Symbol.for('ContentValidator'),
  QualityValidator: Symbol.for('QualityValidator'),

  // Cache & Storage
  CacheService: Symbol.for('CacheService'),
  MetricsService: Symbol.for('MetricsService'),

  // Monitoring
  HealthMonitor: Symbol.for('HealthMonitor'),
  AlertService: Symbol.for('AlertService'),
} as const;

export type ServiceType = typeof TYPES[keyof typeof TYPES];
