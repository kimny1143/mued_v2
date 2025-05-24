/**
 * デバッグモード制御ユーティリティ
 * 開発環境や特定の環境変数でデバッグ情報の表示を制御
 * 
 * ## 使用方法
 * 
 * ### 環境変数設定
 * - `NEXT_PUBLIC_DEBUG=true`: デバッグモードを有効化（本番環境でも開発者情報を表示）
 * - `NEXT_PUBLIC_DEBUG_VERBOSE=true`: 詳細デバッグモードを有効化（開発環境のみ）
 * 
 * ### 自動設定
 * - 開発環境（NODE_ENV=development）では自動的にデバッグモードが有効
 * - 本番環境では環境変数による明示的な設定が必要
 * 
 * ### 表示制御
 * - isDebugMode(): 基本的なデバッグ情報（ユーザーID、ロール情報など）
 * - isVerboseDebugMode(): 詳細なデバッグ情報（API応答の生データなど）
 * 
 * ### コンソールログ
 * - debugLog(): デバッグモードでのみコンソール出力
 * - verboseDebugLog(): 詳細デバッグモードでのみコンソール出力
 * 
 * ## 本番環境での注意点
 * - デバッグモードを有効にすると機密情報（ユーザーID、ロール情報など）が表示されます
 * - 必要な場合のみ一時的に有効化し、調査完了後は必ず無効化してください
 * - 詳細デバッグモードは開発環境でのみ動作します
 */

// デバッグモードの判定
export const isDebugMode = (): boolean => {
  // 開発環境では常にtrueに
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  // 明示的にDEBUGフラグが設定されている場合
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    return true;
  }
  
  // 本番環境では基本的にfalse
  return false;
};

// より詳細なデバッグ情報の表示判定（開発者向け）
export const isVerboseDebugMode = (): boolean => {
  // 開発環境かつVERBOSEフラグが設定されている場合
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_VERBOSE === 'true') {
    return true;
  }
  
  return false;
};

// コンソールログのデバッグ出力制御
export const debugLog = (message: string, data?: unknown): void => {
  if (isDebugMode()) {
    if (data !== undefined) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

// より詳細なデバッグログ
export const verboseDebugLog = (message: string, data?: unknown): void => {
  if (isVerboseDebugMode()) {
    if (data !== undefined) {
      console.log(`[VERBOSE DEBUG] ${message}`, data);
    } else {
      console.log(`[VERBOSE DEBUG] ${message}`);
    }
  }
}; 