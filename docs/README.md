# MUEDnote ドキュメント

**最終更新**: 2026-01-19
**ステータス**: v1.0 Production

---

## 概要

MUEDnote は**音楽制作者のためのコンパニオンアプリ**です。

- **iOSアプリ**: 制作中にそばに置き、音声でメモを記録
- **Web Dashboard**: セッションを振り返り、判断の痕跡を資産化
- **LMS**: 内部業務用バックエンド（レッスン・教材管理）

**核心思想**: 「出力はAI、判断と欲は人間」

---

## フォルダ構成

```
docs/
├── README.md              # このファイル
├── PHILOSOPHY.md          # 思想（Difference/Note/Form）
├── CHANGELOG.md           # 変更履歴
│
├── concept/               # 上位理念
│   ├── MUED理念本文_決定稿.md
│   └── 実装指針_三層構造.md
│
├── muednote/              # MUEDnote（公開プロダクト）
│   ├── specs/             # 仕様書
│   ├── daw/               # DAW連携
│   ├── mvp/               # MVP開発ログ
│   └── handoff/           # 引き継ぎメモ
│
├── lms-internal/          # LMS内部バックエンド
│   └── *.md               # API・機能仕様
│
├── guides/                # 開発ガイド
│   ├── TESTING_GUIDE.md   # テスト
│   ├── database-operations.md
│   ├── environment-variables.md
│   ├── mcp-*.md           # MCP関連
│   └── typescript-strict-rules.md
│
├── interview/             # インタビュー記事（公開予定）
│   ├── mued_interview.md
│   └── hoo_interview.md
│
├── prompt/                # Hooプロンプト
│   ├── hoo_core_prompt_level1.md
│   └── hoo_extended_prompt_level2.md
│
├── business/              # ビジネス文書
│   ├── Hoo/               # マスコット企画
│   └── AIconvasation/     # AI戦略議論
│
└── archive/               # 過去のドキュメント
```

---

## クイックリンク

| カテゴリ | ドキュメント | 説明 |
|---------|-------------|------|
| **思想** | [PHILOSOPHY.md](PHILOSOPHY.md) | Difference/Note/Form |
| **思想** | [concept/MUED理念本文_決定稿.md](concept/MUED理念本文_決定稿.md) | 「出力はAI、判断と欲は人間」 |
| **MUEDnote** | [muednote/specs/](muednote/specs/) | iOS仕様書 |
| **MUEDnote** | [muednote/handoff/](muednote/handoff/) | 引き継ぎメモ |
| **開発** | [guides/TESTING_GUIDE.md](guides/TESTING_GUIDE.md) | テスト戦略 |
| **開発** | [guides/database-operations.md](guides/database-operations.md) | DB運用 |

---

## 開発者向けクイックスタート

```bash
# 開発環境
npm install
cp .env.local.example .env.local
npm run dev

# テスト
npm run test           # ユニットテスト
npm run test:e2e       # E2E テスト
npm run typecheck      # 型チェック
```

詳細: [../CLAUDE.md](../CLAUDE.md)

---

*最終更新: 2026-01-19*
