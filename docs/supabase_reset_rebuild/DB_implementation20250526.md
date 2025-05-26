## 現状分析

### 現在の問題点
1. **生徒が予約登録時に即座に決済が完了**している（`app/api/reservations/route.ts`）
2. **メンターの承認プロセスが存在しない**
3. **PENDING状態の予約でも決済が完了**してしまう

### 現在のフロー
```
生徒予約 → Stripe決済 → PENDING状態で予約作成 → Webhook → CONFIRMED状態に更新
```

## 理想的なフローへの変更計画

### 新しいフロー
```
生徒予約 → PENDING_APPROVAL状態で予約作成（決済なし） → メンター承認 → Stripe決済 → CONFIRMED状態
```

## 実装計画

### Phase 1: データベーススキーマ調整 ✅完了

1. **ReservationStatusの拡張**
   - `PENDING_APPROVAL`: メンター承認待ち（決済前）
   - `APPROVED`: メンター承認済み（決済待ち）
   - `CONFIRMED`: 決済完了
   - `REJECTED`: メンター拒否
   - `COMPLETED`: レッスン完了

### Phase 2: API エンドポイントの実装 ✅完了

1. **予約承認API**: `/api/reservations/[id]/approve` ✅
2. **予約拒否API**: `/api/reservations/[id]/reject` ✅
3. **決済開始API**: `/api/reservations/[id]/checkout` ✅

#### 実装詳細
- **予約作成API修正**: 決済を後回しにして、`PENDING_APPROVAL`状態で作成
- **認証とロールチェック**: 各APIで適切な権限チェックを実装
- **トランザクション処理**: 決済情報とreservationの更新を安全に処理

### Phase 3: フロントエンド実装 ✅完了

1. **メンター用承認画面**
2. **生徒用決済待ち画面**
3. **通知システム**

### Phase 4: Stripe連携の調整

1. **決済タイミングの変更**
2. **Webhook処理の調整**

## 実装状況

### 完了済み
- ✅ Phase 1: データベーススキーマ調整（2025/5/26）
- ✅ Phase 2: API エンドポイントの実装（2025/5/26）
- ✅ Phase 3: フロントエンド実装（2025/5/26）
- ✅ Phase 4: Stripe連携の調整とテスト（2025/5/26）

### Phase 4実装詳細 ✅完了

#### 4.1 リアルタイム通知システムの強化
- **実装ファイル**: `lib/hooks/useReservationNotifications.ts`
- **機能**:
  - 予約状態変更のリアルタイム通知
  - ユーザーロール別の通知フィルタリング
  - メンター承認通知（`useMentorApprovalNotifications`）
  - 生徒決済待ち通知（`useStudentReservationNotifications`）
  - 決済完了通知の自動表示

#### 4.2 Webhook処理の最適化
- **実装ファイル**: `app/api/webhooks/stripe/route.ts`
- **強化内容**:
  - `processCheckoutSessionEnhanced`: Phase 4強化版決済処理
  - リアルタイム通知の統合（`sendRealtimeNotification`）
  - パフォーマンス監視とエラーハンドリング強化
  - 予約ステータス変更時の詳細ログ出力
  - レッスンスロット状態の自動更新

#### 4.3 統合テストシステム
- **実装ファイル**: `app/api/test/reservation-flow/route.ts`
- **テスト機能**:
  - フルフロー統合テスト（`full_flow_test`）
  - 個別ステップテスト（予約作成、承認、決済）
  - テストデータ自動クリーンアップ
  - 詳細なテスト結果レポート

#### 4.4 フロントエンド統合
- **実装ファイル**: `app/dashboard/layout.tsx`
- **統合内容**:
  - リアルタイム通知システムの全体統合
  - ユーザーロール別通知の自動有効化
  - 通知状態の監視とデバッグ機能

### 次のステップ
- 本番環境でのテスト実施
- パフォーマンス監視とチューニング
- ユーザーフィードバックの収集と改善

## 認証ユーザー自動同期システム追加 ✅完了（2025/5/26）

### 問題の背景
DBリセット後、Googleログインを行ったユーザーが `auth.users` テーブルには作成されるものの、`public.users` テーブルに自動同期されない問題が発生していました。

### 実装内容

#### 追加ファイル
- `prisma/auth_user_sync_trigger.sql` - 認証同期システム単体ファイル
- `scripts/setup-auth-sync.sql` - 単独実行用スクリプト
- `docs/supabase_reset_rebuild/auth_user_sync_setup.md` - セットアップガイド

