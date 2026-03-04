import type { drive_v3 } from "googleapis";
import type { ConflictInfo, FileSyncMetadata } from "@/types";
import {
  createDriveClient,
  listDriveFiles,
  getDriveFileContent,
  updateDriveFile,
  createDriveFile,
  ensureDriveFolder,
  getDriveFileMetadata,
  type DriveFileWithPath,
} from "@/lib/googleDrive";
import {
  loadSyncMetadata,
  saveSyncMetadata,
  getDirtyFiles,
  hasConflict,
} from "@/lib/syncMetadata";
import {
  readFile,
  writeFile,
  deleteEntry,
  ensureWorkspace,
  getFileTree,
} from "@/lib/fileSystem";
import type { FileEntry } from "@/types";

/**
 * Pull結果
 */
export interface PullResult {
  /** 新規ダウンロードしたファイル */
  created: string[];
  /** 更新されたファイル */
  updated: string[];
  /** ローカルから削除されたファイル */
  deleted: string[];
  /** コンフリクトが検出されたファイル */
  conflicts: ConflictInfo[];
}

/**
 * Push結果
 */
export interface PushResult {
  /** アップロード成功したファイル */
  pushed: string[];
  /** コンフリクトが検出されたファイル */
  conflicts: ConflictInfo[];
  /** エラーが発生した件数 */
  errors: Array<{ path: string; message: string }>;
}

/**
 * メタデータ同期: Google Driveのファイル一覧とローカルメタデータを同期する
 * （ファイル本文はダウンロードしない）
 */
export async function syncMetadata(accessToken: string): Promise<{
  driveFiles: DriveFileWithPath[];
  newFiles: string[];
  deletedFiles: string[];
  updatedFiles: string[];
}> {
  const drive = createDriveClient(accessToken);
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";
  const driveFiles = await listDriveFiles(drive, folderId);
  let metadata = await loadSyncMetadata();

  const newFiles: string[] = [];
  const deletedFiles: string[] = [];
  const updatedFiles: string[] = [];

  // Drive側のファイルパスセット
  const drivePathSet = new Set(driveFiles.map((f) => f.relativePath));

  // Drive側に存在するファイルを処理
  for (const driveFile of driveFiles) {
    const existing = metadata.files[driveFile.relativePath];

    if (!existing) {
      // 新規ファイル: メタデータに追加（本文は未取得）
      metadata.files[driveFile.relativePath] = {
        driveFileId: driveFile.id,
        driveModifiedTime: driveFile.modifiedTime,
        localModifiedTime: "",
        lastSyncedModifiedTime: "",
        isDirty: false,
      };
      newFiles.push(driveFile.relativePath);
    } else if (existing.driveModifiedTime !== driveFile.modifiedTime) {
      // Drive側で更新あり
      metadata.files[driveFile.relativePath] = {
        ...existing,
        driveFileId: driveFile.id,
        driveModifiedTime: driveFile.modifiedTime,
      };
      updatedFiles.push(driveFile.relativePath);
    } else {
      // DriveファイルIDが変わっていたら更新
      metadata.files[driveFile.relativePath] = {
        ...existing,
        driveFileId: driveFile.id,
      };
    }
  }

  // Drive側で削除されたファイル
  for (const localPath of Object.keys(metadata.files)) {
    if (!drivePathSet.has(localPath) && !metadata.files[localPath].isDirty) {
      // isDirtyでないファイルのみ削除（未Pushの変更は保持）
      delete metadata.files[localPath];
      // ローカルファイルも削除
      try {
        await deleteEntry(localPath);
      } catch {
        // ファイルが存在しない場合は無視
      }
      deletedFiles.push(localPath);
    }
  }

  metadata.lastSyncedAt = new Date().toISOString();
  metadata.driveRootFolderId = folderId;
  await saveSyncMetadata(metadata);

  return { driveFiles, newFiles, deletedFiles, updatedFiles };
}

