---
name: claude-hooks
description: Claude Code Hookの作成、修正、デバッグ、イベントトリガー設定。Hook、PostToolUse、Stop、自動化スクリプト作成時に使用。
---

# Claude Code Hooks (MUED LMS v2)

## 登録済み Hook

```
.claude/
├── hooks/
│   ├── suggest-claude-md-update.sh   # CLAUDE.md 更新提案
│   ├── suggest-poc-log-update.sh     # PoC ログ更新提案
│   └── suggest-git-cleanup.sh        # Git 整理提案
└── settings.local.json
```

## 1. CLAUDE.md 育成 Hook

**発火**: `git commit` 完了後（PostToolUse）

| 検知パターン | 提案 |
|-------------|------|
| `scripts/mcp/*.js` 追加 | MCP セクション追記 |
| `db/migrations/*.sql` 追加 | DB セクション追記 |
| `apps/`, `app/`, `components/`, `lib/` 新規ディレクトリ | 構造セクション追記 |
| `.claude/hooks/*.sh` 追加 | Hooks セクション追記 |

## 2. Git 整理 Hook

**発火**: 会話終了時（Stop）

| 検知パターン | 提案 |
|-------------|------|
| mainより古いworktree | 削除を検討 |
| mainにマージ済みのローカルブランチ | `git branch -d` で削除 |
| リモートで削除済みのブランチ | `git branch -D` で削除 |

## 動作仕様

- **出力**: stderr に提案メッセージ（ブロックなし）
- **判断**: 人間が決定（自動実行なし）

## 新規Hook作成時のポイント

1. `.claude/hooks/` にシェルスクリプトを配置
2. `settings.local.json` で発火タイミングを設定
3. 非ブロッキングで stderr に出力
4. 提案のみ、自動実行しない
