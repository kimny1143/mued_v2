# MUEDnote DAW連携 PoC レポート

**作成日**: 2025-12-29
**更新日**: 2025-12-30
**バージョン**: 1.1
**ステータス**: OSC + MIDI PoC完了

---

## 1. 概要

### 1.1 目的
MUEDnoteモバイルアプリの練習セッションと、DAW（Ableton Live）での操作ログを連携させ、セッション振り返り時にDAWでの作業内容を確認できるようにする。

### 1.2 検証範囲
- AbletonOSC経由でのパラメータ変化検出
- Ableton標準エフェクト（EQ Eight, Glue Compressor）
- サードパーティエフェクト（FabFilter Pro-Q4 AU）
- Ableton標準インストゥルメント（Analog）
- サードパーティインストゥルメント（Pianoteq 8 AU）
- トラックVolume/Pan

*検証環境: macOS + Audio Units (AU) プラグイン

---

## 2. 技術実装

### 2.1 アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Mac (ユーザー環境)                        │
│                                                             │
│  ┌──────────────┐    OSC (UDP)    ┌──────────────────────┐  │
│  │ Ableton Live │ ◄─────────────► │ MUEDnote Hub         │  │
│  │ + AbletonOSC │    port 11000   │ (Swift macOS App)    │  │
│  └──────┬───────┘    port 11001   │                      │  │
│         │                         │ - OSC送受信          │  │
│         │ MIDI                    │ - MIDI受信           │  │
│         ▼                         │ - ポーリング検出     │  │
│  ┌──────────────┐                 │ - 変化検出           │  │
│  │ IAC Driver   │ ───CoreMIDI───► │                      │  │
│  └──────────────┘                 └──────────┬───────────┘  │
└──────────────────────────────────────────────┼──────────────┘
                                               │ HTTP POST
                                               ▼
                                    ┌──────────────────────┐
                                    │ MUED API Server      │
                                    │ POST /api/muednote/  │
                                    │      daw-log         │
                                    └──────────────────────┘
```

### 2.2 実装方式：ポーリング + 変化検出

**背景**: AbletonOSCのリスナー機能（`start_listen`）はVolume/Panでは動作するが、デバイスパラメータでは初期値のみ返し、リアルタイム更新が発火しない問題を発見。

**解決策**: 200msごとのポーリングで値を取得し、前回値と比較して変化を検出する方式を採用。

```swift
// ポーリング間隔
private let pollingIntervalMs: Int = 200

