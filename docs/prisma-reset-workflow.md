# Prisma DB リセット統合ワークフロー

## 概要

このドキュメントは、MUED LMSプロジェクトにおけるデータベースリセット後の統合初期化ワークフローを説明します。

## 🎯 目的

- DBリセット後に必要なSQL操作を一元化
- 手動実行ステップを最小化
- 開発効率の向上
- エラーの削減

## 📁 ファイル構成

```
prisma/
├── README.md                    # 整理計画とガイド
├── schema.prisma               # Prismaスキーマ定義
├── post-reset-init.sql         # 🔥 統合初期化SQL
├── migrations/                 # Prismaマイグレーション
└── seed/                       # 初期データ
    └── sample-data.sql        # サンプルデータ
```

## 🚀 完全リセットワークフロー

### 1. 環境リセット
```bash
npm run reset:dev
```

### 2. Prismaマイグレーション
```bash
npm run db:reset
# または
npx prisma migrate reset --force
npx prisma generate
```

### 3. 統合初期化SQL実行
```bash
npm run db:init
```
**手動実行**: Supabase SQL Editorで `prisma/post-reset-init.sql` を実行

### 4. サンプルデータ投入
```bash
npm run seed
```

### 5. 動作確認
```bash
npm run db:test
npm run check:user
npm run debug:frontend
```

## 📋 統合初期化SQLの内容

`prisma/post-reset-init.sql` に含まれる機能：

### ✅ 基本ロール作成
- Student, Mentor, Admin の3つの基本ロール

### ✅ 認証ユーザー同期システム
- Googleログイン時の自動ユーザー作成
- 認証情報更新時の同期
- メタデータからの情報抽出

### ✅ RLSポリシー設定
- 全テーブルのRow Level Security設定
- ユーザーロールに基づいたアクセス制御

### ✅ Stripe関連設定
- インデックス作成（パフォーマンス向上）
- シーケンス権限設定

### ✅ 権限設定
- anon, authenticated, service_role の適切な権限

### ✅ 動作確認関数
- `test_post_reset_init()` 関数でセットアップ確認

## 🔧 トラブルシューティング

### SQL実行エラー
```sql
-- Supabase SQL Editorで確認
SELECT * FROM public.test_post_reset_init();
```

### 権限エラー
```bash
npm run check:supabase-permissions
```

### ユーザー同期問題
```bash
npm run check:user
```

### フロントエンド問題
```bash
npm run debug:frontend
```

## 📊 サンプルデータ内容

`prisma/seed/sample-data.sql` に含まれるデータ：

- **ユーザー**: 4名（メンター2名、生徒2名）
- **レッスンスロット**: 5件
- **予約**: 3件（承認待ち2件、確定済み1件）
- **メッセージ**: 4件
- **Stripe顧客**: 2件

## ⚠️ 注意事項

### 本番環境での使用
- `post-reset-init.sql` は本番環境では慎重に実行
- データ消失のリスクを理解した上で実行

### 開発環境での使用
- 定期的なリセットで開発環境をクリーンに保つ
- Stripe テストデータとの整合性を確保

## 🔄 日常開発ワークフロー

### 通常のマイグレーション
```bash
npx prisma migrate dev --name feature_name
npx prisma generate
```

### 大きな変更時
```bash
npm run reset:dev
# 上記の完全リセットワークフローを実行
```

### 軽微な修正
```bash
npm run sync:stripe          # Stripe同期
npm run fix:customer         # 顧客データ修正
```

## 📈 パフォーマンス最適化

### インデックス
- Stripe関連テーブルに最適化されたインデックス
- 予約・レッスンスロット検索の高速化

### RLSポリシー
- 効率的なクエリ実行のための最適化されたポリシー
- 必要最小限のデータアクセス

## 🎉 完了確認

全ての手順完了後、以下で動作確認：

1. **ログイン**: Googleアカウントでログイン
2. **プラン表示**: プランタグが正しく表示される
3. **予約機能**: レッスン予約が正常に動作
4. **メンター承認**: 承認フローが正常に動作
5. **決済**: Stripe決済が正常に動作

## 📞 サポート

問題が発生した場合：

1. このドキュメントのトラブルシューティングを確認
2. `scripts/README.md` の整理されたスクリプト一覧を参照
3. 必要に応じて個別のデバッグスクリプトを実行 