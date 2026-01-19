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
| TDD workflow | **/tdd** | ✅ 2026-01-19追加 |
| coding-standards | coding-rules | ✅ |
| security-review | security-reviewerエージェント | ✅ エージェントで代替 |
| backend-patterns | **backend-patterns** | ✅ 2026-01-19追加 |
| frontend-patterns | ui-ux-pro-max | ✅ |

**MUED独自スキル（13個）**: tdd, backend-patterns, database, mcp, hooks, git-worktree, coding-rules, ai-models, ui-ux-pro-max, ux-psychology, aio-seo, daw-osc, lp-optimizer

**評価**: ✅ 全スキル対応完了

### Commands (スラッシュコマンド)

| Affaan推奨 | MUED現状 | 状態 |
|-----------|----------|------|
| /tdd | /tddスキル | ✅ スキルで代替 |
| /plan | 組み込みplan mode | ✅ Claude Code標準機能 |
| /e2e | MCP経由 | ✅ mued-e2e MCPで代替 |
| /code-review | code-reviewerエージェント | ✅ エージェントで代替 |
| /build-fix | **/build-fix** | ✅ 2026-01-19追加 |
| /commit-push-pr | **/commit**, **/pr** | ✅ 2026-01-19追加 |
| - | **/security** | ✅ 2026-01-19追加（MUED独自） |

**評価**: ✅ 全コマンド対応完了（一部はスキル/エージェント/MCPで代替）

### Hooks

| 項目 | Affaan推奨 | MUED現状 | 状態 |
|------|-----------|----------|------|
| PreToolUse | 検証 | validate-dangerous-ops | ✅ 2026-01-19追加 |
| PostToolUse | コード品質チェック | suggest-claude-md-update, suggest-poc-log-update | ✅ |
| Stop | クリーンアップ | suggest-git-cleanup | ✅ |

**評価**: ✅ 全フックタイプに対応完了

### MCP設定

| 項目 | Affaan推奨 | MUED現状 | 状態 |
|------|-----------|----------|------|
| .mcp.json (プロジェクト) | GitHub, Supabase, Vercel等 | ✅ 作成済み | ✅ 2026-01-19追加 |
| disabledMcpServers | コンテキスト節約 | ✅ 設定済み | ✅ 2026-01-19追加 |
| MCP数制限 | 10個以下/プロジェクト推奨 | 2個有効、3個無効 | ✅ 良好 |

**評価**: ✅ プロジェクトレベルのMCP設定完了

---

## 2. ギャップ分析と進捗

### 高優先度の欠落

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 1 | カスタムスラッシュコマンド | ✅ 完了 | /commit, /pr, /security 追加 |
| 2 | code-reviewer エージェント | ✅ 完了 | 2026-01-19追加 |
| 3 | TDDスキル | ✅ 完了 | /tdd スキル追加、test-driven-architect廃止 |
| 4 | プロジェクトレベルMCP設定 | ✅ 完了 | .mcp.json 作成、disabledMcpServers設定 |

### 中優先度の欠落

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 5 | security-reviewer エージェント | ✅ 完了 | 2026-01-19追加 |
| 6 | PreToolUseフック | ✅ 完了 | validate-dangerous-ops.sh |
| 7 | disabledMcpServers設定 | ✅ 完了 | .mcp.jsonに設定済み |

### 低優先度（あれば便利）

| # | 項目 | 状態 | 備考 |
|---|------|------|------|
| 8 | Rules（常時適用ルール） | 未対応 | スキルで代替中 |
| 9 | backend-patternsスキル | ✅ 完了 | 2026-01-19追加 |

---

## 3. 計画外で実施したこと（2026-01-19）

| 項目 | 内容 |
|------|------|
| E2Eテストモードバイパス修正 | 本番環境でのセキュリティ脆弱性修正 |
| npm脆弱性修正 | `npm audit fix` で3件修正 |
| Upstash Rate Limiting | AI APIに10 req/min制限実装 |
| エージェント境界の明確化 | codebase-optimizerにScope & Boundaries追加 |
| API認証監査 | 51ルート監査、2件修正（/muednote/chat無効化、/lessons/[id]メール非公開化） |
| .mcp.json作成 | プロジェクトレベルMCP設定、disabledMcpServers設定 |

---

## 4. 現在のエージェント構成

| エージェント | 責務 | トリガー |
|-------------|------|---------|
| **code-reviewer** | PR差分のバグ・ロジック確認 | PR作成時 |
| **codebase-optimizer** | コードベース全体の構造・重複 | 機能完成後、定期メンテ |
| **security-reviewer** | セキュリティ脆弱性 | リリース前、認証/決済実装後 |
| mued-architect-manager | アーキテクチャ設計 | 設計フェーズ |
| docs-curator | ドキュメント整理 | ドキュメント作業時 |
| database-architect | DB設計・マイグレーション | DB作業時 |
| script-consolidator | スクリプト整理 | スクリプト管理時 |

※ test-driven-architect は `/tdd` スキルに統合して廃止

---

## 5. 残タスク

### Issue #21 完了 ✅
- [x] 全APIルートの認証監査（51ルート監査、2件修正）
- [x] MCP設定最適化（disabledMcpServers）
- [x] .mcp.json 作成

### 必要に応じて追加
- [x] /build-fix コマンド ✅ 2026-01-19追加
- [x] PreToolUseフック ✅ 2026-01-19追加（validate-dangerous-ops.sh）
- [x] backend-patternsスキル ✅ 2026-01-19追加

---

## Sources

- [Affaan Mustafa GitHub: everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [Anthropic: Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [VentureBeat: Boris Cherny's Workflow](https://venturebeat.com/technology/the-creator-of-claude-code-just-revealed-his-workflow-and-developers-are)
- [InfoQ: Inside Claude Code Creator's Workflow](https://www.infoq.com/news/2026/01/claude-code-creator-workflow/)
