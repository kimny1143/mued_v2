# Claude Material Generator - 開発者ガイド

**バージョン:** 1.0.0
**作成日:** 2025-11-12
**目的:** Claude で音楽教材を生成し、OpenAI 実装と比較検証

---

## 🎯 プロジェクト方針

### Production (本番環境)
- **モデル:** OpenAI GPT-4o-mini
- **用途:** ユーザー向け教材生成
- **理由:** 実績あり、安定動作、CoMT 対応

### Development (開発・検証環境)
- **モデル:** Claude Sonnet 4.5 / Haiku
- **用途:** 管理者・開発モード専用
- **理由:** MIDI バイナリ処理が得意、文書生成品質が高い、Claude Code 定額プラン活用

### Future (将来的に)
- **検証結果次第:** Claude Haiku をユーザー向けに採用検討
- **条件:** CoMT プロンプトで高品質な ABC notation 生成が可能であること

---

## 📦 セットアップ

### 1. 依存関係インストール

```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2
npm install @anthropic-ai/sdk
```

### 2. Claude Desktop 設定

設定ファイルは既に更新済み：
```
/Users/kimny/Library/Application Support/Claude/claude_desktop_config.json
```

```json
{
  "mcpServers": {
    "mued_material_generator_claude": {
      "command": "node",
      "args": ["/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-material-generator-claude.js"]
    }
  }
}
```

### 3. Claude Desktop 再起動

設定を反映させるために Claude Desktop を再起動してください。

---

## 🚀 使い方

### Tool 1: `generate_music_material_claude`

**教材を生成するメインツール**

#### Claude Desktop での使用例

Claude Desktop で以下のように依頼してください：

```
「generate_music_material_claude ツールを使って、
初心者向けのギターアルペジオ練習曲を生成して。
ジャンルはクラシックで、長さは中程度。
Dメジャー、6/8拍子でお願いします。」
```

#### パラメータ

| パラメータ | 必須 | 選択肢 | デフォルト | 説明 |
|-----------|------|--------|-----------|------|
| `level` | ✅ | beginner / intermediate / advanced | beginner | 生徒のレベル |
| `instrument` | ✅ | guitar / piano / violin / flute / clarinet / saxophone | guitar | 対象楽器 |
| `genre` | ❌ | classical / jazz / pop / folk / blues / rock | classical | 音楽ジャンル |
| `length` | ❌ | short / medium / long | medium | 曲の長さ |
| `specificRequest` | ❌ | (任意のテキスト) | - | 特定の要求 |

#### 出力フォーマット

```json
{
  "title": "煌めく分散和音：Dメジャーの6/8ギター・エチュード",
  "description": "初心者向けのアルペジオ練習曲です。",
  "abcNotation": "X:1\nT:Title\nM:6/8\nL:1/8\nK:D\n...",
  "learningPoints": [
    "アルペジオの基本形を習得します",
    "6/8拍子のリズム感を養います",
    "..."
  ],
  "practiceInstructions": [
    "まずはゆっくりとしたテンポで練習してください",
    "各音をしっかりと響かせましょう",
    "..."
  ]
}
```

---

### Tool 2: `test_comt_quality`

**CoMT 品質テスト専用ツール**

#### 使用例

```
「test_comt_quality ツールを使って、
Sonnet モデルの品質をテストして」
```

または Haiku でテスト：

```
「test_comt_quality ツールで、
model パラメータを haiku にしてテストして」
```

#### パラメータ

| パラメータ | 選択肢 | デフォルト | 説明 |
|-----------|--------|-----------|------|
| `model` | sonnet / haiku | sonnet | テストするモデル |

#### 固定テストケース

```javascript
{
  level: "beginner",
  instrument: "guitar",
  genre: "classical",
  length: "medium",
  specificRequest: "Dメジャーのアルペジオ練習曲（6/8拍子）"
}
```

このツールは常に同じパラメータでテストするため、**OpenAI との直接比較**が可能です。

---

## 📊 品質評価基準

### 評価項目チェックリスト

Claude Desktop の出力に対して、以下の項目を確認してください：

