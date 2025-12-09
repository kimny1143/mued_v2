# MUED LMS v2 システムアーキテクチャ図

最終更新: 2025-12-10

## 1. システム全体アーキテクチャ

**説明**: MUED LMS v2の全体的なシステム構成と、各コンポーネント間の関係性を示します。クライアント層、アプリケーション層、データ層、外部サービス層の4層構造で構成されています。

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[("🌐 Web Browser")]
        Mobile[("📱 Mobile Browser")]
    end

    subgraph "Application Layer - Next.js 15.5.4"
        subgraph "Frontend (React 19)"
            Pages["📄 App Router Pages"]
            Components["🧩 React Components"]
            Hooks["🔗 Custom Hooks"]
            UI["🎨 Shadcn/UI + TailwindCSS"]
        end

        subgraph "API Layer"
            APIRoutes["🔌 API Routes"]
            Middleware["🛡️ Auth Middleware"]
            APIClient["📡 API Client<br/>(useApiFetch/useApiPost)"]
        end
    end

    subgraph "Data Layer"
        subgraph "Database"
            Neon[("🗄️ Neon PostgreSQL<br/>(Serverless)")]
            Drizzle["⚙️ Drizzle ORM"]
        end
    end

    subgraph "External Services"
        Clerk["🔐 Clerk Auth"]
        OpenAI["🤖 OpenAI GPT-5<br/>(Production)"]
        Claude["🤖 Claude Sonnet 4.5<br/>(Dev/Admin via MCP)"]
        Stripe["💳 Stripe Payments"]
    end

    Browser --> Pages
    Mobile --> Pages
    Pages --> Components
    Components --> Hooks
    Components --> UI
    Hooks --> APIClient
    APIClient --> APIRoutes
    APIRoutes --> Middleware
    Middleware --> Clerk
    APIRoutes --> Drizzle
    Drizzle --> Neon
    APIRoutes --> OpenAI
    APIRoutes --> Claude
    APIRoutes --> Stripe

    style Browser fill:#e1f5fe
    style Mobile fill:#e1f5fe
    style Pages fill:#fff3e0
    style Components fill:#fff3e0
    style Hooks fill:#fff3e0
    style UI fill:#fff3e0
    style APIRoutes fill:#f3e5f5
    style Middleware fill:#f3e5f5
    style APIClient fill:#f3e5f5
    style Neon fill:#e8f5e9
    style Drizzle fill:#e8f5e9
    style Clerk fill:#fce4ec
    style OpenAI fill:#fce4ec
    style Claude fill:#fce4ec
    style Stripe fill:#fce4ec
```

**主要コンポーネント**:
- **Client Layer**: ユーザーがアクセスする各種ブラウザ環境
- **Application Layer**: Next.js 15.5.4による統合アプリケーション層（フロントエンドとAPIを統合）
- **Data Layer**: Neon PostgreSQLとDrizzle ORMによるデータ永続化層
- **External Services**: 認証、AI、決済などの外部サービス統合

---

## 2. フロントエンドアーキテクチャ

**説明**: フロントエンドのコンポーネント構造とディレクトリ構成を示します。コンポーネントは責務に応じて3層に分離され、カスタムフックによるロジックの再利用を促進しています。

```mermaid
graph TD
    subgraph "App Router Structure"
        Root["/app"]
        Root --> Layout["layout.tsx<br/>(Root Layout)"]
        Root --> Public["Public Routes"]
        Root --> Protected["Protected Routes"]

        Public --> Home["/ (Home)"]
        Public --> About["/about"]
        Public --> Login["/sign-in"]

        Protected --> Teacher["/teacher/*"]
        Protected --> Student["/student/*"]
        Protected --> Admin["/admin/*"]
    end

    subgraph "Component Architecture"
        CompRoot["/components"]
        CompRoot --> UIComp["📦 /ui<br/>(Primitive Components)"]
        CompRoot --> Features["🎯 /features<br/>(Domain Components)"]
        CompRoot --> Layouts["📐 /layouts<br/>(Layout Components)"]

        UIComp --> Button["Button"]
        UIComp --> Card["Card"]
        UIComp --> Dialog["Dialog"]

        Features --> Materials["MaterialsManager"]
        Features --> Library["LibraryCard"]
        Features --> Dashboard["DashboardStats"]

        Layouts --> Header["Header"]
        Layouts --> Sidebar["Sidebar"]
        Layouts --> Footer["Footer"]
    end

    subgraph "Custom Hooks"
        HookRoot["/hooks"]
        HookRoot --> DataHooks["Data Fetching"]
        HookRoot --> StateHooks["State Management"]

        DataHooks --> useApiFetch["useApiFetch"]
        DataHooks --> useApiPost["useApiPost"]
        StateHooks --> useAuth["useAuth"]
        StateHooks --> useTheme["useTheme"]
    end

    Teacher --> Materials
    Student --> Library
    Admin --> Dashboard
    Materials --> useApiFetch
    Library --> useApiPost
    Dashboard --> useAuth

    style Root fill:#e3f2fd
    style CompRoot fill:#fff3e0
    style HookRoot fill:#f3e5f5
    style UIComp fill:#e8f5e9
    style Features fill:#fce4ec
    style Layouts fill:#e1f5fe
