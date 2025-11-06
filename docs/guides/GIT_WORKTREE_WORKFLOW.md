# Git Worktree による並行開発ワークフロー

**対象**: MUED LMS v2 開発チーム
**最終更新**: 2025-11-06

---

## 📖 概要

Git Worktreeは、単一のGitリポジトリから複数の作業ディレクトリを作成できる機能です。MUED LMS v2では、この機能を活用して開発効率を大幅に向上させています。

### 🎯 導入の背景

**従来の課題**:
- ブランチ切り替え時にNext.jsの再ビルドが必要（1-2分）
- 緊急修正時に開発中の作業を`git stash`する手間
- PRレビュー時に作業を中断せざるを得ない
- 複数機能の並行開発が困難

**Git Worktreeによる解決**:
- 各worktreeが独立したビルドキャッシュを保持
- ディレクトリ移動だけで作業を切り替え（< 5秒）
- 開発とレビューを同時進行可能
- 1日あたり**15-25分の時間節約**

---

## 📁 標準ディレクトリ構成

MUED LMS v2プロジェクトでは、以下の構成を標準としています：

```
~/Dropbox/_DevProjects/mued/
├── mued_v2/              # メイン開発用 (main or feature branch)
├── mued_v2-hotfix/       # 緊急修正用 (detached HEAD)
└── mued_v2-review/       # PRレビュー用 (detached HEAD)
```

### 各Worktreeの役割

#### 1. `mued_v2/` - メイン開発ディレクトリ
- **用途**: 通常の機能開発
- **ブランチ**: `main`, `feature/*`, `refactor/*` など
- **推奨操作**: 主要な開発作業はここで実施

#### 2. `mued_v2-hotfix/` - 緊急修正用
- **用途**: 本番環境の緊急バグ修正
- **ブランチ**: `main` または `hotfix/*`
- **推奨操作**:
  - 常に最新の`main`をpull
  - 修正後すぐにPR作成・マージ
  - マージ後は`git checkout main`でリセット

#### 3. `mued_v2-review/` - PRレビュー用
- **用途**: チームメイトのPRレビュー
- **ブランチ**: 各PRのブランチ（動的）
- **推奨操作**:
  - `gh pr checkout <PR番号>`でブランチ切り替え
  - テスト実行、コードレビュー
  - レビュー完了後は削除またはリセット

---

## 🚀 基本コマンド

### Worktree一覧表示

```bash
git worktree list
```

**出力例**:
```
/Users/kimny/Dropbox/_DevProjects/mued/mued_v2         c43f22b [main]
/Users/kimny/Dropbox/_DevProjects/mued/mued_v2-hotfix  c43f22b (detached HEAD)
/Users/kimny/Dropbox/_DevProjects/mued/mued_v2-review  c43f22b (detached HEAD)
```

### 新しいWorktreeを作成

#### Detached HEADで作成（推奨）

```bash
git worktree add --detach ../mued_v2-feature HEAD
```

**メリット**:
- ブランチの重複エラーを回避
- 柔軟にブランチを切り替え可能
- 使い終わったらすぐに削除できる

#### 特定のブランチで作成

```bash
git worktree add -b feature/new-feature ../mued_v2-feature main
```

**用途**: 長期的な機能開発で専用ディレクトリが必要な場合

### Worktreeを削除

```bash
# ディレクトリと参照を削除
git worktree remove ../mued_v2-feature

# 古い参照を整理
git worktree prune
```

---

## 💡 実践的な使用例

### シナリオ1: 緊急バグ修正

**状況**: 決済機能の開発中にStripeのWebhookエラーが本番で発生

```bash
# メインで開発中 (feature/payment-flow)
cd ~/Dropbox/_DevProjects/mued/mued_v2
# ← ここで作業を中断せずそのまま

# Slackで緊急バグ報告！
cd ../mued_v2-hotfix

# 最新のmainを取得
git checkout main
git pull origin main

# 修正用ブランチを作成
git checkout -b hotfix/stripe-webhook-error

# 修正を実施
vim app/api/webhooks/stripe/route.ts

# テスト実行
npm run test:integration

# コミット & PR作成
git add .
git commit -m "fix: resolve Stripe webhook signature verification error"
git push origin hotfix/stripe-webhook-error
gh pr create --title "fix: Stripe webhook error" --base main

# すぐに開発に戻る（stash不要！）
cd ../mued_v2
# feature/payment-flow の作業がそのまま残っている
npm run dev  # ビルドキャッシュも残っているので高速起動
```

**時間節約**: 約5分（stash + checkout + rebuild を回避）

---

### シナリオ2: チームメイトのPRレビュー

**状況**: 同僚がAI教材生成機能のPR #456を作成、レビュー依頼

