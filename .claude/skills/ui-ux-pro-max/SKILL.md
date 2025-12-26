---
name: ui-ux-pro-max
description: "UI/UX design intelligence for MUED. Plan, build, design, implement, review, improve UI/UX code. Styles: glassmorphism, minimalism, dark mode, responsive. Projects: landing page, dashboard, SaaS, mobile app."
---

# UI/UX Pro Max - MUED Edition

MUEDプロジェクト用にカスタマイズされたUI/UXデザインスキル。

## 基本リファレンス

グローバルスキルを参照:
```
/Users/kimny/Dropbox/_DevProjects/glasswerks-claude-skills/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/
```

## MUED固有のデザインガイドライン

### ブランドカラー

| 用途 | カラー | Tailwind |
|------|--------|----------|
| Primary | #1A1A2E | `bg-[#1A1A2E]` |
| Accent | #4F46E5 | `bg-indigo-600` |
| Background | #0F0F1A | `bg-[#0F0F1A]` |
| Text Primary | #FFFFFF | `text-white` |
| Text Muted | #94A3B8 | `text-slate-400` |

### MUEDのデザイン哲学

1. **ダークモード優先** - クリエイターの作業環境に配慮
2. **ミニマル** - 判断の邪魔をしない
3. **グラスモーフィズム** - glasswerksブランドとの統一
4. **モノクローム+アクセント** - 落ち着いた雰囲気

### コンポーネント規約

```tsx
// ボタン
<button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors cursor-pointer">
  CTA
</button>

// カード（グラスモーフィズム）
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
  ...
</div>

// テキスト階層
<h1 className="text-4xl font-bold text-white">見出し</h1>
<p className="text-lg text-slate-400">本文</p>
```

### アイコン

- **使用ライブラリ**: Lucide Icons
- **禁止**: 絵文字をアイコンとして使用しない

```tsx
import { Music, Brain, Sparkles } from 'lucide-react';
```

## 検索スクリプト（オプション）

詳細なスタイル検索が必要な場合:

```bash
python3 /Users/kimny/Dropbox/_DevProjects/glasswerks-claude-skills/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain style
```

## Pre-Delivery Checklist

- [ ] 絵文字アイコン不使用（Lucide使用）
- [ ] ダークモード対応
- [ ] グラスモーフィズム適用
- [ ] cursor-pointer on clickables
- [ ] レスポンシブ対応（320px, 768px, 1024px, 1440px）
