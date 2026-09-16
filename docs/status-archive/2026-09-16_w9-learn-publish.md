# status.md blocked_by (W9) 退避 — /learn 公開の検収記録

> `blocked_by` が注入 cap（6,000 B）に達したため退避した。
> ★当課の手番は終了しており、★live な情報は「戻し方」だけなので status.md 側にそれを残した。
> 退避元: `status.md` `blocked_by` / 退避日: 2026-09-16

---

★★**(W9) /learn は公開済・★当課の手番終了**（deploy `dpl_5G2SkrN9bG4UnRXmUv8q9ujTPJdv`・検収 PASS＝6 URL とも 200 かつ `index, follow`／sitemap 6件／control 2:0／40秒 空けて 2回）。★★**戻し方＝env `LEARN_LIVE` を false か削除 → ★再 deploy**（★code 変更が無いので revert commit は存在しない）。★**env 投入だけでは変わらない**ことも実証済（投入直後は 6/6 noindex・#1036 の deploy で反転）。★検収は script 化済（rc 0/1/3・部分反映は「公開とも非公開とも報告しない」）。 