/**
 * Pull: Google Drive → ローカルにファイルをダウンロードする
 * メタデータ同期も含む
 */
export async function pullFiles(accessToken: string): Promise<PullResult> {
  await ensureWorkspace();

  const drive = createDriveClient(accessToken);
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";

  // 1. メタデータ同期
  const { driveFiles } = await syncMetadata(accessToken);
  let metadata = await loadSyncMetadata();

  const created: string[] = [];
  const updated: string[] = [];
  const deleted: string[] = [];
  const conflicts: ConflictInfo[] = [];

  // 2. 各Driveファイルの本文をダウンロード
  const driveFilesMap = new Map(driveFiles.map((f) => [f.relativePath, f]));

  for (const [filePath, fileMeta] of Object.entries(metadata.files)) {
    const driveFile = driveFilesMap.get(filePath);
    if (!driveFile) continue;

    // コンフリクトチェック: ローカルにdirtyな変更がありDrive側も更新されている
    if (hasConflict(fileMeta)) {
      conflicts.push({
        path: filePath,
        localModifiedTime: fileMeta.localModifiedTime,
        driveModifiedTime: fileMeta.driveModifiedTime,
      });
      continue; // コンフリクトファイルはスキップ（ユーザーに判断を委ねる）
    }

    // ローカルにファイルがない、またはDrive側の方が新しい場合のみダウンロード
    const needsDownload =
      !fileMeta.localModifiedTime ||
      fileMeta.driveModifiedTime > fileMeta.lastSyncedModifiedTime;

    if (needsDownload) {
      try {
        const content = await getDriveFileContent(drive, driveFile.id);
        await writeFile(filePath, content);

        const isNew = !fileMeta.localModifiedTime;
        metadata.files[filePath] = {
          ...fileMeta,
          localModifiedTime: new Date().toISOString(),
          lastSyncedModifiedTime: driveFile.modifiedTime,
          isDirty: false,
        };

        if (isNew) {
          created.push(filePath);
        } else {
          updated.push(filePath);
        }
      } catch (err) {
        console.error(`Failed to pull file ${filePath}:`, err instanceof Error ? err.message : "Unknown error");
      }
    }
  }

  metadata.lastSyncedAt = new Date().toISOString();
  await saveSyncMetadata(metadata);

  return { created, updated, deleted, conflicts };
}

/**
 * Push: ローカルの変更をGoogle Driveにアップロードする
 */
