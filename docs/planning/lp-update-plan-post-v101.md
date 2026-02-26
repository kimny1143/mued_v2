# LP 更新計画: v1.0.1 審査通過後

**策定日**: 2026-02-26
**前提**: MUEDnote v1.0.1 App Store 審査通過後に実施
**ブランチ**: `feat/lp-update-post-v101`（審査通過後にマージ）

---

## 方針

### やること

| # | 対応 | 工数 | 対象ファイル |
|---|------|------|-------------|
| 1 | MUEDear ゲーム説明修正（MuVerb/MuHorse テキスト） | 小 | `messages/en.json`, `messages/ja.json` |
| 2 | MUEDnote Philosophy に「Chat with Hoo」追加 | 中 | `philosophy-section.tsx`, `messages/*.json` |
| 3 | Voice Memos → Cloud Transcription 説明更新 | 小 | `messages/en.json`, `messages/ja.json` |
| 4 | Hero の Hoo 吹き出しフレーズ更新 | 小 | `hero-section.tsx`, `messages/*.json` |

### やらないこと（理由付き）

| 項目 | 理由 |
|------|------|
| サブスク価格の LP 掲載 | Free はログインなしで完全動作。課金動機はアプリ内体験で生まれる。法的要件は tokushoho で充足 |
| サインイン情報の掲載 | Free = ログインなしの原則を LP で崩さない |
| Hub macOS の掲載 | Phase 2（見える化 UI）完成後に初めてエンドユーザーに価値が伝わる |
| エコシステム図 | Hub と同じ理由。Phase 2 以降 |
| MUEDlobe セクション復活 | Premium 統合方針が決定済み。スタンドアロン訴求は不要 |

---

## 変更詳細

### 1. MUEDear ゲーム説明修正

**MuVerb:**
- Before: "Distinguish 5 reverb types"
- After: "Compare two reverbs side by side — which is which?"（A/B 比較形式を反映）

**MuHorse:**
- Before: "Parameter matching"
- After: "Match compressor parameters across FET, VCA, and Opto types"（マルチタイプ対応を反映）

スクリーンショット差し替えは v0.9.2 審査通過後に検討。

### 2. Philosophy セクション: Chat with Hoo 追加

現在の 3 機能に 4 つ目を追加:

| # | 現在 | 更新後 |
|---|------|--------|
| 1 | Rest Reminders | 変更なし |
| 2 | Sound Reactive | 変更なし |
| 3 | Voice Memos | **Cloud Transcription** に改題。「録音が自動で文字起こしされる」 |
| 4 | — | **Chat with Hoo**（新規）。「セッション後に Hoo と振り返り。あなたの録音内容を理解した上で会話する」 |

### 3. Hero 吹き出しフレーズ更新

現在:
- "Ho-Hoo, save your thoughts?"
- "Ho-Hoo, interesting approach!"
- "Ho-Hoo, I see what you did there"
- "Ho-Hoo, time for a break?"

更新後（AI 会話を匂わせる）:
- "Ho-Hoo, time for a break?" （維持）
- "Ho-Hoo, want to talk about your session?"（新規）
- "Ho-Hoo, I noticed something interesting"（新規）
- "Ho-Hoo, let's review what you did"（新規）

---

## 実装手順

1. `feat/lp-update-post-v101` ブランチ作成
2. `messages/en.json` + `messages/ja.json` のテキスト更新
3. `philosophy-section.tsx` に 4 つ目の機能カード追加
4. `hero-section.tsx` の吹き出しフレーズ差し替え
5. typecheck + build 確認
6. 審査通過を待ってマージ・デプロイ

---

*関連: [LP 簡素化計画](./lp-simplification-plan.md) / [LP 更新検討資料](../landing-page-update-brief.md)*
