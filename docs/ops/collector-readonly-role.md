# Plugin funnel collector — read-only DB role (kimny gate)

`plugin-funnel-collector` workflow を無人で毎日走らせる前に、collector が使う DB 資格情報を
**read-only** に切り替える手順。**ロール作成 = 本番 DB 設定 = kimny 専管ゲート**なので、
mued は手順を用意するだけで実行しない。

## なぜ

collector が DB に対してすることは **`SELECT` 3本のみ**で、参照テーブルは **`plugin_entitlements`
1つだけ**（`scripts/aggregate-plugin-funnel-daily.ts`・`INSERT`/`UPDATE`/`DELETE` は 0 件）。
判断軸は権限論でなく **blast radius** — 無人ジョブは壊れ方を人が見ないので、**そもそも壊せない状態**
にしておくのが安い。GitHub Actions secret が万一漏れても、read-only なら書き込みが原理的に不可能。

## 対象 DB（実測・secret は含まない）

- host: `ep-billowing-lab-ae2zhxow-pooler.c-2.us-east-2.aws.neon.tech`（**pooled endpoint**）
- dbname: `neondb`
- ＝ **prod**（[[reference-dial-prod-db-direct-query]] と同じ instance）

## 手順（kimny・Neon SQL Editor を prod branch で）

### 1. read-only ロールを作る

```sql
-- パスワードは強いものを生成して控える（この値が新 secret の一部になる）
CREATE ROLE funnel_collector_ro WITH LOGIN PASSWORD 'GENERATE_A_STRONG_PASSWORD_HERE';

GRANT CONNECT ON DATABASE neondb          TO funnel_collector_ro;
GRANT USAGE   ON SCHEMA   public          TO funnel_collector_ro;
-- ★ collector が読む唯一のテーブルだけ。strict least privilege。
GRANT SELECT  ON public.plugin_entitlements TO funnel_collector_ro;
```

### 2. 「読めるが書けない」を実際に確認する（RED を見る）

```sql
SET ROLE funnel_collector_ro;
SELECT count(*) FROM public.plugin_entitlements;               -- ✅ 成功するはず
INSERT INTO public.plugin_entitlements DEFAULT VALUES;          -- ❌ ERROR: permission denied を期待
UPDATE public.plugin_entitlements SET plugin_key = plugin_key;  -- ❌ ERROR: permission denied を期待
RESET ROLE;
```

★**INSERT/UPDATE が `permission denied` で落ちることを目で確認してから**次へ進む。落ちなければ
GRANT が広すぎる（read-only になっていない）。

### 3. 接続文字列を作り、新しい secret 名で登録する

**既存の `DATABASE_URL` は触らない**（アプリ本体が使っているので）。新しい secret 名で登録する:

```
# secret 名: DATABASE_URL_READONLY
postgresql://funnel_collector_ro:<手順1で控えたパスワード>@ep-billowing-lab-ae2zhxow-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
```

- host は既存 `DATABASE_URL` と同じ **pooled endpoint** を使う
- GitHub → Settings → Secrets and variables → Actions → New repository secret
- ★**`printf 'value' | gh secret set ...` を使う**（`echo` は末尾改行が混入する — CLAUDE.md の既知事故）

## mued 側（gate 解消後・別 PR）

- `.github/workflows/plugin-funnel-collector.yml` の collector step の env を
  `DATABASE_URL: ${{ secrets.DATABASE_URL }}` → `${{ secrets.DATABASE_URL_READONLY }}` に差し替える
- 同 PR で `schedule` を有効化（insight 合意: LAST_PUBLISH 5フィールド凍結・stale 36h・Stage B 11:30・依存順序）
- ★**collector が将来 `plugin_entitlements` 以外のテーブルを読むようになったら、その都度 手順1 に
  `GRANT SELECT ON <table>` を足す必要がある**（strict least privilege の代償）。collector の SQL は
  1ファイルに集約されているので読むテーブルは grep で列挙できる。schedule 有効化 PR に「テーブルを
  増やす時は role の GRANT も更新」を明記する

## 代替案（kimny が re-GRANT の手間を嫌う場合）

schema 全体を read-only にする案もある（`GRANT SELECT ON ALL TABLES IN SCHEMA public` +
`ALTER DEFAULT PRIVILEGES ... GRANT SELECT`）。**書き込みは依然できない**ので blast radius の
主目的は満たすが、**prod DB には決済・認証データもある**ため、secret 漏洩時の read 露出が
`plugin_entitlements` 1テーブルから DB 全体に広がる。**mued 推奨は strict（テーブル単位）**。
どちらを採るかは kimny 判断。

## (b) 現状維持を選ぶ場合

「collector は read-only なので実害はない」と判断して `DATABASE_URL` 据え置きでもよい。
その場合は**「read-only ゆえ据え置きと判断した」を記録に残す**こと（後で「なぜ書ける資格情報で
cron を回しているのか」を見た人に判断の記録がある状態にする）。**(b) でも schedule 有効化は進められる。**
