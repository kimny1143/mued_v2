# MUED ビジネスロジック定義書

## 📌 ドキュメント情報

- **作成日**: 2025年10月1日
- **バージョン**: 1.0
- **目的**: MUEDプラットフォームの詳細なビジネスルールとワークフローの定義
- **対象読者**: 開発チーム、プロダクトマネージャー、ステークホルダー

---

## 🎯 概要

本文書は、MUEDプラットフォームの全ビジネスロジックを詳細に定義し、実装の指針となるワークフロー、データフロー、エラーハンドリング、トランザクション管理を規定します。

---

## 📊 コアビジネスエンティティ

### 主要エンティティ関係図

```mermaid
erDiagram
    USER ||--o{ SUBSCRIPTION : has
    USER ||--o{ LESSON_SLOT : creates
    USER ||--o{ RESERVATION : makes
    USER ||--o{ PAYMENT : makes
    USER ||--o{ AI_USAGE : tracks

    SUBSCRIPTION ||--|| PLAN : uses
    LESSON_SLOT ||--o{ RESERVATION : contains
    RESERVATION ||--|| PAYMENT : requires
    PAYMENT ||--o{ REVENUE_SHARE : generates

    ORGANIZATION ||--o{ USER : manages
    ORGANIZATION ||--|| B2B_CONTRACT : has

    USER {
        uuid id PK
        string email UK
        string role "student|mentor|admin"
        jsonb profile
        jsonb preferences
    }

    SUBSCRIPTION {
        uuid id PK
        uuid user_id FK
        string plan_id FK
        date start_date
        date end_date
        string status
        jsonb usage_limits
    }

    PLAN {
        string id PK
        string name
        decimal price
        jsonb features
        jsonb limits
    }
```

---

## 💰 1. サブスクリプション管理

### 1.1 プラン定義

| プラン | 月額料金 | AI教材制限 | レッスン予約 | 特典 |
|-------|---------|-----------|-------------|------|
| **フリーミアム** | ¥0 | 3本/月 | 1件/月 | 広告表示 |
| **Starter** | ¥500 | 3本/月 | 1件/月 | 広告表示 |
| **Basic** | ¥2,480 | 無制限 | 5件/月 | チャットサポート |
| **Premium** | ¥5,980 | 無制限+PDF | 無制限 | 優先マッチング |

### 1.2 プラン変更ワークフロー

```mermaid
stateDiagram-v2
    [*] --> 現在プラン確認
    現在プラン確認 --> アップグレード判定
    現在プラン確認 --> ダウングレード判定

    アップグレード判定 --> 即時適用
    即時適用 --> 差額請求
    差額請求 --> Stripe決済
    Stripe決済 --> プラン更新

    ダウングレード判定 --> 次回請求日待機
    次回請求日待機 --> プラン更新

    プラン更新 --> 機能制限更新
    機能制限更新 --> 通知送信
    通知送信 --> [*]
```

### 1.3 使用量制限ロジック

```typescript
interface UsageLimit {
  planId: string;
  limits: {
    aiMaterials: number | 'unlimited';
    monthlyReservations: number | 'unlimited';
    pdfImport: boolean;
    priorityMatching: boolean;
    adsDisplay: boolean;
  };
}

class UsageTracker {
  async checkLimit(userId: string, feature: string): Promise<boolean> {
    const subscription = await getActiveSubscription(userId);
    const usage = await getCurrentMonthUsage(userId, feature);
    const limit = subscription.plan.limits[feature];

    if (limit === 'unlimited') return true;
    if (usage >= limit) {
      await logLimitExceeded(userId, feature);
      return false;
    }
    return true;
  }

  async incrementUsage(userId: string, feature: string): Promise<void> {
    await db.transaction(async (tx) => {
      const current = await tx.select(usage).where(eq(usage.userId, userId));
      await tx.update(usage).set({
        [feature]: current[feature] + 1,
        lastUpdated: new Date()
      });
    });
  }
}
```

---

## 🎓 2. レッスン予約システム

### 2.1 予約作成フロー

