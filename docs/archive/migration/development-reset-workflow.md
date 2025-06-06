# 開発環境リセットワークフロー

## 概要

MUED LMS開発において、Stripe連携によるデータベースリセット時の不整合問題を解決するための統合リセットフローです。

## 問題の背景

### 従来の問題
1. **Supabase DB**: 簡単にリセット可能
2. **Stripe テストデータ**: 削除が困難（Customer、Subscriptionが残存）
3. **結果**: リセット後にデータ不整合が発生し、開発効率が低下

### 発生する不整合の例
- Supabaseに存在しないユーザーのStripe顧客レコード
- 削除されたユーザーに紐付くアクティブなサブスクリプション
- 古いサブスクリプションデータによる誤ったプラン表示

## 解決策：統合リセットフロー

### 1. 完全リセットスクリプト

```bash
npm run reset:dev
```

このスクリプトは以下を実行します：

#### Phase 1: Stripe テストデータ削除
- 全ての顧客（Customer）の削除
- アクティブなサブスクリプションのキャンセル
- 未完了のPaymentIntentのキャンセル

#### Phase 2: Supabase データベースリセット
- `stripe_user_subscriptions` テーブルのクリア
- `stripe_customers` テーブルのクリア
- その他関連テーブルのクリア

#### Phase 3: ローカルキャッシュクリア
- `.next` ディレクトリの削除
- `node_modules/.cache` の削除
- ブラウザキャッシュの推奨クリア

#### Phase 4: 初期データ投入
- 必要に応じて基本マスターデータを投入

## 使用方法

### 基本的な使用手順

1. **リセット実行**
   ```bash
   npm run reset:dev
   ```

2. **確認プロンプト**
   ```
   ⚠️  開発環境を完全リセットします。続行しますか？ (yes/no):
   ```

3. **リセット後の手順**
   ```bash
   # サーバー起動
   npm run dev
   
   # ブラウザでハードリフレッシュ
   # Cmd+Shift+R (Mac) または Ctrl+Shift+R (Windows)
   ```

### 推奨ワークフロー

#### 日常開発時
```bash
# 通常の開発
npm run dev

# 問題が発生した場合
npm run debug:frontend  # データ状況確認
npm run check:user      # ユーザー状況確認
```

#### 大きな変更後
```bash
# データベーススキーマ変更後
npm run reset:dev

# 新機能開発開始時
npm run reset:dev
```

#### トラブルシューティング時
```bash
# Stripe連携問題の調査
npm run investigate:stripe
npm run debug:customer

# 不整合修正
npm run fix:customer
npm run sync:stripe
```

## 安全性とベストプラクティス

### 環境分離
- **本番環境**: 絶対にリセットスクリプトを実行しない
- **ステージング環境**: 慎重に実行（チーム合意後）
- **開発環境**: 自由に実行可能

### データバックアップ
```bash
# 重要なテストデータがある場合
# 事前にエクスポートを推奨
npm run export:test-data  # 将来実装予定
```

### 環境変数確認
リセット前に以下を確認：
```bash
echo $STRIPE_SECRET_KEY  # sk_test_ で始まることを確認
echo $NEXT_PUBLIC_SUPABASE_URL  # テスト環境URLであることを確認
```

## トラブルシューティング

### よくある問題と解決策

#### 1. Stripe削除エラー
```
Error: No such customer: cus_xxx
```
**解決策**: 既に削除済みのため、無視して続行

#### 2. Supabase権限エラー
```
Error: permission denied for table xxx
```
**解決策**: 
```bash
npm run check:supabase-permissions
```

#### 3. キャッシュクリアエラー
```
Error: ENOENT: no such file or directory
```
**解決策**: 既に削除済みのため、無視して続行

### 手動リセット手順

自動スクリプトが失敗した場合：

1. **Stripe手動削除**
   - Stripe Dashboardにアクセス
   - Customers → 全て削除
   - Subscriptions → 全てキャンセル

2. **Supabase手動リセット**
   - Supabase Dashboardにアクセス
   - SQL Editorで実行：
   ```sql
   DELETE FROM stripe_user_subscriptions;
   DELETE FROM stripe_customers;
   DELETE FROM reservations;
   ```

3. **ローカルキャッシュ手動削除**
   ```bash
   rm -rf .next
   rm -rf node_modules/.cache
   ```

## 将来の改善計画

### Phase 1: 自動化強化
- [ ] CI/CDパイプラインとの統合
- [ ] 定期的な自動リセット（夜間実行）
- [ ] Slack通知機能

### Phase 2: データ管理改善
- [ ] テストデータのバージョン管理
- [ ] シードデータの自動投入
- [ ] 環境間データ同期

### Phase 3: 監視・アラート
- [ ] データ不整合の自動検出
- [ ] リアルタイム監視ダッシュボード
- [ ] 異常時の自動修復

## 関連スクリプト

| スクリプト | 用途 | 実行タイミング |
|-----------|------|---------------|
| `npm run reset:dev` | 完全リセット | 大きな変更後 |
| `npm run check:user` | ユーザー状況確認 | 問題発生時 |
| `npm run debug:frontend` | フロントエンド状況確認 | UI問題発生時 |
| `npm run sync:stripe` | Stripe同期 | 軽微な不整合時 |
| `npm run fix:customer` | 顧客データ修正 | 特定の不整合時 |

## 注意事項

⚠️ **重要**: このスクリプトはテスト環境専用です。本番環境では絶対に実行しないでください。

⚠️ **データ消失**: リセット後は全てのテストデータが削除されます。重要なデータは事前にバックアップしてください。

⚠️ **チーム開発**: 共有開発環境でリセットする場合は、事前にチームメンバーに通知してください。 