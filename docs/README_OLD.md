# MUED v2 Documentation

**Last Updated**: 2025年11月15日
**Current Phase**: Phase 1 Implementation (MUEDnote基盤)
**Project Status**: MVP Development - Core Features Complete

---

## 🎯 Essential Documentation

### 📌 Master Strategy Document
**[`business/MUED企画書251114.md`](./business/MUED企画書251114.md)** ⭐️ **LATEST**
- **Created**: 2025-11-14
- **Purpose**: Phase 0-4 development plan with MUED philosophy integration
- **Key Focus**: Difference/Note/Form implementation strategy

**[`business/MUED_Unified_Strategy_2025Q4.md`](./business/MUED_Unified_Strategy_2025Q4.md)**
- Consolidated business strategy from Sep-Oct 2025
- Two-tier subscription model
- Creative CMS positioning

### 🏗️ Architecture & Implementation
**[`architecture/SYSTEM_ARCHITECTURE.md`](./architecture/SYSTEM_ARCHITECTURE.md)**
- Current system architecture
- Technology stack overview
- Component relationships

**[`architecture/MUED_IMPLEMENTATION_PLAN_2025.md`](./architecture/MUED_IMPLEMENTATION_PLAN_2025.md)**
- Detailed implementation roadmap
- Phase breakdown and timelines
- Technical specifications

**[`implementation/PHASE1_CHECKLIST.md`](./implementation/PHASE1_CHECKLIST.md)** 🚀
- Current phase implementation tasks
- MUEDnote (Note) feature development
- Database schema and API design

### 🔧 Development Guides

**[`development/openai-abc-technical-guide.md`](./development/openai-abc-technical-guide.md)**
- ABC notation generation with OpenAI
- Music material creation workflow
- Integration with MUED platform

**[`development/claude-material-generator-guide.md`](./development/claude-material-generator-guide.md)**
- Claude MCP server for material generation
- Development/admin mode features
- Chain-of-Musical-Thought (CoMT) implementation

**[`guides/GIT_WORKTREE_WORKFLOW.md`](./guides/GIT_WORKTREE_WORKFLOW.md)**
- Parallel development with Git worktrees
- Efficiency tips for branch management
- 15-25 minutes/day time savings

### 🧪 Testing & Quality
**[`testing/TESTING_GUIDE.md`](./testing/TESTING_GUIDE.md)**
- Comprehensive testing strategies
- Unit, integration, and E2E test setup
- MCP test servers documentation

**[`testing/TEST_STRATEGY.md`](./testing/TEST_STRATEGY.md)**
- Overall testing philosophy
- Coverage targets and metrics
- CI/CD integration

### 📊 Current Progress
**[`reports/2025-11-07_current-progress.md`](./reports/2025-11-07_current-progress.md)**
- Latest progress report
- Phase completion status
- Next action items

---

## 📂 Directory Structure

