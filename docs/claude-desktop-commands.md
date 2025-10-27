# Claude Desktop コマンドガイド - MUED LMS v2

作成日: 2025-10-03

## 概要

このドキュメントは、MUED LMS v2プロジェクトのテスト実行とスクリーンショット収集をClaude Desktop経由で実行するためのコマンド集です。

すべてのコマンドは**Claude Desktop上でメッセージとして送信**するだけで実行できます。手動でターミナルコマンドを実行する必要はありません。

---

## 利用可能なMCPサーバー

Claude Desktopで以下の4つのMCPサーバーが有効化されています：

| サーバー名 | 目的 | ツール数 |
|-----------|------|---------|
| `mued_playwright_e2e` | E2Eテスト実行 | 4 |
| `mued_unit_test` | 単体テスト実行 | 3 |
| `mued_test` | API/ヘルスチェック | 4 |
| `mued_screenshot` | スクリーンショット収集 | 1 |

---

## 📋 E2Eテスト実行コマンド（mued_playwright_e2e）

### ⚠️ 重要：プロジェクト名を必ず指定してください

Claude Desktop設定には複数プロジェクト（MUED、HAAS等）のMCPサーバーが登録されています。
**必ず「MUED」または「mued_playwright_e2e」を明記**してください。

### 1. 全E2Eテストを実行

```
Run all MUED E2E tests
```

または

```
MUEDの全てのE2Eテストを実行して
```

または

```
Use mued_playwright_e2e to run all E2E tests
```

**実行内容:**
- 全Playwrightテストの実行
- HTML/JSONレポート自動生成
- `/tests/reports/e2e-[timestamp].md` にMarkdownレポート保存
- 失敗時のスクリーンショット自動収集

**所要時間:** 約2-3分（タイムアウト対策済み）

**⚠️ 重要:**
- Claude Desktopのタイムアウトは4分
- MCPサーバーは3分タイムアウトに設定済み
- `--max-failures=5`で早期終了
- テストファイル別実行も可能（下記参照）

---

### 2. 特定のテストファイルを実行

```
Run MUED specific E2E test: mued-improved.spec.ts
```

または

```
MUEDのmued-improved.spec.tsのテストを実行して
```

または

```
Use mued_playwright_e2e to run specific test: mued-improved.spec.ts
```

**実行内容:**
- 指定したテストファイルのみ実行
- 詳細ログとエラースクリーンショット収集

**利用可能なテストファイル:**
- `mued-improved.spec.ts` - 改善版E2Eテストスイート（15テスト）
- `mued-complete.spec.ts` - 完全版E2Eテストスイート
- `basic-flow.test.ts` - 基本フローテスト
- `api-endpoints.spec.ts` - APIエンドポイントE2Eテスト
- `subscription.spec.ts` - サブスクリプションE2Eテスト

---

### 3. テストスイート別に実行

```
Run MUED E2E suite: auth
```

または

```
Use mued_playwright_e2e to run suite: auth
```

**利用可能なスイート:**
- `auth` - 認証関連テスト
- `booking` - 予約システムテスト
- `materials` - 教材管理テスト
- `dashboard` - ダッシュボードテスト
- `all` - 全テスト

**例:**
```
MUEDの予約システムのE2Eテストを実行して
```

---

### 4. E2Eレポート生成

```
Generate MUED E2E test report
```

または

```
Use mued_playwright_e2e to generate E2E report
```

**実行内容:**
- 最新のテスト結果からカバレッジレポート生成
- テスト実行履歴の集計

---

## 🧪 単体テスト実行コマンド（mued_unit_test）

### ⚠️ プロジェクト名を指定してください

### 1. 全単体テストを実行

```
Run MUED unit tests with coverage
```

または

```
MUEDの単体テストをカバレッジ付きで実行して
```

または

```
Use mued_unit_test to run all tests with coverage
```

**実行内容:**
- Vitestによる全単体テスト実行
- カバレッジレポート生成（HTML + JSON）
- `/tests/reports/unit-[timestamp].md` にMarkdownレポート保存
- カバレッジ閾値チェック（70%未満で警告）

**所要時間:** 約30秒〜1分

---

### 2. 特定のテストファイルを実行

```
Run MUED unit test file: hooks/use-lessons.test.ts
```

または

