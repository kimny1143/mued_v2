# Plugin funnel collector — read-only DB role（kimny 実行手順）

`plugin-funnel-collector` workflow を無人で毎日走らせる前に、collector が使う DB 資格情報を
**read-only** に切り替える。

**kimny 判断（2026-07-25）= 「集計ジョブは読み取り専用にして」→ strict least privilege（テーブル単位）を採択。**
以前あった「(b) 現状維持」「schema 全体 read-only にする代替案」は**判断済みなので削除**した。
下の手順は**上から順に貼って実行するだけ**で、途中に判断の分岐はない。

**本番 DB write = kimny 専管ゲート**。mued は手順を用意するだけで実行しない。

---

## なぜ（1段落）

collector が DB にすることは **`SELECT` 3本のみ**、参照テーブルは **`plugin_entitlements` 1つだけ**
（`scripts/aggregate-plugin-funnel-daily.ts:199,216,231` — 3本とも単一テーブルで JOIN 無し・
`INSERT`/`UPDATE`/`DELETE` は 0 件。**2026-07-25 に再確認済**）。判断軸は権限論でなく **blast radius** —
無人ジョブは壊れ方を人が見ないので、**そもそも壊せない状態**にしておくのが安い。GitHub Actions secret が
万一漏れても、read-only なら書き込みが原理的に不可能で、読める範囲も 1 テーブルに閉じる。

---

## Step 1 — ロールを作って権限を与える

Neon Console → 対象 **prod** branch → **SQL Editor** で実行。

> `<STRONG_PASSWORD>` を強いパスワードに置き換えてから実行し、**その値を控える**（Step 3 で使う）。
> Neon は SQL で作ったロールのパスワードを後から表示できないので、ここで控え損ねたら
> `ALTER ROLE funnel_collector_ro WITH PASSWORD '...';` で付け直す。

```sql
CREATE ROLE funnel_collector_ro WITH LOGIN PASSWORD '<STRONG_PASSWORD>';

GRANT CONNECT ON DATABASE neondb            TO funnel_collector_ro;
GRANT USAGE   ON SCHEMA   public            TO funnel_collector_ro;
GRANT SELECT  ON public.plugin_entitlements TO funnel_collector_ro;
```

---

## Step 2 — 「絞られた」ことを一次データで確認する

★**ロールを作った、では閉じない。権限が実際に絞られたことを見る。**
3 ブロックを**別々に**実行し、**期待どおりの成否になること**を目で確認する。

**すべて `BEGIN … ROLLBACK` で囲ってあるので、この検証で本番データは変わらない**
（万一 GRANT が広すぎて書き込みが通ってしまっても、ROLLBACK で捨てられる）。

> ### 先に読む — 2つのつまずきポイント
>
> **① `SET LOCAL ROLE` 自体が落ちたら**
> `ERROR: permission denied to set role "funnel_collector_ro"` が出た場合、**これは権限が絞られすぎた
> のではなく検証手順側の問題**（`SET ROLE` は実行者がそのロールのメンバーであることを要求する。
> PostgreSQL のバージョンによっては作成者に自動付与されない）。**一度だけ**次を実行してから戻る:
> ```sql
> GRANT funnel_collector_ro TO current_user;
> ```
> ★**Step 1 をやり直す必要はない。**
>
> **② 「エラーが出た」では合格にしない**
> (b)(c) の合格条件は **`ERROR` が出ること**ではなく **`permission denied` が出ること**。
> 例えばテーブル名が変わっていると `relation "..." does not exist` が出るが、これも ERROR なので
> 「弾かれた＝合格」と読めてしまう。**実際には何も検証できていない**。
> ★**エラーメッセージの文言まで見る。**

### (a) 読めるべきものが読める → **成功するのが正解**

```sql
BEGIN;
SET LOCAL ROLE funnel_collector_ro;
SELECT count(*) FROM public.plugin_entitlements;
ROLLBACK;
```

### (b) 書き込みは弾かれる → **`ERROR: permission denied for table plugin_entitlements` が出るのが正解**

```sql
BEGIN;
SET LOCAL ROLE funnel_collector_ro;
UPDATE public.plugin_entitlements SET plugin_key = plugin_key WHERE false;
ROLLBACK;
```

### (c) 他のテーブルは読めない → **`ERROR: permission denied for table dial_purchases` が出るのが正解**

```sql
BEGIN;
SET LOCAL ROLE funnel_collector_ro;
SELECT count(*) FROM public.dial_purchases;
ROLLBACK;
```

