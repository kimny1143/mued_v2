# MUEDnote Phase 1 実装計画（改訂版）

**バージョン**: 2.0
**作成日**: 2025-11-19
**対象期間**: 2025年11月20日 - 2026年1月5日
**総工数**: 8週間

---

## エグゼクティブサマリー

本実装計画は、MUEDnoteをチャット型音楽学習記録ツールとして再定義し、8週間で商用リリース可能なMVPを構築するための詳細ロードマップです。既存のlog-entriesスキーマからの段階的移行を考慮し、リスクを最小化しながら新ビジョンを実現します。

---

## Phase 1.0: MVP基盤構築（2週間）

### Week 1: 基礎インフラとUI実装

#### Day 1-2: プロジェクト初期設定

**月曜日 - 火曜日（11/20-21）**

```bash
# Morning (4h)
- [ ] 新規フィーチャーブランチ作成 `feature/muednote-chat-v2`
- [ ] package.json更新と依存関係インストール
      - Vercel AI SDK (@ai-sdk/openai)
      - Socket.io / SSE ライブラリ
      - React Query v5
- [ ] 環境変数設定（.env.local）
      OPENAI_API_KEY_MUEDNOTE=sk-...
      MUEDNOTE_ENABLED=true
      MUEDNOTE_STREAMING_ENABLED=true

# Afternoon (4h)
- [ ] データベーススキーマ作成
      - chat-system.ts の配置
      - マイグレーションファイル生成
      - ローカルDB でのテスト実行
```

**成果物**:
- 開発環境のセットアップ完了
- データベーススキーマ配置完了

#### Day 3-4: チャットUI基本実装

**水曜日 - 木曜日（11/22-23）**

```typescript
// 実装するコンポーネント構造
/components/muednote/
  ├── ChatInterface.tsx       // メインコンテナ
  ├── ChatMessageList.tsx     // メッセージリスト
  ├── ChatMessageItem.tsx     // 個別メッセージ
  ├── ChatInput.tsx          // 入力エリア
  ├── ChatSessionSidebar.tsx // セッション一覧
  └── ChatTypingIndicator.tsx // タイピング表示
```

```
- [ ] ChatInterface メインコンテナ実装（4h）
      - レイアウト構造
      - State管理（Zustand）
      - レスポンシブ対応

- [ ] メッセージ表示系コンポーネント（4h）
      - ChatMessageList（仮想スクロール対応）
      - ChatMessageItem（role別スタイリング）
      - タグ表示機能

- [ ] 入力系コンポーネント（4h）
      - ChatInput（auto-resize textarea）
      - 送信ボタン（loading state対応）
      - キーボードショートカット（Cmd+Enter）

- [ ] セッション管理UI（4h）
      - ChatSessionSidebar
      - セッション切り替え機能
      - 新規セッション作成
```

**成果物**:
- 基本的なチャットUIが表示可能
- モックデータでの動作確認完了

#### Day 5: バックエンドAPI基礎

**金曜日（11/24）**

```
Morning (4h):
- [ ] API Route 実装
      /api/chat/messages/route.ts
      /api/chat/sessions/route.ts
      /api/chat/sessions/[id]/route.ts

- [ ] Repository層実装
      /lib/repositories/chat.repository.ts
      - createSession()
      - addMessage()
      - getSessionMessages()
      - listUserSessions()

Afternoon (4h):
- [ ] Service層実装
      /lib/services/chat.service.ts
      - セッション管理ロジック
      - メッセージ保存処理
      - 基本的なバリデーション

- [ ] 認証ミドルウェア統合
      - Clerk認証チェック
      - ユーザーIDの取得
```

**成果物**:
- 基本的なCRUD APIが動作
- データベースへの保存が可能

### Week 2: ストリーミングとAI統合

#### Day 6-7: ストリーミング実装

**月曜日 - 火曜日（11/25-26）**

