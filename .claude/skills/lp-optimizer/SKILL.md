---
name: lp-optimizer
description: >
  ランディングページの第三者視点分析・改善スキル。
  CROフレームワークとダイレクトレスポンス原則(Schwartz/Hopkins/Ogilvy)を統合。
  使用タイミング: (1) LPの監査・分析依頼 (2) コンバージョン改善相談 
  (3) コピーライティング改善 (4) A/Bテスト設計 (5) LP実装の優先順位付け。
  トリガー例: 「LPを分析して」「コンバージョン率を上げたい」「LPのレビュー」
  「ヒーローセクションを改善」「CTAを最適化」
---

# Landing Page Optimizer

MUEDnote等のクリエイター向けアプリLPを分析し、改善提案→実装まで支援するスキル。

## Quick Start

1. 対象LPのURL or HTMLを取得
2. `scripts/lp_analyzer.py` で構造分析
3. `references/cro_checklist.md` で10項目評価
4. 改善提案を優先度別に整理
5. Before/After形式で実装支援

## Core Workflow

### Phase 1: Discovery（発見）

ユーザーに確認:
- ターゲットユーザー（ペルソナ）
- 主要コンバージョン目標（DL/登録/問合せ）
- 現在の課題認識
- 競合LP（あれば）

### Phase 2: Audit（監査）

`references/cro_checklist.md` の10項目を5段階評価:

1. **Hero Section** - ヘッドライン/サブヘッド/CTA
2. **Social Proof** - 数値/証言/ロゴ
3. **Benefits vs Features** - So What?テスト
4. **Conversion Path** - 摩擦点の最小化
5. **Visual Hierarchy** - F/Zパターン
6. **Copy Clarity** - スキャナビリティ
7. **Trust Elements** - 安心感
8. **Mobile Optimization** - Core Web Vitals
9. **Message Match** - 流入元との一貫性
10. **Competitive Diff** - 独自ポジショニング

スコアリング: `scripts/cro_scorer.py` で総合評価

### Phase 3: Recommendations（提案）

3カテゴリで整理:

**🔴 Critical（今すぐ/1-2日）**
- コンバージョン直結の致命的問題

**🟡 Important（1週間以内）**
- UX/コピーの中程度問題

**🟢 Nice-to-have（今後）**
- A/Bテストで検証推奨

### Phase 4: Implementation（実装）

各提案に対して:
1. Before/After例（コード含む）
2. 実装手順
3. 成功指標（KPI）

## Copywriting Quick Reference

詳細: `references/copywriting_frameworks.md`

**AIDA**: Attention → Interest → Desire → Action
**PAS**: Problem → Agitation → Solution

### Headline Formula

```
How to [達成したいこと] without [避けたいこと]
```

### CTA Best Practice

- アクション動詞で始める
- 価値を含める（「無料で始める」not「送信」）
- 1ページ1つの主要CTA

## Scripts

### lp_analyzer.py
```bash
python scripts/lp_analyzer.py <html_file>
python scripts/lp_analyzer.py --stdin < page.html
```
→ 構造分析JSON出力

### cro_scorer.py
```bash
python scripts/cro_scorer.py --interactive
python scripts/cro_scorer.py --scores '{"hero_headline":3,...}'
```
→ スコアリングレポート出力

## A/B Test Hypothesis Template

```
「[変更内容]を実装すると、
 [ターゲットユーザー]の[行動指標]が
 [期待改善率]%改善する。
 根拠: [フレームワーク/データ]」
```
