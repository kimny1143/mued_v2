# Yuu「動くセッション」付与 — owed マスタリング自走用 (Plan A)

作成: 2026-06-14 / mued課 / 状態: **✅ 実行完了（2026-06-14）。採用 keeper = `e3688b24-6645-4f8a-822c-7818237c30f1`（A verify 全緑）。重複 e067fcf6 削除済。残= Yuu 返信送信（conductor→kimny 声チェック）+ ②c は launch ゲートで後日。**

> kimny 決定 (Plan A): ミックス（Yuu の調整の忠実再現）は緊急措置として渡す＝OK。
> **マスタリングは Yuu の創作オーダー**なので我々が決め打ちしない（先に作った MEDIUM マスターは内部保留・送らない）。
> Yuu が自分でマスタリング（音圧/質感オーダー）を完遂できる「動くセッション」を用意し、Yuu 自身が仕上げる。

---

## 結論（feasibility）

**「理想」= 実装可能。** Yuu は対話ミックスを一からやり直さず、`preview → final → 自分のマスタリング → DL` で自走できる。

根拠（コード trace 確定・read-only）:

| 懸念 | 実コードの挙動 | 出典 |
|---|---|---|
| Yuu の stem の GCS URL は失効済（>1日）。fresh preview が打てるか | `resolveTrackUrl()` は GCS 失効時に **`r2_url`（恒久 R2 コピー）へ自動フォールバック**。Yuu の 5 stem は r2_url 保持済 → fresh preview が通る | `lib/dial/resolve-track-url.ts:57-67` / `app/api/dial/preview/route.ts:69-72` |
| 同一 URL 衝突で stem が溶ける | Yuu の 5 stem は r2_url が distinct → 衝突ガード（409）に触れない | `preview/route.ts:86-93` |
| 2つ目の free15 枠は lifetime-1 index で弾かれる | 付与セッションを **`is_free_campaign=false`** にすれば部分 unique index（`WHERE is_free_campaign=true`）の対象外。free15 cap も消費しない | `db/schema/dial.ts:124-126` |
| Yuu の EQ/comp（Layer B）を対話やり直しなしで反映 | `/final` は **DB から `getLatestParameterChanges`** で最新 assistant params を読んで適用。Yuu の params message を新セッションへコピーすれば final が自動適用 | `app/api/dial/final/route.ts:55-67` |
| 開いた瞬間 upload 画面に戻されないか | **mix step に着地（確認済）**: tracks 既存＋takes 空 → dialogue は右に Hoo chat パネル + 左に「Generate a preview to hear your mix」placeholder。`uploadSection` は `canEditTracks`(paymentStatus='paid'…)で出るが**追加アップロード用＝非ブロッキング**（status で upload 画面に強制分岐しない） | `page.tsx:1818-1819`(placeholder) / `:1188`(canEditTracks) / `:1888`(uploadSection 併置) |
| pre-load した Layer B message が UI を壊さないか | **壊さない（確認済）**: chat 履歴 render は `{msg.content}` のみ出力＝`action`/`parameterChanges` を unsafe 参照しない → 注入 message は**plain bubble で描画・crash path なし**。かつ `messages[0]`(最新)として `latestParamChanges` を駆動 → `/final` が自動適用 | `page.tsx:1577`(content-only render) / `:250`(messages[0]→latestParamChanges) |

**pre-mint しない**: preview は R2 キャッシュされず GCS が 1-2日で失効するため、事前生成した preview は Yuu が開く頃には死ぬ。**Yuu が開いて fresh preview を打つ**設計が正しい（無料・~1分）。

---

## 付与方式

**`is_free_campaign=false` / `payment_status='paid'` の goodwill 有償相当セッション**を Yuu の Clerk user_id に発行し、
Yuu の 5 dial_tracks（Layer A: presence/pan/reverb + r2_url）＋最新 params message（Layer B: EQ/comp/gain）を既存セッション fd7ef7a2 からコピーする。

| 項目 | 値 | 理由 |
|---|---|---|
| `is_free_campaign` | `false` | lifetime-1 index 回避 + free15 cap 非消費 |
| `payment_status` | `'paid'` | Stripe バイパス（goodwill） |
| `mode` / `mastering_mode` | `'dialogue'` / `'omakase'` | Yuu の owed = 対話ミックス＋マスタリング |
| `base_cycle_limit` | `3` | final の有界化（free15 と同経済）。preview 反復は無料 |
| `additional_cycle_limit` | `0` | retake 課金導線を出さない |
| `status` | `'uploading'`（default） | ②c で「開いて mix UI に着地」を確認（必要なら post-upload state へ調整） |

> 補足: `is_free_campaign=false` の paid セッションは `returnStems=true`（`final/route.ts:167`）= Yuu に stem も渡る（より手厚い）。コストはプールから数百cr（goodwill・許容）。

---

## ★枠付与SQL（実行 = kimny / 本番 write gate）

### STEP 0 — read-only 事前確認（kimny 実行）

