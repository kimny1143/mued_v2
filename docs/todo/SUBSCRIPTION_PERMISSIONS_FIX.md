# Vercel環境でのStripe決済・Supabase権限問題報告書

## 問題概要

ローカル開発環境では正常に動作していたStripe決済機能が、Vercel環境（プレビュー/本番）でのデプロイ後に機能しないという問題が発生しました。具体的には以下のエラーが確認されています：

1. **Stripeエラー**：`No such price: 'price_test_starter'`
2. **Supabase権限エラー**：`permission denied for schema public`
3. **サブスクリプション取得エラー**：`API エラー: 401 {"error":"認証が必要です"}`

## 発生環境

- **発生環境**：Vercel (Preview/Production)
- **正常動作環境**：ローカル開発環境 (Docker/npm run dev)
- **デプロイURL**：https://splint-mued-lms.vercel.app/

## 問題が発生した明確な理由

### 1. 環境変数の改行問題

ローカル環境とVercel環境で重要な違いがあったのは環境変数の扱いです：

- **ローカル環境**：`.env`/`.env.local`ファイルを使用しており、Nodeが環境変数を正しく処理
- **Vercel環境**：ダッシュボードでの環境変数設定時に改行が含まれると、Stripe API呼び出し時の認証ヘッダー生成で問題が発生

具体的には、`STRIPE_SECRET_KEY`に改行が含まれていると、HTTPヘッダーの`Authorization: Bearer {KEY}`部分が破損し、「Invalid character in header content」エラーが発生します。

### 2. Stripe価格IDの環境依存問題

- **ローカル環境**：テスト用の価格ID（`price_test_starter`など）がハードコードされており、本来はStripeアカウントに登録済みであるべき
- **Vercel環境**：デプロイ時に使用されるStripeアカウントには、これらのテスト価格IDが登録されていなかった

Stripeのテスト/本番環境の違いや、アカウント間での価格ID同期が行われていなかったことが原因です。

### 3. Supabase権限設定の相違

- **ローカル環境**：開発用のSupabaseプロジェクトでは、テスト用途に権限が緩く設定されている
- **Vercel環境**：より厳格なRLS（Row Level Security）ポリシーが適用され、`public`スキーマへのアクセスが制限されている

マイグレーションファイルに適切なRLSポリシーが含まれておらず、環境間で権限設定に不一致が生じていました。

## 実装した対応策

### 1. 環境変数問題への対応

- 環境変数から改行を削除するスクリプト（`scripts/vercel-deploy-prep.sh`）を作成
- クライアント側とサーバー側の両方で改行のない状態でStripe APIキーを使用するよう修正

```bash
# 改行を削除する処理
CLEAN_STRIPE_KEY=$(echo "$STRIPE_SECRET_KEY" | tr -d '\n\r')
```

### 2. 動的価格生成システム

サーバー側（`app/api/checkout/route.ts`）でフォールバックメカニズムを実装：

```typescript
// 価格IDがテスト価格で、かつサブスクリプションモードの場合のライン項目を作成
if (formattedPriceId in TEST_PRICES) {
  console.log(`テスト価格ID ${formattedPriceId} のフォールバック価格データを使用します`);
  const priceInfo = TEST_PRICES[formattedPriceId];
  
  // サブスクリプション価格を動的に作成
  lineItems = [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: priceInfo.name,
        description: `テスト用の${priceInfo.name}です`,
      },
      unit_amount: priceInfo.amount,
      recurring: {
        interval: priceInfo.interval
      }
    },
    quantity: 1
  }];
}
```

### 3. Supabase権限問題の一時的回避

クライアント側（`app/dashboard/plans/page.tsx`）で権限エラーを検出し回避する機能を実装：

```typescript
// Supabaseの権限エラーを検出
useEffect(() => {
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = String(error.message);
    if (errorMessage.includes('permission denied') || errorMessage.includes('42501')) {
      setPermissionError(true);
      addDebugLog('Supabase権限エラーを検出', errorMessage);
    }
  }
}, [error]);

// エラー時の代替処理
const userId = permissionError ? 'test-user-id' : user?.id;
```

## 恒久的な解決策

以下の対応をすべきです：

### 1. 環境変数管理の改善

- Vercel環境変数設定時に改行が含まれないよう注意
- 環境変数の整合性を確認するCI/CDパイプラインのステップを追加
- `scripts/check-env.js`を活用した環境変数検証プロセスの標準化

### 2. Stripe価格設定の統一

- テスト/本番共通で使用する価格IDをStripeダッシュボードで適切に設定
- 環境ごとに異なる価格IDを使い分ける明確なルールを策定
- 価格ID参照をハードコードせず、環境変数や設定ファイルから読み込む方式に変更

### 3. Supabase RLSポリシーの修正

以下のマイグレーションファイルを作成・適用して適切なRLSポリシーを設定：

```sql
-- サブスクリプション関連の権限修正
DO $$
BEGIN
  -- 既存のポリシーを削除
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON stripe_user_subscriptions;', E'\n')
    FROM pg_policies
    WHERE tablename = 'stripe_user_subscriptions'
  );
EXCEPTION 
  WHEN OTHERS THEN
    RAISE NOTICE 'ポリシー削除中にエラーが発生しましたが続行します';
END $$;

-- RLS確実に有効化
ALTER TABLE IF EXISTS stripe_user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 認証ユーザーが自分のデータのみ閲覧可能なポリシー
CREATE POLICY "ユーザーは自分のサブスクリプションのみ閲覧可能" 
ON stripe_user_subscriptions FOR SELECT 
TO authenticated
USING ("userId"::text = auth.uid()::text);

-- 管理者は全操作可能
CREATE POLICY "管理者は全操作可能" 
ON stripe_user_subscriptions FOR ALL 
TO service_role
USING (true) WITH CHECK (true);
```

## 結論

今回の問題は、ローカル環境とVercel環境の違いに起因する複数の要因が重なった結果でした。特に環境変数の扱いとデータベース権限設定の違いが大きく影響しています。

一時的な対応策として実装したフォールバックメカニズムにより、現在はVercel環境でも決済機能をテストできるようになりました。しかし、本番運用を見据えると、上記の恒久的な解決策を計画的に実施していくことが重要です。

## 今後の予防策

1. 環境間の差異を最小化するためのDevOps戦略の強化
2. 各環境でのテストカバレッジ拡充
3. 依存サービス（Stripe/Supabase）の設定を一元管理するリポジトリの整備

以上
