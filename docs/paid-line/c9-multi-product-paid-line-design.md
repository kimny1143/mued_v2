# C9 — 有料の線を複数の製品に（MUEDvox の前に）

- 依頼: kimny 直命（10/3・Chief 経由）「MUEDvox … 実装しましょう」。MUEDvox は $69・単一価格・発売日に macOS AU/VST3/AAX＋Windows VST3
- 書いた人: mued課（2026-10-04）。レビュー: Tier 3（決済と鍵）＝conductor 経由
- ★この PR（設計）はコードを変えない。実装は下の PR-A から

## 1. 今の形（1 製品前提）

| 場所 | 前提 |
|---|---|
| `lib/masterchain/fastspring-webhook.ts:151` | ★注文の製品を読まず `productId: "muedsp_masterchain"` に固定 |
| 同 `:274` | 鍵の `scope` は既定の "masterchain"（`issueLicense` の既定） |
| 同 `:181` | GA4 の item の名前は "MUEDsp masterchain" 固定 |
| 同 `:369`・`:377` | 配達メールと DL の URL は masterchain 固定 |
| `lib/masterchain/fastspring-checkout.ts:35` | 購入の製品は env `NEXT_PUBLIC_FASTSPRING_PRODUCT_PATH` の 1 本 |
| `lib/plugins/portal-data.ts` | 購入の行は masterchain の DL の URL・Windows に固定 |
| `lib/funnel/launch.ts` | 発売の数は masterchain のメールの件名の完全一致 |

∴ このまま MUEDvox を FastSpring に足すと、★MUEDvox の注文に masterchain の鍵を出す。

## 2. 実測（本番 DB・SELECT のみ・kimny の許可 10/4）

`webhook_events` の `order.completed`（fastspring）5 件の `data.items[]`（キーの型と product の値だけ。宛先・名前・金額は読んでいない）:

| event | live | items | `items[0].product` | sku |
|---|---|---|---|---|
| EVWBQEJF… | true | 1 | `muedsp-masterchain` | null |
| EVWBMLDP… | true | 1 | `muedsp-masterchain` | null |
| 2 件 | false | 1 | `muedsp-masterchain` | null |
| EVWBT5YJ… | false | 1 | ★`example-product` | `example-product` |

- ★製品は `data.items[i].product`（string・FastSpring の product path）で取れる。`sku` は null なので使わない
- quantity は 1・items は 1 件（購入のボタンが 1 製品 × 1 だけをカートに入れるため）
- ★`example-product` は FastSpring の管理画面の「テスト通知」。live=false なので今は履行されないが、★もし live で来たら、今のコードは masterchain の鍵を出す

## 3. 設計

### 3.1 有料の製品の表（新: `lib/plugins/paid-products.ts`）

```ts
PAID_PRODUCTS = {
  masterchain: {
    fastspringPath: "muedsp-masterchain",   // ★実測の値（§2）
    productId: "muedsp_masterchain",        // masterchain_purchases.product_id（今の値のまま）
    scope: "masterchain",                   // 鍵の scope（license.ts の v2・今の既定と同じ）
    itemName: "MUEDsp masterchain",         // GA4
    downloadUrl, version, windows,          // lib/masterchain/config.ts から
    delivery: "masterchainLicenseDelivery", // メールの template
  },
  // muedvox は、FastSpring に商品ができて path が決まった PR で足す（PR-C）
}
paidProductByFastspringPath(path) → entry | null
```

### 3.2 webhook（PR-A・★Tier 3）

- parse で `data.items[]` を読む。★「表にある製品の item が、ちょうど 1 件・quantity 1」の時だけ履行する
- それ以外（表に無い path・item が 0 件・2 件以上・quantity ≠ 1）は ★新しい結果 `"unknown_product"`:
  - 鍵を出さない・購入の行を作らない・メールを送らない
  - webhook_events の行は `failed` で残す（payload は残る）＋ `logger.error` ＋ 運用のメール（OPERATOR_ALERT_EMAIL）
  - ★`unparseable` と同じく、行を `failed` で確定してから 500 を返す＝FastSpring が再送する。★表を直して deploy すれば、次の再送でそのまま履行される（人の手の履行が要らない）
  - ★「払った人に何も届かない」が起きるのは、FastSpring に商品を足したのに表に足していない時だけ。その時は運用のメールが鳴る。★間違った製品の鍵を出すより、届かない方が直せる（鍵はオフライン検証で撤回できない）（kimny 10/4「鍵を出さず通知」）
- 鍵: `issueLicense({ owner, order, scope: product.scope })`
- 行: `productId: product.productId`（masterchain は今と同じ値）
- GA4: `itemName`・`itemId` は表から
- メール: `product.delivery` の template と `product.downloadUrl`（masterchain は今と同じ）
- ★order_id の一意（masterchain_purchases）はそのまま。1 注文 = 1 製品（上の規則）なので、DB の変更は無い
- return.created は order_id で引くので変えない

### 3.3 masterchain の今の動きを変えないこと（test で固定）

- `muedsp-masterchain` の注文: 鍵の scope・行の product_id・GA4 の item・メール・DL の URL が ★今と完全に同じ（既存の test の fixture に、実測と同じ `items: [{ product: "muedsp-masterchain", quantity: 1 }]` を足す）
- ★変わるのは「masterchain でない注文」だけ（今は誤って masterchain を出す → これからは出さない）
- test: `example-product`・items 無し・2 件・quantity 2 → `unknown_product`・鍵 0・行 0・メール 0
- meta-RED: 判定を外すと `example-product` が masterchain の鍵を受け取る test が落ちること

### 3.4 後の PR

| PR | 中身 | Tier |
|---|---|---|
| PR-A | 表（masterchain だけ）＋ webhook の振り分け（3.2） | ★3 |
| PR-B | ポータル: 購入の行を product_id で表から引く（DL・Windows・版）。funnel の発売の数を製品ごとに | 2 |
| PR-C | MUEDvox: 表に 1 件（FastSpring の path が決まってから）・購入のボタンを製品の引数つきに（env の 1 本 → 表の path）・デモ・メールの template・製品ページ・法務の文 | 3（表と購入）＋2（ページ） |

## 4. 外の手

- kimny: FastSpring に MUEDvox の商品（path・$69）。★path は表に入れる値なので、決まったら mued へ
- dsp: MUEDvox のプラグインが scope `muedvox` の鍵だけを通すこと（同じ公開鍵）。masterchain の鍵で MUEDvox が開かないこと、その逆も
- conductor: Tier 3 のレビュー
