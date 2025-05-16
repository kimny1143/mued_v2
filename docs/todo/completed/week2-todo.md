# チーム別 TODO リスト（MVP ‑ Phase 0 / Week2）

> 各タスクの進捗状況:  
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手  
> 期限は「週番号＝ロードマップ表上の週」を示す（例: 週3＝開始3週目末）。

---

## 🧑‍💻 山田（PM / FE）

- [✅] **Week2 チケット起票 & GitHub Projects 整理**  
  - Week2 スプリントタスクを Projects Board に反映  
  - 期限: **週2**
- [✅] **ADR-0002 作成**  
  - API バージョニング / エラーフォーマット決定  
  - 期限: **週2**
- [✅] **Netlify Preview 環境構築**  
  - デモ環境を公開設定  
  - 期限: **週2**

### 作成ファイル一覧
- `docs/architecture/ADR-0002.md` - APIバージョニングとエラーフォーマット標準化の設計決定記録
- `netlify.toml` - Netlifyデプロイ設定とリダイレクト定義
- `docs/project/project-config.md` - GitHub Projects設定と週間スプリント定義
- `.github/ISSUE_TEMPLATE/task.md` - GitHub用タスクIssueテンプレート
- `.github/ISSUE_TEMPLATE/bug_report.md` - GitHub用バグレポートテンプレート
- `README.md` (更新) - Netlifyプレビュー環境に関するセクションを追加

---

## 🧑‍💻 佐藤（FE）

- [✅] **Realtime Chat β UI / Supabase Channel Hook 実装**  
  - `src/lib/apiClient` 経由で GET/POST `/chat/messages`  
  - 期限: **週2**
- [✅] **ワンタップ練習記録 UI PWA 対応**  
  - React Hook Form + Zod で `POST /exercise/logs`  
  - エクササイズストップ時に自動モーダル表示
  - 練習時間の自動計測と記録
  - 気分やメモを追加できるUI実装
  - 期限: **週2**
- [✅] **Storybook 基盤立ち上げ**  
  - Tailwind プリセット & UI コンポーネント登録  
  - 期限: **週2**

---

## 🧑‍💻 田中（FE / 決済）

- [✅] **Stripe Checkout 本番 API キー切替**  
  - `lib/stripe.ts` の環境変数切り替え  
  - 期限: **週2**
- [✅] **FastAPI Webhook Stub 実装**  
  - AI / 支払いサービスに Webhook モックエンドポイント追加  
  - 期限: **週2**

### 実装内容の概要
- **Stripe Checkout 環境変数切替**:
  - 環境変数に基づいてエンドポイントを選択するロジック追加
  - 本番環境(`PROD`)では`SUPABASE_URL_PROD`を使用し、開発環境では`SUPABASE_URL`を使用
- **FastAPI Webhook実装**:
  - 汎用Webhookエンドポイント実装(`/api/v1/webhooks/general`)
  - Stripe専用Webhookエンドポイント実装(`/api/v1/webhooks/stripe`)
  - Webhook用のモデル追加(`WebhookEvent`、`StripeWebhookEvent`)
  - チャットメッセージAPI実装(`GET/POST /api/v1/chat/messages`)

---

## 🧑‍💻 木村（AI サービス）

- [✅] **GET/POST `/chat/messages` Stub 実装**  
  - FastAPI で CRUD エンドポイント定義  
  - 期限: **週2**
- [✅] **POST `/exercise/logs` Stub 実装**  
  - FastAPI でログ保存 Stub  
  - 期限: **週2**
- [✅] **MusicXML ライブラリ調査 & PoC**  
  - 譜面変換機能の実装と検証  
  - 期限: **週2**
- [✅] **OpenAPI スキーマ更新**  
  - Stub 追加分を `fastapi.openapi.json` に反映  
  - 期限: **週2**

### 実装内容の概要
- **GET/POST `/chat/messages` Stub実装**:
  - `ChatMessageCreate`、`ChatMessage`、`ChatMessageList`モデルを定義
  - GET/POSTエンドポイントにモックデータを返す実装を追加
  - エンドポイントのテストケースを作成
- **POST `/exercise/logs` Stub実装**:
  - `ExerciseLogCreate`、`ExerciseLog`モデルを定義
  - POSTエンドポイントにログ保存の基本実装を追加
  - テストケースによる検証を実施
- **MusicXML ライブラリ調査 & PoC**:
  - `MusicXMLConvertRequest`、`MusicXMLConvertResponse`モデルを定義
  - `/musicxml/convert`エンドポイントを実装
  - 必要なライブラリ（music21, lxml, Pillow）を依存関係に追加
  - JSONフォーマットとプレビュー画像生成機能の基盤構築
- **OpenAPI スキーマ更新**:
  - 全APIエンドポイントを含むOpenAPIスキーマを生成
  - `ai-service/openapi/openapi.json`として保存
- **追加の成果物**:
  - テスト環境の改善（Docker上でのテスト実行を簡素化）
  - テスト実行用スクリプト（`run_tests.sh`、`run_docker_tests.sh`）の追加
  - マルチステージDockerfile（開発/テスト/本番）の実装
  - Docker環境でのPYTHONPATH設定の最適化
  - エラーハンドリングテスト（200/400/500ケース）の修正と強化

---

## 🧑‍💻 鈴木（DevOps / Test）

- [✅] **@vitest/coverage-v8 パッケージ追加（緊急）**  
  - CI の test:coverage で必要なパッケージ追加  
  - 期限: **週2**
- [✅] **Codecov / Artifacts によるカバレッジ可視化**  
  - GitHub Actions でレポートアップロード設定  
  - 期限: **週2**
- [✅] **pytest による FastAPI エラーハンドリングテスト追加**  
  - 200/400/500 ケースを `tests/test_api.py` に記載  
  - 期限: **週2**
- [✅] **KPI ダッシュボード初版作成**  
  - Supabase → Metabase/Redash 接続
  - 期限: **週2**
  - **[追記] 前提条件:** 関連テーブルスキーマ定義・作成、およびデータ投入用API実装の完了待ち。現状 Metabase 接続は完了済み。

### 実装内容の概要
- **@vitest/coverage-v8 パッケージ追加**:
  - package.jsonにテストカバレッジ用パッケージを追加
  - `npm run test:coverage`コマンドが正常に動作するよう設定
- **Codecov/Artifactsによるカバレッジ可視化**:
  - `.github/workflows/codecov.yml`を作成
  - フロントエンドとAIサービスのカバレッジを別々に計測
  - GitHubActionsでテスト実行とCodecovへのレポートアップロード設定
- **FastAPIエラーハンドリングテスト追加**:
  - エラーハンドラーの実装(`error_handlers.py`)
  - 200/400/500ケースのテスト実装
  - エラーカバレッジ89%達成
- **KPI ダッシュボード初版作成**:
  - Metabase導入用docker-compose.yml設定の追加
  - 詳細なセットアップドキュメント作成(`docs/project/kpi-dashboard.md`)
  - KPI指標定義とSQLクエリ集の整備
  - MetabaseとRedashの比較分析ドキュメント(`docs/project/bi-tool-comparison.md`)
  - 環境構築自動化スクリプト(`scripts/setup_metabase.sh`)の実装
  - Metabase実行ガイド(`docs/project/how-to-run-metabase.md`)の作成

---

## ✅ 共通

- [ ] **Next Daily**: 明日 10:00 JST  
  - 完了チェック: 各担当 Week2 状況 