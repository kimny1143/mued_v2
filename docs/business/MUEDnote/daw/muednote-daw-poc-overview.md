# MUEDnote DAW連携 PoC 概要

**作成日**: 2025-12-30
**ステータス**: PoC完了

---

## 1. 目的

MUEDnoteモバイルアプリの練習セッションと、DAWでの操作ログを連携させ、セッション振り返り時にDAWでの作業内容を確認できるようにする。

---

## 2. PoC ドキュメント一覧

| ドキュメント | 内容 | 状態 |
|-------------|------|------|
| [poc-ableton-osc.md](./poc-ableton-osc.md) | Ableton Live OSC連携 | ✅ 完了 |
| [poc-protools-ptsl.md](./poc-protools-ptsl.md) | Pro Tools PTSL SDK連携 | ✅ 完了（制限あり） |
| [poc-midi-iac.md](./poc-midi-iac.md) | MIDI IAC Driver（共通） | ✅ 完了 |
| [digital-performer-osc-reference.md](./digital-performer-osc-reference.md) | Digital Performer OSC資料 | 📋 資料収集済み |

---

## 3. DAW比較

### 3.1 プラグインパラメータ取得

| DAW | API/プロトコル | プラグインパラメータ | 備考 |
|-----|---------------|-------------------|------|
| **Ableton Live** | Python API + OSC | ✅ フルアクセス | PoC実証済み |
| **Digital Performer** | OSC | ✅ 期待大 | 要PoC |
| **Logic Pro** | OSC (Control Surface) | ⚠️ 16パラメータ上限 | 制限あり |
| **Cubase** | MIDI Remote API (JS) | ⚠️ 8コントロール/ページ | 制限あり |
| **Pro Tools** | PTSL SDK / EUCON | ❌ 不可 | SDK未実装/非公開 |

### 3.2 機能別対応状況

| 機能 | Ableton | Pro Tools | DP (予想) |
|-----|---------|-----------|-----------|
| フェーダー/Vol | ✅ OSC | ❌ SDK未実装 | ✅ OSC |
| Pan | ✅ OSC | ❌ SDK未実装 | ✅ OSC |
| EQ/Compパラメータ | ✅ OSC | ❌ | ✅ OSC |
| トランスポート | ✅ OSC | ✅ PTSL | ✅ OSC |
| Mute/Solo | ✅ OSC | ✅ PTSL Events | ✅ OSC |
| MIDI演奏 | ✅ IAC | ✅ IAC | ✅ IAC |

---

## 4. ターゲット戦略

### 4.1 ユースケース別

| ユースケース | 推奨DAW | 理由 |
|-------------|---------|------|
| **MUEDnote（音楽学習）** | Ableton, Logic | 学習者に人気、API開放的 |
| **カラオケMIDI制作** | Digital Performer | 主要DAW、OSC対応 |
| **プロミキシング** | (対象外) | ログ公開への抵抗感 |

### 4.2 優先度

| 優先度 | DAW | 理由 |
|-------|-----|------|
| 🥇 | **Ableton Live** | 実証済み、フルアクセス |
| 🥈 | **Digital Performer** | OSCでフルアクセスの可能性、受託事業連携 |
| 🥉 | Logic Pro / Cubase | 制限あり（パラメータ数上限） |
| ❌ | Pro Tools | 現状不可能、ターゲット外 |

---

## 5. 技術アーキテクチャ

### 5.1 MUEDnote Hub（macOS Menu Bar App）

```
┌─────────────────────────────────────────────────────────────┐
│                   MUEDnote Hub (Swift)                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ OSC Service │  │ MIDI Service│  │ PTSL Service (opt) │  │
│  │ (OSCKit)    │  │ (CoreMIDI)  │  │ (gRPC)             │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          ▼                                  │
│                   ┌─────────────┐                           │
│                   │ Log Manager │                           │
│                   └──────┬──────┘                           │
│                          │                                  │
│                          ▼                                  │
│                   ┌─────────────┐                           │
│                   │ API Client  │                           │
│                   └─────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
               ┌──────────────────────┐
               │ MUED API Server      │
               │ POST /api/muednote/  │
               │      daw-log         │
               └──────────────────────┘
```

### 5.2 主要コンポーネント

| ファイル | 役割 |
|---------|------|
| `OSCReceiverService.swift` | OSC送受信、ポーリング、変化検出 |
| `MIDIReceiverService.swift` | CoreMIDI受信、Note/CC/PitchBend解析 |
| `MenuBarView.swift` | メニューバーUI |
| `SettingsView.swift` | 設定画面（API URL、認証） |

---

## 6. 本番化に向けた改善点

### 6.1 高優先度

| 項目 | 内容 |
|-----|------|
| API送信実装 | OSC/MIDIログを実際のMUED APIへPOST |
| 収録状態監視 | 収録中はMIDIログをスキップ |
| デバッグログ無効化 | `#if DEBUG`でラップ |

### 6.2 中優先度

| 項目 | 内容 |
|-----|------|
| maxParamsPerDevice増加 | 8 → 16〜32 |
| ログローテーション | ファイルサイズ制限 |
| 非同期I/O | DispatchQueueでバックグラウンド処理 |
| デバイス名取得 | パラメータ名と合わせて表示 |

### 6.3 将来検討

| 項目 | 内容 |
|-----|------|
| Digital Performer PoC | OSC接続テスト |
| プラグイン固有OSC | Pianoteq等の対応検討 |
| Logic Pro対応 | Control Surface OSC検証 |

---

## 7. 結論

### 7.1 PoC成功項目

**Ableton Live (OSC):**
- ✅ エフェクトプラグインパラメータ検出（標準/サードパーティ）
- ✅ トラックVolume/Pan検出
- ✅ ポーリング方式による安定した監視

**MIDI (共通):**
- ✅ Note On/Off、ベロシティ、CC、Pitch Bend
- ✅ IAC Driver経由でDAW共通対応

**Pro Tools (PTSL):**
- ✅ トランスポート状態、トラック状態変化

### 7.2 制限事項

**Pro Tools:**
- ❌ フェーダー/プラグインパラメータはSDK未実装

**Ableton:**
- ⚠️ サードパーティインストゥルメントはOn/Offのみ

### 7.3 総評

**MUEDnoteのDAW連携はAbleton Liveをメインターゲットとすべき。**

Digital Performerは受託事業（カラオケMIDI制作）との連携で追加の価値がある。

Pro Toolsはプロエンジニア向けでターゲット外であり、技術的にも制限が大きい。

---

## 変更履歴

| 日付 | 内容 |
|-----|------|
| 2025-12-30 | ドキュメント分割、概要作成 |
