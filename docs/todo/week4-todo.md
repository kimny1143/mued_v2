# Sprint 1 TODO リスト（Week1-2）

> **注意**: このファイルはSprint 1の計画を反映しています。以前の`week4-todo.md`の内容は破棄されました。
> 各タスクの進捗状況:
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手
> スプリント目標: Next.js App Router骨格と認証／DBスキーマを完成させ、ログイン後ダッシュボードまで動線を繋ぐ。

---

## 🧑‍💻 チーム全体

- [⬜] **Sprint 1 チケット起票 & Projects Board 更新** (PM: 山田)
  - `docs/project/project-config.md` 更新
  - 期限: Week 1 Day 1

- [⬜] **GitHub Actions: eslint+test+build (Story 5)** (FE3: 鈴木)
  - PRで自動CIが走る
  - 期限: Week 1 Day 3

---

## 🔒 基盤 & 認証 (Backend)

- [⬜] **`auth`パッケージ: NextAuth.js + Google OAuth (Story 1)** (BE1: 木村)
  - ログイン/ログアウト機能 + JWT発行
  - 期限: Week 2 Day 2

- [⬜] **Supabase接続 & Prisma schema v1 (`User`, `Role`) (Story 2)** (BE2: 佐藤)
  - migration成功 + RLSテストOK
  - 期限: Week 1 Day 5

---

## 🖥️ UI & フロントエンド

- [⬜] **App Routerレイアウト / Tailwindテーマ (Story 3)** (FE1: 田中)
  - `/(auth)/login`, `/dashboard` 画面表示
  - 期限: Week 1 Day 4

- [⬜] **StorybookベースUIライブラリ（Button/Card）(Story 4)** (FE2: 佐藤)
  - 2種類のUIコンポーネント + Docs
  - 期限: Week 1 Day 5

- [⬜] **セキュリティヘッダー設定 (関連タスク)** (FE2: 佐藤)
  - CSP, X-Content-Type-Options等 (`next.config.js`)
  - 期限: Week 2 Day 1

---

## 🚀 優先タスク（旧Week4より移行）

- [🟡] **AI教材生成β版 - バックエンド準備 (Sprint 3 Story 12 先行着手)** (AI: 木村)
  - FastAPIエンドポイント `/generate/material` の基本設計
  - 音楽家提供のサンプル仕様確認
  - 期限: Week 2 Day 5 (設計完了)

- [🟡] **βユーザー招待準備 (マーケティング連携)** (マーケ: 鈴木)
  - 招待メール文面作成
  - βユーザーリスト最終化
  - 期限: Week 1 Day 3

---

## 📅 イベント

- **Daily Standup**: 平日毎朝10:00 JST
- **Sprint 1 レビュー**: Week 2 金曜午後
- **Sprint 1 リトロスペクティブ**: レビュー直後