#### 1. ABC Notation の妥当性

- [ ] 構文が正しい（ヘッダー情報: X:, T:, M:, L:, K:, Q: が含まれる）
- [ ] 音符が有効な範囲内（楽器の演奏可能範囲）
- [ ] 拍子記号と音符の長さが一致
- [ ] abcjs でレンダリング可能

#### 2. 音楽的品質

- [ ] メロディが自然で覚えやすい
- [ ] 和声進行が音楽理論的に正しい
- [ ] 指定されたジャンルのスタイルに合致
- [ ] 繰り返しパターンが適切（教育的効果）

#### 3. 難易度の適切性

- [ ] 指定されたレベル（beginner/intermediate/advanced）に合致
- [ ] 段階的に難易度が上がる構成
- [ ] 初心者が挫折しない範囲

#### 4. 学習ポイント

- [ ] 3-5個の明確なポイント
- [ ] 具体的かつ実践的
- [ ] 音楽理論用語が正しい
- [ ] 日本語が自然

#### 5. 練習指示

- [ ] 3-7個の段階的な指示
- [ ] 具体的で実行可能
- [ ] 初心者にも理解しやすい表現
- [ ] 日本語が自然

---

## 🔬 OpenAI vs Claude 比較テスト

### テスト手順

#### Step 1: OpenAI で生成（既存実装）

MUED LMS の UI から教材を生成：

1. http://localhost:3000/teacher/materials/library にアクセス
2. 「新規作成」→「音楽教材（AI生成）」
3. 以下のパラメータで生成：
   - レベル: 初心者
   - 楽器: ギター
   - ジャンル: クラシック
   - 長さ: 中程度
   - 特定の要求: 「Dメジャーのアルペジオ練習曲（6/8拍子）」

4. 生成結果をコピー → `/docs/research/openai-test-result.json` に保存

#### Step 2: Claude で生成（MCP Server）

Claude Desktop で：

```
「test_comt_quality ツールで Sonnet モデルをテストして。
結果を /docs/research/claude-sonnet-test-result.json に保存して」
```

#### Step 3: Haiku で生成（オプション）

Claude Desktop で：

```
「test_comt_quality ツールで model=haiku でテストして。
結果を /docs/research/claude-haiku-test-result.json に保存して」
```

#### Step 4: 比較分析

以下の観点で比較ドキュメントを作成：

```markdown
# OpenAI vs Claude 教材生成品質比較

## テスト条件
- 日時: 2025-11-12
- テストケース: Dメジャー・6/8拍子・初心者向けギターアルペジオ
- モデル:
  - OpenAI GPT-4o-mini
  - Claude Sonnet 4.5
  - Claude Haiku 3.5 (オプション)

## 比較結果

### 1. ABC Notation 品質

| 項目 | OpenAI | Claude Sonnet | Claude Haiku | 優位 |
|------|--------|---------------|--------------|------|
| 構文の正確性 | ✅ / ❌ | ✅ / ❌ | ✅ / ❌ | - |
| 音楽的自然さ | 5点満点 | 5点満点 | 5点満点 | - |
| ジャンルへの適合 | 5点満点 | 5点満点 | 5点満点 | - |

### 2. 教材テキスト品質

| 項目 | OpenAI | Claude Sonnet | Claude Haiku | 優位 |
|------|--------|---------------|--------------|------|
| 学習ポイント具体性 | 5点満点 | 5点満点 | 5点満点 | - |
| 練習指示の明確さ | 5点満点 | 5点満点 | 5点満点 | - |
| 日本語の自然さ | 5点満点 | 5点満点 | 5点満点 | - |

### 3. コスト比較

| モデル | 入力コスト | 出力コスト | 合計 | 相対値 |
|--------|-----------|-----------|------|--------|
| OpenAI GPT-4o-mini | $X | $Y | $Z | 100% |
| Claude Sonnet 4.5 | $X | $Y | $Z | ?% |
| Claude Haiku 3.5 | $X | $Y | $Z | ?% |

### 4. 生成速度

| モデル | 平均生成時間 | 相対値 |
|--------|-------------|--------|
| OpenAI | X秒 | 100% |
| Claude Sonnet | X秒 | ?% |
| Claude Haiku | X秒 | ?% |

## 結論

(ここに総合評価を記入)

## 推奨事項

- [ ] OpenAI を継続使用
- [ ] Claude Sonnet に移行
- [ ] Claude Haiku に移行
- [ ] ハイブリッド運用（OpenAI + Claude）

理由:
...
```

