# MUED LMS - App Router移行後の再計画 TODOリスト（更新版）

## 経緯と目的
このドキュメントは、プロジェクトオーナーの判断による Vite から Next.js App Router への技術スタック移行に伴い、再計画されたスプリントの TODO リストです。  
議事録 `docs/dailyconf/20250507daly-2.md` に基づき、各スプリントの目標、タスク、担当、完了定義（DoD）を明確にし、プロジェクト全体の進捗管理と情報共有を円滑にすることを目的とします。  
今後の実装作業は、原則としてこのTODOリストを参照して進めてください。

## 全体スプリント目標
App Router への移行を完了させ (Sprint Re:0)、その後3スプリント (Sprint 1-3) をかけて国内向けMVP（Minimum Viable Product）の主要機能を完成させる。

---

## Sprint Re:0（現週〜2週目）‐「移行と最小動作確認」
**目標:** Viteベースの既存資産をNext.js App Routerへ移行し、基本的な認証、DB接続、CI/CDワークフローが正常に動作することを確認する。このスプリントは新体制での開発基盤を確立する最重要フェーズです。

### Story R0-1: Vite → Next.js App Router ルーティング変換完了
- **担当:** FEチーム
- **状態:** ✅ 完了
- **概要:** 既存のページコンポーネントをApp Routerの規約 (`app/page.tsx`, `app/layout.tsx`等) に合わせて再配置し、基本的なページ遷移が機能することを確認する。ESLint等の静的解析ツールもパスすること。
- **DoD:** 全主要ページがApp Router経由で表示・遷移可能であること。ESLint/Prettierエラーがないこと。
- **タスク:**
    - [x] FEチーム: `app/` ディレクトリ構造の設計と作成（`layout.tsx`, `page.tsx`, ルートグループ `(auth)` 等）。
    - [x] FEチーム: 既存のViteベースのページコンポーネントを `app/` 配下の適切なルーティングパスに移行・リファクタリング。
    - [x] FEチーム: `next/link` または `next/navigation` を用いたナビゲーションの実装とテスト。
    - [x] FEチーム: ESLint, Prettier のNext.js App Router対応設定と、全ファイルへの適用。

### Story R0-2: 環境変数・Auth（NextAuth.js）再設定
- **担当:** FE & BEチーム
- **状態:** ✅ 完了
- **概要:** Next.js App Router環境で環境変数が正しく読み込まれ、NextAuth.jsによる認証フロー（ログイン、ログアウト、セッション管理、保護ルート）が正常に機能することを確認する。
- **DoD:** 環境変数が正しく読み込まれること。ユーザーがログインでき、保護されたページへのアクセス制御が機能すること。
- **タスク:**
    - [x] FE & BE: `.env.local` 等の環境変数ファイルをApp Routerプロジェクトのルートに配置し、`process.env` または `NEXT_PUBLIC_` 経由での読み込みを確認。
    - [x] FE & BE: NextAuth.js の設定ファイル (`app/api/auth/[...nextauth]/route.ts` 等) をApp RouterのAPI Routes規約に沿って作成・移行。
    - [x] FE & BE: 認証プロバイダー（例: Google Provider）の設定とコールバックURLの更新。
    - [x] FE & BE: ログイン、ログアウト機能の実装とテスト。
    - [x] FE & BE: Middleware (`middleware.ts`) またはRoute Handlersを用いた保護ルートへのアクセス制御テスト。

### Story R0-3: Prisma Client & Edge Functions 動作検証
- **担当:** BEチーム
- **状態:** ✅ 完了
- **概要:** Prisma ClientがNext.js環境で正しくDBに接続し、基本的なCRUD操作が行えることを確認する。また、Supabase Edge Functionsがデプロイ可能で、簡単なAPI呼び出しに応答することを確認する。
- **DoD:** Prisma Client経由でのDB読み書きが成功すること。Supabase Edge Functionがテスト呼び出しに対して200系レスポンスを返すこと。
- **タスク:**
    - [x] BE: `lib/prisma.ts` にPrisma Clientのインスタンス化とエクスポート処理を実装。
    - [x] BE: `prisma/schema.prisma` の内容を確認し、必要であればApp Router環境に合わせた調整。
    - [x] BE: 簡単なAPI Route (`app/api/test-db/route.ts`等) を作成し、Prisma Clientを用いたDB読み書きテストを実施。
    - [x] BE: Supabase CLIを用いて、サンプルEdge Functionをデプロイし、cURL等で動作確認。

