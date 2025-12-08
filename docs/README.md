# MUED v2 Documentation

**Last Updated**: 2025-11-15
**Status**: Phase 0 - Foundation & Planning

---

## 🚀 Quick Start

### For Developers
1. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - 技術アーキテクチャ概要
2. [Implementation Plan](archive/MUED_IMPLEMENTATION_PLAN_2025.md) - 実装計画詳細
3. [Phase 1 Checklist](development/PHASE1_CHECKLIST.md) - 現在進行中のタスク

### For Project Stakeholders
1. [MUED企画書251114.md](archive/business-plans/MUED企画書251114.md) - **最重要** Phase 0-4の開発計画
2. [Unified Strategy](business/MUED_Unified_Strategy_2025Q4.md) - 統合戦略文書
3. [Roadmap](roadmap.md) - 12ヶ月ロードマップ

---

## 📚 Core Documentation

### Philosophy & Strategy
- [PHILOSOPHY.md](PHILOSOPHY.md) - Difference / Note / Form の3本柱思想
- [MUED企画書251114.md](archive/business-plans/MUED企画書251114.md) - Phase 0-4 開発計画
- [Unified Strategy](business/MUED_Unified_Strategy_2025Q4.md) - 2025Q4統合戦略
- [Roadmap](roadmap.md) - フェーズ別実装ロードマップ

### Architecture
- [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - システムアーキテクチャ全体像
- [Implementation Plan 2025](archive/MUED_IMPLEMENTATION_PLAN_2025.md) - 詳細実装計画（850行）
- [Mermaid Diagrams](architecture/MUED_ARCHITECTURE_MERMAID_DIAGRAMS.md) - アーキテクチャ図
- [Business Logic Specification](architecture/business-logic-specification.md) - ビジネスロジック仕様
- [Current Architecture (2025-01-11)](archive/CURRENT_ARCHITECTURE_2025-01-11.md) - 現在の実装状況

### Implementation
- [Phase 1 Checklist](development/PHASE1_CHECKLIST.md) - MUEDnote基盤実装タスク
- [Phase 2 Sprint Plan](archive/phase2-sprint-plan.md) - Ear Training MVP計画
- [Type Safety Migration](development/type-safety-migration-guide.md) - 型安全性向上ガイド

---

## 🛠️ Development Guides

### AI Material Generation
- [OpenAI ABC Technical Guide](development/openai-abc-technical-guide.md) - ABC記譜法生成の技術ガイド
- [Claude Material Generator Guide](development/claude-material-generator-guide.md) - Claude MCP Serverによる教材生成
- [OpenAI ABC Generation Guide](features/openai-abc-generation-guide.md) - UI統合ガイド

### Features
- [Plugin Management Guide](features/plugin-management-guide.md) - プラグインシステム実装
- [i18n Implementation Guide](features/i18n-implementation-guide.md) - 多言語対応

### Workflows
- [Git Worktree Workflow](guides/GIT_WORKTREE_WORKFLOW.md) - 並行開発ワークフロー
- [CI/CD Quick Implementation](guides/ci-cd-quick-implementation.md) - CI/CD セットアップ

### Testing
- [Testing Guide](testing/TESTING_GUIDE.md) - テスト戦略全体
- [Test Strategy](testing/TEST_STRATEGY.md) - ユニット/E2E/統合テスト
- [Testing README](testing/README.md) - テスト実行方法

### MCP Servers
- [MCP README](mcp/README.md) - Model Context Protocol サーバー一覧
- [MCP Browser Debug](mcp/mcp-browser-debug.md) - MCPサーバーデバッグ方法

---

## 🚢 Deployment

- [Deployment Checklist](deployment/deployment-checklist.md) - デプロイ前チェックリスト
- [Environment Variables](deployment/environment-variables.md) - 環境変数設定
- [GitHub Actions Setup](deployment/github-actions-setup.md) - CI/CD パイプライン

---

## 📊 Research & Analysis

- [MIDI-LLM Investigation](archive/midi-llm-investigation-report.md) - MIDI-LLM統合調査
- [OpenAI vs Claude Comparison](research/openai-vs-claude-comparison.md) - AIモデル比較分析
- [Research README](research/README.md) - 調査プロジェクト一覧

---

## 📝 Reports & Progress

- [Current Progress (2025-11-07)](archive/2025-11-07_current-progress.md) - 最新進捗レポート

---

## 📦 Archive

古いドキュメントは `/archive/2025-historical/` に移動されました。
履歴参照が必要な場合はそちらを確認してください。

---

## 🎯 Current Focus (Phase 0)

**Goal**: Difference / Note / Form 思想の実装基盤構築

**Key Tasks**:
1. ✅ PHILOSOPHY.md 作成完了
2. ✅ roadmap.md 作成完了
3. ✅ ドキュメント整理完了（148→41ファイル）
4. 🔄 architecture.md の更新（進行中）
5. ⏳ Phase 1 開発環境セットアップ

**Next Milestone**: Phase 1 - MUEDnote基盤実装（1-3ヶ月）

---

## 🎵 MUEDnote Architecture (Phase 1)

### ⚠️ IMPORTANT: Session/Interview Architecture is the Correct Approach

MUEDnote Phase 1 implements a **Session/Interview architecture**, NOT a simple log-entry system.

**Canonical Documentation**:
1. **Business Plan**: [MUEDnote企画v1.md](archive/MUEDnote企画v1.md) - Technical architecture specification
2. **Implementation Plan**: [SESSION_INTERVIEW_IMPLEMENTATION_PLAN.md](archive/MUEDNOTE_SESSION_INTERVIEW_IMPLEMENTATION_PLAN.md)
3. **Database Schema**: [session-interview-schema.md](database/session-interview-schema.md)
4. **Architecture Diagrams**: [SESSION_ARCHITECTURE_DIAGRAMS.md](archive/MUEDNOTE_SESSION_ARCHITECTURE_DIAGRAMS.md)

### Core Concept

```
User Short Note → Analyzer Module → Session Analysis →
Interviewer LLM → AI Questions (2-5) → User Answers → RAG Integration
```

**Key Components**:
- **Sessions**: Grouped composition/practice activities with metadata
- **Analyzer**: AI module that infers focus area and intent from user input
- **Interviewer**: LLM that generates contextual questions to deepen understanding
- **Interview Q&A**: Structured questions and answers stored for RAG
- **RAG Integration**: Past Q&A feeds future question generation and material creation

### Database Tables

- `sessions` - Session records (composition/practice/mix/etc)
- `session_analyses` - Analyzer output (focus area, intent hypothesis)
- `interview_questions` - AI-generated questions
- `interview_answers` - User responses
- `rag_embeddings` - Vector embeddings for RAG retrieval

### Migration from Phase 1.1

**Note**: If you find references to `log_entries` or simple "formatting + tagging" approach, these are **deprecated**. See `/docs/archive/phase1.1-deprecated/README.md` for details.

**Correct Approach**: Always refer to Session/Interview architecture documents listed above.

---

## 📞 Contact & Contributing

- **PR Review Guide**: [PR_REVIEW_GUIDE.md](PR_REVIEW_GUIDE.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

---

*このREADMEは整理作業により2025-11-15に大幅に更新されました。*
