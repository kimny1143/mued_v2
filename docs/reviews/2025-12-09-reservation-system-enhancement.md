# 予約システム拡張 実装レポート

**実装日**: 2025-12-09
**コミット範囲**: `bca7c4b2` ~ `0408e146`
**レビュー対象**: 4機能の新規実装

---

## 1. 実装概要

MUED LMS の予約システムに以下の4機能を追加：

| # | 機能 | コミット | 主要ファイル |
|---|------|---------|-------------|
| 1 | Stripe Webhook 処理の完全実装 | `bca7c4b2` | `app/api/webhooks/stripe/route.ts` |
| 2 | メンタースロット管理API | `8ac3071e` | `lib/repositories/lesson-slots.repository.ts` |
| 3 | メール通知システム | `56ca61c4` | `lib/services/email.service.ts`, `notification.service.ts` |
| 4 | 繰り返しスケジュールUI | `0408e146` | `hooks/use-mentor-slots.ts`, `components/features/slot-*.tsx` |

---

## 2. 機能詳細

### 2.1 Stripe Webhook 処理 (`bca7c4b2`)

#### 目的
決済完了・返金・キャンセル時の自動処理を実装

#### 実装内容

**DBスキーマ追加** (`db/schema.ts`):
```typescript
export const webhookStatusEnum = pgEnum("webhook_status", [
  "processing",
  "processed",
  "failed",
]);

// webhookEvents テーブルに追加
status: webhookStatusEnum("status").default("processing"),
completedAt: timestamp("completed_at"),
errorMessage: text("error_message"),
```

**マイグレーション** (`db/migrations/0016_add_webhook_status_tracking.sql`):
- `webhook_status` ENUM型作成
- `status`, `completed_at`, `error_message` カラム追加
- `idx_webhook_events_status` インデックス追加

**Webhook ハンドラ** (`app/api/webhooks/stripe/route.ts`):

| イベント | 処理内容 |
|---------|---------|
| `payment_intent.succeeded` | 予約ステータス更新、メール通知送信 |
| `charge.refunded` | 全額/一部返金処理、スロット容量復元 |
| `payment_intent.canceled` | キャンセル処理 |

**冪等性の実装**:
```typescript
// 既存イベントチェック
const existingEvent = await db.query.webhookEvents.findFirst({
  where: eq(webhookEvents.stripeEventId, event.id),
});

// processed 以外は再処理可能（failed/processing のリトライ対応）
if (existingEvent?.status === 'processed') {
  return apiSuccess({ received: true, status: 'already_processed' });
}
```

**スロット容量復元** (返金時):
```sql
-- SELECT FOR UPDATE でロック取得
UPDATE lesson_slots
SET current_capacity = current_capacity - 1
WHERE id = $1 AND current_capacity > 0
```

#### セキュリティ考慮
- Stripe 署名検証 (`stripe.webhooks.constructEvent`)
- ステータス遷移の検証
- 行レベルロック（`SELECT FOR UPDATE`）

---

### 2.2 メンタースロット管理API (`8ac3071e`)

#### 目的
メンターが自身のレッスン枠を CRUD 操作できる API を提供

#### Repository 実装 (`lib/repositories/lesson-slots.repository.ts`)

```typescript
export class LessonSlotsRepository {
  // 基本CRUD
  async create(input: CreateSlotInput): Promise<LessonSlot>
  async createMany(inputs: CreateSlotInput[]): Promise<LessonSlot[]>
  async findById(slotId: string): Promise<LessonSlot | null>
  async findByIdWithMentor(slotId: string): Promise<LessonSlotWithMentor | null>
  async findMany(filters: SlotFilters): Promise<LessonSlot[]>
  async update(slotId: string, input: UpdateSlotInput): Promise<LessonSlot>
  async delete(slotId: string): Promise<void>
  async cancel(slotId: string): Promise<LessonSlot>

  // 重複チェック
  async hasConflict(
    mentorId: string,
    startTime: Date,
    endTime: Date,
    excludeSlotId?: string
  ): Promise<boolean>

  // 繰り返しスロット
  generateRecurringSlots(pattern: RecurringSlotPattern): CreateSlotInput[]
  async createRecurring(pattern: RecurringSlotPattern): Promise<{
    slots: LessonSlot[];
    recurringId: string;
  }>
  async deleteRecurringSeries(recurringId: string): Promise<void>
  async cancelFutureRecurring(recurringId: string, fromDate?: Date): Promise<number>

  // 容量管理
  async incrementCapacity(slotId: string): Promise<LessonSlot>
  async decrementCapacity(slotId: string): Promise<LessonSlot>

  // 統計
  async getMentorStats(mentorId: string, startDate?: Date, endDate?: Date): Promise<MentorSlotStats>
}
```

