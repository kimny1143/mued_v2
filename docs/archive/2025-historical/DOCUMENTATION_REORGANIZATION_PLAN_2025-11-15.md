# Documentation Reorganization Action Plan

**Created**: 2025-11-15
**Target Completion**: 2025-12-15 (Phase 0完了)
**Priority**: 🔴 **Critical** - Development direction depends on this

## Executive Summary

MUED企画書（Difference/Note/Form）に基づき、現在の「創造支援CMS」から「音楽制作特化プラットフォーム」へドキュメント体系を再編成します。Phase 0期間中（1ヶ月）に完了させる具体的なアクションプランです。

## 1. Immediate Actions (Week 1: 11/15-11/22)

### ✅ Day 1 (11/15) - Completed
- [x] 監査レポート作成
- [x] PHILOSOPHY.md作成
- [x] roadmap.md作成
- [x] 本アクションプラン作成

### ⬜ Day 2-3 (11/16-11/17) - Architecture Updates
**Owner**: Development Team
**Files**: `/docs/architecture/business-logic-specification.md`

**Actions**:
1. 以下のドメインモデル定義を追加:
   ```typescript
   // Core Domain Models
   - LogEntry (MUEDnote)
   - EarExercise (Difference系教材)
   - FormExercise (構造系教材)
   ```

2. モジュール境界の再定義:
   ```
   core/
     - lesson/
     - material/
     - log/ (新規)
   modules/
     - ear-training/ (新規)
     - structure-training/ (新規)
   ```

### ⬜ Day 4-5 (11/18-11/19) - Business Document Consolidation
**Owner**: Project Manager
**Files**: `/docs/business/`

**Actions**:
1. 戦略文書の矛盾点リストアップ
2. ステークホルダーとの調整会議
3. 統合文書の作成開始

### ⬜ Day 6-7 (11/20-11/22) - README Updates
**Owner**: Documentation Team
**Files**: `/docs/README.md`

**Actions**:
1. Phase 0-4の進捗セクション追加
2. PHILOSOPHYへのリンク追加
3. ナビゲーション構造の再編成

## 2. Week 2 Actions (11/23-11/29)

### ⬜ Domain Model Documentation
**Priority**: High
**New File**: `/docs/domain-models.md`

**Content Structure**:
```markdown
# Domain Models
## Core Models
- User, Lesson, Material (existing)
- LogEntry (new)

## Difference Models
- EarExercise
- EarExerciseResult
- DifferenceMetric

## Form Models
- FormExercise
- StructureAnnotation
- FormAnalysisResult
```

### ⬜ Archive Old Documents
**Priority**: Medium
**Target**: 42 files

**Move to Archive**:
```bash
# Create archive directory
mkdir -p docs/archive/2025-11-15

# Move outdated documents
mv docs/_today/* docs/archive/2025-11-15/
mv docs/reports/2025-11-07_* docs/archive/2025-11-15/
mv docs/logs/* docs/archive/2025-11-15/
```

### ⬜ Create Module Specifications
**Priority**: High
**New Directory**: `/docs/modules/`

**Structure**:
```
modules/
├── core/
│   ├── lesson.md
│   ├── material.md
│   └── log.md
├── ear-training/
│   ├── README.md
│   └── api-spec.md
└── structure-training/
    ├── README.md
    └── api-spec.md
```

## 3. Week 3-4 Actions (11/30-12/15)

### ⬜ Phase Documentation
**New Directory**: `/docs/phases/`

**Create**:
- `phase0-philosophy.md` - 思想統合の記録
- `phase1-muednote.md` - Note実装仕様
- `phase2-ear-training.md` - Ear MVP仕様
- `phase3-form-training.md` - Form MVP仕様

### ⬜ Testing Strategy Update
**File**: `/docs/testing/TEST_STRATEGY.md`

**Add**:
- LogEntry関連テスト計画
- EarExercise E2Eテスト計画
- FormExercise統合テスト計画

### ⬜ Database Migration Planning
**File**: `/docs/database/phase1-migration-plan.md`

**Include**:
- LogEntryテーブル設計
- インデックス戦略
- パフォーマンス考慮事項

## 4. File Movement Script

```bash
#!/bin/bash
# Documentation reorganization script
# Run Date: 2025-11-22 (after Week 1 completion)

# Create new directories
mkdir -p docs/phases
mkdir -p docs/modules/{core,ear-training,structure-training}
mkdir -p docs/archive/2025-11-15/{logs,reports,prompts}

# Archive old files
mv docs/logs/* docs/archive/2025-11-15/logs/
mv docs/prompt/* docs/archive/2025-11-15/prompts/
mv docs/_today/* docs/archive/2025-11-15/

# Archive old reports (keep latest only)
mv docs/reports/2025-11-07_* docs/archive/2025-11-15/reports/

# Clean up empty directories
rmdir docs/logs docs/prompt docs/_today 2>/dev/null

echo "Documentation reorganization complete!"
```

## 5. Quality Checklist

### Week 1 Deliverables
- [ ] PHILOSOPHY.md reviewed and approved
- [ ] roadmap.md aligned with business strategy
- [ ] Architecture documents updated with new models
- [ ] README.md reflects new structure

### Week 2 Deliverables
- [ ] Domain models fully documented
- [ ] Module specifications created
- [ ] Old documents archived
- [ ] File structure reorganized

### Week 3-4 Deliverables
- [ ] Phase documentation complete
- [ ] Testing strategy updated
- [ ] Database migration plan ready
- [ ] All team members trained on new structure

## 6. Communication Plan

### Stakeholder Updates
- **Week 1 End**: Philosophy and roadmap review meeting
- **Week 2 End**: Domain model approval session
- **Phase 0 End**: Full documentation walkthrough

### Team Training
- **Date**: 2025-12-08
- **Content**: New documentation structure, PHILOSOPHY principles
- **Materials**: Presentation slides, quick reference guide

## 7. Success Metrics

### Quantitative
- [ ] 100% of Phase 0 documents created
- [ ] 90% of outdated documents archived
- [ ] 0 conflicting strategy statements

### Qualitative
- [ ] ClaudeCode can navigate documentation efficiently
- [ ] New developers understand MUED philosophy within 1 hour
- [ ] All team members aligned on Difference/Note/Form concepts

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Strategy alignment delays | Escalate to executive team by 11/20 |
| Technical documentation gaps | Pair with senior developers for reviews |
| Team resistance to change | Conduct philosophy workshop on 11/18 |

## 9. Next Phase Planning

### Phase 1 Preparation (Starting 12/16)
1. LogEntry implementation spec finalization
2. UI/UX mockups for MUEDnote
3. AI integration planning
4. Database performance testing

## Appendix: Quick Reference

### Key Documents Created
1. `/docs/PHILOSOPHY.md` - Core philosophy
2. `/docs/roadmap.md` - 12-month plan
3. `/docs/reports/DOCUMENTATION_AUDIT_2025-11-15.md` - Current state

### Key Documents to Update
1. `/docs/architecture/business-logic-specification.md`
2. `/docs/README.md`
3. `/docs/testing/TEST_STRATEGY.md`

### Key Documents to Create
1. `/docs/domain-models.md`
2. `/docs/phases/*.md` (4 files)
3. `/docs/modules/**/*.md` (6+ files)

---

**Review Schedule**: Weekly on Fridays
**Next Review**: 2025-11-22
**Final Phase 0 Review**: 2025-12-15

*This action plan is a living document and will be updated based on progress and feedback.*