### Story R0-4: Vercel + Supabase + Heroku ワークフロー再構築
- **担当:** DevOpsチーム (FE, BE, QAチームと密連携)
- **状態:** ✅ 大部分完了
- **概要:** フロントエンド (Vercel)、データベース/バックエンド (Supabase)、AIサービス (Heroku/Fly.io) の各環境間の連携における問題を解決し、CI/CDパイプラインを再構築する。特に、環境変数管理の統一、Stripe決済連携の安定化、Supabaseの権限問題の解消、動的なプレビューURLへの対応、E2EテストのCI統合を目指す。
- **DoD:** GitHub等へのPushをトリガーに、Vercelでプレビューデプロイが自動実行され、プレビューURLが発行されること。CIパイプラインが全テスト (ユニットテスト、結合テスト、PlaywrightによるE2Eテスト含む) でGREENとなり、主要な連携 (認証、Stripe Checkoutテスト、Supabase DBアクセス、AIサービス連携) がプレビュー環境で正常に動作すること。特に`auth → checkout → reserve`のE2EテストシナリオがCI上で安定して成功すること。
- **タスク:**
    - [x] DevOps: Vercelプロジェクトの設定をNext.js App Router向けに更新。
    - [x] DevOps: 環境変数管理の統合と検証:
        - [x] 共通の`.env.*.template`テンプレートを基に、`scripts/gen-env.ts`を使用して各ホスティングサービス向けの環境変数を生成する仕組みを実装
        - [x] GitHub ActionsのCIジョブに環境変数をチェックするステップ (ENV-lint) を追加
        - [ ] 各サービス間で必要な環境変数が正しく設定・同期されていることをCIで検証（Stripe関連の同期はさらなる調整が必要）
    - [x] DevOps: CI/CDパイプラインの再構築とテスト自動化:
        - [x] GitHub Actionsで、Next.jsアプリケーションのビルド、静的解析、ユーティリリテストを実行
        - [x] PlaywrightによるE2Eテスト基盤を構築し、`auth → checkout → reserve` フローのテストケースを実装
        - [x] E2Eテスト用のSeedデータ生成スクリプト (`scripts/seed-test-db.ts`) の実装
        - [x] Stripe CLIをサービスコンテナとして利用する設定を追加
    - [x] DevOps: AIサービスのデプロイフローと連携確認:
        - [x] AIサービスとの連携確認を行うビルド前処理の実装 (`scripts/vercel-deploy-prep.sh`)
        - [x] フロントエンドからAIサービスへの接続テストの組み込み

---

## Sprint 1（3〜4週目）‐「決済 & 予約フロー MVP」
**目標:** Stripeを用いたサブスクリプション決済フローと、コア機能であるレッスン予約システムの基本的なCRUD操作を実装する。ユーザーが支払いを行い、予約を確定できるMVPレベルの体験を提供する。

### Story S1-1: Stripe Checkout / Webhook （EdgeFunction）実装
- **担当:** BEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** Stripe Checkoutセッションを作成しユーザーをStripe決済ページへリダイレクトするAPIと、決済完了通知を受け取るStripe Webhook (Supabase Edge Function) を実装する。
- **DoD:** ユーザーがStripeで支払いを完了すると、その情報がWebhook経由でシステムに通知され、DBの `Subscription` テーブル等が更新されること。Webhookは署名検証を行い、200レスポンスを返すこと。
- **タスク:**
    - [x] BE: Stripe Checkout Session作成API (`app/api/checkout/route.ts` 等) の実装。商品IDやプランIDをリクエストに応じて動的に設定できるようにする。
    - [x] BE: Supabase Edge Function (`app/api/webhooks/stripe/` 等) でStripe Webhookエンドポイントを作成。
    - [x] BE: Webhook内でStripeからのリクエスト署名を検証するロジックを実装。
    - [x] BE: Webhookで `checkout.session.completed` 等のイベントを処理し、支払い情報を元にPrisma Clientを使ってDB (`User`, `Subscription` テーブル等) を更新するロジックを実装。
    - [ ] BE: Webhook処理に関する単体テストおよびローカルでのStripe CLIを用いたテストを実施。（CIでのE2EテストはStory R0-4, S1-4でカバー）
    - [ ] BE: `SUPABASE_SERVICE_ROLE_KEY` を利用するなど、Supabase Edge Functionの権限が適切に設定されていることを確認。

