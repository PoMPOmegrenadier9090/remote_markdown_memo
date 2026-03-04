# 開発規約・コーディングガイドライン

## 1. 基本方針

- **言語**: TypeScript（strictモード）
- **スタイル**: 関数型プログラミングを優先。不要なclassの使用を避ける
- **命名**: 英語で一貫した命名を行う
- **コメント**: コードの「なぜ（Why）」を説明。「何を（What）」はコード自体で表現する

## 2. ファイル・ディレクトリ命名規約

| 対象 | 規約 | 例 |
|------|------|-----|
| Reactコンポーネント | PascalCase | `FileTree.tsx`, `MarkdownEditor.tsx` |
| Hooks | camelCase, `use`プレフィックス | `useFileTree.ts`, `useSync.ts` |
| ユーティリティ・ライブラリ | camelCase | `syncEngine.ts`, `googleDrive.ts` |
| 型定義ファイル | camelCase | `index.ts` (types/) |
| API Route | 小文字、ケバブケース（ディレクトリ） | `api/sync/pull/route.ts` |
| 定数 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `SYNC_INTERVAL` |
| CSSクラス | Tailwind CSSユーティリティクラスを使用 | - |
| 環境変数 | UPPER_SNAKE_CASE, プレフィックスあり | `GOOGLE_CLIENT_ID`, `NEXTAUTH_SECRET` |

## 3. TypeScript規約

### 3.1 型定義

```typescript
// ✅ Good: interfaceで定義（拡張可能性を考慮）
interface FileMetadata {
  id: string;
  name: string;
  path: string;
  modifiedTime: string;
  isDirty: boolean;
}

// ✅ Good: Union型にはtypeを使用
type SyncStatus = "idle" | "syncing" | "error" | "success";

// ❌ Bad: anyの使用は禁止
const data: any = fetchData();

// ✅ Good: unknownを使い、型ガードで絞り込む
const data: unknown = fetchData();
if (isFileMetadata(data)) {
  // data は FileMetadata 型
}
```

### 3.2 関数

```typescript
// ✅ Good: 戻り値の型を明示
export async function fetchFileList(): Promise<FileMetadata[]> {
  // ...
}

// ✅ Good: 引数にはオブジェクト型を使用（3つ以上の場合）
interface PullOptions {
  path: string;
  force?: boolean;
  onProgress?: (progress: number) => void;
}

export async function pullFile(options: PullOptions): Promise<void> {
  // ...
}
```

### 3.3 エラーハンドリング

```typescript
// ✅ Good: カスタムエラークラスを定義
export class SyncConflictError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly localModifiedTime: string,
    public readonly remoteModifiedTime: string,
  ) {
    super(`Sync conflict detected for ${filePath}`);
    this.name = "SyncConflictError";
  }
}

// ✅ Good: Result型パターン（例外を投げずに結果を返す）
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

## 4. React / Next.js 規約

### 4.1 コンポーネント設計

```typescript
// ✅ Good: 関数コンポーネント + 名前付きexport
export function FileTreeItem({ file, onSelect, depth }: FileTreeItemProps) {
  // ...
}

// ✅ Good: Props型はコンポーネント名 + Props
interface FileTreeItemProps {
  file: FileMetadata;
  onSelect: (file: FileMetadata) => void;
  depth: number;
}

// ❌ Bad: default export（テスト・リファクタリングの都合上）
export default function FileTreeItem() { /* ... */ }
```

### 4.2 Server Components / Client Components

```typescript
// Client Componentが必要な場合のみ "use client" を使用
// 以下の場合にClient Componentとする:
// - useState, useEffect 等のReact Hooksを使用
// - ブラウザAPIへのアクセス
// - イベントハンドラ（onClick等）の使用
// - CodeMirror等のブラウザ専用ライブラリ

"use client";

import { useState } from "react";

export function MarkdownEditor() {
  // ...
}
```

### 4.3 状態管理

- **ローカル状態**: `useState` / `useReducer`
- **コンポーネント間共有**: React Context（必要最小限のスコープ）
- **サーバー状態**: カスタムHooks（`useFileTree`, `useSync`）
- **外部ライブラリ**: 原則不要。複雑化した場合のみZustandを検討

## 5. API Route 規約

### 5.1 レスポンス形式

```typescript
// ✅ Good: 一貫したレスポンス形式
// 成功時
NextResponse.json({ data: result }, { status: 200 });

// エラー時
NextResponse.json(
  { error: { code: "CONFLICT", message: "Sync conflict detected" } },
  { status: 409 },
);
```

### 5.2 HTTPメソッド

| メソッド | 用途 | 例 |
|---------|------|-----|
| GET | リソース取得 | ファイル一覧、ファイル内容取得 |
| POST | リソース作成 / アクション実行 | ファイル作成、同期実行 |
| PUT | リソース更新（全体置換） | ファイル内容保存 |
| DELETE | リソース削除 | ファイル削除 |

## 6. スタイリング規約

### Tailwind CSS

```tsx
// ✅ Good: ユーティリティクラスを直接使用
<div className="flex h-screen bg-gray-900 text-gray-100">

// ✅ Good: 複雑な場合はcn()ユーティリティを使用
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center px-2 py-1 cursor-pointer rounded",
  isSelected && "bg-blue-600",
  isHovered && "bg-gray-700",
)}>

// ❌ Bad: インラインスタイルの使用（Tailwindで表現できないケースのみ許可）
<div style={{ width: sidebarWidth }}>
```

### ダークモード

- デフォルトはダークテーマ（VS Code風）
- 将来的にライトテーマも対応可能な設計とする
- CSS変数でカラーパレットを管理

## 7. Git規約

### コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に準拠する。

```
<type>(<scope>): <description>

[optional body]
```

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの意味に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正も機能追加もしないリファクタリング |
| `test` | テストの追加・修正 |
| `chore` | ビルドプロセスや補助ツールの変更 |

例:
```
feat(editor): add live preview for headings
fix(sync): resolve conflict detection timing issue
docs(architecture): update data flow diagram
chore(docker): add volume mount for workspace
```

### ブランチ戦略

- `main` - 安定版
- `develop` - 開発用統合ブランチ
- `feature/<name>` - 機能開発
- `fix/<name>` - バグ修正

## 8. テスト方針

- **ユニットテスト**: Vitest（`lib/` 内のロジック）
- **コンポーネントテスト**: React Testing Library（主要コンポーネント）
- **E2Eテスト**: 初期段階では不要。安定後にPlaywrightを検討
- **テストファイル配置**: テスト対象の隣に `*.test.ts` / `*.test.tsx` を配置

## 9. 環境変数管理

```bash
# .env.example（テンプレート: Gitにコミット）
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_DRIVE_FOLDER_ID=your_folder_id
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
WORKSPACE_PATH=/app/workspace

# .env.local（実際の値: .gitignoreに含める）
```
