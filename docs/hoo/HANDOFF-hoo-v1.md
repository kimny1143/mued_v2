# Hoo v1 本番リリース - 引き継ぎ文書

**作成日**: 2026-01-20
**最終更新**: 2026-01-20
**ブランチ**: `feature/hoo-v1`
**ワークツリー**: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2-hoo`

---

> **📁 mainマージ後の対応**
>
> このファイルはmainブランチにマージ後、以下のコマンドで移動してください:
> ```bash
> mv HANDOFF-hoo-v1.md docs/hoo/
> git add . && git commit -m "docs: move HANDOFF-hoo-v1.md to docs/hoo/"
> ```

---

## 利用プラン仕様

| プラン | 月間会話数 | ターン制限 | 備考 |
|--------|-----------|-----------|------|
| **Free** | 0 | - | テンプレート応答のみ |
| **Basic** | 30回/月 | ソフト10、ハード30 | 延長時+1会話消費 |
| **Premium** | 無制限 | なし | BYOK |

### ターン制限の仕組み

- **ソフトリミット (10ターン)**: 超過で+1会話消費、アラート表示
- **ハードリミット (30ターン)**: 会話終了、新規会話を促す
- **延長**: 10ターンごとに+1会話消費（最大30ターンまで）

---

## 実装済み機能

### Phase 1: 安定性確保 ✅

#### 1-1. タイムアウト処理
- **全AIプロバイダーに2分タイムアウトを追加**
- `AbortController` を使用してハングアップを防止
- タイムアウト時は「AI request timeout after 2 minutes」エラーを返す

**変更ファイル:**
- `lib/ai/providers/claude.ts` - L51-88
- `lib/ai/providers/openai.ts` - L44-83
- `lib/ai/providers/gemini.ts` - L43-97
- `app/api/hoo/chat/route.ts` - タイムアウトエラーハンドリング

#### 1-2. 会話再開機能
- **履歴ページから会話をクリックすると再開可能**
- URL: `/dashboard/muednote/hoo?id={conversationId}`
- `useSearchParams` でIDを読み取り、APIから会話を取得
- Suspenseでラップして適切にローディング表示

**変更ファイル:**
- `app/dashboard/muednote/hoo/page.tsx` - 全体をリファクタリング

### Phase 2: UX改善 ✅

#### 2-1. 自動タイトル生成
- **新規会話の初回AI応答後にタイトルを自動生成**
- Claude Haiku 4.5 を使用（コスト: 約0.01円/回）
- ユーザーの言語でタイトルを生成（日本語/英語）
- 非同期で実行するためレスポンス速度に影響なし

**変更ファイル:**
- `lib/ai/providers/index.ts` - `generateConversationTitle()` 関数追加
- `lib/ai/providers/claude.ts` - `systemPrompt` オプション追加
- `app/api/hoo/chat/route.ts` - タイトル生成呼び出し（デバッグログ付き）
- `app/api/hoo/conversations/[id]/route.ts` - 既存会話のタイトル生成（同期処理）

#### 2-2. 既存会話のタイトル更新
- **履歴から会話を開いた際、タイトルがない場合は自動生成**
- 同期処理でレスポンス前にタイトルを生成
- 履歴に戻った際にすぐ反映される

### Phase 3: 使用制限・ターン管理 ✅ (NEW)

#### 3-1. 会話数制限の調整
- **150会話/月 → 30会話/月に変更**
- コスト採算性を考慮した調整

**変更ファイル:**
- `lib/repositories/subscriptions.repository.ts` - `TIER_LIMITS` 変更

#### 3-2. ターン制限の実装
- **ソフトリミット (10ターン)**: 超過で追加会話消費
- **ハードリミット (30ターン)**: 会話終了
- **累進課金**: 10ターンごとに+1会話消費

**変更ファイル:**
- `lib/repositories/subscriptions.repository.ts` - `TURN_LIMITS` 定数追加
- `app/api/hoo/chat/route.ts` - ターン制限ロジック追加
- `app/dashboard/muednote/hoo/page.tsx` - ターン情報UI追加

### Phase 4: テスト ✅

#### 4-1. E2Eテスト
- **14個のテストケースを作成**

**新規ファイル:**
- `e2e/hoo.spec.ts`

**テストケース:**
1. チャットUI表示
2. 利用状況バナー表示
3. クイックプロンプト表示
4. 履歴ページ遷移
5. メッセージ送信・ユーザーメッセージ表示
6. Enterキーで送信
7. Shift+Enterで改行
8. 新規ボタン表示
9. 会話リセット
10. 履歴ページ表示
11. チャットへ戻るナビゲーション
12. 空状態表示
13. URL パラメータから会話読み込み
14. クイックプロンプト送信

### Phase 5: Hooメモリ機能 ✅ (NEW)

#### 5-1. カスタム指示機能
- **ユーザーが「Hooに知っておいて欲しいこと」を設定可能**
- 設定内容は全Hoo会話のシステムプロンプトに自動挿入
- 有効/無効の切り替え可能
- 最大2000文字

**新規ファイル:**
- `db/schema/hoo-memories.ts` - スキーマ定義
- `lib/repositories/hoo-memories.repository.ts` - CRUD操作
- `app/api/hoo/memory/route.ts` - GET/POST API
- `app/api/hoo/memory/toggle/route.ts` - PATCH API
- `app/dashboard/settings/page.tsx` - 設定ページ

**変更ファイル:**
- `db/schema.ts` - hoo-memoriesエクスポート追加
- `lib/ai/hoo-prompt.ts` - `getHooSystemPromptWithMemory()` 関数追加
- `app/api/hoo/chat/route.ts` - カスタム指示統合
- `lib/repositories/index.ts` - エクスポート追加

#### 5-2. ナビゲーション改善
- **Settingsタブを実際の設定ページに変更**（旧: subscription直リンク）
- **ヘッダーに「Manage Plan」ボタン追加**
- **Hooページに設定リンク追加**

**変更ファイル:**
- `components/layouts/muednote-tabs.tsx` - Settings href変更
- `components/layouts/muednote-header.tsx` - Manage Planボタン追加
- `lib/i18n/translations.ts` - managePlan翻訳追加
- `app/dashboard/muednote/hoo/page.tsx` - 設定リンク追加

---

## 検証状況

| 項目 | 結果 |
|------|------|
| `npm run build` | ✅ 成功 |
| `npm run typecheck` | ⚠️ 要確認 |
| `npm run lint` | ⚠️ 要確認 |
| ローカル動作確認 | ✅ 完了 |
| AI応答 | ✅ 正常動作 |
| 履歴・再開機能 | ✅ 正常動作 |
| E2Eテスト実行 | ⚠️ 未実行 |

### ローカルテスト結果 (2026-01-20)

詳細: `docs/hoo/hoo-v1-local-test-report.md`

- **AI応答品質**: ⭐⭐⭐⭐⭐（文脈理解、まとめ機能良好）
- **パフォーマンス**: 1〜4秒、許容範囲
- **コスト**: 6ターンで約$0.013（約2円）

---

## 修正したバグ

| バグ | 原因 | 修正 |
|-----|------|------|
| "Invalid Request Format" | `conversationId: null` がzodで拒否 | L176: スプレッド構文で除外 |

---

## 次のステップ

### 1. ビルド・型チェック確認
```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2-hoo
npm run build
npm run typecheck
```

### 2. 自動タイトル生成の検証
新規会話を開始し、サーバーログで以下を確認:
- `Generated title` ログ
- `Title saved` ログ

### 3. E2Eテスト実行
```bash
npm run test:e2e -- e2e/hoo.spec.ts
```

### 4. コミット・プッシュ
```bash
git add .
git commit -m "feat(hoo): add turn limits and usage tracking

