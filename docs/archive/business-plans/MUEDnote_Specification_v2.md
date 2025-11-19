# MUEDnote Specification v2.0
## チャット型音楽学習ログシステム仕様書

**Version**: 2.0.0
**Date**: 2025-11-19
**Status**: 統合仕様書（最新版）
**Previous**: MUEDnote企画251119.md, MUED企画書251114.md

---

## 1. エグゼクティブサマリー

### 1.1 プロダクト概要

MUEDnoteは、**作曲・制作・学習の"記録と整理"に特化したチャット型アプリケーション**です。ユーザーが自然言語で入力した音楽活動のログを、AIが自動的に整形・タグ付け・分類し、構造化された学習資産として蓄積します。

### 1.2 戦略的位置づけ

- **MUED全体における役割**: Note（制作・学習ログ）の中核システム
- **ビジネスモデル**: 単体で月額課金可能な軽量SaaS（1,000〜1,500円/月）
- **開発優先度**: Phase 1（最優先）として3ヶ月以内にMVPリリース

### 1.3 主要な差分（旧企画書からの変更点）

| 項目 | 旧版（251114） | 新版（251119） | 理由 |
|------|-------------|-------------|------|
| **UI設計** | タイムライン型 | チャット一枚型 | 操作コスト最小化 |
| **機能スコープ** | ナビゲーション含む | 記録・整形のみ | 責務の明確化 |
| **AI機能** | 教材生成・分析含む | 整形・タグ・コメントのみ | 開発速度優先 |
| **課金モデル** | MUED本体と統合 | MUEDnote単体課金 | 早期収益化 |
| **AI人格** | 固定デザイン | ユーザー育成型 | 差別化要素 |

---

## 2. プロダクトビジョン

### 2.1 ミッション

**「音楽学習と制作過程のログを、AIが読みやすい形に整えてくれるノートアプリ」**

すべての音楽活動を資産化し、振り返りと成長を支援する。

### 2.2 コアバリュー

1. **即時価値**: 使ったその瞬間から価値を感じられる
2. **軽量性**: 思想も実装も軽く、完走可能なサイズ
3. **自然な導線**: MUED本体への自然なオンボーディング

### 2.3 ターゲットユーザー

- **プライマリ**: 音楽制作を学ぶ学生・社会人（20-40代）
- **セカンダリ**: 音楽講師・メンター
- **将来的**: プロフェッショナル制作者

---

## 3. 機能仕様

### 3.1 コア機能（MVP必須）

#### 3.1.1 自然言語入力
```typescript
interface ChatInput {
  message: string        // フリーテキスト入力
  attachments?: File[]   // 音声・画像添付（将来）
  timestamp: Date        // 自動記録
}
```

**入力例**:
- 「今日はコード進行の練習をした」
- 「ストリングスの扱いが難しい」
- 「メロのアイデアが3つ出た」

#### 3.1.2 AI整形機能
```typescript
interface AIFormattingResult {
  formattedContent: string  // 整形済みテキスト
  tags: string[]           // 自動生成タグ
  category: LogCategory    // 分類
  summary?: string         // 要約（オプション）
}
```

**処理内容**:
- 散文的な入力を構造化
- 音楽用語の正規化
- 文法・表現の整理

#### 3.1.3 自動タグ生成
```typescript
enum MusicTag {
  // 技術タグ
  COMPOSITION = "作曲",
  CHORD_PROGRESSION = "コード進行",
  ORCHESTRATION = "オーケストレーション",
  MIXING = "ミキシング",

  // 活動タグ
  PRACTICE = "練習",
  LEARNING = "学習",
  CREATION = "制作",
  REVIEW = "振り返り",

  // 感情タグ
  DIFFICULTY = "難しい",
  BREAKTHROUGH = "気づき",
  QUESTION = "疑問"
}
```

#### 3.1.4 セクション分類
```typescript
interface LogSection {
  type: 'practice' | 'insight' | 'idea' | 'challenge'
  content: string
  priority: 'low' | 'medium' | 'high'
}
```

### 3.2 AI挙動仕様

#### 3.2.1 基本挙動：整形＋タグ＋軽いコメント

**入力**: 「今日はストリングスの扱いが難しい」

**AI処理**:
```json
{
  "formatted": "ストリングスアレンジの学習で課題に直面",
  "tags": ["オーケストレーション", "課題", "ストリングス"],
  "comment": "ストリングスの声部管理で引っかかった感じだね。今日のところは課題ログとして残しておくよ。"
}
```

#### 3.2.2 質問機能（1-2問/必要時のみ）

