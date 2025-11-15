# MUED System Architecture Analysis Report

## 1. システム概要

### 1.1 プロジェクト概要
**MUED (Medical University Education) LMS v2**は、音楽教育に特化した学習管理システムです。AI技術を活用した教材生成、レッスン予約システム、学習メトリクス追跡などの包括的な教育プラットフォーム機能を提供します。

### 1.2 主要機能
- **AI教材生成**: OpenAI APIを活用した音楽教材の自動生成（ABC記法）
- **レッスン予約システム**: メンターと学習者のマッチング、予約管理
- **学習進捗追跡**: 練習メトリクスの収集と分析
- **サブスクリプション管理**: Stripeによる決済とプラン管理
- **リアルタイム機能**: チャット、通知システム

### 1.3 対象ユーザー
- **学習者 (Student)**: 教材学習、レッスン予約、進捗確認
- **メンター (Mentor)**: レッスン提供、教材作成、収益管理
- **管理者 (Admin)**: システム管理、メトリクス監視、品質管理

## 2. 技術アーキテクチャ

### 2.1 レイヤー構造

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│         Next.js 15.5 App Router + React 19               │
│         TailwindCSS 4 + shadcn/ui Components             │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│      API Routes + Server Components + Middleware         │
│         Auth (Clerk) + Business Logic Services           │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                      Data Access Layer                   │
│            Drizzle ORM + Repository Pattern              │
│              Connection Pooling + Caching                │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                     Infrastructure Layer                 │
│   Neon PostgreSQL + Clerk Auth + Stripe + OpenAI        │
│            Vercel Hosting + Edge Functions               │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技術スタック詳細

#### フロントエンド
- **Framework**: Next.js 15.5.4 (App Router, Turbopack)
- **UI Library**: React 19.1.0
- **Styling**: TailwindCSS 4.0 + shadcn/ui
- **State Management**: React Hooks + Context API
- **音楽表記**: abcjs 6.5.2 (ABC記法レンダリング)
- **グラフ/チャート**: Recharts 3.3.0

#### バックエンド
- **API Layer**: Next.js API Routes (App Router)
- **認証**: Clerk (OAuth, JWT)
- **ORM**: Drizzle ORM 0.44.5
- **Database**: Neon PostgreSQL (Serverless)
- **AI Integration**: OpenAI API 6.0.0
- **Payment**: Stripe 18.5.0
- **Email**: Resend 6.1.0

#### インフラストラクチャ
- **Hosting**: Vercel (推定)
- **Database**: Neon (Serverless PostgreSQL)
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry 10.22.0
- **Analytics**: Vercel Analytics + Speed Insights

### 2.3 デプロイメントアーキテクチャ

```
[Client Browser]
       ↓
[Vercel Edge Network]
       ↓
[Next.js Application]
       ↓
    ┌──────┬──────┬──────┬──────┐
    │      │      │      │      │
[Clerk] [Neon] [Stripe] [OpenAI] [Resend]
```

## 3. データフロー図

### 3.1 ユーザー認証フロー
```
User → Sign In → Clerk Auth → JWT Generation → Session Creation
                     ↓
            Webhook → User Sync → Database Update
```

### 3.2 AI教材生成フロー
```
User Request → Quota Check → OpenAI API Call → ABC Notation Generation
                    ↓                              ↓
            Subscription Check            Quality Gate Validation
                    ↓                              ↓
            Usage Tracking                Material Storage
```

### 3.3 レッスン予約フロー
```
Student → Browse Slots → Select Mentor → Create Reservation
              ↓                              ↓
        Filter by Tags                 Stripe Checkout
              ↓                              ↓
        Availability Check            Payment Processing
                                            ↓
                                    Webhook Confirmation
```

### 3.4 学習メトリクス収集フロー
```
Practice Session → Track Progress → Calculate Metrics
        ↓                ↓                ↓
   Time Tracking    Section Completion  Tempo Achievement
        ↓                ↓                ↓
            Database Update → Analytics Dashboard
```

