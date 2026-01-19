# MUEDnote Subscription Tier 整合性レポート

**作成日:** 2026-01-19
**ステータス:** レビュー待ち

---

## 概要

新しいサブスクリプションプラン（v1.0）と現状の実装を比較し、必要な変更点を洗い出した。

---

## 1. Tier構成の比較

### 現状の実装（4階層）

| Tier | コード名 | 価格（Stripe） |
|------|---------|---------------|
| Freemium | `freemium` | ¥0（Stripe商品なし） |
| Starter | `starter` | ¥999/月 |
| Basic | `basic` | ¥1,999/月 |
| Premium | `premium` | ¥4,999/月 |

**該当ファイル:**
- `lib/repositories/subscriptions.repository.ts:17` - SubscriptionTier型定義
- `lib/middleware/usage-limiter.ts:60-77` - TIER_LIMITS定義
- `scripts/setup-stripe-products.ts:23-79` - Stripe商品定義
- `db/schema.ts:125` - DBカラム定義

### 新プラン（3階層）

| Tier | 推奨コード名 | 価格 |
|------|-------------|------|
| Free | `free` | ¥0 |
| Basic | `basic` | ¥1,980/月 |
| Premium | `premium` | ¥2,980/月 |

---

## 2. ギャップ分析

### 2.1 Tier階層の変更

| 変更点 | 影響範囲 |
|--------|---------|
| `starter` tierの削除 | 型定義、TIER_LIMITS、Stripe商品、i18n翻訳 |
| `freemium` → `free` へのリネーム | 型定義、DB既存データ、コード全体 |

**リスク:** 既存ユーザーのDBレコードに`freemium`または`starter`が入っている場合、マイグレーションが必要。

### 2.2 価格変更

| Tier | 現在 | 新価格 | 差分 |
|------|------|--------|------|
| Basic | ¥1,999 | ¥1,980 | -¥19 |
| Premium | ¥4,999 | ¥2,980 | -¥2,019 |

**必要な対応:** Stripe商品・価格の再作成または更新

### 2.3 MUEDnote固有機能（未実装）

| 機能 | Free | Basic | Premium | 現在の状態 |
|------|------|-------|---------|-----------|
| ログ保存期間 | 90日 | 永続 | 永続 | ❌ 未実装 |
| Hoo会話回数 | - | 150回/月 | 無制限 | ❌ 未実装 |
| Hoo応答 | 定型文 | AI (Sonnet) | AI (BYOK) | ❌ 未実装 |
| プロンプト開放 | ❌ | ❌ | ✅ | ❌ 未実装 |
| DAWログ連携 | ❌ | ✅ | ✅ | ✅ 実装済（UI非表示） |

### 2.4 既存の使用量制限（LMS向け）

現在のTIER_LIMITSはMUED LMS向けの制限:

```typescript
// lib/middleware/usage-limiter.ts
{
  freemium: { aiMaterialsLimit: 3, reservationsLimit: 1 },
  starter: { aiMaterialsLimit: 3, reservationsLimit: 1 },
  basic: { aiMaterialsLimit: -1, reservationsLimit: 5 },
  premium: { aiMaterialsLimit: -1, reservationsLimit: -1 },
}
```

MUEDnote固有の制限（Hoo会話、ログ保存期間）は含まれていない。

---

## 3. 変更が必要なファイル一覧

### Phase 1: Tier定義の統一

| ファイル | 変更内容 | 優先度 |
|---------|---------|--------|
| `lib/repositories/subscriptions.repository.ts` | `SubscriptionTier`型から`starter`削除、`freemium`→`free` | Critical |
| `lib/middleware/usage-limiter.ts` | TIER_LIMITS更新 | Critical |
| `db/schema.ts` | コメント更新（実際のDBカラムは`text`なので影響小） | Low |
| `lib/i18n/translations.ts` | `starter`翻訳削除、`freemium`→`free`リネーム | Medium |
| `scripts/setup-stripe-products.ts` | 価格更新、starter削除 | Critical |

