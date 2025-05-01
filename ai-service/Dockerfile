FROM python:3.10-slim AS base

WORKDIR /app

# 依存関係ファイルをコピー
COPY requirements.txt .

# 開発環境ステージ
FROM base AS development

# 依存関係をインストール（テスト関連の依存関係も含む）
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir pytest-cov pytest-xdist pytest-watch

# アプリケーションコードをコピー
COPY ./app ./app
COPY ./tests ./tests
COPY ./conftest.py ./conftest.py

# 環境変数を設定（テスト実行のためのPYTHONPATH）
ENV PYTHONPATH=/app:/app/app

# ポートを公開
EXPOSE 8000

# アプリを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# テスト環境ステージ
FROM base AS testing

# テスト用依存関係を追加インストール
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir pytest-cov pytest-xdist pytest-watch

# テスト用のコードをコピー
COPY ./app ./app
COPY ./tests ./tests
COPY ./conftest.py ./conftest.py

# 環境変数を設定
ENV PYTHONPATH=/app:/app/app

# テスト実行
CMD ["pytest", "-xvs", "--cov=app"]

# 本番環境ステージ
FROM base AS production

# 本番環境用に最小限の依存関係のみをインストール
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードをコピー
COPY ./app ./app

# ポートを公開
EXPOSE 8000

# アプリを起動（リロードなし）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 