```mermaid
sequenceDiagram
    participant 学生
    participant システム
    participant メンター
    participant 決済
    participant 通知

    学生->>システム: レッスン検索
    システム-->>学生: 利用可能スロット表示
    学生->>システム: スロット選択
    システム->>システム: 在庫確認

    alt スロット利用可能
        システム->>システム: 仮予約作成（5分間）
        システム->>決済: 決済処理開始
        決済-->>システム: 決済成功
        システム->>システム: 予約確定
        システム->>メンター: 予約通知
        システム->>学生: 確認メール
        システム->>通知: カレンダー招待送信
    else スロット利用不可
        システム-->>学生: エラー: スロット満員
    end
```

### 2.2 予約ステータス管理

```typescript
enum ReservationStatus {
  PENDING = 'pending',           // 仮予約（決済待ち）
  CONFIRMED = 'confirmed',       // 確定
  CANCELLED = 'cancelled',       // キャンセル済み
  COMPLETED = 'completed',       // 完了
  NO_SHOW = 'no_show',          // 無断欠席
  REFUNDED = 'refunded'         // 返金済み
}

interface ReservationRules {
  // 仮予約の有効期限（分）
  pendingTimeout: 5;

  // キャンセル可能期限（時間前）
  cancellationDeadline: 24;

  // 返金ルール
  refundPolicy: {
    '48h': 1.0,    // 48時間前: 100%返金
    '24h': 0.5,    // 24時間前: 50%返金
    '0h': 0.0      // 当日: 返金なし
  };
}
```

### 2.3 キャンセル処理

```mermaid
flowchart TB
    Start([キャンセルリクエスト]) --> CheckTime{24時間前?}

    CheckTime -->|Yes| ProcessRefund[返金処理]
    CheckTime -->|No| NoRefund[返金不可通知]

    ProcessRefund --> CalculateAmount[返金額計算]
    CalculateAmount --> StripeRefund[Stripe返金API]
    StripeRefund --> UpdateStatus[ステータス更新]

    NoRefund --> UpdateStatus
    UpdateStatus --> NotifyParties[関係者通知]
    NotifyParties --> ReleaseSlot[スロット解放]
    ReleaseSlot --> End([完了])
```

---

## 💳 3. 決済・レベニューシェア

### 3.1 決済フロー

```mermaid
sequenceDiagram
    participant ユーザー
    participant フロントエンド
    participant API
    participant Stripe
    participant DB

    ユーザー->>フロントエンド: 支払い情報入力
    フロントエンド->>API: 決済リクエスト
    API->>API: 冪等性キー生成
    API->>Stripe: PaymentIntent作成
    Stripe-->>API: PaymentIntent ID
    API->>DB: 決済記録（pending）
    API-->>フロントエンド: Client Secret
    フロントエンド->>Stripe: 決済確認
    Stripe->>API: Webhook（決済完了）
    API->>DB: 決済記録更新
    API->>API: レベニューシェア計算
    API->>DB: 収益分配記録
```

### 3.2 レベニューシェア計算

```typescript
interface RevenueShareConfig {
  mentorShare: 0.7;        // メンター取り分: 70%
  platformShare: 0.3;      // プラットフォーム: 30%
  stripeFeePayer: 'platform';  // Stripe手数料負担者
}

class RevenueCalculator {
  calculate(lessonPrice: number): RevenueBreakdown {
    const stripeFee = lessonPrice * 0.036 + 30;  // 3.6% + ¥30
    const netAmount = lessonPrice - stripeFee;

    return {
      grossAmount: lessonPrice,
      stripeFee: stripeFee,
      mentorRevenue: netAmount * 0.7,
      platformRevenue: netAmount * 0.3,
      paymentSchedule: this.getPaymentSchedule()
    };
  }

  private getPaymentSchedule(): PaymentSchedule {
    return {
      mentor: '月末締め翌月15日払い',
      minimumPayout: 5000,  // 最低支払額
      method: 'bank_transfer'
    };
  }
}
```

### 3.3 支払いスケジュール

```mermaid
gantt
    title 月次支払いサイクル
    dateFormat  DD
    axisFormat  %d日

    section レッスン実施
    レッスン期間           :01, 30d

    section 集計・処理
    売上集計              :31, 3d
    支払い計算            :33, 2d
    承認プロセス          :35, 2d

    section 支払い実行
    メンター振込          :15, 1d
    支払い通知            :15, 1d
```

