# MUED LMS Sprint 1完了報告とSprint 2への課題・計画

## 1. Sprint 1「決済 & 予約フロー MVP」の達成状況

Sprint 1では、ユーザーが支払いを行いレッスンの予約を確定できる、MVP（Minimum Viable Product）レベルのコア体験を提供することを目標としました。

### 1.1 完了したストーリーと主要成果物

- **Story S1-1: Stripe Checkout / Webhook 実装 (✅ 完了)**
    - Stripe Checkoutセッション作成API (`app/api/checkout/route.ts`) を実装し、ユーザーをStripe決済ページへリダイレクト可能になりました。
    - Stripe Webhookエンドポイント (`app/api/webhooks/stripe/route.ts`) をSupabase Edge Functionとして作成し、決済完了通知を処理してDB (`Subscription`テーブル等) を更新するロジックを実装しました。
    - Webhookの署名検証、単体テスト (`app/api/webhooks/stripe/__tests__/route.test.ts`) も完了しています。

- **Story S1-2: `LessonSlot`,`Reservation` API実装 (✅ 完了)**
    - Prismaスキーマに `LessonSlot` および `Reservation` モデルを定義・調整しました。
    - レッスン枠と予約に関するCRUD API (`app/api/lesson-slots/...`, `app/api/reservations/...`) を実装しました。
    - Zodによる入力値バリデーション、Supabase RLSポリシー (`supabase/migrations/20250501000000_rls_policy.sql` 等) による認可、重複予約防止ロジックを組み込みました。
    - APIの単体テストカバレッジは90%以上を達成しています。

- **Story S1-3: 予約UI実装 (✅ 完了)**
    - 予約ページ (`app/reservations/page.tsx`) および関連コンポーネント (`app/components/reservation/page.tsx` 等) を作成しました。
    - 利用可能なレッスン枠をテーブル形式で表示し、モーダル経由で予約を実行できるUIを実装しました。
    - React Queryを用いたAPI連携と状態管理、Toastコンポーネント (`app/components/ui/toast.tsx`) によるフィードバックUIを実装し、LCPも2.5秒未満を達成しています。

### 1.2 一部未完了・継続中のタスク

- **Story S1-4: E2Eテスト実装 (⚠️ 進行中)**
    - PlaywrightによるE2Eテストの基本設定と認証フロー (`tests/e2e/auth.spec.ts`) は実装済みです。
    - **課題:** `auth → checkout → reserve` の完全なE2Eテストシナリオは未完成です。特にStripe Checkoutを経由する部分と予約確定までのフローのテストカバレッジ向上が必要です。

## 2. Sprint 1完了時点でのシステム全体の状況

- **Sprint Re:0の成果:** Next.js App Routerへの移行、**Supabase AuthとGoogle OAuthプロバイダーによる認証基盤への集約（NextAuth.jsからの移行含む）**、PrismaによるDB連携、基本的なCI/CDワークフローは安定稼働しています。
- **フロントエンド:** `app/` ディレクトリ構造に基づき、主要ページ、UIコンポーネント (`app/components/ui/`)、レイアウト (`app/layout.tsx`, `app/dashboard/layout.tsx`) が整備されています。
- **バックエンドAPI:** 認証、決済、予約関連の主要API群が `app/api/` 配下に実装済みです。
- **外部連携:** Stripe、**Supabase (Auth - Google認証含む, DB, Edge Functions)** との連携はコア部分で機能しています。

## 3. Sprint 2「Google Calendar & メール通知」への課題と計画

Sprint 1の成果を踏まえ、Sprint 2ではユーザビリティとエンゲージメント向上に不可欠なカレンダー同期と通知機能の実装に注力します。

### 3.1 Sprint 2 主要ストーリーの現状と課題

