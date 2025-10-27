/**
 * Custom DI Decorators
 * カスタムDIデコレーター
 *
 * Convenience decorators for dependency injection
 */

import { injectable, inject } from 'inversify';
import type { ServiceType } from './types';

/**
 * Mark a class as injectable
 * クラスをインジェクタブルとしてマーク
 *
 * Usage:
 * @Injectable()
 * class MyService { ... }
 */
export const Injectable = injectable;

/**
 * Inject a service by its type token
 * 型トークンによってサービスを注入
 *
 * Usage:
 * constructor(@Inject(TYPES.ContentFetcher) private fetcher: ContentFetcher) { ... }
 */
export const Inject = inject;

/**
 * Decorator factory for named injections
 * 名前付き注入のためのデコレーターファクトリー
 *
 * Usage:
 * @Injectable()
 * class MyService {
 *   constructor(@InjectNamed(TYPES.ContentFetcher, 'note') private noteFetcher: ContentFetcher) { ... }
 * }
 */
export function InjectNamed(serviceIdentifier: ServiceType, _named: string) {
  return function (target: object, propertyKey: string | symbol, parameterIndex: number) {
    inject(serviceIdentifier)(target, propertyKey, parameterIndex);
    // Note: Inversify's @named decorator would be used here in a full implementation
    // For simplicity, we're using a basic inject. Full named injection would require
    // container.bind().whenTargetNamed() setup
  };
}
