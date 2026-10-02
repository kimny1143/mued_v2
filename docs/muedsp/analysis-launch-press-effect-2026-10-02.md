# 発売の外報の効き（10/1 00:00 JST〜10/2 18 時ごろ・途中の値）

- 依頼: conductor 2026-10-02（kimny「いちおう今のやつ見たい。聞いて」）。10/8 の 7 日集計の下書き用
- 測定: GA4（property 525457895・JST・2026-10-01〜today）を 2026-10-02 18 時台に照会。Resend の数は funnel の 10/1 分の集計（until 2026-10-02T07:25Z）
- ★10/2 の分は GA4 の処理が終わっていない。参照元が付いていないセッションが多い（下の「処理待ち」の行）。数は増え、参照元は付け替わる
- GA4 の「ユーザー」は GA の client（ブラウザ）の数で、人ではない。広告ブロックや、メールのアプリの中のブラウザでは数えられない＝少なめに出る

## 結論

1. **プラグイン情報サイトからの流入は、今のところ 1 桁**。BPB 2・KVR 2（`kvraudio.com` 1＋`kvr`／utm の press_masterchain-launch 1）・plugin-nation 3・soundshockaudio 1。**rekkerd・audiopluginsforfree・audiopluginguy・gearnews・gearspace は 0**（参照元が付いた分では）。
2. **一番多く人を運んだのはメール**。発売便 11 人・Windows 便 3 人（GA4）。Resend では発売便を押した人が 50、Windows 便が 40 なので、GA4 に出るのは 2〜3 割（メールのアプリの中のブラウザ・ブロック）。
3. **処理待ちが一番大きい**。(not set) 69・(data not available) 48。10/3 以降に測り直さないと、サイト別の結論は出せない。
4. **購入**: 本物は 1 件（10/1 17 時台 JST・GA4 の売上 ¥10,855）。もう 1 件は kimny の確認の注文（返金済み・内部の注文）。どの参照元から来たかは取れない（下）。
5. **デモ**: Resend で、発売便の後に控えのメールを受け取った人は 4 人（10/2 07:25Z まで）。参照元別は取れない（下）。

## 参照元別（GA4・10/1 00:00 JST〜10/2 18 時台）

| 参照元 | ユーザー | そのうち /muedsp に来た | ダウンロードのフォームの送信（`cta_click` download_form） | 購入 |
|---|---|---|---|---|
| rekkerd.org | 0 | 0 | 0 | 取れない（下） |
| bedroomproducersblog.com | 2 | 2 | 0 | 〃 |
| kvraudio.com | 1 | 1 | 0 | 〃 |
| kvr（utm: referral / press_masterchain-launch） | 1 | 1 | 0 | 〃 |
| audiopluginsforfree.com | 0 | 0 | 0 | 〃 |
| audiopluginguy.com | 0 | 0 | 0 | 〃 |
| gearnews.com | 0 | 0 | 0 | 〃 |
| gearspace.com | 0 | 0 | 0 | 〃 |
| email / broadcast / email_nl-launch-a-issue05（発売便） | 11 | 11 | 0 | 〃 |
| email / broadcast / email_nl-windows-issue06（Windows 便） | 3 | 3 | 1（/en/muedrive） | 〃 |
| email（その他の便・welcome） | 3 | 3 | 2 | 〃 |
| threads / post | 1 | 1 | 0 | 〃 |
| threads / bio / window-b | 1 | 0 | 0 | 〃 |
| x（twitter・t.co） | 0 | 0 | 0 | 〃 |
| plugin-nation.com | 3 | 1 | 0 | 〃 |
| soundshockaudio.com | 1 | 1 | 2 | 〃 |
| facebook.com | 3 | 2 | 0 | 〃 |
| google / organic | 6 | 4 | 1 | 〃 |
| (direct) | 26 | 11 | 3 | 〃 |
| muedsp_plugin / inapp / masterchain_buy（プラグインの中の購入のボタン） | 1 | 1 | 0 | 〃 |
| paypal.com・accounts.google.com（支払いとサインインからの戻り） | 3 | 3 | 1 | 〃 |
| **処理待ち: (not set)** | **69** | **55** | **24** | 2（下） |
| **処理待ち: (data not available)** | **48** | **41** | **9** | 0 |

- 「0」は GA4 で参照元が付いた分では 0、という意味。処理待ちの 117 人の中に居る可能性がある。
- 「ダウンロードのフォームの送信」は、無料 3 種のフォームとデモのフォームの合計（下）。
- 購入の 2 件は (not set) の行に入っている。サーバーから GA4 に送る形（Measurement Protocol）なので、セッションの参照元が付かない。

## 取れない所（0 と混ぜない）

| 何 | 理由 |
|---|---|
| 購入の参照元 | 購入は FastSpring の webhook からサーバーで GA4 に送っている（`lib/analytics/ga4-server.ts`）。ブラウザのセッションが無いので、参照元は (not set)。utm を event の値として送る作りはあるが、GA4 の custom dimension に登録していないので、報告では引けない |
| デモのダウンロードの参照元 | デモのフォームと、/muedsp にある無料の MUEDlim のフォームは、どちらも `cta_click` の destination が download_form。区別する値（location）は GA4 に登録していない。デモの人数は Resend の控えのメールで 4 人（発売便の後〜10/2 07:25Z）だけ |
| 10/2 のサイト別 | GA4 の処理待ち（117 人）。10/3〜10/4 に測り直す |
| audiopluginguy・gearnews・gearspace・rekkerd の掲載の日時 | 当課に記録が無い。0 は「掲載がまだ」か「来ていない」か区別できない |
| メールの実際の到達（押した人） | GA4 では少なめに出る。押した人の正は Resend（発売便 50・Windows 便 40・`reports/newsletter/newsletter-metrics.json`） |

## 10/8 の集計に向けて

- 処理待ちが片付いた 10/3 以降に、同じ表を測り直す。
- 購入とデモの参照元を 10/8 に出したいなら、GA4 に `location` と、purchase の `source`／`campaign` を custom dimension として登録する必要がある（GA4 の管理画面・kimny）。登録した日から先の分しか取れない。
- 10/1 22 時台の localhost からの page_view 1 件（/ja/muedsp）は試験の分（mued の #1208 の確認）。
