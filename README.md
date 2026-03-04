# Obsidian Remote Memo

ブラウザ上でマークダウンメモを記述・編集し、Google Driveと同期するWebアプリケーション。

## 概要

Obsidian Remote Memoは、Obsidian風のLive Preview（CodeMirror 6）を搭載したマークダウンエディタです。Google Driveの特定ディレクトリをワークスペースとして利用し、手動でのPull/Push操作によりファイルを同期します。

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
git clone https://github.com/your-username/obsidian_remote_memo.git
cd obsidian_remote_memo

# Docker環境の起動
docker compose up -d

# ブラウザでアクセス
open http://localhost:3000
```