## 4. データベース構造

### 4.1 主要テーブル構成

| テーブル名 | 役割 | 主要カラム |
|-----------|------|-----------|
| **users** | ユーザー基本情報 | id, clerkId, email, role, stripeCustomerId |
| **lessonSlots** | レッスン枠管理 | mentorId, startTime, endTime, price, status |
| **reservations** | 予約情報 | slotId, studentId, mentorId, status, paymentStatus |
| **materials** | 教材コンテンツ | creatorId, title, content, type, abcAnalysis |
| **learningMetrics** | 学習進捗 | userId, materialId, achievementRate, tempoAchievement |
| **subscriptions** | サブスクリプション | userId, tier, status, aiMaterialsUsed |
| **messages** | メッセージ | senderId, receiverId, content, isRead |
| **webhookEvents** | Webhook履歴 | eventId, type, source, payload |

### 4.2 リレーション構造

```
users (1) ──── (n) lessonSlots (mentor)
  │
  ├──── (n) reservations (student/mentor)
  ├──── (n) materials (creator)
  ├──── (n) learningMetrics
  ├──── (n) messages (sender/receiver)
  └──── (1) subscription

lessonSlots (1) ──── (n) reservations
materials (1) ──── (n) learningMetrics
reservations (1) ──── (n) messages
```

### 4.3 インデックス戦略
- **Primary Keys**: UUID v4 (defaultRandom)
- **Foreign Keys**: 全リレーションに外部キー制約
- **Composite Indexes**: 頻繁なクエリパターンに最適化
  - idx_lesson_slots_mentor_start
  - idx_reservations_student_status
  - idx_learning_metrics_user_material

## 5. API設計

### 5.1 エンドポイント構造

| カテゴリ | エンドポイント | 用途 |
|---------|--------------|------|
| **AI** | `/api/ai/materials` | 教材生成・取得 |
| | `/api/ai/weak-drills` | 弱点ドリル生成 |
| | `/api/ai/quick-test` | クイックテスト生成 |
| **Materials** | `/api/materials` | 教材CRUD操作 |
| **Reservations** | `/api/reservations` | 予約管理 |
| **Lessons** | `/api/lessons` | レッスン枠管理 |
| **Dashboard** | `/api/dashboard` | ダッシュボードデータ |
| **Metrics** | `/api/metrics` | 学習メトリクス |
| **Admin** | `/api/admin/*` | 管理機能 |
| **Webhooks** | `/api/webhooks/stripe` | Stripe連携 |
| | `/api/webhooks/clerk` | Clerk連携 |

### 5.2 認証・認可の仕組み

#### ミドルウェア構成
```typescript
// 3層の認証ミドルウェア
withAuth()      // 一般ユーザー認証
withAuthParams() // パラメータ付きルート認証
withAdminAuth()  // 管理者認証
```

#### 保護されたルート
- `/dashboard/*` - ログインユーザーのみ
- `/api/admin/*` - 管理者のみ
- `/api/ai/*` - 認証必須（クォータチェック付き）

#### 公開ルート
- `/` - ランディングページ
- `/api/webhooks/*` - 外部サービス連携
- `/payment/*` - 決済フロー

## 6. 音楽教育機能のアーキテクチャ

### 6.1 ABC記法処理フロー

```
User Input → AI Generation → ABC Notation → Validation
                  ↓               ↓            ↓
          Prompt Engineering  abcjs Parser  Quality Check
                  ↓               ↓            ↓
            OpenAI API      Visual Rendering  Storage
```

### 6.2 AI生成の統合方法

#### プロンプトエンジニアリング
- **難易度別制約**: beginner/intermediate/advanced
- **楽器別最適化**: piano/guitar/violin/flute
- **教育的配慮**: 段階的難易度、学習ポイント明示

#### 品質管理システム
```typescript
QualityGate {
  - Playability Score (0-10)
  - Learning Value Score (0-10)
  - ABC Syntax Validation
  - Automatic Improvement Suggestions
}
```

