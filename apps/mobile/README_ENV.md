# モバイル版環境変数設定ガイド

## Vercel環境変数設定

モバイル版PWAアプリをVercelにデプロイする際は、以下の環境変数を設定してください。

### 1. Production (本番環境)
```
REACT_APP_API_URL=https://www.mued.jp
REACT_APP_SUPABASE_URL=<Supabase本番環境URL>
REACT_APP_SUPABASE_ANON_KEY=<Supabase本番環境の匿名キー>
```

### 2. Preview (プレビュー環境)
```
REACT_APP_API_URL=https://mued-lms-fgm-git-develop-glasswerks.vercel.app
REACT_APP_SUPABASE_URL=<Supabaseステージング環境URL>
REACT_APP_SUPABASE_ANON_KEY=<Supabaseステージング環境の匿名キー>
```

### 3. Development (開発環境)
開発環境では`.env.local`ファイルを作成し、以下を設定：
```
# ローカル開発時はプレビュー環境のAPIを使用
REACT_APP_API_URL=https://mued-lms-fgm-git-develop-glasswerks.vercel.app
REACT_APP_SUPABASE_URL=<Supabase開発環境URL>
REACT_APP_SUPABASE_ANON_KEY=<Supabase開発環境の匿名キー>
```

## 設定方法

1. Vercelダッシュボードにログイン
2. モバイルアプリのプロジェクトを選択
3. "Settings" → "Environment Variables" に移動
4. 各環境（Production/Preview/Development）ごとに上記の変数を設定

## 注意事項

- `REACT_APP_`プレフィックスは必須です（Create React Appの仕様）
- Supabaseの認証情報はPC版（web）と同じものを使用してください
- API URLは末尾にスラッシュを含めないでください
- プロキシ設定は不要です（Vercel上で環境を分けているため）