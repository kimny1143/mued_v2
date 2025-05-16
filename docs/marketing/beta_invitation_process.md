# βユーザー招待プロセス設計案

## 1. 招待スケジュール

- **対象者:** `docs/marketing/beta_user_list.md` に記載の候補者リスト
- **招待グループ:** 3グループに分割
    - グループ1: 音楽講師 10名
    - グループ2: 音楽講師 10名 + 音楽学校 5校
    - グループ3: 独立アーティスト 10名
- **招待タイミング:**
    - Week 3 月曜: グループ1へ招待メール送信
    - Week 5 月曜: グループ2へ招待メール送信
    - Week 7 月曜: グループ3へ招待メール送信
- **招待状:** `docs/marketing/beta_invitation_email_template.md` を使用

## 2. 招待メール送信方法

- **送信ツール:** [手動 / Mailchimp / SendGrid などを検討]
    - ※ MVP段階では手動送信も可。リストが増えればツール導入。
- **送信元アドレス:** `beta-invite@mued.jp` (仮)
- **パーソナライズ:** メールテンプレートの `[ユーザー名]` と `[講師/教育関係者/アーティスト]` 部分を各候補者に合わせて調整。

## 3. フォローアップ

- **リマインダー:** 招待送信から3営業日後に未登録者へリマインダーメール送信（別途テンプレート作成）
- **オンボーディング:** 登録者向けにオンライン説明会（Week 3 水曜、Week 5 水曜、Week 7 水曜に開催予定）を実施。
- **フィードバック収集:**
    - β版利用開始1週間後にアンケートフォームを送付
    - 定期的なヒアリング（希望者のみ）
- **サポート:** 専用の問い合わせ窓口（例: Slackチャンネル、メールアドレス）を用意。

## 4. 登録リンクとトラッキング

- **UTMパラメータ:** グループごとに異なる `utm_campaign` を設定し、招待メール内の登録リンクに付与する。
    - グループ1: `?utm_source=beta_invite&utm_medium=email&utm_campaign=beta_group1_lecturer`
    - グループ2: `?utm_source=beta_invite&utm_medium=email&utm_campaign=beta_group2_lecturer_school`
    - グループ3: `?utm_source=beta_invite&utm_medium=email&utm_campaign=beta_group3_artist`
- **Google Analytics (GA4):**
    - **コンバージョン:** ユーザー登録完了後に表示されるサンクスページ (`/signup/thank-you` など) への到達をコンバージョンイベントとして設定。
    - **イベントトラッキング:** 
        - `beta_invite_link_click`: 招待メール内の登録リンククリック
        - `beta_signup_form_submit`: β版登録フォームの送信
        - `beta_signup_complete`: β版登録完了 (コンバージョンイベントと連携)
    - **レポート:** キャンペーン (UTMパラメータ) 別のコンバージョン率を追跡。
- **Supabase連携:** (BE担当: 佐藤さんと要連携)
    - **目的:** どの招待キャンペーンからユーザーが登録したかをDBレベルで追跡する。
    - **実装案:**
        - `users` テーブルに以下のカラムを追加することを検討:
            - `invited_campaign` (TEXT型): 招待時の `utm_campaign` 値を格納 (例: 'beta_group1_lecturer')
            - `invitation_code` (TEXT型, nullable): もし個別の招待コードを発行する場合
        - **データ取得:** ユーザー登録処理時に、フロントエンドからURLクエリパラメータ (UTM) を取得し、API経由でバックエンドに渡し、`users` テーブルに保存する。
    - **RLS:** 必要に応じて、これらのカラムへのアクセス権限を設定。 