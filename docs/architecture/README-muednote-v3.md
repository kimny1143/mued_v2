# MUEDnote v3.0 - Architecture Documentation Index

**Created**: 2025-11-24
**Version**: 1.0.0
**Status**: Design Phase

---

## Overview

MUEDnote v3.0は、音楽制作者向けの**コグニティブ・オフローディング（認知負荷の外部化）ツール**です。従来の「対話型教育ツール」から、プロフェッショナルのDAWワークフローに統合される「制作脳の拡張メモリ」へと大胆にピボットします。

### Core Concept

```
従来のメモツール:         MUEDnote v3.0:
  ユーザー                  ユーザー
     ↓                         ↓
  Alt+Tab                  Cmd+Shift+M (0.5秒)
     ↓                         ↓
  テキスト入力             乱文入力（"サビ ベース ぶつかってる"）
     ↓                         ↓
  保存ボタン               自動消失（フロー阻害ゼロ）
     ↓                         ↓
  手動整理                 AI が Silent Structuring
                               ↓
                          暗黙知の資産化
```

### Key Innovations

1. **500ms 入力**: Cmd+Shift+M → 乱文入力 → Enter → 消失（DAW作業を一切中断しない）
2. **Silent Structuring**: AIは返答せず、バックグラウンドでタグ付け・感情分析・文脈結合
3. **Smart Recall**: 「前回スランプの時どうした？」で過去の解決プロセスを即座に検索
4. **Auto Liner Notes**: 数ヶ月分の制作ログから、リリース用楽曲解説を自動生成

---

## Documentation Structure

このアーキテクチャドキュメントセットは、以下の3つの主要文書で構成されています。

### 1. System Architecture (必読)

**File**: [muednote-v3-cognitive-offloading-architecture.md](./muednote-v3-cognitive-offloading-architecture.md)

**Content**:
- Executive Summary
- High-Level Architecture Diagram
- Technology Stack Decision Matrix (Tauri vs Electron, Qdrant vs Pinecone)
- Data Model Design (PostgreSQL + Qdrant)
- Core UX Flows (Fragment Input, Smart Recall, Auto Liner Notes)
- DAW Integration Strategy
- Phase 1-3 Roadmap Overview

**Target Audience**: 全ステークホルダー（経営陣、投資家、開発チーム、デザイナー）

**Reading Time**: 30-40分

---

### 2. Implementation Plan (開発チーム向け)

**File**: [muednote-v3-implementation-plan.md](./muednote-v3-implementation-plan.md)

**Content**:
- **Milestone 1.1**: Tauri App Foundation (Month 1)
  - Project setup, Global hotkey, Overlay UI, DAW detection
- **Milestone 1.2**: AI Processing Pipeline (Month 2)
  - OpenAI integration, Tag extraction, Sentiment analysis, Background jobs
- **Milestone 1.3**: Qdrant Integration (Month 3)
  - Embedding generation, Vector indexing, Semantic search
- **Milestone 1.4**: Smart Recall UI (Month 4)
  - Search window, Timeline visualization, User testing

**Target Audience**: Backend/Frontend Engineers, QA, DevOps

**Reading Time**: 60-90分

**Key Features**:
- 詳細なタスクリスト（Task ID, Priority, Effort, Dependencies）
- コード例（Rust, TypeScript, React）
- テスト戦略（Unit, Integration, E2E, Performance）
- Quality Gates（各Milestone の Exit Criteria）

---

### 3. Risk Management (PM/経営層向け)

**File**: [muednote-v3-risk-management.md](./muednote-v3-risk-management.md)

**Content**:
- **Technical Risks** (5項目)
  - T1: Tauri 学習曲線
  - T2: 500ms 処理時間の達成困難
  - T3: Qdrant Embeddings 生成遅延
  - T4: DAW 検出の不正確さ
  - T5: OpenAI API コスト超過

- **Business Risks** (3項目)
  - B1: ターゲット（プロ/ハイアマ）の有料化抵抗
  - B2: ChatGPT 等の汎用AIによる機能模倣
  - B3: DAW ベンダーによる同機能の標準搭載

