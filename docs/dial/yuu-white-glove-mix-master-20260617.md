# Yuu 白手袋セッション付与 — 対話ミックス＋マスタリング (2026-06-17)

作成: 2026-06-17 / mued課 / 状態: **✅ 実行済（new_session_id `df55abae-34b0-4794-a3d5-05d84ad432a0`）。Preview 1-3 + Mix Check + Final Mix 正常完走・Yuu 症状 非再現（PR#477 効果確認）。**

> ## ⚠️ 訂正（実行後の学習・次回反映）— **白手袋は operator が session owner**
> 当初 SQL は `user_id` を Yuu からコピーした（「kimny が Yuu アカウントでサインイン操作」前提）。
> しかし **kimny は自分（admin）で操作する**ため、Yuu 所有 session は `Session not found`（ownership 不一致・admin view は read-only で chat/preview POST 不可）。
> kimny が `user_id` を自分の Clerk ID に変更して解決。
> **正しい設計: 「operator（kimny）が操作する白手袋」は `user_id = operator の Clerk ID` にし、完成 WAV を後で end user（Yuu）に渡す。** 下表/SQL の user_id は operator 前提で読むこと。

> conductor dispatch (2026-06-17): Yuu (`tanaka07yuu23@gmail.com`) が白手袋を承諾。**kimny が自分で操作する**。
> e3688b24 のトラック（Instrument 1 + Vocal 4）と調整（メインV前・コーラス控えめ）を引き継ぎ、
> 対話ミックス＋マスタリング、マスタリング指定＝「**落ち着いた自然な仕上げ**」、ミックス追加調整＝なし。

---

## 何を作るか（要約）

| 項目 | 値 | 理由 |
|---|---|---|
| 親セッション（コピー元） | `e3688b24-6645-4f8a-822c-7818237c30f1` | 6/14 goodwill keeper。5 track + Layer A/B 健全（DB 確認済 2026-06-17） |
| user_id | **operator（kimny）の Clerk ID** ← ⚠️訂正（上記参照。当初は Yuu をコピーし Session not found だった） | operator が自分で操作するため owner=operator。成果物を後で end user に渡す。guest_token 不要 |
| `mode` | `'dialogue'` | 対話ミックス |
| `mastering_mode` | `'omakase'` | マスタリングは LUFS ターゲット選択型（より決定的）。「落ち着いた自然な仕上げ」＝ **LOW / -14 LUFS** を選ぶ。Haiku の tool-fire 確率に依存しない（adversarial verify の指摘反映）。前回 runbook(e3688b24)とも一致。**※ 会話で詰めたいなら `'dialogue'` でも可** |
| `status` | `'uploading'`（default） | tracks 有 + tasks 空 → 開くと mix step に着地（runbook 確認済） |
| `payment_status` | `'paid'` | goodwill（Stripe バイパス） |
| `is_free_campaign` | `false` | lifetime-1 index 回避 + free15 cap 非消費 |
| `base_cycle_limit` | `3` | final の有界化。preview 反復は無料 |
| `additional_cycle_limit` / `additional_cycles_purchased` | `0` / `0` | retake 課金導線を出さない |
| `guest_token` | **NULL** | credential を作らない（kimny=サインイン操作） |
| tracks | 親の 5 track を SELECT コピー（Layer A: presence/pan/reverb + r2_url） | 「メインV前(LEAD)・コーラス控えめ(BACKGROUND)」は**この track 設定が正本**。main_vocal1/2=LEAD/HIGH、chorus1/2＝BACKGROUND/MEDIUM、instrument=BACKGROUND/LOW |
| Layer B 引き継ぎ message | 親の最新 assistant parameter_changes を 1 件コピー＋**プレビュー優先の案内文に差し替え** | /final が getLatestParameterChanges で自動適用。文面で「まずプレビューを作って」と誘導（早期 final 暴発を防ぐ） |

> **注**: 親 e3688b24 の Layer B（ad1f46f2 の parameter_changes）は presence/pan/reverb のみで、Layer A（track 設定）と同値。
> よって mix の意図は track コピー（Layer A）だけで完全に再現される。Layer B コピーは /final の自動適用用の belt-and-suspenders。

---

## STEP 0 — read-only 事前確認（kimny 実行）

```sql
-- (0a) 親セッションの整合（5 track 全てに r2_url があること）。期待: tracks = tracks_with_r2 = 5。
SELECT s.id, s.user_id, s.musical_style, s.mode, s.mastering_mode,
       s.is_free_campaign, s.payment_status,
       count(t.id) AS tracks,
       count(t.r2_url) AS tracks_with_r2
FROM dial_sessions s
LEFT JOIN dial_tracks t ON t.session_id = s.id
WHERE s.id = 'e3688b24-6645-4f8a-822c-7818237c30f1'
GROUP BY s.id;

-- (0b) 二重付与防止。期待: 0 行（この白手袋セッションをまだ作っていない）。
SELECT id, created_at, payment_status, mode, mastering_mode, base_cycle_limit
FROM dial_sessions
WHERE user_id = (SELECT user_id FROM dial_sessions WHERE id='e3688b24-6645-4f8a-822c-7818237c30f1')
  AND is_free_campaign = false
  AND title = '(white-glove) Yuu mix+master 2026-06-17';
```

- (0a) `tracks = tracks_with_r2 = 5` でなければ **STOP**・mued課へ。
- (0b) が 1 行以上なら**既に作成済み** → STEP 1 を流さず、その既存 id を使う。

---

## STEP 1 — 付与（kimny 実行・1 文 transaction）

