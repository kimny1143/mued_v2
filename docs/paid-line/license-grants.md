# 期限つきのライセンス（テスター向け）

kimny 2026-10-13（MUED の窓）: 「テスター向けに期限つきの MUEDvox の鍵を出す道を作って良い」。

## 何か

MUEDvox の期限つきの鍵を、admin の画面から 1 本ずつ出す道。販売ではない。

- 出す所: `https://mued.jp/dashboard/admin/license-grants`（kimny がサインインしている時だけ開く。他の人は 404）。
- 入れる物: 相手のメールアドレス・期間（日、または確かめ用に分）・理由。
- 受け取り方: 鍵はメールで送らない。相手がそのメールアドレスで mued.jp にサインインすると、ポータル（`/dashboard/plugins`）に「テスト用ライセンス」の行が出る。行には Mac と Windows の download・鍵の file（`MUEDvox.license.key`）・Copy・期限の日時（UTC）が在る。
- アカウントが無い人にも先に出せる。行は「サインインした人の確認済みのメールアドレス」で引く（購入者と同じ境界）。
- 延長: 同じアドレスにもう 1 本出す（新しい鍵）。ポータルでは期限の遅い方が上に出る。相手は新しい鍵の file を入れ直す。
- 取り消しは出来ない。鍵は offline の署名で、期限で切れるだけ。∴ 期間は必須で、最長 90 日。
- 期限を守らせるのは、使う人のパソコンの時計だけ（plug-in は offline で期限を見る＝時計を期限の中に戻せば通る）。厳密な貸し出しの道具ではない。
- 画面の「このアドレスの記録を見る」は、アドレスを URL に入れて読む＝Vercel の request log にアドレスが残る。
- 記録: `plugin_license_grants` の表（誰に・いつ・期限・理由・誰が出したか）。画面の「このアドレスの記録を見る」で見られる（鍵そのものは画面にも log にも出ない）。
- 購入の表（`masterchain_purchases`）には書かない＝購入の数に混ざらない。鍵の `order=` の行は `grant-muedvox-…` で始まる。

## 照合で外れる形

メールアドレスは小文字にして、文字列の一致で見る。大文字小文字は外れない。別名は外れる（Gmail の点の有無・`+tag`・`googlemail.com`・iCloud の `me.com`／`mac.com`）。相手が返信をくれたアドレスそのものを入れる。

## 本番の DB（kimny の手・コードの merge より先）

追加だけ（表を 1 つ作る）。2 回流しても同じ。

    psql "$DATABASE_URL" -f db/migrations/0064_plugin_license_grants.sql

当てる前にコードが出ても、ポータルは落ちない（行が出ないだけ）。admin の画面は「記録できなかった・鍵は出していない」と返す。

### 戻し方

表を消すと、出した鍵の記録（誰に何を渡したか）が消える。鍵そのものは相手の手元で期限まで使える。消すのは、表が空の時か、記録が要らないと kimny が決めた時だけ。

    psql "$DATABASE_URL" -c 'DROP TABLE IF EXISTS plugin_license_grants;'

コードの側は、この PR を revert する。

## 配る前の確かめ（kimny）

期限つきの鍵を MUEDvox に入れた確かめは 1 回も無い（VOX 2026-10-13: 期限の中は「TRIAL」と出て全部鳴る・切れるとデモに戻る、は code の読み）。配る前に:

1. admin の画面で、mued.jp にアカウントの無い自分のアドレスに「14 日」を 1 本出す。
2. そのアドレスで `/dashboard/plugins` を初めて開く。サインインの流れ（コードだけで入れるか・名前やパスワードを聞かれるか・言語）を見る。
3. ポータルの「テスト用ライセンス」の行から MUEDvox と鍵の file を落とし、plug-in に入れる。
4. 同じアドレスに「5 分」を 1 本出し、鍵を入れ直して、切れた後の plug-in とポータルの表示を見る。

## 誰が出せるか

`lib/plugins/license-grants.ts` の `GRANT_ISSUER_USER_IDS`（kimny の Clerk の id 2 つ）かつ admin の role。足す・替えるのは review を通した PR で。