#### API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/mentor-slots` | スロット一覧取得（フィルター対応） |
| POST | `/api/mentor-slots` | スロット作成（単発/繰り返し） |
| GET | `/api/mentor-slots/[id]` | 単一スロット取得 |
| PUT | `/api/mentor-slots/[id]` | スロット更新 |
| DELETE | `/api/mentor-slots/[id]` | スロット削除/キャンセル |
| GET | `/api/mentor-slots/recurring/[recurringId]` | シリーズ一覧 |
| DELETE | `/api/mentor-slots/recurring/[recurringId]` | シリーズ削除 |

#### 認証・認可
- `withAuth` / `withAuthParams` ヘルパー使用
- メンター/管理者ロールのみアクセス可
- スロット所有者チェック

#### 繰り返しスロット生成アルゴリズム
```typescript
generateRecurringSlots(pattern: RecurringSlotPattern): CreateSlotInput[] {
  const slots: CreateSlotInput[] = [];
  let current = new Date(pattern.startDate);
  const end = new Date(pattern.endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (pattern.daysOfWeek.includes(dayOfWeek)) {
      // その日の startTime/endTime を構築
      slots.push({
        mentorId: pattern.mentorId,
        startTime: combineDateAndTime(current, pattern.startTime),
        endTime: combineDateAndTime(current, pattern.endTime),
        price: pattern.price,
        maxCapacity: pattern.maxCapacity,
        recurringId: pattern.recurringId,
      });
    }
    current = addDays(current, 1);
  }
  return slots;
}
```

---

### 2.3 メール通知システム (`56ca61c4`)

#### 目的
予約確定・決済完了・キャンセル・リマインダーのメール通知

#### 技術スタック
- **Resend API** (既存依存: `resend: ^6.1.0`)
- **HTML/テキスト両対応**テンプレート
- **日本語ローカライズ**

#### EmailService (`lib/services/email.service.ts`)

```typescript
class EmailService {
  private resend: Resend | null;

  // 設定確認
  isConfigured(): boolean

  // 送信メソッド
  async sendReservationConfirmationToStudent(to, data): Promise<EmailResult>
  async sendReservationNotificationToMentor(to, data): Promise<EmailResult>
  async sendPaymentCompleted(to, data): Promise<EmailResult>
  async sendCancellation(to, data): Promise<EmailResult>
  async sendReminder(to, data): Promise<EmailResult>
}
```

#### NotificationService (`lib/services/notification.service.ts`)

```typescript
class NotificationService {
  // 予約確定時（生徒・メンター両方に送信）
  async onReservationConfirmed(data: ReservationNotificationData): Promise<NotificationResult>

  // 決済完了時（生徒のみ）
  async onPaymentCompleted(data: PaymentNotificationData): Promise<NotificationResult>

  // キャンセル時（生徒・メンター両方に送信）
  async onReservationCancelled(data: CancellationNotificationData): Promise<NotificationResult>

  // リマインダー（生徒のみ）
  async sendReminder(data: ReminderNotificationData): Promise<NotificationResult>
}
```

#### メールテンプレート例

**予約確定（生徒向け）**:
```
件名: 【MUED】レッスン予約が確定しました

{studentName} 様

レッスンのご予約ありがとうございます。

■ 予約詳細
講師: {mentorName}
日時: {lessonDate} {lessonTime}
時間: {duration}
料金: {price}

予約ID: {reservationId}
```

#### Webhook との統合
```typescript
// payment_intent.succeeded 時
setImmediate(async () => {
  await notificationService.onPaymentCompleted({
    reservationId,
    studentId,
    mentorId,
    amount,
    paymentIntentId,
    startTime,
    receiptUrl,
  });
});
```

`setImmediate` で非同期実行し、Webhook レスポンスをブロックしない設計。

---

### 2.4 繰り返しスケジュールUI (`0408e146`)

#### 目的
メンターがブラウザからスロットを作成・管理できるUIを提供

#### 新規コンポーネント

**useMentorSlots Hook** (`hooks/use-mentor-slots.ts`):
```typescript
export function useMentorSlots(filters?: SlotFilters) {
  return {
    // データ
    slots: MentorSlot[],
    stats: MentorSlotStats | null,
    isLoading: boolean,
    error: string | null,

    // 操作状態
    isCreating: boolean,
    isUpdating: boolean,
    isDeleting: boolean,

    // CRUD メソッド
    createSlot: (input: CreateSlotInput) => Promise<MentorSlot | null>,
    createRecurring: (input: CreateRecurringInput) => Promise<{ slots, recurringId } | null>,
    updateSlot: (slotId, input) => Promise<MentorSlot | null>,
    deleteSlot: (slotId, action) => Promise<boolean>,
    cancelRecurringSeries: (recurringId, fromDate?) => Promise<boolean>,
    refresh: () => void,
  };
}
```