```

**主要コンポーネント**:
- **App Router**: Next.js 15のApp Routerによるファイルベースルーティング
- **Component Layers**: UI層（基本コンポーネント）、Features層（機能コンポーネント）、Layouts層（レイアウト）の3層構造
- **Custom Hooks**: データフェッチングと状態管理のロジックを分離・再利用

---

## 3. API層アーキテクチャ

**説明**: API層の内部構造と、Repository パターンを使用したデータアクセス層の実装を示します。認証ミドルウェアと統一されたエラーハンドリングを含みます。

```mermaid
graph LR
    subgraph "API Routes (/app/api)"
        Materials["/materials/*"]
        Library["/library/*"]
        Users["/users/*"]
        Admin["/admin/*"]
        Webhooks["/webhooks/*"]
    end

    subgraph "Middleware Layer"
        AuthMiddleware["🔐 Auth Middleware<br/>(Clerk)"]
        ErrorHandler["⚠️ Error Handler"]
        RateLimiter["🚦 Rate Limiter"]
    end

    subgraph "Repository Layer"
        MaterialsRepo["MaterialsRepository"]
        LibraryRepo["LibraryRepository"]
        UsersRepo["UsersRepository"]
        AdminRepo["AdminRepository"]
    end

    subgraph "Service Layer"
        MaterialGen["Material Generation<br/>Service"]
        PaymentService["Payment Service<br/>(Stripe)"]
        NotificationService["Notification Service"]
    end

    subgraph "External APIs"
        OpenAIAPI["OpenAI API"]
        ClaudeAPI["Claude API<br/>(via MCP)"]
        StripeAPI["Stripe API"]
    end

    Materials --> AuthMiddleware
    Library --> AuthMiddleware
    Users --> AuthMiddleware
    Admin --> AuthMiddleware
    Webhooks --> ErrorHandler

    AuthMiddleware --> MaterialsRepo
    AuthMiddleware --> LibraryRepo
    AuthMiddleware --> UsersRepo
    AuthMiddleware --> AdminRepo

    MaterialsRepo --> MaterialGen
    UsersRepo --> PaymentService
    AdminRepo --> NotificationService

    MaterialGen --> OpenAIAPI
    MaterialGen --> ClaudeAPI
    PaymentService --> StripeAPI

    style Materials fill:#e3f2fd
    style Library fill:#e3f2fd
    style Users fill:#e3f2fd
    style Admin fill:#e3f2fd
    style Webhooks fill:#e3f2fd
    style AuthMiddleware fill:#fff3e0
    style ErrorHandler fill:#fff3e0
    style RateLimiter fill:#fff3e0
    style MaterialsRepo fill:#e8f5e9
    style LibraryRepo fill:#e8f5e9
    style UsersRepo fill:#e8f5e9
    style AdminRepo fill:#e8f5e9
    style MaterialGen fill:#f3e5f5
    style PaymentService fill:#f3e5f5
    style NotificationService fill:#f3e5f5