```
Use mued_unit_test to run file: hooks/use-lessons.test.ts
```

**実行内容:**
- 指定したテストファイルのみ実行
- 詳細な失敗ログ出力

---

### 3. カバレッジレポートのみ生成

```
Generate MUED coverage report
```

または

```
Use mued_unit_test to generate coverage report
```

**実行内容:**
- HTMLカバレッジレポート生成
- `/coverage/index.html` に保存
- サマリーをMarkdown形式で表示

---

## 🏥 ヘルスチェック・APIテストコマンド（mued_test）

### ⚠️ プロジェクト名を指定してください

### 1. サーバーヘルスチェック

```
Test MUED server health
```

または

```
MUEDサーバーの状態を確認して
```

または

```
Use mued_test to check server health
```

**実行内容:**
- `http://localhost:3000` の稼働確認
- ステータスコード確認

---

### 2. 特定のAPIエンドポイントをテスト

```
Test MUED API endpoint: /api/lessons
```

または

```
Use mued_test to test endpoint: /api/lessons
```

**実行内容:**
- 指定したAPIエンドポイントへのリクエスト
- レスポンスステータス、データ構造の確認

**テスト可能なエンドポイント:**
- `/api/health` - ヘルスチェック
- `/api/lessons` - レッスン一覧
- `/api/reservations` - 予約一覧
- `/api/materials` - 教材一覧
- `/api/subscription/limits` - サブスクリプション制限

---

### 3. 予約フローのテスト

```
Test booking flow
```

**実行内容:**
- 利用可能スロット取得
- 予約実行（テストモード）
- フロー全体の動作確認

---

### 4. 完全なテストスイート実行

```
Run complete test suite
```

**実行内容:**
- 全APIエンドポイントのテスト
- データベース接続確認
- 認証フローテスト

---

## 📸 スクリーンショット収集コマンド（mued_screenshot）

### ⚠️ プロジェクト名を指定してください

### 1. 全ページのスクリーンショット撮影

```
Capture MUED screenshots for Figma
```

または

```
MUEDのFigma用のスクリーンショットを撮影して
```

または

```
Use mued_screenshot to capture screenshots for Figma
```

**実行内容:**
- 全8ページのスクリーンショット撮影
- Viewport版（1440x900 @2x）とFullpage版の両方を生成
- `/screenshots/[timestamp]/` に保存
- HTMLビューアー自動生成（`index.html`）

**撮影対象ページ:**
1. `/` - ランディングページ
2. `/dashboard` - ダッシュボード
3. `/dashboard/lessons` - レッスン一覧
4. `/dashboard/materials` - 教材一覧
5. `/dashboard/materials/new` - 教材作成
6. `/dashboard/reservations` - 予約一覧
7. `/dashboard/subscription` - サブスクリプション
8. `/dashboard/booking-calendar` - 予約カレンダー

**所要時間:** 約1-2分

**出力フォーマット:**
- PNG画像（高解像度）
- HTMLビューアー
- Markdownサマリー

---

## 💡 実用的な使用例

### シナリオ1: 新機能実装後の完全テスト

```
1. Run MUED unit tests with coverage
   → 単体テストで基本動作確認

2. Run all MUED E2E tests
   → E2Eテストで統合動作確認

3. Generate MUED coverage report
   → カバレッジレポート確認（70%以上を目標）

4. Capture MUED screenshots for Figma
   → UI変更をFigmaに反映
```

---

### シナリオ2: バグ修正後の検証

```
1. Test MUED server health
   → サーバーが正常起動しているか確認

2. Run specific E2E test: [修正箇所のテストファイル]
   → 修正箇所の動作確認

3. Run E2E suite: [関連スイート]
   → 関連機能への影響確認
```

---

### シナリオ3: デプロイ前の最終確認

```
1. Run complete test suite
   → 全APIの動作確認

2. Run all E2E tests
   → 全ユーザーフローの動作確認

3. Generate E2E report
   → テスト結果の確認

4. Capture screenshots for Figma
   → 最新UIのドキュメント化
```

---

### シナリオ4: デイリーテスト（開発中）

```
1. Test MUED server health
   → 開発サーバーの起動確認

2. Run unit test file: [作業中のファイル]
   → 作業中の機能のテスト

3. Test API endpoint: [使用中のエンドポイント]
   → APIの動作確認
```