**SlotCreateForm** (`components/features/slot-create-form.tsx`):
- 単発/繰り返しトグル（Switch コンポーネント）
- 曜日選択（円形ボタン 日〜土）
- 日付範囲ピッカー（繰り返し時）
- 時刻・料金・定員入力
- 作成前プレビュー表示

**SlotList** (`components/features/slot-list.tsx`):
- 統計カード（総数・予約可能・予約済み・キャンセル）
- スロット一覧（日時・ステータス・料金・定員）
- キャンセル/削除アクション
- フィルター連携

**TeacherSlotsPage** (`app/dashboard/teacher/slots/page.tsx`):
- フィルターボタン（すべて/予約可能/予約済み/キャンセル）
- 新規作成フォーム表示トグル
- スロット一覧表示

#### 追加UIコンポーネント（shadcn/ui パターン）

| コンポーネント | 依存 |
|--------------|------|
| `components/ui/input.tsx` | - |
| `components/ui/label.tsx` | `@radix-ui/react-label` |
| `components/ui/switch.tsx` | `@radix-ui/react-switch` |

---

## 3. ファイル一覧

### 新規作成

```
app/api/mentor-slots/
├── route.ts                          # GET/POST
├── [id]/route.ts                     # GET/PUT/DELETE
└── recurring/[recurringId]/route.ts  # GET/DELETE

app/dashboard/teacher/slots/
└── page.tsx                          # スロット管理ページ

components/features/
├── slot-create-form.tsx              # 作成フォーム
└── slot-list.tsx                     # 一覧コンポーネント

components/ui/
├── input.tsx
├── label.tsx
└── switch.tsx

db/migrations/
└── 0016_add_webhook_status_tracking.sql

hooks/
└── use-mentor-slots.ts

lib/repositories/
└── lesson-slots.repository.ts

lib/services/
├── email.service.ts
└── notification.service.ts
```

### 変更

```
app/api/webhooks/stripe/route.ts      # Webhook 処理拡張
components/features/teacher-dashboard-content.tsx  # リンク追加
db/schema.ts                          # webhookStatusEnum 追加
lib/repositories/index.ts             # export 追加
package.json                          # radix-ui 依存追加
```

---

## 4. 依存関係の追加

```json
{
  "@radix-ui/react-label": "^2.x",
  "@radix-ui/react-switch": "^1.x"
}
```

既存依存（変更なし）:
- `resend: ^6.1.0`
- `stripe: ^x.x`
- `swr: ^x.x`

---

## 5. レビュー観点

### セキュリティ
- [ ] Stripe Webhook 署名検証は適切か
- [ ] API エンドポイントの認証・認可は適切か
- [ ] スロット所有者チェックは漏れなく実装されているか
- [ ] SQL インジェクション対策（Drizzle ORM 使用）

### データ整合性
- [ ] Webhook の冪等性は保証されているか
- [ ] 繰り返しスロット生成で重複は発生しないか
- [ ] スロット容量の増減は競合状態を考慮しているか

### エラーハンドリング
- [ ] API エラーレスポンスは一貫しているか
- [ ] メール送信失敗時のフォールバックは適切か
- [ ] フロントエンドのエラー表示は適切か

### パフォーマンス
- [ ] N+1 クエリは発生していないか
- [ ] 繰り返しスロット生成の上限は設定されているか
- [ ] SWR のキャッシュ戦略は適切か

### テスト
- [ ] 既存テストへの影響はないか
- [ ] 新機能のテストカバレッジは十分か

---

## 6. 既知の制限事項

1. **繰り返しスロット数の上限未設定**
   - 1年分の毎日スロットを作成すると365件生成される
   - 推奨: 最大90日または100件の制限追加

2. **メール送信の再試行なし**
   - Resend API 失敗時にリトライしない
   - 推奨: 指数バックオフ付きリトライまたはキュー導入

3. **スロット編集機能未実装**
   - SlotList に `onEdit` props はあるが、編集フォームは未実装
   - 推奨: 次フェーズで実装

4. **タイムゾーン処理**
   - サーバー側は `Asia/Tokyo` 固定
   - クライアント側はブラウザのローカルタイムゾーン
   - 推奨: 一貫したタイムゾーン処理の検討

---

## 7. テスト実行結果

```bash
npm run typecheck  # ✅ Pass
npm run build      # ✅ Pass (warnings only)
```

---

*レポート作成: Claude Code*
*レビュー依頼先: 別AI*