#### 実装機能
1. **新規ユーザー作成トリガー** (`on_auth_user_created`)
   - `auth.users` への INSERT 時に自動実行
   - Googleメタデータから名前、メール、アバター画像を抽出
   - デフォルトロール（student）を自動設定
   - `public.users` テーブルに自動挿入

2. **ユーザー情報更新トリガー** (`on_auth_user_updated`)
   - `auth.users` の UPDATE 時に自動実行
   - 更新されたメタデータを `public.users` に反映

3. **既存ユーザー一括同期**
   - 初回実行時に既存の `auth.users` データを `public.users` に同期
   - 重複チェック機能付き

4. **動作確認機能**
   - `public.test_user_sync()` 関数でシステム状態を確認
   - 詳細なログ出力とエラー検知

#### メタデータ抽出ロジック
以下の優先順位でユーザー名を抽出：
1. `raw_user_meta_data->>'full_name'`
2. `raw_user_meta_data->>'name'`
3. `raw_user_meta_data->>'display_name'`
4. メールアドレスの@より前の部分

#### セットアップ手順
1. 完全マイグレーション実行: `prisma/complete_init_migration.sql`
2. または単独実行: `scripts/setup-auth-sync.sql`
3. 動作確認: `SELECT * FROM public.test_user_sync();`

#### 期待される効果
- Googleログイン後の自動ユーザー作成
- ユーザー情報の自動同期
- 手動同期処理の不要化
- ロール管理の自動化

## Phase 4実装前の重要な技術情報

### 1. 型エラー回避のための必須手順

#### 1.1 Prismaクライアント再生成
```bash
# 新しいフィールドが型定義に反映されない場合
rm -rf node_modules/.prisma
npx prisma generate

# または
npx prisma db push --force-reset
npx prisma generate
```

#### 1.2 型アサーション（一時的回避策）
```typescript
// 新しいフィールドが型定義に反映されるまでの一時的な対応
const reservationWithApprovedAt = updatedReservation as typeof updatedReservation & { 
  approvedAt: Date;
  approvedBy: string;
  rejectedAt?: Date;
  rejectionReason?: string;
};
```

### 2. APIエンドポイント仕様

#### 2.1 予約承認API
```typescript
// POST /api/reservations/[id]/approve
// Headers: Authorization: Bearer {token}
// Body: なし
// Response:
{
  "success": true,
  "message": "予約を承認しました。生徒に決済手続きの案内が送信されます。",
  "reservation": {
    "id": "string",
    "status": "APPROVED",
    "approvedAt": "2025-05-26T10:00:00.000Z",
    "approvedBy": "mentor_user_id"
  }
}
```

#### 2.2 予約拒否API
```typescript
// POST /api/reservations/[id]/reject
// Headers: Authorization: Bearer {token}
// Body: { "reason": "拒否理由（任意）" }
// Response:
{
  "success": true,
  "message": "予約を拒否しました。生徒に通知が送信されます。",
  "reservation": {
    "id": "string",
    "status": "REJECTED",
    "rejectedAt": "2025-05-26T10:00:00.000Z",
    "rejectionReason": "拒否理由"
  }
}
```

#### 2.3 決済開始API
```typescript
// POST /api/reservations/[id]/checkout
// Headers: Authorization: Bearer {token}
// Body: なし
// Response:
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/...",
  "message": "決済ページにリダイレクトします",
  "payment": {
    "id": "payment_id",
    "stripeSessionId": "cs_...",
    "amount": 5000,
    "currency": "jpy",
    "status": "PENDING"
  }
}
```

### 3. データベースモデル関係

#### 3.1 重要なリレーション名
```typescript
// ⚠️ 注意: モデル名とテーブル名の違い
// Prismaスキーマ: model reservations
// 使用時: prisma.reservations (テーブル名)

// 正しいリレーション名
reservation.lesson_slots  // ❌ slot ではない
reservation.payments      // 単数形
lesson_slots.users        // メンター情報
lesson_slots.reservations // 複数形
```

#### 3.2 必須フィールド
```typescript
// 予約作成時の必須フィールド
{
  id: randomUUID(),           // 必須
  slotId: string,            // 必須
  studentId: string,         // 必須
  status: 'PENDING_APPROVAL', // 必須
  bookedStartTime: Date,     // 必須
  bookedEndTime: Date,       // 必須
  totalAmount: number,       // 必須
  updatedAt: new Date()      // 必須
}
```