---

## 🤖 4. AI機能管理

### 4.1 AI教材生成フロー

```mermaid
flowchart TB
    Start([リクエスト]) --> CheckQuota{使用量確認}

    CheckQuota -->|制限内| GeneratePrompt[プロンプト生成]
    CheckQuota -->|制限超過| ShowUpgrade[アップグレード提案]

    GeneratePrompt --> CallAI[Claude/GPT API]
    CallAI --> ProcessResponse[レスポンス処理]

    ProcessResponse --> SaveMaterial[教材保存]
    SaveMaterial --> UpdateUsage[使用量更新]
    UpdateUsage --> LogCost[コスト記録]
    LogCost --> End([完了])

    ShowUpgrade --> End
```

### 4.2 AI使用量管理

```typescript
interface AIUsageTracking {
  userId: string;
  month: Date;
  usage: {
    materials: {
      count: number;
      tokens: number;
      cost: number;
    };
    matching: {
      requests: number;
      cost: number;
    };
  };
  limits: {
    materials: number | 'unlimited';
    dailyTokens: number;
  };
}

class AIQuotaManager {
  async canGenerate(userId: string): Promise<QuotaStatus> {
    const subscription = await getSubscription(userId);
    const currentUsage = await getMonthlyUsage(userId);

    if (subscription.plan === 'freemium' || subscription.plan === 'starter') {
      if (currentUsage.materials >= 3) {
        return {
          allowed: false,
          reason: 'monthly_limit_exceeded',
          upgradeRequired: true
        };
      }
    }

    // トークン制限チェック
    if (currentUsage.dailyTokens >= MAX_DAILY_TOKENS) {
      return {
        allowed: false,
        reason: 'daily_token_limit',
        resetAt: getTomorrowMidnight()
      };
    }

    return { allowed: true };
  }
}
```

### 4.3 メンターマッチングアルゴリズム

```typescript
interface MatchingCriteria {
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  availability: TimeSlot[];
  priceRange: { min: number; max: number };
  preferredLanguage: string;
  teachingStyle: string[];
}

class MentorMatcher {
  async findMatches(criteria: MatchingCriteria, isPremium: boolean): Promise<Mentor[]> {
    let query = db.select()
      .from(mentors)
      .where(
        and(
          eq(mentors.subject, criteria.subject),
          gte(mentors.price, criteria.priceRange.min),
          lte(mentors.price, criteria.priceRange.max)
        )
      );

    // プレミアムユーザーは優先マッチング
    if (isPremium) {
      query = query.orderBy(
        desc(mentors.rating),
        desc(mentors.responseRate),
        asc(mentors.price)
      );
    } else {
      query = query.orderBy(
        desc(mentors.rating),
        asc(mentors.price)
      );
    }

    const results = await query.limit(isPremium ? 20 : 10);
    return this.scoreAndRank(results, criteria);
  }
}
```

---

## 🏢 5. B2B機能

### 5.1 組織管理構造

```mermaid
graph TB
    Organization[組織] --> Admin[管理者]
    Organization --> Members[メンバー]
    Organization --> Billing[請求管理]

    Admin --> UserManagement[ユーザー管理]
    Admin --> Analytics[分析ダッシュボード]
    Admin --> Settings[組織設定]

    Members --> Students[学生]
    Members --> Instructors[講師]

    Billing --> Subscription[サブスクリプション]
    Billing --> Usage[使用量]
    Billing --> Invoice[請求書]
```

### 5.2 API使用量課金