```
docs/
├── README.md                    # This navigation guide
├── CHANGELOG.md                 # Documentation changes
├── PHILOSOPHY.md               # Project philosophy
├── roadmap.md                  # Development roadmap
│
├── business/                   # Business Strategy & Planning
│   ├── MUED企画書251114.md     # ⭐ Latest development plan
│   ├── MUED_Unified_Strategy_2025Q4.md
│   └── [business plans]
│
├── architecture/               # System Architecture
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── MUED_IMPLEMENTATION_PLAN_2025.md
│   ├── CURRENT_ARCHITECTURE_2025-01-11.md
│   └── [architecture docs]
│
├── development/                # Development Guides
│   ├── openai-abc-technical-guide.md
│   ├── claude-material-generator-guide.md
│   └── [development guides]
│
├── implementation/             # Implementation Plans
│   ├── PHASE1_CHECKLIST.md   # 🚀 Current phase
│   ├── phase2-sprint-plan.md
│   └── type-safety-migration-guide.md
│
├── features/                   # Feature Documentation
│   ├── openai-abc-generation-guide.md
│   ├── i18n-implementation-guide.md
│   └── plugin-management-guide.md
│
├── testing/                    # Testing Documentation
│   ├── TESTING_GUIDE.md
│   ├── TEST_STRATEGY.md
│   └── README.md
│
├── deployment/                 # Deployment & CI/CD
│   ├── deployment-checklist.md
│   ├── environment-variables.md
│   └── github-actions-setup.md
│
├── guides/                     # Development Workflows
│   ├── GIT_WORKTREE_WORKFLOW.md
│   └── ci-cd-quick-implementation.md
│
├── mcp/                       # MCP Server Documentation
│   ├── README.md
│   └── mcp-browser-debug.md
│
├── prompts/                   # AI Prompts
│   ├── claude-desktop-music-prompt.md
│   └── chatgpt-music-prompt.md
│
├── research/                  # Active Research
│   ├── openai-vs-claude-comparison.md
│   ├── midi-llm-investigation-report.md
│   └── README.md
│
├── reports/                   # Progress Reports
│   └── 2025-11-07_current-progress.md
│
└── archive/                   # Historical Documentation
    └── 2025-historical/       # Consolidated archive
```

---

## 🚀 Quick Start for Developers

### For New Contributors
1. Read [`PHILOSOPHY.md`](./PHILOSOPHY.md) - Understand MUED's vision
2. Review [`architecture/SYSTEM_ARCHITECTURE.md`](./architecture/SYSTEM_ARCHITECTURE.md)
3. Check [`implementation/PHASE1_CHECKLIST.md`](./implementation/PHASE1_CHECKLIST.md) for current tasks

### For Setting Up Development
1. [`deployment/environment-variables.md`](./deployment/environment-variables.md) - Configure environment
2. [`guides/GIT_WORKTREE_WORKFLOW.md`](./guides/GIT_WORKTREE_WORKFLOW.md) - Set up efficient workflow
3. [`testing/TESTING_GUIDE.md`](./testing/TESTING_GUIDE.md) - Run tests

### For Understanding Features
1. [`features/openai-abc-generation-guide.md`](./features/openai-abc-generation-guide.md) - Music generation
2. [`mcp/README.md`](./mcp/README.md) - MCP server integration
3. [`development/claude-material-generator-guide.md`](./development/claude-material-generator-guide.md) - AI material generation

---

## 📝 Documentation Standards

### File Naming
- Use descriptive names with hyphens: `feature-name-guide.md`
- Include dates for reports: `2025-11-15_progress-report.md`
- Prefix with phase for implementation docs: `PHASE1_CHECKLIST.md`

### Document Structure
1. **Title & Metadata** - Date, author, status
2. **Executive Summary** - Key points upfront
3. **Detailed Content** - Organized with clear headings
4. **Next Steps** - Action items and timeline
5. **References** - Related documents and resources

### Maintenance
- Review quarterly for accuracy
- Archive outdated documents to `archive/2025-historical/`
- Keep active documentation under 50 files total
- Consolidate related documents when possible

---

## 🔄 Recent Changes

### 2025-11-15 Cleanup
- ✅ Consolidated 148 files → ~50 active documents
- ✅ Created unified archive structure
- ✅ Removed redundant and outdated files
- ✅ Simplified directory hierarchy
- ✅ Updated navigation and cross-references

### Key Improvements
- **Clarity**: Clear separation between current and historical docs
- **Focus**: Essential documentation easily discoverable
- **Maintenance**: Sustainable structure for ongoing development
- **Navigation**: Logical organization by purpose

---

## 📞 Documentation Support

For questions or contributions:
- Create an issue with `[DOCS]` prefix
- Follow the documentation standards above
- Keep documents concise and actionable
- Update this README when adding new sections

---

*Documentation maintained by the MUED Development Team*
*Cleanup performed: 2025-11-15*