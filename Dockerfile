## ---- ビルドステージ ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

## ---- 本番ステージ ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 非rootユーザーの作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ビルド成果物のコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# workspace ディレクトリの作成
RUN mkdir -p /app/workspace && chown -R nextjs:nodejs /app/workspace

USER nextjs

EXPOSE 6666

ENV HOSTNAME="0.0.0.0"
ENV PORT=6666

CMD ["node", "server.js"]