トラック内容・Clerk ID・params は**すべて親から SELECT でコピー**（ハードコードなし）。

```sql
WITH new_session AS (
  INSERT INTO dial_sessions (
    user_id, mode, mastering_mode, status, musical_style, title,
    payment_status, base_cycle_limit, additional_cycle_limit, additional_cycles_purchased,
    is_free_campaign
  )
  SELECT
    s.user_id, 'dialogue', 'omakase', 'uploading', s.musical_style,
    '(white-glove) Yuu mix+master 2026-06-17',
    'paid', 3, 0, 0, false
  FROM dial_sessions s
  WHERE s.id = 'e3688b24-6645-4f8a-822c-7818237c30f1'
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
  WHERE t.session_id = 'e3688b24-6645-4f8a-822c-7818237c30f1'
  RETURNING 1
),
-- Layer B: 親の最新 assistant params を 1 件、プレビュー優先の案内文で引き継ぐ。
-- text は「まずプレビューを作って」へ誘導（早期 request_final 暴発防止 + マスタリング指定を明記）。
copy_params AS (
  INSERT INTO dial_messages (session_id, role, content, parameter_changes)
  SELECT ns.id, 'assistant',
         '（前回の調整を引き継いでいます: メインボーカルを前に・コーラスは控えめ。まず「プレビューを作って」と話しかけると、この設定でミックスのプレビューが生成されるよ。仕上がりイメージは「落ち着いた自然なマスタリング」。）',
         m.parameter_changes
  FROM new_session ns
  CROSS JOIN LATERAL (
    SELECT parameter_changes
    FROM dial_messages
    WHERE session_id = 'e3688b24-6645-4f8a-822c-7818237c30f1'
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

> **guest_token は生成しない（NULL のまま）。** kimny は Yuu アカウントのサインイン状態でアクセスし、ownership は `session.user_id = auth.userId` で成立。
> 返ってきた `new_session_id` のみ mued課へ流通。

---

## STEP 1-verify — 付与後の read-only 確認（new_session_id を埋めて実行）

```sql
SELECT s.id, s.user_id, s.payment_status, s.is_free_campaign,
       s.mode, s.mastering_mode, s.status, s.base_cycle_limit, s.additional_cycle_limit,
       s.guest_token IS NULL AS guest_token_null,
       (SELECT count(*) FROM dial_tracks  t WHERE t.session_id = s.id) AS tracks,            -- 期待: 5
       (SELECT count(*) FROM dial_tracks  t WHERE t.session_id = s.id AND t.r2_url IS NOT NULL) AS tracks_with_r2, -- 期待: 5
       (SELECT count(*) FROM dial_messages m WHERE m.session_id = s.id AND m.parameter_changes IS NOT NULL) AS params_msgs, -- 期待: 1
       (SELECT count(*) FROM dial_tasks   t WHERE t.session_id = s.id) AS tasks             -- 期待: 0
FROM dial_sessions s
WHERE s.id = '<NEW_SESSION_ID>';
-- 期待: payment_status=paid / is_free_campaign=false / mode=dialogue / mastering_mode=omakase
--       status=uploading / base_cycle_limit=3 / additional_cycle_limit=0 / guest_token_null=true
--       tracks=5 / tracks_with_r2=5 / params_msgs=1 / tasks=0
```

mued課が read-only で上記を verify してから kimny へ URL を返す。

---

## STEP 2 — kimny の操作リンク + 手順

```
https://dial.mued.jp/dial/session/<NEW_SESSION_ID>
```

- **直リンク必須**（admin/付与セッションは `/dial` 一覧に自動表示されないことがある）。
- **Yuu アカウントにサインインした状態で開く**（ownership=user_id 一致）。
- 対話操作（白手袋なので kimny が代行）:
  1. 右の Hoo chat で「**プレビューを作って**」 → fresh preview（無料・~1分・r2_url 経由で通る）→ サイドバーに MIXED take。
  2. 「いい感じ。**ファイナルミックスにして**」 → Final ボタンが出る → 押す → final_advanced（Layer A/B の意図ミックス）。
  3. Final 完了 → マスタリングフェーズへ。**配信先/ラウドネスは LOW / -14 LUFS（落ち着いた自然）**を選んでマスタリング生成 → 完了。
  4. **DL**（WAV）→ Yuu にフォローメール（`/dial/session/<id>` 直リンク同梱推奨）。

> **マスタリング目標**: 「落ち着いた自然な仕上げ」＝ **LOW / 約 -14 LUFS（ダイナミクス重視・Spotify/Apple ノーマライズ基準）**。
> omakase マスタリングなので LOW ターゲットを選ぶだけで決定的に仕上がる（Haiku tool-fire 非依存）。

---

## 注意 / 既知の前提

- **本番 write は kimny 専管**（conductor 2026-06-17 確定）。SQL 実行は kimny、verify は mued課（read-only）。
- 親 `e3688b24` / `fd7ef7a2` は**絶対に触らない**（STEP 1 は read-only コピーのみ）。
- 本セッションは**新規 clean session** なので、Yuu の e3688b24 を詰まらせた「Hoo が "プレビュー作成済み" と誤認」バグ（履歴汚染）は**発生しない**（履歴が空のため）。
  そのバグ自体の恒久修正は別 PR（`fix/dial-hoo-preview-state-reconcile`・Tier 3・kimny merge 待ち）で対応。
- 消費 ≈ 数百cr（goodwill・プールから・許容）。`is_free_campaign=false` の paid なので final で `returnStems=true`（stem も渡せる）。
