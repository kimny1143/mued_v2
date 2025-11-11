# MUED v2 アーキテクチャ図（Mermaid版）

**作成日**: 2025-01-11
**目的**: 既存Miro図面と同じ形式のMermaid図を提供
**ステータス表示**:
- ✅ 緑色: 実装済み
- 🟡 黄色: 部分実装/実装中
- 🔶 オレンジ色: 計画中（未実装）
- ⚪ 灰色: 削除推奨

---

## 図1: 全体アーキテクチャ（Miroスタイル・縦型レイヤー構造）

```mermaid
graph TB
    subgraph CL["🟢 Client Layer - Presentation"]
        direction LR
        CL1["Next.js App Router<br/>✅ v15.5.4"]
        CL2["自然言語入力<br/>✅ 教材生成UI"]
        CL3["構造化UI<br/>✅ ダッシュボード"]
        CL4["abcjs<br/>✅ 音楽レンダリング"]
    end

    subgraph AL["🟢 Api Layer - Application"]
        direction TB
        subgraph AL_MW["Middleware"]
            AL1["Clerk Middleware<br/>✅ 認証・認可"]
            AL2["Rate Limiting<br/>✅ クォータチェック"]
        end
        subgraph AL_OAI["OpenAI Integration"]
            AL3["意図解析<br/>Function Calling<br/>✅ 実装済み"]
            AL4["ツール定義<br/>✅ 実装済み"]
        end
        AL5["Next.js API Routes<br/>✅ /api/*"]
    end

    subgraph SL["🟢 Application Layer - Services"]
        direction LR
        SL1["AI Service<br/>✅ 教材生成<br/>✅ 弱点ドリル<br/>✅ クイックテスト"]
        SL2["Payment Service<br/>✅ Stripe連携<br/>✅ Webhook"]
        SL3["Subscription Service<br/>✅ プラン管理<br/>✅ クォータ"]
        SL4["Reservation Service<br/>✅ 予約管理<br/>✅ 決済フロー"]
        SL5["Quality Gate<br/>✅ 品質評価"]
    end

    subgraph DAL["🟡 Data Access Layer"]
        direction LR
        DAL1["Drizzle ORM<br/>✅ 型安全クエリ"]
        DAL2["Repository Pattern<br/>✅ 部分実装"]
        DAL3["Connection Pooling<br/>✅ Neon Driver"]
    end

    subgraph DL["🟡 Data Layer"]
        direction LR
        DL1["Neon PostgreSQL<br/>✅ Serverless DB"]
        DL2["Redis/Upstash<br/>🔶 計画中<br/>未実装"]
        DL3["Job Queue BullMQ<br/>🔶 計画中<br/>未実装"]
    end

    subgraph ES["🟡 External Services"]
        direction TB
        ES1["OpenAI API<br/>✅ GPT-5-mini"]
        ES2["Stripe API<br/>✅ 決済・Webhook"]
        ES3["Resend<br/>✅ メール送信"]
        ES4["Clerk Auth<br/>✅ OAuth・JWT"]
        ES5["Google Calendar<br/>🔶 計画中<br/>未実装"]
        ES6["Sentry<br/>✅ エラー監視"]
        ES7["Vercel<br/>✅ Hosting"]
    end

    CL --> AL
    AL --> SL
    SL --> DAL
    DAL --> DL
    SL --> ES
    AL --> ES

    style CL fill:#90EE90
    style AL fill:#90EE90
    style SL fill:#90EE90
    style DAL fill:#FFE4B5
    style DL fill:#FFE4B5
    style ES fill:#FFE4B5
    style DL2 fill:#FFD700
    style DL3 fill:#FFD700
    style ES5 fill:#FFD700
```

---

## 図2: シンプル版（Miro図面に最も近い形式）

