## 実装計画書 - レッスンキャンセル・リスケジュールポリシー対応

### 概要
新しいキャンセル・リスケジュールポリシーに基づいた予約フローの変更実装計画です。主な変更点は決済タイミングの変更、キャンセル・返金機能の実装、メール通知システムの導入です。

### 現在のシステム構造分析

#### アーキテクチャ
- **フロントエンド**: Next.js App Router + React 18 + TypeScript
- **データベース**: PostgreSQL (Prisma ORM)
- **決済**: Stripe
- **認証**: Supabase Auth
- **メール**: Resend（ライブラリは準備済み、実装未完了）

#### 主要な予約ステータスフロー
```
PENDING_APPROVAL → APPROVED → CONFIRMED → COMPLETED
                  ↓        ↓
               REJECTED  CANCELED
```

### 実装計画

## 1. データベーススキーマ変更

### 1.1 新規フィールド追加
```sql
-- reservations テーブルに追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS canceledAt TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS canceledBy VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancelReason TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rescheduledFrom VARCHAR(255);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rescheduledTo VARCHAR(255);

-- payments テーブルに追加  
ALTER TABLE payments ADD COLUMN IF NOT EXISTS chargeExecutedAt TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refundedAt TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refundAmount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refundReason TEXT;
```

### 1.2 新規Enumの追加
```prisma
enum CancelReason {
  STUDENT_REQUEST    // 生徒都合
  MENTOR_REQUEST     // 講師都合
  ADMIN_REQUEST      // 管理者都合
  EMERGENCY          // 緊急事態
  SYSTEM_ERROR       // システムエラー
}
```

## 2. 決済フロー変更

### 2.1 現在の決済フロー
```
予約承認(APPROVED) → 即座にStripe決済実行 → CONFIRMED
```

### 2.2 新しい決済フロー
```
予約承認(APPROVED) → Setup Intent作成（カード情報保存）
↓
レッスン開始2時間前 → Payment Intent実行 → CONFIRMED
```

### 2.3 実装内容

#### 2.3.1 Setup Intent処理の改善
```typescript
// app/api/reservations/[id]/approve-payment/route.ts
export async function POST(request: NextRequest) {
  // 1. Setup Intentでカード情報を保存
  // 2. paymentsテーブルにSTATUS: SETUP_COMPLETED で記録
  // 3. reservationステータスはAPPROVEDのまま維持
}
```

#### 2.3.2 決済実行スケジューラー
```typescript
// app/api/cron/execute-payments/route.ts
export async function GET() {
  // 1. レッスン開始2時間前の予約を検索
  // 2. APPROVED かつ SETUP_COMPLETED の予約を抽出
  // 3. 保存済みの決済方法で Payment Intent を実行
  // 4. 成功したらステータスをCONFIRMEDに更新
}
```

## 3. キャンセル機能実装

### 3.1 キャンセルAPIエンドポイント
```typescript
// app/api/reservations/[id]/cancel/route.ts
export async function POST(request: NextRequest) {
  // 1. ユーザー権限チェック
  // 2. キャンセルポリシーに基づく時間チェック
  // 3. 決済状態に応じた処理
  //    - 未決済: 予約のみキャンセル
  //    - 決済済み: Stripe返金処理
  // 4. メール通知送信
}
```

### 3.2 キャンセルポリシー実装
```typescript
// lib/cancellation-policy.ts
export class CancellationPolicy {
  static canStudentCancel(lessonStartTime: Date): boolean {
    const hoursUntilLesson = differenceInHours(lessonStartTime, new Date());
    return hoursUntilLesson >= 24;
  }
  
  static canMentorCancel(lessonStartTime: Date): boolean {
    const hoursUntilLesson = differenceInHours(lessonStartTime, new Date());
    return hoursUntilLesson >= 2;
  }
  
  static calculateCancellationFee(
    role: string,
    lessonStartTime: Date,
    totalAmount: number
  ): number {
    if (role === 'student' && !this.canStudentCancel(lessonStartTime)) {
      return totalAmount; // 100%のキャンセル料
    }
    return 0;
  }
}
```

## 4. リスケジュール機能実装

### 4.1 リスケジュールAPIエンドポイント
```typescript
// app/api/reservations/[id]/reschedule/route.ts
export async function POST(request: NextRequest) {
  // 1. 権限チェック（講師・管理者のみ）
  // 2. 新しい時間枠の空き状況確認
  // 3. 元の予約をキャンセル（返金なし）
  // 4. 新しい予約を作成（決済情報引き継ぎ）
  // 5. メール通知送信
}
```