```typescript
// ストリーミングエンドポイント
// /api/chat/stream/route.ts

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // OpenAI Streaming設定
      const completion = await openai.chat.completions.create({
        model: 'gpt-5-mini',
        messages,
        stream: true,
        temperature: 0.7,
      });

      // チャンクごとの処理
      for await (const chunk of completion) {
        const text = chunk.choices[0]?.delta?.content || '';

        // SSE形式で送信
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            event: 'message',
            data: { chunk: text }
          })}\n\n`)
        );
      }

      // ストリーム終了
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({
          event: 'done'
        })}\n\n`)
      );

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

```
Day 6 Tasks:
- [ ] ストリーミングエンドポイント実装（4h）
- [ ] クライアント側のEventSource実装（2h）
- [ ] エラーハンドリング・再接続ロジック（2h）

Day 7 Tasks:
- [ ] メッセージのチャンク結合処理（2h）
- [ ] タイピングインジケーター連携（2h）
- [ ] ストリーミング中の状態管理（2h）
- [ ] パフォーマンステスト（2h）
```

**成果物**:
- リアルタイムストリーミングが動作
- エラー時の適切なフォールバック

#### Day 8-9: AI処理基礎実装

**水曜日 - 木曜日（11/27-28）**

```typescript
// AI処理サービス
// /lib/services/ai-processor.service.ts

class AIProcessorService {
  async processMessage(content: string, context: Context) {
    // 1. コンテンツ整形
    const formatted = await this.formatContent(content);

    // 2. タグ抽出
    const tags = await this.extractTags(formatted);

    // 3. 基本コメント生成
    const comment = await this.generateComment(formatted, context);

    return { formatted, tags, comment };
  }

  private async formatContent(content: string): Promise<string> {
    // 改行正規化、箇条書き整形、音楽用語統一
    return this.contentFormatter.format(content);
  }

  private async extractTags(content: string): Promise<string[]> {
    // 音楽関連タグの自動抽出
    const musicTags = this.tagExtractor.extractMusicTags(content);
    const actionTags = this.tagExtractor.extractActionTags(content);
    return [...musicTags, ...actionTags];
  }
}
```

```
Day 8 Tasks:
- [ ] ContentFormatter実装（3h）
      - Markdown整形
      - 音楽用語の正規化
      - 時系列情報の構造化

- [ ] TagExtractor実装（3h）
      - 音楽ジャンル検出
      - 楽器名抽出
      - 行動タグ（練習、作曲、学習等）

- [ ] 基本プロンプトテンプレート作成（2h）

Day 9 Tasks:
- [ ] CommentGenerator実装（4h）
      - 励ましコメント
      - 要約コメント
      - 確認コメント

- [ ] AI処理パイプライン統合（2h）
- [ ] レスポンス時間の最適化（2h）
```

**成果物**:
- AI整形・タグ付けが機能
- 基本的なコメント生成が動作

#### Day 10: 統合テストと調整

**金曜日（11/29）**

```
Morning (4h):
- [ ] End-to-End フローテスト
      - ユーザー入力 → AI処理 → DB保存 → 表示
      - セッション切り替えテスト
      - 複数ユーザーでの動作確認

- [ ] パフォーマンス測定
      - First Byte Time < 200ms
      - 完全レスポンス < 3s
      - 同時接続10ユーザー

Afternoon (4h):
- [ ] バグ修正とリファクタリング
- [ ] エラーハンドリング強化
- [ ] ログ出力の整備
- [ ] デモ準備
```

**成果物**:
- MVP機能が一通り動作
- デモ可能な状態

---

## Phase 1.1: AI人格システム（2週間）

### Week 3: プロファイルシステム

#### Day 11-12: データモデルと基礎実装

**月曜日 - 火曜日（12/2-3）**

```
- [ ] user_ai_profiles テーブルマイグレーション
- [ ] UserAIProfileRepository 実装
- [ ] デフォルトプロファイル設定
- [ ] プロファイル設定画面UI
      /app/muednote/settings/page.tsx
