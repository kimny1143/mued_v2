# Documentation Archive Movement Plan
**Date**: 2025-10-29
**Purpose**: Reorganize docs folder based on Unified Strategy Document

---

## Executive Summary

Following the creation of the **MUED Unified Strategy 2025Q4** document on October 29, 2025, this plan outlines the reorganization of the documentation folder. The unified strategy consolidates multiple October 27 reports and establishes a clear documentation hierarchy.

**Key Principle**: The Unified Strategy document is now the MASTER reference. All other documents should either support it or be archived.

---

## Files to Archive

### 1. October 27 Comprehensive Reports (Superseded by Unified Strategy)

These files should be moved to `docs/archive/2025-10-27/`:

```bash
# These comprehensive reports have been consolidated into the Unified Strategy
git mv docs/FINAL_COMPREHENSIVE_REPORT_2025-10-27.md docs/archive/2025-10-27/
git mv docs/COMPREHENSIVE_PROJECT_ANALYSIS_2025-10-27.md docs/archive/2025-10-27/
git mv docs/DOCUMENTATION_AUDIT_REPORT_2025-10-27.md docs/archive/2025-10-27/
git mv docs/BUSINESS_ALIGNMENT_FINAL_REPORT_2025-10-27.md docs/archive/2025-10-27/
git mv docs/FINAL_QUALITY_REPORT_2025-10-27.md docs/archive/2025-10-27/
git mv docs/DOCUMENTATION_REORGANIZATION_2025-10-27.md docs/archive/2025-10-27/
git mv docs/IMPLEMENTATION_TRACKER.md docs/archive/2025-10-27/
```

**Reason**: All insights from these reports have been incorporated into the Unified Strategy document. They have historical value but are no longer the primary reference.

### 2. Superseded Implementation Documents

Move to `docs/implementation/archive/`:

```bash
# Old progress tracking (replaced by phase2-sprint-plan.md)
git mv docs/implementation/current-progress.md docs/implementation/archive/20251027_current-progress.md
git mv docs/implementation/mvp-checklist.md docs/implementation/archive/20251027_mvp-checklist.md
git mv docs/implementation/database-index-verification-report-2025-10-19.md docs/implementation/archive/
git mv docs/implementation/business-alignment-analysis-2025-10-19.md docs/implementation/archive/
```

**Reason**: Phase 2 sprint plan provides current implementation guidance. Old trackers are outdated.

### 3. Completed/Obsolete Documents

Move to appropriate archives:

```bash
# Completed checklists
git mv docs/POST_DEPLOYMENT_CHECKLIST.md docs/archive/2025-10-27/

# Old test reports
git mv docs/e2e-test-setup.md docs/testing/archive/20251018_e2e-test-setup.md

# Superseded analysis
git mv docs/analysis/CODEBASE_OPTIMIZATION_REPORT.md docs/archive/2025-10-27/
git mv docs/analysis/IMPLEMENTATION_SUMMARY_2025-10-27.md docs/archive/2025-10-27/
```

---

## Files to Keep (Active Documents)

### Business Documents (Keep in place)
- ✅ `business/MUED_Unified_Strategy_2025Q4.md` - **MASTER DOCUMENT**
- ✅ `business/MUED事業計画書_20251029追記.md` - Current two-tier subscription model
- ✅ `business/株式会社グラスワークス MUEDプロジェクト 事業計画.md` - Original business plan (historical reference)

### Architecture Documents (Keep current ones)
- ✅ `architecture/mvp-architecture.md` - Current architecture
- ✅ `architecture/business-logic-specification.md` - Current business logic
- ✅ `architecture/mcp-feasibility-analysis.md` - MCP analysis (reference)

### Implementation Documents (Keep active plans)
- ✅ `implementation/phase2-sprint-plan.md` - **CURRENT SPRINT**
- ✅ `implementation/mvp-implementation-plan.md` - Overall implementation plan
- ✅ `implementation/openai-function-calling-guide.md` - Technical guide

### Proposals (Keep as philosophy/reference)
- ✅ `proposals/MUED_v2_architecture_philosophy_refocus.md` - Architecture philosophy
- ✅ `proposals/MUED_Layered_Architecture_Proposal_Draft.md` - Layered architecture
- ✅ `proposals/NOTE_MATERIALS_INTEGRATION_PROPOSAL_V4_JA.md` - Latest proposal
- ✅ `proposals/MUED_SWOT_Analysis_2025.md` - SWOT analysis

### API Specifications
- ✅ `api/rag-metrics-api.yaml` - Current API spec

### Testing Documents
- ✅ `testing/TEST_STRATEGY.md` - Testing strategy
- ✅ `testing/README.md` - Testing overview

---

## Recommended Actions

### Step 1: Create Archive Structure
```bash
mkdir -p docs/business/archive
mkdir -p docs/proposals/archive
mkdir -p docs/architecture/archive
mkdir -p docs/implementation/archive
mkdir -p docs/testing/archive
mkdir -p docs/archive/2025-10-29
```

### Step 2: Execute File Movements
Run the git mv commands listed above to preserve git history.

### Step 3: Update Documentation
1. Replace current README.md with README_NEW.md
2. Ensure CHANGELOG.md is in place
3. Update any internal links in remaining documents

### Step 4: Git Commit
```bash
git add .
git commit -m "docs: Reorganize documentation structure around Unified Strategy 2025Q4

- Archived October 27 comprehensive reports (consolidated into unified strategy)
- Created clear hierarchy with master documents marked
- Added CHANGELOG.md for documentation history
- Updated README with new navigation structure
- Preserved all documents in organized archive folders"
```

---

## Summary Statistics

### Before Reorganization
- Total documents: 58 files
- Root level docs: 11 files
- Mixed dates and versions throughout

### After Reorganization
- Active documents: ~25 files
- Archived documents: ~33 files
- Clear hierarchy with master documents identified
- Consistent structure across all categories

### Key Improvements
1. **Single source of truth**: Unified Strategy as master document
2. **Clear timeline**: Sprint-based planning instead of generic trackers
3. **Reduced duplication**: Consolidated multiple reports into single strategy
4. **Better navigation**: Updated README with task-based navigation
5. **Historical preservation**: All documents archived, not deleted

---

## Validation Checklist

- [ ] All October 27 reports archived
- [ ] Unified Strategy document remains in business folder
- [ ] Phase 2 sprint plan is current implementation guide
- [ ] Archive folders created with .gitkeep files
- [ ] README_NEW.md ready to replace README.md
- [ ] CHANGELOG.md documents all changes
- [ ] No files deleted, only moved
- [ ] Git history preserved via git mv commands

---

*This plan ensures documentation clarity while preserving historical context. Execute with care to maintain git history.*