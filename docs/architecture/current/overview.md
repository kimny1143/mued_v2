# MUED LMS アーキテクチャ概要

**最終更新: 2025年1月**

## システム概要

MUED LMS（音楽レッスン学習管理システム）は、音楽教育に特化したオンライン学習プラットフォームです。AIによる教材生成、パーソナライズされたメンターマッチング、リアルタイムコミュニケーション機能を提供します。

## アーキテクチャの特徴

### 1. モジュラーモノリス構成

現在はNext.js 14 App Routerを基盤としたモジュラーモノリスとして実装されており、将来的なマイクロサービス化を見据えた設計となっています。

```
┌─────────────────────────────────────┐
│      MUED LMS Web Application       │
│         (Next.js 14 App Router)     │
├─────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐ │
│  │ App Routes  │  │ API Routes   │ │
│  └─────────────┘  └──────────────┘ │
│  ┌─────────────┐  ┌──────────────┐ │
│  │ Components  │  │ Services     │ │
│  └─────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
          │                │
          ▼                ▼
┌──────────────┐  ┌─────────────────┐
│   Supabase   │  │  Python AI API  │
│  (Auth + DB) │  │   (FastAPI)     │
└──────────────┘  └─────────────────┘
```

### 2. 主要コンポーネント

#### フロントエンド層
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript + Tailwind CSS
- **Components**: Shadcn UI ベース
- **State Management**: React Query + Zustand

#### バックエンド層
- **API Routes**: Next.js API Routes
- **Authentication**: Supabase Auth (Google OAuth対応)
- **Database**: PostgreSQL (Supabase経由)
- **ORM**: Prisma

#### 外部サービス連携
- **AI Service**: Python/FastAPI (独立サービス)
- **Payment**: Stripe
- **Email**: Resend
- **Realtime**: Supabase Realtime

### 3. データフロー

```
User → Next.js App → API Routes → Services
                         ↓
                    External APIs
                    (Stripe, AI, etc.)
                         ↓
                    Database (Supabase)
```

## 主要機能アーキテクチャ

### 1. 認証・認可システム
- Supabase Authによる統合認証
- ロールベースアクセス制御（RBAC）
- JWTトークンベースのセッション管理

### 2. 予約システム
- レッスンスロット管理
- 承認フロー（メンター承認 → 学生支払い）
- リアルタイムステータス更新

### 3. 決済システム
- Stripe Checkout統合
- サブスクリプション管理
- Webhook処理による自動化

### 4. リアルタイムコミュニケーション
- Supabase Realtimeによるメッセージング
- 予約ステータスの即時反映
- プッシュ通知連携

## セキュリティアーキテクチャ

### 1. 認証レイヤー
- OAuth 2.0 (Google)
- Supabase Row Level Security (RLS)
- API認証トークン

### 2. データ保護
- HTTPS通信の強制
- 環境変数による機密情報管理
- CSPヘッダーの適用

### 3. アクセス制御
- ロールベースの権限管理
- APIレート制限
- CORSポリシーの適用

## スケーラビリティ戦略

### 現在（Phase 0）
- Vercelによる自動スケーリング
- Edge Functionsの活用
- CDNによる静的アセット配信

### 将来計画（Phase 1+）
- サービス境界の明確化
- 独立したマイクロサービスへの段階的移行
- メッセージキューの導入検討

## 監視・運用

### 1. ロギング
- Vercel Analytics
- カスタムロギング実装
- エラートラッキング

### 2. モニタリング
- パフォーマンス監視
- アップタイム監視
- ユーザー行動分析

### 3. バックアップ
- Supabaseによる自動バックアップ
- 定期的なデータエクスポート

## 技術的決定事項

詳細な技術的決定については、[ADR（Architecture Decision Records）](../decisions/)を参照してください。

## 関連ドキュメント

- [技術スタック詳細](./tech-stack.md)
- [API設計](./api-design.md)
- [データベース設計](./database-design.md)
- [セキュリティガイドライン](../../development/security-practices.md)