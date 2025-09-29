# Core API 統一計画

## 現状分析

### 問題点
1. **v1/v2の混在**
   - `/api/lesson-slots/` (v1)
   - `/api/lesson-slots-v2/` (v2)
   - `/api/lesson-slots/v2/active/` (混在)
   - `/api/sessions/v2/today/` (混在)

2. **ディレクトリ構造の不統一**
   - フラット構造とネスト構造が混在
   - 同じ機能が複数箇所に分散

3. **重複コード**
   - lesson-slots/route.ts: 800行以上の巨大ファイル
   - 同じロジックが複数箇所に存在

## 統一方針

### 新しいディレクトリ構造

```
app/api/
├── scheduling/           # スケジューリング関連
│   ├── slots/
│   │   ├── route.ts      # GET (一覧), POST (作成)
│   │   └── [id]/
│   │       └── route.ts  # GET, PUT, DELETE (個別操作)
│   ├── availability/
│   │   └── route.ts      # 空き状況確認
│   └── calendar/
│       └── sync/
│           └── route.ts  # カレンダー同期
│
├── payments/             # 決済関連
│   ├── checkout/
│   │   ├── route.ts      # チェックアウトセッション作成
│   │   └── status/
│   │       └── route.ts  # ステータス確認
│   ├── subscriptions/
│   │   └── route.ts      # サブスクリプション管理
│   └── webhooks/
│       └── stripe/
│           └── route.ts  # Stripe Webhook
│
├── reservations/         # 予約関連
│   ├── route.ts          # GET (一覧), POST (作成)
│   └── [id]/
│       ├── route.ts      # GET, PUT, DELETE
│       ├── approve/
│       │   └── route.ts  # 承認
│       ├── cancel/
│       │   └── route.ts  # キャンセル
│       └── reschedule/
│           └── route.ts  # リスケジュール
│
├── users/                # ユーザー管理
│   ├── route.ts          # プロフィール
│   ├── subscription/
│   │   └── route.ts      # サブスク情報
│   └── roles/
│       └── route.ts      # ロール管理
│
├── sessions/             # レッスンセッション
│   ├── route.ts          # GET (一覧), POST (作成)
│   └── [id]/
│       ├── route.ts      # GET, PUT
│       ├── start/
│       │   └── route.ts  # 開始
│       ├── end/
│       │   └── route.ts  # 終了
│       └── feedback/
│           └── route.ts  # フィードバック
│
├── materials/            # 教材管理（新規）
│   ├── route.ts
│   └── [id]/
│       └── route.ts
│
└── cron/                 # CRON処理
    ├── payments/
    │   └── route.ts
    └── status-update/
        └── route.ts
```

## 実装手順

### Phase 1: scheduling API統一（今週）

#### 1.1 既存コードの整理
```typescript
// 旧: /api/lesson-slots/route.ts
// 旧: /api/lesson-slots-v2/route.ts
// ↓
// 新: /api/scheduling/slots/route.ts
```

#### 1.2 共通ロジックの抽出
```typescript
// lib/services/scheduling.service.ts
export class SchedulingService {
  async getAvailableSlots(params: GetSlotsParams) { ... }
  async createSlot(data: CreateSlotData) { ... }
  async updateSlot(id: string, data: UpdateSlotData) { ... }
}
```

#### 1.3 エンドポイントの移行
- [x] GET /api/scheduling/slots - スロット一覧取得
- [ ] POST /api/scheduling/slots - スロット作成
- [ ] GET /api/scheduling/slots/[id] - 個別スロット取得
- [ ] PUT /api/scheduling/slots/[id] - スロット更新
- [ ] DELETE /api/scheduling/slots/[id] - スロット削除

### Phase 2: payments API統一（来週）

#### 2.1 Stripe関連の統合
```typescript
// 旧: /api/checkout/route.ts
// 旧: /api/checkout-session/route.ts
// ↓
// 新: /api/payments/checkout/route.ts
```

#### 2.2 決済サービスの作成
```typescript
// lib/services/payment.service.ts
export class PaymentService {
  async createCheckoutSession(params: CheckoutParams) { ... }
  async handleWebhook(event: Stripe.Event) { ... }
}
```

### Phase 3: reservations API統一

#### 3.1 予約フローの統合
```typescript
// 旧: /api/reservations/route.ts
// 旧: /api/my-reservations/route.ts
// ↓
// 新: /api/reservations/route.ts (統一)
```

## 移行戦略

### 1. 並行運用期間（2週間）
- 新旧両方のAPIを動作させる
- クライアントを段階的に新APIに移行

### 2. クライアント側の変更
```typescript
// 旧
const response = await fetch('/api/lesson-slots');
// ↓
// 新
const response = await fetch('/api/scheduling/slots');
```

### 3. 環境変数による切り替え
```typescript
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v2';
const apiPath = API_VERSION === 'v2'
  ? '/api/scheduling/slots'
  : '/api/lesson-slots';
```

## 成功指標

1. **コード削減**: 重複コード50%削減
2. **レスポンス速度**: API応答時間30%改善
3. **保守性**: 1ファイル300行以内
4. **テストカバレッジ**: 80%以上

## リスクと対策

| リスク | 対策 |
|--------|------|
| 既存機能の破壊 | 並行運用期間を設ける |
| クライアント側の影響 | 環境変数で切り替え可能に |
| データ整合性 | トランザクション処理の強化 |

## タイムライン

- **Week 1**: scheduling API統一
- **Week 2**: payments API統一
- **Week 3**: reservations API統一
- **Week 4**: 旧API削除、最終テスト

## 次のアクション

1. scheduling/slots/route.ts の作成
2. SchedulingService クラスの実装
3. 既存のlesson-slotsからロジック移植
4. テストの作成