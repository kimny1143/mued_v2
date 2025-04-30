# チーム別 TODO リスト（MVP ‑ Phase 0 / Week2）

> 各タスクの進捗状況:  
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手  
> 期限は「週番号＝ロードマップ表上の週」を示す（例: 週3＝開始3週目末）。

---

## 🧑‍💻 山田（PM / FE）

- [🟡] **Week2 チケット起票 & GitHub Projects 整理**  
  - Week2 スプリントタスクを Projects Board に反映  
  - 期限: **週2**
- [🟡] **ADR-0002 作成**  
  - API バージョニング / エラーフォーマット決定  
  - 期限: **週2**
- [ ] **Netlify Preview 環境構築**  
  - デモ環境を公開設定  
  - 期限: **週2**

---

## 🧑‍💻 佐藤（FE）

- [🟡] **Realtime Chat β UI / Supabase Channel Hook 実装**  
  - `src/lib/apiClient` 経由で GET/POST `/chat/messages`  
  - 期限: **週2**
- [🟡] **ワンタップ練習記録 UI PWA 対応**  
  - React Hook Form + Zod で `POST /practice/logs`  
  - 期限: **週2**
- [ ] **Storybook 基盤立ち上げ**  
  - Tailwind プリセット & UI コンポーネント登録  
  - 期限: **週2**

---

## 🧑‍💻 田中（FE / 決済）

- [🟡] **Stripe Checkout 本番 API キー切替**  
  - `lib/stripe.ts` の環境変数切り替え  
  - 期限: **週2**
- [ ] **FastAPI Webhook Stub 実装**  
  - AI / 支払いサービスに Webhook モックエンドポイント追加  
  - 期限: **週2**

---

## 🧑‍💻 木村（AI サービス）

- [🟡] **GET/POST `/chat/messages` Stub 実装**  
  - FastAPI で CRUD エンドポイント定義  
  - 期限: **週2**
- [🟡] **POST `/practice/logs` Stub 実装**  
  - FastAPI でログ保存 Stub  
  - 期限: **週2**
- [ ] **MusicXML ライブラリ調査 & PoC**  
  - `opensheetmusicdisplay` で譜面変換検証  
  - 期限: **週2**
- [ ] **OpenAPI スキーマ更新**  
  - Stub 追加分を `fastapi.openapi.json` に反映  
  - 期限: **週2**

---

## 🧑‍💻 鈴木（DevOps / Test）

- [ ] **Codecov / Artifacts によるカバレッジ可視化**  
  - GitHub Actions でレポートアップロード設定  
  - 期限: **週2** (目安: 週4)
- [🟡] **pytest による FastAPI エラーハンドリングテスト追加**  
  - 200/400/500 ケースを `tests/test_api.py` に記載  
  - 期限: **週2**
- [ ] **KPI ダッシュボード初版作成**  
  - Supabase → Metabase/Redash 接続  
  - 期限: **週2**

---

## ✅ 共通

- [ ] **Next Daily**: 明日 10:00 JST  
  - 完了チェック: 各担当 Week2 状況 