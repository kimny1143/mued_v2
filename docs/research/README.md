# Research Documentation

このディレクトリには、MUED LMS v2 の技術調査・研究ドキュメントが含まれています。

## 📋 最新の調査 (2025-11-12)

### AI モデル比較調査
- **`openai-vs-claude-comparison.md`** - OpenAI GPT-5系 vs Claude Sonnet 4.5 の包括的比較分析
  - 総合評価: Claude 48/50 (96%), OpenAI 43/50 (86%)
  - 推奨: ハイブリッドアプローチ（本番: OpenAI GPT-5系、開発: Claude MCP）

- **`gemini-music-generation-research.md`** - Google Gemini (Lyria) の音楽生成能力調査
  - 結論: 音声生成のみでABC notation非対応、現時点では不適合

- **`claude-test-materials/`** - Claude Sonnet 4.5 のテストデータと結果
  - テストケース: Dメジャー・6/8拍子・初心者向けギターアルペジオ

### MIDI 関連調査
- **`midi-analysis-367947X.md`** - 業務用MIDIファイル (367947X.mid) の詳細解析
  - 64トラック、480 PPQN、プロフェッショナル制作の実例

- **`midi-llm-investigation-report.md`** - MIDI-LLM統合の可能性調査
  - 結論: vocabulary mismatch により現時点では統合困難

- **`MIDI-LLM-MUED-Integration-Report.md`** - MIDI-LLM と MUED の統合可能性レポート

### その他の研究
- **`ai-mentor-matching-research.md`** - AIメンターマッチング機能の調査
- **`2511.pdf`** - 関連学術論文

## 🎯 主要な意思決定

### 音楽教材生成におけるAIモデル選定 (2025-11-12)

**本番環境**: OpenAI GPT-5系（GPT-5-mini推奨）
- 理由: 安定性、実績、既存統合

**開発・管理者モード**: Claude Sonnet 4.5 (MCP Server)
- 理由: 日本語品質、教育的価値、コスト0円

**不採用**: Google Gemini
- 理由: ABC notation 非対応

**重要**: GPT-4o系は使用しない。必ず GPT-5系を使用すること。

## 📚 関連ドキュメント

- 技術スタック: `/CLAUDE.md`
- 実装詳細: `/scripts/mcp/mued-material-generator-claude.js`
- UI テスト: `/app/test-claude-material/page.tsx`
- 生成されたMIDIファイル: `/docs/smf/`

---

*最終更新: 2025-11-12*
