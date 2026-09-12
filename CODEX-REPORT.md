# Codex scope CI 検証報告

## 検証結果

### scripts 用 TypeScript 型検査

実行コマンド:

```text
npx tsc -p tsconfig.scripts.json --noEmit
```

出力:

```text
(stdout / stderr ともに出力なし)
exit code: 0
```

### 対象 unit test

実行コマンド:

```text
npm run test:unit -- tests/unit/codex-scope.test.ts
```

出力:

```text
> mued_v2@0.1.0 test:unit
> vitest run --config vitest.config.unit.ts tests/unit/codex-scope.test.ts


 RUN  v3.2.4 /private/tmp/codex-spawn/ci-scope-check

 ✓ tests/unit/codex-scope.test.ts (10 tests) 5ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  15:17:39
   Duration  708ms (transform 52ms, setup 138ms, collect 11ms, tests 5ms, environment 302ms, prepare 56ms)
```

この10本で次を直接検証した。

- 純粋な範囲判定: 宣言内だけ、宣言外1件、末尾 `/` の directory 配下、`lib/a` と `lib/ab.ts` の境界、parse 不能な空の宣言が FAIL 側になること。
- 本文 parse: 正しい1行、行なし、空リスト（parse 成功後、変更 file は全件範囲外）。
- branch 判定: `fix/codex-abc` は検査対象、`feat/something` は検査対象外。

### 対象 file の ESLint

実行コマンド:

```text
npx eslint tests/unit/codex-scope.test.ts && npx eslint --no-ignore scripts/ci/check-codex-scope.ts
```

出力:

```text
(stdout / stderr ともに出力なし)
exit code: 0
```

### 変更範囲

実行コマンド:

```text
git status --short
```

出力:

```text
?? .github/workflows/codex-scope.yml
?? CODEX-REPORT.md
?? scripts/ci/check-codex-scope.ts
?? tests/unit/codex-scope.test.ts
```

既存 file の変更は出力されていない。

## 測っていないこと

- GitHub-hosted runner 上での workflow の実行は測っていない。
- 実在する PR に対する GitHub API 呼び出しは測っていない。ローカル検証は export した純粋関数を直接呼ぶ unit test までである。
- この workflow を追加しただけでは merge は自動では止まらない。required check への登録は repository 設定であり、本タスクの範囲外なので、登録もその効果も測っていない。
