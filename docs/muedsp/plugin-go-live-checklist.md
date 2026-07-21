# プラグイン go-live チェックリスト

MUEDsp のプラグイン（MUEDsat / MUEDlim / 今後のモジュール）を **live にする / 新しい .pkg を出す** ときに走らせる。所要 5 分。

> **なぜ必要か**: 2026-07 の 1 週間で dead-link が 3 件 prod に出た（#712 welcome-email CTA・#716 manifest url・#717 の取りこぼし＝特商法ページが 4 ページから 404）。いずれも**型もビルドも CI も通っていた**。URL の *形* を assert しても *解決するか* は分からないので、prod に対して測る。

---

## 1. registry と実体を揃える

`lib/plugins/registry.ts` の `PLUGIN_DIST` が単一の正本。**version と downloadUrl は同じ PR で動かす**（片方だけ更新すると、ポータル表示・`/plugins/versions.json` の `latest`・実 .pkg がズレる）。

- [ ] `lib/{plugin}/config.ts` の `VERSION` を新ビルドに合わせた
- [ ] `DOWNLOAD_URL` を新 .pkg に差し替えた（sha を PR 本文に記載）
- [ ] go-live なら `LIVE = true`（ソース定数。env ではないのでデプロイ必須＝実体とズレない）

## 2. ★リンクが解決することを prod で測る

```bash
./scripts/prod-link-sweep.sh              # rendered 軸: 実 render の href を全件解決
./scripts/prod-link-sweep.sh --sitemap-only   # discovery 軸: sitemap の entry を全件解決
```

- [ ] **dead 0** で PASS（404 が 1 件でも exit 1）
- [ ] **locale-loss WARN 0**（bare path が redirect 経由でしか 200 にならない状態。status code だけ見ると "200 OK" に見えて隠れる）

**2 軸は互いを保証しない**。`/tokushoho` は sitemap 上は健全なまま、全ページ内リンクから 404 だった。両方走らせる。

## 3. プラグイン固有の 3 点

- [ ] **`/en/{key}` が 200**（例 `curl -sI https://mued.jp/en/muedsat`）
      `/plugins/versions.json` の `url` は `` `${BASE}/en/${key}` `` ＝ **key == route slug 前提**。将来 key と page slug が乖離すると banner リンクが静かに 404 になる。
- [ ] **`/plugins/versions.json`** に当該 plugin が出ていて `latest` が plain semver（`-alpha` が落ちている）・`url` が上で 200 を確認した URL・**`downloadUrl` が出ていない**（email gate 保全）
- [ ] **welcome email の CTA path** を実際に curl（非 locale path は `next.config.ts` の redirects に無いと 404。配信済みメールは直せない）

---

## 落とし穴

- **非 locale path は redirect が無いと 404**。pages は `app/[locale]/` にしか無い。新しい非 locale entry path を足すなら `next.config.ts` の redirects も同時に。
- **redirect を足しても内部リンクの正解にはならない**。redirect は bookmark・既送信メール・外部引用のための安全網。**ページ内リンクは `` href={`/${locale}/…`} `` にする**（locale 落ちは redirect では直らない）。
- **`/api/` を sweep しない**。`GET /api/plugins/unsubscribe` は実際に配信解除する。副作用のある GET を足したら `prod-link-sweep.sh` の `SKIP_RE` に追加する。
- **ローカル `next start` での検証はポート占有を疑う**。起動ログの成否を確認してから curl する（`curl が 200` ≠ `自分のビルドが応答した`）。

## 関連

- `scripts/prod-link-sweep.sh`（product課 作・本リポに vendored）
- `tests/unit/legal-pages-locale-links.test.ts` — bare `<Link href="/…">` の source-text ガード
- `tests/unit/plugin-versions-manifest.test.ts` — registry → manifest マッピング