### Story S1-2: `LessonSlot`,`Reservation` API (RLS & バリデーション)
- **担当:** BEチーム
- **状態:** ✅ 完了
- **概要:** メンターがレッスン提供可能な時間枠 (`LessonSlot`) と、ユーザーがその枠を予約する `Reservation` のためのCRUD APIを実装する。入力値バリデーションとSupabase RLSによる適切な権限管理、重複予約防止ロジックも含む。
- **DoD:** API経由で `LessonSlot` と `Reservation` のCRUD操作が正しく行えること。不正な入力や権限のない操作は適切に弾かれること。重複予約が防止されること。APIの単体テストカバレッジが90%以上であること。
- **タスク:**
    - [x] BE: `prisma/schema.prisma` に `LessonSlot` と `Reservation` モデルを定義（既存の場合は確認・調整）。
    - [x] BE: `LessonSlot` 用のCRUD APIエンドポイント群 (`app/api/lesson-slots/...`) を実装。
    - [x] BE: `Reservation` 用のCRUD APIエンドポイント群 (`app/api/reservations/...`) を実装。
    - [x] BE: APIリクエストボディの入力値バリデーションをZod等を用いて実装。
    - [x] BE: Supabaseコンソールまたはマイグレーションファイルで `LessonSlot` と `Reservation` テーブルに対するRLSポリシーを設定（例: メンターは自身のスロットのみ作成・更新可能、ユーザーは自身の予約のみ作成・閲覧可能）。（`20240512_rls_fix.sql` 等のマイグレーション適用をCIで確認 - Story R0-4と連携）
    - [x] BE: 予約作成時に、指定されたスロットが既に予約されていないか確認する重複予約防止ロジックを実装。
    - [ ] BE: 各APIエンドポイントに対する単体テスト (Vitest/Jest等) を作成し、カバレッジ90%以上を達成。

### Story S1-3: 予約UI（Table+Modal, Mobile Ready）
- **担当:** FEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** ユーザーが利用可能なレッスン枠を一覧で確認し、モーダルウィンドウ経由で予約を実行できるUIを実装する。スマートフォン表示にも最適化し、LCP 2.5秒以内を目指す。
- **DoD:** レッスン枠がテーブル形式で表示され、選択すると予約モーダルが開くこと。モーダル内で予約が実行でき、結果がユーザーにフィードバックされること。UIはレスポンシブ対応であり、主要画面のLCPが2.5秒未満であること。
- **タスク:**
    - [ ] FE: `app/reservations/page.tsx` 等の予約ページを作成。
    - [ ] FE: 利用可能な `LessonSlot` を一覧表示するテーブルコンポーネント (`app/components/reservations/SlotTable.tsx` 等) を作成。APIから取得したデータを表示。
    - [ ] FE: スロット選択時に表示される予約確認・実行用モーダルコンポーネント (`app/components/reservations/ReservationModal.tsx` 等) を作成。
    - [ ] FE: TailwindCSSを用いて、テーブルおよびモーダルのレスポンシブデザインを実装。
    - [ ] FE: SWR, React Query, またはServer Actions等を用いてAPIとのデータ連携および状態管理を実装。
    - [ ] FE: Lighthouse等で主要な予約関連ページのLCPを測定し、2.5秒未満を達成するように最適化。
    - [ ] FE: 予約成功・失敗時のユーザーへのフィードバックUI（Toast通知等）を実装。
    - [ ] FE: Stripe CheckoutからのリダイレクトURLがVercelの動的プレビューURLに対応していることを確認 (Story R0-4と連携)。

### Story S1-4: QA: Playwright `auth→checkout→reserve` E2E
- **担当:** QAチーム
- **状態:** ⚠️ 状況確認中
- **概要:** ユーザー認証からStripeでの支払い、そしてレッスン予約確定までの一連のコアフローをPlaywrightで自動E2Eテストとして実装する。このE2EテストはStory R0-4で構築されるCI環境で実行されることを前提とする。
- **DoD:** Playwrightで作成した `auth → checkout → reserve` のE2EテストシナリオがCI環境 (Story R0-4で整備) で安定してGREEN（成功）となること。
- **タスク:**
    - [ ] QA: Playwrightのテスト環境をプロジェクトにセットアップ。 (ローカルでの実行環境)
    - [ ] QA: ユーザー登録・ログイン・ログアウトの認証フローに関するE2Eテストスクリプトを作成。
    - [ ] QA: 商品選択からStripe Checkoutページへのリダイレクト、テスト用カード情報での支払いシミュレーション、成功後のリダイレクト先確認までのE2Eテストスクリプトを作成 (Stripeのテストモードと連携)。
    - [ ] QA: 支払い成功後、予約ページに遷移し、レッスンを予約するフローのE2Eテストスクリプトを作成。
    - [ ] QA: 作成したE2EテストをGitHub Actions等のCI環境で実行できるように設定 (Story R0-4と連携し、Seedスクリプト実行やStripe CLIコンテナ利用を含む)。

