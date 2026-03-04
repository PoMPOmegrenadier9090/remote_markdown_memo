# Remote Markdown Memo

ブラウザ上でマークダウンメモを記述・編集し、Google Driveと同期するWebアプリケーション。

## 概要

Remote Markdown Memoは、Obsidian風のLive Preview（CodeMirror 6）を搭載したマークダウンエディタです。Google Driveの特定ディレクトリをワークスペースとして利用し、手動でのPull/Push操作によりファイルを同期します。

### 主な特徴

- **Obsidian風 Live Preview**: マークダウン記法をインラインでリアルタイムレンダリング（CodeMirror 6 + カスタムDecoration）
- **Google Drive同期**: 手動Pull/Pushによる安全なファイル同期
- **VS Code風UI**: サイドバー（ファイルツリー）+ エディタの2ペインレイアウト
- **階層構造対応**: フォルダ・サブフォルダを含むツリービュー
- **Docker開発環境**: OS非依存の開発・実行環境

## ドキュメント

| ドキュメント | 内容 |
|------------|------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | システムアーキテクチャ設計 |
| [docs/TECH_STACK.md](docs/TECH_STACK.md) | 技術スタック詳細 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 開発規約・コーディングガイドライン |
| [docs/SYNC_STRATEGY.md](docs/SYNC_STRATEGY.md) | Google Drive同期戦略 |

## クイックスタート

```bash
# リポジトリのクローン
git clone https://github.com/PoMPOmegrenadier9090/remote_markdown_memo.git
cd remote_markdown_memo
```

### 環境変数の設定
Google Cloud Consoleにおいて，Google Drive APIを許可しOAuthクライアントIDとSecretを発行してください．

```.env
# Google OAuthのクライアントID
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# 本アプリケーションで利用するGoogle DriveのフォルダのID(URLから確認可能)
GOOGLE_DRIVE_FOLDER_ID=your_folder_id

# NextAuth.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# ワークスペース
WORKSPACE_PATH=/app/workspace
```

### Docker環境の起動

```bash
docker compose up -d
```

### ブラウザでアクセス

```bash
open http://localhost:3000
```
