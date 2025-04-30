FROM node:18-alpine

WORKDIR /app

# 依存関係をコピーしてインストール
COPY package*.json ./
RUN npm ci

# アプリケーションコードをコピー
COPY . .

# ビルドと起動
EXPOSE 3000
CMD ["npm", "run", "dev"] 