# C1 — FastSpring 商品 + フルフィルメント 仕様

*mued課 / 2026-07-26 / ★**入力は kimny または conductor**。本 doc は「何を入れるか」を確定させるもので、管理画面への入力は含みません。*

**方式は A で確定**（conductor 2026-07-26）= **`order.completed` webhook で自社が Ed25519 鍵を発行し、Resend で配達**。実装は `lib/masterchain/license.ts` / `handleFastspringOrderCompleted`（**#766 merged**）。

---

## ★ 事実と推測を分けます

**[FACT]** = 公式ドキュメントの逐語で裏を取ったもの / **[UNKNOWN]** = 裏が取れていないもの。
★**画面の既定値は信じない**（契約住所が Iowa で埋まっていた・税務フォームが W-9 に化けた前例）。

---

## 1. 商品仕様

| 項目 | 値 | 状態 |
|---|---|---|
| 価格 | **USD 69** | 確定（kimny → FastSpring 2026-07-14） |
| 課金 | **一括購入（one-time）**・★**ローンチ時サブスクなし** | 確定 |
| 通貨 | **USD**（payout も USD） | 確定 |
| 製品 | MUEDsp masterchain — macOS audio plugin（**VST3 / AU / AAX**） | 確定 |
| **display name** | ★**未決** | ★**kimny 判断待ち** |
| SKU / product path | ★**未決**（実装側の `productId` は `muedsp_masterchain`) | ★要決定 |
| 説明文 | ★**事実の記述に留める**。訴求文面は kimny gate | 未着手 |
| 画像 | ★**要否 未決** | ★要決定 |

★**実装側の `productId` は `muedsp_masterchain` に固定**されています（`fastspring-webhook.ts`）。**FastSpring 側の SKU がこれと違っても動きます**（**我々は payload の product を見ていない**）が、**揃えた方が突合が楽**です。

---

## 2. ★ フルフィルメント（本命）

### 結論: ★**FastSpring 側の license key generation は使わない**

**[FACT]** 公式ドキュメント（`developer.fastspring.com/docs/license-key-fulfillments`）が挙げる fulfillment action:
**License Keys**（Pre-Defined List / Script / **Remote Server Request** / CocoaFob / Aquatic Prime / Software Passport）/ **File Downloads** / **Signed PDF** / **EDS** / **Customer Notifications**

★**どれも使いません。** 理由: **FastSpring は我々の秘密鍵を持たない**ので、**FastSpring が生成した文字列はプラグインの焼込公開鍵で検証できません**（→ `c-plus-…design.md` の SUPERSEDE 節）。

**必要なのは `order.completed` の webhook 通知だけ**です。

### ★ Remote Server Request を採らなかった理由（記録）

**[FACT]** 「*Remote server request fulfillments contact a remote server to create a new, custom license key **while FastSpring processes the order***」「*After receiving the license key, FastSpring provides the customer with the license key and saves it as part of the order record*」＝ **同期呼び出し・配達も FastSpring**。

**不採用の理由**（conductor 判断・2026-07-26）:
1. ★**同期なので、我々が落ちていると注文自体が失敗する**。A（order.completed）なら**再送で回復**する。★**買い物が失敗するのは、鍵が遅れるより悪い**
2. **配達を FastSpring に任せる利点が消えた** — **自前配達が実装済**（#766）
3. **返金時の失効が FastSpring 側に乗る利点も消えた** — ★**kimny 批准で「失効はしない・記録のみ」に決定**

### ★ [UNKNOWN] 未解決 — 「fulfillment action ゼロ」が許されるか

**[UNKNOWN]** ★**公式ドキュメントは「fulfillment action が必須か」を書いていません。** 「無い」ではなく「**このページには書かれていない**」。

- **許されるなら**: fulfillment は**何も設定しない**。webhook だけ
- **1つ必須なら**: ★**買い手に見せて害のないもの**を選ぶ（例: 注文完了画面の customer notification に「**ライセンスキーはメールでお送りします**」）。★**License Keys 系は選ばない**（**我々が発行したものと二重になり、どちらが本物か買い手が分からなくなる**）

→ ★**管理画面で商品を作る時に判明します**（**必須なら入力を要求される**）。**Kevin に聞く必要はおそらくありません。**

---

## 3. 注文後に買い手に見せるもの

- 「**ライセンスキーはメールでお送りします**」+ **ダウンロードリンク**
- ★**鍵そのものを注文完了画面に出さない** — **メールが正本**（再送可能・支援時に参照できる）。画面は閉じたら戻れません

---

## 4. ★ test order — Store Activation の**前**に打てます

**[FACT]** `developer.fastspring.com/docs/activate-your-store` は activation を3段階に分け、**「Place a test order」は2段目（Prepare your website）**、すなわち ★**"Request activation" の前提条件**として置かれています:

> *"Build and test your store for free in `Test` mode (a sandbox environment)."*
> *"Confirm your checkout setup is working as configured by simulating test orders."*
> *"Verify fulfillment delivery... **before you go live**"*

★**∴ activation の 1-3営業日を待つ必要はありません。** **商品が作られ次第、test order を打てます。**

### ★ なぜこれが critical path か

`lib/masterchain/fastspring-webhook.ts` の parse は ★**ドキュメント上の形で書かれており、実物と突き合わせたことが一度もありません**（`TODO(C1)` が5箇所）。

★**形が違えば `parseFastspringOrderCompleted` が null を返し、何も起きません** = **注文は来るのに鍵が出ない**。★**静かに失敗します。**

**test order 1本で確定させるもの**:
1. **batch 封筒**（`events: [...]` か単体か）・**event id / type の位置**
2. **order id / buyer email / 金額 / 通貨 / 国**の実パス
3. ★**buyer name**（`contact.first` / `contact.last` を仮定している）— ライセンス payload に載る
4. **custom tags**（`gaClientId` / `utm*` / `marketingConsent`）が popup から実際に届くか
5. ★**locale が取れるか**（現状 `en` 固定・payload に言語が無い）
6. **署名 header 名**と **base64/hex**（`fastspring-signature.ts` の想定と一致するか）

---

## 5. この doc が答えないこと

- **管理画面への実入力**（★kimny または conductor 許可後）
- **税務・返金の表記文面**（法務確認 → kimny gate）
- **display name / SKU / 画像**（★kimny 判断）
