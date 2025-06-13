# Resendメール通知システムのセットアップ

このドキュメントでは、MUED LMSプロジェクトでResendを使用してメール通知を設定する手順を説明します。

## 1. Resendアカウントの作成

1. [Resend公式サイト](https://resend.com)にアクセスし、アカウントを作成します。
2. アカウント作成後、APIキーを生成します。
   - ダッシュボードから「API Keys」セクションに移動
   - 「Create API Key」をクリックし、適切な権限（Production）でキーを生成
   - 生成されたAPIキーを安全に保管します

## 2. 送信ドメインの設定

1. Resendのダッシュボードで「Domains」セクションを開きます。
2. 「Add Domain」をクリックし、メール送信に使用するドメイン（例：`mued.jp`）を追加します。
3. 表示されるDNSレコード（SPF, DKIM, DMARCなど）を、ドメインのDNS設定に追加します。
4. DNSレコードの伝播を待ち、ドメインの検証を完了します。

## 3. 環境変数の設定

### Supabase環境での設定

1. Supabaseダッシュボードにログインします。
2. プロジェクトを選択し、「Settings」→「API」セクションに移動します。
3. 「Environment Variables」セクションで以下の環境変数を追加します：

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

4. また、Edge Functionがアクセスする必要がある他の環境変数も設定します：

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_URL=https://your-app-url.com
```

### ローカル開発環境での設定

1. プロジェクトルートの`.env.local`ファイルに以下を追加します：

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

## 4. Edge Functionのデプロイ

1. Supabase CLIをインストールしていない場合は、インストールします：

```bash
npm install -g supabase
```

2. Supabase CLIでログインします：

```bash
supabase login
```

3. Edge Functionをデプロイします：

```bash
supabase functions deploy reservation-email --project-ref zyesgfkhaqpbcbkhsutw
```

## 5. データベーストリガーの確認

1. `supabase/migrations/20250616000001_reservation_email_trigger.sql`ファイルがプロジェクトに含まれていることを確認します。
2. Supabaseマイグレーションを実行します：

```bash
supabase db push
```

または、Supabaseダッシュボードの「SQL Editor」から直接SQLスクリプトを実行します。

## 6. 動作確認

1. テスト予約を作成し、ステータスを`CONFIRMED`に更新します。
2. Supabaseのログで正常に処理されていることを確認します（Dashboard → Functions → Logs）。
3. テスト用のメールアドレスに通知が届いていることを確認します。
4. `email_logs`テーブルにログが記録されていることを確認します。

## トラブルシューティング

### メールが届かない場合

1. Edge Functionのログを確認します（Supabaseダッシュボード → Functions → Logs）
2. 環境変数が正しく設定されていることを確認します
3. テストモードの場合、Resendは検証済みのメールアドレスにのみ送信できることに注意してください
4. `email_logs`テーブルでエラーメッセージを確認します

### Edge Functionがトリガーされない場合

1. トリガー関数が正しくインストールされているか確認します（Supabaseダッシュボード → Database → Triggers）
2. 予約ステータスが正しく`CONFIRMED`に更新されているか確認します
3. Supabase設定で`app.settings.supabase_url`と`app.settings.service_role_key`が設定されているか確認します

## セキュリティに関する注意事項

- RESEND_API_KEYは公開しないでください
- 本番環境では、承認されたメールアドレスのリストを使用してスパム送信を防止することを検討してください
- メールテンプレートではユーザー入力をエスケープし、HTMLインジェクションを防止してください 