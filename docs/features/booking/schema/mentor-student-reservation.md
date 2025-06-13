# 現在のコードベース構造

## 1. ユーザーロールと認証
- **認証システム**: Supabase Auth
- **ユーザーロール**: 
  - `student`: 一般生徒ユーザー
  - `mentor`: メンター（講師）
  - `admin`: 管理者

## 2. レッスンスロット管理
### API エンドポイント
- **GET /api/lesson-slots**: スロット一覧取得 
- **POST /api/lesson-slots**: 新規スロット作成（mentor権限必要）

### 機能実装状況
- **APIは実装済み**: `app/api/lesson-slots/route.ts`で完全実装
- **メンター用UI**: 未実装（作成画面がない）

## 3. 予約フロー
### API エンドポイント
- **GET /api/reservations**: 予約一覧取得
- **POST /api/reservations**: 予約作成（Stripe決済連携）
- **GET/PUT/DELETE /api/reservations/[id]**: 個別予約の取得・更新・削除

### UI コンポーネント
- **生徒側予約**: `app/components/reservation/page.tsx`
- **予約確認**: `app/dashboard/reservations/page.tsx`
- **予約成功**: `app/dashboard/reservations/success/page.tsx`
- **詳細表示**: `ReservationTable.tsx`, `ReservationSuccessContent.tsx`

## 4. 決済処理
### Stripe連携
- **チェックアウト**: 予約作成時にStripe Checkoutセッション生成
- **Webhook**: `app/api/webhooks/stripe/route.ts`で支払い完了イベント処理
- **ステータス確認**: `app/api/checkout/status/route.ts`

### 予約ステータス
- **CONFIRMED**: 予約確定済み（支払い完了）
- **COMPLETED**: レッスン完了

## 5. 現状の課題
1. **最も重要**: メンター用のレッスンスロット作成画面が存在しない
2. ロール別メニュー表示に矛盾がある
3. 日程作成から予約までの一連のフローの検証が未実施

## 6. 技術スタック
- **フロントエンド**: Next.js 14 + React 18
- **認証**: Supabase Auth
- **データベース**: Prisma + PostgreSQL
- **決済**: Stripe API

実装すべき優先事項としては、まずメンター（講師）向けのレッスンスロット作成画面を実装し、その後で予約から決済までの一連のフローを検証することが必要です。
