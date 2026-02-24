# Chat-based AI Mentor Matching - 実装状況

> 最終更新: 2025-12-10 16:30

## 概要

チャットベースのAIメンターマッチング機能。従来のフォーム入力ではなく、会話形式でユーザーのニーズを段階的に収集し、最適なメンターを提案する。

## 完了した実装

### 1. コア機能 ✅

| 機能 | ファイル | 状態 |
|-----|---------|------|
| チャットUI | `components/features/chat-matching/` | 完了 |
| AIチャットAPI | `app/api/mentor-matching/chat/route.ts` | 完了 |
| メンター検索API | `app/api/mentor-matching/search/route.ts` | 完了 |
| DB永続化 | `db/schema/chat-system.ts`, `db/migrations/0017_*.sql` | 完了 |
| **メンター詳細モーダル** | `mentor-detail-modal.tsx` | **完了 (NEW)** |

### 2. チャットフロー ✅

5つの質問を順番に収集：
1. **学習目標** (learningGoals) - 何を学びたいか
2. **スキルレベル** (skillLevel) - 初心者/中級/上級
3. **希望ジャンル** (preferredGenres) - 音楽ジャンル
4. **希望時間帯** (preferredTimeOfDay) - レッスン可能時間
5. **予算** (budgetRange) - レッスン予算

→ 5項目収集後、自動でメンター検索 → カード表示

### 3. メンター詳細モーダル ✅ (NEW)

**修正内容:**
- 「詳細を見る」クリック → **モーダルが開く**（ページ遷移しない）
- モーダル内でメンターの空きスロットを取得・表示
- スロット選択 → 予約フローへ

**ファイル:**
- `mentor-detail-modal.tsx` - 新規作成
- `chat-matching-panel.tsx` - モーダル統合

**フロー:**
```
メンターカード「詳細を見る」
    ↓
MentorDetailModal 開く
    ↓
/api/lessons?mentorId=xxx&available=true
    ↓
空きスロット一覧表示
    ↓
スロット選択 → 「予約に進む」
    ↓
onMentorSelected → 予約ページへ
```

### 4. 技術的な修正（多数）

**AI出力の正規化:**
- `budgetRange`: 5パターン対応 (`null`, `{}`, `{min:null,max:null}`, `"未定"`, `{min:N,max:N}`)
- `searchCriteria`: AIが省略した場合は `extractedNeeds` から構築
- JSON抽出: 会話テキスト混在時の2段階regex抽出

**Zodスキーマ:**
- `nullableArray`, `nullableString` ヘルパー関数
- `.passthrough()` で予期しないAIフィールドを許容

**UX:**
- IME変換中のEnter送信防止
- Quick Reply: `value` → `label` で自然な日本語表示
- ローディング表示: 「🔍 メンターを検索中...」

### 5. セッション永続化 ✅

```typescript
// chat-matching-panel.tsx
const SESSION_STORAGE_KEY = 'chat-matching-session-id';
const CHAT_STORAGE_KEY = 'chat-matching-data';
```

- タブ切り替えでもチャット履歴が復元される
- DBにも保存（`chat_sessions`, `chat_messages`テーブル）

## 未完了・課題

### P1: AIプロンプト改善（条件変更対応）

**発見した問題:**
ユーザーが「条件に合うメンターがいませんでした」の後に「じゃあギターを練習したい」と方針転換した場合、AIが `extractedNeeds` を更新せずに検索を実行してしまう。

**ログ:**
```
criteria: {
  skillLevel: '初心者',
  learningGoals: [ 'ミックスの基本を習得したい...' ]  // ← ギターに更新されていない
}
```

**修正方針:**
- プロンプトに「ユーザーが条件を変更した場合は `extractedNeeds` をリセット/更新すること」を追加
- または、条件変更を検知したら新規セッションとして扱う

### P2: 予約完了フロー

現状：モーダルで「予約に進む」→ 予約ページに遷移

改善案：
- [ ] チャット内で予約確定まで完結
- [ ] Stripe決済連携をモーダル内で処理
- [ ] 予約完了メッセージをチャットに追加

### P3: その他の改善点

- [ ] 「田中先生がいいです」と言った後、再度検索結果が表示される（AIの判断ミス）
- [ ] メンターに空きスロットがない場合のフォールバック

## ファイル構成

```
components/features/chat-matching/
├── index.ts                    # エクスポート
├── chat-matching-panel.tsx     # メインコンテナ（セッション管理、API呼び出し、モーダル統合）
├── chat-input.tsx              # 入力フィールド（IME対応）
├── chat-message.tsx            # メッセージ表示（Quick Reply、メンターカード）
├── mentor-suggestion-card.tsx  # メンターカードコンポーネント
├── mentor-detail-modal.tsx     # メンター詳細・スロット選択モーダル (NEW)
└── typing-indicator.tsx        # ローディングアニメーション

app/api/mentor-matching/
├── chat/route.ts               # チャットAPI（GPT-5-mini、DB保存）
├── search/route.ts             # メンター検索API（マッチングスコア計算）
└── session/route.ts            # セッションCRUD

db/
├── schema/chat-system.ts       # Drizzleスキーマ
└── migrations/0017_add_mentor_matching_chat.sql  # マイグレーション

types/
├── chat-matching.ts            # チャット関連の型定義
└── matching.ts                 # メンター/学生プロファイル型
```

## トークン使用量（参考）

| セッション | メッセージ数 | 総トークン | 推定コスト |
|-----------|------------|-----------|-----------|
| f83034f3 | 5 | ~7,000 | ~$0.010 |

1メッセージあたり平均 ~1,400トークン（GPT-5-mini）

## 再開時の確認事項

1. `npm run dev` でサーバー起動
2. `/dashboard/lessons` でチャットタブを開く
3. 5つの質問に答える → メンターカード表示
4. 「詳細を見る」クリック → **モーダルが開く**
5. DevToolsのConsoleでログ確認:
   - `[ChatMatchingPanel] Restoring chat from localStorage` → 復元成功
   - `[ChatMatchingPanel] Opening mentor detail modal` → モーダル開く
   - `/api/lessons?mentorId=xxx` → スロット取得

## 関連ドキュメント

- [CLAUDE.md](/CLAUDE.md) - プロジェクト全体のガイド
- [hooks/use-chat-matching.README.md](/hooks/use-chat-matching.README.md) - カスタムフック仕様（未実装）

## 変更履歴

| 日時 | 変更内容 |
|-----|---------|
| 2025-12-10 17:25 | 「新しい会話」ボタン追加。マッチ度70%未満のメンター除外ロジック追加 |
| 2025-12-10 16:30 | メンター詳細モーダル追加。ページ遷移なしでスロット選択可能に |
| 2025-12-10 16:00 | セッション永続化修正（固定localStorage key） |
| 2025-12-10 15:30 | メンター検索結果表示までの全フロー完成 |