```mermaid
flowchart TB
    subgraph Client["🟢 Client Layer"]
        C1[Next.js App Router]
        C2[自然言語入力]
        C3[構造化UI]
    end

    subgraph API["🟢 Api Layer"]
        A1[OpenAI Integration<br/>意図解析・Function Calling]
        A2[Next.js API Routes]
        A3[Clerk Middleware]
        A4[Rate Limiting]
    end

    subgraph Service["🟢 Service Layer"]
        S1[AI Service]
        S2[Payment Service]
        S3[Subscription Service]
        S4[Matching Service]
        S5[Reservation Service]
    end

    subgraph Data["🟡 Data Layer"]
        D1[("Neon<br/>PostgreSQL<br/>✅")]
        D2[("Redis/Upstash<br/>🔶 未実装")]
        D3["Job Queue<br/>BullMQ<br/>🔶 未実装"]
    end

    subgraph External["🟡 External Services"]
        E1[OpenAI API<br/>✅]
        E2[Stripe API<br/>✅]
        E3[Resend<br/>✅]
        E4[Google Calendar<br/>🔶 未実装]
    end

    Client --> API
    API --> Service
    Service --> Data
    Service --> External

    style Client fill:#90EE90
    style API fill:#90EE90
    style Service fill:#90EE90
    style Data fill:#FFE4B5
    style External fill:#FFE4B5
    style D1 fill:#90EE90
    style D2 fill:#FFD700
    style D3 fill:#FFD700
    style E1 fill:#90EE90
    style E2 fill:#90EE90
    style E3 fill:#90EE90
    style E4 fill:#FFD700
```

---

## 図3: 詳細版（実装状況を完全に反映）

```mermaid
flowchart TB
    subgraph PL["Presentation Layer (Client Layer)"]
        direction TB
        PL1["Next.js 15.5 App Router<br/>React 19<br/>✅ 実装済み"]
        PL2["自然言語入力UI<br/>✅ 教材生成フォーム"]
        PL3["構造化ダッシュボード<br/>✅ メトリクス表示"]
        PL4["abcjs音楽プレイヤー<br/>✅ ABC記法レンダリング"]
    end

    subgraph AL["Application Layer - Middleware"]
        direction TB
        AL1["Clerk Middleware<br/>✅ 認証・認可<br/>✅ 3層ミドルウェア"]
        AL2["Rate Limiting<br/>✅ サブスクリプション<br/>✅ クォータチェック"]
    end

    subgraph AR["Application Layer - API Routes"]
        direction LR
        AR1["/api/ai/*<br/>✅ AI教材生成"]
        AR2["/api/materials/*<br/>✅ 教材CRUD"]
        AR3["/api/reservations/*<br/>✅ 予約管理"]
        AR4["/api/lessons/*<br/>✅ レッスン管理"]
        AR5["/api/admin/*<br/>✅ 管理機能"]
    end

    subgraph OAI["OpenAI Integration"]
        direction TB
        OAI1["意図解析<br/>Function Calling<br/>✅ 実装済み"]
        OAI2["ツール定義<br/>generateMaterial<br/>✅ 実装済み"]
    end

    subgraph SV["Application Layer - Services"]
        direction TB
        SV1["AI Service<br/>✅ 教材生成<br/>✅ 弱点ドリル<br/>✅ クイックテスト"]
        SV2["Payment Service<br/>✅ Stripe連携<br/>✅ Webhook処理"]
        SV3["Subscription Service<br/>✅ プラン管理<br/>✅ 使用量追跡"]
        SV4["Reservation Service<br/>✅ 予約ロジック<br/>✅ 決済連携"]
        SV5["Quality Gate Service<br/>✅ ABC検証<br/>✅ 品質スコア"]
    end

    subgraph DA["Data Access Layer"]
        direction LR
        DA1["Drizzle ORM<br/>✅ 型安全クエリ<br/>✅ 0.44.5"]
        DA2["Repository Pattern<br/>✅ 部分実装<br/>🟡 拡張中"]
        DA3["Connection Pooling<br/>✅ @neondatabase/serverless"]
    end

    subgraph DB["Data Layer"]
        direction TB
        DB1[("Neon PostgreSQL<br/>✅ Serverless DB<br/>✅ 8テーブル")]
        DB2[("Redis/Upstash<br/>🔶 計画中<br/>キャッシング層")]
        DB3["BullMQ Job Queue<br/>🔶 計画中<br/>非同期処理"]
    end

    subgraph EXT["External Services"]
        direction TB
        EXT1["OpenAI API<br/>✅ GPT-5-mini<br/>✅ 教材生成"]
        EXT2["Stripe API<br/>✅ Checkout<br/>✅ Webhook"]
        EXT3["Resend<br/>✅ トランザクション<br/>メール"]
        EXT4["Clerk Auth<br/>✅ OAuth 2.0<br/>✅ JWT"]
        EXT5["Google Calendar<br/>🔶 計画中<br/>レッスン連携"]
        EXT6["Sentry<br/>✅ エラー監視<br/>✅ v10.22.0"]
        EXT7["Vercel<br/>✅ Hosting<br/>✅ Edge Functions"]
    end

    PL --> AL
    AL --> AR
    AR --> OAI
    OAI --> AR
    AR --> SV
    SV --> DA
    DA --> DB

    SV --> EXT1
    SV --> EXT2
    SV --> EXT3
    AL --> EXT4
    SV -.-> EXT5
    SV --> EXT6
    PL --> EXT7

    style PL fill:#90EE90,stroke:#006400,stroke-width:3px
    style AL fill:#90EE90,stroke:#006400,stroke-width:3px
    style AR fill:#90EE90,stroke:#006400,stroke-width:3px
    style OAI fill:#90EE90,stroke:#006400,stroke-width:3px
    style SV fill:#90EE90,stroke:#006400,stroke-width:3px
    style DA fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px
    style DB fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px
    style EXT fill:#FFE4B5,stroke:#FF8C00,stroke-width:2px

    style DB1 fill:#90EE90
    style DB2 fill:#FFD700
    style DB3 fill:#FFD700
    style EXT1 fill:#90EE90
    style EXT2 fill:#90EE90
    style EXT3 fill:#90EE90
    style EXT4 fill:#90EE90
    style EXT5 fill:#FFD700
    style EXT6 fill:#90EE90
    style EXT7 fill:#90EE90
```