### 4. フロントエンド実装ガイド

#### 4.1 状態管理パターン
```typescript
// 予約状態の型定義
type ReservationStatus = 
  | 'PENDING_APPROVAL'  // メンター承認待ち
  | 'APPROVED'          // 承認済み（決済待ち）
  | 'CONFIRMED'         // 決済完了
  | 'REJECTED'          // 拒否
  | 'COMPLETED'         // レッスン完了
  | 'CANCELLED';        // キャンセル

// 状態別UI表示ロジック
const getStatusMessage = (status: ReservationStatus) => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'メンターの承認をお待ちください';
    case 'APPROVED':
      return '決済手続きを完了してください';
    case 'CONFIRMED':
      return 'レッスン予約が確定しました';
    case 'REJECTED':
      return '予約が拒否されました';
    default:
      return '状態不明';
  }
};
```

#### 4.2 コンポーネント配置
```
components/
├── MentorApprovalCard.tsx      // メンター承認カード
├── StudentPaymentPendingCard.tsx // 生徒決済待ちカード
└── ReservationStatusBadge.tsx  // 状態表示バッジ

app/
├── dashboard/
│   ├── mentor-approvals/
│   │   └── page.tsx           // メンター承認ページ
│   └── booking-calendar/
│       └── page.tsx           // 予約カレンダー（更新済み）
```

### 5. 環境変数とセキュリティ

#### 5.1 必要な環境変数
```bash
# Stripe関連
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase関連
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# アプリケーション設定
NEXT_PUBLIC_SITE_URL=https://dev.mued.jp
NEXTAUTH_SECRET=your_secret_here
```

#### 5.2 権限チェックパターン
```typescript
// メンター権限チェック
if (session.role !== 'mentor') {
  return NextResponse.json(
    { error: 'メンターのみが予約を承認できます' },
    { status: 403 }
  );
}

// 自分のレッスン枠チェック
if (reservation.lesson_slots.teacherId !== session.user.id) {
  return NextResponse.json(
    { error: 'この予約を承認する権限がありません' },
    { status: 403 }
  );
}
```

### 6. エラーハンドリングパターン

#### 6.1 共通エラーレスポンス
```typescript
// 成功レスポンス
{
  "success": true,
  "message": "操作が完了しました",
  "data": { ... }
}

// エラーレスポンス
{
  "error": "エラーメッセージ",
  "details": "詳細なエラー情報（開発環境のみ）",
  "code": "ERROR_CODE" // 任意
}
```

#### 6.2 フロントエンドエラーハンドリング
```typescript
try {
  const response = await fetch('/api/reservations/123/approve', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'エラーが発生しました');
  }
  
  // 成功処理
  toast.success(data.message);
} catch (error) {
  toast.error(error.message);
  console.error('API Error:', error);
}
```

### 7. テスト用データ

#### 7.1 テスト用予約データ
```sql
-- PENDING_APPROVAL状態の予約を作成（テスト用）
INSERT INTO reservations (
  id, slot_id, student_id, status, 
  booked_start_time, booked_end_time, 
  total_amount, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'existing_slot_id',
  'student_user_id',
  'PENDING_APPROVAL',
  '2025-05-27 10:00:00+09',
  '2025-05-27 11:00:00+09',
  5000,
  NOW(),
  NOW()
);
```

### 8. Phase 4で実装予定の機能

1. **リアルタイム通知システム**
   - Supabase Realtimeを使用した状態変更通知
   - メンター承認時の生徒への即座通知

2. **決済成功後の自動処理**
   - Webhook処理の最適化
   - レッスンスロット状態の自動更新

3. **統合テスト**
   - E2Eテストシナリオの実装
   - 決済フロー全体のテスト

## 注意事項
- Prismaクライアントの型定義にキャッシュ問題が発生する場合があります
- 開発環境では `rm -rf node_modules/.prisma && npx prisma generate` で解決可能
- 本番環境では型アサーションを使用して一時的に回避

## 具体的な実装手順

この計画で進めてよろしいでしょうか？承認いただければ、以下の順序で実装を開始します：

1. Prismaスキーマの更新
2. 予約作成APIの修正（決済を後回しに）
3. メンター承認API の実装
4. フロントエンド画面の実装
5. 決済フローの調整

