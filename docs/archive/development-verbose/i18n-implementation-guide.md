# i18n Implementation Guide

## 概要

MUED LMS v2は、日本語と英語の2言語に対応した多言語対応システムを実装しています。
React Context APIを使用したシンプルかつ拡張性の高いアーキテクチャで構築されています。

**実装日:** 2025-10-29
**Phase:** Phase 2
**関連ファイル:** `/lib/i18n/*`, `/components/layouts/language-switcher.tsx`

---

## アーキテクチャ

### 1. LocaleContext (`/lib/i18n/locale-context.tsx`)

React Context APIを使用した状態管理:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { translations, type Language } from './translations';

type LocaleContextType = {
  locale: Language;
  setLocale: (locale: Language) => void;
  t: typeof translations.ja; // Translation object
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Language>('ja');

  // Load locale from localStorage on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Language;
    if (savedLocale && (savedLocale === 'ja' || savedLocale === 'en')) {
      setLocaleState(savedLocale);
    }
  }, []);

  const setLocale = (newLocale: Language) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = translations[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
```

**設計の特徴:**
- **シンプル**: Context API + useStateでの実装
- **永続化**: localStorageで言語選択を保存
- **型安全**: TypeScriptで完全な型サポート
- **クライアントサイド**: `'use client'`ディレクティブで動的レンダリング

---

### 2. Translations (`/lib/i18n/translations.ts`)

型安全な翻訳オブジェクト:

```typescript
export const translations = {
  ja: {
    common: {
      loading: '読み込み中...',
      error: 'エラーが発生しました',
      save: '保存',
      cancel: 'キャンセル',
      // ... more translations
    },
    nav: {
      dashboard: 'ダッシュボード',
      lessons: 'レッスン',
      materials: '教材',
      library: 'ライブラリ',
      admin: '管理者',
    },
    admin: {
      ragMetrics: {
        title: 'RAGメトリクス',
        citationRate: '引用率',
        latency: 'レイテンシ',
        // ... more translations
      },
      plugins: {
        title: 'プラグイン管理',
        healthStatus: 'ヘルス状態',
        checkHealth: 'ヘルスチェック',
        // ... more translations
      },
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      save: 'Save',
      cancel: 'Cancel',
      // ... more translations
    },
    nav: {
      dashboard: 'Dashboard',
      lessons: 'Lessons',
      materials: 'Materials',
      library: 'Library',
      admin: 'Admin',
    },
    admin: {
      ragMetrics: {
        title: 'RAG Metrics',
        citationRate: 'Citation Rate',
        latency: 'Latency',
        // ... more translations
      },
      plugins: {
        title: 'Plugin Management',
        healthStatus: 'Health Status',
        checkHealth: 'Check Health',
        // ... more translations
      },
    },
  },
} as const;

export type Language = 'ja' | 'en';
```

**設計の特徴:**
- **階層構造**: `common`, `nav`, `admin`などのカテゴリで整理
- **型推論**: `as const`で完全な型推論
- **一貫性**: 日英で同じ構造を保持

---

### 3. LanguageSwitcher (`/components/layouts/language-switcher.tsx`)

言語切り替えUI:

```typescript
'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex gap-2">
      <Button
        variant={locale === 'ja' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocale('ja')}
      >
        日本語
      </Button>
      <Button
        variant={locale === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocale('en')}
      >
        English
      </Button>
    </div>
  );
}
```

**設計の特徴:**
- **ビジュアルフィードバック**: 現在の言語をvariantで表示
- **シンプルなUI**: ボタン2つだけの直感的なインターフェース
- **Shadcn/UI統合**: Buttonコンポーネントを使用

---

## 実装手順

### Step 1: Root Layoutに統合

`/app/layout.tsx`:

```typescript
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { LanguageSwitcher } from '@/components/layouts/language-switcher';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <LocaleProvider>
          <div className="min-h-screen">
            <header>
              <LanguageSwitcher />
            </header>
            {children}
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
```

### Step 2: コンポーネントで使用

```typescript
'use client';

import { useLocale } from '@/lib/i18n/locale-context';

export function MyComponent() {
  const { t } = useLocale();

  return (
    <div>
      <h1>{t.admin.plugins.title}</h1>
      <button>{t.common.save}</button>
    </div>
  );
}
```

### Step 3: 新しい翻訳を追加

1. `/lib/i18n/translations.ts`を編集
2. 日本語と英語の両方に追加
3. TypeScriptが自動的に型チェック

```typescript
export const translations = {
  ja: {
    // 既存の翻訳...
    newSection: {
      newKey: '新しい翻訳',
    },
  },
  en: {
    // 既存の翻訳...
    newSection: {
      newKey: 'New Translation',
    },
  },
} as const;
```

---

## E2Eテストでの対応

Playwrightテストでの多言語対応:

```typescript
import { test, expect } from '@playwright/test';

