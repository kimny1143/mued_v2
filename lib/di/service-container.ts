/**
 * Service Container Utilities
 * サービスコンテナユーティリティ
 *
 * Helper functions for service registration and retrieval
 */

import { Container } from 'inversify';
import type { Newable } from 'inversify';
import type { ResolutionContext } from 'inversify';
import { getContainer } from './inversify.config';
import type { ServiceType } from './types';

/**
 * Register a service in the container
 * コンテナにサービスを登録
 *
 * @param serviceIdentifier - Service type token
 * @param implementation - Service implementation class
 * @param scope - Service scope (Singleton, Transient, Request)
 */
export function registerService<T>(
  serviceIdentifier: ServiceType,
  implementation: Newable<T>,
  scope: 'Singleton' | 'Transient' | 'Request' = 'Singleton'
): void {
  const container = getContainer();

  const binding = container.bind<T>(serviceIdentifier).to(implementation);

  switch (scope) {
    case 'Singleton':
      binding.inSingletonScope();
      break;
    case 'Transient':
      binding.inTransientScope();
      break;
    case 'Request':
      binding.inRequestScope();
      break;
  }
}

/**
 * Register a factory for dynamic service creation
 * 動的サービス生成のためのファクトリーを登録
 *
 * @param serviceIdentifier - Service type token
 * @param factory - Factory function
 */
export function registerFactory<T>(
  serviceIdentifier: ServiceType,
  factory: (context: ResolutionContext) => T
): void {
  const container = getContainer();
  container.bind<T>(serviceIdentifier).toDynamicValue(factory).inSingletonScope();
}

/**
 * Register a constant value
 * 定数値を登録
 *
 * @param serviceIdentifier - Service type token
 * @param value - Constant value
 */
export function registerConstant<T>(serviceIdentifier: ServiceType, value: T): void {
  const container = getContainer();
  container.bind<T>(serviceIdentifier).toConstantValue(value);
}

/**
 * Resolve a service from the container
 * コンテナからサービスを解決
 *
 * @param serviceIdentifier - Service type token
 * @returns Service instance
 */
export function resolve<T>(serviceIdentifier: ServiceType): T {
  const container = getContainer();
  return container.get<T>(serviceIdentifier);
}

/**
 * Resolve all services of a given type
 * 指定された型のすべてのサービスを解決
 *
 * @param serviceIdentifier - Service type token
 * @returns Array of service instances
 */
export function resolveAll<T>(serviceIdentifier: ServiceType): T[] {
  const container = getContainer();
  return container.getAll<T>(serviceIdentifier);
}

/**
 * Check if a service is registered
 * サービスが登録されているかチェック
 *
 * @param serviceIdentifier - Service type token
 * @returns True if registered
 */
export function isRegistered(serviceIdentifier: ServiceType): boolean {
  const container = getContainer();
  return container.isBound(serviceIdentifier);
}

/**
 * Unregister a service
 * サービスの登録を解除
 *
 * @param serviceIdentifier - Service type token
 */
export function unregister(serviceIdentifier: ServiceType): void {
  const container = getContainer();
  if (container.isBound(serviceIdentifier)) {
    container.unbind(serviceIdentifier);
  }
}

/**
 * Create a snapshot of current container state
 * 現在のコンテナ状態のスナップショットを作成
 *
 * Note: InversifyJS doesn't support createChild in latest versions
 * Use this to get current container for testing/isolation purposes
 *
 * @returns Current container
 */
export function getContainerSnapshot(): Container {
  return getContainer();
}
