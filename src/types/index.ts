/** ファイルシステム上のエントリ（ファイルまたはフォルダ） */
export interface FileEntry {
  /** ワークスペースルートからの相対パス */
  path: string;
  /** ファイル/フォルダ名 */
  name: string;
  /** エントリの種類 */
  type: "file" | "directory";
  /** 子エントリ（ディレクトリの場合のみ） */
  children?: FileEntry[];
}

/** Google Drive同期用のファイルメタデータ */
export interface FileSyncMetadata {
  /** Google Drive上のファイルID */
  driveFileId: string;
  /** Drive側の最終更新日時 (ISO 8601) */
  driveModifiedTime: string;
  /** ローカルでの最終編集日時 (ISO 8601) */
  localModifiedTime: string;
  /** 最後にPull/Pushが成功した時点のDrive側更新日時 (ISO 8601) */
  lastSyncedModifiedTime: string;
  /** ローカルで未Pushの変更があるか */
  isDirty: boolean;
}

/** 同期メタデータ全体 */
export interface SyncMetadata {
  /** 最終同期日時 (ISO 8601) */
  lastSyncedAt: string;
  /** Google Drive同期対象フォルダID */
  driveRootFolderId: string;
  /** ファイルパス → メタデータのマップ */
  files: Record<string, FileSyncMetadata>;
}

/** 同期の状態 */
export type SyncStatus = "idle" | "syncing" | "success" | "error";

/** 同期方向 */
export type SyncDirection = "pull" | "push";

/** コンフリクト情報 */
export interface ConflictInfo {
  /** ファイルパス */
  path: string;
  /** ローカル側の最終編集日時 */
  localModifiedTime: string;
  /** Drive側の最終更新日時 */
  driveModifiedTime: string;
}

/** コンフリクト解消方法 */
export type ConflictResolution = "use-drive" | "use-local";

/** APIレスポンス: 成功 */
export interface ApiSuccessResponse<T> {
  data: T;
}

/** APIレスポンス: エラー */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/** APIレスポンス */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