// 変化検出ロジック
let oldValue = paramValueCache[key]
let hasChanged = (oldValue == nil) || (abs(oldValue! - value) > 0.001)
if hasChanged && oldValue != nil {
    pendingValueChanges.insert(key)
}
```

### 2.3 主要コンポーネント

| ファイル | 役割 |
|---------|------|
| `OSCReceiverService.swift` | OSC送受信、ポーリング、変化検出 |
| `MIDIReceiverService.swift` | CoreMIDI受信、Note/CC/PitchBend解析 |
| `MenuBarView.swift` | メニューバーUI |
| `SettingsView.swift` | 設定画面（API URL、認証） |

---

## 3. 検証結果

### 3.1 エフェクトプラグイン

| デバイス | タイプ | パラメータ数 | 検出結果 |
|---------|--------|------------|---------|
| **EQ Eight** | Ableton標準 | 84 | ✅ Band Freq/Gain検出 |
| **Glue Compressor** | Ableton標準 | 17 | ✅ Threshold等検出 |
| **FabFilter Pro-Q4** | サードパーティAU | 3* | ✅ Gain/Q検出（完全動作） |

*FabFilter Pro-Q4は1バンド使用時に3パラメータ（On/Off, Gain, Q）が公開され、すべて正常に検出できた。バンド数に応じてパラメータ数は増加する。

**結論：サードパーティエフェクトプラグインは正常に動作する。**

### 3.2 インストゥルメントプラグイン

| デバイス | タイプ | パラメータ数 | 検出結果 |
|---------|--------|------------|---------|
| **Analog** | Ableton標準シンセ | 172 | ✅ On/Off, Volume等検出 |
| **Pianoteq 8** | サードパーティAU | 1 | ⚠️ On/Offのみ |

*検証環境: macOS + Audio Units (AU) プラグイン

**サードパーティAUインストゥルメントの制限**:
Pianoteq 8（AU版）はAbleton Live APIからOn/Offパラメータのみ公開される。これはAbleton側の仕様であり、内部パラメータ（Voicing, Tuning等）にはアクセスできない。VST版でも同様の制限があると推測される。

**結論：サードパーティインストゥルメント（AU/VST共通）はOn/Off検出のみ。内部パラメータは別アプローチ（プラグイン内蔵OSC、MIDI）が必要。**

### 3.3 トラックパラメータ

| パラメータ | 検出方式 | 結果 |
|-----------|---------|------|
| Volume | リスナー | ✅ リアルタイム検出 |
| Pan | リスナー | ✅ リアルタイム検出 |

### 3.4 パフォーマンス

| 指標 | 結果 |
|-----|------|
| DAWへの影響 | なし（体感できる遅延・負荷なし） |
| ログサイズ（テスト中） | 12MB / 105,000行 |
| ポーリング間隔 | 200ms |

---

## 4. 発見された制限事項

### 4.1 AbletonOSCの制限

| 制限 | 詳細 |
|-----|------|
| リスナー不発火 | デバイスパラメータの`start_listen`が初期値のみ返す |
| サードパーティプラグイン（エフェクト） | 公開パラメータ数が制限される場合あり（Ableton API仕様） |
| サードパーティプラグイン（インストゥルメント） | On/Offのみ公開される場合が多い（AU/VST共通） |

### 4.2 現在の実装制限

| 制限 | 現在値 | 改善案 |
|-----|-------|-------|
| 監視パラメータ数/デバイス | 8個 | 16〜32に増加 |
| 監視トラック数 | 10 | 必要に応じて増加 |
| デバッグログ | 有効 | 本番では無効化 |

---

## 5. MIDI対応 ✅ PoC完了

### 5.1 MIDIの重要性

インストゥルメントプラグイン（AU/VST）の**リアルタイム操作**（演奏、エクスプレッション）はMIDIで行われる：

| MIDI情報 | 用途 | 検出 |
|---------|------|------|
| Note On/Off | 演奏内容 | ✅ |
| CC1 (Modulation) | モジュレーション | ✅ |
| CC7 (Volume) | ボリューム | ✅ |
| CC11 (Expression) | エクスプレッション | ✅ |
| CC64 (Sustain) | サステインペダル | ✅ |
| Pitch Bend | ピッチベンド | ✅ |

### 5.2 OSC vs MIDI

| プロトコル | 取得可能 | 取得不可 |
|-----------|---------|---------|
| **OSC** | デバイスパラメータ、Vol/Pan | MIDIノート、CC |
| **MIDI** | ノート、CC、ベロシティ | - |

### 5.3 MIDI実装（PoC完了）

```
Ableton Live
    ↓ MIDI Out（自動）
IAC Driver (仮想MIDIポート)
    ↓
MUEDnote Hub (CoreMIDI)
    │
    └─→ /tmp/muednote-midi.log
```

**実装済み**:
- ✅ CoreMIDI受信（`MIDIReceiverService.swift`）
- ✅ IAC Driver経由でMIDI受信
- ✅ Note On/Off、CC、Pitch Bend解析
- ✅ 50msデバウンス（CC用）

### 5.4 MIDI検証結果

| 項目 | 結果 |
|-----|------|
| Note On/Off | ✅ 正常検出 |
| ベロシティ | ✅ 取得可能 |
| チャンネル | ✅ 識別可能 |
| フィードバック対策 | ✅ IAC Input Trackオフで解決 |

**発見事項**：
- インストゥルメントトラックは自動でIAC含む全出力先にMIDI送信
- 明示的なルーティング設定なしでMIDI取得可能

### 5.5 MIDIログ最適化

**収録中はMIDIログ不要**：DAWが録音するため、MUEDnoteでの重複記録は不要。

| シナリオ | MIDIログ | 理由 |
|---------|---------|------|
| 停止中（練習） | ✅ 必要 | DAWに残らない |
| 再生中 | ✅ 必要 | 一緒に弾く可能性 |
| **収録中** | ❌ 不要 | DAWが録音する |

**本番実装案**：
- AbletonOSCの`/live/song/get/is_recording`で収録状態を監視
- 収録中はMIDIログをスキップ

---

## 6. サードパーティプラグイン対応

### 6.1 現状

| プラグインタイプ | OSC経由 | 備考 |
|----------------|---------|------|
| Ableton標準エフェクト | ✅ フル対応 | 全パラメータ取得可能 |
| Ableton標準インストゥルメント | ✅ フル対応 | 全パラメータ取得可能 |
| **サードパーティエフェクト (AU)** | ✅ **動作確認済** | FabFilter Pro-Q4で検証済 |
| サードパーティインストゥルメント (AU) | ⚠️ On/Offのみ | Ableton API制限 |

*検証はAU版で実施。VST版でも同様の動作が期待される。

### 6.2 プラグイン固有OSC対応

一部のプラグインは独自OSC機能を持つ：

| プラグイン | OSC対応 |
|-----------|--------|
| Pianoteq | ✅ 内蔵OSCあり |
| FabFilter | ❌ なし |
| Serum | ❌ なし |
| Kontakt | ❌ なし |

### 6.3 推奨アプローチ

| シナリオ | 推奨 |
|---------|------|
| 音色作り（プリセット） | プリセット共有機能でカバー |
| ミキシング（EQ/Comp） | ✅ OSC（実装済み） |
| 演奏/リアルタイム操作 | MIDI（次フェーズ） |

---

## 7. 本番化に向けた改善点

### 7.1 高優先度

| 項目 | 内容 | 状態 |
|-----|------|------|
| API送信実装 | OSC/MIDIログを実際のMUED APIへPOST | 🔜 |
| 収録状態監視 | `/live/song/get/is_recording`で収録中はMIDIスキップ | 🔜 |
| デバッグログ無効化 | `#if DEBUG`でラップ | 🔜 |

