# キャンセル・リスケジュールポリシー実装 TODO チェックリスト

## 📋 実装概要
- **目標**: レッスンキャンセル・リスケジュールポリシーの実装
- **期間**: 約4週間（6フェーズ）
- **担当者**: 開発チーム全員

---

## 🗓️ Phase 1: 基盤整備（1週間）

### 1.1 データベーススキーマ変更
- [x] **Prismaスキーマ更新**
  - ファイル: `prisma/schema.prisma`
  - 追加フィールド:
    ```prisma
    model reservations {
      // 既存フィールド...
      canceledAt      DateTime?
      canceledBy      String?
      cancelReason    CancelReason?
      rescheduledFrom String?
      rescheduledTo   String?
    }
    
    model payments {
      // 既存フィールド...
      chargeExecutedAt DateTime?
      refundedAt       DateTime?
      refundAmount     Int?
      refundReason     String?
    }
    
    enum CancelReason {
      STUDENT_REQUEST
      MENTOR_REQUEST
      ADMIN_REQUEST
      EMERGENCY
      SYSTEM_ERROR
    }
    ```

- [x] **マイグレーションファイル作成**
  - ✅ SQLは既にSupabaseに適用済み
  - ✅ Prismaスキーマを`db pull`で同期済み

- [x] **Prismaクライアント再生成**
  - コマンド: `npx prisma generate`

### 1.2 型定義更新
- [x] **TypeScript型定義追加**
  - ファイル: `lib/types/reservation.ts`
  - ✅ CancellationData, RefundData, CancelReservationRequest等の型定義を追加
  - ✅ ReservationWithCancellation, NotificationData等の拡張型も追加
  ```typescript
  export interface CancellationData {
    canceledAt?: Date;
    canceledBy?: string;
    cancelReason?: CancelReason;
    rescheduledFrom?: string;
    rescheduledTo?: string;
  }
  
  export interface RefundData {
    refundedAt?: Date;
    refundAmount?: number;
    refundReason?: string;
  }
  ```

### 1.3 基本APIエンドポイント作成
- [x] **キャンセルAPIエンドポイント作成**
  - ファイル: `app/api/reservations/[id]/cancel/route.ts`
  - ✅ 基本構造と予約存在確認を実装（詳細実装はPhase 3）

- [x] **リスケジュールAPIエンドポイント作成**
  - ファイル: `app/api/reservations/[id]/reschedule/route.ts`
  - ✅ 基本構造と予約・スロット存在確認を実装（詳細実装はPhase 4）

---

## 🗓️ Phase 2: 決済フロー変更（1週間）

**進捗状況**: ✅ Phase 2完了（2.1, 2.2, 2.3すべて実装済み）

### 2.1 Setup Intent処理の改善
- [x] **Setup Intent専用エンドポイント作成**
  - ファイル: `app/api/reservations/[id]/setup-payment/route.ts`
  - ✅ Setup Intentでカード情報保存機能を実装
  - ✅ paymentsテーブルに`SETUP_COMPLETED`で記録
  - ✅ reservationステータスは`APPROVED`維持

- [x] **Setup Intent完了処理**
  - ファイル: `app/api/reservations/complete-setup/route.ts`
  - ✅ Setup Intent完了後の処理を実装
  - ✅ 決済方法IDの保存機能を追加
  - ✅ メタデータの更新機能を実装

### 2.2 決済実行スケジューラー実装
- [x] **Cronジョブエンドポイント作成**
  - ファイル: `app/api/cron/execute-payments/route.ts`
  - ✅ レッスン開始2時間前の予約検索機能を実装
  - ✅ SETUP_COMPLETED状態の決済を自動実行
  - ✅ Payment Intent作成→即座に実行→DB更新の処理フローを実装
  - 機能:
    ```typescript
    export async function GET() {
      // 1. レッスン開始2時間前の予約検索
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const reservations = await prisma.reservations.findMany({
        where: {
          status: 'APPROVED',
          bookedStartTime: {
            lte: twoHoursFromNow,
            gte: new Date()
          },
          payments: {
            status: 'SETUP_COMPLETED'
          }
        },
        include: { payments: true }
      });
      
      // 2. Payment Intent実行
      // 3. 成功時にCONFIRMED更新
    }
    ```

- [x] **Vercel Cronジョブ設定**
  - ファイル: `vercel.json`
  - ✅ 5分間隔での実行設定を追加
  - 設定:
    ```json
    {
      "crons": [
        {
          "path": "/api/cron/execute-payments",
          "schedule": "*/5 * * * *"
        }
      ]
    }
    ```

### 2.3 既存決済フローとの互換性確保
- [x] **決済フロー判定ロジック追加**
  - ファイル: `lib/payment-flow.ts`
  - ✅ 新旧決済フローの判定ロジックを実装
  - ✅ 決済実行タイミングの計算機能を追加
  - ✅ 決済ステータスに基づく次のアクション決定機能を実装
  - ✅ 移行期間中の特別処理を追加