```sql
-- Yuu の元セッション・Clerk user_id・5 stem の r2_url 充足を確認。
SELECT s.id, s.user_id, s.musical_style, s.is_free_campaign, s.payment_status,
       count(t.id) AS tracks,
       count(t.r2_url) AS tracks_with_r2   -- 期待: tracks == tracks_with_r2 (= 5)
FROM dial_sessions s
LEFT JOIN dial_tracks t ON t.session_id = s.id
WHERE s.id = 'fd7ef7a2-c227-40c2-8aeb-28c45a570fbc'
GROUP BY s.id;

-- 既に goodwill セッションを作っていないか（二重付与防止）。期待: 0 行。
SELECT id, created_at, payment_status, base_cycle_limit
FROM dial_sessions
WHERE user_id = (SELECT user_id FROM dial_sessions WHERE id='fd7ef7a2-c227-40c2-8aeb-28c45a570fbc')
  AND is_free_campaign = false
  AND title = '(goodwill) Yuu owed mastering';
```

- `tracks == tracks_with_r2 == 5` でないと fresh preview が通らない → STOP・mued課へ。
- 二重付与クエリが 1 行以上 → 既存セッションを使う（新規発行しない）。

### STEP 1 — 付与（kimny 実行・1 文 transaction）

Yuu の Clerk ID・track 内容・params message を**すべて既存セッションから SELECT でコピー**（ハードコードなし）。

```sql
WITH new_session AS (
  INSERT INTO dial_sessions (
    user_id, mode, mastering_mode, status, musical_style, title,
    payment_status, base_cycle_limit, additional_cycle_limit, is_free_campaign
  )
  SELECT
    s.user_id, 'dialogue', 'omakase', 'uploading', s.musical_style,
    '(goodwill) Yuu owed mastering',
    'paid', 3, 0, false
  FROM dial_sessions s
  WHERE s.id = 'fd7ef7a2-c227-40c2-8aeb-28c45a570fbc'
  RETURNING id, user_id
),
copy_tracks AS (
  INSERT INTO dial_tracks (
    session_id, original_filename, roex_upload_url, r2_url,
    instrument_group, presence_setting, pan_preference, reverb_preference
  )
  SELECT ns.id, t.original_filename, t.roex_upload_url, t.r2_url,
         t.instrument_group, t.presence_setting, t.pan_preference, t.reverb_preference
  FROM dial_tracks t CROSS JOIN new_session ns
  WHERE t.session_id = 'fd7ef7a2-c227-40c2-8aeb-28c45a570fbc'
  RETURNING 1
),
-- Layer B（任意・「理想」のため推奨）: Yuu の最新 params message を 1 件コピー。
-- → 開いて final を押すだけで彼の EQ/comp が自動適用（対話やり直し不要）。
-- 省くと「次善」: Yuu が EQ/comp を 1-2 ターンだけ再依頼する形（再 upload は不要）。
copy_params AS (
  INSERT INTO dial_messages (session_id, role, content, parameter_changes)
  SELECT ns.id, 'assistant',
         '（前回セッションの調整を引き継ぎました。「ファイナルミックス」を押すとこの設定で仕上がります。）',
         m.parameter_changes
  FROM new_session ns
  CROSS JOIN LATERAL (
    SELECT parameter_changes
    FROM dial_messages
    WHERE session_id = 'fd7ef7a2-c227-40c2-8aeb-28c45a570fbc'
      AND role = 'assistant' AND parameter_changes IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) m
  RETURNING 1
)
SELECT ns.id AS new_session_id, ns.user_id,
       (SELECT count(*) FROM copy_tracks) AS tracks_copied,   -- 期待: 5
       (SELECT count(*) FROM copy_params) AS params_copied    -- 期待: 1
FROM new_session ns;
```

> **guest_token は生成しない（NULL のまま）。** Yuu は**サインイン状態**でアクセスし、ownership は `session.user_id === auth.userId` で成立（`lib/middleware/dial-ownership.ts:41-42`・signed-in は guest_token を参照しない）。
> → credential を**そもそも作らない**ので doc/git/memory に token が残る余地がない（kimny 運用要件を source で満たす）。

**返ってきた `new_session_id` のみ mued課へ流通。** read-only で `dial_tracks` 5件 / params 1件 / payment_status='paid' を verify する（下記 STEP1-verify）。

### STEP1-verify — 付与後の read-only 確認（new_session_id を埋めて kimny or mued 実行）

```sql
SELECT s.id, s.user_id, s.payment_status, s.is_free_campaign,
       s.mode, s.mastering_mode, s.base_cycle_limit, s.additional_cycle_limit,
       (SELECT count(*) FROM dial_tracks  t WHERE t.session_id = s.id) AS tracks,   -- 期待: 5
       (SELECT count(*) FROM dial_tracks  t WHERE t.session_id = s.id AND t.r2_url IS NOT NULL) AS tracks_with_r2,  -- 期待: 5
       (SELECT count(*) FROM dial_messages m WHERE m.session_id = s.id AND m.parameter_changes IS NOT NULL) AS params_msgs  -- 期待: 1
FROM dial_sessions s
WHERE s.id = '<NEW_SESSION_ID>';
-- 期待: payment_status='paid' / is_free_campaign=false / mode='dialogue' / mastering_mode='omakase'
--       base_cycle_limit=3 / additional_cycle_limit=0 / tracks=5 / tracks_with_r2=5 / params_msgs=1
```

