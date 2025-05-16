# 予約フロー / Checkout Issues 管理メモ

最終更新: {{date}}

---

## 1. 現状サマリ

| 項目 | 状態 | 備考 |
|-----|------|------|
| ログイン | ✅ 成功 (エラーなし) | PKCE フロー & Cookie 問題解決済み |
| メンター: 予約スロット作成 | ✅ 正常 | `/dashboard/lesson-slots` で確認 |
| 生徒: スロット & 予約取得 | ⚠️ **失敗多発** | リロード複数回で成功するケースあり。SWR Key or Realtime Channel? |
| Stripe 決済 | ✅ 通過 | セッション作成 / 決済 > Webhook 呼び出し正常 |
| Success ページ | ❌ `supabaseKey undefined` ループ | 予約詳細取得時に env 不在 → 後述 |
| 予約テーブル更新 | ✅ 行追加 (status = CONFIRMED) | Webhook で status=COMPLETED へ更新 OK |
| スロットテーブル更新 | ❌ `isAvailable` が **true のまま** | 同じスロットで重複予約可能リスク |

---

## 2. 主要課題

1. **データ取得の不安定 (Student)**
   - SWR / React Query の `fallbackData` なしで 404 → 再リクエスト多発？
   - Supabase Realtime Channel の購読がクライアントで二重に登録され race condition?

2. **Success ページ: supabaseKey undefined ループ**
   - `supabaseBrowser` をクライアントで直接呼び env が空文字の場合に発生。
   - 本来 Success ページでは予約詳細をサーバーでプリロードしているため不要。クライアント Fallback を削除 or ガード要。

3. **スロット `isAvailable` 不整合**
   - Stripe Webhook → `reservations COMPLETED` 更新は OK だが、同 `$transaction` 内でスロット更新漏れ。
   - 予約 API で `pending` 作成時点で `isAvailable=false` にすべき。

---

## 3. 対応タスク

| 優先度 | タスク | 担当 | 期限 |
|:--:|---|---|---|
| 🔥 | Success ページのクライアント Fallback (`ReservationSuccessContent`) を削除し、完全サーバー化 | @kimny | ASAP |
| 🔥 | Webhook 処理 (`/api/webhooks/stripe`) `$transaction` で `slot.isAvailable=false` を確実に実行 | @backend |  | 
| ⚠️ | 生徒側データ取得: `useSWR` → `errorRetryCount=0` & Loading Skeleton 導入 / Realtime 再評価 | @frontend |  |
| ⚠️ | 予約 API: スロット同時更新 & 悲観ロック (SELECT … FOR UPDATE) を追加 | @backend |  |
| ✨ | E2E テスト: 予約 → 決済 → ダッシュボード反映 を Playwright で自動化 | QA |  |

---

## 4. メモ / 次の検討

- Supabase Edge Functions で Webhook をオフロードし再試行ロジックを持たせる
- Slot 取得失敗はテーブル Row Level Security か API Route `revalidatePath` の影響の可能性
- 成功 URL を `/dashboard/reservations/success?reservation_id=` に統一（途中で session_id にフォールバックしない）

---

> このドキュメントは課題トラッキング目的のインラインメモです。PR や Issue に反映してください。
