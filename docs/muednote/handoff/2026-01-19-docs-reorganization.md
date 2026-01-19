# MUEDnote ドキュメント整理 & i18n対応 - 作業サマリー

**日付**: 2026-01-19
**担当**: Claude Opus 4.5

---

## 1. ドキュメント構造の大規模再編

### Before: 35+ フォルダ（複雑・散在）
### After: 10 カテゴリ（整理済み）

```
docs/
├── README.md, PHILOSOPHY.md, CHANGELOG.md
├── concept/           # 上位理念
├── muednote/          # 公開プロダクト仕様
│   ├── specs/
│   ├── daw/           # DAW連携（実装完了）
│   │   ├── research/  # PoC調査資料
│   │   └── ...
│   ├── mvp/
│   └── handoff/
├── interview/         # インタビュー記事（公開予定）
├── prompt/            # Hooプロンプト
├── lms-internal/      # 内部バックエンド仕様
├── guides/            # 開発ガイド統合
├── business/          # ビジネス文書
│   ├── Hoo/
│   └── AIconvasation/
└── archive/           # 過去のドキュメント
```

### 主な作業
- 2026年1月以降のファイルをアーカイブから復元
- DAW関連ドキュメントを `research/` サブフォルダに分離
- 不要ファイル削除（policy TSX、crashlog等）
- PHILOSOPHY.md を v2.0 に更新

---

## 2. Gitリポジトリのプライベート化

### 理由
- AIコードレビューのニーズ減少
- 商用プロダクトとしてコード・戦略の保護
- docs内に機密文書（ビジネス計画、インタビュー等）

### 対応
- GitHubでリポジトリをPrivateに変更
- `docs/sounds/` を `.gitignore` に追加（音声テストファイル）

---

## 3. Privacy / Support ページの多言語対応

### 実装方式
- **サブパスルーティング**: `/ja/privacy`, `/en/privacy`, `/ja/support`, `/en/support`
- **next-intl** 使用（ランディングページと同一パターン）
- **ダークテーマ**: サイト全体のデザインに統一

### FAQ 拡充（2件 → 8件）
1. 音声認識の問題
2. セッション保存の問題
3. 文字起こし精度
4. 休憩リマインダー
5. ログインの問題
6. データ削除
7. オフライン利用
8. 対応デバイス・OS要件

### レガシーパスのリダイレクト
```typescript
// next.config.ts
async redirects() {
  return [
    { source: '/privacy', destination: '/en/privacy', permanent: true },
    { source: '/support', destination: '/en/support', permanent: true },
  ];
}
```

---

## 4. コミット履歴

| コミット | 内容 |
|---------|------|
| `1f92f114` | docs: reorganize documentation structure |
| `88a7c356` | fix: move legal components to proper location |
| `b0570714` | feat(i18n): add subpath-based privacy and support pages |
| `81666044` | fix: add redirects for legacy /privacy and /support paths |

---

## 5. 残タスク・メモ

- `docs/audio/`, `docs/sounds/` - ユーザー確認用にローカル保持（Git非管理）
- DAW連携 - 実装完了、v1.1.0でUI有効化予定
- LMS機能 - 内部バックエンドとして維持

---

*作成: 2026-01-19*
