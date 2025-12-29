# Digital Performer OSC リファレンス

**作成日**: 2025-12-30
**ステータス**: 調査中（PoC前）

---

## 1. 概要

Digital Performer (DP) は **2010年のv7.2から** OSC (Open Sound Control) をネイティブサポート。
主要DAWとしては最初期のOSC対応。

> "DP has nearly-complete OSC bindings. Many commands are available, including the mixer, effects parameters, the entire transport and some other bits."
> — [Admiral Bumblebee](https://www.admiralbumblebee.com/music/2016/12/14/Cool-Features-in-Digital-Performer/.-Part-5.html)

---

## 2. OSCアドレスパターン

### 2.1 トラック制御

| OSCアドレス | 機能 |
|------------|------|
| `/TrackList/0/Volume` | 1番目のトラックのボリューム |
| `/TrackList/0/Pan` | 1番目のトラックのパン |
| `/TrackList/0/SendList/0` | 1番目のSendのボリューム |
| `/TrackList/1/Volume` | 2番目のトラックのボリューム |
| `/TrackList/{n}/...` | n番目のトラック（0始まり） |

### 2.2 パラメータ範囲

- すべてのパラメータは **0.0 〜 1.0** の浮動小数点
- DP側で標準化されたレンジを使用

### 2.3 値の取得（Getコマンド）

| OSCアドレス | レスポンス例 |
|------------|-------------|
| `/TrackList/0/Name/Get_Name` | `/TrackList/0/Name/Get_Name ,s Track-1` |

### 2.4 トランスポート・グローバル

公式ドキュメントによると以下が制御可能：
- Transport（再生/停止/録音）
- Click（クリック音）
- Punch（パンチイン/アウト）
- Frame formats

---

## 3. セットアップ

### 3.1 DP側設定

```
Setup > Control Surface Setup > OSC Controller を追加
```

### 3.2 ネットワーク設定

- UDP / TCP 両対応
- ポート: 任意（他アプリと重複不可）

**注意**: 1つのポートを複数アプリで共有不可
- OSCulator: port 8000
- DP: port 9000（別ポートを設定）

---

## 4. 公式ドキュメント

| ドキュメント | 場所 |
|-------------|------|
| **OSC Programming Guide** | DP Help メニュー > Control Surfaces |
| **User Guide PDF** | [MOTU公式](https://cdn-data.motu.com/manuals/software/dp/v1013/Digital+Performer+User+Guide.pdf) |
| **Plug-ins Guide PDF** | [MOTU公式](https://cdn-data.motu.com/manuals/software/dp/v101/Digital+Performer+Plug-ins+Guide.pdf) |

---

## 5. 既知の制限・問題

### 5.1 双方向通信の問題

> "Some users trying to design OSC control surfaces for DP found they could send most commands to DP over either UDP or TCP, but couldn't receive a response from DP with any 'Get' commands over TCP."
> — [MOTUnation Forum](https://motunation.com/forum/viewtopic.php?t=64871)

- DP → 外部 の値送信（Get系コマンド）に問題報告あり
- 要検証項目

### 5.2 DP Control App 廃止

- MOTU公式のリモートコントロールアプリは廃止済み
- コミュニティはTouchOSC等での代替を模索中

---

## 6. 関連ツール

### 6.1 TouchOSC

- [hexler.net/touchosc](https://hexler.net/touchosc)
- iPad/iPhone からOSC送信
- DPテンプレート存在（コミュニティ製）

### 6.2 OSCulator

- [osculator.net](https://osculator.net)
- OSC → MIDI 変換ブリッジ
- macOS専用

### 6.3 ToscA

- プラグインとして挿入可能
- DAW内でOSC送受信

---

## 7. MUEDnote連携の可能性

### 7.1 カラオケMIDI制作ワークフロー

```
Digital Performer
    │ OSC (UDP)
    │ - /TrackList/n/Volume
    │ - /TrackList/n/Pan
    │ - エフェクトパラメータ（要調査）
    ▼
MUEDnote Hub (Swift/Python)
    │
    ├─→ 品質チェック自動化
    ├─→ 作業ログ取得
    └─→ 耳コピ支援
```

### 7.2 調査必要項目

| 項目 | 優先度 | 状態 |
|-----|-------|------|
| エフェクトパラメータのOSCパス | 高 | 未調査 |
| MIDIデータのOSC経由取得 | 高 | 未調査 |
| Get系コマンドの動作検証 | 中 | 問題報告あり |
| プラグインパラメータアクセス | 中 | 未調査 |

---

## 8. 参考リンク

- [CDM: MOTU Digital Performer Adds Native OpenSoundControl](https://cdm.link/motu-digital-performer-adds-native-opensoundcontrol/)
- [MOTUnation: OSC and DP](https://www.motunation.com/forum/viewtopic.php?t=72585)
- [MOTUnation: Two-way OSC](https://motunation.com/forum/viewtopic.php?t=64871)
- [MOTUnation: TouchOSC Template for DP](https://www.motunation.com/forum/viewtopic.php?t=57421)
- [Tim Corpus: TouchOSC Tutorials](https://timcorpus.net/index.php/touchosc/)

---

## 変更履歴

| 日付 | 内容 |
|-----|------|
| 2025-12-30 | 初版作成（資料収集） |