- **Story S2-1: Google OAuth & 差分同期サービス (✅ 完了)**
    - Google OAuth認証（Supabase経由）、Calendar APIクライアント (`lib/googleCalendar.ts`)、双方向差分同期ロジック、APIエンドポイント (`app/api/calendar/sync/route.ts`) は実装済みです。

- **Story S2-2: 予約確定メール (Supabase Trigger + Resend) (⚠️ 部分的に実装済み)**
    - `lib/resend.ts` によるメール送信機能、HTMLメールテンプレート、DBトリガー (`supabase/migrations/20250616000001_reservation_email_trigger.sql`)、メール送信Edge Function (`supabase/functions/process-email-queue/index.ts` と `supabase/functions/reservation-email/index.ts`) は実装済みです。
    - **課題:** 本番環境での統合テスト、エラーハンドリングと再試行ロジックの堅牢性向上、送信ログの監視体制構築が必要です。

- **Story S2-3: ダッシュボード予約ステータス更新 (⚠️ 部分的に実装済み)**
    - ダッシュボードの基本UI (`app/dashboard/page.tsx`) は実装済みです。
    - **課題:** Supabase Realtimeを用いた予約ステータスのリアルタイム更新機能は未実装です。クライアント側の状態管理とキャッシュ戦略も考慮が必要です。

- **Story S2-4: DevOps: モニタリング & Alerting (❌ 未実装)**
    - **課題:** Logflare/Grafana等を用いたログ収集・可視化、アラート通知システムの構築は未着手です。

### 3.2 Sprint 2 優先対応タスクと実装アプローチ

1.  **E2Eテストの完成と自動化 (Story S1-4 の残タスク)**
    *   **優先度:** 高
    *   **内容:** `auth → checkout → reserve` フローのPlaywrightテストケースを完成させ、Stripeテスト環境と連携します。
    *   **アプローチ:** CI (GitHub Actions) での安定実行を目指し、必要に応じてSeedデータ生成スクリプト (`scripts/seed-test-db.ts`) を調整します。

2.  **メール通知システムの完成と安定化 (Story S2-2)**
    *   **優先度:** 高
    *   **内容:** 実装済みのトリガー、キュー、Edge Functionの統合テストを徹底します。特に `process-email-queue` 関数の信頼性を高めます。
    *   **アプローチ:** メール送信失敗時のリトライ処理、エラーログの詳細化、開発者への通知（限定的でも）を実装します。メールテンプレートのレスポンシブ対応も確認します。

3.  **リアルタイムダッシュボード更新 (Story S2-3)**
    *   **優先度:** 中
    *   **内容:** `reservations` テーブルへのSupabase Realtimeサブスクリプションをダッシュボードコンポーネントに実装します。
    *   **アプローチ:** 状態変更がUIに2秒以内に反映されることを目標とし、コンポーネントの再レンダリング最適化も考慮します。オフライン時や再接続時の挙動も検討します。

4.  **モニタリングシステムの初期構築 (Story S2-4)**
    *   **優先度:** 中
    *   **内容:** Logflareへのログ集約設定と、Grafanaでの基本的なAPIエラーレート・レスポンスタイムの可視化を目指します。
    *   **アプローチ:** Next.jsアプリとSupabase Edge Functions両方のログを対象とします。クリティカルエラーのSlack通知のPoCを行います。

## 4. Sprint 3以降への展望

Sprint 2完了後、Sprint 3では以下の機能開発を計画しています。

- **教材AI機能 (Story S3-1, S3-2):** Python/FastAPIで構築されたAIサービスとの連携を開始し、PDF教材からのMarkdown自動生成機能のv1を実装します。フロントエンドにはアップロードUIとMarkdownビューアを実装します。
- **KPI計測基盤 (Story S3-3):** 事業判断に必要な財務KPI（MRR等）をStripe APIから取得し、BIツールで可視化するPoCを行います。

これらの実装を通じて、MUED LMSのコアバリューを高め、ユーザーにとってより魅力的なサービスへと進化させていきます。
