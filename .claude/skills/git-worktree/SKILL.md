---
name: git-worktree
description: Git worktree操作、ブランチ作成・削除、PR作成、マージ戦略。worktree、ブランチ操作、PR、git操作時に使用。
---

# Git Worktree (MUED LMS v2)

## 運用方針

**メインディレクトリは1つだけ。Worktreeは作業単位で一時的に使用する。**

```
~/Dropbox/_DevProjects/mued/
└── mued_v2/                              # メインリポジトリ（main）

~/.claude-worktrees/mued_v2/
└── xxx-yyy/                              # Claude Code が自動生成する一時worktree
```

## NG パターン

```
# 常設の複数ディレクトリは作らない
mued_v2/        # main
mued_v2-poc/    # ← これは冗長。同期の手間、どっちが最新か分からなくなる
```

## 正しいワークフロー

1. **作業開始**: Claude Code が worktree を自動生成
2. **作業中**: worktree 内でブランチ作成・コミット
3. **作業完了**: PR作成 → AIレビュー → 修正 → mainにマージ
4. **クリーンアップ**: worktree とブランチを削除

## PR作成の基準

| 変更内容 | PR | 理由 |
|---------|-----|------|
| **コード変更** | **必須** | AIレビューで品質担保 |
| **設定ファイル変更** | **必須** | 影響範囲の確認 |
| ドキュメントのみ | 任意 | 影響が限定的 |
| typo修正など軽微な変更 | 不要 | mainに直接push可 |

**原則: コードを触ったらPR必須。**

## コマンド

```bash
# 一覧表示
git worktree list

# 手動作成（通常は Claude Code が自動で行う）
git worktree add ~/.claude-worktrees/mued_v2/feature-xxx -b feature/xxx

# 削除
git worktree remove ~/.claude-worktrees/mued_v2/feature-xxx
git branch -d feature/xxx

# 一括クリーンアップ
git worktree prune && git fetch --prune
```

## ブランチ戦略

```
main              # 本番
├── feature/*     # 機能開発
├── fix/*         # バグ修正
└── hotfix/*      # 緊急修正
```

## 整理用 Hook

会話終了時に `suggest-git-cleanup.sh` が自動実行され、以下を検知して提案：
- mainより古いworktree
- mainにマージ済みのローカルブランチ
- リモートで削除済みのブランチ
