# MUED v2 Documentation Guide

**Last Updated**: 2025年11月6日
**Production Environment**: ✅ **Active** ([https://mued.jp](https://mued.jp))
**Current Phase**: Phase 2 - RAG観測とデータ管理層
**Project Health**: 85/100 🟢 (↑ from 78/100)

---

## 🎯 Master Documents (Current Strategy & Implementation)

### 📌 Unified Strategy Document ⭐️ MASTER
**[`business/MUED_Unified_Strategy_2025Q4.md`](./business/MUED_Unified_Strategy_2025Q4.md)**
- **Created**: 2025-10-29 (Latest revision)
- **Purpose**: Consolidates all strategic decisions from Sep-Oct 2025
- **Content**: Business pivot from LMS to Creative CMS, two-tier subscription model, 12-month roadmap
- **Status**: Official strategy document - all other documents should align with this

### 📊 最新進捗レポート 🆕
**[`_today/PROGRESS_REPORT_2025-11-06.md`](./_today/PROGRESS_REPORT_2025-11-06.md)**
- **作成日**: 2025-11-06
- **主な成果**: テスト通過率100%達成、CI/CD緑化、API標準化開始
- **プロジェクト健全性**: 78/100 → 85/100 (⬆️ +7)

### 🔧 開発ワークフロー 🆕
**[`guides/GIT_WORKTREE_WORKFLOW.md`](./guides/GIT_WORKTREE_WORKFLOW.md)**
- Git Worktreeによる並行開発手法
- 1日15-25分の時間節約
- 緊急修正とPRレビューの効率化

### 📊 Current Sprint Plan
**[`implementation/phase2-sprint-plan.md`](./implementation/phase2-sprint-plan.md)**
- **Sprint Period**: 2025-10-30 to 2025-11-12
- **Focus**: RAG metrics collection, provenance management, SLO monitoring
- **Success Criteria**: Citation Rate 70%+, P50 latency <1.5s

### 🔧 API Specifications & Status
**[`api/rag-metrics-api.yaml`](./api/rag-metrics-api.yaml)**
- OpenAPI 3.0 specification for RAG metrics endpoints
- Provenance tracking and performance monitoring APIs

**[`_today/API_STANDARDIZATION_STATUS_2025-11-06.md`](./_today/API_STANDARDIZATION_STATUS_2025-11-06.md)** 🆕
- API標準化の実態: 3/27エンドポイント完了 (11.1%)
- 優先度付き実装ロードマップ

---

## 📂 Documentation Structure

```
docs/
├── README.md                              # This navigation guide
├── CHANGELOG.md                           # Documentation change history
│
├── _today/                                # 🆕 Latest Work & Reports
│   ├── PROGRESS_REPORT_2025-11-06.md    # Latest progress report
│   ├── API_STANDARDIZATION_STATUS_2025-11-06.md  # API status audit
│   ├── DOCUMENTATION_CLEANUP_PLAN_2025-11-06.md  # Cleanup plan
│   ├── IMPROVEMENT_IMPLEMENTATION_PLAN.md
│   ├── IMPLEMENTATION_QUICK_REFERENCE.md
│   ├── IMPLEMENTATION_START_GUIDE.md
│   └── PROJECT_REVIEW_2025.md
│
├── guides/                                # 🆕 Development Guides
│   ├── GIT_WORKTREE_WORKFLOW.md         # Git Worktree best practices
│   └── ai-powered-development.md
│
├── business/                              # Business Strategy & Planning
│   ├── MUED_Unified_Strategy_2025Q4.md  # ⭐️ MASTER DOCUMENT
│   ├── MUED事業計画書_20251029追記.md      # Two-tier subscription model
│   ├── 株式会社グラスワークス MUEDプロジェクト 事業計画.md
│   └── archive/                          # Historical business documents
│
├── architecture/                          # System Architecture
│   ├── mvp-architecture.md              # Current MVP architecture
│   ├── business-logic-specification.md
│   ├── mcp-feasibility-analysis.md
│   ├── ci-cd-analysis-and-fixes.md      # 🆕 CI/CD optimization
│   └── archive/                          # Past architecture designs
│
├── database/                              # 🆕 Database Documentation
│   ├── MIGRATION_GUIDE.md
│   ├── EXECUTE_MIGRATION.md
│   ├── MIGRATION_EXECUTION_SUMMARY.md
│   ├── phase2-migration-guide.md
│   ├── phase2-schema-review-report.md
│   ├── PHASE2_IMPLEMENTATION_SUMMARY.md
│   └── QUICK_REFERENCE.md
│
├── deployment/                            # 🆕 Deployment & CI/CD
│   ├── deployment-checklist.md
│   ├── github-actions-setup.md
│   ├── github-actions-env-setup.md
│   ├── environment-variables.md
│   └── sentry-setup.md
│
├── reports/                               # 🆕 Quality & Audit Reports
│   ├── CODE_QUALITY_REPORT.md
│   ├── DOCUMENTATION_AUDIT_REPORT_2025-10-29.md
│   └── phase2-completion-report.md
│
├── implementation/                        # Implementation Plans & Progress
│   ├── phase2-sprint-plan.md            # ⭐️ CURRENT SPRINT
│   ├── mvp-implementation-plan.md
│   └── mvp-checklist.md
│
├── api/                                  # API Specifications
│   └── rag-metrics-api.yaml             # RAG metrics OpenAPI spec
│
├── proposals/                            # Active Proposals & Philosophy
│   ├── MUED_v2_architecture_philosophy_refocus.md
│   └── archive/                         # Implemented/rejected proposals
│
├── testing/                              # Test Strategies & Reports
│   ├── TEST_STRATEGY.md
│   └── e2e-test-setup.md
│
├── features/                             # Feature Specifications
│   └── note-materials-integration.md
│
├── research/                             # Research & Analysis
│   └── ai-mentor-matching-research.md
│
└── archive/                              # Historical Documents
    ├── 2025-10-29/
    ├── 2025-10-27/
    ├── 2025-10-19/
    └── 2025-10-18/
```

---

## 🚀 Quick Navigation by Task

### Current Development Tasks

| Task | Primary Document | Supporting Docs |
|------|-----------------|-----------------|
| **Understanding current strategy** | [`MUED_Unified_Strategy_2025Q4.md`](./business/MUED_Unified_Strategy_2025Q4.md) | Business plans |
| **Phase 2 implementation** | [`phase2-sprint-plan.md`](./implementation/phase2-sprint-plan.md) | RAG metrics API |
| **Architecture decisions** | [`architecture_philosophy_refocus.md`](./proposals/MUED_v2_architecture_philosophy_refocus.md) | MVP architecture |
| **Testing approach** | [`TEST_STRATEGY.md`](./testing/TEST_STRATEGY.md) | E2E setup guide |

### Project Management

| Purpose | Document | Update Frequency |
|---------|----------|------------------|
| **Strategic direction** | Unified Strategy | Quarterly |
| **Sprint tracking** | Sprint plans | Bi-weekly |
| **Progress monitoring** | current-progress.md | Weekly |
| **Change tracking** | CHANGELOG.md | As needed |

---

## 📝 Key Insights from Reorganization (2025-10-29)

### What Changed
1. **Consolidated Strategy**: Multiple October 27 reports merged into single Unified Strategy document
2. **Clear Hierarchy**: Master documents clearly marked, supporting docs categorized
3. **Archive Structure**: Historical documents preserved but moved out of active workspace
4. **Sprint-based Planning**: Moved from generic trackers to specific sprint plans

### Document Status Classification

#### 🟢 Active (Keep in main folders)
- Unified Strategy Document (Master)
- Current sprint plans
- API specifications
- Architecture philosophy documents
- Active implementation guides

#### 🟡 Reference (Keep but mark as historical context)
- Original business plans (for historical reference)
- Philosophy documents (valuable for understanding evolution)
- Research documents (background information)

#### 🔴 Archived (Move to archive folders)
- October 27 comprehensive reports (superseded by unified strategy)
- Old implementation trackers (replaced by sprint plans)
- Duplicate analysis documents
- Completed checklist documents

---

## 🔄 Document Lifecycle Management

### Update Schedule
- **Unified Strategy**: Updated quarterly (next: 2026 Q1)
- **Sprint Plans**: New document every 2-week sprint
- **API Specs**: Version bumped with changes
- **Progress Reports**: Weekly updates during active sprints

### Archival Policy
1. Documents superseded by newer versions → Archive with date prefix
2. Completed sprint plans → Archive after sprint completion
3. Analysis reports → Archive when findings are incorporated into strategy
4. Keep philosophy and research docs as reference material

### Naming Conventions
- Strategy documents: `{SCOPE}_Strategy_{YYYY}Q{Q}.md`
- Sprint plans: `phase{N}-sprint-plan.md`
- Analysis reports: `{TYPE}_ANALYSIS_{YYYY-MM-DD}.md`
- Archived files: `archive/{YYYY-MM-DD}/{original_filename}`

---

## 💡 How to Use This Documentation

### For New Team Members
1. Start with [`MUED_Unified_Strategy_2025Q4.md`](./business/MUED_Unified_Strategy_2025Q4.md)
2. Review current [`phase2-sprint-plan.md`](./implementation/phase2-sprint-plan.md)
3. Understand architecture via [`architecture_philosophy_refocus.md`](./proposals/MUED_v2_architecture_philosophy_refocus.md)

### For Daily Development
1. Check sprint plan for current tasks
2. Refer to API specs for integration
3. Update progress in appropriate tracking document

### For Strategic Decisions
1. Always align with Unified Strategy document
2. Propose changes via new proposal documents
3. Archive superseded documents properly

---

## 📞 Document Maintenance Contact

**Documentation Owner**: Development Team
**Review Cycle**: Bi-weekly with sprint planning
**Major Reviews**: Quarterly with strategy updates

---

*This README serves as the central navigation hub for MUED v2 documentation. For detailed content, refer to individual documents. For change history, see [CHANGELOG.md](./CHANGELOG.md).*