# MUEDial マネタイズ v1

**作成:** mued課 / 2026-04-26  
**参照:** echovna-unit-economics-20260427.md (改訂版6.1 finalized)  
**ステータス:** kimny-confirmed (2026-04-26 12:18) ✅  
**kimny判断:** 全6項目確定済み (2026-04-26 00:08〜00:14) + マネタイズv1 final確定 (2026-04-26 12:18)

---

## 1. 既存MUEDialサブスク継続確定

### 1-1. 確定構成

| プラン | 月額 | クレジット | Stripe Price ID |
|-------|------|-----------|----------------|
| Basic | $19.99 | 1,000 cr | `STRIPE_DIAL_BASIC_PRICE_ID` |
| Pro | $34.99 | 1,700 cr | `STRIPE_DIAL_PRO_PRICE_ID` |
| Studio | $49.99 | 3,000 cr | `STRIPE_DIAL_STUDIO_PRICE_ID` |

**Stripe Price IDs変更なし、freee品目マスタ変更なし。**

### 1-2. 改訂理由（新tier体系撤回の経緯）

改訂版1〜5 (2026-04-25) では `Free/Creator/Studio/Pro` の新4tier体系・Lifetime $150・クレジット単価変更を提案していた。以下の理由で全撤回:

**kimny判断（2026-04-25 23:30頃）:**
> 「Echovnaをオープンモデル（ACE-Step v1.5 MIT/MLX-Swift）で実装するなら、現行サブスク価格のままEchovna込みで運用して大丈夫」