export async function pushFiles(accessToken: string): Promise<PushResult> {
  const drive = createDriveClient(accessToken);
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";
  let metadata = await loadSyncMetadata();

  // ローカルのファイルツリーを走査し、メタデータに未登録のファイルを追加
  const localFiles = await getFileTree();
  const allLocalPaths = flattenFileTree(localFiles);
  for (const localPath of allLocalPaths) {
    if (!metadata.files[localPath]) {
      metadata.files[localPath] = {
        driveFileId: "",
        driveModifiedTime: "",
        localModifiedTime: new Date().toISOString(),
        lastSyncedModifiedTime: "",
        isDirty: true,
      };
    }
  }
  await saveSyncMetadata(metadata);

  const dirtyFiles = getDirtyFiles(metadata);

  const pushed: string[] = [];
  const conflicts: ConflictInfo[] = [];
  const errors: Array<{ path: string; message: string }> = [];

  for (const { path: filePath, meta } of dirtyFiles) {
    try {
      // コンフリクト検出: Drive側の最新modifiedTimeを確認
      if (meta.driveFileId) {
        const driveMeta = await getDriveFileMetadata(drive, meta.driveFileId);
        if (driveMeta && driveMeta.modifiedTime > meta.lastSyncedModifiedTime && meta.lastSyncedModifiedTime !== "") {
          conflicts.push({
            path: filePath,
            localModifiedTime: meta.localModifiedTime,
            driveModifiedTime: driveMeta.modifiedTime,
          });
          // メタデータも更新
          metadata.files[filePath] = {
            ...meta,
            driveModifiedTime: driveMeta.modifiedTime,
          };
          continue;
        }
      }

      // ファイルの内容を読み取る
      const content = await readFile(filePath);

      let newModifiedTime: string;

      if (meta.driveFileId) {
        // 既存ファイルの更新
        newModifiedTime = await updateDriveFile(drive, meta.driveFileId, content);
      } else {
        // 新規ファイル: パスに応じたフォルダ構造をDrive上に作成
        const parentId = await ensureParentFolders(drive, folderId, filePath);
        const fileName = filePath.split("/").pop() ?? filePath;
        const result = await createDriveFile(drive, parentId, fileName, content);
        meta.driveFileId = result.id;
        newModifiedTime = result.modifiedTime;
      }

      // メタデータ更新
      metadata.files[filePath] = {
        ...meta,
        driveModifiedTime: newModifiedTime,
        lastSyncedModifiedTime: newModifiedTime,
        isDirty: false,
      };

      pushed.push(filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push({ path: filePath, message });
      console.error(`Failed to push file ${filePath}:`, err instanceof Error ? err.message : "Unknown error");
    }
  }

  metadata.lastSyncedAt = new Date().toISOString();
  await saveSyncMetadata(metadata);

  return { pushed, conflicts, errors };
}

/**
 * コンフリクト解決: Drive版を使う
 */
export async function resolveConflictUseDrive(
  accessToken: string,
  filePath: string,
): Promise<void> {
  const drive = createDriveClient(accessToken);
  let metadata = await loadSyncMetadata();
  const fileMeta = metadata.files[filePath];
  if (!fileMeta) throw new Error(`No metadata for file: ${filePath}`);

  // Drive版をダウンロードしてローカルに上書き
  const content = await getDriveFileContent(drive, fileMeta.driveFileId);
  await writeFile(filePath, content);

  metadata.files[filePath] = {
    ...fileMeta,
    localModifiedTime: new Date().toISOString(),
    lastSyncedModifiedTime: fileMeta.driveModifiedTime,
    isDirty: false,
  };

  await saveSyncMetadata(metadata);
}

/**
 * コンフリクト解決: ローカル版を使う
 */
export async function resolveConflictUseLocal(
  accessToken: string,
  filePath: string,
): Promise<void> {
  const drive = createDriveClient(accessToken);
  let metadata = await loadSyncMetadata();
  const fileMeta = metadata.files[filePath];
  if (!fileMeta) throw new Error(`No metadata for file: ${filePath}`);

  const content = await readFile(filePath);
  const newModifiedTime = await updateDriveFile(drive, fileMeta.driveFileId, content);

  metadata.files[filePath] = {
    ...fileMeta,
    driveModifiedTime: newModifiedTime,
    lastSyncedModifiedTime: newModifiedTime,
    isDirty: false,
  };

  await saveSyncMetadata(metadata);
}

/**
 * ファイルパスに応じて親フォルダを再帰的に作成する
 * 例: "notes/daily/2026-03-04.md" → notes, notes/daily を作成
 */
async function ensureParentFolders(
  drive: drive_v3.Drive,
  rootFolderId: string,
  filePath: string,
): Promise<string> {
  const parts = filePath.split("/");
  // 最後の要素はファイル名なので除外
  const folderParts = parts.slice(0, -1);

  let currentParentId = rootFolderId;
  for (const folderName of folderParts) {
    currentParentId = await ensureDriveFolder(drive, currentParentId, folderName);
  }

  return currentParentId;
}

/**
 * FileEntryツリーをフラットなパスリストに展開する
 * .mdファイルのパスのみ返す
 */
function flattenFileTree(entries: FileEntry[]): string[] {
  const result: string[] = [];
  for (const entry of entries) {
    if (entry.type === "file") {
      result.push(entry.path);
    } else if (entry.type === "directory" && entry.children) {
      result.push(...flattenFileTree(entry.children));
    }
  }
  return result;
}
