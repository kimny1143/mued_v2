# Vercel Blob の path に、メールアドレスが実質そのまま入っている

- **測定**: 2026-08-04 / mued（コード実読）
- **状態**: ★**見つけた事実の記録。直すかどうかは未判断**（§3）
- **conductor 判断**: **起票する / kimny 面には出さない**（**外部露出でなく・現に漏れていない・判断が今すぐ変わらない**）

---

## 0. 何が在るか（★1段落）

★**`normalizeEmailKey()` はハッシュではない。** **記号を `_` に置換して 40 文字で切っているだけ**なので、★**生成された path から元のメールアドレスが実質そのまま読める。**

```ts
function normalizeEmailKey(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 40);
}
```

**実証（架空アドレス）**:

```
taro.yamada@example.co.jp  →  taro_yamada_example_co_jp
a+tag@gmail.com            →  a_tag_gmail_com
```

∴ ★**`list()` を撃つと、戻り値の path だけで登録者が分かる。** ★**「entry を開かなければ PII に触れない」は成り立たない。**

---

## 1. 範囲（★実測・3ストア）

★**同じ関数が3ファイルに複製されている**（共通化されていないので、1箇所 直しても他が残る）:

| ファイル | path の形 |
|---|---|
| `lib/storage/waitlist-blob.ts:19` | `waitlist/${yyyy}/${mm}/${ts}_${emailKey}.json` ／ `waitlist/idx/${emailKey}.json` |
| `lib/storage/mix-diagnosis-free.ts:3` | `mix_diag_free/idx/${emailKey}.json` |
| `lib/storage/dial-free-campaign-grant.ts:11` | `dial_free_campaign_grant/idx/${emailKey}.json` |

★**Blob へ書く4本目**（`app/api/dial/readiness/analyze/route.ts:188`）は **`readiness-temp/${Date.now()}-${file.name}`** で ★**email 由来ではない**（ただし `file.name` は利用者が付けたファイル名なので、そこに個人名が入る可能性はある。本件とは別）。

---

## 2. どこまでが問題で、どこからが問題でないか

| | |
|---|---|
| ★**外部露出ではない** | `put()` は `access: 'private'`。**URL を知っていても開けない** |
| ★**現に漏れていない** | 公開経路が無い |
| ★**問題なのはここ** | ★**read token を持つ側からは平文で見える。** **「件数を数えるだけ」の操作でも、path が目に入る** |

★**∴ これは「漏洩」ではなく「★最小権限が効かない」形。** **数を数えたいだけの人が、個人を特定できる状態に置かれる。**

---

## 3. ★直すかどうか — 未判断（判断材料だけ置く）

### 直す場合のコスト

★**path 形式を変えると、既存 entry との互換が切れる。**

- **`idx/` は存在確認にしか使っていない**（`list({ prefix })` して `blobs.length > 0`）ので、**新形式へ切替えると★過去の登録者が「未登録」と判定される**——**`mix_diag_free` なら無料診断がもう一度 使える、`dial_free_campaign_grant` なら無料枠がもう一度 付く**
- ∴ ★**移行するなら「新旧 両方を引く期間」が要る**（**新形式で引いて無ければ旧形式でも引く**）
- **`waitlist/${yyyy}/${mm}/` の本体は日付で引けるので、こちらは移行の難度が低い**

### 直さない場合に守るべきこと

- ★**`list()` の結果を、件数以外の形で外に出さない**（**path をログ・PR・peer メッセージに貼らない**）
- ★**本番 Blob を読む操作は kimny 承認の対象**として扱う（**本番 DB と同じクラス**）

### 誰が決めるか

★**未定。** **この文書は「見つけた」までで、**★**「直す」も「直さない」も選んでいない。**

---

## 4. 経緯（★同じ穴を次に作らないため）

**2026-08-04、conductor から「waitlist の月ごと件数を数えてほしい。★path に日付が在るので entry を開かなくてよい」という依頼が来た。**

★**「entry を開かなくてよい」＝ PII に触れずに数えられる、という前提**だったが、★**path に在るのは日付だけではなかった。**

★**止まったのは、実行する前に `normalizeEmailKey` の中身を読んだから**（**「ハッシュだろう」と思っていたので、確かめるつもりで開いた**）。★**conductor も content課 も、この関数の中身を読んでいなかった。**

★**型**: **「値には、その値を成立させる条件を併記する」**（共通ブロック 15）。★**「path に日付が在る」は真だが、「path に何が在るか」の全部ではない。** ★**真である部分文を、全体の説明として使わない。**
