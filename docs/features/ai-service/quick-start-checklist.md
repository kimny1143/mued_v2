# AI Service クイックスタートチェックリスト

## 🚀 今すぐ始められる作業

### Day 1: 環境準備
- [x] Herokuアプリ作成（✅ 既に`mued-api`として作成済み）
  ```bash
  # 既存のHerokuアプリ: https://mued-api.herokuapp.com
  # Swagger UI: https://mued-api.herokuapp.com/docs
  ```

- [ ] 必要な環境変数をHerokuに設定
  ```bash
  # Herokuダッシュボードまたはコマンドラインで設定
  heroku config:set OPENAI_API_KEY=sk-xxx --app mued-api
  heroku config:set ANTHROPIC_API_KEY=sk-ant-xxx --app mued-api
  heroku config:set YOUTUBE_API_KEY=xxx --app mued-api
  
  # Supabase接続（既存のDATABASE_URLを使用）
  heroku config:set SUPABASE_URL=xxx --app mued-api
  heroku config:set SUPABASE_SERVICE_KEY=xxx --app mued-api
  ```

- [ ] requirements.txt更新
  ```bash
  # 最低限必要なパッケージを追加
  echo "openai>=1.0.0" >> requirements.txt
  echo "anthropic>=0.7.0" >> requirements.txt
  echo "langchain>=0.1.0" >> requirements.txt
  ```

### Day 2-3: 最初のLLM統合
- [ ] OpenAIクライアント作成
  ```python
  # app/core/llm/openai_client.py
  from openai import OpenAI
  
  class OpenAIClient:
      def __init__(self):
          self.client = OpenAI()
      
      async def generate_material(self, prompt: str) -> str:
          response = await self.client.chat.completions.create(
              model="gpt-4",
              messages=[{"role": "user", "content": prompt}]
          )
          return response.choices[0].message.content
  ```

- [ ] 既存の`/api/v1/generate/material`エンドポイントを実装に置き換え

### Day 4-5: 基本的な教材生成
- [ ] シンプルなプロンプトテンプレート作成
- [ ] テスト用UIページ作成（Next.js側）
- [ ] Herokuにデプロイしてテスト

## 📊 進捗トラッキング

### Week 1 目標
- [ ] 基本的なLLM統合完了
- [ ] 1つ以上の実動作するエンドポイント
- [ ] Herokuでの動作確認

### Week 2 目標  
- [ ] ナレッジベースの基礎実装
- [ ] RSSフィード取得機能
- [ ] 簡単な検索機能

### Week 3 目標
- [ ] 教材生成の品質向上
- [ ] プロンプトエンジニアリング
- [ ] ユーザーフィードバック収集開始

## 🔥 最優先タスク

1. **今日中に完了**
   - [ ] Herokuアプリ作成
   - [ ] 環境変数設定
   - [ ] requirements.txt更新

2. **今週中に完了**
   - [ ] OpenAIクライアント実装
   - [ ] 1つのエンドポイント実装
   - [ ] デプロイとテスト

3. **来週までに完了**
   - [ ] 基本的な教材生成フロー
   - [ ] フロントエンドとの統合
   - [ ] ユーザーテスト開始

## 💡 実装のコツ

1. **小さく始める**
   - まず1つの機能を完全に動かす
   - 徐々に機能を追加

2. **早期デプロイ**
   - 毎日デプロイする
   - 実環境でのフィードバックを得る

3. **コスト監視**
   - 最初から使用量を追跡
   - アラート設定を忘れずに

## 🎯 成功指標

### Phase 1（2週間後）
- [ ] 基本的な教材生成が可能
- [ ] 5人以上のテストユーザー
- [ ] 日次デプロイの習慣化

### Phase 2（1ヶ月後）
- [ ] 3種類以上の教材フォーマット
- [ ] ナレッジベース機能の基礎
- [ ] 使用量ダッシュボード

### Phase 3（2ヶ月後）
- [ ] カリキュラム生成機能
- [ ] 動画文字起こし対応
- [ ] 本番環境での安定稼働