**質問タイプ**:
1. **理解深化型**: 「どのあたりで難しさが出た？」
2. **行動促進型**: 「明日は何を触ってみたい？」
3. **意図確認型**: 「これは作品全体の方向性にも関係しそう？」

#### 3.2.3 提案機能（押し付けない）

**提案タイプ**:
1. **次の一手**: 「明日は3和音での簡易配置だけ試すのもアリだよ」
2. **関連知識**: 「声部を整理する時は、トップラインだけ固定すると楽になるよ」
3. **思考整理**: 「今の段階では問題の棚卸しだけでも十分だと思う」

### 3.3 AI人格システム（差別化要素）

#### 3.3.1 アーキテクチャ
```typescript
interface AIPersonality {
  userProfile: {
    baseStyle: 'professional' | 'friendly' | 'mentor' | 'companion'
    responseLength: 'minimal' | 'balanced' | 'detailed'
    questionFrequency: 'rare' | 'moderate' | 'frequent'
  }

  userMemory: {
    preferences: string[]      // 「短く」「厳しめ」など
    behaviorPatterns: Map<string, number>  // 行動パターンの頻度
    interactionHistory: LogEntry[]
  }

  styleResolver: (context: Context) => ResponseStyle
}
```

#### 3.3.2 人格育成フロー
1. **初期設定**: ユーザーが基本スタイルを選択
2. **学習**: 会話履歴から好みを抽出
3. **適応**: レスポンスごとに最適なスタイルを決定
4. **共有**: MUED本体でも同じ人格を使用

---

## 4. UI/UX設計

### 4.1 チャット一枚型インターフェース

```
┌─────────────────────────────────────┐
│  MUEDnote                     [設定] │
├─────────────────────────────────────┤
│                                     │
│  過去のログ（スクロール可能）         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ User: 今日はコード進行の...    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ AI: 整形済み + タグ + コメント │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  入力フィールド             [送信]   │
└─────────────────────────────────────┘
```

**設計原則**:
- **Zero Learning Curve**: 説明不要の直感的UI
- **Mobile First**: スマートフォンでの使いやすさ優先
- **Instant Feedback**: 即座にAIが反応

### 4.2 レスポンシブデザイン

| デバイス | レイアウト | 特徴 |
|---------|-----------|------|
| Mobile | 単一カラム | 親指操作最適化 |
| Tablet | 単一カラム拡張 | より多くの履歴表示 |
| Desktop | チャット+サイドバー | タグフィルタ等追加 |

---

## 5. 技術仕様

### 5.1 データモデル

```typescript
// Drizzle ORM Schema
export const logEntries = pgTable('log_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),

  // Core Fields
  type: logTypeEnum('type').notNull(),
  targetId: uuid('target_id'),
  content: text('content').notNull(),
  formattedContent: text('formatted_content'),

  // AI Fields
  aiSummary: text('ai_summary'),
  aiComment: text('ai_comment'),
  tags: text('tags').array(),

  // Metadata
  emotion: emotionEnum('emotion'),
  difficulty: integer('difficulty'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Indexes for Performance
export const logEntriesIndexes = [
  index('idx_user_created').on(logEntries.userId, logEntries.createdAt),
  index('idx_tags').using('gin').on(logEntries.tags),
  index('idx_type').on(logEntries.type)
]
```

### 5.2 API設計

#### 5.2.1 エンドポイント一覧

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/logs` | ログ作成 |
| GET | `/api/logs` | ログ一覧取得 |
| GET | `/api/logs/[id]` | 単一ログ取得 |
| PATCH | `/api/logs/[id]` | ログ更新 |
| DELETE | `/api/logs/[id]` | ログ削除 |
| POST | `/api/logs/[id]/summarize` | AI要約生成 |
| GET | `/api/logs/stats` | 統計情報取得 |

#### 5.2.2 リクエスト/レスポンス例

```typescript
// POST /api/logs
interface CreateLogRequest {
  content: string
  type?: LogType
  targetId?: string
}

