# チーム別 TODO リスト（MVP ‑ Phase 0 / Week4）

> 各タスクの進捗状況:  
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手  
> 期限は「週番号＝ロードマップ表上の週」を示す（例: 週5＝開始5週目末）。

---

## 📋 今週の進捗

- [✅] **フロントエンド・AIサービス連携テスト実装完了**
  - `ApiTestPanel`コンポーネント作成（UI経由でのAPI接続確認）
  - `apiTestClient`実装（APIエンドポイント接続用統一インターフェース）
  - CI/CD環境向けテスト自動化（モック/実環境の切り替え機能）
  - 詳細は`docs/architecture/api-integration-testing.md`参照

---

## 🧑‍💻 山田（PM / FE）

- [⬜] **Roadmap更新とディレクトリ戦略の明文化**  
  - `docs/project/roadmap-0503.md` 作成
  - Phase0→Phase1 移行計画を追記
  - `002-project-architecture.mdc`の整合性確保
  - 期限: **週4**

- [⬜] **MVP必須要件のQA**  
  - 全画面のユーザーフロー確認
  - モバイル表示チェック
  - アクセシビリティ（WCAG AA）確認
  - 期限: **週4**

---

## 🧑‍💻 佐藤（FE）

- [⬜] **認証画面 UI 実装**  
  - ログイン/新規登録/パスワードリセット画面
  - Google OAuth 連携
  - 期限: **週4**

- [⬜] **セキュリティヘッダー設定**  
  - CSP設定
  - X-Content-Type-Options など追加
  - 期限: **週4**

---

## 🧑‍💻 田中（FE / 決済）

- [⬜] **Stripe返金処理 PoC**  
  - 予約キャンセル時の返金ロジック実装
  - 返金率カスタマイズ機能
  - 期限: **週4**

- [⬜] **キャンセルポリシー設定**  
  - UI上で各レッスンのキャンセルポリシー設定
  - キャンセルステータスの管理
  - 期限: **週4**

---

## 🧑‍💻 木村（AI サービス）

- [⬜] **AIサービス: LangChain PoC**  
  - FastAPI と LangChain 連携
  - OpenAI API 基本統合
  - 期限: **週4**

- [⬜] **教材生成β版**  
  - `/api/generate/material` エンドポイント作成
  - ダミーレスポンス→実APIレスポンス切替
  - テストケース追加
  - 期限: **週4**

---

## 🧑‍💻 鈴木（DevOps / Test）

- [⬜] **Heroku Pipeline設定**  
  - review-apps 設定
  - staging環境デプロイ
  - 期限: **週4**

- [⬜] **Vercel/Heroku連携ヘルスチェック**  
  - フロントエンド→API疎通テスト追加
  - 自動デプロイ失敗時のロールバック検証
  - 期限: **週4**

- [⬜] **Next.js PoC用CI optional job作成**  
  - feature/next-app-router ブランチでのみ実行
  - ビルド・テスト確認
  - 期限: **週4**

---

## ディレクトリ戦略

```
# 現在（Phase 0 / MVP）
/
├─ src/                 # Vite＋React のモノリス
│   ├─ components/…
│   ├─ screens/…
│   └─ …
├─ ai-service/          # FastAPI
├─ prisma/              # DB スキーマ
└─ tests/               # Vitest / Playwright
```

- **Phase 0 (MVP)**: Vite モノリス (/src)
- **Phase 1 PoC**: Next.js (apps/web) ※別ブランチ `feature/next-app-router` で進行
- **AI/Payment Stub**: 現行ディレクトリを維持

---

## ✅ 共通

- [⬜] **Week4 チケット起票 & Projects Board 更新**  
  - `docs/project/project-config.md` 更新  
  - 期限: **週4**
- [⬜] **Next Daily**: 5/3 10:00 JST  
  - 完了チェック: 各担当 Week4 進捗確認