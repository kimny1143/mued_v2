# MUEDnote Spotlight Input MVP 検証レポート

**作成日**: 2025-12-02
**対象文書**: `muednote_spotlight_mvp_spec_v1.0.md`（旧: `[GPT5]muednote_additional_plan_v_6_1.md`）
**検証担当**: アーキテクト / 文書担当 / テスト担当 エージェント

---

## 総合評価

| 観点 | 評価 | 判定 |
|------|------|------|
| 技術的実現可能性 | 高い（70%既存実装あり） | **実装可能** |
| 仕様書完成度 | 中程度（一部不足あり） | **要追記** |
| テスト戦略 | 実現可能（制約あり） | **対応可能** |

**結論**: MVP実装は**技術的に可能**。既存のTauriプロジェクト（apps/muednote-v3）をベースに、追加開発で実現できる。

---

## 1. アーキテクト検証結果

### 1.1 既存実装の優位性

現在の `apps/muednote-v3/` には、MVP仕様の**約70%が既に実装済み**：

| 機能 | 状態 | 実装箇所 |
|------|------|----------|
| グローバルホットキー (Cmd+Shift+Space) | 実装済み | `src-tauri/src/lib.rs:243` |
| 1行入力バー | 実装済み | `src/components/FragmentInput.tsx` |
| Fragment送信処理 | 実装済み | `src-tauri/src/lib.rs:54-136` |
| DB接続 | 実装済み | `sqlx`経由でNeon PostgreSQL |

### 1.2 追加実装が必要な項目

| 項目 | 工数目安 | 技術的難易度 |
|------|---------|-------------|
| System Tray（メニューバー常駐） | 2日 | 低 |
| Dockアイコン非表示 | 0.5日 | 低 |
| MUED LMS API連携 | 2日 | 低 |
| デバイストークン管理 | 1日 | 中 |

### 1.3 カーソル位置取得について

- Tauri 2.0.0-beta.17以降で `cursor_position` メソッドが追加
- **課題**: マルチモニター環境での不安定性が報告されている
- **MVP推奨**: 画面中央固定表示（既存実装）で開始し、Phase 2でカーソル追従を検討

### 1.4 既存API連携

`/api/muednote/fragments`（POST）が既に存在：
- Clerk認証 または 開発トークン認証
- Fragment作成・更新・削除
- プロジェクト・タグ連携

### 1.5 推奨フェーズ分け

| Phase | 主要タスク |
|-------|-----------|
| **Phase 1: MVP Core** | System Tray, LMS API連携, Dock非表示 |
| **Phase 2: UX改善** | カーソル追従, オフライン対応 |
| **Phase 3: 高度な機能** | contextHint自動検出, AI整形プレビュー |

### 1.6 技術的リスク

| リスク | 軽減策 |
|--------|--------|
| macOSアクセシビリティ権限 | 初回起動時のガイダンスUI |
| カーソル位置不安定性 | 画面中央固定で代替 |
| オフライン時のデータロス | ローカルキュー実装 |

---

## 2. 文書担当検証結果

### 2.1 既存ドキュメントとの整合性

**関連する既存文書**:
- `muednote_additional_plan_v_6_1.md`（v6.1マスタープラン）
- 歴史的文書（v3.0〜v5.0、Gemini/GPT5バリアント）

**整合性チェック結果**:
- 基本思想はv6.1マスタープランと一致
- **不一致発見**: UI消滅速度
  - 新文書: 0.15〜0.25秒
  - 既存: 0.1秒以内
  - **要統一**

### 2.2 仕様書の不足項目

| 項目 | 重要度 | 備考 |
|------|--------|------|
| 「0.5秒の壁」パフォーマンス要件 | 高 | マスタープランの核心概念 |
| DAWフォーカス復帰仕様 | 高 | 音楽制作ワークフローに必須 |
| 認証方式の詳細 | 中 | Clerk連携 or デバイストークン |
| オフライン対応仕様 | 中 | モバイル制作環境向け |
| エラーリカバリー詳細 | 低 | MVPでは簡素でOK |

### 2.3 ドキュメント体系への提案

**ファイル命名**:
- 現在: `[GPT5]muednote_additional_plan_v_6_1.md`
- 推奨: `muednote_spotlight_mvp_spec_v1.0.md`
- 理由: 角括弧はファイルシステムやURL処理で問題になる可能性

**アーカイブ推奨**:
- 歴史的文書（v3.0〜v5.0、Gemini/GPT5バリアント）は `docs/business/MUEDnote/archive/` へ移動

**追記推奨セクション**:
1. パフォーマンス要件（0.5秒の壁）
2. 認証・セキュリティ詳細
3. 既存Tauriプロジェクトとの関係

---

## 3. テスト担当検証結果

### 3.1 現在のテスト構成

**apps/muednote-v3 の状況**:
- テストインフラ: **未整備**
- フロントエンド: 4ファイル（React/TypeScript）
- バックエンド: Rust（6つのTauriコマンド）
- Tauri 2.9.2 + global-shortcut プラグイン

