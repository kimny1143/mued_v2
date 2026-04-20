# Phase 4: Hoo応答言語 i18n — 実装前調査 (2026-04-20)

## サマリー

Hooシステムは現在完全JA固定。localeパラメータはAPIチェーン上どこにも存在しない。
EN対応には約530行のプロンプトテキスト + ツール説明3件 + UI fallback文字列15-20件の翻訳が必要。

---

## 1. プロンプト構成

### ファイルマップ

| ファイル | 行数 | 役割 |
|---------|------|------|
| `lib/ai/prompts/dial.ts` | 743 | MUEDial完全プロンプト。ツール定義含む |
| `lib/ai/prompts/hoo-dial-core.ts` | 78 | MUEDial人格ブロック (HOO_CHARACTER/NON_TECHNICAL_RULE/FEEDBACK_COLLECTION) |
| `lib/ai/prompts/hoo.ts` | 350 | Hoo共通プロンプトビルダー (MUEDnote向け中心) |

### エントリポイント

```typescript
// lib/ai/prompts/dial.ts:693
export function buildDialSystemPrompt(input: DialPromptInput): string
```

`DialPromptInput` には現在 `locale` フィールドなし。

### JA固有表現（翻訳要）

- `ほほう` (Hoo署名フレーズ) — hoo.ts:35-38
- `そういうことか` `なるほど` — hoo.ts:32
- `【論点】【結論】【次のアクション】` 等のブロック記法 — hoo.ts:49-63
- `前に出す` `モコモコする` `キラキラ感` — dial.ts:249-256 (感覚的描写、EN recast必要)
- フィードバック収集文 — hoo-dial-core.ts:15-78

### ツール定義 (全3件、説明文がJA)

1. `set_musical_style` — dial.ts:77-98
2. `propose_mix_action` — dial.ts:104-156  
3. `propose_mastering_action` — dial.ts:203-222

ツール名・パラメータ名・enum値は API contract のためそのまま維持。descriptionのみ翻訳。

---

## 2. Chat API Route

### ファイル: `app/api/dial/chat/route.ts` (421行)

```typescript
// 現在のスキーマ (line 52-55)
const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(5000),
  // locale: なし
});

// プロンプト呼び出し (line 176)
let systemPrompt = buildDialSystemPrompt(promptInput);

// AIコール (line 232)
const aiResponse = await sendHooChat('claude-sonnet-4', chatMessages, { systemPrompt, tools });
```

JA固定のfallback文字列が route.ts:319-346 に約15件ある。

---

## 3. クライアントサイド

### fetch呼び出し (chat-panel.tsx:190-194)

```typescript
body: JSON.stringify({ sessionId, message })  // localeなし
```

`useLocale()` は既にクライアントで使用中。`locale` 値はあるが送信していない。

---

## 4. 実装変更箇所リスト

### 変更量の大きいもの (JA→EN prompt作成)
- `lib/ai/prompts/dial.ts` — ~400行のJAプロンプト本文をEN版に
- `lib/ai/prompts/hoo-dial-core.ts` — 3ブロックのEN版
- ツール説明3件のEN化

### 変更量の小さいもの (locale wire-up)
1. `app/api/dial/chat/route.ts`: `locale` パラメータ追加、cookie/body fallback、prompt分岐
2. `lib/ai/prompts/dial.ts`: `buildDialSystemPrompt` が `locale` を受け取る
3. `components/dial/chat-panel.tsx`: fetch bodyに `locale` 追加
4. `components/dial/v2/chat.tsx`: 同上
5. route.ts:319-346: JA fallback文字列のEN分岐

### 推奨ファイル構成

**案A (推奨):** locale引数を既存関数に追加し、内部でJA/EN切り替え
```
lib/ai/prompts/dial.ts — buildDialSystemPrompt(input, locale)
lib/ai/prompts/hoo-dial-core.ts — HOO_* をlocale別に返す関数
```

**案B:** EN用ファイルを別途作成
```
lib/ai/prompts/dial-en.ts — buildDialSystemPromptEN(input)
```

案Aの方が保守性高い。

---

## 5. 確認事項

- **EN promptの「自然な英語UX」**: kimny/conductorによる英語レビューが品質担保に必要
- `ほほう` のEN equivalent: "Hmm…" / "I see" / "Interesting" — どれが適切か要指示
- `前に出す` `キラキラ感` 等の感覚語: "bring it forward" / "add sparkle" 等のEN慣用表現リストがあれば

---

*調査: mued課 · 2026-04-20 · conductor実装承認待ち*
