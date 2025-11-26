# 音楽教材生成 AI モデル運用方針

## 基本方針

| 用途 | モデル | 理由 |
|-----|-------|------|
| **複雑な判断・分析** | GPT-5系 | 推論能力が必要 |
| **単純生成・会話** | GPT-4.1系 | max token節約、コスト効率 |
| **開発/テスト** | Claude (MCP経由) | 日本語品質、教育的コンテンツ |

**重要: GPT-4o, o3, o4-mini は使用禁止**

---

## 推論モデル vs 非推論モデル

### 使い分けの基準

| 種別 | モデル | 特徴 | 適した用途 |
|-----|-------|------|----------|
| **推論** | GPT-5, GPT-5.1 | 深い思考、複雑な判断 | 音楽教材生成、分析 |
| **非推論** | GPT-4.1-mini | シンプル、高速、低コスト | 会話、単純生成 |

### 注意点

- **GPT-5系を単純生成に使うとmax tokenが飽和する**
- MUEDnoteの会話機能など単純なタスクには GPT-4.1系を使用
- 複雑な音楽理論の分析や教材生成には GPT-5系を使用

---

## 本番環境での使い分け

### 音楽教材生成（複雑）

```
モデル: gpt-5 または gpt-5.1
理由: 音楽理論の理解、ABC notation生成に推論能力が必要
```

### 会話・単純生成

```
モデル: gpt-4.1-mini
理由: max token節約、コスト効率、レスポンス速度
```

### 実装パス

- API エンドポイント: `/api/materials/generate`
- 環境変数: `OPENAI_API_KEY` (`.env.local`)

### 使用方法

1. `/teacher/materials/new` にアクセス
2. レベル・楽器・ジャンルを選択
3. 「生成」ボタンをクリック
4. ABC notation、MIDI、学習ポイントが自動生成

---

## 開発・管理者モード（Claude）

### 選定理由

- 日本語の自然さが優秀
- 段階的な練習指示が詳細
- Claude Code定額プランで追加コスト0円
- 高品質な教育的コンテンツ生成

### 実装パス

- MCP Server: `/scripts/mcp/mued-material-generator-claude.js`
- Claude Desktop 経由で実行
- テストページ: `/app/test-claude-material`

### 使用方法

1. Claude Desktop を起動
2. MCP ツール `generate_music_material_claude` を使用
3. パラメータ指定：
   ```javascript
   {
     level: "beginner",
     instrument: "guitar",
     genre: "classical",
     length: "medium",
     specificRequest: "Dメジャーのアルペジオ練習曲"
   }
   ```

---

## モデル比較結果（2025-11-12 評価）

**テストケース**: Dメジャー・6/8拍子・初心者向けギターアルペジオ練習曲

| 評価項目 | OpenAI | Claude | 優位 |
|---------|--------|--------|------|
| ABC記法の正確性 | 5/5 | 5/5 | 同等 |
| 音楽理論的妥当性 | 5/5 | 5/5 | 同等 |
| 教育的価値 | 4/5 | 5/5 | Claude |
| 日本語の自然さ | 1/5 | 5/5 | Claude |
| 練習指示の明確さ | 3/5 | 5/5 | Claude |
| コスト効率 | 4/5 | 5/5 | Claude |
| 生成速度 | 5/5 | 4/5 | OpenAI |
| UI統合の容易さ | 5/5 | 4/5 | OpenAI |
| 実績・安定性 | 5/5 | 4/5 | OpenAI |

**総合スコア:**
- OpenAI: 43/50 (86%)
- Claude: 48/50 (96%)

---

## Claude の優位性

1. **日本語品質**: 初心者にも理解しやすい平易な日本語
   - 例: "まず各コード(D、G、A7)の形を確認し、ゆっくりと押さえる練習をしましょう"

2. **段階的な練習指示**: テンポ設定が具体的
   - テンポ60（ゆっくり）→ 80 → 100 → 120（全曲通し）

3. **教育的配慮**: 励ましの言葉と具体的なアドバイス
   - "録音して自分の演奏を聴き返すと、改善点が見つかります"

---

## 注意事項

1. **環境変数の管理**: `OPENAI_API_KEY` と `ANTHROPIC_API_KEY` は `.env.local` で管理
2. **MCP Server の dotenv 禁止**: dotenv v17 の console 出力が JSON-RPC を破壊するため、手動パースを使用
3. **UI データ形式**: `type: 'music'` フィールド必須、`learningPoints` と `practiceInstructions` は string[] 型

---

## 関連ファイル

- Claude MCP Server: `/scripts/mcp/mued-material-generator-claude.js`
- OpenAI API: `/app/api/materials/generate/route.ts`
- テストページ: `/app/test-claude-material/page.tsx`
