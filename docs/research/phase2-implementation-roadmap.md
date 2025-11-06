# Phase 2: MIDI/MusicXML対応 - 実装ロードマップ

**作成日**: 2025-01-06
**目的**: Phase 2技術リサーチの統合と実装計画の策定

---

## 概要

MUED LMSのIntermediate/Advanced教材向けに、MIDI/MusicXML対応を実装する。現在のABC記法の制約（単旋律のみ）を克服し、オーケストラ・バンド編成などのマルチトラック教材に対応する。

**基本方針**: 「我々は制約を受け入れない」

---

## 技術リサーチ完了（2025-01-06）

### ✅ Step 1: MIDI/MusicXML生成技術調査

**ドキュメント**: [phase2-midi-musicxml-research.md](./phase2-midi-musicxml-research.md)

**主要な結論**:
- **MIDI生成**: MidiWriterJS（推奨）⭐⭐⭐⭐⭐
  - マルチトラック対応
  - TypeScript型定義あり
  - VexFlowからのエクスポート対応
- **MusicXML生成**: stringsync/musicxml（推奨、API不安定に注意）⭐⭐⭐⭐
  - TypeScript実装
  - プログラマティックな構築
- **AI生成アプローチ**: OpenAI GPT-4 → JSON中間フォーマット → MIDI/MusicXML
  - AIが直接MIDIバイナリ生成は不可（OpenAI Structured OutputsはJSONのみ）
  - JSON → MIDI変換が現実的

**アーキテクチャ提案**:
```
OpenAI GPT-4 → Structured JSON → MidiWriterJS → MIDI File
                                ↘ stringsync/musicxml → MusicXML
```

---

### ✅ Step 2: フロントエンド表示方法調査

**ドキュメント**: [phase2-frontend-display-research.md](./phase2-frontend-display-research.md)

**主要な結論**:
- **MusicXML表示**: OpenSheetMusicDisplay (OSMD)（推奨）⭐⭐⭐⭐⭐
  - TypeScript実装、React統合が容易
  - WebGLで30-60%高速化（大規模スコア）
  - アクティブ開発中（2025年8月最終更新）
- **MIDI再生**: Tone.js + @tonejs/Midi（推奨）⭐⭐⭐⭐⭐
  - 音楽制作向けAPI
  - デスクトップ・モバイル対応
  - エフェクト・音色カスタマイズ可能

**React統合戦略**:
- React.lazy + Suspense による遅延読み込み
- ルートベースのコード分割
- 大規模ライブラリの最適化

---

## 実装フェーズ

### Phase 2.1: 基盤整備（2週間）

**目標**: バックエンドのMIDI/MusicXML生成機能実装

#### タスク

1. **DBスキーマ拡張** (2日)
   - [ ] マイグレーションファイル作成
   - [ ] `materials`テーブルに以下フィールド追加:
     ```typescript
     contentFormat: text  // 'abc' | 'multi-track-json'
     midiFile: bytea | text(base64)
     musicXmlFile: text
     renderConfig: jsonb
     ```
   - [ ] テストデータ投入

2. **MidiWriterJS統合** (3日)
   - [ ] パッケージインストール: `npm install midi-writer-js`
   - [ ] JSON → MIDI変換ユーティリティ作成
     - ファイル: `lib/utils/midi-generator.ts`
   - [ ] マルチトラック対応確認
   - [ ] ユニットテスト作成

3. **stringsync/musicxml統合** (3日)
   - [ ] パッケージインストール: `npm install @stringsync/musicxml`
   - [ ] JSON → MusicXML変換ユーティリティ作成
     - ファイル: `lib/utils/musicxml-generator.ts`
   - [ ] 和声ヴォイシング対応
   - [ ] ユニットテスト作成

4. **JSON中間フォーマット定義** (2日)
   - [ ] TypeScriptインターフェース作成
     ```typescript
     interface MultiTrackJSON {
       tracks: Array<{
         instrument: string;
         notes: Array<{
           pitch: string;      // "D4"
           duration: string;   // "quarter"
           velocity: number;   // 0-127
           time: number;       // 絶対時間（秒）
         }>;
       }>;
       tempo: number;
       timeSignature: string;
       keySignature: string;
     }
     ```
   - [ ] バリデーションスキーマ（Zod）
   - [ ] サンプルJSON作成（テスト用）