```

#### Day 13-15: プリセット人格の実装

**水曜日 - 金曜日（12/4-6）**

```typescript
// 人格プリセット定義
const personalityPresets = {
  friendly_mentor: {
    systemPrompt: "あなたは親しみやすい音楽の先生です...",
    temperature: 0.8,
    traits: ['encouraging', 'patient', 'detailed']
  },
  professional_coach: {
    systemPrompt: "あなたはプロの音楽コーチです...",
    temperature: 0.6,
    traits: ['analytical', 'structured', 'goal-oriented']
  },
  // ...
};
```

```
- [ ] 5つの人格プリセット実装
- [ ] プロンプトテンプレートシステム
- [ ] 人格切り替え機能
- [ ] A/Bテスト準備
```

### Week 4: メモリシステム

#### Day 16-17: メモリストア実装

**月曜日 - 火曜日（12/9-10）**

```
- [ ] user_ai_memories テーブルマイグレーション
- [ ] MemoryStore クラス実装
- [ ] パターン抽出アルゴリズム
- [ ] 信頼度計算ロジック
```

#### Day 18-20: StyleResolver統合

**水曜日 - 金曜日（12/11-13）**

```typescript
class StyleResolver {
  async resolve(context: Context): Promise<ResponseStyle> {
    const profile = await this.getProfile(context.userId);
    const memories = await this.getRecentMemories(context.userId);

    return this.computeStyle(profile, memories, context);
  }
}
```

```
- [ ] StyleResolver実装
- [ ] メモリ減衰アルゴリズム
- [ ] プロファイル×メモリの統合
- [ ] テストケース作成
```

---

## Phase 1.2: 高度なインタラクション（2週間）

### Week 5: 質問・提案システム

#### Day 21-23: 質問生成システム

**月曜日 - 水曜日（12/16-18）**

```
- [ ] QuestionGenerator 実装
- [ ] 質問タイプの分類
- [ ] 頻度制御ロジック
- [ ] コンテキスト適切性判定
```

#### Day 24-25: 提案生成システム

**木曜日 - 金曜日（12/19-20）**

```
- [ ] SuggestionGenerator 実装
- [ ] 知識グラフ連携
- [ ] 提案の優先度付け
- [ ] ユーザーフィードバック収集
```

### Week 6: MUED本体との連携

#### Day 26-27: 人格共有API

**月曜日 - 火曜日（12/23-24）**

```
- [ ] 共有API設計・実装
      GET /api/shared/user-profile
      GET /api/shared/user-memories

- [ ] MUED本体側の統合準備
- [ ] データ同期メカニズム
```

#### Day 28-30: 統合テスト

**水曜日 - 金曜日（12/25-27）**

```
- [ ] MUEDnote → MUED本体の人格共有テスト
- [ ] パフォーマンステスト
- [ ] セキュリティ監査
- [ ] ドキュメント作成
```

---

## Phase 1.3: 商用化準備（2週間）

### Week 7: 決済システム統合

#### Day 31-33: Stripe実装

**月曜日 - 水曜日（12/30-1/1）**

```
- [ ] Stripeサブスクリプション設定
- [ ] 料金プラン実装（月額1,000円）
- [ ] 決済フロー実装
- [ ] 領収書発行機能
```

#### Day 34-35: 使用制限実装

**木曜日 - 金曜日（1/2-3）**

```
- [ ] 無料プラン制限（100メッセージ/月）
- [ ] 有料プラン（無制限）
- [ ] 使用量トラッキング
- [ ] 制限到達時のUI
```

### Week 8: 品質保証とローンチ

#### Day 36-38: 最終テスト

**月曜日 - 水曜日（1/6-8）**

```
- [ ] 負荷テスト（100同時接続）
- [ ] セキュリティペネトレーションテスト
- [ ] ユーザビリティテスト（10名）
- [ ] バグ修正
```

#### Day 39-40: ローンチ準備

**木曜日 - 金曜日（1/9-10）**

```
- [ ] プロダクション環境設定
- [ ] モニタリング設定（Sentry, Analytics）
- [ ] ランディングページ作成
- [ ] ベータユーザー招待
```

---

## リソース配分

### 人員配置

| 役割 | 担当範囲 | 工数配分 |
|------|---------|----------|
| **フルスタック開発者** | UI実装、API開発、DB設計 | 100% |
| **AIエンジニア** | プロンプト設計、メモリシステム | Phase 1.1から参加 |
| **QAエンジニア** | テスト設計、品質保証 | Phase 1.2から参加 |
| **プロダクトマネージャー** | 要件定義、進捗管理 | 20% |

### 技術スタック詳細

```yaml
Development:
  IDE: Cursor / VS Code
  Version Control: Git (feature branch workflow)
  Package Manager: npm
  Testing: Vitest + Playwright

