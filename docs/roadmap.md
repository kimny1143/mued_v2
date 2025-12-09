# MUED Development Roadmap - Phase 0-4

**Version**: 1.1
**Created**: 2025-11-15
**Updated**: 2025-12-09
**Period**: 2025年11月 - 2026年11月
**Focus**: Difference / Note / Form による音楽制作特化プラットフォーム構築

## Executive Summary

MUEDを「AI付き汎用LMS」から「音楽制作特化プラットフォーム」へ進化させる12ヶ月計画。Difference（耳）、Note（制作・学習ログ）、Form（構造）の3本柱を軸に、段階的に機能を実装します。

## Timeline Overview

```mermaid
gantt
    title MUED Phase 0-4 Implementation Timeline
    dateFormat YYYY-MM-DD
    section Phase 0
    Philosophy & Docs    :done, p0, 2025-11-15, 30d
    section Phase 1
    MUEDnote Implementation :p1, after p0, 90d
    section Phase 2
    Ear Training MVP     :p2, after p1, 90d
    section Phase 3
    Structure Training   :p3, after p2, 90d
    section Phase 4
    Echovna Integration  :p4, after p3, 90d
```

## Phase Details

### 📋 Phase 0: 思想・ドキュメント統合
**期間**: 2025年11月15日 - 2025年12月15日（1ヶ月）
**状態**: 🟡 **進行中**

#### 目的
MUEDの思想（Difference/Note/Form）をリポジトリ全体に浸透させ、今後の開発の指針を確立する。

#### 主要成果物
| 成果物 | 状態 | 完了予定日 |
|-------|------|-----------|
| `/docs/PHILOSOPHY.md` | ✅ 完了 | 2025-11-15 |
| `/docs/roadmap.md` | ✅ 完了 | 2025-11-15 |
| `/docs/architecture.md` 更新 | ⬜ 未着手 | 2025-11-22 |
| ドメインモデル定義 | ⬜ 未着手 | 2025-11-29 |
| ビジネス文書統合 | ⬜ 未着手 | 2025-12-06 |

#### 完了条件
- [ ] PHILOSOPHY/architecture/roadmapの3文書が整合
- [ ] ClaudeCodeエージェントが新機能のフレーム判断可能
- [ ] 既存コードベースとの整合性確認完了

---

### 🎵 Phase 1: MUEDnote（Note）基盤実装
**期間**: 2025年12月16日 - 2026年3月15日（3ヶ月）
**状態**: 🟡 **進行中（約25%完了）**

#### 目的
「沈黙のコンソール」として音楽制作中のフローを壊さずに思考断片を記録し、AIが裏側で構造化・資産化するシステムを構築する。

#### 実装アプローチ
- **Desktop App**: Tauri/Rust による DAW オーバーレイ（`apps/muednote-v3/`）
- **Silent Console UX**: 0.5秒で入力、AIは返答しない
- **HLA処理**: 裏側でIntent Recognition, Context Integration, Feature Extraction, Asset Generation

#### 主要機能
```typescript
// LogEntry Model
interface LogEntry {
  id: string
  userId: string
  type: 'lesson' | 'practice' | 'creation' | 'reflection' | 'system'
  targetId?: string  // 対象レッスン/教材/作品ID
  content: string    // Markdown/JSON
  aiSummary?: string // AI要約
  tags?: string[]
  emotion?: 'frustrated' | 'neutral' | 'satisfied' | 'excited'
  difficulty?: 1 | 2 | 3 | 4 | 5
  createdAt: Date
  updatedAt: Date
}
```

#### タスクリスト

**Phase 1.1: LMS基盤（バックエンド）** ✅ 完了
- [x] メンタースロット管理 API（CRUD、繰り返しスロット生成）
- [x] 予約システム API（作成、Stripe Webhook 11イベント対応）
- [x] メール通知システム（Resend 統合、テンプレート）
- [x] Repository パターン実装

**Phase 1.2: LMS基盤（フロントエンド）** 🟡 進行中（50%）
- [x] スロット作成フォーム（単発・繰り返し）
- [x] スロット一覧表示
- [ ] 予約キャンセル UI
- [ ] 決済履歴ページ
- [ ] メンタープロフィールページ

**Phase 1.3: MUEDnote デスクトップ** ⬜ 未着手
- [ ] Tauri 基盤セットアップ（`apps/muednote-v3/`）
- [ ] ホットキー監視・0.5秒オーバーレイUI
- [ ] ローカルキュー保存
- [ ] DAWフォーカス管理

**Phase 1.4: AI/HLA 処理** ⬜ 未着手
- [ ] Intent Recognition（意図解析）
- [ ] Context Integration（DAW情報紐付け）
- [ ] Feature Extraction（感情・パターン抽出）
- [ ] Asset Generation（ライナーノーツ生成）

#### KPI
- ログ記録率: 60%以上のアクティビティ
- AI要約精度: 80%以上の満足度
- 応答速度: P95 < 500ms

---

### 👂 Phase 2: Ear Training（Difference）MVP
**期間**: 2026年3月16日 - 2026年6月15日（3ヶ月）
**状態**: ⬜ **未着手**

#### 目的
「差分を聴く耳」を育てるトレーニング機能のMVPを実装する。

#### 主要機能
```typescript
// EarExercise Model
interface EarExercise {
  id: string
  title: string
  description: string
  type: 'eq' | 'balance' | 'rhythm' | 'pitch'
  audioAUrl: string
  audioBUrl: string
  differenceMetadata: {
    parameter: string
    value: number
    unit: string
  }
  correctAnswer: 'A' | 'B' | 'same'
  difficulty: 1 | 2 | 3 | 4 | 5
  tags: string[]
}
```

