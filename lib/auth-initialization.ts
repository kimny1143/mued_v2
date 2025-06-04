/**
 * 認証初期化のグローバル管理
 * React StrictModeでの二重実行を防ぐため、グローバルスコープで管理
 */

// グローバルな初期化状態を管理
let authInitialized = false;
let authInitializing = false;
let initializationPromise: Promise<void> | null = null;

export function isAuthInitialized(): boolean {
  return authInitialized;
}

export function isAuthInitializing(): boolean {
  return authInitializing;
}

export function getInitializationPromise(): Promise<void> | null {
  return initializationPromise;
}

export function setAuthInitializing(value: boolean): void {
  authInitializing = value;
}

export function setAuthInitialized(value: boolean): void {
  authInitialized = value;
  if (value) {
    console.log('🔐 認証初期化完了（グローバルフラグ設定）');
  }
}

export function setInitializationPromise(promise: Promise<void> | null): void {
  initializationPromise = promise;
}

// ブラウザでの開発環境のみ、ホットリロード時にリセット
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore
  if (module.hot) {
    // @ts-ignore
    module.hot.dispose(() => {
      authInitialized = false;
      authInitializing = false;
      initializationPromise = null;
    });
  }
}