| ブロック | 合格条件（**文言まで見る**） | これが違ったら |
|---|---|---|
| (a) | 件数が返る | `GRANT SELECT` が効いていない → Step 1 を見直す |
| (b) | **`permission denied for table plugin_entitlements`** | **GRANT が広すぎる**。`REVOKE ALL ON public.plugin_entitlements FROM funnel_collector_ro;` から Step 1 をやり直す |
| (c) | **`permission denied for table dial_purchases`** | 決済データが読める状態。**先へ進まない**（同上の REVOKE → Step 1） |

★**`permission denied` 以外のエラーは合格ではない。** 特に `relation "..." does not exist` は
**テーブル名が変わっただけ**で、権限については何も確認できていない。その場合は
`\dt public.*` 等で実在するテーブル名を確認し、(c) の対象を**現存する機微テーブル**に差し替えて測り直す。
（2026-07-25 時点で `dial_purchases` は実在 — `db/schema/dial.ts:270`・migration `0008_lucky_korvac.sql`。）

★(c) が効くことが strict least privilege の実効確認。prod には決済・認証データもあるので、
**「書けない」だけでなく「余計なものを読めない」まで見て初めて閉じる**。
（過去に `GRANT ... TO PUBLIC` が打たれていた場合の暗黙の読み取り権限も、ここで一緒に捕まる。）

---

## Step 3 — GitHub secret に登録する

**既存の `DATABASE_URL` は触らない**（アプリ本体が使っている）。**新しい名前**で追加する。

- secret 名: **`DATABASE_URL_READONLY`**
- 値: 既存 `DATABASE_URL` の**ホスト部分をそのまま流用**し、ユーザ名とパスワードだけ差し替える:

```
postgresql://funnel_collector_ro:<Step 1 で控えたパスワード>@<既存 DATABASE_URL と同じホスト>/neondb?sslmode=require
```

> ★ホストは**既存の `DATABASE_URL` からコピーする**こと（pooled endpoint `...-pooler...` を使う）。
> ここに手順書側の文字列を書き写すと、将来 endpoint が変わった時に古い値を貼ってしまう。

GitHub → Settings → Secrets and variables → Actions → New repository secret。
CLI なら ★**`printf 'value' | gh secret set DATABASE_URL_READONLY`**
（`echo` は末尾改行が混入する — CLAUDE.md の既知事故）。

**ここまでが kimny の手番。** 完了を mued に一言ください。

---

## Step 4 — mued 側（gate 解消後・別 PR）

1. `.github/workflows/plugin-funnel-collector.yml` の collector step:
   `DATABASE_URL: ${{ secrets.DATABASE_URL }}` → `${{ secrets.DATABASE_URL_READONLY }}`
2. 同 PR で `on.schedule`（`- cron: '30 1 * * *'` = 10:30 JST）のコメントアウトを解除
   - insight 合意: `LAST_PUBLISH.json` 5フィールド凍結 / stale 36h / Stage B は 11:30 JST /
     **依存順序 = Stage A の scheduled run 成功実績 → Stage B 再有効化**
   - ★**cron gotcha**: `github.event.schedule` を `if:` で文字列比較している箇所が増えていないか
     `grep -rn "github.event.schedule" .github/workflows/` で**全列挙してから**変更する
     （残置すると条件 false で job が silent skip する — CLAUDE.md 既知事故・threads-api #140）
3. ★**新資格情報の end-to-end 確認**: merge 後に **`workflow_dispatch` を `publish: false` で1回**回す。
   これで「**新しい資格情報で認証できる／3本の SELECT が通る／publish はしない**」が一度に確認できる。
   ここが通って初めて schedule に任せる。
4. schedule 有効化 PR を出す時と、**初回 scheduled run 成功時**に insight へ一報（約束済）

---

## 将来これを触る人へ

★**collector が `plugin_entitlements` 以外のテーブルを読むようになったら、その都度
`GRANT SELECT ON <table> TO funnel_collector_ro;` を足す必要がある**（strict least privilege の代償）。
足し忘れると collector が `permission denied` で落ちる — **無人ジョブなので、落ちたことは
`data/plugin-funnel-reports` の `LAST_PUBLISH.json` が更新されないことで気づく**（insight Stage B の
stale 36h 検知）。collector の SQL は 1 ファイルに集約されているので、読むテーブルは
`grep -n "FROM " scripts/aggregate-plugin-funnel-daily.ts` で列挙できる。