```

**主要コンポーネント**:
- **API Routes**: リソースベースのRESTful API設計
- **Middleware Layer**: 認証、エラーハンドリング、レート制限の横断的関心事
- **Repository Layer**: データアクセスロジックの抽象化
- **Service Layer**: ビジネスロジックと外部API統合

---

## 4. データフローダイアグラム

**説明**: ユーザーアクションから始まるデータの流れと、エラーハンドリングを含む完全なリクエスト・レスポンスサイクルを示します。

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 🎨 UI Component
    participant Hook as 🔗 Custom Hook
    participant API as 📡 API Client
    participant Route as 🔌 API Route
    participant Auth as 🔐 Auth MW
    participant Repo as 📊 Repository
    participant DB as 🗄️ Database
    participant Ext as 🌐 External Service

    User->>UI: User Action
    UI->>Hook: Call Hook
    Hook->>API: useApiFetch/Post

    API->>Route: HTTP Request
    Route->>Auth: Verify Auth

    alt Authentication Success
        Auth->>Repo: Process Request
        Repo->>DB: Query/Mutation
        DB-->>Repo: Data Response

        opt External Service Call
            Repo->>Ext: API Call (OpenAI/Stripe)
            Ext-->>Repo: Service Response
        end

        Repo-->>Route: Success Response
        Route-->>API: HTTP 200 + Data
        API-->>Hook: Parsed Response
        Hook-->>UI: Update State
        UI-->>User: Display Result
    else Authentication Failed
        Auth-->>Route: Unauthorized
        Route-->>API: HTTP 401
        API-->>Hook: Error Object
        Hook-->>UI: Error State
        UI-->>User: Show Error
    else Database Error
        DB-->>Repo: Error
        Repo-->>Route: Internal Error
        Route-->>API: HTTP 500
        API-->>Hook: Error Object
        Hook-->>UI: Error State
        UI-->>User: Show Error Message
    end
```

**主要コンポーネント**:
- **Success Path**: 認証成功時の通常のデータフロー
- **Error Handling**: 認証失敗とデータベースエラーの処理フロー
- **External Services**: 必要に応じた外部API呼び出し
- **State Management**: フックによる状態管理とUIの更新

---

## 5. CI/CDパイプライン

**説明**: GitHub Actionsを使用した自動化されたCI/CDパイプラインの構成を示します。コードの検証からデプロイまでの完全なフローを含みます。

```mermaid
graph TD
    subgraph "Trigger Events"
        Push["📤 Push to Branch"]
        PR["🔀 Pull Request"]
        Manual["👆 Manual Trigger"]
    end

    subgraph "CI Pipeline"
        subgraph "Stage 1: Validate"
            Checkout["📥 Checkout Code"]
            Cache["💾 Cache Dependencies"]
            Install["📦 Install Dependencies"]
            Lint["🔍 ESLint + Prettier"]
            TypeCheck["📝 TypeScript Check"]
        end

        subgraph "Stage 2: Test"
            UnitTest["🧪 Unit Tests<br/>(Vitest)"]
            ComponentTest["🧩 Component Tests<br/>(Vitest + Testing Library)"]
            IntegrationTest["🔗 Integration Tests<br/>(API + DB Mocks)"]
        end

        subgraph "Stage 3: Build"
            BuildNext["🏗️ Next.js Build"]
            BuildCheck["✅ Build Verification"]
            Artifacts["📦 Upload Artifacts"]
        end

        subgraph "Stage 4: E2E & A11y"
            E2ETest["🎭 E2E Tests<br/>(Playwright)"]
            A11yTest["♿ Accessibility Tests<br/>(axe-core)"]
            Screenshots["📸 Screenshot Tests"]
        end
    end

    subgraph "CD Pipeline"
        subgraph "Deployment"
            Preview["🔍 Preview Deploy<br/>(PR)"]
            Staging["🎬 Staging Deploy<br/>(main)"]
            Production["🚀 Production Deploy<br/>(release)"]
        end
    end

    Push --> Checkout
    PR --> Checkout
    Manual --> Checkout

    Checkout --> Cache
    Cache --> Install
    Install --> Lint
    Install --> TypeCheck

    Lint --> UnitTest
    TypeCheck --> UnitTest
    UnitTest --> ComponentTest
    ComponentTest --> IntegrationTest

    IntegrationTest --> BuildNext
    BuildNext --> BuildCheck
    BuildCheck --> Artifacts

    Artifacts --> E2ETest
    Artifacts --> A11yTest
    E2ETest --> Screenshots

    Screenshots --> Preview
    Screenshots --> Staging
    Staging --> Production

    style Push fill:#e3f2fd
    style PR fill:#e3f2fd
    style Manual fill:#e3f2fd
    style UnitTest fill:#e8f5e9
    style ComponentTest fill:#e8f5e9
    style IntegrationTest fill:#e8f5e9
    style E2ETest fill:#fff3e0
    style A11yTest fill:#fff3e0
    style Production fill:#ffebee
```