#### 実装計画
- [ ] **Month 1**: 基盤構築
  - [ ] EarExerciseモデル・DB設計
  - [ ] 音声ファイル管理システム
  - [ ] 基本的な再生UI

- [ ] **Month 2**: 問題システム
  - [ ] A/B比較UI実装
  - [ ] 回答・フィードバック機能
  - [ ] スコアリング・統計

- [ ] **Month 3**: LogEntry統合
  - [ ] 回答履歴の自動記録
  - [ ] 主観的メモ機能
  - [ ] 成長曲線可視化

#### MVP成功基準
- 2系統以上の問題タイプ実装（EQ/Balance）
- 正答率追跡機能の動作確認
- MUEDnoteとの連携確認

---

### 🏗️ Phase 3: Structure Training（Form）MVP
**期間**: 2026年6月16日 - 2026年9月15日（3ヶ月）
**状態**: ⬜ **未着手**

#### 目的
楽曲構造を理解し、制作に活かす能力を育成する機能のMVPを実装する。

#### 主要機能
```typescript
// FormExercise Model
interface FormExercise {
  id: string
  audioUrl?: string
  midiUrl?: string
  structureAnnotations: {
    sections: Section[]
    chords: Chord[]
    patterns: Pattern[]
  }
  exerciseType: 'section_order' | 'chord_function' | 'pattern_recognition'
  correctAnswer: any
  difficulty: 1 | 2 | 3 | 4 | 5
}
```

#### 実装計画
- [ ] **Month 1**: 可視化基盤
  - [ ] 波形表示コンポーネント
  - [ ] セクションブロック表示
  - [ ] 基本的な音声再生制御

- [ ] **Month 2**: 問題システム
  - [ ] セクション順当て問題
  - [ ] コード機能分類問題
  - [ ] 回答・採点機能

- [ ] **Month 3**: AI統合
  - [ ] 簡易構造解析API
  - [ ] 解説文自動生成
  - [ ] LogEntry連携

#### MVP成功基準
- 1-2問題タイプの安定動作
- 構造可視化UIの実装
- AI解析機能の基本動作

---

### 🔄 Phase 4: DAW統合・プロダクション
**期間**: 2026年9月16日 - 2026年12月15日（3ヶ月）
**状態**: ⬜ **未着手**

#### 目的
MUEDnote を DAW エコシステムに完全統合し、プロダクション品質に仕上げる。

#### 統合ポイント
1. **DAW連携プロトコル**
   - Window Title Monitoring（プロジェクト名取得）
   - File Path Tracking（.als, .logicx 監視）
   - MIDI/OSC（再生/停止、アクティブトラック）
   - Keystroke Context Linking（直前操作の推定）

2. **プラグイン化**
   - AU/VST/AAX 形式での提供
   - DAW 内での完全統合

3. **商用リリース準備**
   - 決済システム（サブスクリプション）
   - B2B ライセンス（教育機関向け）
   - セキュリティ監査

#### マイルストーン
- [ ] **Month 1**: DAW連携プロトコル実装
- [ ] **Month 2**: プラグイン開発
- [ ] **Month 3**: クローズドβ・商用リリース

---

## Risk Management

### 技術的リスク
| リスク | 影響度 | 対策 |
|-------|--------|------|
| LogEntryのデータ量増大 | High | インデックス最適化、アーカイブ戦略 |
| AI処理コスト | Medium | キャッシュ活用、バッチ処理 |
| 音声ファイル管理 | Medium | CDN活用、圧縮最適化 |

### ビジネスリスク
| リスク | 影響度 | 対策 |
|-------|--------|------|
| ユーザー採用率低迷 | High | 段階的リリース、フィードバック収集 |
| 競合製品の出現 | Medium | 差別化要素（Note）の強化 |
| 開発遅延 | Medium | MVP機能の絞り込み |

## Success Metrics

### Phase全体KPI
- **ユーザー満足度**: NPS 40以上
- **機能利用率**: MAU 60%以上
- **データ蓄積**: 月間10,000 LogEntry以上

### Phase別KPI
| Phase | 主要指標 | 目標値 |
|-------|---------|--------|
| Phase 0 | ドキュメント整合性 | 100% |
| Phase 1 | LMS基盤完成度 / MUEDnote MVP | 100% / 動作確認 |
| Phase 2 | Ear正答率向上 | +20% |
| Phase 3 | Form理解度 | 70点 |
| Phase 4 | DAW統合 / 商用リリース | Logic Pro + Ableton 対応 |

## Resource Requirements

### 開発リソース
- **Phase 0**: 1名 × 1ヶ月
- **Phase 1**: 2名 × 3ヶ月
- **Phase 2**: 2名 × 3ヶ月
- **Phase 3**: 2名 × 3ヶ月
- **Phase 4**: 3名 × 3ヶ月

### インフラコスト（月額）
- **現状**: ¥50,000
- **Phase 1完了時**: ¥80,000
- **Phase 4完了時**: ¥150,000

## Revision History

- v1.1 (2025-12-09): Phase 1 進捗を現実に即して更新、MUEDnote v6.1（沈黙のコンソール）に整合、Phase 4 を DAW 統合に変更
- v1.0 (2025-11-15): 初版作成

## Related Documents

- [PHILOSOPHY.md](./PHILOSOPHY.md) - 思想定義
- [MUEDnote Master Plan v6.1](./business/MUEDnote/muednote_master_plan_v6.1.md) - MUEDnote 仕様書
- [システムアーキテクチャ](./architecture/SYSTEM_ARCHITECTURE.md) - 技術アーキテクチャ
- [自己レビューレポート](./reviews/2025-12-09-self-review-report.md) - 最新の実装状況

---

*このロードマップは四半期ごとにレビュー・更新されます。*