5. **変換ロジック実装** (4日)
   - [ ] `lib/services/music-converter.service.ts` 作成
   - [ ] JSON → MIDI変換関数
   - [ ] JSON → MusicXML変換関数
   - [ ] エラーハンドリング
   - [ ] 統合テスト

**成果物**:
- ✅ DB拡張完了
- ✅ MIDI/MusicXML生成機能実装
- ✅ ユニット・統合テスト合格

---

### Phase 2.2: AI生成拡張（1週間）

**目標**: OpenAI APIでマルチトラックJSON生成

#### タスク

1. **プロンプト改良** (2日)
   - [ ] `lib/services/ai-material.service.ts` のMUSIC_PROMPT更新
   - [ ] マルチトラックJSON生成用プロンプト追加
   - [ ] 難易度別の制約明記（Beginner=ABC、Inter/Adv=JSON）
   - [ ] サンプル出力例を含める

2. **バリデーション強化** (2日)
   - [ ] JSON出力の構造検証
   - [ ] 音域チェック（楽器別）
   - [ ] 和声バランス検証
   - [ ] エラー時のフォールバック処理

3. **テスト教材生成** (3日)
   - [ ] Intermediate: 2-3トラック（例: Violin I/II + Cello）
   - [ ] Advanced: 5トラック（例: 弦楽五重奏）
   - [ ] 品質評価（音楽的妥当性）
   - [ ] ユーザーテスト（社内）

**成果物**:
- ✅ マルチトラックJSON生成プロンプト
- ✅ バリデーション機能実装
- ✅ テスト教材5件以上

---

### Phase 2.3: フロントエンド実装（2週間）

**目標**: ブラウザでのMIDI/MusicXML表示・再生

#### タスク

1. **OSMD統合（MusicXML表示）** (4日)
   - [ ] パッケージインストール: `npm install opensheetmusicdisplay`
   - [ ] コンポーネント作成: `components/features/materials/musicxml-display.tsx`
   - [ ] React統合（useEffect, useRef）
   - [ ] 遅延読み込み（React.lazy + Suspense）
   - [ ] パフォーマンステスト（100小節のスコア）
   - [ ] WebGL vs SVG比較

2. **Tone.js統合（MIDI再生）** (4日)
   - [ ] パッケージインストール: `npm install tone @tonejs/midi`
   - [ ] コンポーネント作成: `components/features/materials/midi-player.tsx`
   - [ ] React統合（useState, useEffect）
   - [ ] ユーザーインタラクション対応（Tone.start()）
   - [ ] 再生コントロール（Play/Stop/Pause）
   - [ ] モバイルブラウザテスト

3. **統合コンポーネント作成** (3日)
   - [ ] `components/features/materials/multi-track-music-display.tsx`
   - [ ] フォーマット判定ロジック（ABC vs JSON）
   - [ ] 表示モード切替（MIDI / MusicXML / Both）
   - [ ] レイアウト調整（2カラム）

4. **ダウンロード機能** (2日)
   - [ ] MIDIファイルダウンロードボタン
   - [ ] MusicXMLファイルダウンロードボタン
   - [ ] Blob API使用

5. **UI/UX調整** (1日)
   - [ ] ローディング状態の視覚化
   - [ ] エラーメッセージ改善
   - [ ] レスポンシブデザイン確認

**成果物**:
- ✅ MusicXML表示機能
- ✅ MIDI再生機能
- ✅ ダウンロード機能
- ✅ デスクトップブラウザで快適動作

---

### Phase 2.4: テスト＆改善（1週間）

**目標**: 品質保証と最適化

#### タスク

1. **E2Eテスト** (2日)
   - [ ] Playwrightテスト作成
     - マルチトラック教材生成
     - MusicXML表示
     - MIDI再生
   - [ ] スモークテスト（主要機能）

2. **パフォーマンス最適化** (2日)
   - [ ] Lighthouse CI実行
   - [ ] バンドルサイズ確認
   - [ ] 遅延読み込み効果測定
   - [ ] 初回ロード時間 < 3秒（目標）

3. **ドキュメント作成** (2日)
   - [ ] ユーザーガイド（教材作成方法）
   - [ ] 技術ドキュメント（アーキテクチャ）
   - [ ] トラブルシューティングガイド

4. **バグフィックス** (1日)
   - [ ] 発見された問題の修正
   - [ ] リグレッションテスト

