---
description: Obsidian Remote Memo プロジェクトのコーディング規約と実装方針
applyTo: '**/*.{ts,tsx,js,jsx,json,md,css,yml,yaml}'
---

# Obsidian Remote Memo - Copilot 指示

## プロジェクト概要
ブラウザ上でマークダウンメモを編集し、Google Driveと同期するWebアプリ。
Obsidian風のLive Preview（CodeMirror 6）を搭載。

## 技術スタック
- **フレームワーク**: Next.js 14+ (App Router)
- **言語**: TypeScript (strict mode)
- **エディタ**: CodeMirror 6 + カスタムDecoration（Live Preview）
- **認証**: NextAuth.js v5 (Google OAuth2)
- **Google Drive**: googleapis (Drive API v3)
- **スタイリング**: Tailwind CSS
- **アイコン**: Lucide React
- **開発環境**: Docker Compose

## コーディング規約
- 関数型プログラミングを優先。不要なclassの使用を避ける
- Reactコンポーネントは関数コンポーネント + 名前付きexportを使う（default export禁止）
- コンポーネントファイル: PascalCase（例: FileTree.tsx）
- Hooks: camelCase, useプレフィックス（例: useFileTree.ts）
- ユーティリティ: camelCase（例: syncEngine.ts）
- 定数: UPPER_SNAKE_CASE
- anyの使用禁止。unknownを使い型ガードで絞り込む
- エラーハンドリングはカスタムエラークラスまたはResult型を使用

## APIレスポンス形式
- 成功: `{ data: T }`
- エラー: `{ error: { code: string, message: string } }`

## 同期方針
- Google Drive = Single Source of Truth
- アクセス時にメタデータ軽量同期
- ファイルオープン時に本文オンデマンド取得
- 編集はローカル自動保存、Push時にDriveへアップロード
- コンフリクト時はユーザーに選択させる

## ファイル配置
- コンポーネント: src/components/
- API Route: src/app/api/
- ロジック: src/lib/
- Hooks: src/hooks/
- 型定義: src/types/

## ドキュメント参照
- アーキテクチャ: docs/ARCHITECTURE.md
- 技術スタック: docs/TECH_STACK.md
- 開発規約: docs/DEVELOPMENT.md
- 同期戦略: docs/SYNC_STRATEGY.md