**主要コンポーネント**:
- **Validate Stage**: コード品質の検証（Lint、型チェック）
- **Test Stage**: 3層のテスト実行（Unit、Component、Integration）
- **Build Stage**: Next.jsビルドと成果物の保存
- **E2E & A11y Stage**: エンドツーエンドとアクセシビリティテスト
- **Deployment**: 環境別の自動デプロイ

---

## 6. テスト戦略

**説明**: テストピラミッドに基づいた包括的なテスト戦略を示します。各テストレベルの責務と使用ツールを明確化しています。

```mermaid
graph BT
    subgraph "Test Pyramid"
        subgraph "Level 1: Unit Tests"
            UT["🔬 Unit Tests<br/>Fast • Isolated • Many<br/>(Vitest)"]
            UT_Details["• Pure Functions<br/>• Utility Methods<br/>• Custom Hooks<br/>• Individual Components"]
        end

        subgraph "Level 2: Component Tests"
            CT["🧩 Component Tests<br/>Medium • Interactive • Moderate<br/>(Vitest + Testing Library)"]
            CT_Details["• Component Behavior<br/>• User Interactions<br/>• State Management<br/>• Props Validation"]
        end

        subgraph "Level 3: Integration Tests"
            IT["🔗 Integration Tests<br/>Slower • Connected • Some<br/>(Vitest + MSW)"]
            IT_Details["• API Integration<br/>• Database Queries<br/>• Service Layer<br/>• External APIs Mock"]
        end

        subgraph "Level 4: E2E Tests"
            E2E["🎭 E2E Tests<br/>Slowest • Full Stack • Few<br/>(Playwright)"]
            E2E_Details["• User Journeys<br/>• Critical Paths<br/>• Cross-browser<br/>• Real Environment"]
        end

        subgraph "Level 5: Accessibility Tests"
            A11y["♿ Accessibility Tests<br/>Automated • Compliance • Critical<br/>(axe-core + Playwright)"]
            A11y_Details["• WCAG Compliance<br/>• Keyboard Navigation<br/>• Screen Reader<br/>• Color Contrast"]
        end
    end

    subgraph "CI/CD Integration"
        CI["GitHub Actions"]
        LocalDev["Local Development"]
        PreCommit["Pre-commit Hooks"]
    end

    subgraph "Test Coverage"
        Coverage["Code Coverage Report<br/>Target: >80%"]
        Metrics["Test Metrics Dashboard"]
    end

    UT --> CT
    CT --> IT
    IT --> E2E
    E2E --> A11y

    UT --> LocalDev
    CT --> LocalDev
    IT --> PreCommit
    E2E --> CI
    A11y --> CI

    CI --> Coverage
    CI --> Metrics

    style UT fill:#e8f5e9
    style CT fill:#c8e6c9
    style IT fill:#a5d6a7
    style E2E fill:#81c784
    style A11y fill:#66bb6a
    style Coverage fill:#fff3e0
    style Metrics fill:#fff3e0
```

**主要コンポーネント**:
- **Unit Tests**: 最下層・最多数・最高速のテスト
- **Component Tests**: UIコンポーネントの振る舞いテスト
- **Integration Tests**: API・DB統合のテスト
- **E2E Tests**: 実環境での完全なユーザーフローテスト
- **Accessibility Tests**: WCAG準拠とアクセシビリティ確保
- **CI/CD Integration**: 各テストレベルの実行環境

---

---

## 7. ドメインモデル（Phase 0-4対応）

**説明**: MUED の思想（Difference / Note / Form）に基づくドメインモデルと、各概念の関係性を示します。Phase 0-4の実装計画に沿った設計です。