```bash
# メインで開発中
cd ~/Dropbox/_DevProjects/mued/mued_v2

# PRレビュー依頼通知が来た
cd ../mued_v2-review

# GitHub CLIでPRをチェックアウト
gh pr checkout 456

# 依存関係のインストール（必要に応じて）
npm install

# E2Eテストで動作確認
npm run test:e2e -- tests/e2e/ai-material-generation.spec.ts

# ビルド確認
npm run build

# コードレビュー（VS Code / Cursorで開く）
code .

# レビューコメント記入後、GitHub上でApprove

# 開発ディレクトリに戻る
cd ../mued_v2
# そのまま開発を継続（npm run devも起動したまま）
```

**時間節約**: 約3分（ブランチ切り替え + rebuild を回避）

---

### シナリオ3: 複数機能の並行開発

**状況**: AI家庭教師機能とアナリティクス機能を同時に開発

```bash
# 新機能Aの開発開始
cd ~/Dropbox/_DevProjects/mued/mued_v2
git worktree add -b feature/ai-tutor ../mued_v2-ai-tutor main
cd ../mued_v2-ai-tutor

# 依存関係インストール & 開発サーバー起動
npm install
npm run dev
# → http://localhost:3000 でAI家庭教師機能を開発

# 別ターミナルで新機能Bも開始
cd ~/Dropbox/_DevProjects/mued/mued_v2
git worktree add -b feature/analytics ../mued_v2-analytics main
cd ../mued_v2-analytics

# 依存関係インストール & 別ポートで開発サーバー起動
npm install
npm run dev -- --port 3001
# → http://localhost:3001 でアナリティクス機能を開発

# ブラウザで両方のタブを開いて同時にテスト可能
# Feature A: localhost:3000/ai-tutor
# Feature B: localhost:3001/analytics/dashboard
```

**時間節約**: ブランチ切り替えなしで両機能を即座に確認可能

**完了後の削除**:
```bash
# 機能Aマージ完了
git worktree remove ../mued_v2-ai-tutor

# 機能Bマージ完了
git worktree remove ../mued_v2-analytics

# 不要な参照を整理
git worktree prune
```

---

## ⚡ メリット

### 1. ビルド時間の節約

| 操作 | 従来の方法 | Worktree使用 | 節約時間 |
|------|-----------|------------|---------|
| ブランチ切り替え | `git checkout` + rebuild (1-2分) | `cd` (< 5秒) | 約1.5分 |
| 1日10回切り替え | 15-20分 | < 1分 | **15-25分/日** |
| 1週間（5日） | 75-100分 | < 5分 | **約1.5時間/週** |

### 2. コンテキストスイッチングの高速化

- ✅ `git stash` / `git stash pop` 不要
- ✅ 開発中のファイルがそのまま残る
- ✅ 開発サーバーを起動したまま切り替え可能
- ✅ IDE/エディタのウィンドウを別々に開ける

### 3. 並行作業の実現

- ✅ 開発とレビューを同時進行
- ✅ 緊急修正中も開発を中断しない
- ✅ 複数機能の動作を同時に確認
- ✅ ローカルでの統合テストが容易

---

## ⚠️ 注意点

### 1. node_modules の管理

**推奨**: 各worktreeで個別にインストール

```bash
cd ../mued_v2-hotfix
npm install  # 独立したnode_modules（約500MB）
```

**理由**:
- 依存関係のバージョン違いを回避
- ビルドキャッシュの独立性確保
- パッケージロックの競合防止

**ディスク容量**: 各worktreeで約500MB必要（SSDの容量に注意）

---

### 2. 環境変数の共有

`.env.local` は各worktreeで独立して管理されます：

**パターン1: 共有する場合（推奨）**
```bash
cd ../mued_v2-hotfix
ln -s ../mued_v2/.env.local .env.local
```

**パターン2: 個別管理する場合**
```bash
cd ../mued_v2-hotfix
cp ../mued_v2/.env.local .env.local
# 必要に応じて異なる値を設定（例: ポート番号）
```

---

### 3. IDE/エディタのサポート

#### VS Code / Cursor

```bash
# worktree毎に別ウィンドウで開く
code ~/Dropbox/_DevProjects/mued/mued_v2
code ~/Dropbox/_DevProjects/mued/mued_v2-hotfix
```

**メリット**: 各worktreeで独立したLSP、拡張機能の状態

#### Claude Code

```bash
# 各worktreeのディレクトリで起動
cd ~/Dropbox/_DevProjects/mued/mued_v2-hotfix
claude
```

---

### 4. 使い終わったら削除

**推奨タイミング**:
- PRマージ後
- 機能開発完了後
- 不要になった一時的なworktree

