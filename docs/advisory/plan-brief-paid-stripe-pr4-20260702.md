# Plan Brief — Advisory #8 PR-4: ¥30k 壁打ち Stripe checkout

*2026-07-02 / mued課 → conductor review / kimny HYBRID(A)承認済 + 独立検証 corrections 反映（v2 brief §4/§7）。本briefは **¥30k Stripe の product flow を確定**するもの（コード機構は conductor spec で明確・trigger/booking統合が未定）。M0 core（無料予約 intake）は code-complete/merged・本PR-4は paid tier follow。実装 GO = 本brief review + freee 5軸最終 + kimny Stripe dashboard binding 後。*

---

## 0. 前提（確定済）
- **決済 = HYBRID**（kimny承認）: ¥30k壁打ち=**Stripe** / ¥250k診断・月額=**freee 適格請求書+振込**（freee課主管）。本PR-4 = **¥30k Stripe のみ**。
- **corrections（独立検証）**: 既存 `checkout/route.ts` は reservation密結合+LMS branding+getCurrentua gate ゆえ drop-in不可 → **advisory専用 checkout route 新規**（~3-5 dev-days）。dynamic `price_data`(currency:'jpy'・unit_amount任意) パターンのみ流用。
- entity = 株式会社グラスワークス（kimny確認）。手数料~3.6%（ops・要確認）。適格請求書は Stripe 不可 → ¥30k の receipt は Stripe auto-receipt のみ（適格請求書要求客は freee 別発行 = freee課領域）。

## 1. ★確定したい product flow（本briefの主眼・conductor/kimny 判断）

roadmap P2: 「無料60分 → 次の一手のデフォルト＝**¥30k 継続** or ¥250k 診断の提案」＝**¥30k は壁打ち本番内で kimny が提案**（self-serve でなく in-session）。→ trigger UX:

**QUESTION: ¥30k checkout の trigger をどれにするか？**
- **(a) kimny-initiated 決済リンク（推奨）**: kimny が「次回¥30k」提案時に、admin/軽認証で ¥30k checkout session を生成→ client に URL 共有（メール/口頭）。client 支払い→webhook 記録→確認メール。**booking(枠)は既存 free-booking flow で別途**（curated 枠を client が予約 or kimny 調整）。**= 最小・roadmap 整合・公開UI追加ゼロ**。
- (b) LP に「有償セッション(¥30k)」導線: 無料と並ぶ self-serve 有償予約（枠選択→¥30k支払い→booking）。**= 公開UI増・「無料入口」設計と競合（roadmap「無料の destination化を防ぐ」に注意）**。
- (c) 支払い→即booking 統合: ¥30k checkout に枠選択を含め、支払い成功で slot claim。**= flow最密だが Stripe success 後の atomic booking 実装増**。

**RECOMMENDATION: (a)**。¥30k は in-session 提案ゆえ self-serve 公開UI不要。checkout route は trigger非依存（session生成のみ）ゆえ (a) で実装し、将来 (b)/(c) が要れば同 route を再利用。**booking(枠)と payment を分離**＝MVP最小。

## 2. 実装（(a)前提・Tier2・全 kimny gate 後）
- `app/api/advisory/checkout/route.ts`【new】: POST（軽認証 or INTERNAL_API_KEY・匿名client情報受領）→ `stripe.checkout.sessions.create`（mode:'payment'・line_items dynamic price_data currency'jpy' unit_amount=30000・**product_data.name/description = advisory**〔LMS branding回避〕・metadata `{service:'advisory', kind:'wallhit_30k', inquiryId?}`・success/cancel_url）→ checkout URL 返却。金額は定数(¥30,000)、将来可変なら param。
- `app/api/webhooks/stripe/route.ts`【small-add】: 既存 webhook に `metadata.service==='advisory'` 分岐 → `checkout.session.completed` で advisory 支払い記録（advisory_inquiries に paid 行 or 新 `advisory_payments`〔amount/stripe_session_id/status/created_at〕）+ **after() で post-pay 確認メール**（advisory branding）。KPI: 有償転換の記録元。
- `app/api/advisory/refund/route.ts`【new・小】: 無形役務 簡易 refund（`stripe.refunds.create`・**Stripe 手数料非返却前提**・軽認証）。
- tests: checkout session params（dynamic JPY/advisory metadata/branding）+ webhook 分岐（advisory 記録）+ refund。既存 Stripe mock パターン流用。
- `.env`: 既存 `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` 流用（新規なし）。

## 3. 依存・gate
- **freee 5軸最終**（tlv43hxs draft→conductor /codex→kimny money gate）: ¥30k=Stripe / ¥250k+=freee の境界確定。¥30k コードは決定済ゆえ並行実装可、但し money gate 前 merge 保留可。
- **kimny Stripe dashboard**: account binding（株式会社グラスワークス）確認 + advisory product/branding 設定（freee PR#78 手順）。
- **kimny money gate**（不可逆・価格）: ¥30k 実課金の GO。
- **entity/手数料 確認**（kimny/運用）。

## 4. スコープ外（本PR-4に含めない）
- ¥250k診断・月額¥200k/¥400k = **freee 適格請求書+振込**（freee課・#9）。
- 適格請求書発行（Stripe不可・freee領域）。
- 有償セッションの self-serve 公開UI〔(b)〕= trigger (a)採用なら不要。

## 5. 判断要請
```
QUESTION: ¥30k checkout trigger = (a)kimny-initiated決済リンク / (b)LP self-serve有償導線 / (c)支払い→即booking統合 のどれか？
RECOMMENDATION: (a)。in-session提案・公開UI不要・最小・roadmap「無料の destination化を防ぐ」整合。checkout route は trigger非依存で(a)実装→将来再利用可。
```

*一次＝v2 brief §4/§7（HYBRID+corrections）・roadmap P2（¥30k in-session提案）・freee課 5軸（tlv43hxs）・conductor spec（advisory checkout/webhook分岐/refund）。実装 = 本brief review + freee最終 + kimny Stripe binding 後（Tier2・kimny money gate）。*
