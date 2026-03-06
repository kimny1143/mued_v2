# mued.jp LP 更新検討資料

**作成日**: 2026-02-26

**参照ドキュメント:**
- [LP簡素化計画](./planning/lp-simplification-plan.md)
- [MUEDnote ロードマップ](./planning/muednote-roadmap-2026-02.md)
- [サブスク戦略](./planning/subscription-strategy-2026-02.md)

---

## 1. 戦略の現在地

### LP 簡素化（2026-02-24 実施済み）

LP を「2つの無料 iOS アプリの訴求」に集中させた。以下を非表示（コードは保持）:

- MUEDlobe セクション — スタンドアロン廃止・Premium 統合が決定済み
- MeetHoo ブリッジ — MUEDlobe 非表示に伴い不要
- GrowthPreview — ダッシュボード機能の予告は時期尚早
- ログインボタン — Free = ログインなしで動作

### MUEDnote ロードマップ

```
Phase 0: App Review 準備        ← 完了
Phase 1: Hoo が喋る (Basic MVP) ← v1.0.1 で実装完了、審査待ち
Phase 2: ログが貯まる (Basic 完成)
Phase 3: Hoo が覚醒する (Premium)
```

### サブスク戦略の要点

- 課金の壁は「量」ではなく「質」（Hoo 個人化の有無）
- 価格は Web Stripe 決済で完結。App Store 課金は使わない
- MUEDlobe は Premium 機能として統合
- MUEDear は現状維持（広告モデル）

---

## 2. 各アプリの現状

### MUEDnote Mobile (iOS)

| 項目 | 内容 |
|------|------|
| バージョン | 1.0.1 (Build 30) |
| ステータス | **審査待ち** (2026-02-26 提出) |
| App Store | [リンク](https://apps.apple.com/app/muednote/id6758751227) |
| ロードマップ | Phase 1 実装完了 |

**v1.0.1 で追加された機能:**
- Hoo AI Chat（休憩中に Hoo と会話、Whisper API による文脈理解）
- Cloud Transcription（録音の自動文字起こし、OpenAI Whisper）
- Sign In with Apple & Google（クロスデバイス同期）
- Stripe サブスクリプション (Basic / Premium)
- セッション履歴閲覧

### MUEDear (iOS)

| 項目 | 内容 |
|------|------|
| バージョン | 0.9.2 (Build 40) |
| ステータス | v0.9.1 審査承認済み、v0.9.2 準備中 |
| App Store | [リンク](https://apps.apple.com/app/muedear/id6758307988) |

**最近の変更:**
- MuVerb: 5択形式 → A/B 比較形式にリデザイン
- MuHorse: マルチタイプコンプレッサー (FET/VCA/Opto) + 設定画面

### MUEDnote Hub (macOS)

| 項目 | 内容 |
|------|------|
| バージョン | 1.0.1 (Build 26) |
| ステータス | App Store 審査提出済み |
| ロードマップ | Phase 2 の基盤 |

**主な機能:**
- macOS メニューバー常駐、Ableton Live の OSC パラメータをリアルタイムキャプチャ
- DAW ログをサーバーに送信

---

## 3. LP の現在の記述と各アプリの実態

### MUEDnote

| LP の記述 | アプリの実態 |
|-----------|------------|
| Hoo: 「揺れる・休憩を促す」 | AI チャットパートナー (Whisper + GPT) |
| 「Voice Memos が文字起こし」 | Cloud Transcription (自動 M4A → Whisper API) |
| サインイン不要 | Apple/Google Sign-In あり（ただし Free はログインなしで使える） |
| 無料アプリ | Free / Basic (¥1,980/月) / Premium |
| Hub macOS の記述なし | macOS アプリが審査提出済み |

### MUEDear

| LP の記述 | アプリの実態 |
|-----------|------------|
| MuVerb: 「Distinguish 5 reverb types」 | A/B 比較形式 |
| MuHorse: 「Parameter matching」 | マルチコンプタイプ対応 (FET/VCA/Opto) |
| ゲーム数「6ゲーム」 | 正確 |

---

## 4. 論点

### A. MUEDnote の Hoo 説明をどうするか

Phase 1 で Hoo は「跳ねるだけ」から「AI チャットパートナー」に変わった。LP の説明は Phase 0 時点のまま。v1.0.1 審査通過後、この説明を更新するか。

更新する場合、どこまで踏み込むか:
- Hoo が AI で会話できることを明示する
- 「振り返りモード」等の具体的な使い方まで書く
- あるいは現状のまま、アプリ内で体験させる

### B. サブスク・サインインの情報を LP に出すか

サブスク戦略では価格は Web 決済画面で見せる方針。LP で Basic/Premium の存在や価格に触れるかどうか。

### C. MUEDear のゲーム説明更新

MuVerb と MuHorse の説明文が実装と一致していない。テキスト修正のみで対応可能。スクリーンショットの差し替えも検討対象。

### D. Hub macOS を LP に載せるタイミング

Hub は Phase 2 のインフラ。macOS App Store 承認後に追加するか、Phase 2 の見える化 UI が揃うまで待つか。

### E. エコシステム図の必要性

```
[Ableton Live] ←OSC→ [MUEDnote Hub (Mac)]
                              ↕ API
                        [mued.jp Server]
                              ↕ API
                    [MUEDnote Mobile (iPhone)]
```

この全体像を LP で見せることでプロダクトの深みは伝わるが、Phase 2 以降の話でもある。

---

*v1.0.1 審査通過後、この資料をもとに LP 更新の方針を決定する。*