### STEP1-cleanup — 重複セッション削除（✅ 完了 2026-06-14）

> **結果（conductor post-check 確認）**: e067fcf6 = 0行（削除済・token 廃棄）/ e3688b24 = 残存・title 正・無傷 / fd7ef7a2 = 無傷。A verify 全項目グリーン。token 値は非流通。
>
> 経緯: STEP1 を旧版（guest_token 生成あり）と更新版（guest_token なし）の**両方流したため goodwill セッションが2つ**生成された。
> - `e067fcf6-fdf7-4e6f-b79f-0e19c77d6cf0` = 旧版（guest_token=credential あり）→ **削除**（重複解消＋token 廃棄）
> - `e3688b24-6645-4f8a-822c-7818237c30f1` = 更新版（guest_token なし・クリーン）→ **採用**（Yuu リンクはこちら）
>
> 実行順 **A（採用 verify）→ B（削除 pre-check, has_token 目視）→ C（削除）**。A 緑 ＋ B で `e067fcf6.has_token=true` 確認時のみ C。
> C は children-first（fx_sheets→tasks→messages/tracks/purchases/trial_events→session）で cascade 有無に非依存・**e067fcf6 単一スコープ**・transaction 内 post-check で `e3688b24`/`fd7ef7a2` 無傷を確認してから COMMIT。SQL 全文は本セッションの conductor 連絡（2026-06-14）に記載。`fd7ef7a2`（原本）と `e3688b24`（採用）は**絶対に触らない**。

### STEP 2 — Yuu への案内リンク

```
https://dial.mued.jp/dial/session/e3688b24-6645-4f8a-822c-7818237c30f1   ← 採用セッション（A verify 緑 ＋ C 削除完了後に確定）
```

- Yuu は**サインイン状態**で開く（ownership = user_id 一致）。admin 作成セッションは `/dial` 一覧に自動表示されない場合があるため**直リンク必須**（過去教訓: admin session は /dial 非表示・claim ボタン already_granted）。
- **dialogue mode は chat 駆動**（bare ボタンでなく Hoo との会話 + ParamChangeCard ボタンで render を起動）。Yuu の操作:
  1. 開く → 右の **Hoo chat** で「ミックスして / プレビュー作って」 → fresh preview（無料・~1分・r2_url で通る）
  2. Hoo に「ファイナル作って」 → final（pre-load した彼の EQ/comp が `messages[0]` 経由で**自動適用** = 彼の意図ミックス。再指定不要）
  3. Hoo に「マスタリングして（音圧/配信先オーダー）」 → ★**Yuu が音圧オーダーを出す**（配信先 selector で LUFS gap 表示）
  4. **DL**
- Layer B を pre-load しているので、Yuu は EQ/comp を**一から喋り直す必要がない**（対話やり直し回避）。追加で詰めたい時だけ Hoo に頼めば `messages[0]` が更新され反映される。

---

## ②c 実ブラウザ E2E（final→mastering→DL の経路検証 / free15 公開前 smoke 兼）

**可否: 可能。** ただし **Yuu の goodwill セッションでは行わない**（それは Yuu 自身がやる工程＝「自走能力の回復」。我々が代行すると Plan A の意味が消える）。

- **対象 = 別の operator/test free15 セッション**（runbook M3 の制御 prod soft-launch）。Yuu が辿る `final→mastering→DL` の**同一コードパス**を検証でき、Yuu のセッションは無傷に保てる。
- **必要条件**: kimny の test Clerk ログイン（auth=escalation）＋ Chrome 拡張ロック（conductor 調整・先着制）。RoEx は現在健全。
- **driver**: claude-in-chrome。wall-clock ~30-60分（RoEx 描画律速）。
- **②c で残す唯一の実機確認**: 着地点（mix step）と注入 message の描画（plain bubble）は**コード read で確定済**（上表）。E2E で見るのは **dialogue chat の正確な click-path**（Hoo に頼んで preview→final→master が ParamChangeCard ボタン経由で順に走るか・pre-load 済 Layer B が final で実音反映されるか）。万一 click-path に詰まりがあれば「次善」（tracks のみ Layer A コピー＋Yuu が EQ/comp を 1-2 ターン再依頼）へフォールバック。

---

## 未決（kimny 判断）

1. Layer B（params message）を pre-load するか（理想）／Yuu に再依頼させるか（次善）。**推奨=理想**（pre-load）。
2. STEP 1 SQL の本番実行タイミング。
3. ②c E2E の実施可否（test ログイン＋Chrome ロック手配）。