interface CreateLogResponse {
  id: string
  formattedContent: string
  tags: string[]
  aiComment: string
  createdAt: string
}
```

### 5.3 AI統合

#### 5.3.1 使用モデル
- **本番**: OpenAI GPT-5-mini（コスト効率重視）
- **開発**: Claude Sonnet 4.5（MCP Server経由）

#### 5.3.2 プロンプトエンジニアリング

```typescript
const FORMATTING_PROMPT = `
あなたは音楽学習ログの整形アシスタントです。

入力: {userInput}

以下の形式で出力してください:
1. 整形済みテキスト（簡潔に）
2. タグ（3-5個）
3. 軽いコメント（1-2文）

ユーザー設定:
- スタイル: {userProfile.baseStyle}
- 長さ: {userProfile.responseLength}

過去の傾向:
{userMemory.preferences}
`
```

---

## 6. 実装計画

### 6.1 フェーズ別スケジュール

#### Phase 1-A: 基盤構築（Week 1-2）
- [ ] データベーススキーマ作成
- [ ] マイグレーション実行
- [ ] 基本API実装

#### Phase 1-B: チャットUI実装（Week 3-4）
- [ ] チャットコンポーネント作成
- [ ] リアルタイム更新実装
- [ ] モバイル最適化

#### Phase 1-C: AI統合（Week 5-6）
- [ ] OpenAI API統合
- [ ] プロンプトチューニング
- [ ] レスポンス最適化

#### Phase 1-D: 人格システム（Week 7-8）
- [ ] userProfile実装
- [ ] userMemory実装
- [ ] styleResolver実装

#### Phase 1-E: テスト・最適化（Week 9-12）
- [ ] E2Eテスト作成
- [ ] パフォーマンス最適化
- [ ] ユーザビリティテスト

### 6.2 MVP必須要件

**機能要件**:
- ✅ チャット型入力
- ✅ AI整形・タグ付け
- ✅ 基本的な人格選択
- ✅ モバイル対応

**非機能要件**:
- レスポンス時間 < 2秒
- 可用性 99.5%
- 同時接続 100ユーザー

---

## 7. ビジネスモデル

### 7.1 料金体系

| プラン | 月額 | 機能 |
|-------|------|------|
| Free | ¥0 | 10ログ/月、基本AI |
| Standard | ¥1,000 | 無制限ログ、AI要約 |
| Pro | ¥1,500 | 全機能、週次レポート、音声入力 |

### 7.2 収益予測

- **Month 1-3**: β版（無料）100ユーザー
- **Month 4-6**: 有料化、30%コンバージョン = ¥30,000/月
- **Month 7-12**: 300ユーザー、40%有料 = ¥120,000/月

### 7.3 コスト構造

| 項目 | 月額コスト |
|------|-----------|
| インフラ（Vercel/Neon） | ¥20,000 |
| OpenAI API | ¥30,000 |
| その他 | ¥10,000 |
| **合計** | ¥60,000 |

---

## 8. 成功指標（KPI）

### 8.1 プロダクト指標

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| DAU/MAU | > 40% | Analytics |
| ログ作成率 | 3回/週/ユーザー | Database |
| AI満足度 | > 80% | In-app Survey |
| チャーン率 | < 10%/月 | Stripe |

### 8.2 技術指標

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| API応答時間 | P95 < 500ms | Monitoring |
| エラー率 | < 0.1% | Sentry |
| AI処理時間 | < 2秒 | Logging |

---

## 9. リスクと対策

### 9.1 技術リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| AIコスト増大 | High | キャッシュ、レート制限 |
| データ量増大 | Medium | アーカイブ戦略 |
| プライバシー | High | 暗号化、アクセス制御 |

### 9.2 ビジネスリスク

| リスク | 影響 | 対策 |
|--------|------|------|
| 低採用率 | High | オンボーディング改善 |
| 競合出現 | Medium | 人格システムで差別化 |
| 開発遅延 | Medium | スコープ調整 |

---

## 10. 今後の拡張計画

### 10.1 Phase 2以降の機能

- **音声入力**: Whisper API統合
- **画像認識**: 楽譜スキャン
- **コラボレーション**: ログ共有機能
- **分析ダッシュボード**: 成長可視化
- **MUED本体連携**: シームレス統合

### 10.2 長期ビジョン

**3年後**: 音楽制作者の「第二の脳」として、10,000人のアクティブユーザーが日常的に使用するプラットフォームへ

---

## 付録

### A. 関連ドキュメント

- [PHILOSOPHY.md](../PHILOSOPHY.md) - 思想定義
- [roadmap.md](../roadmap.md) - 全体ロードマップ
- [PHASE1_CHECKLIST.md](../implementation/PHASE1_CHECKLIST.md) - 実装チェックリスト

### B. 用語集

| 用語 | 定義 |
|------|------|
| LogEntry | 学習・制作活動の記録単位 |
| AI人格 | ユーザーごとにカスタマイズされるAIの応答スタイル |
| styleResolver | コンテキストに応じてAI応答を調整するシステム |

### C. 更新履歴

- v2.0.0 (2025-11-19): MUEDnote企画251119.mdを統合、チャット型UIへ変更
- v1.0.0 (2025-11-14): 初版作成（MUED企画書251114.md）

---

**Document Owner**: MUED Product Team
**Last Updated**: 2025-11-19
**Next Review**: 2025-12-01