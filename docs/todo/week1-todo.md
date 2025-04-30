# チーム別 TODO リスト（MVP ‑ Phase 0）

> 各タスクの進捗状況:  
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手  
> 期限は「週番号＝ロードマップ表上の週」を示す（例: 週2＝開始2週目末）。

---

## 🧑‍💻 山田（PM / FE）

- ✅ **Supabase Auth Hooks & Context 実装**  
  - `src/contexts/AuthContext.tsx` の整備  
  - `useAuth()` カスタムフック導入  
  - 期限: **週2**
- ✅ **README.md 基盤セットアップ手順更新**  
  - vite/dev/test コマンド例を追記  
  - 期限: **週1**
- ✅ **ADR テンプレート作成**  
  - `docs/architecture/ADR-template.md`  
  - 既存決定事項を ADR-0001 として記録開始  
  - 期限: **週1**

---

## 🧑‍💻 佐藤（FE）

- [✅] **DashboardLayout + Routing 雛形**  
  - `src/components/DashboardLayout.tsx` リファクタ  
  - `/screens` ルーティング設計（React-Router v6）  
  - 期限: **週2**
- [✅] **Shadcn UI ボイラープレート統合**  
  - `components/ui/*` の variant 整理  
  - 期限: **週3**

---

## 🧑‍💻 田中（FE / 決済）

- [✅] **Stripe Checkout Integration (Sandbox)**  
  - `src/lib/stripe.ts` クライアント生成  
  - `/screens/PlansPage` から Checkout セッション作成 → success/cancel ページ  
  - 期限: **週5**
- [✅] **Stripe Webhook 受信 Stub**  
  - `netlify/functions/stripe-webhook.ts` などで仮実装  
  - 期限: **週6**

---

## 🧑‍💻 木村（AI サービス）

- [✅] **FastAPI course-gen Endpoint `POST /courses/generate`**  
  - `apps/ai-service/app/api.py` にエンドポイント追加  
  - モック応答（固定 JSON）で良い  
  - 期限: **週3**
- [✅] **Docker Compose で AI サービスをローカル起動**  
  - `docker-compose.yml` に service 追記  
  - 期限: **週3**
- [✅] **OpenAPI スキーマ自動生成確認**  
  - `fastapi.openapi.json` を commit し FE 側 fetch hook 生成予定  
  - 期限: **週4**

---

## 🧑‍💻 鈴木（DevOps / Test）

- [✅] **Vitest + RTL 基盤 PR**  
  - `vitest.config.ts` / `testing/setup.ts`  
  - サンプル `Button.test.tsx` 同梱  
  - 期限: **週1**
- [✅] **GitHub Actions CI ワークフロー `ci.yml`**  
  - node 20 / npm ci / vitest run --coverage  
  - AI サービス用 pytest ステップ（後で有効化）  
  - 完走時間 1 分以内を計測  
  - 期限: **週1**
- [ ] **Codecov or artifacts で coverage 可視化**  
  - Step2 で導入予定 → 期限: **週4** （目安）

---

## ✅ 共通

- [ ] **基盤セットアップ PR レビュー**（全員）  
  - Deadline: **週1 終了時**  
- [ ] **Next Daily**: 明日 10:00 JST  
  - 完了チェック: 山田 README / 鈴木 CI / PR 状況  