Frontend:
  Framework: Next.js 15.5.4
  UI Components: shadcn/ui
  State: Zustand + React Query
  Streaming: EventSource API

Backend:
  Runtime: Node.js 20 LTS
  API: Next.js API Routes (Edge Runtime)
  Database: Neon PostgreSQL
  ORM: Drizzle

AI/ML:
  Primary: OpenAI GPT-5-mini
  Fallback: GPT-4-turbo
  Development: Claude via MCP

Infrastructure:
  Hosting: Vercel
  CDN: Vercel Edge Network
  Monitoring: Sentry + Vercel Analytics
  Payment: Stripe
```

---

## 成功指標とKPI

### Phase 1.0 完了時点（2週間後）

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| 基本機能動作 | 100% | E2Eテスト |
| レスポンス速度 | < 3秒 | Performance測定 |
| クラッシュ率 | < 1% | エラーログ |
| デモ可能性 | Yes | 内部レビュー |

### Phase 1.1 完了時点（4週間後）

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| AI人格一貫性 | 80% | A/Bテスト |
| メモリ精度 | 70% | サンプリング評価 |
| ユーザー満足度 | 4.0/5.0 | アンケート |

### Phase 1.2 完了時点（6週間後）

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| 質問適切性 | 75% | ユーザーフィードバック |
| 提案採用率 | 30% | クリック率 |
| MUED連携成功率 | 95% | ログ分析 |

### Phase 1.3 完了時点（8週間後）

| 指標 | 目標値 | 測定方法 |
|------|--------|----------|
| ベータユーザー数 | 50名 | 登録数 |
| 有料転換率 | 10% | Stripe データ |
| NPS スコア | 40+ | アンケート |
| システム稼働率 | 99.5% | Uptime監視 |

---

## リスク管理

### 技術リスクと対策

| リスク | 影響 | 確率 | 対策 | 責任者 |
|--------|------|------|------|--------|
| ストリーミング不安定 | 高 | 中 | Vercel AI SDK採用、フォールバック実装 | Tech Lead |
| AI APIコスト超過 | 高 | 中 | レート制限、キャッシング、使用量モニタリング | AI Engineer |
| DB性能劣化 | 中 | 低 | インデックス最適化、コネクションプーリング | Backend Dev |
| メモリ肥大化 | 中 | 中 | 定期的なガベージコレクション、上限設定 | AI Engineer |

### ビジネスリスクと対策

| リスク | 影響 | 確率 | 対策 | 責任者 |
|--------|------|------|------|--------|
| 低い有料転換率 | 高 | 中 | 価格A/Bテスト、付加価値機能追加 | Product Manager |
| 競合サービス出現 | 中 | 高 | 差別化機能の迅速な追加、音楽特化の強化 | CEO |
| MUED本体との混同 | 低 | 中 | 明確なブランディング、別ドメイン検討 | Marketing |

### スケジュールリスクと対策

| リスク | 影響 | 確率 | 対策 | 責任者 |
|--------|------|------|------|--------|
| Phase 1.0遅延 | 高 | 低 | バッファ期間設定、スコープ調整可能性 | Project Manager |
| 年末年始の生産性低下 | 中 | 高 | 事前の作業前倒し、リモート体制強化 | Team Lead |
| 外部依存の遅延 | 低 | 低 | 代替案準備、並行作業計画 | Tech Lead |

---

## コミュニケーション計画

### 定例会議

| 会議名 | 頻度 | 参加者 | 目的 |
|--------|------|--------|------|
| デイリースタンドアップ | 毎日 | 開発チーム | 進捗共有、ブロッカー解消 |
| ウィークリーレビュー | 週1 | 全員 | デモ、フィードバック |
| スプリント計画 | 2週間 | 開発チーム + PM | 次スプリントの計画 |
| ステークホルダー報告 | 月1 | PM + 経営層 | 進捗報告、意思決定 |

### ドキュメント管理

```
/docs/muednote/
  ├── architecture/      # アーキテクチャ設計書
  ├── api/              # API仕様書
  ├── deployment/       # デプロイメント手順
  ├── testing/          # テスト計画・結果
  └── meeting-notes/    # 議事録
