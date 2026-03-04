# Google Drive 同期戦略

## 1. 基本原則

- **Google Drive = Single Source of Truth（唯一の真）**: Google Driveに保存されている状態を正とする
- **手動同期**: 自動同期は行わず、ユーザーの明示的な操作（Pull/Push）により同期する
- **オンデマンド取得**: ファイル本文はユーザーが開く時にのみ取得する（メタデータは軽量同期）

## 2. 同期フロー

### 2.1 アクセス時の自動メタデータ同期

ユーザーがサイトにアクセスした際、以下の処理を自動実行する。

```
サイトアクセス
  │
  ▼
Google Drive API: files.list
  │  対象: 指定フォルダ配下の全 .md ファイル
  │  取得: id, name, mimeType, modifiedTime, parents
  │
  ▼
ローカルメタデータ (.sync-metadata.json) と比較
  │
  ├─ Drive側に新規ファイル → メタデータに追加（本文は未取得）
  ├─ Drive側でファイル削除 → ローカルファイル＋メタデータを削除
  ├─ Drive側で更新あり → メタデータの modifiedTime を更新（本文は未取得、次回オープン時に取得）
  └─ 変更なし → そのまま
  │
  ▼
サイドバーのファイルツリーを更新表示
```

### 2.2 ファイルオープン時の本文取得

```
ユーザーがファイルをクリック
  │
  ▼
ローカルキャッシュ確認
  │
  ├─ ローカルにファイルあり かつ isDirty=true
  │    → ローカル版を表示（未Pushの編集を優先）
  │
  ├─ ローカルにファイルあり かつ Drive側 modifiedTime が同じ
  │    → ローカル版を表示（最新のため再取得不要）
  │
  └─ ローカルにファイルなし or Drive側の方が新しい
       → Google Drive API: files.get で本文取得
       → ローカルに保存
       → エディタに表示
```

### 2.3 ファイル保存（ローカル自動保存）

```
ユーザーが編集（キー入力）
  │
  ▼
debounce: 1000ms（最後の入力から1秒後）
  │
  ▼
ローカルFSに保存
  │
  ▼
メタデータ更新:
  - isDirty = true
  - localModifiedTime = 現在時刻
```

### 2.4 Push（ローカル → Google Drive）

```
ユーザーがPushボタンをクリック
  │
  ▼
isDirty = true のファイルを収集
  │
  ▼
各ファイルについてコンフリクト検出:
  │  Drive側の modifiedTime をAPI経由で取得
  │  ローカルの lastSyncedModifiedTime と比較
  │
  ├─ Drive側が変更されていない
  │    → Google Drive API: files.update でアップロード
  │    → isDirty = false に更新
  │    → lastSyncedModifiedTime を更新
  │
  └─ Drive側も変更されている（コンフリクト）
       → コンフリクトダイアログを表示
       → ユーザーが選択:
           ├─ 「Drive版を使う」 → Drive版で上書き、isDirty = false
           └─ 「ローカル版を使う」 → Driveに強制アップロード、isDirty = false
```

## 3. メタデータ管理

### 3.1 同期メタデータ（.sync-metadata.json）

```json
{
  "lastSyncedAt": "2026-03-04T10:30:00Z",
  "driveRootFolderId": "1ABC...",
  "files": {
    "notes/daily/2026-03-04.md": {
      "driveFileId": "1XYZ...",
      "driveModifiedTime": "2026-03-04T10:00:00Z",
      "localModifiedTime": "2026-03-04T10:25:00Z",
      "lastSyncedModifiedTime": "2026-03-04T10:00:00Z",
      "isDirty": true
    },
    "notes/projects/app-design.md": {
      "driveFileId": "1DEF...",
      "driveModifiedTime": "2026-03-03T15:00:00Z",
      "localModifiedTime": "2026-03-03T15:00:00Z",
      "lastSyncedModifiedTime": "2026-03-03T15:00:00Z",
      "isDirty": false
    }
  }
}
```

### 3.2 フィールド説明

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `driveFileId` | string | Google Drive上のファイルID |
| `driveModifiedTime` | string (ISO 8601) | Drive側の最終更新日時（メタデータ同期時に取得） |
| `localModifiedTime` | string (ISO 8601) | ローカルでの最終編集日時 |
| `lastSyncedModifiedTime` | string (ISO 8601) | 最後にPull/Pushが成功した時点のDrive側更新日時 |
| `isDirty` | boolean | ローカルで未Pushの変更があるか |

### 3.3 コンフリクト検出ロジック

```typescript
function hasConflict(meta: FileSyncMetadata): boolean {
  // Drive側の更新日時が、最後に同期した時点の日時より新しい
  // かつ、ローカルでも変更がある
  return (
    meta.isDirty &&
    meta.driveModifiedTime > meta.lastSyncedModifiedTime
  );
}
```

## 4. Google Drive API 使用パターン

### 4.1 メタデータ一覧取得

```typescript
// 指定フォルダ配下のマークダウンファイルを再帰的に取得
const response = await drive.files.list({
  q: `'${folderId}' in parents and trashed = false`,
  fields: "files(id, name, mimeType, modifiedTime, parents)",
  pageSize: 1000,
});
```

### 4.2 ファイル本文取得

```typescript
const response = await drive.files.get({
  fileId: fileId,
  alt: "media",
});
```

### 4.3 ファイルアップロード（更新）

```typescript
await drive.files.update({
  fileId: fileId,
  media: {
    mimeType: "text/markdown",
    body: content,
  },
});
```

### 4.4 新規ファイル作成

```typescript
await drive.files.create({
  requestBody: {
    name: fileName,
    mimeType: "text/markdown",
    parents: [parentFolderId],
  },
  media: {
    mimeType: "text/markdown",
    body: content,
  },
});
```

## 5. エッジケースの処理

| ケース | 処理 |
|--------|------|
| Google Drive APIレート制限 | リトライ（指数バックオフ）。ユーザーに通知 |
| ネットワークエラー | ローカル操作は継続可能。同期は次回アクセス時に再試行 |
| トークン期限切れ | NextAuth.jsのトークンリフレッシュ機能で自動更新 |
| 非常に大きなファイル | 警告表示。上限サイズ（例: 10MB）を設定 |
| ファイル名の衝突 | Google DriveのファイルIDで一意に管理するため問題なし |
| フォルダの作成/削除 | フォルダもDrive APIで管理。空フォルダは同期対象外 |
| ローカル新規ファイル（DriveにIDなし） | Push時にfiles.createで新規作成 |
| Drive側でリネーム | メタデータ同期時にdriveFileIdで検出し、ローカルもリネーム |

## 6. 同期状態のUI表示

ステータスバーに以下の状態を表示する。

| 状態 | 表示 | アイコン |
|------|------|---------|
| 同期済み（変更なし） | `Synced` | ✓ (緑) |
| ローカルに未Push変更あり | `3 files modified` | ● (黄) |
| 同期中 | `Syncing...` | ↻ (回転アニメーション) |
| 同期エラー | `Sync error` | ✕ (赤) |
| オフライン | `Offline` | ⊘ (灰) |