## 5. メール通知システム実装

### 5.1 メールテンプレート拡張
```typescript
// lib/email-templates/
export const emailTemplates = {
  // 既存
  reservationConfirmation: generateReservationConfirmationEmail,
  reminder: generateReminderEmail,
  
  // 新規追加
  paymentReminder24h: generate24HourPaymentReminderEmail,
  cancellationNotice: generateCancellationNoticeEmail,
  rescheduleNotice: generateRescheduleNoticeEmail,
  refundNotice: generateRefundNoticeEmail,
};
```

### 5.2 通知トリガー実装
```typescript
// app/api/cron/send-reminders/route.ts
export async function GET() {
  // 24時間前リマインダー
  const upcoming24h = await findReservationsStartingIn24Hours();
  for (const reservation of upcoming24h) {
    await sendEmail({
      to: reservation.student.email,
      subject: 'レッスン24時間前のお知らせ',
      html: emailTemplates.paymentReminder24h(reservation),
    });
  }
}
```

## 6. 管理画面UI実装

### 6.1 予約詳細画面の拡張
```tsx
// app/dashboard/reservations/[id]/page.tsx
export default function ReservationDetailPage() {
  return (
    <div>
      {/* 既存の予約情報表示 */}
      
      {/* キャンセル・リスケジュールボタン */}
      {canCancel && (
        <CancelReservationButton 
          reservationId={reservation.id}
          onCancel={handleCancel}
        />
      )}
      
      {canReschedule && (
        <RescheduleReservationButton
          reservationId={reservation.id}
          onReschedule={handleReschedule}
        />
      )}
      
      {/* 返金処理（管理者のみ） */}
      {isAdmin && reservation.status === 'CANCELED' && (
        <RefundProcessButton
          reservationId={reservation.id}
          onRefund={handleRefund}
        />
      )}
    </div>
  );
}
```

## 7. 実装優先順位とフェーズ

### Phase 1: 基盤整備（1週間）
1. データベーススキーマ変更
2. Prismaモデル更新とマイグレーション
3. 基本的なAPIエンドポイント作成

### Phase 2: 決済フロー変更（1週間）
1. Setup Intent処理の実装
2. 決済実行スケジューラーの実装
3. 既存の決済フローとの互換性確保

### Phase 3: キャンセル機能（3-4日）
1. キャンセルポリシーロジック実装
2. キャンセルAPIエンドポイント実装
3. Stripe返金処理の実装

### Phase 4: リスケジュール機能（3-4日）
1. リスケジュールAPIエンドポイント実装
2. 予約の関連付け処理
3. UI実装

### Phase 5: メール通知（1週間）
1. メールテンプレート作成
2. 通知トリガーの実装
3. Cronジョブの設定

### Phase 6: テストと調整（3-4日）
1. E2Eテストの実装
2. 本番環境でのテスト
3. バグ修正と最適化

## 8. リスクと対策

### 8.1 技術的リスク
- **Stripe APIの制限**: レート制限に注意し、バッチ処理を実装
- **Cronジョブの信頼性**: 冗長性を持たせ、失敗時のリトライ機構を実装
- **データ整合性**: トランザクション処理を適切に実装

### 8.2 ビジネスリスク
- **既存予約への影響**: 新旧両方のフローをサポートする移行期間を設ける
- **ユーザー混乱**: 明確なUI/UXとヘルプドキュメントを用意

## 9. モニタリングとメトリクス

### 9.1 監視項目
- キャンセル率の推移
- 返金処理の成功率
- メール送信の成功率
- 決済実行の成功率

### 9.2 ログ収集
```typescript
// lib/monitoring.ts
export const trackReservationEvent = (event: {
  type: 'cancel' | 'reschedule' | 'refund';
  reservationId: string;
  userId: string;
  reason?: string;
  amount?: number;
}) => {
  // Sentryやログ収集サービスに送信
};
```

## 10. ドキュメント更新

### 10.1 API仕様書
- 新規エンドポイントのOpenAPI仕様追加
- 既存エンドポイントの変更点記載

### 10.2 ユーザーガイド
- キャンセルポリシーの説明
- リスケジュール手順
- FAQ更新

