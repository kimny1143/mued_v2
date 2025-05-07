# MUED LMS AI Service

音楽教育LMSのAIサービスコンポーネント。FastAPIを使用した、コース生成、練習記録管理、チャットメッセージングなどの機能を提供するマイクロサービスです。

## 機能

- コース生成 API
- 練習記録管理 API
- チャットメッセージング API
- MusicXML変換 API
- Webhook処理（Stripe、汎用）

## 環境構築

### 開発環境

```bash
# コンテナをビルドして起動
docker-compose up -d

# ログを確認
docker-compose logs -f ai-service
```

FastAPIサーバーは http://localhost:8000 で実行されます。
API ドキュメントは http://localhost:8000/docs で確認できます。

### テスト実行

#### 簡易テスト実行スクリプト

開発環境のDockerコンテナが起動している場合は既存のコンテナでテストを実行し、起動していない場合はテスト用コンテナを使用する便利なスクリプトが用意されています：

```bash
./run_docker_tests.sh
```

#### Docker上でのテスト実行（手動）

既存の開発コンテナでテストを実行する場合:

```bash
docker-compose exec ai-service pytest -xvs
```

カバレッジレポートを生成する場合:

```bash
docker-compose exec ai-service pytest -xvs --cov=app --cov-report=term-missing
```

#### 専用テストコンテナを使用する場合

単発でテストを実行する場合:

```bash
docker-compose -f docker-compose.test.yml up ai-service-test --build
```

ファイル変更を監視してテストを自動実行する場合:

```bash
docker-compose -f docker-compose.test.yml up ai-service-test-watch --build
```

#### ローカル環境でのテスト実行（非推奨）

Docker環境が利用できない場合に限り、ローカル環境でテストを実行できます：

```bash
# 仮想環境がある場合は有効化
source venv/bin/activate  # または conda activate mued-ai

# PYTHONPATHを設定してテストを実行
./run_tests.sh
```

### API エンドポイント

#### コース生成

```
POST /api/v1/courses/generate
```

指定されたトピックと条件に基づいて新しいコースを生成します。

#### 練習記録

```
POST /api/v1/exercise/logs
```

ユーザーの練習記録を保存します。

#### チャットメッセージ

```
GET /api/v1/chat/messages?room_id={room_id}
POST /api/v1/chat/messages
```

チャットメッセージの取得と作成を行います。

#### MusicXML変換

```
POST /api/v1/musicxml/convert
```

MusicXMLデータをJSON形式またはプレビュー画像に変換します。

#### Webhook

```
POST /api/v1/webhooks/general
POST /api/v1/webhooks/stripe
```

様々なサービスからのイベント通知を受け取るためのWebhookエンドポイント。

## APIエンドポイント

### コース生成エンドポイント
- エンドポイント: `/courses/generate`
- メソッド: POST
- 説明: 指定されたトピックと条件に基づいて新しいコースを生成します

### 教材生成エンドポイント
- エンドポイント: `/generate/material`
- メソッド: POST
- 説明: 指定されたトピックと条件に基づいて新しい教材を生成します
- リクエスト例:
```json
{
  "topic": "ジャズピアノ入門",
  "level": "beginner",
  "format": "pdf",
  "language": "ja",
  "goal": "ジャズピアノの基本テクニックを習得する",
  "additional_instructions": "初心者向けに詳しく説明してください"
}
```

### 練習記録保存エンドポイント
- エンドポイント: `/exercise/logs`
- メソッド: POST
- 説明: ユーザーの練習記録を保存します 