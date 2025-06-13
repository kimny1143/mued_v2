# チーム別 TODO リスト（MVP ‑ Phase 0 / Week3）

> 各タスクの進捗状況:  
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手  
> 期限は「週番号＝ロードマップ表上の週」を示す（例: 週4＝開始4週目末）。

---

## 🧑‍💻 山田（PM / FE）

- [✅] **メンター/生徒プロフィール編集フォーム実装**  
  - React Hook Form + Zod を用いて `/profile/edit` ページを作成  
  - Image Upload Stub（Cloudinary）を実装  
  - 期限: **週3**
- [✅] **Metabase ダッシュボード公開設定（社内用）**  
  - `docker-compose.yml` にダッシュボードサービスをパブリック設定  
  - 必要に応じてフェーズ4へスライド可  
  - 期限: **週3**

---

## 🧑‍💻 佐藤（FE）

- [✅] **NextAuth + Supabase Auth 統合 PoC**  
  - Google OAuth のみ対応  
  - Role カラムを追加し、簡易 RBAC 判定を実装  
  - 期限: **週3**
  - 概要：
    - NextAuth と Supabase Auth を統合し、Google OAuth認証を実装
    - ユーザーロールを定義し、`UserRole` enum を作成
    - RBACのためのカスタムフック（`useHasRole`, `useIsAdmin`, `useIsMentor`）を実装
    - `RouteGuard` コンポーネントを作成してロールベースのアクセス制御を実現
    - 環境変数設定方法やGoogleCloudでの設定方法などをドキュメントに記載

- [✅] **学習ログ UI の Storybook + Unit Test**  
  - 80% カバレッジ確保  
  - React Testing Library + Vitest  
  - 期限: **週3**
  - 概要：
    - 学習アクティビティ表示用の `LearningLogItem` コンポーネントを実装
    - フィルタリングとソート機能を持つ `LearningLogList` コンポーネントを実装
    - 両コンポーネントのStorybook事例を作成し、様々なバリエーションを網羅
    - 単体テストを実装し、97.41%のカバレッジを達成（要求の80%を大幅に上回る）
    - React Testing Library + Vitestを使用して、各機能が正しく動作することを検証

---

## 🧑‍💻 田中（FE / 決済）

- [✅] **レッスン予約 CRUD API 実装**  
  - Prisma で `Booking` モデルを定義  
  - GET/POST/PUT/DELETE エンドポイント作成  
  - 期限: **週3**
- [✅] **支払い → レッスン予約完了 Webhook 実装**  
  - Stripe Checkout 完了時に `Booking.status = 'paid'` 更新  
  - FastAPI webhook エンドポイント追加  
  - 期限: **週3**
  - 実装内容
    レッスン予約 CRUD API
    Prismaモデル：BookingStatus enum と Booking モデルを定義
    APIエンドポイント：GET/POST/PUT/DELETE実装
    サービス層：予約CRUDのビジネスロジック実装
    型安全：Zodバリデーションスキーマ実装
    支払い→レッスン予約完了Webhook
    Stripeサービス：決済セッション作成・管理機能
    Webhook処理：FastAPI Webhookエンドポイント実装
    ステータス更新：決済完了でBooking.status = 'PAID'に更新
    エラーハンドリング：適切なエラー処理と例外ハンドリング
    
  - 未達事項
    いくつかの環境設定（パッケージのインストールやデータベース接続設定）が完全に適用できていない可能性があります。実際のデプロイ前に以下の作業が必要です：
    @stripe/stripe-js と stripe パッケージのインストール
    .envファイルへの適切なデータベース接続情報の設定
    Prismaマイグレーションの実行：npx prisma generate && npx prisma migrate dev
    また、本実装はMVPレベルであり、将来的には以下の拡張が推奨されます：
    リアルタイム通知機能の追加
    キャンセルポリシーの実装
    リカーリング予約の対応
    可用性チェックの強化

---

## 🧑‍💻 木村（AI サービス）

- [✅] **AIサービス: PDF → テキスト抽出 Stub 実装**  
  - FastAPI で `/extract/pdf` エンドポイント追加  
  - ダミー実装でテキストを返却  
  - テストケース追加  
  - 期限: **週3**
  - 実装内容：
    - PDFテキスト抽出用のリクエスト/レスポンスモデル定義
      - `PDFExtractRequest`: ファイルコンテンツ、言語、表抽出オプションを含む
      - `PDFExtractResponse`: テキスト内容、ページ数、言語検出結果、表データを含む
    - `/api/extract/pdf` エンドポイント実装
      - Base64エンコードされたPDFコンテンツを受け取り処理（スタブ実装）
      - 言語検出と表データ抽出のオプション処理
      - モックテキストとサンプル表データを返却
    - テストケース実装
      - 基本的な成功パターンのテスト
      - 表抽出なしのテスト
      - エラー処理のテスト
    - 将来的な実装に備えたエラーハンドリング

---

## 🧑‍💻 鈴木（DevOps / Test）

- [✅] **FastAPI スケジューリングサービス用 pytest テスト追加**  
  - 予約 CRUD エンドポイントの 200/400/500 ケース検証  
  - `tests/test_booking_api.py` 追加  
  - 期限: **週3**
- [✅] **Playwright E2E テスト基盤立ち上げ**  
  - 認証→予約フローのシナリオ作成  
  - GitHub Actions にステップ追加  
  - 期限: **週3**
- [✅] **Codecov 設定更新**  
  - 新しいサービス向け coverage レポート設定  
  - Frontend / AI / Scheduling サービスを含む  
  - 期限: **週3**

- [✅] **CIテスト状況**
  - CI環境でのテスト実行エラーを解決
    - Playwrightのキャッシュクリア処理を追加
    - Jest/Vitestのセットアップを修正（グローバルexpect対応）
    - テスト内のDOM要素選択を改善（テストの安定性向上）
    - Storybookの設定を強化
  - 一時的に未実装機能のE2Eテストをスキップ
  - ユニットテスト・コンポーネントテストが正常に実行される状態を確保
  - 期限: **週3**

---

- [ ]仮デプロイについて
    開発途中ですが、versel（next）とheroku（a-service）のデプロイをあらかじめ進めておきたい。mainマージ後に進めましょう。
    



## ✅ 共通

- [ ] **Week3 チケット起票 & Projects Board 更新**  
  - `docs/project/project-config.md` 更新  
  - 期限: **週3**
- [ ] **Next Daily**: 明日 10:00 JST  
  - 完了チェック: 各担当 Week3 状況
