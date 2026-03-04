# アーキテクチャ設計

## 1. システム全体構成

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│  ┌───────────┐  ┌────────────────────────────────────┐  │
│  │ Sidebar   │  │  CodeMirror 6 Editor               │  │
│  │ (FileTree)│  │  + Live Preview Decorations        │  │
│  │           │  │  (Obsidian-style inline rendering) │  │
│  └─────┬─────┘  └──────────────┬─────────────────────┘  │
│        └───────────┬───────────┘                        │
│                    ▼                                    │
│          Next.js Frontend (App Router)                  │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
                     ▼
┌────────────────────────────────────────────────────────┐
│             Next.js Backend (API Routes)               │
│  ┌───────────────┐  ┌──────────────────────────────┐   │
│  │ File API      │  │ Google Drive Sync API        │   │
│  │ (CRUD)        │  │ (Pull / Push)                │   │
│  └───────┬───────┘  └──────────────┬───────────────┘   │
│          │                         │                   │
│          ▼                         ▼                   │
│  ┌───────────────┐  ┌──────────────────────────────┐   │
│  │ Local FS      │  │ Google Drive API v3          │   │
│  │ (Docker Vol.) │  │ (OAuth2)                     │   │
│  └───────────────┘  └──────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

## 2. レイヤー構成

本アプリケーションは以下の3レイヤーで構成される。

### 2.1 プレゼンテーション層（Frontend）

- **担当**: UI表示、ユーザーインタラクション
- **技術**: React (Next.js App Router), CodeMirror 6, Tailwind CSS
- **主要コンポーネント**:
  - `Sidebar` - ファイルツリー、同期ボタン
  - `MarkdownEditor` - CodeMirror 6ベースのエディタ（Live Preview付き）
  - `Toolbar` - ファイル操作、設定
  - `StatusBar` - 同期状態、ファイル情報

### 2.2 アプリケーション層（API Routes）

- **担当**: ビジネスロジック、外部API連携
- **技術**: Next.js API Routes (Route Handlers)
- **主要エンドポイント**:
  - `/api/files` - ローカルファイルのCRUD操作
  - `/api/sync/pull` - Google Drive → ローカルの同期
  - `/api/sync/push` - ローカル → Google Driveの同期
  - `/api/auth` - Google OAuth2認証

### 2.3 データ層（Storage）

- **ローカルストレージ**: Docker Volume上のファイルシステム
- **リモートストレージ**: Google Drive（Single Source of Truth）
- **メタデータ**: JSON形式でローカル管理（同期状態の追跡用）

## 3. ディレクトリ構成

```
obsidian_remote_memo/
├── docker-compose.yml
├── Dockerfile
├── .env.local                    # 環境変数（OAuth credentials等）
├── .env.example                  # 環境変数テンプレート
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
│
├── docs/                         # プロジェクトドキュメント
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── DEVELOPMENT.md
│   └── SYNC_STRATEGY.md
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # ルートレイアウト
│   │   ├── page.tsx              # メインページ
│   │   ├── globals.css           # グローバルスタイル
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts  # NextAuth.js 認証エンドポイント
│   │       ├── files/
│   │       │   ├── route.ts      # GET: ファイル一覧取得
│   │       │   └── [path]/
│   │       │       └── route.ts  # GET/PUT/DELETE: 個別ファイル操作
│   │       └── sync/
│   │           ├── pull/
│   │           │   └── route.ts  # POST: Google Drive → Local
│   │           └── push/
│   │               └── route.ts  # POST: Local → Google Drive
│   │
│   ├── components/               # Reactコンポーネント
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── FileTree.tsx
│   │   │   ├── FileTreeItem.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── StatusBar.tsx
│   │   ├── editor/
│   │   │   ├── MarkdownEditor.tsx
│   │   │   ├── extensions/       # CodeMirror 6 拡張
│   │   │   │   ├── livePreview.ts
│   │   │   │   ├── headingWidget.ts
│   │   │   │   ├── linkWidget.ts
│   │   │   │   ├── imageWidget.ts
│   │   │   │   ├── codeBlock.ts
│   │   │   │   ├── listWidget.ts
│   │   │   │   └── emphasisWidget.ts
│   │   │   └── theme.ts
│   │   └── sync/
│   │       ├── SyncButton.tsx
│   │       └── ConflictDialog.tsx
│   │
│   ├── lib/                      # ユーティリティ・ビジネスロジック
│   │   ├── auth.ts               # NextAuth.js 設定
│   │   ├── googleDrive.ts        # Google Drive API操作
│   │   ├── fileSystem.ts         # ローカルFS操作
│   │   └── syncEngine.ts         # 同期ロジック
│   │
│   ├── hooks/                    # カスタムReact Hooks
│   │   ├── useFileTree.ts
│   │   ├── useEditor.ts
│   │   └── useSync.ts
│   │
│   └── types/                    # TypeScript型定義
│       └── index.ts
│
└── workspace/                    # 同期ファイル保存先（Docker Volume）
    └── .sync-metadata.json       # 同期メタデータ
```

## 4. データフロー

### 4.1 ファイル読み込みフロー

```
ユーザーがサイトにアクセス
  → [Frontend] メタデータ同期リクエスト
  → [API] Google Drive files.list でメタデータ取得
  → [API] ローカルメタデータと比較・更新
  → [Frontend] ファイルツリー描画

ユーザーがファイルをクリック
  → [Frontend] ファイル取得リクエスト
  → [API] ローカルにキャッシュがあり最新 → ローカルから返却
  → [API] ローカルにない or 古い → Google Driveから取得 → ローカル保存 → 返却
  → [Frontend] CodeMirrorエディタに表示
```

### 4.2 ファイル保存フロー

```
ユーザーが編集
  → [Frontend] 自動保存（debounce: 1秒）
  → [API] ローカルFSに保存
  → [API] メタデータのisDirtyフラグをtrueに

ユーザーがPushボタン押下
  → [Frontend] Push リクエスト
  → [API] isDirty=trueのファイルを収集
  → [API] 各ファイルのDrive側modifiedTimeを確認（コンフリクト検出）
  → [API] コンフリクトなし → Google Driveにアップロード
  → [API] コンフリクトあり → フロントに通知 → ユーザー選択
  → [API] isDirtyフラグをfalseに更新
```

## 5. 主要コンポーネントの責務

### MarkdownEditor

- CodeMirror 6のEditorViewを管理
- Live Preview用のDecoration拡張を統合
- ファイル内容の読み込み・保存をhooks経由で実行
- キーバインド管理（保存、検索等）

### FileTree

- 階層構造のファイルツリーを表示
- フォルダの展開/折りたたみ
- ファイル選択時にエディタへ通知
- 右クリックメニュー（新規作成・削除・リネーム）

### SyncEngine (lib/syncEngine.ts)

- `syncMetadata()` - Driveメタデータとローカルの差分検出
- `pullFile(path)` - 特定ファイルをDriveから取得
- `pushChanges()` - 変更ファイルをDriveへアップロード
- `detectConflicts()` - コンフリクト検出
- `resolveConflict()` - コンフリクト解消

## 6. セキュリティ考慮事項

- Google OAuth2トークンはサーバー側セッションで管理（クライアントに露出しない）
- API RouteはNextAuth.jsのセッション検証を必須とする
- 環境変数（Client ID/Secret）は `.env.local` で管理し、Gitにコミットしない
- Docker環境では `workspace/` ディレクトリのパーミッションを適切に設定