- **Operational Risks** (2項目)
  - O1: セキュリティ侵害（未発表楽曲の漏洩）
  - O2: OpenAI API の突然のサービス停止

**Target Audience**: PM, CEO, CTO, 投資家

**Reading Time**: 45-60分

**Key Features**:
- Risk Scoring Matrix（確率 × 影響）
- Mitigation Strategy（対策の具体例）
- Monitoring Plan（KPI, Alert, Dashboard）
- Contingency Plan（代替案、フォールバック）

---

## Quick Start Guide

### For Executives / Investors

1. Read: **Executive Summary** (Architecture doc, 5分)
2. Review: **Phase 1-3 Roadmap** (Architecture doc, 10分)
3. Assess: **Business Risks** (Risk Management doc, 15分)

**Total Time**: 30分

**Key Questions to Answer**:
- 差別化要素は何か？（500ms入力、Silent Structuring、DAW統合）
- 市場規模は？（プロ/ハイアマ DAWユーザー、日本10万人、グローバル100万人）
- Exit Strategy は？（M&A: DAWベンダーへの売却、Valuation $5M-$10M）

---

### For Product Managers

1. Read: **System Architecture** (全体、30分)
2. Study: **UX Flows** (Architecture doc, 10分)
3. Review: **Risk Management** (全体、45分)

**Total Time**: 85分

**Key Questions to Answer**:
- Phase 1 の成功条件は？（DAU 100名、1日10回入力、定着率40%）
- Pro Plan への転換戦略は？（価格980円、ROI訴求、7日間無料体験）
- 競合対策は？（ChatGPT vs MUEDnote の差別化マトリックス）

---

### For Developers

1. Read: **Technology Stack Decision** (Architecture doc, 15分)
2. Study: **Implementation Plan** (全体、90分)
3. Review: **Technical Risks** (Risk Management doc, 20分)

**Total Time**: 125分

**Key Questions to Answer**:
- なぜ Tauri？（メモリ50%削減、起動速度2倍、セキュリティ強化）
- 500ms をどう達成？（並列処理、非同期Embedding、キャッシュ）
- Qdrant の使い方は？（Embedded mode → Cloud sync、RAG実装）

---

### For Designers

1. Read: **Core UX Flows** (Architecture doc, 15分)
2. Study: **Overlay UI Spec** (Implementation Plan, 10分)
3. Review: **Timeline Visualization** (Implementation Plan, 10分)

**Total Time**: 35分

**Key Questions to Answer**:
- Overlay のデザイン要件は？（600px × 120px、半透明、1-line input）
- Timeline の情報設計は？（時系列、タグ、日時、Fragment card）
- アクセシビリティは？（キーボードナビゲーション、ARIA labels）

---

## Technology Stack Summary

### Desktop App
- **Framework**: Tauri 2.0
- **Rationale**: Memory efficiency (50% reduction vs Electron), Security (Rust), Native performance
- **Alternative Considered**: Electron (rejected due to memory footprint)

### Frontend
- **Framework**: React 19 + TypeScript
- **Styling**: TailwindCSS 4
- **Build Tool**: Vite

### Backend
- **Database**: PostgreSQL (Neon) - Relational data
- **Vector DB**: Qdrant (embedded → cloud) - Semantic search
- **Auth**: Clerk (継続使用)

### AI Services
- **Tag Extraction**: gpt-4.1-mini ($0.4/$1.6 per 1M tokens, 200ms)
- **Sentiment Analysis**: gpt-4.1-mini ($0.4/$1.6 per 1M tokens, 100ms)
- **Embeddings**: text-embedding-3-small ($0.02/1M tokens, 50ms)
- **Context Generation**: gpt-4.1 ($2.0/$8.0 per 1M tokens, 2-5s)

### DevOps
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (Error tracking)
- **Payment**: Stripe (Subscription management)

---

## Development Phases

### Phase 1: MVP - "The Console" (0-4ヶ月)

**Goal**: DAU 100名、1日平均10回入力

**Deliverables**:
- Tauri desktop app (Mac/Win)
- Global hotkey (Cmd+Shift+M)
- Fragment input with 500ms processing
- Smart Recall (basic search)
- PostgreSQL + Qdrant integration