```bash
# ディレクトリと参照を削除
git worktree remove ../mued_v2-feature-old

# 古い参照を整理
git worktree prune

# 確認
git worktree list
```

---

## 📊 推奨される運用

### 常設Worktree（2つ）

```bash
mued_v2-hotfix/   # 緊急修正用（常に最新のmainをpull）
mued_v2-review/   # PRレビュー用（チェックアウトして使用）
```

**初期セットアップ**:
```bash
cd ~/Dropbox/_DevProjects/mued/mued_v2

# hotfix用
git worktree add --detach ../mued_v2-hotfix HEAD
cd ../mued_v2-hotfix
npm install
ln -s ../mued_v2/.env.local .env.local

# review用
cd ~/Dropbox/_DevProjects/mued/mued_v2
git worktree add --detach ../mued_v2-review HEAD
cd ../mued_v2-review
npm install
ln -s ../mued_v2/.env.local .env.local
```

---

### 一時的なWorktree

```bash
# 機能開発開始時に作成
git worktree add -b feature/new-feature ../mued_v2-new-feature main

# 開発 → テスト → PR → マージ

# 完了後に削除
git worktree remove ../mued_v2-new-feature
```

---

## 🔍 トラブルシューティング

### Q: 「'main' is already used by worktree」エラー

**原因**: 同じブランチを複数のworktreeで使用できない

**解決策1**: Detached HEADで作成（推奨）
```bash
git worktree add --detach ../mued_v2-temp HEAD
cd ../mued_v2-temp
git checkout -b feature/new-branch
```

**解決策2**: 新しいブランチを明示的に指定
```bash
git worktree add -b temp-branch ../mued_v2-temp main
```

---

### Q: Worktreeが残っているか確認したい

```bash
git worktree list
```

**出力例**:
```
/Users/kimny/.../mued_v2         c43f22b [main]
/Users/kimny/.../mued_v2-hotfix  c43f22b (detached HEAD)
/Users/kimny/.../mued_v2-review  a1b2c3d [feature/review-pr-456]
```

---

### Q: 削除したWorktreeの参照が残っている

**症状**: ディレクトリを手動削除したが`git worktree list`に残る

**解決**:
```bash
git worktree prune
git worktree list  # 確認
```

---

### Q: 複数のworktreeで`npm run dev`を同時起動したい

**解決**: ポート番号を変更

```bash
# Worktree 1: デフォルトポート
cd ~/Dropbox/_DevProjects/mued/mued_v2
npm run dev  # → http://localhost:3000

# Worktree 2: 別ポート
cd ../mued_v2-feature
npm run dev -- --port 3001  # → http://localhost:3001

# Worktree 3: さらに別ポート
cd ../mued_v2-review
npm run dev -- --port 3002  # → http://localhost:3002
```

---

### Q: node_modulesが大きすぎてディスク容量が不足

**対策**:
1. 不要なworktreeを削除
2. `node_modules`を削除してシンボリックリンク化（非推奨）
3. SSDのクリーンアップ

```bash
# 不要なworktree削除
git worktree remove ../mued_v2-old-feature

# node_modules削除
cd ../mued_v2-review
rm -rf node_modules .next

# 必要に応じて再インストール
npm install
```

---

## 🎓 チーム開発での活用

### コードレビューのベストプラクティス

```bash
# PRレビュー時
cd ~/Dropbox/_DevProjects/mued/mued_v2-review
gh pr checkout <PR番号>

# 自動テスト実行
npm run test
npm run lint
npm run typecheck

# E2Eテストで動作確認
npm run test:e2e

# ビルド確認
npm run build

# ローカルでの手動確認
npm run dev

# GitHubでレビューコメント記入
gh pr review <PR番号> --comment -b "LGTM! 動作確認済み"
```

---

### チーム内での共有ルール

1. **worktree命名規則**:
   - 緊急修正: `mued_v2-hotfix`
   - PRレビュー: `mued_v2-review`
   - 長期開発: `mued_v2-<機能名>`

2. **定期的なクリーンアップ**:
   - 週1回、不要なworktreeを削除
   - `git worktree prune`で参照を整理

3. **ドキュメント化**:
   - CLAUDE.mdに標準構成を記載
   - 新メンバーへのオンボーディング資料に含める

---

## 📚 参考リソース

- [Git公式ドキュメント - git worktree](https://git-scm.com/docs/git-worktree)
- [CLAUDE.md - Git Worktreeセクション](../../CLAUDE.md#git-worktree-による並行開発ワークフロー)
- [GitHub CLI - gh pr checkout](https://cli.github.com/manual/gh_pr_checkout)

---

**最終更新日**: 2025-11-06
**次回見直し**: 1ヶ月後または新しいベストプラクティス発見時
