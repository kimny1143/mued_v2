# アクセシビリティ問題の予防戦略

## 背景

PR #14 で、Footer コンポーネントのソーシャルメディアリンクに `aria-label` が欠けていたことで、CI の Accessibility Tests が失敗しました。コミットのたびにアクセシビリティテストが赤くなる傾向を防ぐため、以下の多層防御戦略を実装します。

---

## 🎯 目標

1. **開発時に問題を発見** - コーディング中に IDE が警告
2. **コミット前に問題を検出** - 不適切なコードをコミットしない
3. **PR 作成時に自動検証** - CI で早期発見
4. **定期的な品質監視** - 継続的な改善

---

## 📋 実装する対策

### 1. ESLint プラグイン強化 ✅ 即座に実装

**目的**: コーディング中にリアルタイムで警告を表示

**実装内容**:
```json
// .eslintrc.json
{
  "extends": [
    "plugin:jsx-a11y/recommended" // ← 追加
  ],
  "rules": {
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-proptypes": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/click-events-have-key-events": "warn",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/no-static-element-interactions": "warn"
  }
}
```

**効果**:
- ❌ `<a href="#">` without text → ESLint エラー
- ❌ `<img>` without alt → ESLint エラー
- ❌ `<button>` without accessible name → ESLint エラー

---

### 2. Git Pre-commit Hook 🔄 次フェーズで実装

**目的**: コミット前に自動でアクセシビリティチェック

**実装内容**:
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run ESLint on staged files
npm run lint-staged

# Run quick accessibility check on changed components
# (オプション: 変更されたファイルのみ axe-core で簡易チェック)
```

**package.json**:
```json
{
  "lint-staged": {
    "components/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

**必要パッケージ**:
```bash
npm install -D husky lint-staged
npx husky install
```

---

### 3. CI での早期チェック ✅ 既に実装済み

**現状**: Fast Validation ステージで ESLint 実行中

**改善案**: Fast Validation で a11y 特化チェックを追加

```yaml
# .github/workflows/test.yml
validate:
  steps:
    - name: Run ESLint (including a11y rules)
      run: npm run lint

    # 新規追加: Fast a11y check
    - name: Quick accessibility check
      run: |
        # Changed files only
        git diff --name-only origin/main...HEAD | \
        grep -E 'components/.*\.(tsx|ts)$' | \
        xargs eslint --rule 'jsx-a11y/*: error'
```

---

### 4. コンポーネント単位の Accessibility テスト 🔄 推奨

**目的**: 各コンポーネント開発時に a11y を保証

**実装パターン**:
```typescript
// components/layouts/footer.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Footer } from './footer';

expect.extend(toHaveNoViolations);

describe('Footer Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<Footer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have accessible social media links', () => {
    const { getByLabelText } = render(<Footer />);
    expect(getByLabelText('Visit our Facebook page')).toBeInTheDocument();
    expect(getByLabelText('Visit our Instagram page')).toBeInTheDocument();
    expect(getByLabelText('Visit our Twitter page')).toBeInTheDocument();
  });
});
```

**必要パッケージ**:
```bash
npm install -D jest-axe
```

---

### 5. 開発ガイドライン 📚 ドキュメント化

**チェックリスト (新規コンポーネント作成時)**:

#### ✅ リンク・ボタン
- [ ] すべての `<a>` タグにテキストまたは `aria-label` がある
- [ ] アイコンのみのボタンに `aria-label` がある
- [ ] `href="#"` を避ける（実装予定なら `onClick` + `role="button"` を使用）

#### ✅ 画像・アイコン
- [ ] `<img>` に適切な `alt` 属性がある
- [ ] 装飾的な画像は `alt=""` を設定
- [ ] SVG アイコンは `aria-hidden="true"` を設定（親要素がラベルを持つ場合）

#### ✅ フォーム
- [ ] すべての入力フィールドに `<label>` または `aria-label` がある
- [ ] エラーメッセージは `aria-describedby` で関連付け
- [ ] 必須フィールドは `required` または `aria-required="true"`

#### ✅ 色・コントラスト
- [ ] WCAG AA 基準のコントラスト比（4.5:1 for text, 3:1 for large text）
- [ ] 色だけに頼らない情報伝達（アイコン・ラベルも併用）

#### ✅ キーボード操作
- [ ] インタラクティブ要素に `tabIndex="0"`（必要に応じて）
- [ ] Enter/Space キーで操作可能
- [ ] フォーカスインジケーターが可視

---

## 🔍 よくある違反パターンと修正方法

### ❌ Pattern 1: リンクにテキストがない

```tsx
// ❌ Bad
<Link href="#">
  <svg>...</svg>
</Link>

// ✅ Good
<Link href="#" aria-label="Visit our Facebook page">
  <svg aria-hidden="true">...</svg>
</Link>
```

### ❌ Pattern 2: ボタンにアクセシブルな名前がない

```tsx
// ❌ Bad
<button onClick={handleClose}>
  <X />
</button>

// ✅ Good
<button onClick={handleClose} aria-label="Close dialog">
  <X aria-hidden="true" />
</button>
```

### ❌ Pattern 3: 画像に alt がない

```tsx
// ❌ Bad
<img src="/avatar.jpg" />

// ✅ Good (functional)
<img src="/avatar.jpg" alt="User avatar" />

// ✅ Good (decorative)
<img src="/decoration.svg" alt="" />
```

### ❌ Pattern 4: フォーム入力にラベルがない

```tsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" placeholder="email@example.com" />

// ✅ Good (aria-label)
<input type="email" aria-label="Email address" placeholder="email@example.com" />
```

### ❌ Pattern 5: 色コントラストが不足

```tsx
// ❌ Bad
<button className="bg-[#75bc11] text-white">Submit</button>
// Contrast: 2.34:1 ❌ (WCAG AA requires 4.5:1)

// ✅ Good
<button className="bg-[#75bc11] text-[var(--color-brand-text)]">Submit</button>
// Contrast: 5.1:1 ✅
```

---

## 📊 効果測定

### メトリクス

| 指標 | 目標値 | 現状 |
|------|--------|------|
| ESLint a11y エラー | 0 | TBD |
| Axe violations (Dashboard) | 0 | ✅ 0 (修正済み) |
| Axe violations (全ページ) | < 5 | TBD |
| アクセシビリティテスト成功率 | 100% | 81% (13/16 passed) |

### モニタリング

- **週次**: CI での Accessibility Tests 失敗率
- **月次**: 全ページの axe-core スキャン結果
- **四半期**: WAVE または Lighthouse でのスコア計測

---

## 🚀 実装スケジュール

### Phase 1: 即座に実装 (今日)
- [x] Footer コンポーネントの aria-label 追加
- [ ] ESLint jsx-a11y プラグイン設定強化

### Phase 2: 次の 1 週間
- [ ] Pre-commit hook 設定
- [ ] 主要コンポーネントに jest-axe テスト追加
- [ ] 開発ガイドライン周知

### Phase 3: 次の 1 ヶ月
- [ ] 全コンポーネントに a11y テスト追加
- [ ] CI での早期チェック強化
- [ ] 定期スキャンの自動化

---

## 🎓 参考リソース

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WebAIM Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**最終更新**: 2025-11-19
**作成者**: Claude Code
**関連 PR**: #14 (MUEDnote Phase 1.1)
