import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { SyncMetadata, FileSyncMetadata } from "@/types";

const WORKSPACE_PATH = process.env.WORKSPACE_PATH ?? join(process.cwd(), "workspace");
const METADATA_FILE = ".sync-metadata.json";

function getMetadataPath(): string {
  return join(WORKSPACE_PATH, METADATA_FILE);
}

/**
 * 同期メタデータを読み込む
 * ファイルが存在しない場合は空のメタデータを返す
 */
export async function loadSyncMetadata(): Promise<SyncMetadata> {
  try {
    const content = await readFile(getMetadataPath(), "utf-8");
    return JSON.parse(content) as SyncMetadata;
  } catch {
    return {
      lastSyncedAt: "",
      driveRootFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID ?? "",
      files: {},
    };
  }
}

/**
 * 同期メタデータを保存する
 */
export async function saveSyncMetadata(metadata: SyncMetadata): Promise<void> {
  const filePath = getMetadataPath();
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(metadata, null, 2), "utf-8");
}

/**
 * 特定ファイルのメタデータを取得する
 */
export function getFileMetadata(
  metadata: SyncMetadata,
  filePath: string,
): FileSyncMetadata | undefined {
  return metadata.files[filePath];
}

/**
 * 特定ファイルのメタデータを更新する
 */
export function setFileMetadata(
  metadata: SyncMetadata,
  filePath: string,
  fileMeta: FileSyncMetadata,
): SyncMetadata {
  return {
    ...metadata,
    files: {
      ...metadata.files,
      [filePath]: fileMeta,
    },
  };
}

/**
 * 特定ファイルのメタデータを削除する
 */
export function removeFileMetadata(
  metadata: SyncMetadata,
  filePath: string,
): SyncMetadata {
  const { [filePath]: _, ...remaining } = metadata.files;
  return {
    ...metadata,
    files: remaining,
  };
}

/**
 * isDirty=true のファイル一覧を取得する
 */
export function getDirtyFiles(
  metadata: SyncMetadata,
): Array<{ path: string; meta: FileSyncMetadata }> {
  return Object.entries(metadata.files)
    .filter(([, meta]) => meta.isDirty)
    .map(([path, meta]) => ({ path, meta }));
}

/**
 * コンフリクトが存在するかチェック
 */
export function hasConflict(meta: FileSyncMetadata): boolean {
  return (
    meta.isDirty &&
    meta.driveModifiedTime > meta.lastSyncedModifiedTime
  );
}
