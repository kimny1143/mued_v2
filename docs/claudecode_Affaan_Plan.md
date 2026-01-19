# Claude Code ワークフロー比較分析

Affaan Mustafaの「Everything Claude Code」ガイド（X投稿: 90万view、1万ブックマーク）と、現在のMUED v2プロジェクトの設定を比較分析する。

**最終更新**: 2026-01-19

---

## 1. 現状の比較

### CLAUDE.md

| 項目 | Affaan推奨 | MUED現状 | 評価 |
|------|-----------|----------|------|
| 構造 | 簡潔・人間が読める | 技術スタック、ディレクトリ構造、注意事項を網羅 | ✅ 良好 |
| コマンド記載 | あり | あり（クイックスタート） | ✅ 良好 |
| スキル参照 | あり | あり（表形式） | ✅ 良好 |
| 長さ | 簡潔推奨 | 142行（適切） | ✅ 良好 |

### Agents (サブエージェント)

| Affaan推奨 | MUED現状 | 状態 |
|-----------|----------|------|
| planner | mued-architect-manager | ✅ |
| architect | mued-architect-manager | ✅ |
| code-reviewer | **code-reviewer** | ✅ 2026-01-19追加 |
| security-reviewer | **security-reviewer** | ✅ 2026-01-19追加 |
| e2e-runner | test-driven-architect | ✅ |
| refactor-cleaner | codebase-optimizer | ✅ |
| doc-updater | docs-curator | ✅ |

**MUED固有エージェント**: database-architect, script-consolidator

**評価**: ✅ Affaan推奨のエージェントは全てカバー済み

### Skills

| Affaan推奨 | MUED現状 | 状態 |
|-----------|----------|------|
| TDD workflow | ❌ なし（専用スキルとして） | 未対応 |
| coding-standards | coding-rules | ✅ |
| security-review | ❌ なし | 未対応（エージェントで代替） |
| backend-patterns | ❌ なし | 未対応 |
| frontend-patterns | ui-ux-pro-max | ✅ |

**MUED独自スキル（11個）**: database, mcp, hooks, git-worktree, coding-rules, ai-models, ui-ux-pro-max, ux-psychology, aio-seo, daw-osc, lp-optimizer

**評価**: ドメイン特化スキルは充実。汎用的なTDDスキルは未対応だが、test-driven-architectエージェントで代替可能

### Commands (スラッシュコマンド)

| Affaan推奨 | MUED現状 | 状態 |
|-----------|----------|------|
| /tdd | ❌ なし | 未対応 |
| /plan | ❌ なし | 未対応 |
| /e2e | ❌ なし | 未対応 |
| /code-review | ❌ なし | 未対応（code-reviewerエージェントで代替） |
| /build-fix | ❌ なし | 未対応 |
| /commit-push-pr | **/commit**, **/pr** | ✅ 2026-01-19追加 |
| - | **/security** | ✅ 2026-01-19追加（MUED独自） |

**評価**: 基本的なコマンド（/commit, /pr, /security）は追加済み。/tdd等は必要に応じて追加

### Hooks

| 項目 | Affaan推奨 | MUED現状 | 状態 |
|------|-----------|----------|------|
| PostToolUse | コード品質チェック | suggest-claude-md-update, suggest-poc-log-update | 一部対応 |
| Stop | クリーンアップ | suggest-git-cleanup | ✅ |
| PreToolUse | 検証 | ❌ なし | 未対応 |

**評価**: 基本的なフックはあるが、コード品質チェック系が不足

### MCP設定

| 項目 | Affaan推奨 | MUED現状 | 状態 |
|------|-----------|----------|------|
| .mcp.json (プロジェクト) | GitHub, Supabase, Vercel等 | ❌ なし | 未対応 |
| disabledMcpServers | コンテキスト節約 | ❌ 未設定 | 未対応 |
| MCP数制限 | 10個以下/プロジェクト推奨 | 不明（グローバル設定のみ） | 未対応 |

**評価**: ❌ プロジェクトレベルのMCP設定が未整備（Issue #21でリリース後対応予定）

---

## 2. ギャップ分析と進捗

### 高優先度の欠落

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 1 | カスタムスラッシュコマンド | ✅ 完了 | /commit, /pr, /security 追加 |
| 2 | code-reviewer エージェント | ✅ 完了 | 2026-01-19追加 |
| 3 | TDDスキル | 未対応 | test-driven-architectエージェントで代替可能 |
| 4 | プロジェクトレベルMCP設定 | 🔜 後回し | Issue #21（リリース後） |

### 中優先度の欠落

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 5 | security-reviewer エージェント | ✅ 完了 | 2026-01-19追加 |
| 6 | PreToolUseフック | 未対応 | 必要性を感じたら追加 |
| 7 | disabledMcpServers設定 | 🔜 後回し | Issue #21（リリース後） |

### 低優先度（あれば便利）

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 8 | Rules（常時適用ルール） | 未対応 | スキルで代替中 |
| 9 | backend-patternsスキル | 未対応 | 必要性を感じたら追加 |

---

## 3. 計画外で実施したこと（2026-01-19）

| 項目 | 内容 |
|------|------|
| E2Eテストモードバイパス修正 | 本番環境でのセキュリティ脆弱性修正 |
| npm脆弱性修正 | `npm audit fix` で3件修正 |
| Upstash Rate Limiting | AI APIに10 req/min制限実装 |
| エージェント境界の明確化 | codebase-optimizerにScope & Boundaries追加 |

---

## 4. 現在のエージェント構成

| エージェント | 責務 | トリガー |
|-------------|------|---------|
| **code-reviewer** | PR差分のバグ・ロジック確認 | PR作成時 |
| **codebase-optimizer** | コードベース全体の構造・重複 | 機能完成後、定期メンテ |
| **security-reviewer** | セキュリティ脆弱性 | リリース前、認証/決済実装後 |
| mued-architect-manager | アーキテクチャ設計 | 設計フェーズ |
| test-driven-architect | テスト戦略・E2E | テスト実装時 |
| docs-curator | ドキュメント整理 | ドキュメント作業時 |
| database-architect | DB設計・マイグレーション | DB作業時 |
| script-consolidator | スクリプト整理 | スクリプト管理時 |

---

## 5. 残タスク

### リリース後対応（Issue #21）
- [ ] 全APIルートの認証監査
- [ ] MCP設定最適化（disabledMcpServers）
- [ ] .mcp.json 作成

### 必要に応じて追加
- [ ] /tdd コマンド
- [ ] /build-fix コマンド
- [ ] PreToolUseフック
- [ ] backend-patternsスキル

---

## Sources

- [Affaan Mustafa GitHub: everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [Anthropic: Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [VentureBeat: Boris Cherny's Workflow](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are)
- [InfoQ: Inside Claude Code Creator's Workflow](https://www.infoq.com/news/2026/01/claude-code-creator-workflow/)