---

## 図4: データフロー図（AI教材生成）

```mermaid
sequenceDiagram
    actor User as ユーザー
    participant UI as Next.js UI<br/>(Client Layer)
    participant MW as Clerk Middleware<br/>(Api Layer)
    participant RL as Rate Limiting<br/>(Api Layer)
    participant API as API Routes<br/>(Api Layer)
    participant AI as AI Service<br/>(Service Layer)
    participant OAI as OpenAI API<br/>(External)
    participant QG as Quality Gate<br/>(Service Layer)
    participant DB as Neon PostgreSQL<br/>(Data Layer)

    User->>UI: 教材生成リクエスト
    UI->>MW: POST /api/ai/materials
    MW->>MW: JWT検証
    MW->>RL: 認証成功
    RL->>DB: サブスクリプション照会
    DB-->>RL: tier: premium, used: 50/100
    RL->>API: クォータOK
    API->>AI: generateMaterial()
    AI->>OAI: Chat Completion API
    OAI-->>AI: ABC記法の楽譜
    AI->>QG: 品質検証
    QG-->>AI: Score: 8.5/10
    AI->>DB: materialsテーブル保存
    DB-->>AI: UUID
    AI-->>API: Material
    API-->>UI: JSON Response
    UI-->>User: abcjsで楽譜表示

    Note over MW,RL: ✅ 実装済み
    Note over AI,OAI: ✅ 実装済み
    Note over QG: ✅ 実装済み
```

---

## 図5: データフロー図（レッスン予約）