---

## Sprint 2（5〜6週目）‐「Google Calendar & メール通知」
**目標:** レッスン予約とユーザーのGoogle Calendarを双方向で同期する機能、および予約確定時にユーザーへメール通知を送信する機能を実装する。ユーザビリティとエンゲージメントを向上させる。

### Story S2-1: Google OAuth & 差分同期サービス
- **担当:** BEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** NextAuth.jsを用いてGoogle OAuth認証を導入し、ユーザーの同意を得てGoogle Calendar APIにアクセス。レッスン予約情報をユーザーのGoogle Calendarに登録し、またカレンダー側の変更を検知してシステムに反映する双方向の差分同期サービスを実装する。
- **DoD:** ユーザーがGoogleアカウントで連携後、MUED LMSでの予約がGoogle Calendarに自動で追加・更新・削除されること。Google Calendar側での変更も一定間隔またはWebhookでMUED LMSに反映されること。同期成功率99%以上を目指す。
- **タスク:**
    - [ ] BE: NextAuth.jsにGoogle Providerを追加し、OAuth認証フローを実装。Calendar APIスコープの同意取得を含む。
    - [ ] BE: Google Calendar APIクライアントライブラリを導入し、`lib/googleCalendar.ts` 等にAPI操作関数群を実装（イベント作成、更新、削除、一覧取得等）。
    - [ ] BE: ユーザーの予約情報とGoogle Calendarのイベント情報を比較し、差分のみを同期するロジックを実装。
    - [ ] BE: 同期処理を実行するAPIエンドポイント (`app/api/calendar/sync/route.ts` 等) または定期実行ジョブ (Supabase Cron Jobs等) を作成。
    - [ ] BE: Google Calendar APIのエラーハンドリング、リトライ機構を実装し、堅牢な同期処理を実現。アクセストークン、リフレッシュトークンの管理も適切に行う。

### Story S2-2: 予約確定メール (Supabase Trigger + Resend)
- **担当:** BEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** ユーザーがレッスン予約を確定した際に、SupabaseのDBトリガーを利用して自動的にResend等のメール配信サービス経由で予約確定メールを送信する機能を実装する。
- **DoD:** 予約がDBに正常に登録された後、ユーザー指定のメールアドレスに予約詳細情報を含む確定メールが送信されること。メール送信の成功・失敗ログが記録されること。
- **タスク:**
    - [ ] BE: `reservations` テーブルへのINSERT操作をトリガーとして発火するSupabase Database Function (PL/pgSQL) または Supabase Edge Function を作成。
    - [ ] BE: Triggerから呼び出されるEdge Function内で、Resend APIクライアントを用いてメール送信処理を実装。
    - [ ] BE: 送信するメールのテンプレート（HTML形式推奨）を作成。予約日時、レッスン名、メンター名等の動的情報を含める。
    - [ ] BE: メールの送信成功・失敗のステータスをログテーブルまたは外部ロギングサービスに記録する処理を実装。

### Story S2-3: ダッシュボード予約ステータス更新
- **担当:** FEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** ユーザーダッシュボードに自身の予約一覧を表示し、Supabase Realtime機能を用いて予約ステータス（例: 確定、キャンセル済、完了等）がリアルタイムで更新されるようにする。
- **DoD:** ダッシュボード上でユーザーの予約一覧が正しく表示されること。予約ステータスに変更があった場合、ページリロードなしに2秒以内にUIに反映されること。
- **タスク:**
    - [ ] FE: ユーザーダッシュボード (`app/dashboard/page.tsx` 等) に予約一覧表示セクションを作成。
    - [ ] FE: Supabase Client (`lib/supabase.ts`) を用いて、`reservations` テーブルの変更をリアルタイムに購読する処理を実装。
    - [ ] FE: リアルタイムで受け取った変更を基に、ダッシュボードの予約一覧UIを動的に更新。
    - [ ] FE: リアルタイム更新のパフォーマンス（遅延2秒以内）を確認・最適化。

