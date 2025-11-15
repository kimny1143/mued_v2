# Documentation Directory Structure - After Reorganization

**Target Date**: 2025-12-15 (Phase 0 Completion)
**Purpose**: Visual guide for the reorganized documentation structure aligned with MUED企画書

## 📁 New Directory Structure

```
docs/
├── 📄 README.md                        # Navigation hub with Phase 0-4 progress
├── 📄 PHILOSOPHY.md                    # ⭐ Core: Difference/Note/Form definition
├── 📄 roadmap.md                       # ⭐ Phase 0-4 implementation timeline
├── 📄 domain-models.md                 # ⭐ LogEntry, EarExercise, FormExercise definitions
├── 📄 CHANGELOG.md                     # Documentation change history
│
├── 📂 business/                        # Business Strategy & Planning
│   ├── 📄 MUED_MASTER_PLAN_2025.md    # ⭐ Consolidated strategy (merged from 3 docs)
│   ├── 📄 MUED企画書251114.md          # Original planning document
│   └── 📂 archive/                     # Historical business documents
│       ├── MUED_Unified_Strategy_2025Q4.md
│       └── MUED事業計画書_20251029追記.md
│
├── 📂 architecture/                    # System Architecture
│   ├── 📄 README.md                    # Architecture overview & navigation
│   ├── 📄 current-state.md             # Current implementation state
│   ├── 📄 business-logic-specification.md  # ✏️ Updated with new domain models
│   ├── 📄 module-boundaries.md         # ⭐ Module separation definitions
│   └── 📄 mcp-feasibility-analysis.md  # MCP integration analysis
│
├── 📂 phases/                          # ⭐ NEW: Phase-specific documentation
│   ├── 📄 phase0-philosophy.md         # Philosophy integration progress
│   ├── 📄 phase1-muednote.md          # MUEDnote implementation spec
│   ├── 📄 phase2-ear-training.md      # Ear Training MVP spec
│   ├── 📄 phase3-form-training.md     # Structure Training MVP spec
│   └── 📄 phase4-echovna.md           # Echovna integration plan
│
├── 📂 modules/                         # ⭐ NEW: Module specifications
│   ├── 📂 core/
│   │   ├── 📄 lesson.md               # Lesson module spec
│   │   ├── 📄 material.md             # Material module spec
│   │   └── 📄 log.md                  # ⭐ MUEDnote/LogEntry spec
│   ├── 📂 ear-training/                # ⭐ Difference system
│   │   ├── 📄 README.md               # Ear training overview
│   │   ├── 📄 api-spec.md             # API specifications
│   │   └── 📄 exercise-types.md       # EQ, balance, rhythm, pitch
│   └── 📂 structure-training/          # ⭐ Form system
│       ├── 📄 README.md               # Structure training overview
│       ├── 📄 api-spec.md             # API specifications
│       └── 📄 analysis-engine.md      # AI analysis specifications
│
├── 📂 database/                        # Database Documentation
│   ├── 📄 README.md                    # ⭐ Database overview & index
│   ├── 📄 phase1-migration-plan.md     # ⭐ LogEntry table design
│   ├── 📄 MIGRATION_GUIDE.md           # General migration guide
│   ├── 📄 EXECUTE_MIGRATION.md         # Migration execution steps
│   └── 📄 QUICK_REFERENCE.md           # Quick reference
│
├── 📂 testing/                         # Test Strategies & Reports
│   ├── 📄 TEST_STRATEGY.md            # ✏️ Updated with new models
│   ├── 📄 phase1-test-plan.md         # ⭐ MUEDnote test plan
│   ├── 📄 TESTING_GUIDE.md            # Testing implementation guide
│   └── 📄 TEST_INFRASTRUCTURE_SUMMARY.md
│
├── 📂 deployment/                      # Deployment & Operations
│   ├── 📄 deployment-checklist.md
│   ├── 📄 github-actions-setup.md
│   ├── 📄 environment-variables.md
│   └── 📄 sentry-setup.md
│
├── 📂 guides/                          # Development Guides
│   ├── 📄 GIT_WORKTREE_WORKFLOW.md    # Git workflow optimization
│   ├── 📄 quick-start-phase1.md       # ⭐ Phase 1 quick start guide
│   └── 📄 ai-powered-development.md
│
├── 📂 api/                            # API Specifications
│   ├── 📄 rag-metrics-api.yaml       # RAG metrics OpenAPI spec
│   ├── 📄 muednote-api.yaml          # ⭐ MUEDnote API spec
│   └── 📄 ear-training-api.yaml      # ⭐ Ear training API spec
│
├── 📂 features/                       # Feature Specifications
│   ├── 📄 muednote-features.md       # ⭐ MUEDnote feature details
│   ├── 📄 ear-training-features.md   # ⭐ Ear training features
│   └── 📄 i18n-implementation-guide.md
│
├── 📂 reports/                        # Analysis & Audit Reports
│   ├── 📄 DOCUMENTATION_AUDIT_2025-11-15.md  # Latest audit
│   ├── 📄 phase0-completion-report.md        # ⭐ Phase 0 completion (future)
│   └── 📄 CODE_QUALITY_REPORT.md
│
└── 📂 archive/                        # Historical Documents
    ├── 📂 2025-11-15/                 # ⭐ Today's archive
    │   ├── 📂 _today/                 # Old working directory
    │   ├── 📂 logs/                   # Old log files
    │   ├── 📂 prompts/                # Old prompt templates
    │   └── 📂 reports/                # Old reports
    ├── 📂 2025-11-06/                 # Previous archives
    ├── 📂 2025-10-29/
    └── 📂 2025-10-27/
```

