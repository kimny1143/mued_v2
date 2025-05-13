# MUED LMS プロジェクト現状分析とSprint 1実装計画

## プロジェクト全体構造

このプロジェクトは次のような構成になっています：

- **フレームワーク**: Next.js 14（App Router）
- **言語**: TypeScript, React 18
- **スタイリング**: TailwindCSS
- **認証**: Supabase Auth
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
   - ✅ 実際のAPIからのデータ取得機能実装済み
   - ✅ React Queryを使った状態管理実装済み
   - ✅ LCPの最適化を確認済み（2.5秒以内）
   - ✅ フィードバックUI（Toast）の実装済み
   - ✅ Stripe Checkoutリダイレクト確認済み

4. **Story S1-4: E2Eテスト実装**
   - ⚠️ 基本設定は完了したが、テストカバレッジの向上が必要

## 次の実装計画

### Sprint 2「Google Calendar & メール通知」の進捗状況

1. **Story S2-1: Google OAuth & 差分同期サービス**
   - ✅ NextAuth.jsとGoogle Providerによる認証フロー実装済み
   - ✅ Google Calendar APIクライアント実装済み (`lib/googleCalendar.ts`)
   - ✅ 双方向の差分同期ロジック実装済み
   - ✅ 同期APIエンドポイント作成済み
   - ✅ エラーハンドリングとリトライ機構実装済み

2. **Story S2-2: 予約確定メール (Supabase Trigger + Resend)**
   - ⚠️ 未実装

3. **Story S2-3: ダッシュボード予約ステータス更新**
   - ⚠️ ダッシュボード基本構造のみ実装

4. **Story S2-4: DevOps: モニタリング & Alerting**
   - ⚠️ 未実装

### 今後の優先タスク

1. メール通知システムの実装（Story S2-2）
2. リアルタイム更新とモニタリングシステムの構築（Story S2-3, S2-4）
3. AI連携による教材生成機能の開発（Sprint 3）
4. E2Eテスト環境の強化と自動化（Story S1-4）

### 実装アプローチ

1. **メール通知システム**
   - Supabaseのデータベーストリガーとエッジ関数を活用
   - Resendを用いた高品質なHTMLメールテンプレートの作成
   - 送信ログとエラーハンドリングの実装

2. **リアルタイム更新・モニタリング**
   - Supabase Realtimeを用いたダッシュボード更新の実装
   - Logflare/Grafanaによる統合監視ダッシュボード構築
   - クリティカルエラーのSlack通知機能の実装

3. **教材生成AI機能**
   - Python/FastAPIマイクロサービスとの効率的な連携
   - PDF→Markdown変換の最適化
   - フロントエンドでの教材表示UIの実装

Sprint 1のタスク実装を通して、ユーザーが支払いを行い、レッスンの予約を確定できる基本的なMVP体験を提供することを目指します。
