FROM node:20-alpine

WORKDIR /app

# 非rootユーザーの作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 依存関係のインストール（キャッシュ最適化）
COPY package.json package-lock.json ./
RUN npm ci

# ソースコードのコピー
COPY . .

# workspace ディレクトリの作成（非rootユーザーが書き込み可能に）
RUN mkdir -p /app/workspace && chown -R nextjs:nodejs /app/workspace

# 非rootユーザーに切り替え
USER nextjs

EXPOSE 3000

CMD ["npm", "run", "dev"]
