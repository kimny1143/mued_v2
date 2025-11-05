# 実装開始ガイド

**対象**: Claude Code Assistant（実装を実行するAI）
**目的**: コード品質改善実装を開始するためのガイド

---

## 📚 実装前に読むべき文書

1. **`PROJECT_REVIEW_2025.md`** - プロジェクト全体の評価レビュー
2. **`IMPROVEMENT_IMPLEMENTATION_PLAN.md`** - 詳細な実装計画書（メイン）
3. **`IMPLEMENTATION_QUICK_REFERENCE.md`** - クイックリファレンス

---

## 🚀 実装開始手順

### ステップ1: 現状確認

```bash
# 1. プロジェクトディレクトリに移動
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2

# 2. 現在の型エラーを確認
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 3. 現在のESLint警告を確認
npm run lint 2>&1 | grep "warning" | wc -l

# 4. テストが通過しているか確認
npm run test
```

### ステップ2: フェーズ1から開始

**原則**: フェーズ1（型エラー・警告解消）から順番に実装

**最初のタスク**: `タスク1-1: Response Body型エラーの修正`

**実装方法**:
1. `IMPROVEMENT_IMPLEMENTATION_PLAN.md` の「タスク1-1」セクションを読む
2. 対象ファイルを読み込む
3. 指示に従って修正
4. 検証コマンドを実行
5. 次のタスクに進む

---

## 📋 実装チェックリスト

### 各タスク完了時に確認

- [ ] ファイルを読み込んだ
- [ ] 変更内容を理解した
- [ ] 変更を適用した
- [ ] TypeScriptコンパイルエラーなし (`npx tsc --noEmit`)
- [ ] ESLint警告が減った (`npm run lint`)
- [ ] 既存テストが通過 (`npm run test`)
- [ ] ビルドが成功 (`npm run build`)

### 各フェーズ完了時に確認

- [ ] フェーズ内の全タスクが完了
- [ ] 検証コマンドを実行
- [ ] 期待される結果が達成された
- [ ] 次のフェーズに進む準備ができた

---

## 🎯 実装の優先順位

```
【最優先】
フェーズ1: 型エラー・警告解消
  ├─ タスク1-1: Response Body型エラー (2件)
  ├─ タスク1-2: any型の置換 (10件)
  ├─ タスク1-3: 未使用変数削除 (8件)
  └─ タスク1-4: React Hooks依存配列 (6件)

【高優先度】
フェーズ2: 共通コンポーネント移行
  ├─ タスク2-1: LoadingSpinner移行 (7件)
  ├─ タスク2-2: ErrorBoundary移行 (14件)
  └─ タスク2-3: useApiFetch移行 (14件)

【高優先度】
フェーズ3: テストカバレッジ向上
  ├─ タスク3-1: カバレッジ測定
  ├─ タスク3-2: ビジネスロジックテスト
  └─ タスク3-3: API統合テスト

【中優先度】
フェーズ4: API標準化
  ├─ タスク4-1: ApiResponseユーティリティ
  └─ タスク4-2: APIルートへの適用 (28件)
```

---

## ⚠️ 重要な注意事項

### 1. 一度に1つのタスクのみ

- 複数のタスクを同時に実装しない
- 各タスク完了後に検証

### 2. 既存機能を壊さない

- 変更前に既存の動作を確認
- テストが通過することを確認

### 3. 型安全性を維持

- `any`型を使わない
- 適切な型定義を作成

### 4. 段階的な実装

- 小さな変更から始める
- 各変更後に検証

---

## 🔍 トラブルシューティング

### 型エラーが解消しない場合

1. ファイル全体を再度読み込む
2. 型定義を確認
3. インポート文を確認

### ESLint警告が残る場合

1. 警告メッセージを確認
2. 対応する修正パターンを参照
3. `IMPLEMENTATION_QUICK_REFERENCE.md` を確認

### テストが失敗する場合

1. エラーメッセージを確認
2. 変更内容を見直す
3. 既存の動作を壊していないか確認

---

## 📊 進捗報告フォーマット

各フェーズ完了時に以下の形式で報告:

```markdown
## フェーズ1完了報告

### 実施内容
- タスク1-1: ✅ 完了 (2/2)
- タスク1-2: ✅ 完了 (10/10)
- タスク1-3: ✅ 完了 (8/8)
- タスク1-4: ✅ 完了 (6/6)

### 検証結果
- TypeScript型エラー: 0件 (Before: 17件)
- ESLint警告: 0件 (Before: 24件)
- テスト: 全て通過
- ビルド: 成功

### 次のステップ
フェーズ2に進む準備ができました。
```

---

## 🎓 実装例

### 例: タスク1-1の実装

```bash
# 1. ファイルを読み込む
read_file app/api/ai/quick-test/pdf/route.ts

# 2. エラー箇所を確認（行71付近）
# 3. 修正を適用
search_replace
  file_path: app/api/ai/quick-test/pdf/route.ts
  old_string: return new Response(pdfBuffer, { headers: {...} });
  new_string: return new Response(pdfBuffer.buffer, { headers: {...} });

# 4. 検証
run_terminal_cmd: npx tsc --noEmit
run_terminal_cmd: npm run lint
```

---

**実装開始ガイド完了**

このガイドに従って、`IMPROVEMENT_IMPLEMENTATION_PLAN.md` を参照しながら実装を進めてください。