```

### 進捗管理ツール

- **タスク管理**: GitHub Projects
- **コミュニケーション**: Slack (#muednote-dev)
- **ドキュメント**: Notion
- **デザイン**: Figma

---

## 次のアクション（今週中）

### 即時実行（今日）

1. **プロジェクトキックオフ**
   - [ ] チームへの計画共有
   - [ ] 開発環境の準備開始
   - [ ] 最初のコミット

### 今週中（11/20-24）

1. **技術検証**
   - [ ] Vercel AI SDK の動作確認
   - [ ] ストリーミングのPoC作成
   - [ ] データベーススキーマのレビュー

2. **チーム編成**
   - [ ] 役割分担の最終確認
   - [ ] スキルギャップの特定
   - [ ] 必要に応じて外部支援検討

3. **環境準備**
   - [ ] 開発環境の統一
   - [ ] CI/CDパイプライン設定
   - [ ] モニタリングツールの準備

---

## 付録

### A. 依存関係詳細

```json
{
  "dependencies": {
    "@ai-sdk/openai": "^0.0.24",
    "@clerk/nextjs": "^5.0.0",
    "@neondatabase/serverless": "^0.9.0",
    "drizzle-orm": "^0.32.0",
    "next": "15.5.4",
    "react": "^19.0.0",
    "react-query": "^5.0.0",
    "socket.io-client": "^4.7.0",
    "stripe": "^14.0.0",
    "zustand": "^4.5.0"
  }
}
```

### B. 環境変数テンプレート

```bash
# AI Configuration
OPENAI_API_KEY_MUEDNOTE=sk-...
OPENAI_MODEL_CHAT=gpt-5-mini
OPENAI_MODEL_FALLBACK=gpt-4-turbo

# Database
DATABASE_URL=postgresql://...

# Authentication
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature Flags
MUEDNOTE_ENABLED=true
MUEDNOTE_STREAMING_ENABLED=true
MUEDNOTE_AI_PERSONALITY_ENABLED=false
MUEDNOTE_PAYMENT_ENABLED=false

# Monitoring
SENTRY_DSN=https://...
VERCEL_ANALYTICS_ID=...
```

### C. 緊急連絡先

| 役割 | 担当者 | 連絡先 | 対応時間 |
|------|--------|--------|----------|
| Tech Lead | - | - | 24/7 |
| Product Owner | - | - | Business hours |
| DevOps | - | - | On-call |
| Emergency | - | - | 24/7 |

---

**ドキュメント終了**

最終更新: 2025-11-19
次回レビュー: 2025-11-25（Week 1完了時）