test('should display plugin management in both languages', async ({ page }) => {
  await page.goto('/dashboard/admin/plugins');

  // Regex pattern for EN/JA support
  await expect(page.locator('h1')).toContainText(/Plugin Management|プラグイン管理/);
  await expect(page.locator('text=/Health Status|ヘルス状態/')).toBeVisible();
});
```

**ポイント:**
- 正規表現パターン `/English|日本語/` を使用
- `|`（OR演算子）で両言語をカバー
- テストが言語選択に依存しない

---

## ベストプラクティス

### ✅ DO

1. **コンポーネントはClient Component**
   ```typescript
   'use client';
   import { useLocale } from '@/lib/i18n/locale-context';
   ```

2. **階層的な翻訳キー**
   ```typescript
   t.admin.plugins.healthStatus // Good
   t.adminPluginsHealthStatus   // Bad
   ```

3. **型安全性を活用**
   ```typescript
   const { t } = useLocale();
   t.admin.plugins.title // TypeScript が補完
   ```

### ❌ DON'T

1. **ハードコードされたテキスト**
   ```typescript
   <h1>Plugin Management</h1> // Bad
   <h1>{t.admin.plugins.title}</h1> // Good
   ```

2. **動的キーアクセス**
   ```typescript
   const key = 'title';
   t.admin.plugins[key] // Bad - 型チェックが効かない
   ```

3. **翻訳の欠落**
   ```typescript
   ja: { title: '日本語' }
   en: { /* titleが無い */ } // Bad - 構造を一致させる
   ```

---

## パフォーマンス考慮事項

### LocalStorage使用

- **初回ロード**: `useEffect`でlocalStorageから読み込み
- **更新**: `setLocale()`で自動保存
- **SSR非対応**: Client Componentのみで動作

### Context再レンダリング

- **スコープ**: LocaleProviderの子コンポーネント全体
- **最適化**: 必要に応じて`useMemo`を検討
- **現状**: 2言語のみなので問題なし

---

## 拡張方法

### 新言語の追加（例: 韓国語）

1. **Language型を拡張**:
   ```typescript
   export type Language = 'ja' | 'en' | 'ko';
   ```

2. **翻訳を追加**:
   ```typescript
   export const translations = {
     ja: { /* ... */ },
     en: { /* ... */ },
     ko: {
       common: {
         loading: '로딩 중...',
         // ...
       },
     },
   } as const;
   ```

3. **LanguageSwitcherを更新**:
   ```typescript
   <Button onClick={() => setLocale('ko')}>한국어</Button>
   ```

### URL Based Locale（将来的）

現在はlocalStorage、将来的にURLベース（`/ja/dashboard`, `/en/dashboard`）への移行も可能:

```typescript
// Next.js Middleware で実装可能
export function middleware(request: NextRequest) {
  const locale = request.nextUrl.pathname.split('/')[1];
  // ... locale handling
}
```

---

## トラブルシューティング

### エラー: "useLocale must be used within a LocaleProvider"

**原因**: コンポーネントがLocaleProviderの外にある

**解決**:
```typescript
// app/layout.tsx
<LocaleProvider>
  {children} // この中でのみuseLocale()が使える
</LocaleProvider>
```

### エラー: TypeScript型エラー

**原因**: 翻訳キーの不一致

**解決**:
1. `/lib/i18n/translations.ts`で日英の構造を一致させる
2. `as const`が正しく付いているか確認

### 翻訳が表示されない

**チェックリスト**:
1. コンポーネントが`'use client'`ディレクティブを持つか
2. `useLocale()`を正しく呼び出しているか
3. localStorageの値を確認（開発者ツール → Application → Local Storage）

---

## 関連ドキュメント

- [Phase 2 Sprint Plan](/docs/implementation/phase2-sprint-plan.md)
- [Admin Dashboard Implementation](/docs/features/admin-dashboard.md)
- [Plugin Management Guide](/docs/features/plugin-management-guide.md)

---

## 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|---------|--------|
| 2025-10-29 | 初版作成 - Phase 2実装完了 | Backend Engineer |

---

*Last Updated: 2025-10-29*
*Status: ✅ Production Ready*