```mermaid
graph TD
    subgraph "MUED Philosophy - 3 Pillars"
        Difference["🎧 Difference<br/>(耳・差分を聴く)"]
        Note["📝 Note<br/>(制作・学習ログ)"]
        Form["🎼 Form<br/>(構造・形式)"]
    end

    subgraph "Core Domain Models"
        User["👤 User<br/>(Learner/Mentor)"]
        Lesson["📚 Lesson"]
        Material["📄 Material"]
        LogEntry["📓 LogEntry<br/>(MUEDnote)"]
    end

    subgraph "Difference Domain (Phase 2)"
        EarExercise["🎧 EarExercise<br/>(Ear Training)"]
        EarAttempt["EarAttempt<br/>(試行記録)"]
        EarProgress["EarProgress<br/>(進捗)"]
    end

    subgraph "Form Domain (Phase 3)"
        FormExercise["🎼 FormExercise<br/>(Structure Training)"]
        FormAnnotation["FormAnnotation<br/>(構造注釈)"]
        FormAnalysis["FormAnalysis<br/>(AI分析結果)"]
    end

    subgraph "DAW Integration (Phase 4)"
        DAWPlugin["🎛️ DAW Plugin<br/>(AU/VST/AAX)"]
        AudioAsset["AudioAsset<br/>(音源管理)"]
    end

    %% Relationships
    User --> Lesson
    User --> LogEntry
    User --> EarProgress

    Lesson --> Material
    Lesson --> LogEntry

    Material --> LogEntry

    EarExercise --> EarAttempt
    EarAttempt --> LogEntry
    EarAttempt --> EarProgress

    FormExercise --> FormAnnotation
    FormExercise --> FormAnalysis
    FormAnalysis --> LogEntry

    DAWPlugin --> AudioAsset
    AudioAsset --> EarExercise
    AudioAsset --> FormExercise

    %% Philosophy Links
    Difference -.-> EarExercise
    Note -.-> LogEntry
    Form -.-> FormExercise

    style Difference fill:#e8f5e9
    style Note fill:#fff3e0
    style Form fill:#f3e5f5
    style LogEntry fill:#fff9c4
    style EarExercise fill:#c8e6c9
    style FormExercise fill:#e1bee7
    style DAWPlugin fill:#ffccbc
```

**主要ドメインモデル**:

### Core Domain
- **User**: 学習者とメンター（Clerkで管理）
- **Lesson**: レッスンセッション
- **Material**: 教材（楽譜、音源、説明）
- **LogEntry**: MUEDnote（すべての学習活動のログ）

### Difference Domain (Phase 2)
- **EarExercise**: 耳トレーニング課題（EQ差分、バランス差分等）
- **EarAttempt**: 各課題への回答記録
- **EarProgress**: 学習者の耳の成長トラッキング

### Form Domain (Phase 3)
- **FormExercise**: 構造分析トレーニング課題
- **FormAnnotation**: 楽曲構造の注釈データ
- **FormAnalysis**: AI による構造解析結果

### DAW Integration (Phase 4)
- **DAW Plugin**: AU/VST/AAX によるDAW完全統合
- **AudioAsset**: 統合音源管理

---

## 8. モジュール境界とディレクトリ構成（Phase 0-4対応）

**説明**: MUED の思想に沿ったモジュール境界とディレクトリ構成を示します。責務を明確に分離し、Phase ごとの段階的実装を可能にします。

```mermaid
graph TD
    subgraph "Application Root"
        App["/app"]
        Lib["/lib"]
        Components["/components"]
    end

    subgraph "Core Modules (/lib/core)"
        CoreAuth["/core/auth"]
        CoreLesson["/core/lesson"]
        CoreMaterial["/core/material"]
        CoreLog["/core/log<br/>(Phase 1: MUEDnote)"]
    end

    subgraph "Feature Modules (/lib/modules)"
        EarTraining["/modules/ear-training<br/>(Phase 2: Difference)"]
        StructureTraining["/modules/structure-training<br/>(Phase 3: Form)"]
        DAWIntegration["/modules/integration/daw<br/>(Phase 4)"]
    end

    subgraph "Shared Infrastructure"
        DB["/db<br/>(Drizzle Schema)"]
        API["/lib/api<br/>(API Clients)"]
        Hooks["/hooks<br/>(Custom Hooks)"]
        UI["/components/ui<br/>(UI Primitives)"]
    end

    App --> CoreAuth
    App --> CoreLesson
    App --> CoreMaterial
    App --> CoreLog

    App --> EarTraining
    App --> StructureTraining
    App --> DAWIntegration

    CoreLog --> DB
    EarTraining --> DB
    StructureTraining --> DB

    CoreLog --> API
    EarTraining --> API
    StructureTraining --> API

    Components --> UI
    Components --> Hooks

    style CoreLog fill:#fff9c4
    style EarTraining fill:#c8e6c9
    style StructureTraining fill:#e1bee7
    style DAWIntegration fill:#ffccbc
    style DB fill:#e8f5e9
```

**モジュール境界の定義**:

### Core Modules
- **core/auth**: 認証・認可（Clerk統合）
- **core/lesson**: レッスン管理
- **core/material**: 教材管理（ABC記譜法生成含む）
- **core/log**: MUEDnote（Phase 1）- すべての活動ログの中心

