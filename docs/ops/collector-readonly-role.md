# Plugin funnel collector — read-only DB role

`plugin-funnel-collector` workflow を無人で毎日走らせるために、collector が使う DB 資格情報を
**read-only** に切り替える手順。

**kimny 判断（2026-07-25）= 「集計ジョブは読み取り専用にして」→ strict least privilege（テーブル単位）。**

---

## ★ なぜ人手が要るのか（この1行が無いと、次の人が疑わずに人手を継承する）

**人手が要るのは「本番 DB に対して初めてロールを作る」1点だけ**であって、
**SQL の組み立て・接続文字列の生成・secret の登録は人手ではない**。

| 作業 | 誰が | なぜ |
|---|---|---|
| ロール作成 SQL の実行 | **kimny** | 本番 DB への write。**不可逆で、資格情報を発行する** |
| 権限の検証 | **kimny**（同じ画面で続けて1回） | 上と同じセッションで完結するため |
| **接続文字列の組み立て** | ★**org 側（自動）** | 文字列編集を人にさせない |
| **GitHub secret の登録** | ★**org 側（自動）** | `gh` の `repo` scope で実行可能 |
| workflow の env 差し替え / schedule 有効化 | org 側（PR） | 通常のコード変更 |

> ★**2026-07-25 の失敗**: 初版のこの文書は上記を**全部 kimny の手作業**として書いた。
> その結果 kimny は `SET ROLE` の permission error で **30分以上**詰まり、そのうえ
> **接続文字列の手編集**まで求められた。`.claude/rules/dispatch-protocol.md` の
> 「**peer 1次提示の手動 path をそのまま kimny に提示しない / kimny 工数発生 path を
> default 化しない**」に反していた。**「本番 write は kimny 専管」は「kimny が SQL を
> 組み立てる」という意味ではない。組み立ては org 側、実行の1回だけが kimny。**

---

## Step 1 — ロールを作る（kimny・Neon SQL Editor・prod branch）

`<STRONG_PASSWORD>` を強いパスワードに置き換えて実行し、**その値を控える**（Step 3 で1回だけ使う）。

```sql
CREATE ROLE funnel_collector_ro WITH LOGIN PASSWORD '<STRONG_PASSWORD>';

GRANT CONNECT ON DATABASE neondb            TO funnel_collector_ro;
GRANT USAGE   ON SCHEMA   public            TO funnel_collector_ro;
GRANT SELECT  ON public.plugin_entitlements TO funnel_collector_ro;
```

---

## Step 2 — 権限が実際に絞られたことを確認する（kimny・同じ画面で続けて）

```sql
SELECT
  has_table_privilege('funnel_collector_ro','public.plugin_entitlements','SELECT') AS can_read,
  has_table_privilege('funnel_collector_ro','public.plugin_entitlements','UPDATE') AS can_write,
  has_table_privilege('funnel_collector_ro','public.dial_purchases','SELECT')      AS can_read_purchases;
```

**合格 = `t / f / f`**（読める / 書けない / 決済テーブルは読めない）。

- `can_write` が `t` → GRANT が広すぎる。`REVOKE ALL ON public.plugin_entitlements FROM funnel_collector_ro;` から Step 1 をやり直す
- `can_read_purchases` が `t` → 決済データが読める。**先へ進まない**（同上）

> ★**`SET ROLE` を使う検証は捨てた。** 初版は `BEGIN; SET LOCAL ROLE …; ROLLBACK;` で
> 実際にクエリを撃たせていたが、**Neon の SQL Editor では `permission denied to set role` になり、
> `GRANT <role> TO current_user` を打っても解消しない**（kimny 実測・2回）。
> `has_table_privilege()` は**トランザクションも ROLLBACK も要らず**、
> **PUBLIC 経由の暗黙権限や継承も含めて**判定するので、射程はむしろ広い。
> ＝ **復帰手順を書き足すより、動く方法に替えるのが正しかった。**

---

## Step 3 — 接続文字列を組み立てて secret に登録する（★org 側・1コマンド）

★**kimny は Step 1 のパスワードを打つだけ。文字列編集も画面遷移も無い。**
（`read -s` なので画面にも履歴にも平文は残らない。）

```bash
read -s -p "Step1のパスワード: " P && echo && \
gh secret set DATABASE_URL_READONLY --repo kimny1143/mued_v2 \
  --body "postgresql://funnel_collector_ro:${P}@ep-billowing-lab-ae2zhxow-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

- **既存の `DATABASE_URL` は触らない**（アプリ本体が使っている）
- host は既存 `DATABASE_URL` と同じ **pooled endpoint**（`-pooler`）
- `printf`/`--body` を使う（★`echo` は末尾改行が混入する — CLAUDE.md の既知事故）

---

## Step 4 — workflow を切り替える（org 側・PR）

1. `.github/workflows/plugin-funnel-collector.yml` の collector step:
   `DATABASE_URL: ${{ secrets.DATABASE_URL }}` → `${{ secrets.DATABASE_URL_READONLY }}`
2. 同 PR で `on.schedule`（`- cron: '30 1 * * *'` = 10:30 JST）のコメントアウトを解除
   - insight 合意: `LAST_PUBLISH.json` 5フィールド凍結 / stale 36h / Stage B は 11:30 JST /
     **依存順序 = Stage A の scheduled run 成功実績 → Stage B 再有効化**
   - ★**cron gotcha**: `grep -rn "github.event.schedule" .github/workflows/` で**全列挙してから**変更する
     （残置すると条件 false で job が silent skip — CLAUDE.md 既知事故・threads-api #140）
3. ★**end-to-end 確認**: merge 後に **`workflow_dispatch` を `publish: false` で1回**。
   「新資格情報で認証できる / SELECT 3本が通る / publish はしない」が一度に分かる。
   **ロールを作った、ではなく実際に動くことで閉じる。**
4. schedule 有効化 PR を出す時と、**初回 scheduled run 成功時**に insight へ一報（約束済）

---

## 将来これを触る人へ

★**collector が `plugin_entitlements` 以外のテーブルを読むようになったら、その都度
`GRANT SELECT ON <table> TO funnel_collector_ro;` を足す**（strict least privilege の代償）。
足し忘れると collector は `permission denied` で落ちるが、**無人ジョブなので、落ちたことは
`data/plugin-funnel-reports` の `LAST_PUBLISH.json` が更新されないことで気づく**
（insight Stage B の stale 36h 検知）。読むテーブルは
`grep -n "FROM " scripts/aggregate-plugin-funnel-daily.ts` で列挙できる
（2026-07-25 時点は 3本とも `plugin_entitlements` 単一・JOIN 無し）。

★**次に同種の作業が出たら、手順書を書く前に「自動化できないか」を先に問う。**
このマシンには `neonctl` が実在し（`~/.nvm/.../bin/neonctl`）、`gh` は `repo` scope を持つ。
＝ **今回 kimny の手番だと思っていたものの大半は、最初から自動化できた。**