### 6.3 学習メトリクスの収集と活用

#### 収集メトリクス
- **達成率**: セクション完了率
- **反復指数**: 練習回数の追跡
- **テンポ到達**: BPM目標達成度
- **弱点箇所**: ループ回数の多い小節

#### 活用方法
- パーソナライズされた練習提案
- 弱点ドリルの自動生成
- 進捗レポートの可視化
- メンターへのフィードバック

## 7. セキュリティとパフォーマンス

### 7.1 セキュリティ対策

#### 認証・認可
- **Clerk Authentication**: OAuth 2.0, JWT
- **Role-Based Access Control**: student/mentor/admin
- **Session Management**: Secure cookie-based

#### データ保護
- **環境変数管理**: .env.localによる機密情報隔離
- **API Key Security**: サーバーサイドのみでの利用
- **Webhook Verification**: Stripe/Clerk署名検証
- **SQL Injection対策**: Drizzle ORMのパラメータバインディング

#### 冪等性保証
- Webhookイベントの重複処理防止
- トランザクション管理による整合性維持

### 7.2 パフォーマンス最適化戦略

#### フロントエンド最適化
- **Server Components優先**: Client Componentの最小化
- **画像最適化**: next/imageによる自動最適化
- **コード分割**: 動的インポートによる遅延読み込み
- **Turbopack**: 高速ビルド・HMR

#### バックエンド最適化
- **Serverless Database**: Neonの自動スケーリング
- **Connection Pooling**: @neondatabase/serverless
- **インデックス最適化**: 複合インデックスによるクエリ高速化
- **キャッシング戦略**: Edge Caching, Stale-While-Revalidate

#### データベース最適化
- **適切なインデックス設計**: 頻繁なクエリパターンに最適化
- **N+1問題の回避**: Drizzle relationsによる効率的なJOIN
- **バッチ処理**: 大量データ処理の最適化

## 8. 開発・運用環境

### 8.1 開発環境
- **Package Manager**: pnpm (推奨)
- **TypeScript**: Strict mode有効
- **Linting**: ESLint (Flat Config)
- **Testing**: Vitest (Unit) + Playwright (E2E)

### 8.2 CI/CD パイプライン
- **ビルド検証**: TypeScript型チェック
- **テスト自動化**: Unit/Integration/E2E
- **品質チェック**: ESLint, Prettier
- **デプロイ**: Vercel自動デプロイ（推定）

### 8.3 監視・分析
- **エラー監視**: Sentry
- **パフォーマンス**: Vercel Speed Insights
- **ユーザー分析**: Vercel Analytics
- **カスタムメトリクス**: RAGメトリクス、学習進捗

## 9. 今後の拡張性

### 9.1 計画されている機能
- **MIDI/MusicXML対応**: より複雑な楽譜形式のサポート
- **マルチパート楽譜**: オーケストラ・バンド編成対応
- **リアルタイム協調学習**: WebSocketsによる同期演奏
- **AIチューター機能**: 個別指導AIの強化

### 9.2 スケーラビリティ考慮事項
- マイクロサービス化の準備
- GraphQL APIの導入検討
- CDNの活用拡大
- データベースのシャーディング戦略

## 10. まとめ

MUEDシステムは、モダンなWebスタック（Next.js 15.5, React 19, TypeScript）を基盤に、音楽教育に特化した包括的な学習管理システムとして設計されています。

**主な強み:**
- AI統合による革新的な教材生成
- 堅牢な認証・決済システム
- スケーラブルなServerlessアーキテクチャ
- 教育効果を重視した機能設計

**技術的特徴:**
- Server Components優先のパフォーマンス設計
- 型安全性を重視したTypeScript実装
- 包括的なテストカバレッジ
- セキュリティファーストの設計思想

このアーキテクチャは、現在の要件を満たしつつ、将来の拡張にも対応できる柔軟性を持っています。