# MUED LMS フロントエンドとAIサービスの統合テスト実装

**作成日**: 2025年5月2日  
**作成者**: 開発チーム

## 概要

このドキュメントでは、MUED LMSのフロントエンド（Vite + React）とAIサービス（FastAPI）間の統合テスト実装について説明します。APIエンドポイントへの接続テストとユーザーインターフェースの実装に焦点を当てています。

## 実装した機能

1. **API接続テスト用コンポーネント** (`ApiTestPanel`)
   - API接続状態を視覚的に確認できるUI
   - 複数エンドポイントのテスト機能
   - 環境による自動URL切り替え

2. **テスト用APIクライアント** (`apiTestClient`)
   - APIエンドポイント接続用の統一インターフェース
   - エラーハンドリングとレポート機能
   - モック/実環境の切り替え機能

3. **API統合テスト** (`api-integration.test.ts`)
   - 自動テストでのAPI接続確認
   - CI環境での継続的な接続検証
   - テスト環境でのモックデータ使用オプション

## ファイル構成

```
src/
├── components/
│   └── ApiTestPanel.tsx     # API接続テスト用UIコンポーネント
├── config/
│   └── api.ts               # API設定（URL等）
├── lib/
│   ├── apiClient.ts         # メインAPIクライアント
│   └── apiTestClient.ts     # テスト用APIクライアント
└── __tests__/
    └── api-integration.test.ts  # API統合テスト
```

## 重要なコード例

### 環境別API URL設定

```typescript
// src/config/api.ts
export const API_BASE_URL = import.meta.env.PROD 
  ? 'https://mued-api-0036ad93dbdb.herokuapp.com'
  : 'http://localhost:8000';
```

### テスト実行の切り替え

```typescript
// 環境変数による実際のAPI呼び出しの制御
const USE_MOCK = process.env.NODE_ENV === 'test' && process.env.USE_REAL_API !== 'true';

// テスト内での条件分岐
it('APIエンドポイントのテスト', async () => {
  if (USE_MOCK) {
    // モックデータでテスト
    return;
  }
  
  // 実際のAPIを呼び出す
  const response = await fetch(`${API_BASE_URL}/endpoint`);
  // アサーション...
});
```

## 使用方法

### 開発時のAPI接続テスト

1. アプリケーション内で `ApiTestPanel` コンポーネントをマウント
2. テストしたいエンドポイントを選択（ヘルスチェック/すべて）
3. 「接続テスト実行」ボタンをクリック
4. 結果を確認し、必要に応じてエラーを修正

### 自動テストの実行

```bash
# 通常テスト（モックデータ使用）
npm run test

# 実際のAPIに対するテスト
USE_REAL_API=true npm run test

# カバレッジレポート付き
npm run test:coverage
```

## 今後の拡張計画

1. **テストケースの拡充**
   - エラー状態のテスト（タイムアウト、サーバーエラー等）
   - エッジケースの検証（大量データ、特殊文字等）

2. **モックデータの強化**
   - より現実的なレスポンスデータの用意
   - ネットワーク状態のシミュレーション

3. **E2Eテスト連携**
   - Playwrightによる自動化されたUIテスト
   - APIモック/スタブの活用

## 参考資料

- [Vitest公式ドキュメント](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) 