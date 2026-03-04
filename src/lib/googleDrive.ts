import { google, type drive_v3 } from "googleapis";

/**
 * Google Drive上のファイル情報
 */
export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents: string[];
}

/**
 * Google Driveフォルダ構造をフラットなパスマップに変換した情報
 */
export interface DriveFileWithPath {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  /** ルートフォルダからの相対パス (例: "notes/daily/2026-03-04.md") */
  relativePath: string;
}

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/**
 * Google Drive APIクエリ文字列内の値をエスケープする
 * シングルクォートとバックスラッシュをエスケープして
 * クエリインジェクションを防止する
 */
function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * アクセストークンからGoogle Drive APIクライアントを生成する
 */
export function createDriveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

/**
 * listDriveFilesの戻り値
 */
export interface DriveListResult {
  /** .mdファイル一覧 */
  files: DriveFileWithPath[];
  /** フォルダの相対パス一覧（空フォルダ含む） */
  folderPaths: string[];
}

/**
 * 指定フォルダ配下の全ファイルとフォルダを再帰的に取得する
 * フラットなリストで返す（パス情報付き）
 */
export async function listDriveFiles(
  drive: drive_v3.Drive,
  rootFolderId: string,
): Promise<DriveListResult> {
  const files: DriveFileWithPath[] = [];
  const allFolderPaths: string[] = [];

  // フォルダID → 相対パスのマッピング
  const folderPathMap = new Map<string, string>();
  folderPathMap.set(rootFolderId, "");

  // BFSで再帰的に探索
  const queue = [rootFolderId];

  while (queue.length > 0) {
    const folderId = queue.shift()!;
    const parentPath = folderPathMap.get(folderId) ?? "";

    let pageToken: string | undefined;
    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType, modifiedTime, parents)",
        pageSize: 1000,
        pageToken,
      });

      const fileList = response.data.files ?? [];
      console.log(`[Drive BFS] Folder: "${parentPath || "(root)"}(${folderId})" → ${fileList.length} items found`);
      for (const file of fileList) {
        if (!file.id || !file.name) continue;

        const relativePath = parentPath
          ? `${parentPath}/${file.name}`
          : file.name;

        if (file.mimeType === FOLDER_MIME_TYPE) {
          // フォルダ: パスを記録してキューに追加
          console.log(`[Drive BFS]   📁 Folder: ${relativePath} (id: ${file.id})`);
          folderPathMap.set(file.id, relativePath);
          allFolderPaths.push(relativePath);
          queue.push(file.id);
        } else {
          // ファイル: .md ファイルのみ対象
          if (file.name.endsWith(".md")) {
            console.log(`[Drive BFS]   📄 File: ${relativePath}`);
            files.push({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType ?? "text/markdown",
              modifiedTime: file.modifiedTime ?? new Date().toISOString(),
              relativePath,
            });
          }
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  console.log(`[Drive BFS] Total: ${files.length} files, ${allFolderPaths.length} folders`);
  return { files, folderPaths: allFolderPaths };
}

/**
 * ファイルの本文を取得する
 */
export async function getDriveFileContent(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<string> {
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" },
  );
  return response.data as string;
}

/**
 * 既存ファイルの本文を更新する
 */
export async function updateDriveFile(
  drive: drive_v3.Drive,
  fileId: string,
  content: string,
): Promise<string> {
  const response = await drive.files.update({
    fileId,
    media: {
      mimeType: "text/markdown",
      body: content,
    },
    fields: "id, modifiedTime",
  });
  return response.data.modifiedTime ?? new Date().toISOString();
}

/**
 * 新規ファイルを作成する
 */
export async function createDriveFile(
  drive: drive_v3.Drive,
  parentFolderId: string,
  fileName: string,
  content: string,
): Promise<{ id: string; modifiedTime: string }> {
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "text/markdown",
      parents: [parentFolderId],
    },
    media: {
      mimeType: "text/markdown",
      body: content,
    },
    fields: "id, modifiedTime",
  });

  return {
    id: response.data.id ?? "",
    modifiedTime: response.data.modifiedTime ?? new Date().toISOString(),
  };
}

/**
 * フォルダを作成する（存在チェック付き、既存なら返す）
 */
export async function ensureDriveFolder(
  drive: drive_v3.Drive,
  parentFolderId: string,
  folderName: string,
): Promise<string> {
  // 既存チェック
  const existing = await drive.files.list({
    q: `'${escapeDriveQuery(parentFolderId)}' in parents and name = '${escapeDriveQuery(folderName)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
    fields: "files(id)",
  });

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!;
  }

  // 新規作成
  const response = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: FOLDER_MIME_TYPE,
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return response.data.id ?? "";
}

/**
 * ファイルの最新メタデータを取得する
 */
export async function getDriveFileMetadata(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<{ modifiedTime: string } | null> {
  try {
    const response = await drive.files.get({
      fileId,
      fields: "modifiedTime",
    });
    return {
      modifiedTime: response.data.modifiedTime ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * ファイルまたはフォルダを削除する（ゴミ箱に移動）
 */
export async function deleteDriveFile(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<void> {
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  });
}

/**
 * パスからDriveフォルダを検索してIDを返す
 * 例: "folder1/subfolder1" → ルートフォルダから folder1 → subfolder1 を辿る
 */
export async function findDriveFolderByPath(
  drive: drive_v3.Drive,
  rootFolderId: string,
  folderPath: string,
): Promise<string | null> {
  const parts = folderPath.split("/");
  let currentParentId = rootFolderId;

  for (const folderName of parts) {
    const response = await drive.files.list({
      q: `'${escapeDriveQuery(currentParentId)}' in parents and name = '${escapeDriveQuery(folderName)}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`,
      fields: "files(id)",
    });

    if (!response.data.files || response.data.files.length === 0) {
      return null;
    }

    currentParentId = response.data.files[0].id!;
  }

  return currentParentId;
}