```typescript
interface APIUsageBilling {
  organizationId: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  usage: {
    requests: {
      count: number;
      breakdown: {
        endpoint: string;
        count: number;
        cost: number;
      }[];
    };
    dataTransfer: {
      gb: number;
      cost: number;
    };
  };
  pricing: {
    model: 'payAsYouGo' | 'committed' | 'enterprise';
    rates: {
      request: number;      // ¥/リクエスト
      dataTransfer: number; // ¥/GB
    };
    commitment?: {
      monthly: number;
      included: {
        requests: number;
        dataTransfer: number;
      };
    };
  };
}

class APIBillingCalculator {
  calculate(usage: APIUsageBilling): Invoice {
    let total = 0;

    if (usage.pricing.model === 'payAsYouGo') {
      total = usage.usage.requests.count * usage.pricing.rates.request
            + usage.usage.dataTransfer.gb * usage.pricing.rates.dataTransfer;
    } else if (usage.pricing.model === 'committed') {
      const overageRequests = Math.max(0,
        usage.usage.requests.count - usage.pricing.commitment.included.requests
      );
      const overageData = Math.max(0,
        usage.usage.dataTransfer.gb - usage.pricing.commitment.included.dataTransfer
      );

      total = usage.pricing.commitment.monthly
            + overageRequests * usage.pricing.rates.request * 1.5  // 超過分は1.5倍
            + overageData * usage.pricing.rates.dataTransfer * 1.5;
    }

    return {
      organizationId: usage.organizationId,
      amount: total,
      breakdown: this.generateBreakdown(usage),
      dueDate: this.calculateDueDate()
    };
  }
}
```

### 5.3 SSO/SAML統合

```mermaid
sequenceDiagram
    participant User
    participant MUED
    participant IdP[組織のIdP]
    participant DB

    User->>MUED: アクセス試行
    MUED->>MUED: 組織ドメイン識別
    MUED->>User: SSOリダイレクト
    User->>IdP: 認証リクエスト
    IdP->>User: 認証チャレンジ
    User->>IdP: 認証情報提供
    IdP->>MUED: SAMLアサーション
    MUED->>MUED: アサーション検証
    MUED->>DB: ユーザー情報同期
    MUED->>User: セッション作成
```

---

## 🔄 6. トランザクション管理

### 6.1 重要トランザクションの定義

```typescript
interface CriticalTransactions {
  // 決済関連は必ず分散トランザクション
  payment: {
    isolation: 'SERIALIZABLE';
    timeout: 30000;  // 30秒
    retries: 3;
    compensationAction: 'refund';
  };

  // 予約作成は楽観的ロック
  reservation: {
    isolation: 'READ_COMMITTED';
    timeout: 10000;  // 10秒
    retries: 5;
    conflictResolution: 'optimistic_lock';
  };

  // レベニューシェアは遅延実行
  revenueShare: {
    isolation: 'READ_COMMITTED';
    execution: 'deferred';  // バッチ処理
    schedule: 'daily_02:00';
  };
}
```

### 6.2 Sagaパターン実装

```mermaid
graph LR
    Start[開始] --> Reserve[予約作成]
    Reserve --> Payment[決済処理]
    Payment --> Notify[通知送信]
    Notify --> Complete[完了]

    Payment -.->|失敗| CompReserve[予約取消]
    Notify -.->|失敗| CompPayment[決済取消]
    CompPayment -.-> CompReserve
    CompReserve -.-> Rollback[ロールバック完了]
```

---

## ⚠️ 7. エラーハンドリング

### 7.1 エラー分類と対応

| エラータイプ | コード範囲 | リトライ | ユーザー表示 | ログレベル |
|------------|-----------|---------|------------|-----------|
| **検証エラー** | 400-409 | なし | 詳細メッセージ | INFO |
| **認証エラー** | 401-403 | なし | 一般メッセージ | WARN |
| **ビジネスエラー** | 422 | なし | 詳細メッセージ | INFO |
| **一時的エラー** | 503 | 自動3回 | リトライ中 | WARN |
| **システムエラー** | 500-502 | なし | 一般メッセージ | ERROR |

### 7.2 エラー処理フロー

```typescript
class ErrorHandler {
  async handle(error: AppError): Promise<ErrorResponse> {
    // ロギング
    await this.log(error);

    // 通知（重大度による）
    if (error.severity >= ErrorSeverity.HIGH) {
      await this.notifyOps(error);
    }

    // 補償処理
    if (error.requiresCompensation) {
      await this.compensate(error);
    }

    // ユーザー応答
    return {
      code: error.code,
      message: this.getUserMessage(error),
      retryAfter: error.retryAfter,
      supportId: error.trackingId
    };
  }
}
```

---

## 📈 8. 分析・レポーティング

