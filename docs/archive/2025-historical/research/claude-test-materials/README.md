# Claude Test Materials

このディレクトリには、Claude Sonnet 4.5 のテストと評価に使用したデータが含まれています。

## ファイル一覧

### テスト結果
- `claude-sonnet-test-result.md` - Claude Sonnet 4.5 による音楽教材生成のテスト結果

### サンプルデータ
- `spring_brook_d_major_arpeggio.json` - Claude が生成した教材データ（メタデータ含む詳細版）
- `spring_brook_d_major_arpeggio_ui_compatible.json` - UI 互換フォーマット版
- `spring_brook_d_major_arpeggio.md` - 生成された教材の可読版

## テスト概要

**テストケース**: Dメジャー・6/8拍子・初心者向けギターアルペジオ練習曲

**生成日**: 2025-11-12

**使用モデル**: Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

**実装**: MCP Server (`/scripts/mcp/mued-material-generator-claude.js`)

## 関連ドキュメント

- 比較分析: `/docs/research/openai-vs-claude-comparison.md`
- MCP Server 実装: `/scripts/mcp/mued-material-generator-claude.js`
- UI テストページ: `/app/test-claude-material/page.tsx`

## 結論

Claude は教育的価値と日本語品質で優れているが、本番環境では OpenAI GPT-5系を使用し、開発・管理者モードで Claude を活用するハイブリッド戦略を採用。
