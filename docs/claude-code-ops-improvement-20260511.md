# Claude Code Ops Improvement - Native Apps - 2026-05-11

## 実施理由

`CLAUDE.md` が長大化し、Claude Code起動時に毎回読む常時コンテキストが肥大化していたため。Claude公式文献の「CLAUDE.mdは常時ロード、詳細手順はskillsへ」という整理に合わせ、native課の薄い運用層へ再編した。

## 前提

- このworkspaceは Claude Code 主運用。
- 運用ルールの正本は `CLAUDE.md`。
- `AGENTS.md` はCodex等の副次エージェント向けアダプタ。
- 全peer共有の hooks / skills / agents / commands は `/Users/kimny/Dropbox/_DevProjects/claude-code-template` が正本。
- 共有templateへの symlink は維持し、このpeerでは共有template本体を変更しない。

## 実施内容

- `CLAUDE.md` を起動時に必要な役割、禁止事項、保存先、定常コマンド、共有template方針、skill入口、plan mode要約、conductor/Policy Gate入口に圧縮。
- 長い手順、過去決定の詳細、App Store gotcha、Policy Gateテンプレート、Chromeロック詳細、plan運用詳細、memory棚卸し手順をpeer固有skillへ分離。
- `AGENTS.md` をClaude Code主運用を前提とした薄いCodex向けアダプタへ変更。
- この報告書を `CLAUDE.md` 末尾から `@docs/claude-code-ops-improvement-20260511.md` でimport。

## 追加/変更したpeer固有skills

- `.claude/skills/native-dev-context/SKILL.md`: アプリ構成、API、環境変数、実装gotcha。
- `.claude/skills/native-release-check/SKILL.md`: iOSローカルビルド、App Store Connect、スクショ、審査前確認。`disable-model-invocation: true`。
- `.claude/skills/native-policy-gate/SKILL.md`: conductor提案、Policy Gate、write課通知、Threads insight。`disable-model-invocation: true`。
- `.claude/skills/native-chrome-check/SKILL.md`: Chrome拡張ロック制。`disable-model-invocation: true`。
- `.claude/skills/native-plan-mode/SKILL.md`: native課のplan mode発動条件とopusplan委任。
- `.claude/skills/native-memory-maintenance/SKILL.md`: memory棚卸し。`disable-model-invocation: true`。

## 触らなかった共有template項目

- `/Users/kimny/Dropbox/_DevProjects/claude-code-template` 本体。
- symlinkされた `.claude/commands/ios.md`, `.claude/commands/learn.md`, `.claude/commands/ship.md`。
- symlinkされた `.claude/hooks/block-main-push.sh`。
- symlinkされた `.claude/skills/ios-app-store-submission`。

## 今後template側で検討すべき改善候補

- 全peer共通の「AGENTS.mdは薄いアダプタ、CLAUDE.mdが正本」テンプレート化。
- 共有template配布時に、既存symlinkをコピー化していないか検証するチェック。
- 共有skillのうち副作用を伴うものに `disable-model-invocation: true` を付ける基準の明文化。
- 旧形式 `.claude/skills/*.md` と公式 `SKILL.md` ディレクトリ形式の移行方針整理。
- 事後報告をCLAUDE.mdから恒久importする期間の標準ルール。長期的には履歴docsへ移して常時コンテキストから外す方が軽い。

## 参照したClaude公式文献

- https://code.claude.com/docs/en/features-overview
- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/settings
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/scheduled-tasks