- [x] **決済フロー統合ミドルウェア作成**
  - ファイル: `lib/payment-middleware.ts`
  - ✅ 予約作成時の決済フロー自動判定機能を実装
  - ✅ 新旧フロー統合のためのAPI応答ヘルパーを作成
  - ✅ 移行期間中のユーザー通知メッセージ生成機能を追加

- [x] **Cronジョブの決済フロー統合**
  - ファイル: `app/api/cron/execute-payments/route.ts`
  - ✅ 新フロー対象の予約のみを処理するように修正
  - ✅ 実行タイミング判定ロジックを統合

今後の改善点
Phase 3（キャンセル機能）の実装準備が整いました
決済フロー統合ミドルウェアを既存の予約作成エンドポイントに統合する必要があります
移行期間終了後（30日後）の旧フロー削除計画を検討する必要があります
注意点・改善提案
新ポリシー適用日（2024-07-01）は設定可能にすることを推奨
Cronジョブの実行ログを詳細化し、監視機能を強化することを推奨
決済フロー判定ロジックのユニットテストを追加することを推奨

---

## 🗓️ Phase 3: キャンセル機能（3-4日）

### 3.1 キャンセルポリシーロジック実装
- [ ] **キャンセルポリシークラス作成**
  - ファイル: `lib/cancellation-policy.ts`
  ```typescript
  import { differenceInHours } from 'date-fns';
  
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

### 3.2 キャンセルAPI実装
- [ ] **キャンセルエンドポイント完成**
  - ファイル: `app/api/reservations/[id]/cancel/route.ts`
  - 実装内容:
    ```typescript
    export async function POST(request: NextRequest) {
      // 1. 認証・権限チェック
      // 2. 予約存在確認
      // 3. キャンセル可能時間チェック
      // 4. 決済状態確認
      // 5. Stripe返金処理（必要時）
      // 6. DB更新（トランザクション）
      // 7. メール通知送信
    }
    ```

### 3.3 Stripe返金処理実装
- [ ] **返金処理関数作成**
  - ファイル: `lib/stripe-refund.ts`
  ```typescript
  export async function processRefund(
    paymentIntentId: string,
    refundAmount: number,
    reason: string
  ): Promise<Stripe.Refund> {
    return await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: { reason }
    });
  }
  ```

---

## 🗓️ Phase 4: リスケジュール機能（3-4日）

### 4.1 リスケジュールAPI実装
- [ ] **リスケジュールエンドポイント完成**
  - ファイル: `app/api/reservations/[id]/reschedule/route.ts`
  - 実装内容:
    ```typescript
    export async function POST(request: NextRequest) {
      const { newSlotId, newStartTime, newEndTime } = await request.json();
      
      // 1. 権限チェック（講師・管理者のみ）
      // 2. 新しい時間枠の空き確認
      // 3. トランザクション処理:
      //    - 元予約をCANCELED状態に
      //    - 新予約作成（決済情報引き継ぎ）
      //    - rescheduledFrom/To関連付け
      // 4. メール通知送信
    }
    ```

### 4.2 予約関連付け処理
- [ ] **リスケジュール履歴管理**
  - ファイル: `lib/reschedule-history.ts`
  ```typescript
  export async function createRescheduleRecord(
    originalReservationId: string,
    newReservationId: string
  ) {
    await prisma.$transaction([
      prisma.reservations.update({
        where: { id: originalReservationId },
        data: { 
          status: 'CANCELED',
          rescheduledTo: newReservationId,
          cancelReason: 'MENTOR_REQUEST'
        }
      }),
      prisma.reservations.update({
        where: { id: newReservationId },
        data: { rescheduledFrom: originalReservationId }
      })
    ]);
  }
  ```

---

## 🗓️ Phase 5: メール通知（1週間）

### 5.1 メールテンプレート作成
- [ ] **24時間前リマインダーテンプレート**
  - ファイル: `lib/email-templates/payment-reminder.ts`
  ```typescript
  export function generate24HourPaymentReminderEmail({
    studentName,
    teacherName,
    startTime,
    reservationId
  }: {
    studentName: string;
    teacherName: string;
    startTime: Date;
    reservationId: string;
  }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>レッスン24時間前のお知らせ - MUED LMS</title>
      </head>
      <body>
        <h1>レッスン24時間前のお知らせ</h1>
        <p>${studentName}様、</p>
        <p>明日のレッスンまで24時間を切りました。</p>
        <p>決済が自動実行され、レッスンが確定されます。</p>
        <!-- 詳細なHTMLテンプレート -->
      </body>
      </html>
    `;
  }
  ```

- [ ] **キャンセル通知テンプレート**
  - ファイル: `lib/email-templates/cancellation-notice.ts`

- [ ] **リスケジュール通知テンプレート**
  - ファイル: `lib/email-templates/reschedule-notice.ts`

- [ ] **返金通知テンプレート**
  - ファイル: `lib/email-templates/refund-notice.ts`

### 5.2 通知トリガー実装
- [ ] **リマインダーCronジョブ**
  - ファイル: `app/api/cron/send-reminders/route.ts`
  ```typescript
  export async function GET() {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reservations = await findReservationsStartingIn24Hours(tomorrow);
    
    for (const reservation of reservations) {
      await sendEmail({
        to: reservation.users.email,
        subject: 'レッスン24時間前のお知らせ',
        html: generate24HourPaymentReminderEmail(reservation)
      });
    }
  }
  ```

### 5.3 Cronジョブ設定
- [ ] **Vercel Cron設定更新**
  - ファイル: `vercel.json`
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/execute-payments",
        "schedule": "*/15 * * * *"
      },
      {
        "path": "/api/cron/send-reminders",
        "schedule": "0 9 * * *"
      }
    ]
  }
  ```

---

## 🗓️ Phase 6: UI実装とテスト（3-4日）

### 6.1 予約詳細画面UI
- [ ] **キャンセルボタンコンポーネント**
  - ファイル: `app/components/reservations/CancelReservationButton.tsx`
  ```tsx
  interface CancelReservationButtonProps {
    reservationId: string;
    canCancel: boolean;
    onCancel: (id: string) => void;
  }
  
  export function CancelReservationButton({
    reservationId,
    canCancel,
    onCancel
  }: CancelReservationButtonProps) {
    // キャンセル確認ダイアログ
    // キャンセル理由入力
    // API呼び出し
  }
  ```

- [ ] **リスケジュールボタンコンポーネント**
  - ファイル: `app/components/reservations/RescheduleReservationButton.tsx`

- [ ] **返金処理ボタンコンポーネント（管理者用）**
  - ファイル: `app/components/reservations/RefundProcessButton.tsx`

### 6.2 予約詳細画面更新
- [ ] **予約詳細ページ更新**
  - ファイル: `app/dashboard/reservations/[id]/page.tsx`
  - 追加機能:
    - キャンセル・リスケジュールボタン表示
    - 権限に基づく表示制御
    - 返金処理UI（管理者のみ）

### 6.3 テスト実装
- [ ] **ユニットテスト作成**
  - ファイル: `tests/unit/cancellation-policy.test.ts`
  - テスト内容:
    - キャンセル可能時間の判定
    - キャンセル料計算
    - 権限チェック

- [ ] **APIテスト作成**
  - ファイル: `tests/api/reservations-cancel.test.ts`
  - テスト内容:
    - キャンセルAPI正常系
    - キャンセルAPI異常系
    - 権限エラー

- [ ] **E2Eテスト作成**
  - ファイル: `tests/e2e/cancellation-flow.spec.ts`
  - テスト内容:
    - 生徒によるキャンセルフロー
    - 講師によるリスケジュールフロー
    - 管理者による返金処理

---

## 🔍 最終チェックリスト

### セキュリティチェック
- [ ] **権限チェック実装確認**
  - 生徒は自分の予約のみキャンセル可能
  - 講師・管理者のみリスケジュール可能
  - 管理者のみ返金処理可能

- [ ] **入力値検証実装確認**
  - キャンセル理由の妥当性チェック
  - 日時の妥当性チェック
  - 金額の妥当性チェック

### パフォーマンスチェック
- [ ] **データベースクエリ最適化**
  - インデックス追加確認
  - N+1問題の回避
  - トランザクション処理の最適化

- [ ] **Stripe API呼び出し最適化**
  - レート制限対応
  - エラーハンドリング
  - リトライ機構

### 運用チェック
- [ ] **ログ出力実装**
  - キャンセル・リスケジュール操作のログ
  - 返金処理のログ
  - エラーログの詳細化

- [ ] **監視設定**
  - Cronジョブの実行監視
  - メール送信成功率監視
  - 決済処理成功率監視

---

## 📝 完了報告

各フェーズ完了時に以下の報告を行う：

### 報告内容
- [ ] **実装完了項目の確認**
- [ ] **テスト結果の報告**
- [ ] **発見された課題と対応策**
- [ ] **次フェーズへの引き継ぎ事項**

### 最終リリース前チェック
- [ ] **本番環境での動作確認**
- [ ] **ロールバック手順の確認**
- [ ] **ユーザー向けドキュメント更新**
- [ ] **サポートチームへの情報共有**

---

**📅 実装期間**: 2024年7月1日 〜 2024年7月31日  
**👥 担当者**: 開発チーム全員  
**📞 緊急連絡先**: プロジェクトマネージャー 