### 8.1 KPIトラッキング

```mermaid
graph TB
    subgraph "ビジネスKPI"
        MRR[月次経常収益]
        CAC[顧客獲得コスト]
        LTV[顧客生涯価値]
        Churn[チャーン率]
    end

    subgraph "オペレーションKPI"
        Bookings[予約数]
        Completion[完了率]
        Satisfaction[満足度]
        ResponseTime[応答時間]
    end

    subgraph "技術KPI"
        Uptime[稼働率]
        Latency[レイテンシ]
        ErrorRate[エラー率]
        AIUsage[AI使用効率]
    end
```

### 8.2 自動レポート生成

```typescript
interface ReportSchedule {
  daily: {
    time: '09:00';
    reports: ['bookings', 'revenue', 'errors'];
    recipients: ['ops-team'];
  };

  weekly: {
    day: 'monday';
    time: '10:00';
    reports: ['kpi-summary', 'mentor-performance', 'user-growth'];
    recipients: ['management'];
  };

  monthly: {
    day: 1;
    time: '11:00';
    reports: ['financial', 'growth-metrics', 'ai-usage-cost'];
    recipients: ['executives', 'investors'];
  };
}
```

---

## 🔐 9. セキュリティポリシー

### 9.1 データアクセス制御

```typescript
interface AccessControl {
  roles: {
    student: {
      read: ['own_profile', 'lessons', 'materials'];
      write: ['own_profile', 'reservations', 'reviews'];
      delete: ['own_reservations'];
    };

    mentor: {
      read: ['own_profile', 'own_lessons', 'student_profiles', 'analytics'];
      write: ['own_profile', 'lesson_slots', 'materials'];
      delete: ['own_lessons', 'own_materials'];
    };

    admin: {
      read: ['*'];
      write: ['*'];
      delete: ['*'];
      audit: true;
    };
  };
}
```

### 9.2 データ暗号化

```mermaid
graph TB
    subgraph "保存時暗号化"
        DB[(データベース)]
        Storage[(ファイルストレージ)]
        Backup[(バックアップ)]
    end

    subgraph "転送時暗号化"
        TLS[TLS 1.3]
        API[API通信]
        Webhook[Webhook]
    end

    subgraph "アプリケーション層暗号化"
        PII[個人情報]
        Payment[決済情報]
        Medical[医療情報]
    end
```

---

## 📋 10. コンプライアンス要件

### 10.1 個人情報保護

| 要件 | 実装 | 監査頻度 |
|------|------|---------|
| **データ最小化** | 必要最小限の情報のみ収集 | 四半期 |
| **同意管理** | 明示的な同意取得・記録 | 月次 |
| **アクセス権** | ユーザーデータのエクスポート機能 | 随時 |
| **削除権** | アカウント削除・データ消去 | 随時 |
| **暗号化** | AES-256による暗号化 | 年次 |

### 10.2 決済セキュリティ（PCI-DSS）

```typescript
interface PCICompliance {
  // カード情報は保存しない
  cardDataStorage: 'none';

  // Stripeトークン化を使用
  tokenization: 'stripe';

  // 監査ログ
  auditLogging: {
    retention: '7years';
    encryption: true;
    immutable: true;
  };

  // セキュリティスキャン
  scanning: {
    frequency: 'quarterly';
    scope: ['network', 'application'];
  };
}
```

---

## 🚀 実装優先順位

### フェーズ1: 基本収益機能（1-2週間）

1. サブスクリプション管理
2. レベニューシェア計算
3. AI使用量制限

### フェーズ2: 拡張機能（1ヶ月）

4. B2B API基盤
5. 高度な分析機能
6. マーケティング統合

### フェーズ3: エンタープライズ（3ヶ月）

7. SSO/SAML統合
8. ホワイトラベル機能
9. 高度なコンプライアンス

---

## 📝 改訂履歴

| バージョン | 日付 | 変更内容 | 承認者 |
|-----------|------|---------|--------|
| 1.0 | 2025-10-01 | 初版作成 | システムアーキテクチャチーム |

---

**次回レビュー予定**: 2025年10月15日

*この文書は実装の進捗に応じて継続的に更新されます*