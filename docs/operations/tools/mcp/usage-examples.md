# MCP 使用例

## 基本的なテストケース

### 1. ページ遷移と要素操作

```typescript
import { test, expect } from '@playwright/test';
import { execMcp } from '../lib/mcpClient';

test('AI エージェントがレッスン予約を完了できる', async ({ page }) => {
  await page.goto('/');
  const result = await execMcp(page, `
    1. 「レッスンを予約」ボタンをクリック
    2. 最初の空き時間を選択
    3. 決済情報にテストカード 4242424242424242 を入力
    4. 完了画面のスクリーンショットを撮影
  `);
  expect(result.status).toBe('completed');
});
```

### 2. エラーハンドリング

```typescript
test('無効な命令を実行した場合、エラーが返される', async ({ page }) => {
  await page.goto('/');
  const result = await execMcp(page, `
    1. 存在しないボタン「予約する」をクリック
  `);
  expect(result.status).toBe('error');
  expect(result.error).toContain('要素が見つかりません');
});
```

## 高度な使用例

### 1. 複数ページにまたがる操作

```typescript
test('AI エージェントが複数ページの操作を実行できる', async ({ page }) => {
  await page.goto('/');
  const result = await execMcp(page, `
    1. ログインページに移動
    2. メールアドレスとパスワードを入力
    3. ログインボタンをクリック
    4. ダッシュボードで「プロフィール編集」をクリック
    5. プロフィール情報を更新
    6. 変更を保存
  `);
  expect(result.status).toBe('completed');
});
```

### 2. 動的な要素の待機

```typescript
test('AI エージェントが動的な要素を待機できる', async ({ page }) => {
  await page.goto('/');
  const result = await execMcp(page, `
    1. データ読み込み中のスピナーが消えるまで待機
    2. 表示されたデータテーブルの最初の行をクリック
    3. 詳細画面が表示されるまで待機
  `);
  expect(result.status).toBe('completed');
});
```

## ベストプラクティス

1. **命令の明確化**
   - 具体的な要素の識別子を使用
   - 操作の順序を明確に記述
   - 待機条件を明示的に指定

2. **エラーハンドリング**
   - 想定されるエラーケースをテスト
   - エラーメッセージの検証
   - タイムアウト設定の適切な管理

3. **テストの保守性**
   - 共通の操作を関数化
   - テストデータの外部化
   - 環境変数の適切な管理 