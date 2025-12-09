# MUEDnote ドキュメント構成

**最終更新**: 2025-12-09
**状態**: 統合完了（単一情報源）

---

## 概要

このドキュメントは 2025-12-09 の統合後の MUEDnote ドキュメント構成を説明します。

**決定事項 (2025-12-09)**: MUEDnote v6.1（デスクトップ/沈黙のコンソール）を単一情報源とする。代替案の Web チャットアプローチ（v2.0）はアーカイブ済み。

---

## 現行有効ドキュメント

### 単一情報源
| ファイル | 目的 | 状態 |
|---------|------|------|
| `muednote_master_plan_v6.1.md` | **現行マスタープラン** - デスクトップ沈黙コンソール仕様 | 有効 |

### 実装参照
| パス | 目的 |
|------|------|
| `apps/muednote-v3/` | Tauri デスクトップアプリ ソースコード |
| `docs/roadmap.md` | MUED 全体ロードマップ（Phase 1.3 = MUEDnote デスクトップ）|
| `docs/PHILOSOPHY.md` | Difference/Note/Form 思想（v6.1 と整合）|

---

## アーカイブ済みドキュメント

すべての履歴ドキュメントと代替アプローチは適切なアーカイブディレクトリに移動済み。

### 代替ビジョン（別アプローチ）

| ファイル | 場所 | アーカイブ理由 |
|---------|------|----------------|
| `MUEDNOTE_INTEGRATED_SPEC_V2.md` | `docs/archive/muednote-alternative-vision/` | Web チャットアプローチ。デスクトップ v6.1 に置き換え。 |
| `muednote-chat-ui-design.md` | `docs/archive/muednote-alternative-vision/` | Web アプローチのチャット UI デザイン。 |

### 過去バージョン

| ファイル | 場所 | アーカイブ理由 |
|---------|------|----------------|
| `muednote_business_plan_v3.0.md` | `archive/` | 初期ピボット戦略。v6.1 に置き換え。 |
| `muednote_business_plan_v3.1.md` | `archive/` | v3.x 系最終版。v6.1 に置き換え。 |
| `muednote_business_plan_v3.2_algorithm.md` | `archive/` | HLA アルゴリズム詳細。v6.1 に統合。 |
| `muednote_strategy_v5.0_drainpipe.md` | `archive/` | DRAINPIPE UX 思想。v6.1 に統合。 |
| `gpt5_muednote_master_plan_v6.md` | `archive/` | GPT5 バリアント。v6.1 に置き換え。 |
| `gemini_muednote_master_plan_v6.md` | `archive/` | Gemini バリアント。v6.1 に置き換え。 |

### MVP 計画（移動済み）

| ファイル | 場所 | アーカイブ理由 |
|---------|------|----------------|
| `muednote_spotlight_mvp_spec_v1.0.md` | `archive/spotlight-mvp-planning/` | Spotlight Input MVP 計画ドキュメント |
| `muednote_spotlight_mvp_implementation_plan.md` | `archive/spotlight-mvp-planning/` | 実装計画 |
| `muednote_spotlight_mvp_verification_report.md` | `archive/spotlight-mvp-planning/` | 技術実現可能性レポート |

---

## 命名規則

### 標準フォーマット
```
muednote_{機能}_{種類}_v{バージョン}.md
```

### 禁止パターン
- ファイル名の角括弧: `[GPT5]file.md`（ファイルシステム・URL で問題発生）
- ファイル名のスペース: `MUEDnote 事業計画書.md`（アンダースコアを使用）
- ファイル名の日本語: ファイル名は英語、内容は日本語

---

## ドキュメント進化

```
v3.0 (ピボット戦略)
    |
v3.1 (最終版) --- HLA コンセプト追加
    |
v3.2 (アルゴリズム詳細) --- 技術仕様
    |
v5.0 (DRAINPIPE UX) --- テキストファースト思想確立
    |
v6.0 (GPT5/Gemini バリアント) --- 統合試行
    |
v6.1 (統合マスター) --- 現行の権威あるドキュメント
```

---

## 関連ドキュメント（このディレクトリ外）

| パス | 目的 |
|------|------|
| `docs/architecture/muednote-spotlight-mvp-feasibility-report.md` | アーキテクト実現可能性分析 |
| `docs/testing/muednote-spotlight-test-strategy.md` | MVP テスト戦略 |
| `apps/muednote-v3/` | Tauri デスクトップアプリ ソースコード |

---

*ドキュメント統合完了: 2025-12-09*