**プロジェクト全体**:
- Vitest（ユニット/統合テスト）: 既存
- Playwright（E2E）: 既存（Web版MUEDnoteテストあり）
- Testcontainers: DB統合テスト用

### 3.2 推奨テスト戦略

| テスト種別 | アプローチ | 優先度 |
|-----------|----------|--------|
| フロントエンドUnit | Vitest + Tauri mocks (`@tauri-apps/api/mocks`) | **最高** |
| バックエンドUnit | cargo test + sqlx test helpers | 高 |
| 統合テスト | Vitest + Testcontainers | 高 |
| E2E (Web) | Playwright + Vite dev server | 中 |
| E2E (Desktop) | 手動テスト（macOS WebDriver未対応のため） | 低 |

### 3.3 重大な制約事項

1. **macOS WebDriver未対応**: デスクトップE2Eテストの自動化が困難
   - 出典: [Tauri公式ドキュメント](https://v2.tauri.app/develop/tests/)
2. **グローバルホットキーテスト**: 手動検証が必要
3. **ウィンドウ位置制御**: プラットフォーム依存、自動化困難

### 3.4 テストケース設計（主要項目）

**ホットキー機能**:
- [ ] Cmd+Shift+Space で入力バー表示
- [ ] 他アプリにフォーカス時の動作
- [ ] 複数回連続呼び出し時の動作

**入力バーUI**:
- [ ] 表示位置（画面中央 or カーソル付近）
- [ ] サイズ（幅400〜480px、高さ36px）
- [ ] 5秒無操作でフェードアウト
- [ ] フェードアウト速度（0.15〜0.25秒）

**API通信**:
- [ ] Enter押下で正常送信
- [ ] Escape押下でキャンセル
- [ ] 送信データ形式（text, timestamp, contextHint）
- [ ] エラー時のトースト表示

**常駐動作**:
- [ ] メニューバーアイコン表示
- [ ] Dockアイコン非表示
- [ ] アイドル時のCPU/メモリ使用量

### 3.5 カバレッジ目標

| コンポーネント | 目標 |
|---------------|------|
| FragmentInput.tsx | 90% |
| App.tsx | 80% |
| tauri.ts | 100% |
| lib.rs（テスト可能部分） | 70% |

### 3.6 テスト実装フェーズ

1. **Phase 1**: muednote-v3にVitest追加、FragmentInput.tsx・ユーティリティのテスト
2. **Phase 2**: Rustユニットテスト + testcontainersでDB統合テスト
3. **Phase 3**: WebモードPlaywright E2E + 手動テストドキュメント化
4. **Phase 4**（オプション）: Linux CI用WebdriverIO検討

---

## 4. 統合提案

### 4.1 即時対応推奨事項

1. **仕様書の更新**:
   - パフォーマンス要件セクション追加（「0.5秒の壁」明記）
   - UI消滅速度を0.1秒以内に統一
   - 認証方式の詳細追記

2. **ファイル整理**: **完了**
   - `[GPT5]muednote_additional_plan_v_6_1.md` → `muednote_spotlight_mvp_spec_v1.0.md` （リネーム済み）
   - 歴史的文書のアーカイブ化 （`docs/business/MUEDnote/archive/` に移動済み）

3. **テスト基盤構築**:
   - apps/muednote-v3 にVitest導入
   - 手動テストチェックリスト作成

### 4.2 MVP実装ロードマップ

```
Week 1: 基盤整備
├── 仕様書更新・確定
├── テスト基盤構築（Vitest導入）
└── System Tray実装

Week 2: コア機能
├── Dockアイコン非表示
├── MUED LMS API連携
└── デバイストークン管理

Week 3: 品質保証
├── ユニットテスト作成
├── 統合テスト実施
└── 手動テスト（ホットキー、常駐動作）

Week 4: リリース準備
├── パフォーマンス検証
├── macOS権限ガイダンスUI
└── ドキュメント整備
```

---

## 5. 参考リソース

### 作成されたドキュメント

- `/docs/architecture/muednote-spotlight-mvp-feasibility-report.md`（アーキテクト詳細レポート）
- `/docs/testing/muednote-spotlight-test-strategy.md`（テスト戦略詳細）

### 外部リソース

- [Tauri v2 Testing Documentation](https://v2.tauri.app/develop/tests/)
- [Mocking Tauri APIs](https://v2.tauri.app/develop/tests/mocking/)
- [WebdriverIO Example](https://v2.tauri.app/develop/tests/webdriver/example/webdriverio/)

---

## 6. 結論

**MUEDnote Spotlight Input MVP は実装可能**です。

- 既存のTauriプロジェクト（apps/muednote-v3）に約70%の実装があり、追加開発で実現可能
- 仕様書に一部不足があるが、致命的ではなく追記で対応可能
- テスト戦略はデスクトップE2Eの自動化制約があるが、手動テストとユニットテストでカバー可能

**次のアクション**: 仕様書の更新・確定後、Phase 1（System Tray、API連携）から実装開始を推奨。