## 📊 Change Summary

### 🆕 New Directories (5)
1. `/docs/phases/` - Phase-specific documentation
2. `/docs/modules/` - Module specifications
3. `/docs/modules/core/` - Core module specs
4. `/docs/modules/ear-training/` - Difference system specs
5. `/docs/modules/structure-training/` - Form system specs

### 🆕 New Files (20+)
- Core philosophy documents (3)
- Phase documentation (5)
- Module specifications (9)
- API specifications (2)
- Feature specifications (2)
- Migration plans (1)

### 📦 Archived (42+ files)
- Old reports and analyses
- Outdated implementation plans
- Log files and prompts
- Superseded strategies

### 🗑️ Removed (5+ files)
- Redundant log files
- Obsolete prompt templates
- Outdated research reports

## 📈 Metrics Comparison

### Before Reorganization
- **Total Files**: 95+
- **Active/Current**: ~30%
- **Outdated**: ~45%
- **Redundant**: ~25%
- **Philosophy Alignment**: 0%

### After Reorganization
- **Total Files**: 65 (estimated)
- **Active/Current**: 85%
- **Reference**: 10%
- **Archived**: 5%
- **Philosophy Alignment**: 100%

## 🎯 Key Improvements

### 1. Clear Philosophy Integration
- PHILOSOPHY.md at root level
- All documentation aligned with Difference/Note/Form
- Phase-based organization matching 企画書

### 2. Module-Based Structure
- Clear separation of concerns
- Each module has dedicated specs
- API documentation per module

### 3. Phase-Driven Organization
- Documentation follows Phase 0-4 timeline
- Clear progression path
- Milestone tracking integrated

### 4. Reduced Redundancy
- Single source of truth for each topic
- Clear archival policy
- Version-controlled history

## 🚀 Migration Timeline

### Week 1 (11/15-11/22)
- ✅ Create PHILOSOPHY.md
- ✅ Create roadmap.md
- ⬜ Update architecture docs
- ⬜ Update README.md

### Week 2 (11/23-11/29)
- ⬜ Create module specifications
- ⬜ Archive old documents
- ⬜ Create domain-models.md

### Week 3-4 (11/30-12/15)
- ⬜ Create phase documentation
- ⬜ Update testing strategy
- ⬜ Complete reorganization
- ⬜ Team training on new structure

## 📝 Notes

1. **Backward Compatibility**: Old links will be redirected via README.md
2. **Search Optimization**: Key terms added to file headers for better discoverability
3. **Version Control**: All changes tracked in CHANGELOG.md
4. **Access Control**: Archive folder has restricted edit permissions

---

*This structure will be implemented progressively during Phase 0 (November-December 2025)*