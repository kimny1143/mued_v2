# MUEDnote Documentation Structure

**Last Updated**: 2025-12-02
**Status**: Reorganized

---

## Overview

This document provides a guide to the MUEDnote documentation structure after the 2025-12-02 reorganization.

---

## Current Valid Documents

### Master Plan
| File | Purpose | Status |
|------|---------|--------|
| `muednote_master_plan_v6.1.md` | **Current master plan** - Unified strategy document | Active |

### MVP Specification
| File | Purpose | Status |
|------|---------|--------|
| `muednote_spotlight_mvp_spec_v1.0.md` | Spotlight Input MVP technical specification | Active |
| `muednote_spotlight_mvp_implementation_plan.md` | MVP implementation roadmap and tasks | Active |
| `muednote_spotlight_mvp_verification_report.md` | Technical feasibility verification | Active |

---

## Archived Documents

All historical documents have been moved to `archive/` directory.

### Archive Contents

| File | Original Version | Archive Reason |
|------|-----------------|----------------|
| `muednote_business_plan_v3.0.md` | v3.0 | Initial pivot strategy. Superseded by v6.1. |
| `muednote_business_plan_v3.1.md` | v3.1 | Final Edition of v3.x series. Superseded by v6.1. |
| `muednote_business_plan_v3.2_algorithm.md` | v3.2 | HLA algorithm details. Integrated into v6.1. |
| `muednote_strategy_v5.0_drainpipe.md` | v5.0 | DRAINPIPE UX philosophy. Integrated into v6.1. |
| `gpt5_muednote_master_plan_v6.md` | v6.0 (GPT5) | GPT5 variant. Superseded by v6.1. |
| `gemini_muednote_master_plan_v6.md` | v6.0 (Gemini) | Gemini variant. Superseded by v6.1. |

---

## Naming Convention

### Standard Format
```
muednote_{feature}_{type}_v{version}.md
```

### Examples
- `muednote_master_plan_v6.1.md` - Master plan version 6.1
- `muednote_spotlight_mvp_spec_v1.0.md` - Spotlight MVP specification version 1.0
- `muednote_spotlight_mvp_implementation_plan.md` - Implementation plan (no version, living document)
- `muednote_spotlight_mvp_verification_report.md` - Verification report (dated internally)

### Prohibited Patterns
- Square brackets in file names: `[GPT5]file.md` (causes issues with file systems and URLs)
- Spaces in file names: `MUEDnote 事業計画書.md` (use underscores instead)
- Japanese characters in file names: Use English for filenames, Japanese for content

---

## Files Pending Deletion

The following old files should be deleted after confirming the archive copies:

```
docs/business/MUEDnote/
├── [GPT5]muednote_additional_plan_v_6_1.md    # Renamed to muednote_spotlight_mvp_spec_v1.0.md
├── [GPT5]muednote_master_plan_v_6.md          # Archived as gpt5_muednote_master_plan_v6.md
├── [gemini]muednote_master_plan_v_6.md        # Archived as gemini_muednote_master_plan_v6.md
├── MUEDnote_Strategy_v5.0.md                  # Archived as muednote_strategy_v5.0_drainpipe.md
├── MUEDnote事業計画書v3.md                    # Archived as muednote_business_plan_v3.0.md
├── MUEDnote事業計画書v3-1.md                  # Archived as muednote_business_plan_v3.1.md
└── MUEDnote 事業計画書 (v3.2 - アルゴリズム詳細).md  # Archived as muednote_business_plan_v3.2_algorithm.md
```

**To delete these files, run:**
```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs/business/MUEDnote

# Delete files with square brackets
rm "[GPT5]muednote_additional_plan_v_6_1.md"
rm "[GPT5]muednote_master_plan_v_6.md"
rm "[gemini]muednote_master_plan_v_6.md"

# Delete old naming convention files
rm "MUEDnote_Strategy_v5.0.md"
rm "MUEDnote事業計画書v3.md"
rm "MUEDnote事業計画書v3-1.md"
rm "MUEDnote 事業計画書 (v3.2 - アルゴリズム詳細).md"
```

---

## Document Evolution

```
v3.0 (Pivot Strategy)
    |
v3.1 (Final Edition) --- Added HLA concept
    |
v3.2 (Algorithm Details) --- Technical specifications
    |
v5.0 (DRAINPIPE UX) --- Text-First philosophy confirmed
    |
v6.0 (GPT5/Gemini variants) --- Integration attempts
    |
v6.1 (Unified Master) --- Current authoritative document
    |
MVP Spec v1.0 --- Spotlight Input implementation spec
```

---

## Related Documentation (Outside This Directory)

| Path | Purpose |
|------|---------|
| `docs/architecture/muednote-spotlight-mvp-feasibility-report.md` | Architect's feasibility analysis |
| `docs/testing/muednote-spotlight-test-strategy.md` | Test strategy for MVP |
| `apps/muednote-v3/` | Tauri desktop application source code |

---

*Document reorganization completed: 2025-12-02*
