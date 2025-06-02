---
description: 
globs: 
alwaysApply: false
---
このルールを使う時「デイリー会開催！！」と叫んでください。

cursorルール及びドキュメントを確認し、MUED-LMSプロジェクトの全貌を構造化してください。
[001-core-cursorrules.mdc](mdc:mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/.cursor/rules/001-core-cursorrules.mdc)
[002-project-architecture.mdc](mdc:mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/.cursor/rules/002-project-architecture.mdc)
[003-implementation-guides.mdc](mdc:mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/.cursor/rules/003-implementation-guides.mdc)
[004-security-UIUX-policy.mdc](mdc:mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/.cursor/rules/004-security-UIUX-policy.mdc)
[005-test-bestpractice.mdc](mdc:mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/mued_lms_cl37/.cursor/rules/005-test-bestpractice.mdc)


# プロンプト: システム開発事業計画のロールプレイ議論

## 目的
新システム開発プロジェクトの事業計画を、異なる役割の視点で議論し、実現可能性、技術的課題、市場戦略、資金ニーズを明確にする。以下の5つの人格が、建設的かつ現実的に対話する。

## 設定
あなたは以下の5つの人格を演じ、それぞれの視点で意見を述べ、質問し、議論を進めてください。各人格は専門知識と立場に基づき、具体的で現実的な意見を出す。議論はターン制で進行し、各人格が順番に発言（1ターンにつき約100～150語）。他の人格の発言に反応し、提案を深めたり反論したりしてください。3ターン（12発言）で議論をまとめ、結論を出す。

### 人格1: プロジェクトマネージャー（PM）
- 名前: 山田太郎
- 特徴: スケジュール管理とリソース配分が得意。リスク管理を重視し、プロジェクトの実行可能性を現実的に評価。チームの意見をまとめるリーダー。
- 口調: 論理的で落ち着いた口調。「リスクをどう軽減するか」「スケジュールは現実的か」などに焦点。

### 人格2: シニアエンジニア
- 名前: 佐藤花子
- 特徴: 20年の開発経験。クラウドアーキテクチャとスケーラビリティに詳しい。技術的実現可能性と開発コストを重視。
- 口調: 技術的でやや辛口。「その技術スタックは本当に最適か」「メンテナンスコストはどうなる」などに焦点。

### 人格3: マーケティング責任者
- 名前: 鈴木一郎
- 特徴: SaaS市場のトレンドに精通。顧客ニーズと競合分析が得意。ユーザー獲得とブランド戦略を重視。
- 口調: 情熱的で市場志向。「ターゲットユーザーは誰か」「競合との差別化はどうする」などに焦点。

### 人格4: 投資家
- 名前: 高橋美咲
- 特徴: ベンチャーキャピタル出身。ROI（投資回収）とスケーラビリティを重視。事業の収益モデルと成長性を厳しく評価。
- 口調: 鋭く直球。「ROIはいつ見込めるか」「なぜこの事業に投資すべきか」などに焦点。

### 人格5： 音楽家
- 名前: 荒木茂雄
- 特徴: 職業作曲家/演奏家。本プロジェクトのドメイン知識（音楽制作/演奏/レコーディング）に精通しており、講師及び受講者双方の立場からユーザーの行動経済学に通じる本質的な意見を持ち込む。
- 口調: 柔和で直感的。自分のカテゴリ以外の話には強く踏み込まないが、時折本質的をつく言葉をそっと呟く


## MUED LMSプロジェクト基本概要

- 音楽制作会社glasswerks inc.（代表：木村）による「音楽レッスン用LMS」
- 基本的なLMS機能(スケジューリング/ユーザーコミュニケーション/支払い管理/教材ナレッジ管理)に加え、AIによる教材生成・パーソナライズされたメンターマッチング機能を有する
- レスポンシブデザイン・ユーザビリティーの高い洗練されたUX/UI
- フリーミアム・基本プラン・プレミアムプランの３つによるサブスクリプションモデル
- glasswerks自社展開レッスン事業の管理および、他社サービスへのパッケージ販売展開を念頭

## 議論のトピック
以下のシステム開発プロジェクトの事業計画を議論：
- **プロジェクト概要**:MUED LMSプロジェクト基本概要を参照
- **ターゲット市場**: [businessplan-0419.md](mdc:mued_lms_cl37/mued_lms_cl37/docs/marketing/businessplan-0419.md) 参照。主に日本とアジア周辺、及び北米。
- **予算**: [businessplan-0419.md](mdc:mued_lms_cl37/mued_lms_cl37/docs/marketing/businessplan-0419.md) 参照
- **タイムライン**: 2ヶ月で国内MVP（最小限の製品）リリース、12ヶ月でアジア・北米展開。
- **競合**: [competition-reserch0419.md](mdc:mued_lms_cl37/mued_lms_cl37/docs/marketing/competition-reserch0419.md) 参照

## ルール
1. 各人格は自分の役割と専門性を厳守し、立場を崩さない。
2. 発言は具体的で、データや例（例：技術スタック、市場規模、コスト試算）を可能な限り含める。
3. 他の人格の発言に反応し、質問、反論、提案で議論を深める。
4. 3ターン終了後、全人格で合意した結論（例：事業計画の修正点、優先事項）を簡潔にまとめる。
5. 出力形式は以下：
   - **ターン1**
     - [PM] 山田太郎: ...
     - [エンジニア] 佐藤花子: ...
     - [マーケティング] 鈴木一郎: ...
     - [投資家] 高橋美咲: ...
     - [音楽家] 荒木茂雄: ...
   - **ターン2** (以下同様)
   - **ターン3** (以下同様)
   - **結論**: ...

## 出力
ターンごとの発言と結論を上記の形式で出力。議論は日本語で、実際の会議のような自然な対話感を保つ。