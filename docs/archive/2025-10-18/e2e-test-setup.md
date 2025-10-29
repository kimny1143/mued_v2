# E2E Test Setup Guide

## Overview

MUED LMS v2のE2Eテストは、Clerk OAuth認証をバイパスするためのテストモードを使用します。

## Environment Setup

### .env.test File

プロジェクトルートの`.env.test`ファイルにテスト環境変数が定義されています：

```bash
# E2E Test Environment Variables
# This file is loaded when running Playwright E2E tests
NEXT_PUBLIC_E2E_TEST_MODE=true
```

**重要:** `.env.test`はGitにコミットされます（機密情報を含まないため）

### How It Works

1. **Playwright Config** (`playwright.config.ts`)
   - テスト実行時に`.env.test`を自動読み込み
   - `dotenv.config({ path: ".env.test" })`

2. **MCP Servers** (`scripts/mcp/*.js`)
   - MCP経由のテスト実行時も`.env.test`を読み込み
   - すべてのMCPサーバーが環境変数を継承

3. **Middleware** (`middleware.ts`)
   - `NEXT_PUBLIC_E2E_TEST_MODE=true`の場合、Clerk認証をバイパス
   - ログに`[E2E Test Mode] Bypassing Clerk authentication`を出力

4. **Dashboard Pages** (`app/dashboard/**/page.tsx`)
   - `NEXT_PUBLIC_E2E_TEST_MODE=true`の場合、モックユーザーを使用
   - 実際のClerk `currentUser()`呼び出しをスキップ

## Running E2E Tests

### Local Development

```bash
# 開発サーバーをテストモードで起動
NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev

# 別のターミナルでテスト実行
npx playwright test
```

### Via MCP (Claude Desktop)

MCPサーバーは自動的に`.env.test`を読み込むため、環境変数の手動設定は不要：

```
Run all MUED E2E tests
```

または

```
Use mued_playwright_e2e to run all E2E tests
```

## Authentication Bypass Implementation

### Pattern for Dashboard Pages

```typescript
export default async function DashboardPage() {
  // Check E2E test mode
  const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';

  let user = null;

  if (!isE2ETestMode) {
    // Production: Use real Clerk authentication
    user = await currentUser();
    if (!user) {
      redirect("/sign-in");
    }
  } else {
    // E2E Test: Use mock user
    user = {
      firstName: 'Test',
      username: 'testuser',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    } as any;
  }

  return (
    <div>
      <h1>Welcome, {user.firstName}!</h1>
      {/* Page content */}
    </div>
  );
}
```

## Security Considerations

### Production Safety

- **本番環境では絶対に`NEXT_PUBLIC_E2E_TEST_MODE=true`を設定しないこと**
- Vercelなどのデプロイ環境では環境変数を設定しない
- `.env.local`、`.env.production`には含めない

### Why This Is Safe

1. **明示的な環境変数チェック**
   - `process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true'`
   - 文字列 "true" との厳密比較

2. **ローカル開発専用**
   - `.env.test`は開発環境でのみ使用
   - CIでは別の認証メカニズムを使用可能

3. **ログ出力**
   - テストモードが有効な場合、明確にログに記録
   - 意図しない有効化を検出しやすい

## Troubleshooting

### Tests Still Redirect to Sign-In

**原因:** 開発サーバーが環境変数なしで起動している

**解決策:**
```bash
# サーバーを停止
kill $(lsof -ti:3000)

# テストモードで再起動
NEXT_PUBLIC_E2E_TEST_MODE=true npm run dev
```

### [E2E Test Mode] Log Not Appearing

**原因:** `.env.test`が読み込まれていない

**確認:**
```bash
# Playwrightがdotenvを読み込んでいるか確認
grep -A 2 "import dotenv" playwright.config.ts

# MCPサーバーがdotenvを読み込んでいるか確認
grep -A 2 "require.*dotenv" scripts/mcp/mued-playwright-e2e.js
```

### Dashboard Pages Still Check Authentication

**原因:** ページレベルの`currentUser()`チェックがバイパスされていない

**解決策:** すべてのダッシュボードページにE2Eテストモードパターンを適用

## Files Modified

- `.env.test` - テスト環境変数定義
- `.gitignore` - `.env.test`を除外リストから除外
- `playwright.config.ts` - `.env.test`読み込み
- `scripts/mcp/mued-playwright-e2e.js` - `.env.test`読み込み
- `scripts/mcp/mued-playwright-screenshot.js` - `.env.test`読み込み
- `middleware.ts` - E2Eテストモードで認証バイパス
- `app/dashboard/page.tsx` - E2Eテストモードでモックユーザー使用
- `tests/helpers/auth.helper.ts` - モック認証実装

## Next Steps

1. ✅ `.env.test`ファイル作成完了
2. ✅ Playwright設定に読み込み追加完了
3. ✅ MCPサーバーに読み込み追加完了
4. ⏳ すべてのダッシュボードページにパターン適用
5. ⏳ 全E2Eテストスイート実行
6. ⏳ スクリーンショット収集

---

**最終更新:** 2025-10-03
**担当:** MUED LMS v2 Development Team