### Feature Modules
- **modules/ear-training**: Difference系機能（Phase 2）
  - EarExercise 管理
  - A/B 再生 UI
  - スコアリング・進捗トラッキング

- **modules/structure-training**: Form系機能（Phase 3）
  - FormExercise 管理
  - 構造可視化 UI
  - AI 構造解析統合

- **modules/integration/daw**: DAW統合（Phase 4）
  - AU/VST/AAX プラグイン
  - DAW連携プロトコル（Window Title, File Path, MIDI/OSC）
  - 商用リリース準備

### Shared Infrastructure
- **db/**: Drizzle ORM スキーマ定義
- **lib/api/**: 統一 API クライアント
- **hooks/**: カスタムフック（データフェッチング、状態管理）
- **components/ui/**: Shadcn/UI ベースの基本コンポーネント

---

## 9. Phase別実装マイルストーン

**説明**: Phase 0-4 の実装順序と各フェーズでの主要成果物を示します。

```mermaid
gantt
    title MUED Phase 0-4 Implementation Roadmap
    dateFormat YYYY-MM
    axisFormat %Y-%m

    section Phase 0
    思想・ドキュメント統合           :p0, 2025-11, 1M
    PHILOSOPHY.md作成               :milestone, p0-m1, 2025-11, 0d
    architecture.md更新              :milestone, p0-m2, 2025-11, 0d
    roadmap.md作成                   :milestone, p0-m3, 2025-11, 0d

    section Phase 1
    MUEDnote基盤実装                 :p1, after p0, 3M
    LogEntryモデル実装               :milestone, p1-m1, 2025-12, 0d
    AI要約機能実装                   :milestone, p1-m2, 2026-01, 0d
    マイノート画面実装               :milestone, p1-m3, 2026-02, 0d

    section Phase 2
    Ear Training MVP                 :p2, after p1, 3M
    EarExerciseモデル実装            :milestone, p2-m1, 2026-03, 0d
    A/B再生UI実装                    :milestone, p2-m2, 2026-04, 0d
    スコアリング実装                 :milestone, p2-m3, 2026-05, 0d

    section Phase 3
    Structure Training MVP           :p3, after p2, 3M
    FormExerciseモデル実装           :milestone, p3-m1, 2026-06, 0d
    構造可視化UI実装                 :milestone, p3-m2, 2026-07, 0d
    AI構造解析統合                   :milestone, p3-m3, 2026-08, 0d

    section Phase 4
    DAW統合・商用リリース             :p4, after p3, 3M
    DAW連携プロトコル実装            :milestone, p4-m1, 2026-09, 0d
    クローズドβ開始                 :milestone, p4-m2, 2026-10, 0d
    商用リリース                     :milestone, p4-m3, 2026-11, 0d
```

**各Phaseの完了条件**:

- **Phase 0**: PHILOSOPHY / architecture / roadmap の3文書が整合
- **Phase 1**: 学習者がすべてのレッスン・教材にノートを残し、一覧で閲覧可能
- **Phase 2**: EarExercise の最小セットが動作し、MUEDnote と連動
- **Phase 3**: FormExercise の最小セットが動作し、AI 解析と連動
- **Phase 4**: DAW統合（AU/VST/AAX）が動作し、商用リリース

---

## まとめ

これらの図は、MUED LMS v2の包括的なシステムアーキテクチャを表現しています。各図は異なる視点からシステムを捉え、開発チームが全体像を理解しやすくなるように設計されています。

**Phase 0-4 対応アーキテクチャの特徴**:
1. **思想の明文化**: Difference / Note / Form の3本柱をドメインモデルに反映
2. **段階的実装**: Phase ごとに独立して価値を提供できる設計
3. **モジュール分離**: core/ と modules/ の明確な境界
4. **拡張性**: DAW統合や新機能追加に対応可能な構造

**活用方法**:
1. 新規開発者のオンボーディング資料として
2. アーキテクチャレビューの基礎資料として
3. システム改善の議論のベースラインとして
4. ドキュメントの一部として保管
5. **Phase 実装時の参照資料として**（新規追加）

各図はMermaid記法で記述されているため、GitHubやNotionなどのMarkdown対応プラットフォームで直接表示可能です。また、Miroへの転記時は、これらの図を視覚的な基準として使用できます。
