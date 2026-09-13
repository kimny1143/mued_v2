# MUED Studio Showroom — Claudeチーム向けデザイン提案

2026-09-13 / `design/mued-studio-showroom` / base: `origin/main` (`89c4108e`)

音楽制作の道具を扱うブランドとして、Hooの人格とプラグインの実体が同じ世界に見えるトップページを提案する。黒いスタジオと温かい白の製品展示を交互に使い、Hooの目と製品の操作部にある琥珀色を、サイトの唯一の強いアクセントにした。

## レビューする画面

- 日本語: `/ja/redesign/studio`
- 英語: `/en/redesign/studio`
- ローカル: `http://localhost:3017/ja/redesign/studio`
- Vercel Previewが生成された場合は、そのホストに上記パスを付ける。

このPRは提案画面の実装。`/[locale]` の本番ホーム、既存の `/redesign`、製品詳細・認証・決済・配布処理は変更していない。ログイン済みでも画面を確認できる。両言語とも `noindex, nofollow`。

## 参照と取り入れ方

| 参照 | 観察した構成 | MUEDへの適用 |
| --- | --- | --- |
| [Valhalla DSP](https://valhalladsp.com/) | 大きな文字、明快な余白、製品ごとの個性、シンプルな製品一覧 | 大きな見出し、細い区切り線、3つの無料プラグインを直接比較できる棚 |
| [FabFilter](https://www.fabfilter.com/) | 主役製品を大きく見せるヒーロー、製品自体を主役にする構成 | masterchainの画面を横幅いっぱいに近いサイズで展示し、個別製品へつなぐ |
| glasswerks / Hoo | 白い幾何学のフクロウとリールの形 | リポジトリ既存の `/hoo-animated.svg` をヘッダー・署名・思想セクションに再利用 |
| MUEDsp masterchain | 暗いUI、琥珀色の操作部、コンソールに座るHoo | 同じキャラクター原画と既存UIモックを使い、配色と人格を連続させる |

参照サイトの画像・ロゴ・文言は転用していない。glasswerksの `public/logomark.png` とMUEDspの `resources/img/` も参照し、既存のMUED内アセットで構成した。新しいHooの造形は作っていない。

## 画面の構成

1. ヘッダー: Hoo＋MUED、プラグイン、Hoo、サポート、JA/EN、ログイン。
2. ヒーロー: 「音を、あなたの作品に。」／“Make it sound like you.” と既存のHoo原画。道具一覧への入口。
3. 工程ナビ: MIX / MASTER / TRAIN。製品名も表示し、各セクションへ移動。
4. MASTER: masterchainを旗艦として展示。既存画像は開発中UIモックであることを画像直下に明示。
5. 無料プラグイン: MUEDsat / MUEDlim / MUEDrive。各製品詳細に接続。MUEDriveはmasterchainから切り出した段とは表現せず、独立エフェクトも含む棚にする。
6. MIX: Hooの人格と会話によるディレクション。MUEDialへ接続。
7. TRAIN: MuFreQの実際の画面で耳の訓練を見せ、既存のApp Store URLへ接続。
8. 既存の思想・設計者の一行と、glasswerksへの帰属・サポート・法定リンク。

工程ナビは従来のMIX→MASTER→TRAINを維持。本文は、今回指定されたプラグインメーカーの参照とmasterchainの存在感を優先してMASTERを先頭にした。番号は工程のIDであり、本文の連番ではない。この優先順位はデザインレビューの判断点。

## ビジュアルのルール

| 要素 | 値・方針 |
| --- | --- |
| スタジオの黒 | `#111210` |
| 展示面の温かい白 | `#f0eee7` |
| Hoo由来の琥珀色 | 既存ブランド色 `#f5a524` |
| 展示台 | `#d8d7cc` |
| 文字 | 既存Sora＋日本語システムフォント。仕様ラベルのみ既存Geist Mono |
| 幅 | 最大1280px。モバイルでは左右20px |
| CTA | 角を立てた琥珀色ボタンと下線付きテキストリンク |
| 動き | 自動再生・視差効果なし。hoverの色のみ180ms、reduced motionで停止 |

カードを重ねる装飾、グラス効果、抽象的な波形、新しいマスコット、実績・評価の捏造を足さず、実在するブランドアセットと製品画面を見せる。

## 実装

- `app/[locale]/redesign/studio/page.tsx`: 日英プレビュー、ローカライズしたメタ情報、検索除外。
- `components/features/landing/studio-showroom.tsx`: Server Component。既存 `landing.v2` の製品肩書き・出自・思想・CTAを再利用。
- `components/features/landing/studio-showroom.module.css`: 提案画面内に閉じたCSS。既存画面のスタイルに波及しない。
- `messages/{ja,en}.json`: `studioShowroom` 名前空間のみ追加。
- 画像はすべて既存アセット＋`next/image`。ヒーローのみ優先ロード。他は遅延ロード。
- 言語切り替えは通常のリンクでドキュメントを読み直す。既存locale layoutのlang設定スクリプトがクライアント遷移では再実行されず、本文とhtml langが食い違うのを提案内で避けるため。
- 既存ルートレイアウトの構造化データを継承。プレビューを独立した販売製品として登録するJSON-LDは追加しない。

## Claudeチームのレビュー観点

- Hooのロゴ・原画・masterchainのキャラクターが同じブランドに見えるか。
- 黒一色の従来構成から、温かい白の展示面を入れる方向がglasswerksの印象に合うか。
- ファーストビューのHooの比率と、MASTERを先頭に置く製品優先順位。
- 提案コピーの日英の温度感。製品の既存説明との整合性。
- 390px表示で、Hooと主CTAを確認しやすいか。

採用後のホーム切り替えでは `app/[locale]/page.tsx` の認証リダイレクトとSEOメタ情報を保持したままコンポーネントを差し替える。その際にブランドリンクを本番ホームへ、言語切り替えを本番パスへ変更し、CTA分析のイベントも既存の `trackCtaClick` と接続する。この提案段階では本番のCTA計測値に新しい実装を足していない。

## 検証

- 型チェック: PASS。
- 変更したTSXのESLint: PASS。
- 全体Lint: エラー0、既存ファイルの警告6。
- ユニット: 全159ファイル中158ファイル / 2,275テストが初回PASS。残りの既存PRゲートテスト1件はsandboxのIPC作成制限で失敗。通常権限で該当ファイルを再実行し、23/23 PASS。全2,276テストの通過を確認。
- 日英それぞれ320 / 390 / 768 / 1024 / 1440px: 横はみ出しなし、h1とmainは各1つ、空のリンクなし。
- ブラウザーで日本語→英語、英語→日本語、`html lang`とアクティブ言語、検索除外メタを確認。
- Tabでスキップリンクにフォーカス、Enterでmainへ移動、可視フォーカスを確認。
- ページ内工程ナビ、およびMUEDsp / MUEDsat / MUEDlim / MUEDrive / MUEDialへの遷移と詳細表示を確認。App Storeは既存の定数URLを使用。
- 購入・メール送信・ファイル配布の実行は、このデザインプレビューの検証対象外。

既存ルートレイアウトには、初回の日本語表示でcookie由来のサーバーlangとlocale scriptの更新がずれるhydration警告がある。本提案以外にも共通する既存構成であり、このPRでは全体layoutを変更していない。
