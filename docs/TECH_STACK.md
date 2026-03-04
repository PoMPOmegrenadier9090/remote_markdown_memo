# 技術スタック

## 1. コア技術

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| ランタイム | Node.js | 20 LTS | サーバーサイド実行環境 |
| フレームワーク | Next.js | 14+ | フルスタックReactフレームワーク |
| 言語 | TypeScript | 5.x | 型安全な開発 |
| パッケージマネージャ | npm | 10+ | 依存関係管理 |

## 2. フロントエンド

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| UIライブラリ | React 18+ | コンポーネントベースUI |
| ルーティング | Next.js App Router | ファイルベースルーティング |
| エディタ | CodeMirror 6 | マークダウンエディタ本体 |
| マークダウンパーサ | @codemirror/lang-markdown | CM6用マークダウン言語サポート |
| Lezer パーサ | @lezer/markdown | マークダウンAST解析（Decoration用） |
| スタイリング | Tailwind CSS 3.x | ユーティリティファーストCSS |
| アイコン | Lucide React | SVGアイコンセット |

### CodeMirror 6 関連パッケージ

```
@codemirror/state          # エディタ状態管理
@codemirror/view           # エディタビュー・DOM管理
@codemirror/lang-markdown  # マークダウン言語サポート
@codemirror/language        # 言語インフラ
@codemirror/commands        # 基本コマンド（Undo/Redo等）
@codemirror/search          # 検索・置換
@codemirror/autocomplete    # 自動補完
@codemirror/theme-one-dark  # ダークテーマ（ベース）
@lezer/markdown             # マークダウンパーサ（AST操作用）
@lezer/highlight            # シンタックスハイライト
```

## 3. バックエンド

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| API | Next.js Route Handlers | RESTful APIエンドポイント |
| 認証 | NextAuth.js v5 | OAuth2認証フロー |
| Google API | googleapis | Google Drive API v3 クライアント |
| ファイルシステム | Node.js fs/promises | ローカルファイル操作 |

## 4. 開発環境

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| コンテナ | Docker / Docker Compose | 開発環境のコンテナ化 |
| ベースイメージ | node:20-alpine | 軽量Node.jsイメージ |
| リンター | ESLint | コード品質チェック |
| フォーマッター | Prettier | コードフォーマット |
| テスト | Vitest | ユニットテスト |
| テスト（UI） | React Testing Library | コンポーネントテスト |

## 5. Docker構成

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# workspace ディレクトリの作成
RUN mkdir -p /app/workspace

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### docker-compose.yml

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app                          # ソースコード（ホットリロード用）
      - /app/node_modules               # node_modulesはコンテナ内のみ
      - workspace_data:/app/workspace   # 同期ファイル永続化
    env_file:
      - .env.local
    environment:
      - NODE_ENV=development

volumes:
  workspace_data:
```

## 6. 依存関係一覧（予定）

### dependencies

```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "@codemirror/state": "^6.0.0",
  "@codemirror/view": "^6.0.0",
  "@codemirror/lang-markdown": "^6.0.0",
  "@codemirror/language": "^6.0.0",
  "@codemirror/commands": "^6.0.0",
  "@codemirror/search": "^6.0.0",
  "@codemirror/theme-one-dark": "^6.0.0",
  "@lezer/markdown": "^1.0.0",
  "@lezer/highlight": "^1.0.0",
  "next-auth": "^5.0.0",
  "googleapis": "^130.0.0",
  "lucide-react": "^0.300.0"
}
```

### devDependencies

```json
{
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.0.0",
  "autoprefixer": "^10.0.0",
  "eslint": "^8.0.0",
  "eslint-config-next": "^14.0.0",
  "prettier": "^3.0.0",
  "prettier-plugin-tailwindcss": "^0.5.0",
  "vitest": "^1.0.0",
  "@testing-library/react": "^14.0.0",
  "@types/node": "^20.0.0",
  "@types/react": "^18.0.0",
  "@types/react-dom": "^18.0.0"
}
```

## 7. 外部サービス

| サービス | 用途 | 必要な設定 |
|---------|------|-----------|
| Google Cloud Console | OAuth2クライアント作成 | Client ID, Client Secret |
| Google Drive API v3 | ファイル同期 | API有効化、OAuth同意画面設定 |

### Google Cloud Console セットアップ手順

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. 「APIとサービス」→「ライブラリ」→ Google Drive API を有効化
3. 「APIとサービス」→「認証情報」→ OAuth 2.0 クライアントIDを作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みリダイレクトURI: `http://localhost:3000/api/auth/callback/google`
4. 「OAuth同意画面」を設定
   - スコープ: `https://www.googleapis.com/auth/drive.file`
5. Client ID と Client Secret を `.env.local` に設定

## 8. 技術選定の理由

### なぜ Next.js か
- フルスタック（フロントエンド + API Route）を1プロジェクトで構築可能
- App Routerによるモダンなアーキテクチャ
- Server Componentsでパフォーマンス最適化
- 豊富なエコシステムとコミュニティ

### なぜ CodeMirror 6 か
- Obsidianと同じエディタ基盤で、Live Preview実績あり
- Decoration APIによる柔軟なインラインレンダリング
- TypeScript完全対応
- 軽量で高パフォーマンス
- VS Code風キーバインドの設定が可能

### なぜ NextAuth.js か
- Next.jsとの統合が最もスムーズ
- Googleプロバイダが組み込み対応
- トークンリフレッシュ機能
- セッション管理が自動化

### なぜ Docker か
- OS非依存の開発環境
- Node.jsバージョンの統一
- workspace ボリュームによるファイル永続化
- 本番環境へのデプロイも同一イメージで対応可能
