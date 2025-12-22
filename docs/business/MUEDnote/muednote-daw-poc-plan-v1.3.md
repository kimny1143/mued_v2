# MUEDnote DAW連携 PoC 企画書（改訂版：Ableton Live OSC優先）

**ドキュメント名**: MUEDnote DAW Operation Log Capture PoC Plan（Ableton OSC First）  
**バージョン**: v1.3  
**作成日**: 2025-12-20  
**改訂理由**: Pro Tools同時対応を削除し、Ableton OSCのみに絞ってPoC期間短縮

---

## 1. 背景・狙い

- 現状MVPで「音声→オンデバイス文字起こし→思考ログ蓄積」は成立している
- 次ステップは「DAW操作をタイムスタンプ付きで記録」し、声ログと同じセッション軸で保存すること
- **年明けリリースとの関係**：MVPはOSCなしで出す。本PoCは「次のアップデートの目玉機能」として位置づけ

### 最終的にやりたいこと（PoCでは"狙い"止まり）

- 声ログ＋DAWログから制作判断を後から要約（制作日誌化）
- 迷い方の癖・作業の偏りの可視化（教育・セルフコーチング）
- 匿名化ログを教材・レッスン設計の一次資料として蓄積

---

## 2. PoCの成功基準

- DAW上で「パラメータ変更」等の操作が発生すると、数秒〜数十秒以内にサーバへ記録される（即時UI反映は不要）
- iOS（またはWeb）でセッション終了後にログ一覧を取得でき、音声ログと同一タイムラインに並べられる
- 開発者本人が1日の制作を終えた後に見て「判断の痕跡が残ってる」と感じる（主観でOK）

---

## 3. 対象DAWと優先順位

### Phase 1（本PoC）：Ableton Live（OSC）

- **理由**：AbletonOSCでイベント取得が比較的容易、ターゲットが広い（DTMer、ビートメーカー、若い層）
- **方式**：AbletonOSC → 受信ハブ → HTTP POST → Next.js API

### Phase 2（PoC成功後）：Pro Tools（SDK）

- **理由**：プロ/エンジニア向け、市場は狭いが刺されば深い
- **方式**：Pro Tools Scripting SDK → Python → HTTP POST → Next.js API
- **時期**：Ableton対応が安定してから着手

---

## 4. ログの思想（重要）

- ログは「制作中に見て操作を誘導するもの」ではない
- ログは「制作後に意味が立ち上がる素材」
- よって、**リアルタイム表示・通知・常時オーバーレイは行わない**
- "神ログ"は「操作内容」より「操作前後の文脈（声・沈黙・迷い）」から立ち上げる

---

## 5. 取得イベント範囲（最小構成）

ログ洪水を避けるため、PoCではイベント種類を制限する。

### 必須（PoC成功基準）

| イベント | 内容 |
|---------|------|
| parameter_change | track / device(plugin) / parameter / value / unit |

### 余裕があれば追加

| イベント | 内容 |
|---------|------|
| device_open_close | プラグイン画面の開閉 |
| track_select | 選択トラックの変化 |

### PoCでは原則やらない

- MIDIノート詳細
- オートメーション全量
- 再生停止連打のようなノイズイベント

---

## 6. システム構成（Abletonのみ）

### 6.1 正規化ログフォーマット

```json
{
  "session_id": "sess_20251220_abc123",
  "timestamp": "2025-12-20T14:32:10.123Z",
  "source": {
    "daw": "ableton",
    "mode": "osc",
    "host": "studio-mac"
  },
  "action": "parameter_change",
  "payload": {
    "track": "Kick",
    "device": "EQ Eight",
    "parameter": "LowCutFreq",
    "value": 800,
    "unit": "Hz"
  }
}
```

### 6.2 構成図

```
Ableton Live
    ↓ OSC
AbletonOSC（Ableton側プラグイン/スクリプト）
    ↓ OSC (UDP)
受信ハブ（Node.js or Python、Mac常駐）
    ↓ HTTP POST
Next.js API（/api/muednote/daw-log）
    ↓
Neon PostgreSQL（muednote_daw_logs テーブル）
    ↓
iOS/Web レビュー画面（セッション後に取得・表示）
```

### 6.3 受信ハブの役割

- OSC受信（UDP）
- 正規化（AbletonOSCのフォーマット → 共通JSON）
- デバウンス（同一パラメータの連続変更を間引き）
- HTTP POSTでNext.js APIへ送信
- オフライン時のローカルキュー保存（後送）

---

## 7. MUEDnote側対応（最小）

### API

| メソッド | パス | 機能 |
|---------|------|------|
| POST | `/api/muednote/daw-log` | ログ蓄積 |
| GET | `/api/muednote/daw-log?session_id=...&since=...` | 後から取得 |

### DB（最小案）

```sql
CREATE TABLE muednote_daw_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  daw TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_daw_logs_session ON muednote_daw_logs(session_id, ts);
```

### iOS側

- リアルタイム不要
- 「セッション後レビュー画面」で時系列表示できれば合格

---

## 8. ログ洪水対策（必須）

| 対策 | 内容 |
|------|------|
| デバウンス | 同一 (track, device, parameter) の連続変更を 500ms〜1000ms で間引く |
| 送信まとめ | 一定件数をまとめてPOSTできる余地を残す（PoCは単発でもOK） |
| ノイズカット | 再生停止などPoC外イベントは捨てる |

---

## 9. スケジュール（Abletonのみ、3週間）

**前提**：本業の合間で進めるため、週単位はゆるめに設定

### Week 1：疎通確認

- [ ] AbletonOSCの導入・設定
- [ ] OSCが飛ぶことを確認（OSCモニターツール等で）
- [ ] 受信ハブの雛形作成（Node.js or Python）
- [ ] OSC受信→コンソール出力まで

### Week 2：DB保存まで通す

- [ ] 受信ハブで正規化処理
- [ ] デバウンス実装
- [ ] Next.js API（POST /api/muednote/daw-log）作成
- [ ] HTTP POST→DB保存まで通す

### Week 3：レビュー画面統合

- [ ] GET API作成
- [ ] iOSレビュー画面でDAWログ取得・表示
- [ ] 音声ログと同一タイムラインに並べる
- [ ] デバウンス調整・ノイズカット調整

---

## 10. リスクと対策

| リスク | 対策 |
|--------|------|
| AbletonOSCのイベント粒度が想定と違う | 取得イベントをparameter_changeに限定、デバウンスで吸収 |
| ネットワーク不安定 | 受信ハブでキュー保存→後送 |
| 本業で中断される | PoCログを残す、週末に振り返り |
| プライバシー | PoCは本人のみ。将来は同意UIと匿名化方針を別途設計 |

---

## 11. 成功後の次ステップ

1. **Pro Tools対応**（Phase 2）：SDK経由でHTTP POST、同じAPIに統合
2. **ログ要約**：セッション後にLLMで日誌生成
3. **アップデート告知**：「DAW連携できるようになりました」としてマーケティング活用
4. **教材化**：匿名化ログをレッスン設計の一次資料に

---

## 12. 確認事項

- [x] AbletonOSCの受信ハブはMac上で常駐でOK
- [x] 年明けMVPはOSCなしで出す（本PoCはその後）
- [x] Pro Toolsは後回し（Abletonで概念実証してから）

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0 | 2025-12-20 | 初版（Pro Tools + Ableton同時対応） |
| v1.2 | 2025-12-20 | リアルタイム無し方針明確化、受信ハブ方式採用 |
| v1.3 | 2025-12-20 | **Abletonのみに絞る**、Pro Toolsは Phase 2 へ、スケジュール3週間に短縮 |