---

## 🎹 MIDI 調整機能との統合（将来実装）

Claude の強みである MIDI バイナリ処理を活用した拡張機能：

### 実装予定機能

1. **ベロシティカーブ調整**
   - クレッシェンド/デクレッシェンドの自動追加
   - ダイナミクスの最適化

2. **ヒューマナイズ**
   - タイミングの微妙なずれ
   - 機械的な演奏を人間らしく

3. **テンポマップ追加**
   - イントロ/アウトロでのリタルダンド
   - フェルマータの実装

4. **演奏技法の実装**
   - スタッカート、レガート
   - トリル、グリッサンド
   - アルペジオの展開

### MCP Tool 拡張案

```javascript
server.registerTool(
  "enhance_midi_file",
  {
    description: "Enhance generated MIDI file with velocity curves, humanization, and tempo maps",
    inputSchema: {
      midiFilePath: "path/to/file.mid",
      adjustments: {
        velocity: "crescendo | decrescendo | dynamic",
        humanize: "subtle | moderate | strong",
        tempoMap: "ritardando_intro | ritardando_outro | custom"
      }
    }
  },
  async (params) => {
    // Claude がバイナリMIDIを直接編集
    const enhancedMidi = await enhanceMidiFile(params);
    return enhancedMidi;
  }
);
```

---

## 📝 ログとデバッグ

### MCP Server ログ確認

```bash
tail -f "/Users/kimny/Library/Logs/Claude/mcp-server-mued_material_generator_claude.log"
```

### 手動実行（デバッグ用）

```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2
node scripts/mcp/mued-material-generator-claude.js
# Ctrl+C で停止
```

### 環境変数確認

```bash
echo $ANTHROPIC_API_KEY
# 値が表示されればOK
```

---

## 🚨 トラブルシューティング

### Q1: ツールが Claude Desktop に表示されない

**確認事項:**
1. Claude Desktop を再起動したか
2. `claude_desktop_config.json` が正しく編集されているか
3. ファイルパスが正しいか（絶対パス）
4. Node.js がインストールされているか

**確認コマンド:**
```bash
cat "/Users/kimny/Library/Application Support/Claude/claude_desktop_config.json" | jq '.mcpServers.mued_material_generator_claude'
```

### Q2: API Key エラー

**エラー例:**
```
Error: ANTHROPIC_API_KEY environment variable not set
```

**解決:**
```bash
# 環境変数を ~/.zshrc に追加
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.zshrc
source ~/.zshrc

# Claude Desktop を再起動
```

### Q3: JSON パースエラー

**原因:** Claude が JSON 以外のテキストを出力した

**確認:**
```bash
# ログを確認
tail -f "/Users/kimny/Library/Logs/Claude/mcp-server-mued_material_generator_claude.log"
```

**対処:**
- プロンプトを調整（JSON のみ出力するよう指示を強化）
- 手動で ```json ブロックを削除して再パース

---

## 📅 次のステップ

### Phase 1: 品質検証（今すぐ）

1. [ ] Claude Desktop でツールを実行
2. [ ] OpenAI 実装と比較
3. [ ] 比較ドキュメント作成

### Phase 2: Haiku 検証（Sonnet 成功時）

1. [ ] Haiku でテスト実行
2. [ ] コスト vs 品質のトレードオフ評価
3. [ ] ユーザー向け採用可否を判断

### Phase 3: MIDI 調整機能追加（検証成功時）

1. [ ] MIDI バイナリ編集ライブラリ作成
2. [ ] MCP Tool に統合
3. [ ] UI から呼び出し可能に

---

**最終更新:** 2025-11-12
**次回更新:** 品質検証完了後
