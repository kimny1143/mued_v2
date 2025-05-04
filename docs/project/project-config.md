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
   - `Sprint 1-Week 1` - スプリント1の第1週
   - `Sprint 1-Week 2` - スプリント1の第2週
   - `Sprint 2-Week 3` - スプリント2の第3週
   - `Sprint 2-Week 4` - スプリント2の第4週
   - `Sprint 3-Week 5` - スプリント3の第5週
   - `Sprint 3-Week 6` - スプリント3の第6週
   - `Sprint 4-Week 7` - スプリント4の第7週
   - `Sprint 4-Week 8` - スプリント4の第8週

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

## Sprint 1 チケット

Sprint 1には以下のチケットを含めます:

### チーム全体

1. **Sprint 1 チケット起票 & Projects Board 更新**
   - Type: `Documentation`, Priority: `High`, Sprint: `Sprint 1-Week 1`, Estimated Effort: `S`
   - Assignees: 山田
   - 期限: Week 1 Day 1

2. **GitHub Actions: eslint+test+build**
   - Type: `Feature`, Priority: `High`, Sprint: `Sprint 1-Week 1`, Estimated Effort: `S`
   - Assignees: 鈴木
   - 期限: Week 1 Day 3

### 基盤 & 認証 (Backend)

1. **`auth`パッケージ: NextAuth.js + Google OAuth**
   - Type: `Feature`, Priority: `High`, Sprint: `Sprint 1-Week 2`, Estimated Effort: `L`
   - Assignees: 木村
   - 期限: Week 2 Day 2

2. **Supabase接続 & Prisma schema v1 (`User`, `Role`)**
   - Type: `Feature`, Priority: `High`, Sprint: `Sprint 1-Week 1`, Estimated Effort: `M`
   - Assignees: 佐藤
   - 期限: Week 1 Day 5

### UI & フロントエンド

1. **App Routerレイアウト / Tailwindテーマ**
   - Type: `Feature`, Priority: `High`, Sprint: `Sprint 1-Week 1`, Estimated Effort: `M`
   - Assignees: 田中
   - 期限: Week 1 Day 4

2. **StorybookベースUIライブラリ（Button/Card）**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Sprint 1-Week 1`, Estimated Effort: `S`
   - Assignees: 佐藤
   - 期限: Week 1 Day 5

3. **セキュリティヘッダー設定**
   - Type: `Feature`, Priority: `Medium`, Sprint: `Sprint 1-Week 2`, Estimated Effort: `S`
   - Assignees: 佐藤
   - 期限: Week 2 Day 1

### 優先タスク（旧Week4より移行）

1. **AI教材生成β版 - バックエンド準備**
   - Type: `Feature`, Priority: `High`, Sprint: `Sprint 1-Week 2`, Estimated Effort: `L`
   - Assignees: 木村
   - Status: `In Progress`
   - 期限: Week 2 Day 5

2. **βユーザー招待準備**
   - Type: `Documentation`, Priority: `High`, Sprint: `Sprint 1-Week 1`, Estimated Effort: `S`
   - Assignees: 鈴木
   - Status: `In Progress`
   - 期限: Week 1 Day 3 