```mermaid
sequenceDiagram
    actor Student as 学習者
    participant UI as Next.js UI
    participant API as API Routes
    participant RS as Reservation<br/>Service
    participant DB as Neon<br/>PostgreSQL
    participant Stripe as Stripe API
    participant WH as Stripe<br/>Webhook
    participant Cal as Google<br/>Calendar<br/>🔶未実装

    Student->>UI: レッスン枠を選択
    UI->>API: GET /api/lessons
    API->>DB: lessonSlots照会
    DB-->>API: 空き枠リスト
    API-->>UI: 表示

    Student->>UI: 予約確定
    UI->>API: POST /api/reservations
    API->>RS: createReservation()
    RS->>Stripe: Checkout Session作成
    Stripe-->>RS: Session ID
    RS->>DB: reservations保存<br/>(status: pending)
    DB-->>RS: Reservation ID
    RS-->>API: Checkout URL
    API-->>UI: リダイレクト

    Student->>Stripe: 決済完了
    Stripe->>WH: checkout.session.completed
    WH->>DB: status更新<br/>(approved, paid)
    WH-.->Cal: イベント作成<br/>🔶未実装
    WH-->>Stripe: 200 OK

    Note over Student,UI: ✅ 実装済み
    Note over API,RS: ✅ 実装済み
    Note over Stripe,WH: ✅ 実装済み
    Note over Cal: 🔶 計画中（未実装）
```

---

## 図6: データベーススキーマ（ER図）

```mermaid
erDiagram
    USERS ||--o{ LESSON_SLOTS : "creates (mentor)"
    USERS ||--o{ RESERVATIONS : "books (student)"
    USERS ||--o{ RESERVATIONS : "teaches (mentor)"
    USERS ||--o{ MATERIALS : creates
    USERS ||--o{ LEARNING_METRICS : tracks
    USERS ||--o| SUBSCRIPTIONS : has
    USERS ||--o{ MESSAGES : "sends/receives"

    LESSON_SLOTS ||--o{ RESERVATIONS : "has bookings"
    MATERIALS ||--o{ LEARNING_METRICS : "tracked by"
    RESERVATIONS ||--o{ MESSAGES : "related to"

    USERS {
        uuid id PK "✅"
        string clerkId UK "✅"
        string email "✅"
        string name "✅"
        string role "✅"
        string stripeCustomerId "✅"
    }

    LESSON_SLOTS {
        uuid id PK "✅"
        uuid mentorId FK "✅"
        timestamp startTime "✅"
        timestamp endTime "✅"
        decimal price "✅"
        string status "✅"
    }

    RESERVATIONS {
        uuid id PK "✅"
        uuid slotId FK "✅"
        uuid studentId FK "✅"
        uuid mentorId FK "✅"
        string status "✅"
        string paymentStatus "✅"
        string stripeSessionId "✅"
    }

    MATERIALS {
        uuid id PK "✅"
        uuid creatorId FK "✅"
        string title "✅"
        text content "✅"
        string type "✅"
        jsonb abcAnalysis "✅"
        decimal playabilityScore "✅"
        decimal learningValueScore "✅"
    }

    LEARNING_METRICS {
        uuid id PK "✅"
        uuid userId FK "✅"
        uuid materialId FK "✅"
        decimal achievementRate "✅"
        int targetTempo "✅"
        int achievedTempo "✅"
        jsonb weakSpots "✅"
    }

    SUBSCRIPTIONS {
        uuid id PK "✅"
        uuid userId FK "✅"
        string tier "✅"
        string status "✅"
        int aiMaterialsUsed "✅"
        int reservationsUsed "✅"
    }

    MESSAGES {
        uuid id PK "✅"
        uuid reservationId FK "✅"
        uuid senderId FK "✅"
        uuid receiverId FK "✅"
        text content "✅"
        boolean isRead "✅"
    }
```

---

## 図7: 実装ステータス概要（横棒グラフ風）

