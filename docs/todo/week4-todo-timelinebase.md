# Sprint 1 TODO リスト（Week1-2）

> **注意**: このファイルはSprint 1の計画を反映しています。以前の`week4-todo.md`の内容は破棄されました。
> 各タスクの進捗状況:
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手
> スプリント目標: Next.js App Router骨格と認証／DBスキーマを完成させ、ログイン後ダッシュボードまで動線を繋ぐ。

## スプリント計画概要
プロジェクトは全4スプリント（2週間×4＝8週間）で構成され、Sprint 1はWeek1-2に実施します。
主要な技術スタックとして、Next.js 14、React 18、TypeScript、TailwindCSS、Prisma、Supabaseを採用しています。

### Sprint 1（Week1-2）の主要目標
- Next.js App Router骨格と認証／DBスキーマを完成
- ログイン後ダッシュボードまでの動線を構築
- 合計ストーリーポイント: 14ポイント

### Definition of Done（完了の定義）
- dev / prod 環境でログイン可能
- RLSにより`public.user`テーブル自己行のみアクセス可能
- Storybook が Vercel Preview で閲覧可能

以下は詳細な実装タスクです：

---

## Week 1 タスク

### Day 1
- [✅] **Sprint 1 チケット起票 & Projects Board 更新** (PM: 山田)
  - `docs/project/project-config.md` の更新
  - GitHub Projectsボードの新Sprint体制反映
  - 旧week4タスクからの移行整理

### Day 3
- [✅] **GitHub Actions: eslint+test+build (Story 5)** (FE3: 鈴木)
  - PRで自動CIが走るようGitHub Actionsを設定
  - eslint、テスト実行、ビルド検証の自動化
  - コードカバレッジレポート生成の追加

- [✅] **βユーザー招待準備 (マーケティング連携)** (マーケ: 鈴木)
  - 招待メール文面作成
  - βユーザーリスト最終化
  - 招待プロセスの設計
  - 登録トラッキング方法の確立

### Day 4
- [⬜] **App Routerレイアウト / Tailwindテーマ (Story 3)** (FE1: 田中)
  - Next.js 14 App Router構造の設定
  - Tailwind CSS設定とテーマカスタマイズ
  - `/(auth)/login`、`/dashboard`画面の実装
  - レスポンシブデザイン対応

### Day 5
- [⬜] **Supabase接続 & Prisma schema v1 (`User`, `Role`) (Story 2)** (BE2: 佐藤)
  - Prismaスキーマ定義（User, Role）
  - Supabase PostgreSQL接続設定
  - マイグレーション実行と検証
  - Row Level Security (RLS)ポリシー設定

- [⬜] **StorybookベースUIライブラリ（Button/Card）(Story 4)** (FE2: 佐藤)
  - Storybookの初期設定と統合
  - ボタンコンポーネント（バリエーション含む）実装
  - カードコンポーネント実装
  - コンポーネントドキュメント作成

---

## Week 2 タスク

### Day 1
- [⬜] **セキュリティヘッダー設定 (関連タスク)** (FE2: 佐藤)
  - CSP (Content Security Policy)設定
  - X-Content-Type-Options, Strict-Transport-Security等の設定
  - `next.config.js`での適用
  - セキュリティヘッダーのテスト検証

### Day 2
- [✅] **`auth`パッケージ: NextAuth.js + Google OAuth (Story 1)** (BE1: 木村)
  - ログイン/ログアウト機能実装
  - Google OAuthプロバイダー統合
  - JWT発行と検証機能
  - ユーザーセッション管理

### Day 5
- [🟡] **AI教材生成β版 - バックエンド準備 (Sprint 3 Story 12 先行着手)** (AI: 木村)
  - FastAPIエンドポイント `/generate/material` の基本設計
  - 音楽家提供のサンプル仕様確認と適用
  - APIドキュメントの作成
  - Python依存関係の整理
  - 設計完了

---

## 📅 イベント

- **Daily Standup**: 平日毎朝10:00 JST
- **Sprint 1 レビュー**: Week 2 金曜午後
- **Sprint 1 リトロスペクティブ**: レビュー直後