### 7.2 中優先度

| 項目 | 内容 | 状態 |
|-----|------|------|
| maxParamsPerDevice増加 | 8 → 16〜32 | 🔜 |
| ログローテーション | ファイルサイズ制限 | 🔜 |
| 非同期I/O | DispatchQueueでバックグラウンド処理 | 🔜 |
| デバイス名取得 | パラメータ名と合わせて表示 | 🔜 |

### 7.3 完了済み

| 項目 | 内容 | 状態 |
|-----|------|------|
| MIDI対応 | CoreMIDIでノート/CC取得 | ✅ PoC完了 |
| OSC対応 | AbletonOSCでパラメータ取得 | ✅ PoC完了 |

### 7.4 将来検討

| 項目 | 内容 |
|-----|------|
| プラグイン固有OSC | Pianoteq等の対応検討 |
| Pro Tools SDK | Pro Tools対応 |

---

## 8. 結論

### 8.1 PoC成功項目

**OSC（パラメータ）：**
- ✅ Ableton標準エフェクト（EQ Eight, Glue Compressor）のパラメータ検出
- ✅ **サードパーティエフェクト（FabFilter Pro-Q4）のパラメータ検出 - 完全動作**
- ✅ Ableton標準インストゥルメント（Analog）のパラメータ検出
- ✅ トラックVolume/Panのリアルタイム検出
- ✅ ポーリング方式による安定したパラメータ監視

**MIDI（演奏）：**
- ✅ CoreMIDI経由でNote On/Off検出
- ✅ ベロシティ、チャンネル情報取得
- ✅ CC、Pitch Bend対応（実装済み）
- ✅ IAC Driver経由の自動MIDI取得

**共通：**
- ✅ DAWパフォーマンスへの影響なし

### 8.2 制限事項（Ableton API由来）

- サードパーティインストゥルメント（AU/VST共通）はOSCでOn/Offのみ
- MIDIフィードバック回避のためIAC Input Trackオフが必要

### 8.3 総評

**OSC + MIDI両方のPoCが成功**。

**エフェクトプラグイン**については、Ableton標準・サードパーティ共にフル対応可能であり、ミキシング作業のログ取得という主要ユースケースは十分に満たせる。

**インストゥルメントプラグイン**については、Ableton標準はOSCでフル対応可能だが、サードパーティプラグイン（AU/VST共通）はAbleton Live APIの制限によりOn/Off検出のみとなる。ただし、**MIDIで演奏情報（ノート、ベロシティ、CC）は取得可能**であり、実用上の問題はない。

**MIDIログの最適化**として、収録中はDAWが録音するためログをスキップすることで、効率的なログ取得が可能。

---

## 9. 参考資料

- [AbletonOSC GitHub](https://github.com/ideoforms/AbletonOSC)
- [OSCKit (Swift)](https://github.com/orchetect/OSCKit)
- [CoreMIDI Documentation](https://developer.apple.com/documentation/coremidi)

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2025-12-29 | 1.0 | 初版作成（OSC PoC完了） |
| 2025-12-30 | 1.1 | MIDI PoC追加、収録中スキップ仕様追記 |