**定量裏付け (reserch課PR#10):**
- Native macOS (MLX-Swift) での Echovna 実行原価: **¥0/月**（ローカル実行）
- WEB版 Cloud GPU (fal.ai) 原価: **$0.06/user/月** (月20曲想定)
- 月100曲のヘビーユースでも既存原価率への影響: **+0.6%以下**
- → 価格改定不要を定量確認

**業界整合パターン:**
- Spotify Premium: 価格据え置きで Wrapped / podcast機能追加
- Adobe CC: Firefly AI機能を既存価格で追加
- → 「価格据え置き機能拡張」は業界通則

---

## 2. クレジット制度詳細

### 2-1. 個別購入（単品）

| サービス | 価格 | 原価 (RoEx) | 原価率 |
|---------|------|------------|------|
| Omakase Mix (300cr) | $8 | $2.70 | 33.75% ✅ |
| Dialogue Mix (530cr typ) | $15 | $4.77 | 31.8% ✅ |
| Mastering add-on (220cr) | +$6 | $1.98 | 33.0% ✅ |
| Retake | $10 | — | — |

**全て33%原価率ガイドライン内、変更なし。**

### 2-2. Credit Pack

| パック | 価格 | クレジット | 用途 |
|-------|------|-----------|------|
| Small | $12.99 | 500 cr | 単発補充 |
| Large | $34.99 | 1,500 cr | まとめ買い |

**Credit Pack原価率 (CFO透明性補強):**

Medium pack ($0.009/cr) 基準での原価率:

| パック | 単価 | 原価率 | ガイドライン比較 |
|-------|------|--------|--------------|
| Small ($12.99 / 500cr) | $0.026/cr | **34.6%** | 33%より+1.6pt超過 (許容判断は別論点) |
| Large ($34.99 / 1,500cr) | $0.023/cr | **39.0%** | 33%超過 (業界Subscription経済通則の中央値ベース運営で許容) |

→ Credit Packは「ヘビーユース向け追加購入」のため、個別購入 (33.75%) より若干高い原価率は業界通則の範囲内。Large pack購入時にRoEx Medium→Largeパック移行 ($0.008/cr) すれば原価率改善余地あり (Large移行時: Small 30.8% / Large 34.3%)。

### 2-3. クレジットロールオーバーポリシー

| 状態 | 有効期限 |
|------|--------|
| サブスク継続中 | 無期限ロールオーバー |
| 解約後 | 30日で失効 |
| Credit Pack | 12ヶ月有効 |

### 2-4. 超過分課金フロー

```
サブスククレジット枯渇
  → UI上で「クレジット不足」表示
  → Credit Pack購入ページへ誘導 (/dial/pricing#credits)
  → Small $12.99 / Large $34.99 選択
  → Stripe決済 → クレジット即時付与
  → 継続利用
```

**新tier新設不要。既存 Credit Pack + 単品 で超過分をカバー。**

---

## 3. Native macOSアプリ — Lifetime $99販売方針

### 3-1. Phase別位置付け

| Phase | 期間 | Nativeアプリ対応 |
|-------|------|---------------|
| **Phase 0/1 (現在〜Q3)** | 2026-04-25〜Q3 | **TestFlight beta配布**（無償） |
| **Phase 1.5 (Q4)** | 2026 Q4頃 | **Lifetime $99 商用販売開始** |
| Phase 2以降 | 2027〜 | LoRA個人化機能（ACE-Step #1115解消後） |

### 3-2. Phase 1.5以降に延期した理由

kimny判断確定 (2026-04-26 00:08、Option C: Hybrid採用):

1. **pricing/SKU複雑性の先行回避** — Phase 1 MVP launch前のLifetime SKU先行は管理負荷過大
2. **Native PMF beta期間で検証** — TestFlightで実ユーザー反応を先に収集、Lifetime価格を実績で根拠付け
3. **Support burden測定** — Phase 1 Native運用での支援コスト把握後に有料化

### 3-3. Phase 1 MVPでのNative位置付け

- TestFlight beta: 既存MUEDialサブスク有効ユーザーに無償提供
- 機能: ACE-Step v1.5 MLX-Swiftローカル実行 + 既存MUEDial WEB版API連携
- 目的: PMF検証 + Support実績蓄積

**Phase 1.5 販売開始時の再評価 (CFO補強):**

Lifetime $99 は現時点の仮設定。Phase 0/1 beta検証結果次第で以下へのpivotも検討対象:

| 案 | 価格 | 条件 |
|----|------|------|
| **Lifetime $99** (現計画) | $99 一括 | PMF検証で需要確認済みの場合 |
| Founders License $149 | $149 一括 | 早期採用者向けプレミアム + 特典付き |
| Rent-to-Own $12-18 × 12回 | $144-216 分割 | 初期支払い障壁を下げる場合 |

判断原則: kimny「実データが溜まってから」— Phase 1 beta期間のSupport実績・ユーザー反応をもとに実績ベースで選択。

---

## 4. 価格アーキテクチャ (B): Subscription + Top-up

### 4-1. 構造定義

**Option B = subscription + finishing credits/top-up (kimny確定 2026-04-26 00:14)**

```
[Echovna生成層]
  ACE-Step v1.5 MLX-Swift (Native) → 原価¥0
  fal.ai Cloud GPU (WEB版、Phase 1.5〜) → $0.002/曲
  → サブスクション内で提供、追加課金なし

[Mix/Mastering層]
  RoEx Tonn API → 300cr=$2.70 (Mixing) / 220cr=$1.98 (Mastering)
  → クレジット制 (サブスク付与 + Credit Pack超過分)
```

**「サブスク内に原価ゼロのEchovna生成」+「従量原価のmix/masteringはクレジット制」= 明確な原価分離**

### 4-2. 既存実装構造との整合

改訂版6 Unit Economics で「Codex独立検証」も既存実装構造がすでにOption Bに近いと指摘:
> 既存 `financials/pricing.md` = Subscription + 単品 + Credit Pack 併存 → 実質的にOption Bの構造

**新実装変更なし。既存構造の言語化・明文化のみ。**

### 4-3. 新tier体系撤回の明示

| 撤回項目 | 旧提案（改訂版1-5） | 確定（改訂版6） |
|--------|----------------|-------------|
| Subscription tier | Free/Creator/Studio/Pro (新4tier) | **Basic/Pro/Studio 既存維持** |
| クレジット単価 | Mix $2.45 / Mastering $3.00 | **Omakase $8 / Mastering $6 既存維持** |
| Lifetime SKU | $150 早期販売提案 | **Phase 1.5以降 $99** |
| 損益分岐 | 約40人 (構造ミス) | **約14-16人 (blended正算)** |

---

## 5. 損益分岐: 約14-16人

### 5-1. 試算ベース (改訂版6.1 Section 6 確定値)

| ケース | 前提 | Blended粗利/user/月 | 損益分岐人数 |
|------|------|----------------|-----------|
| **Base (p50中央値)** | 標準使用率50% | ¥3,171 | **約14人** |
| **Stripe込み** | Stripe手数料考慮 | ¥3,021 | **約15人** |
| **High usage (p75)** | 中重度ユーザー想定 | ¥2,694 | **約16-17人** |

**MUED月次運用コスト: ¥44,120/月** (costs.md [FACT])

### 5-2. 既存目標との整合

既存 `revenue.md` 目標: **サブスク12人 + 単品5件/月 + AdMob 100DAU**

- サブスク単独損益分岐は約14-15人 → 既存12人目標より高いが
- **単品 $8×5件/月 = $40 + AdMob貢献を加味すると12人で損益分岐達成**は妥当

### 5-3. Cloud GPU加算の影響

Echovna WEB版のCloud GPU原価加算後:
- Mac M-series 70%想定 [estimate: 上位文書では30/50/70感度帯で検証済]: +¥2.7/user/月 → **損益分岐人数への影響 0.5人未満（無視可能）**

---

## 6. WEB版/Native版機能差分 + Phase別ローンチ計画

### 6-1. 機能差分マトリクス

| 機能 | WEB版 (Phase 1) | Native macOS (Phase 1) |
|-----|----------------|----------------------|
| MUEDial AIミキシング | ✅ (既存) | ✅ (API連携) |
| Hoo会話型UI | ✅ | ✅ (Native UI) |
| Echovna作曲 | ❌ (Phase 1.5以降) | ✅ (ACE-Step MLX-Swift) |
| LUFS制御 | ✅ (Phase 1実装予定) | ✅ (連携) |
| サブスク管理 | ✅ (Stripe/Clerk) | ✅ (API経由) |
| オフライン動作 | ❌ | ✅ (MLX-Swiftローカル) |

### 6-2. Phase別ローンチロードマップ

```
Phase 0 (2026-04-25 〜 2026-05-08)
  ├─ mued課: tools-echovna.ts スケルトン ✅完了
  └─ native課: ACE-Step v1.5 MLX-Swift PoC

Phase 1 MVP (2026 Q2〜Q3)
  ├─ WEB版 MUEDial: 既存サブスク維持、LUFS制御追加
  ├─ Native macOS beta: TestFlight配布 (既存サブスクユーザー向け)
  └─ Echovna作曲: Native限定

Phase 1.5 (2026 Q4頃)
  ├─ Lifetime $99 商用販売開始
  ├─ WEB版Echovna統合 (fal.ai Cloud GPU)
  └─ LUFS配信プリセット UI完成

Phase 2以降 (2027〜)
  └─ LoRA個人化 (ACE-Step #1115解消後)
```

### 6-3. Phase 1 LUFS制御スコープ (kimny確定 2026-04-25)

WEB版バックエンド:
- RoEx `/mixanalysis` (10cr = $0.09): `integrated_loudness_lufs` 取得
- RoEx `/mastering` Streamingプリセット (220cr = $1.98): LUFSターゲット準拠マスタリング
- 配信先プリセット: Spotify (-14 LUFS) / Apple Music (-16) / YouTube (-14) / Tidal (-14) / Amazon (-14) / Broadcast (-23) / Podcast (-16)

---

## 7. 集客モード突破トリガーとの接続

### 7-1. 2軸トリガー定義 (kimny確定 + Codex詳細化)

| 軸 | トリガー条件 | 該当アクション |
|----|------------|------------|
| **UX軸** | 5 paid users + (3 repeat payers OR 20 paid mixes across ≥3 accounts) | Phase 2着手、機能拡張 |
| **会計軸** | 100 paid users + 3ヶ月 net contribution-positive + usage分布安定 | 原価コミット解禁 (Cloud GPU有料契約等) |

**現状 (2026-04-26): paid 0人。流入創出フェーズ。**

### 7-2. 段階的マネタイズアクション

| ユーザー規模 | アクション |
|------------|----------|
| 現状 (~0人有料) | 価格据え置き。流入創出に全集中 (ままごと禁止) |
| **UX軸到達 (5人)** | Phase 2機能開発着手 OK。Echovna LoRA研究開始検討 |
| **会計軸到達 (100人)** | Clerk Phase B実装 / Cloud GPU有料契約 / Large pack移行検討 |
| 300人到達時 | 価格A/Bテスト。ボリューム割引・リファラル施策 |

### 7-3. 「ままごと禁止」原則との接続

- **100人/月安定まで分析・価格最適化は行わない**（`feedback_open_model_first_no_cost_actions.md` 確定値）
- 現在の最優先は「流入母数の形成」
- 価格変更・新SKU追加は「実データ（50件以上）が溜まってから」

---

## 8. 参照ソース一覧

| 文書 | 役割 |
|------|------|
| `_conductor/docs/inbox/echovna-unit-economics-20260427.md` (改訂版6.1 finalized) | 価格・原価・損益分岐の確定値 |
| `_conductor/docs/financials/pricing.md` | 既存Stripe構成 (canonical) |
| `_conductor/docs/financials/costs.md` | 月次運用コスト ¥44,120 (canonical) |
| `_conductor/docs/financials/revenue.md` | 既存目標 12人/5件/100DAU (canonical) |
| `_conductor/memory/feedback_ux_satisfaction_vs_accounting_satisfaction.md` | 2軸トリガー原則 |
| `_conductor/memory/feedback_open_model_first_no_cost_actions.md` | オープンモデル優先・原価回避原則 |
| `docs/monetization/product-hypothesis-v1/MUEDial.md` | mued課ドラフト v1 (2026-04-23/24) |
| `docs/monetization/product-hypothesis-v1/data-input.md` | data課 input (2026-04-24) |

---

*作成: mued課 2026-04-26*  
*完納目標: 4/27 EOD → 4/28 kimny最終確定*  
*次アクション: conductor/CFOレビュー → kimny確定 → LP課/write課/SNS課展開*
