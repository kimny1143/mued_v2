---
description: 
globs: *test.ts,*test.tsx
alwaysApply: false
---
まず、このファイルを参照したら、「テストするぞ！！」と叫んでください。

# MUED LMS テストのベストプラクティス

## このファイルの重要ポイント
- テストランナーは **Vitest + jsdom + React Testing Library (RTL)** に統一（Jest は使用しない）
- `npm run test` → ウォッチモード、`npm run test:ci` → 一発実行 + カバレッジ
- GitHub Actions は並列実行で8-10分以内に完了（lint/type-check/unit/E2E）
- E2Eテストは **Playwright** で`@core`タグ付きのクリティカルパスのみ実行
- Python(FastAPI) 側は `pytest` + `coverage` を別ステップで実行
- テストカバレッジは80%以上を維持（CIでブロック）

*最終更新: 2024-03-21*

---

## 1. テストスタック最小構成

| レイヤ           | スタック                     | 目的                       | 実行時間目標 |
|------------------|------------------------------|----------------------------|--------------|
| ユニット/統合    | Vitest + RTL + jsdom         | コンポーネント/フック検証  | 3-4分        |
| E2E             | Playwright (@core)           | クリティカルパス確認       | 4-5分        |
| Python          | pytest + coverage            | AI サービス関数/API 検証   | 2-3分        |
| パフォーマンス   | k6 + ZAP                     | 負荷/セキュリティテスト    | 制限なし     |

> **NOTE**: Vite ベースなので Vitest が一番ラク。Jest 互換 API のため既存知識も活かせる。

---

## 2. セットアップ手順（フロントエンド）

```bash
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

`vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './testing/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
  },
});
```

testing/setup.ts
```ts
import '@testing-library/jest-dom';
```

サンプルテスト
```tsx
// src/components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/button';

test('クリックでコールバックが呼ばれる', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>押す</Button>);
  fireEvent.click(screen.getByRole('button', { name: '押す' }));
  expect(onClick).toHaveBeenCalled();
});
```

---

## 3. npm スクリプト
```jsonc
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --coverage",
    "test:e2e": "playwright test --grep @core",
    "dev": "vite",
    "build": "vite build"
  }
}
```

---

## 4. GitHub Actions 構成

### CI Core (`.github/workflows/ci-core.yml`)
```yaml
name: Core CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
      - uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
```

### CI Nightly (`.github/workflows/ci-nightly.yml`)
```yaml
name: Nightly CI
on:
  schedule:
    - cron: '0 0 * * *'

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: k6 run tests/load/checkout-flow.js
      - run: zap-cli quick-scan --self-contained

  notify:
    needs: [performance]
    runs-on: ubuntu-latest
    steps:
      - uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## 5. フェーズ別ロードマップ
| フェーズ | 目的 | 追加ツール | 実行タイミング |
|---------|------|-----------|----------------|
| Core    | ユニット/統合 | Vitest + RTL | PR/マージ時 |
| E2E     | クリティカルパス | Playwright | PR/マージ時 |
| Nightly | パフォーマンス | k6 + ZAP | 毎日深夜 |

---

## 6. ディレクトリ構成（推奨）
```
/
├── src/
│   └── components/
│       ├── Button.tsx
│       └── __tests__/Button.test.tsx
├── tests/
│   ├── e2e/
│   │   └── checkout.spec.ts  # @core タグ付き
│   └── load/
│       └── checkout-flow.js
└── testing/
    └── setup.ts
```

---

## 7. ベストプラクティスまとめ
1. **対象コードをモックしない** – 外部依存だけをモックする
2. **成功系 + 失敗系** の両方を必ずテスト
3. **テストは独立** – `vi.clearAllMocks()`& `afterEach(cleanup)`
4. **カバレッジ80%以上** – CIでブロック、Codecovで可視化
5. **クリティカルパス優先** – E2Eは`@core`タグ付きの重要フローのみ
6. **並列実行** – 型チェック、Lint、テストを並列で実行

---

これで「テスト環境構築に丸一日 → 回らない」惨事は回避できるはず。もっと高度なテストをしたくなった時に、Playwright/E2E を段階的に追加していこう！