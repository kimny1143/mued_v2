# ドキュメント整理・クリーンアップ計画

**作成日**: 2025-11-06
**目的**: ドキュメントの冗長性を排除し、整理された構造を構築

---

## 📊 現状分析

### 統計
- **総ドキュメント数**: 98ファイル
- **ルートレベルファイル**: 8ファイル（README以外は整理対象）
- **_todayフォルダ**: 6ファイル（最新の作業記録）
- **archiveフォルダ**: 大量の過去ドキュメント

### 問題点

1. **ルートレベルの混雑**: 移行関連、CI/CD、品質レポートが散在
2. **API標準化の虚偽記載**: ドキュメントでは100%完了と記載だが実際は11.1%
3. **Git Worktree情報の未反映**: CLAUDE.mdには記載済みだが開発ガイドには未反映
4. **冗長性**: 類似内容のドキュメントが複数存在

---

## 🎯 整理計画

### Phase 1: ルートレベルファイルの整理 ✅

#### 移動対象

1. **データベース関連** → `docs/database/`
   - `EXECUTE_MIGRATION.md`
   - `MIGRATION_EXECUTION_SUMMARY.md`
   - `phase2-migration-guide.md`

2. **CI/CD関連** → `docs/deployment/`
   - `github-actions-env-setup.md`

3. **品質・監査レポート** → `docs/reports/`
   - `CODE_QUALITY_REPORT.md`
   - `DOCUMENTATION_AUDIT_REPORT_2025-10-29.md`

4. **保持**
   - `README.md` - ドキュメントのエントリーポイント
   - `CHANGELOG.md` - プロジェクトの変更履歴

### Phase 2: API標準化の実態反映 ✅

**完了済み**:
- ✅ 実態調査: 3/27 (11.1%) が標準化済み
- ✅ `PROGRESS_REPORT_2025-11-06.md` 修正
- ✅ `API_STANDARDIZATION_STATUS_2025-11-06.md` 作成

### Phase 3: Git Worktree情報の展開

#### 更新対象ドキュメント

1. **開発ガイド** (`docs/guides/`)
   - 新規作成: `GIT_WORKTREE_WORKFLOW.md`
   - 内容: CLAUDE.mdの該当セクションを展開・詳細化

2. **実装ガイド** (`docs/implementation/`)
   - 既存の実装ガイドにWorktreeワークフローを追記

### Phase 4: _todayフォルダの整理

#### 現在のファイル（6個）

1. `API_STANDARDIZATION_STATUS_2025-11-06.md` - 新規作成、保持
2. `IMPLEMENTATION_QUICK_REFERENCE.md` - 保持
3. `IMPLEMENTATION_START_GUIDE.md` - 保持
4. `IMPROVEMENT_IMPLEMENTATION_PLAN.md` - 保持
5. `PROGRESS_REPORT_2025-11-06.md` - 更新済み、保持
6. `PROJECT_REVIEW_2025.md` - 保持

**アクション**: 現状は適切に整理されているため、追加整理不要

### Phase 5: アーカイブの整理（低優先度）

**方針**:
- 2025-10-01以前のドキュメントは四半期サマリーに統合を検討
- 現時点では優先度低（後日実施）

---

## 🔧 実施手順

### 1. ルートレベルファイルの移動

```bash
# データベース関連
mv docs/EXECUTE_MIGRATION.md docs/database/
mv docs/MIGRATION_EXECUTION_SUMMARY.md docs/database/
mv docs/phase2-migration-guide.md docs/database/

# CI/CD関連
mv docs/github-actions-env-setup.md docs/deployment/

# レポート類
mv docs/CODE_QUALITY_REPORT.md docs/reports/
mv docs/DOCUMENTATION_AUDIT_REPORT_2025-10-29.md docs/reports/
```

### 2. Git Worktreeガイドの作成

`docs/guides/GIT_WORKTREE_WORKFLOW.md` を作成:
- CLAUDE.mdの内容をベースに詳細化
- 実際のコマンド例とトラブルシューティング
- チーム開発での使用方法

### 3. README更新

`docs/README.md` を更新:
- Git Worktreeワークフローへのリンク追加
- API標準化の現状を反映
- 最新の進捗レポートへのリンク追加

---

## 📈 期待される効果

1. **発見性の向上**: カテゴリ別に整理され、必要な情報を素早く発見
2. **正確性の向上**: 虚偽の情報を修正、実態を正確に反映
3. **保守性の向上**: 冗長性を排除、更新作業を効率化
4. **開発効率の向上**: Git Worktree情報により並行開発が容易に

---

## 🎯 実施状況

- [x] Phase 1: ルートレベルファイルの移動
- [x] Phase 2: API標準化の実態反映
- [ ] Phase 3: Git Worktree情報の展開
- [ ] Phase 4: _todayフォルダの整理（不要と判断）
- [ ] Phase 5: アーカイブの整理（低優先度、後日実施）

---

**次のアクション**: Phase 3の実施（Git Worktreeガイド作成）
