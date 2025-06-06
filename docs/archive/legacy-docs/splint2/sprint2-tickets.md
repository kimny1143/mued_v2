# Sprint 2 チケット一覧

このドキュメントでは、Sprint 2（Week3-4）のチケット一覧と詳細情報を管理します。

## チケット概要

Sprint 2の合計ストーリーポイントは28ポイントです。

| # | タイトル | 担当者 | Type | Priority | Story Points | ステータス |
|---|---------|-------|------|----------|--------------|----------|
| 6 | `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API | 木村 | Feature | High | 5 | Todo |
| 7 | Google Calendar OAuth同期サービス | 佐藤 | Feature | High | 5 | Todo |
| 8 | 予約UI（Table＋Modal、Smart Mobile Layout） | 田中 | Feature | High | 5 | Todo |
| 9 | Stripe Price APIラッパー `lib/stripe.ts` | 佐藤 | Feature | Medium | 2 | Todo |
| 10 | Stripe Checkout + Webhook（Supabase Edge Functions） | 木村 | Feature | Critical | 5 | Todo |
| 11 | ペイウォールABテスト Feature-flag 基盤 | 鈴木 | Feature | Medium | 2 | Todo |
| 12 | QA & Storybookコンポーネント追加（DatePicker, Badge） | 佐藤 | Feature | Low | 2 | Todo |
| 13 | 予約確定メール & ロギング（Supabase自動 Trigger） | 佐藤 | Feature | Medium | 2 | Todo |
| 14 | 投資家向け財務メトリクス自動集計 PoC | 山田, 木村 | Documentation | Low | 2 | Todo |

## チケット詳細

### #6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API
- **説明**: レッスン枠とユーザー予約のPrismaモデルを実装し、CRUD操作のためのAPIを作成する
- **受け入れ基準**:
  - 両モデルがPrismaスキーマに正しく定義されている
  - APIエンドポイントは適切な認証と権限チェックを実装している
  - 全APIエンドポイントに対するテストが実装されている
- **技術的注意点**:
  - RLS（Row Level Security）の適切な設定が必要
  - 予約の競合解決ロジックを実装する

### #7: Google Calendar OAuth同期サービス
- **説明**: Google Calendar APIと連携し、レッスン予約の自動同期機能を実装する
- **受け入れ基準**:
  - OAuth認証フローが正しく実装されている
  - レッスン予約がGoogle Calendarに自動同期される
  - 同期エラーが適切に処理・記録される
- **技術的注意点**:
  - リフレッシュトークンの保存と管理
  - 差分同期によるAPI呼び出し最適化

### #8: 予約UI（Table＋Modal、Smart Mobile Layout）
- **説明**: レッスン予約のためのUI実装（テーブル表示とモーダル、モバイル対応レイアウト）
- **受け入れ基準**:
  - デスクトップとモバイルの両方でレスポンシブに動作する
  - アクセシビリティ基準を満たしている
  - LCP（Largest Contentful Paint）が2.5秒未満
- **技術的注意点**:
  - 日時選択のUXを最適化する
  - モバイル表示でのテーブルレイアウト代替案

### #9: Stripe Price APIラッパー `lib/stripe.ts`
- **説明**: Stripe APIを利用して価格情報を取得・管理するラッパー関数の実装
- **受け入れ基準**:
  - 月額/年額プランの情報を取得する関数が実装されている
  - 単体テストでカバレッジ80%以上
- **技術的注意点**:
  - Stripe APIのレート制限を考慮したキャッシュ実装
  - テスト環境での模擬応答の設定

### #10: Stripe Checkout + Webhook（Supabase Edge Functions）
- **説明**: Stripeチェックアウトフローとウェブフックハンドラーの実装
- **受け入れ基準**:
  - チェックアウトから支払い完了までのフローが正常に動作する
  - ウェブフック署名検証が実装されている
  - 支払い成功時に`Subscription`レコードが更新される
- **技術的注意点**:
  - Webhook署名の検証と再試行メカニズム
  - 冪等性の確保

### #11: ペイウォールABテスト Feature-flag 基盤
- **説明**: ペイウォールのABテストを実施するためのフィーチャーフラグ基盤を実装
- **受け入れ基準**:
  - `lib/flags.ts`設定ファイルが作成されている
  - トグルに応じてUI/ルート制御が可能
- **技術的注意点**:
  - パフォーマンスへの影響を最小限に抑える
  - ユーザーセッション間での一貫性の確保

### #12: QA & Storybookコンポーネント追加（DatePicker, Badge）
- **説明**: DatePickerとBadgeコンポーネントをStorybookに追加し、QAを実施
- **受け入れ基準**:
  - コンポーネントがStorybookに追加され、ドキュメント化されている
  - モバイルスナップショットテストが実装されている
- **技術的注意点**:
  - アクセシビリティ対応
  - ダークモード対応

### #13: 予約確定メール & ロギング（Supabase自動 Trigger）
- **説明**: 予約確定時の自動メール送信とログ記録のためのSupabaseトリガーを実装
- **受け入れ基準**:
  - 予約確定時に正しいメールが送信される
  - メタデータが適切に記録される
- **技術的注意点**:
  - メール送信失敗時のリトライ処理
  - センシティブ情報の適切な扱い

### #14: 投資家向け財務メトリクス自動集計 PoC
- **説明**: Stripeからの売上データを自動集計し、投資家向けレポートを生成するPoC
- **受け入れ基準**:
  - Stripe売上データが正しく取得・集計される
  - Metabaseと連携したレポートが生成される
- **技術的注意点**:
  - データの正確性と整合性の確保
  - 自動更新メカニズムの構築

## WBS（Work Breakdown Structure）

Sprint 2の作業内容は以下のように分解されます：

1. データモデルとAPI実装（10ポイント）
   - Task 6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API (5ポイント)
   - Task 10: Stripe Checkout + Webhook（Supabase Edge Functions）(5ポイント)

2. 外部サービス連携（7ポイント）
   - Task 7: Google Calendar OAuth同期サービス (5ポイント)
   - Task 9: Stripe Price APIラッパー (2ポイント)

3. フロントエンド実装（7ポイント）
   - Task 8: 予約UI（Table＋Modal、Smart Mobile Layout）(5ポイント)
   - Task 11: ペイウォールABテスト Feature-flag 基盤 (2ポイント)

4. 品質保証と補助機能（6ポイント）
   - Task 12: QA & Storybookコンポーネント追加 (2ポイント)
   - Task 13: 予約確定メール & ロギング (2ポイント)
   - Task 14: 投資家向け財務メトリクス自動集計 PoC (2ポイント)

## リスク管理

1. **外部サービス依存リスク**
   - Google Calendar APIやStripe APIの仕様変更や障害
   - **対策**: モックデータを使用したフォールバックメカニズムの実装

2. **タイムラインリスク**
   - 複雑なタスク（#7, #10）が予定より長引く可能性
   - **対策**: 最小実装可能な機能（MVP）を定義し、段階的に実装

3. **技術的負債リスク**
   - 急ぎの実装による品質低下
   - **対策**: コードレビューの徹底とリファクタリング時間の確保 