**Budget**: ~$80/month infrastructure, 3.3 FTE

---

### Phase 2: Context & Cloud (5-10ヶ月)

**Goal**: Pro Plan 転換率 10%、MRR 196万円

**Deliverables**:
- Auto Context Generation (AI clustering)
- Auto Liner Notes (GPT-5 mini)
- Cloud Sync (Neon PostgreSQL)
- Stripe subscription system
- Mobile app (Phase 3 前倒しの可能性)

**Budget**: ~$500/month infrastructure, 4.0 FTE

---

### Phase 3: Ecosystem (11-18ヶ月)

**Goal**: B2B導入、MRR 300万円

**Deliverables**:
- DAW Plugin Integration (Logic Pro, Ableton Live)
- Mobile App (iOS/Android, voice input)
- Education Dashboard (instructor view)
- Group Management (schools, studios)

**Budget**: ~$1,500/month infrastructure, 5.0 FTE

---

## Success Metrics

### Phase 1 (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| DAU | 100名 | Tauri telemetry |
| Fragment 入力回数/日 | 10回 | User analytics |
| 処理時間 (P95) | < 500ms | Performance logs |
| エラー率 | < 1% | Sentry |
| 7日定着率 | > 40% | Cohort analysis |

### Phase 2 (Pro Plan)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pro Plan 転換率 | 10% | Stripe |
| MRR | 196万円 | Stripe revenue |
| Churn Rate | < 5%/月 | Subscription analytics |

### Phase 3 (Ecosystem)

| Metric | Target | Measurement |
|--------|--------|-------------|
| B2B 契約数 | 3校 | Enterprise dashboard |
| MRR | 300万円 | Total revenue |
| DAW統合利用率 | > 30% | Plugin activation |

---

## Related Documents

### Business
- [MUEDnote事業計画書v3.0](../business/MUEDnote事業計画書v3.md) - ピボット戦略、市場分析、収益モデル

### Technical (Current v2.x)
- [MUED System Architecture](./SYSTEM_ARCHITECTURE.md) - 既存システムの全体設計
- [MUEDnote Interview/Reasoning Architecture](./muednote-interview-reasoning-architecture.md) - v2.x のAI処理設計

### Research
- [OpenAI vs Claude Comparison](../research/openai-vs-claude-comparison.md) - AI モデル選定根拠

---

## Next Steps

### Week 1: Planning & Setup
- [ ] Kickoff meeting (全ステークホルダー)
- [ ] Team onboarding (Tauri/Rust 学習)
- [ ] Infrastructure setup (Neon, Qdrant, OpenAI API)

### Week 2-4: Milestone 1.1 Implementation
- [ ] Tauri project 初期化
- [ ] Global hotkey 実装
- [ ] Overlay UI 作成
- [ ] DAW detection 実装

### Week 5-8: Milestone 1.2 Implementation
- [ ] OpenAI API integration
- [ ] Tag extraction & Sentiment analysis
- [ ] Background job queue
- [ ] PostgreSQL データ永続化

### End of Month 4: Phase 1 Demo & User Testing
- [ ] Alpha user 招待（100名）
- [ ] Feedback 収集
- [ ] Phase 2 Go/No-Go 判断

---

## Contact & Ownership

| Role | Name | Responsibility |
|------|------|----------------|
| **Project Lead** | TBD | Overall direction, stakeholder management |
| **Technical Lead** | TBD | Architecture decisions, code quality |
| **Backend Lead** | TBD | Rust/Tauri implementation, AI integration |
| **Frontend Lead** | TBD | React UI, UX implementation |
| **QA Lead** | TBD | Test strategy, quality assurance |

---

## Document Maintenance

### Review Schedule
- **Weekly**: Risk monitoring dashboard update
- **Bi-weekly**: Implementation plan progress review
- **Monthly**: Architecture document revision

### Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-24 | MUED Team | Initial architecture design |

---

**Last Updated**: 2025-11-24
**Status**: Design Phase → Implementation Phase (Week 1)
