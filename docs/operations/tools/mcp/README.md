# MCP (Model Context Protocol) / Playwright E2E 基盤 README

## 1. 目的
このディレクトリは MUED プロジェクトにおける **MCP + Playwright** を使った自動 E2E テスト基盤の設定・運用方法をまとめたものです。

> 実装を Push → GitHub Actions で裏口ログイン & MCP エージェントがブラウザ操作 → 結果で PR が red / green に。

## 2. 構成概要
```
docs/MCP/
 ├─ README.md          # ← このドキュメント
 ├─ mcp-inpl.md        # インライン TODO チェックリスト
 ├─ setup-guide.md     # セットアップ手順（詳細）
 └─ usage-examples.md  # エージェント命令サンプル
```

## 3. 前提ソフトウェア
- Node.js 18+
- Supabase プロジェクト (anon key / service role key)
- Stripe-mock (オプション / UI テスト復活時)

## 4. 主要コマンド
| コマンド | 用途 |
|----------|------|
| `npm run mcp` | ローカルで MCP サーバーを起動 (port 3333) |
| `npm run test:e2e` | Playwright + MCP E2E テスト実行 (globalSetup が MCP 起動＋裏口ログイン) |

## 5. 環境変数
`.env.test` (ローカル) と GitHub Secrets (CI) の両方で下記を定義してください。

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# 裏口ログインユーザー
NEXTAUTH_E2E_ENABLE=true
E2E_USER_EMAIL=e2e_student@example.com
E2E_USER_PASSWORD=super_secret

# MCP
PLAYWRIGHT_MCP_TOKEN=<long random string>
```

## 6. テストフロー
1. **globalSetup**
   - Supabase パスワード認証 (無ければ sign-up / admin API で作成)
   - `.auth.json` を生成して Playwright の `storageState` として保存
   - MCP サーバーを起動しヘルスチェック
2. **spec 実行**
   - agent 系テスト → `execMcp()` でブラウザ命令を送信
   - UI 系テスト (現在 skip) → Stripe & Seed 完了次第復活
3. **CI (GitHub Actions)**
   - `.github/workflows/e2e-mcp.yml` でブラウザバイナリ install → `npm run test:e2e`
   - Secrets で上記 env を注入

## 7. よくあるエラー
| 症状 | 原因 / 解決策 |
|------|---------------|
| `Not Acceptable: Client must accept…` | `accept` ヘッダーを小文字で追加済み。古い `mcpClient.ts` を使っていないか確認 |
| `Parse error` | MCP 側が HTML を返却。命令文の日本語解析が失敗 → テスト側は `res.ok=false` で許容 or 命令調整 |
| SSO リダイレクト (Vercel) | UI テスト skip 中。`E2E_REMOTE_URL` をローカル dev URL に切り替えて検証 |

## 8. 今後の TODO (詳細)

### 8.1 Stripe-mock 連携 (E2E 決済フロー用)
1. `stripe/stripe-mock` を devDependency に追加
2. `globalSetup.ts` で `STRIPE_MOCK=true` の場合に下記を実施
   ```ts
   const proc = spawn('stripe-mock', ['-http-port', '12111'], { stdio:'inherit' });
   await waitOn({ resources:['tcp:12111'] });
   ```
3. Next.js の Stripe ラッパー (`lib/stripe.ts`) で
   ```ts
   const useMock = process.env.STRIPE_MOCK === 'true';
   export const stripe = new Stripe('sk_test', {
     apiVersion:'2022-11-15',
     ...(useMock && { host:'localhost', port:12111, protocol:'http' }),
   });
   ```
4. reservation-flow.spec を skip 解除し、チェックアウト URL が `http://localhost:12111` であることを検証

### 8.2 Supabase Seed 自動投入
* 追加済み `scripts/seed-e2e.ts` を編集し、以下を Insert
  - users (mentor / admin)
  - lesson_slots (未来 3 件)
* CI では `npm run seed:e2e` を実行 (`SEED_E2E` フラグで制御)

### 8.3 MCP エラーメッセージ強化
* `Parse error` → 日本語詳細を返す様に server 側を改修
* テストは `res.error` の substring を動的に比較 (`expect(res.error).toMatch(/要素|タイムアウト|パース/)`)

### 8.4 booking テスト & 管理者フロー
* booking skip 解除
  - 予約画面 → MCP agent が時間枠選択 → stripe-mock で決済 → success
* メンター / 管理者ダッシュボードの CRUD テストを追加

## 9. 参考
- [`setup-guide.md`](./setup-guide.md) – インストール詳細
- [`usage-examples.md`](./usage-examples.md) – MCP 命令文テンプレート
- Playwright + MCP: https://github.com/microsoft/playwright & https://github.com/microsoft/playwright-mcp 