---

## 📊 レポートの確認方法

### E2Eテストレポート

**場所:** `/tests/reports/e2e-[timestamp].md`

**内容:**
- 実行サマリー（成功/失敗数、所要時間）
- テスト結果詳細
- 失敗したテストのスクリーンショット
- エラーログ

### 単体テストレポート

**場所:** `/tests/reports/unit-[timestamp].md`

**内容:**
- テスト実行サマリー
- カバレッジメトリクス
- 失敗したテストの詳細
- カバレッジ不足箇所の警告

### カバレッジレポート

**場所:** `/coverage/index.html`

**確認方法:**
```bash
open coverage/index.html
```

**内容:**
- 行カバレッジ
- ブランチカバレッジ
- 関数カバレッジ
- ファイル別カバレッジ

### スクリーンショットビューアー

**場所:** `/screenshots/[timestamp]/index.html`

**確認方法:**
```bash
open screenshots/[timestamp]/index.html
```

**内容:**
- 全ページのViewport版スクリーンショット
- 全ページのFullpage版スクリーンショット
- Figmaへのインポート手順

---

## 🔍 トラブルシューティング

### E2Eテストが失敗する

**原因:**
- 開発サーバーが起動していない
- データベースにテストデータがない
- 認証トークンの期限切れ

**解決策:**
```
1. Test MUED server health
   → サーバー状態確認

2. npm run dev を実行（ターミナル）
   → 開発サーバー起動

3. Run E2E suite: auth
   → 認証テストから段階的に実行
```

---

### 単体テストのカバレッジが低い

**原因:**
- テストファイルが不足
- 未テストの関数やコンポーネントが多い

**確認方法:**
```
Generate coverage report
→ カバレッジレポートで未カバー箇所を確認
```

**対応:**
- `/docs/test-environment-report.md` を参照
- 優先度の高いテストから実装

---

### スクリーンショットが認証エラーでスキップされる

**原因:**
- 認証が必要なページでログイン状態が保持されていない

**現在の仕様:**
- 認証が必要なページはスキップされる仕様
- ランディングページ（`/`）のみ撮影可能

**今後の改善:**
- Clerk認証トークンの事前取得機能を追加予定

---

### MCPサーバーが応答しない

**確認方法:**
```bash
# ログファイル確認
tail -f ~/Library/Logs/Claude/mcp-server-mued_*.log
```

**対応:**
1. Claude Desktopを再起動
2. ログでエラー確認
3. 該当MCPサーバーファイルの実行権限確認

---

## 📚 関連ドキュメント

- **MCP実装ルール:** `/CLAUDE.md`
- **MCPテストインフラガイド:** `/docs/mcp-test-infrastructure.md`
- **テスト環境レポート:** `/docs/test-environment-report.md`
- **MCPクリーンアップ提案:** `/docs/mcp-cleanup-proposal.md`

---

## 🎯 ベストプラクティス

### 1. 開発フロー

```
コード修正
  ↓
単体テスト実行（該当ファイル）
  ↓
E2Eテスト実行（関連スイート）
  ↓
カバレッジ確認
  ↓
コミット
```

### 2. デプロイ前

```
完全なテストスイート実行
  ↓
全E2Eテスト実行
  ↓
カバレッジ70%以上確認
  ↓
スクリーンショット更新
  ↓
デプロイ
```

### 3. 定期実行（毎朝推奨）

```
サーバーヘルスチェック
  ↓
完全なテストスイート実行
  ↓
レポート確認
```

---

## 📝 コマンド早見表

| やりたいこと | コマンド |
|------------|---------|
| 全テスト実行 | `Run all MUED E2E tests` + `Run MUED unit tests with coverage` |
| 特定機能のテスト | `Run MUED E2E suite: [suite]` + `Run MUED unit test file: [file]` |
| サーバー確認 | `Test MUED server health` |
| API確認 | `Test MUED API endpoint: /api/[endpoint]` |
| スクショ撮影 | `Capture MUED screenshots for Figma` |
| カバレッジ確認 | `Generate MUED coverage report` |
| レポート生成 | `Generate MUED E2E report` |

---

**最終更新:** 2025-10-03
**バージョン:** 1.0
**メンテナー:** MUED LMS v2 Development Team
