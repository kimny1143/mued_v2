# MUEDnote DAW連携

**最終更新**: 2026-01-19
**ステータス**: 実装完了（v1.1.0でUI有効化予定）

---

## 概要

Ableton Live のパラメータ変更を OSC 経由でキャプチャし、MUEDnoteセッションと時間マッチングで統合表示する機能。

## 実装状況

### 完了済み

| コンポーネント | ファイル | 状態 |
|---------------|----------|------|
| **API** | `app/api/muednote/daw-log/route.ts` | ✅ 単体・バッチPOST、認証対応 |
| **Repository** | `lib/repositories/daw-logs.repository.ts` | ✅ CRUD完備 |
| **Time-Matcher** | `lib/services/daw-session-matcher.service.ts` | ✅ セッション紐付け |
| **CLI Listener** | `scripts/daw-hub/index.ts` | ✅ ポーリング、デバウンス、リトライ |
| **DBスキーマ** | `db/schema/muednote-daw-logs.ts` | ✅ マイグレーション済み |
| **ユニットテスト** | `tests/unit/repositories/daw-logs.repository.test.ts` | ✅ |

### Dashboard UI

| 画面 | 状態 | 備考 |
|------|------|------|
| セッション詳細 | ✅ 有効 | Voice/DAW/Combinedタブ |
| セッション一覧 | ✅ 有効 | DAWログ数バッジ表示 |
| MUEDnoteトップ | 🔜 v1.1.0 | DAW Logsタブ（コメントアウト中） |

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| `full-scope.md` | フルスコープ・将来構想 |
| `fabfilter-integration.md` | FabFilter Pro-Q対応 |
| `HANDOFF-2025-12-30.md` | 引き継ぎメモ |
| `research/` | PoC調査資料（Ableton OSC, MIDI, Pro Tools等） |

## 使い方

```bash
# CLI起動（開発環境）
cd scripts/daw-hub
npx tsx index.ts

# 本番環境
DAW_HUB_API_URL=https://mued.jp/api/muednote/daw-log \
DAW_HUB_API_KEY=your_key \
npx tsx index.ts
```

詳細: `scripts/daw-hub/README.md`

## 将来対応

- **Pro Tools**: PTSL API調査済み、優先度低
- **Logic Pro**: OSC対応なし、将来検討
- **MIDI汎用**: IAC Driver経由、将来検討