**成果物**:
- ✅ E2Eテスト合格
- ✅ パフォーマンス目標達成
- ✅ ドキュメント完備

---

## 総所要期間

**合計**: 約6週間（1.5ヶ月）

| フェーズ | 期間 | 主要成果物 |
|---------|------|-----------|
| Phase 2.1 | 2週間 | MIDI/MusicXML生成機能 |
| Phase 2.2 | 1週間 | AI生成プロンプト |
| Phase 2.3 | 2週間 | フロントエンド表示・再生 |
| Phase 2.4 | 1週間 | テスト・最適化 |

---

## リスク管理

### 高リスク

1. **stringsync/musicxml API不安定**
   - リスク: ブレーキングチェンジ、ドキュメント不足
   - 対策: 代替策として`musicxml-interfaces`を調査
   - コンティンジェンシー: XML文字列直接生成に切り替え

2. **OSMD大規模スコアのパフォーマンス**
   - リスク: 200小節超で初期ロード15秒以上
   - 対策: ページング表示、遅延読み込み
   - コンティンジェンシー: サーバーサイドレンダリング検討

### 中リスク

3. **AI生成JSONの品質**
   - リスク: 音楽理論的に不正なJSON生成
   - 対策: バリデーション強化、サンプル出力をプロンプトに含める
   - コンティンジェンシー: 人間による品質チェックフロー導入

4. **ブラウザ互換性（WebGL）**
   - リスク: Safari/Firefoxで遅い
   - 対策: ブラウザ検出 → SVGフォールバック
   - コンティンジェンシー: Canvasレンダリング固定

### 低リスク

5. **モバイルブラウザのWeb Audio APIレイテンシ**
   - リスク: 音声再生の遅延
   - 対策: Tone.jsのモバイル最適化機能活用
   - コンティンジェンシー: モバイルは表示のみ（再生は非対応）と割り切る

---

## 成功基準

### 技術的成功基準

- ✅ マルチトラック教材（5トラック）の生成が成功
- ✅ MusicXMLスコア（100小節）が5秒以内に表示
- ✅ MIDI再生がクリック後1秒以内に開始
- ✅ 初回ロード時間が既存（ABC）と同等以下
- ✅ ユニット・統合・E2Eテスト合格率95%以上

### ビジネス的成功基準

- ✅ Intermediate教材の生成数が10%増加（Phase 2実装後1ヶ月）
- ✅ Advanced教材の利用率が5%増加
- ✅ ユーザーフィードバックスコア4.0以上（5段階）

### ユーザビリティ基準

- ✅ 教材生成成功率90%以上（エラー率10%以下）
- ✅ MusicXML/MIDIダウンロード機能の利用率20%以上
- ✅ サポート問い合わせ0件（技術的問題）

---

## 次のステップ

### 即時実行可能（今週）

1. **Phase 2.1のキックオフ**
   - [ ] DBマイグレーション計画策定
   - [ ] MidiWriterJS/stringsync/musicxmlのPoC開始
   - [ ] JSON中間フォーマット仕様ドラフト作成

2. **プロジェクト管理準備**
   - [ ] GitHub Projectsでタスク管理開始
   - [ ] 週次進捗レビュー設定
   - [ ] チーム内キックオフミーティング

### 中期（2週間後）

- Phase 2.1完了確認
- Phase 2.2開始
- AI生成テスト教材の初期レビュー

### 長期（6週間後）

- Phase 2.4完了
- 本番環境デプロイ
- ユーザーへのアナウンス

---

## 参考資料

### 技術リサーチドキュメント

1. [phase2-midi-musicxml-research.md](./phase2-midi-musicxml-research.md) - MIDI/MusicXML生成技術調査
2. [phase2-frontend-display-research.md](./phase2-frontend-display-research.md) - フロントエンド表示方法調査

### 外部リンク

- [MidiWriterJS GitHub](https://github.com/grimmdude/MidiWriterJS)
- [stringsync/musicxml GitHub](https://github.com/stringsync/musicxml)
- [OpenSheetMusicDisplay](https://opensheetmusicdisplay.org/)
- [Tone.js](https://tonejs.github.io/)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)

---

**最終更新**: 2025-01-06
**ステータス**: Phase 2.1 準備中
**次回レビュー**: Phase 2.1 完了時（2週間後）
