FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール（キャッシュ最適化）
COPY package.json package-lock.json ./
RUN npm ci

# ソースコードのコピー
COPY . .

# workspace ディレクトリの作成
RUN mkdir -p /app/workspace

EXPOSE 3000

CMD ["npm", "run", "dev"]
