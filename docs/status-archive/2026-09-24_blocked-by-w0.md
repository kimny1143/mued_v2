# blocked_by (W0) の全文（2026-09-24 に status.md から退避・cap のため。短縮版は status.md に残る）

★★**(W0) 決済を開ける前に「配布 URL が 200 を返すこと」を1度 測る（★落とせない前提）**: ★**merge では不十分 ——★deploy が着いて初めて URL が生きる**（deploy 未着で開けると、メール件名が「download and license key」と約束して本文の URL が 404）。★**母集団は `lib/*/config.ts` の `*_DOWNLOAD_URL` から実時解決する（★値を焼かない）**。★検査＝canonical 4＋alias 1＋陰性control・status だけでなく先頭 byte（`xar!`）と size も見る・★母集団 4 本 未満は rc 3。★9/16 実測 5/5 OK。★詳細＝(1c)。★**同じ引き金で特商法の動作環境（macOS 11.0 / VST3・AU・AAX）も再測する**（★installer の実測値ゆえ差し替えで黙って古くなる）。
