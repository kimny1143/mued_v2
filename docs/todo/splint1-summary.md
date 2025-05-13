# MUED LMS プロジェクト現状分析とSprint 1実装計画

## プロジェクト全体構造

このプロジェクトは次のような構成になっています：

- **フレームワーク**: Next.js 14（App Router）
- **言語**: TypeScript, React 18
- **スタイリング**: TailwindCSS
- **認証**: NextAuth.js
- **データベース**: PostgreSQL（Prisma ORM経由）
- **決済**: Stripe
- **テスト**: Playwright（E2Eテスト）

## 現在の進捗状況

### Sprint 1「決済 & 予約フロー MVP」の状況

1. **Story S1-1: Stripe Checkout / Webhook 実装**
   - ✅ Stripe Checkoutセッション作成API実装済み
   - ✅ Stripe Webhookエンドポイント作成済み
   - ✅ Webhookでの署名検証ロジック実装済み
   - ✅ Webhookでのイベント処理と支払い情報のDB更新ロジック実装済み
   - ✅ Webhook処理の単体テスト作成が完了
   - ✅ Supabase Edge Functionの権限設定確認

2. **Story S1-2: `LessonSlot`,`Reservation` API実装**
   - ✅ Prismaスキーマ定義済み
   - ✅ CRUD API実装済み
   - ✅ バリデーション実装済み
   - ✅ RLS設定済み
   - ✅ 重複予約防止ロジック実装済み
   - ✅ 単体テスト作成と90%以上のカバレッジ達成

3. **Story S1-3: 予約UI実装**
   - ✅ 基本的な予約ページとコンポーネント構造作成済み
   - ✅ モックデータを用いた表示は実装済み
   - ⚠️ 実際のAPIからのデータ取得が未実装
   - ⚠️ SWR/React Query等を使った状態管理が未実装
   - ⚠️ LCPの最適化が未確認
   - ⚠️ フィードバックUIの実装が未完了
   - ⚠️ Stripe Checkoutリダイレクト確認が未完了

4. **Story S1-4: E2Eテスト実装**
   - ⚠️ すべてのタスクが未完了

## 今後の実装計画

### 優先度の高いタスク

1. **S1-3: 予約UI（Table+Modal, Mobile Ready）**
   - `app/reservations/page.tsx`と`app/components/reservations/`内の各コンポーネントをモックデータから実際のAPIデータに接続
   - SWR/React Queryを用いたデータフェッチングと状態管理の実装
   - 予約成功・失敗時のフィードバックUIを実装
   - Lighthouse等でパフォーマンス測定と最適化

2. **S1-1: 残りのStripe関連タスク**
   - Webhook処理の単体テストを実装
   - Supabase Edge Functionの権限設定を確認・調整

3. **S1-4: E2Eテスト実装**
   - Playwrightテスト環境のセットアップ
   - 主要フロー（認証→決済→予約）のE2Eテスト実装
   - CI環境での自動実行設定

## 実装アプローチ

1. **APIとUIの連携**
   - 既存のモックデータから実際のAPIへの移行
   - useEffectでの初期ロードからSWR/React Queryへのリファクタリング
   - エラーハンドリングとローディング状態の適切な管理

2. **コンポーネント統合**
   - ページコンポーネントと個別UIコンポーネントの連携
   - 予約確認→支払い→完了の全体フローをシームレスに統合

3. **レスポンシブデザイン強化**
   - すでに基本的なレスポンシブ対応はされているが、さらに最適化

4. **パフォーマンス最適化**
   - ページロード時間を短縮（LCP 2.5秒以内）
   - 不要なリレンダリングの防止

5. **テスト戦略**
   - コンポーネントの単体テスト
   - APIエンドポイントの単体テスト
   - 主要フローのE2Eテスト

Sprint 1のタスク実装を通して、ユーザーが支払いを行い、レッスンの予約を確定できる基本的なMVP体験を提供することを目指します。