- Change Basic tier from 150 to 30 conversations/month
- Add soft limit (10 turns) and hard limit (30 turns) per conversation
- Add progressive billing: +1 conversation per 10 turns extension
- Add turn info UI with alerts and warnings
- Fix conversationId null validation error
- Add debug logging for title generation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

git push origin feature/hoo-v1
```

### 5. PR作成
- base: `main`
- compare: `feature/hoo-v1`

---

## 変更ファイル一覧

### 編集

| ファイル | 変更内容 |
|----------|----------|
| `lib/ai/providers/claude.ts` | タイムアウト追加、systemPromptオプション追加 |
| `lib/ai/providers/openai.ts` | タイムアウト追加 |
| `lib/ai/providers/gemini.ts` | タイムアウト追加 |
| `lib/ai/providers/index.ts` | `generateConversationTitle()` 関数追加 |
| `lib/repositories/subscriptions.repository.ts` | TIER_LIMITS変更、TURN_LIMITS追加 |
| `lib/repositories/sessions.repository.ts` | セッションコンテキスト取得メソッド追加 |
| `lib/repositories/index.ts` | hooMemoriesRepositoryエクスポート追加 |
| `lib/ai/hoo-prompt.ts` | `getHooSystemPromptWithMemory()` 関数追加 |
| `lib/i18n/translations.ts` | managePlan翻訳追加 |
| `db/schema.ts` | hoo-memoriesスキーマエクスポート追加 |
| `app/api/hoo/chat/route.ts` | ターン制限ロジック、カスタム指示統合 |
| `app/api/hoo/conversations/[id]/route.ts` | 既存会話のタイトル同期生成 |
| `app/dashboard/muednote/hoo/page.tsx` | 会話再開、ターン情報UI、設定リンク追加 |
| `components/layouts/muednote-tabs.tsx` | Settings href変更 |
| `components/layouts/muednote-header.tsx` | Manage Planボタン追加 |

### 新規作成

| ファイル | 内容 |
|----------|------|
| `e2e/hoo.spec.ts` | E2Eテスト（14ケース） |
| `docs/hoo/hoo-v1-local-test-report.md` | ローカルテストレポート |
| `db/schema/hoo-memories.ts` | Hooメモリテーブルスキーマ |
| `db/migrations/0007_many_magdalene.sql` | hoo_memoriesマイグレーション |
| `lib/repositories/hoo-memories.repository.ts` | メモリCRUD Repository |
| `app/api/hoo/memory/route.ts` | メモリ設定 GET/POST API |
| `app/api/hoo/memory/toggle/route.ts` | メモリ有効/無効切替 API |
| `app/api/hoo/sessions/context/route.ts` | セッションコンテキスト API |
| `app/dashboard/settings/page.tsx` | 設定ページ（Hoo設定 + アカウント情報） |

---

## 注意事項

1. **mainブランチには同じ変更がある** - mainから変更を取り消す必要あり
2. **開発サーバーはworktreeで起動すること** - `mued_v2-hoo` ディレクトリで `npm run dev -p 3001`
3. **ANTHROPIC_API_KEY** - `.env.local` に設定されていることを確認
4. **自動タイトル生成** - 検証中、サーバーログで確認

---

*この文書は Claude Code によって自動生成されました*