```mermaid
%%{init: {'theme':'base'}}%%
flowchart LR
    subgraph S["実装完了度"]
        direction TB
        L1["Presentation Layer: ▰▰▰▰▰▰▰▰▰▱ 95%"]
        L2["Application Layer: ▰▰▰▰▰▰▰▰▰▱ 90%"]
        L3["Data Access Layer: ▰▰▰▰▰▰▰▰▱▱ 85%"]
        L4["Data Layer: ▰▰▰▰▰▰▰▰▱▱ 80%"]
        L5["External Services: ▰▰▰▰▰▰▰▰▱▱ 80%"]
        L6["総合: ▰▰▰▰▰▰▰▰▱▱ 85%"]
    end

    style L1 fill:#90EE90
    style L2 fill:#90EE90
    style L3 fill:#FFE4B5
    style L4 fill:#FFE4B5
    style L5 fill:#FFE4B5
    style L6 fill:#87CEEB,stroke:#000080,stroke-width:3px
```

---

## 図8: 技術スタック一覧（マインドマップ風）

```mermaid
mindmap
  root((MUED v2<br/>Tech Stack))
    Frontend
      Next.js 15.5 ✅
      React 19 ✅
      TailwindCSS 4 ✅
      shadcn/ui ✅
      abcjs ✅
    Backend
      Node.js 22 ✅
      Drizzle ORM ✅
      Neon Driver ✅
      TypeScript ✅
    Authentication
      Clerk ✅
      OAuth 2.0 ✅
      JWT ✅
    Payment
      Stripe ✅
      Webhooks ✅
    AI
      OpenAI API ✅
      GPT-5-mini ✅
      Function Calling ✅
    Database
      Neon PostgreSQL ✅
      ::icon(fa fa-check-circle)
      Redis/Upstash 🔶
      ::icon(fa fa-clock)
    Infrastructure
      Vercel ✅
      Sentry ✅
      Vercel Analytics ✅
    未実装
      BullMQ 🔶
      Google Calendar 🔶
```

---

## 凡例

### ステータスアイコン
- ✅ **実装済み**: プロダクションで動作確認済み
- 🟡 **部分実装**: コア機能は動作、一部機能が未完成
- 🔶 **計画中**: 設計されているが未実装
- ⚪ **削除推奨**: 計画から外すべき

### 色コード
- 🟢 **緑色** (`#90EE90`): 実装完了
- 🟡 **黄色** (`#FFE4B5`): 部分実装または要改善
- 🔶 **オレンジ色** (`#FFD700`): 計画中（未実装）
- ⚪ **灰色** (`#D3D3D3`): 削除推奨

---

## 使用方法

### Miroへのインポート
1. 上記のMermaid図をコピー
2. MiroのMermaid統合機能を使用
3. または、Mermaid Live Editorで画像化してインポート

### Mermaid Live Editor
https://mermaid.live/

### VS Code / Cursor
Mermaid Preview拡張機能で直接プレビュー可能

---

## 各図の用途

| 図番号 | 用途 | Miro図面との対応 |
|--------|------|----------------|
| 図1 | 全体像把握（Miroスタイル） | ✅ 最も近い |
| 図2 | シンプル版（プレゼン用） | ✅ 近い |
| 図3 | 詳細版（開発チーム用） | ⚠️ より詳細 |
| 図4 | データフロー（AI教材生成） | ➕ 新規 |
| 図5 | データフロー（レッスン予約） | ➕ 新規 |
| 図6 | データベーススキーマ | ➕ 新規 |
| 図7 | 実装ステータス | ➕ 新規 |
| 図8 | 技術スタック | ➕ 新規 |

---

## Miro更新時の推奨ワークフロー

### Step 1: 図1または図2を参照
既存Miro図面と同じ形式なので、レイヤー構造を理解しやすい

### Step 2: 未実装要素の処理
- Redis/Upstash → 🔶 計画中ラベル
- BullMQ → 🔶 計画中ラベル
- Google Calendar → 🔶 計画中ラベル

### Step 3: 新規要素の追加
- Data Access Layer（新規）
- abcjs、Quality Gate、Sentry等

### Step 4: 図3の詳細を参照
各コンポーネントの実装状況を確認

### Step 5: データフロー図（図4, 5）を別ページに追加
ユースケース別の動作を視覚化

---

**作成者**: Claude Code
**更新日**: 2025-01-11
**次回更新**: Redis/Upstash実装時、またはMIDI-LLM統合時