### Phase 2: MUEDnote機能実装

| 機能 | 必要な実装 | 優先度 |
|------|-----------|--------|
| Hoo会話カウンター | DBスキーマ追加、APIエンドポイント、使用量チェック | High |
| ログ保存期間制限 | cronジョブ or scheduled function | Medium |
| BYOK APIキー保存 | DBスキーマ追加、設定UI | High |
| プロンプト設定UI | Premium限定画面 | Medium |

### Phase 3: Stripe更新

| タスク | 詳細 |
|--------|------|
| 商品再作成 | Basic ¥1,980、Premium ¥2,980 |
| 旧価格の廃止 | Starter商品アーカイブ、旧価格無効化 |
| 環境変数更新 | STRIPE_PRICE_BASIC、STRIPE_PRICE_PREMIUM |

---

## 4. DBマイグレーション計画

### 既存ユーザーの移行

```sql
-- starter → basic（無料アップグレード）
UPDATE subscriptions
SET tier = 'basic'
WHERE tier = 'starter';

-- freemium → free（リネーム）
UPDATE subscriptions
SET tier = 'free'
WHERE tier = 'freemium';
```

### 新規カラム追加（MUEDnote用）

```sql
-- Hoo会話使用量
ALTER TABLE subscriptions
ADD COLUMN hoo_conversations_used INTEGER DEFAULT 0;

-- BYOKキー（暗号化推奨）
ALTER TABLE subscriptions
ADD COLUMN byok_api_key_encrypted TEXT;

-- 最終ログ削除日
ALTER TABLE muednote_sessions
ADD COLUMN retention_expires_at TIMESTAMP;
```

---

## 5. 推奨実装順序

### Week 1: 基盤変更
1. [ ] Tier型定義の更新（starter削除、freemium→free）
2. [ ] TIER_LIMITS更新
3. [ ] i18n翻訳更新
4. [ ] DBマイグレーション作成

### Week 2: MUEDnote機能
1. [ ] Hoo会話カウンター実装
2. [ ] 使用量制限API作成
3. [ ] BYOK設定画面実装

### Week 3: Stripe・決済
1. [ ] 新Stripe商品作成
2. [ ] Webhook更新
3. [ ] 旧プラン移行スクリプト

### Week 4: テスト・リリース
1. [ ] E2Eテスト追加
2. [ ] ステージング環境検証
3. [ ] 本番デプロイ

---

## 6. リスクと対策

| リスク | 対策 |
|--------|------|
| 既存`starter`ユーザーの不満 | 無料でBasicへアップグレード |
| DBマイグレーション失敗 | バックアップ後に実行、ロールバック計画準備 |
| Stripe既存サブスク | 請求サイクル終了後に新価格適用 |
| Hoo会話制限への反発 | 150回/月は十分な量であることを説明 |

---

## 7. 補足: LMSとMUEDnoteの制限分離

現在のコードベースでは、LMSの使用量制限（`aiMaterialsLimit`, `reservationsLimit`）とMUEDnoteの制限が混在していない。

**推奨アーキテクチャ:**
```typescript
// 統合TIER_LIMITS
const TIER_LIMITS = {
  free: {
    // LMS
    aiMaterialsLimit: 3,
    reservationsLimit: 1,
    // MUEDnote
    hooConversationsLimit: 0, // 定型文のみ
    logRetentionDays: 90,
  },
  basic: {
    aiMaterialsLimit: -1,
    reservationsLimit: 5,
    hooConversationsLimit: 150,
    logRetentionDays: -1, // 永続
  },
  premium: {
    aiMaterialsLimit: -1,
    reservationsLimit: -1,
    hooConversationsLimit: -1, // 無制限（BYOK）
    logRetentionDays: -1,
  },
};
```

---

## 関連文書

- [MUEDnote サブスクリプションプラン v1.0](./muednote-subscription-plan-v1.md)
- [コスト構造分析](../cost-structure-2026.md)

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-01-19 | 初版作成 |
