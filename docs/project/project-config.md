# GitHub Projectsの設定

このドキュメントでは、MUEDプロジェクトのGitHub Projects設定について説明します。

## プロジェクト設定

### プロジェクト名
- MUED LMS - Development Board

### ビュー設定
1. **ボード**: カンバンボードスタイル
   - `Todo`, `In Progress`, `In Review`, `Done`の4列
2. **テーブル**: タスク管理
   - フィールド: `Title`, `Assignees`, `Status`, `Priority`, `Type`, `Sprint`, `Estimated Effort`
3. **ロードマップ**: マイルストーン表示
   - 週ごとの進捗状況を示すロードマップビュー

### カスタムフィールド

1. **Priority**
   - `Critical` - 緊急性の高いタスク
   - `High` - 優先度の高いタスク
   - `Medium` - 中程度の優先順位
   - `Low` - 優先度の低いタスク

2. **Type**
   - `Feature` - 新機能の開発
   - `Bug` - バグ修正
   - `Documentation` - ドキュメント作成
   - `Refactor` - リファクタリング
   - `Test` - テスト追加

3. **Sprint**
   - `Week 1` - 第1週のスプリント
   - `Week 2` - 第2週のスプリント
   - `Week 3` - 第3週のスプリント
   - `Week 4` - 第4週のスプリント

4. **Estimated Effort**
   - `XS` - 1 ストーリーポイント (～1時間)
   - `S` - 2 ストーリーポイント (～4時間)
   - `M` - 3 ストーリーポイント (～1日)
   - `L` - 5 ストーリーポイント (～2日)
   - `XL` - 8 ストーリーポイント (～1週間)

## オートメーション設定

GitHub Projectsでは以下のオートメーションを設定します:

1. **PR自動リンク**
   - PRが作成されると、関連するIssueに自動的にリンク
   - PRがマージされると、関連するIssueを「Done」に移動

2. **Status自動更新**
   - Issueに担当者がアサインされると、自動的に「In Progress」に移動
   - PRがレビュー中になると、自動的に「In Review」に移動 

3. **Sprint終了通知**
   - Sprintの終了が近づくと、未完了のIssueに関して通知

## Week2スプリントチケット

Week2のスプリントには以下のチケットを含めます:

### 山田（PM / FE）
1. **Week2 チケット起票 & GitHub Projects 整理**
   - Type: `Documentation`, Priority: `High`, Sprint: `Week 2`
2. **ADR-0002 作成**
   - Type: `Documentation`, Priority: `Medium`, Sprint: `Week 2`
3. **Netlify Preview 環境構築**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Week 2`

### 佐藤（FE）
1. **Realtime Chat β UI / Supabase Channel Hook 実装**
   - Type: `Feature`, Priority: `High`, Sprint: `Week 2`
2. **ワンタップ練習記録 UI PWA 対応**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Week 2`
3. **Storybook 基盤立ち上げ**
   - Type: `Documentation`, Priority: `Low`, Sprint: `Week 2`

### 田中（FE / 決済）
1. **Stripe Checkout 本番 API キー切替**
   - Type: `Feature`, Priority: `High`, Sprint: `Week 2`
2. **FastAPI Webhook Stub 実装**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Week 2`

### 木村（AI サービス）
1. **GET/POST `/chat/messages` Stub 実装**
   - Type: `Feature`, Priority: `High`, Sprint: `Week 2`
2. **POST `/exercise/logs` Stub 実装**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Week 2`
3. **MusicXML ライブラリ調査 & PoC**
   - Type: `Documentation`, Priority: `Medium`, Sprint: `Week 2`
4. **OpenAPI スキーマ更新**
   - Type: `Documentation`, Priority: `Low`, Sprint: `Week 2`

### 鈴木（DevOps / Test）
1. **@vitest/coverage-v8 パッケージ追加**
   - Type: `Bug`, Priority: `Critical`, Sprint: `Week 2`
2. **Codecov / Artifacts によるカバレッジ可視化**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Week 2`
3. **pytest による FastAPI エラーハンドリングテスト追加**
   - Type: `Test`, Priority: `Medium`, Sprint: `Week 2`
4. **KPI ダッシュボード初版作成**
   - Type: `Feature`, Priority: `Low`, Sprint: `Week 2` 