### Story S2-4: DevOps: モニタリング & Alerting (Grafana/Logflare)
- **担当:** DevOpsチーム
- **状態:** ⚠️ 状況確認中
- **概要:** アプリケーションの健全性を監視するため、Logflare等でログを収集し、Grafana等で主要メトリクスを可視化するダッシュボードを構築。クリティカルなエラー発生時にはアラート通知する仕組みを導入する。
- **DoD:** 主要APIのエラーレート、レスポンスタイム、システムリソース使用状況等がダッシュボードで確認できること。設定した閾値を超える異常が発生した場合、Slackやメール等で開発チームにアラートが通知されること。
- **タスク:**
    - [ ] DevOps: Next.jsアプリケーションおよびSupabase Edge FunctionsのログをLogflare等の集中ロギングサービスに送信する設定を行う。
    - [ ] DevOps: Grafanaをセットアップし、Logflare等のデータソースと連携。
    - [ ] DevOps: APIレスポンスタイム、エラーレート、DBクエリパフォーマンス、リソース使用率等の主要メトリクスを表示するダッシュボードパネルを作成。
    - [ ] DevOps: 特定のエラーパターンやパフォーマンス劣化を示すメトリクスの閾値を設定し、それを超えた場合にSlackやEmail等でアラートを送信する仕組みを構築 (Grafana Alerting等)。

---

## Sprint 3（7〜8週目）‐「教材AI & KPI 計測」
**目標:** AIサービスと連携し、教材の自動生成（PDF→Markdown）エンドポイントのv1を実装。フロントエンドで教材をアップロード・閲覧できるUIを提供する。また、事業判断に必要な財務KPIを自動集計するPoCを行う。

### Story S3-1: AI: FastAPI 教材生成エンドポイント v1
- **担当:** AIチーム
- **状態:** ⚠️ 状況確認中
- **概要:** Python/FastAPIで実装されたAIサービスに、ユーザーがアップロードしたPDFファイルを受け取り、Markdown形式に変換して返す教材生成APIエンドポイントのバージョン1を実装する。
- **DoD:** 指定されたAPIエンドポイントにPDFファイルをPOSTすると、変換されたMarkdownテキストがJSONレスポンスで返却されること。基本的なPDF構造（テキスト、見出しレベル程度）が維持されること。
- **タスク:**
    - [ ] AI: FastAPI (`ai-service/app/main.py` 等) にPDFファイルアップロードを受け付けるエンドポイント (`/materials/generate` 等) を作成。
    - [ ] AI: アップロードされたPDFファイルを処理し、テキストや構造を抽出するPythonライブラリ (PyMuPDF, pdfminer.six等) を選定・導入。
    - [ ] AI: 抽出した内容をMarkdown形式に変換するロジックを実装。
    - [ ] AI: 変換結果をJSON形式で返すようにAPIレスポンスを整形。
    - [ ] AI: APIエンドポイントの単体テスト (Pytest等) を作成し、基本的な動作確認。

### Story S3-2: FE: 教材ビューワ & マッチングUI
- **担当:** FEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** ユーザーが教材用PDFファイルをアップロードできるUIと、AIサービスによって生成されたMarkdown教材を閲覧できるビューワコンポーネントをフロントエンドに実装する。将来のメンターマッチング機能のためのUIプレースホルダーも検討する。
- **DoD:** ユーザーが教材PDFをアップロードし、生成されたMarkdownコンテンツをウェブページ上で閲覧できること。Markdownの基本的な書式（見出し、リスト、太字等）が正しく表示されること。
- **タスク:**
    - [ ] FE: 教材アップロード用のページ・フォーム (`app/materials/upload/page.tsx` 等) を作成。ファイル選択インプットとアップロードボタンを設置。
    - [ ] FE: アップロードされたファイルをAIサービスの教材生成エンドポイントに送信するAPI連携処理を実装。
    - [ ] FE: AIサービスから返却されたMarkdown文字列を表示するためのビューワコンポーネント (`app/components/materials/MaterialViewer.tsx` 等) を作成 (react-markdown等のライブラリ利用を検討)。
    - [ ] FE: 生成された教材の一覧表示ページや、個別の教材表示ページ (`app/materials/[materialId]/page.tsx` 等) のルーティングとUIを作成。
    - [ ] FE: (オプション) メンターマッチング機能のUIの初期ワイヤーフレームまたはデザイン案を作成。

