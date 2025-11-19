# Documentation Cleanup Actions - 2025-11-19

**Status**: Ready to Execute
**Priority**: Medium
**Expected Duration**: 10 minutes

---

## Actions Required

### 1. Move Deprecated File to Archive

**File**: `/docs/implementation/PHASE1.1_IMPLEMENTATION_PLAN.md`

**Issue**: This file describes the deprecated log_entries approach which conflicts with the Session/Interview architecture.

**Action**:
```bash
# Navigate to project root
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2

# Remove from main implementation directory (already exists in archive)
rm docs/implementation/PHASE1.1_IMPLEMENTATION_PLAN.md

# Confirm archive version exists
ls docs/archive/phase1.1-deprecated/PHASE1.1_IMPLEMENTATION_PLAN.md
```

**Verification**:
- ✅ File removed from `/docs/implementation/`
- ✅ File exists in `/docs/archive/phase1.1-deprecated/`
- ✅ Archive README.md properly explains deprecation

---

### 2. Track Untracked Business Plan File

**File**: `docs/business/MUED企画書251114.md`

**Issue**: Git shows this as untracked (non-ASCII filename in quotes).

**Action**:
```bash
# Add to git
git add "docs/business/MUED企画書251114.md"

# Commit
git commit -m "docs: add MUED overall development plan (Phases 0-4)"
```

**Verification**:
- ✅ File tracked in git
- ✅ No longer shows as untracked in `git status`

---

### 3. Add Cross-Reference Notes to Business Plans

**Purpose**: Clarify the role of each MUEDnote business plan document.

**Files to Update**:

#### 3.1. `/docs/business/MUEDnote企画v1.md`

**Add at top** (after front matter):

```markdown
---

**📌 Document Role**: Core Technical Architecture Specification (CANONICAL)

**Related Documents**:
- [MUEDnote企画251119.md](./MUEDnote企画251119.md) - Latest UI/UX philosophy (chat-first)
- [MUEDnote_Specification_v2.md](./MUEDnote_Specification_v2.md) - Integrated specification

**Use This For**: Session/Interview architecture, database schema, AI module design

---
```

#### 3.2. `/docs/business/MUEDnote企画251119.md`

**Add at top**:

```markdown
---

**📌 Document Role**: Latest UI/UX Philosophy Update (Chat-First Approach)

**Related Documents**:
- [MUEDnote企画v1.md](./MUEDnote企画v1.md) - Core technical architecture (CANONICAL)
- [MUEDnote_Specification_v2.md](./MUEDnote_Specification_v2.md) - Integrated specification

**Use This For**: UI design decisions, chat interaction patterns, UX guidelines

---
```

#### 3.3. `/docs/business/MUEDnote_Specification_v2.md`

**Add at top**:

```markdown
---

**📌 Document Role**: Integrated Specification (Architecture + UX Combined)

**Related Documents**:
- [MUEDnote企画v1.md](./MUEDnote企画v1.md) - Core technical architecture (CANONICAL)
- [MUEDnote企画251119.md](./MUEDnote企画251119.md) - Latest UI/UX philosophy

**Use This For**: Comprehensive overview combining technical and UX aspects

---
```

---

## Verification Checklist

After completing actions:

- [ ] `docs/implementation/PHASE1.1_IMPLEMENTATION_PLAN.md` removed
- [ ] `docs/archive/phase1.1-deprecated/PHASE1.1_IMPLEMENTATION_PLAN.md` exists
- [ ] `MUED企画書251114.md` tracked in git
- [ ] Cross-reference notes added to 3 MUEDnote business plans
- [ ] `git status` shows clean working directory (except intentional changes)
- [ ] All canonical documents still accessible

---

## Post-Cleanup State

### Expected File Structure

```
docs/
├── business/
│   ├── MUED企画書251114.md ✅ (now tracked)
│   ├── MUEDnote企画v1.md ⭐ (with cross-reference note)
│   ├── MUEDnote企画251119.md (with cross-reference note)
│   └── MUEDnote_Specification_v2.md (with cross-reference note)
│
├── implementation/
│   ├── MUEDNOTE_SESSION_INTERVIEW_IMPLEMENTATION_PLAN.md ⭐
│   ├── MUEDNOTE_SESSION_ARCHITECTURE_DIAGRAMS.md
│   ├── MUEDNOTE_MIGRATION_GUIDE.md
│   ├── README_SESSION_INTERVIEW.md
│   └── (PHASE1.1_IMPLEMENTATION_PLAN.md removed) ✅
│
└── archive/
    └── phase1.1-deprecated/
        ├── README.md ✅
        └── PHASE1.1_IMPLEMENTATION_PLAN.md ✅
```

---

## Git Commands Summary

```bash
# 1. Remove deprecated file from main directory
rm docs/implementation/PHASE1.1_IMPLEMENTATION_PLAN.md

# 2. Track business plan
git add "docs/business/MUED企画書251114.md"

# 3. Stage cross-reference updates
git add docs/business/MUEDnote企画v1.md
git add docs/business/MUEDnote企画251119.md
git add docs/business/MUEDnote_Specification_v2.md

# 4. Commit changes
git commit -m "docs: cleanup - move deprecated PHASE1.1 plan, track business plan, add cross-references

- Remove docs/implementation/PHASE1.1_IMPLEMENTATION_PLAN.md (already in archive)
- Track MUED企画書251114.md in git
- Add cross-reference notes to MUEDnote business plans for clarity
- See CLEANUP_ACTIONS_2025-11-19.md for details
"

# 5. Verify
git status
```

---

## Optional: Update Main README

**File**: `/docs/README.md`

**Section to Update**: MUEDnote Architecture

**Current**:
```markdown
### Core Concept

(existing content)
```

**Add After**:
```markdown
### Business Plan Versions

MUEDnote has evolved through several planning iterations. Here's what each document covers:

1. **[MUEDnote企画v1.md](business/MUEDnote企画v1.md)** - CANONICAL Technical Architecture
   - Session/Interview system design
   - Database schema specification
   - AI module architecture (Analyzer, Interviewer, RAG)

2. **[MUEDnote企画251119.md](business/MUEDnote企画251119.md)** - Latest UI/UX Philosophy
   - Chat-first interaction design
   - User experience guidelines
   - Interface patterns

3. **[MUEDnote_Specification_v2.md](business/MUEDnote_Specification_v2.md)** - Integrated Spec
   - Combines architecture + UX
   - Comprehensive overview
   - Reference for new developers
```

---

## Completion Criteria

✅ All actions completed successfully when:

1. Deprecated file removed from main implementation directory
2. Business plan file tracked in git
3. Cross-references added to business plans
4. Git status clean (except tracked business plan)
5. Documentation audit report generated
6. All canonical documents clearly marked

---

**Created**: 2025-11-19
**Estimated Time**: 10 minutes
**Impact**: Low risk, high clarity improvement