### Story S3-3: PM: 財務メトリクス自動集計 PoC
- **担当:** PM, BEチーム
- **状態:** ⚠️ 状況確認中
- **概要:** Stripe API等から売上データを定期的に取得し、Metabase等のBIツールに連携して主要な財務KPI（MRR、Churn Rate等）をダッシュボードで可視化する技術検証（PoC）を行う。
- **DoD:** Stripeからのテストデータを用いて、MRR等の基本的なKPIがMetabase等のダッシュボードに表示されること。データ取得・連携の自動化（または半自動化）の目処が立つこと。
- **タスク:**
    - [ ] PM & BE: Stripe APIを利用してサブスクリプションデータ、支払い履歴等を取得する方法を調査・実装（スクリプトまたは小規模サービス）。
    - [ ] PM & BE: Metabaseまたは類似のBIツールをセットアップし、Stripeから取得したデータを連携させる方法を検証。
    - [ ] PM: 主要な財務KPI（MRR、アクティブユーザー数、顧客生涯価値LTV、解約率Churn Rate等）を定義し、それらを計算するためのデータ項目を特定。
    - [ ] PM & BE: Metabase等で、特定したKPIを表示する基本的なダッシュボードを作成するPoCを実施。

### Story S3-4: 全員: MVP Demo & 投資家向け報告資料
- **担当:** 全員
- **状態:** ⚠️ 未着手
- **概要:** Sprint 3までの成果物を統合したMVP（Minimum Viable Product）のデモンストレーションを準備・実施し、投資家やステークホルダー向けの進捗報告資料を作成する。
- **DoD:** 主要機能（認証、決済、予約、カレンダー同期、メール通知、教材生成v1）が連携して動作するMVPデモが成功裏に完了すること。投資家向けの報告資料が完成し、承認されること。
- **タスク:**
    - [ ] 全員: 各自が担当した機能について、デモシナリオに沿った動作確認とリハーサルを行う。
    - [ ] PM: MVPデモの全体的な流れとシナリオを作成。
    - [ ] PM: Sprint Re:0からSprint 3までの開発進捗、達成マイルストーン、主要KPI（PoCの結果等）、今後のロードマップ等をまとめた投資家向け報告資料を作成。
    - [ ] 全員: チーム内および関係者向けにMVPデモを実施し、フィードバックを収集。
    - [ ] PM: 収集したフィードバックを基に報告資料を最終化。

---

## 📅 イベント・ミーティング
- **Daily Standup:** 平日毎朝10:00 JST (バーチャル開催)
- **Sprint Review & Retrospective:** 各スプリント最終日の午後
- **MVP Demo (投資家向け):** Sprint 3 最終週に調整

---

## 🌿 ブランチ管理方針
- **メインブランチ:** `main` (保護ブランチ、直接コミット禁止)
- **開発ブランチ:** `develop` (日常的な開発のベースライン)
- **フィーチャーブランチ:** `feature/ISSUE_NUMBER-short-description` (例: `feature/R0-1-app-router-migration`)
- **バグFIXブランチ:** `fix/ISSUE_NUMBER-short-description`
- **リリースブランチ:** `release/vX.Y.Z` (本番リリース準備用)

PR (Pull Request) は `develop` ブランチに向けて作成し、最低1名以上のレビューを経てマージする。
PR作成時には、関連するIssue番号を必ず記載すること。

---
## 🔗 関連ドキュメント
- **元となった議事録:** `docs/dailyconf/20250507daly-2.md`
- **Cursorルール:** `.cursor/rules/` 配下の各ルールファイル
- **Figmaデザイン:** (別途共有されるFigmaリンクを参照)

---

## 実装進捗概要 (最終更新: 2024-05-XX)

1. **Sprint Re:0**: App Router移行は概ね完了（3/4項目完了）。CI/CDワークフロー再構築が残りの課題です。

2. **Sprint 1**: コア機能であるStripe決済とレッスン予約システムのバックエンド実装は完了しました。フロントエンドUIとE2Eテストの実装が次の重点課題です。

3. **Sprint 2**: Google Calendar同期機能は完了していますが、メール通知機能やリアルタイム更新、モニタリングの実装を進める必要があります。

4. **Sprint 3**: 現時点では未着手または確認中の項目が大部分です。アセスメントと優先順位付けが必要です。

## 今後の重点課題

1. DevOpsワークフローの完成（Story R0-4の残りのタスク）
2. 予約UIの実装とモバイル最適化（Story S1-3）
3. E2Eテスト環境の構築と重要フローのテスト自動化（Story S1-4）
4. メール通知システムの実装（Story S2-2）
5. リアルタイム更新とモニタリングシステムの構築（Story S2-3, S2-4）
