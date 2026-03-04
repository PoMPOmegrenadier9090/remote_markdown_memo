import { NextResponse } from "next/server";
import { readFile, writeFile, deleteEntry, renameEntry, FileSystemError } from "@/lib/fileSystem";
import { loadSyncMetadata, saveSyncMetadata, removeFileMetadata } from "@/lib/syncMetadata";
import { getAccessToken } from "@/lib/auth";
import { createDriveClient, deleteDriveFile } from "@/lib/googleDrive";

/** ファイルサイズ上限 (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 許可するファイル拡張子 */
const ALLOWED_EXTENSIONS = [".md"];

/** ファイル拡張子を検証する */
function hasAllowedExtension(filePath: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
}

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

/** URLパスセグメントをファイルパスに変換 */
function toFilePath(segments: string[]): string {
  return segments.map(decodeURIComponent).join("/");
}

/**
 * GET /api/files/[...path]
 * 指定パスのファイル内容を取得
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const filePath = toFilePath(segments);
    const content = await readFile(filePath);
    return NextResponse.json({ data: { path: filePath, content } });
  } catch (err) {
    if (err instanceof FileSystemError && err.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: err.message } },
        { status: 404 },
      );
    }
    console.error("Failed to read file:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to read file" } },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/files/[...path]
 * 指定パスのファイル内容を更新（存在しなければ作成）
 *
 * Body: { content: string }
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const filePath = toFilePath(segments);
    const body = await request.json();
    const { content } = body as { content: string };

    if (typeof content !== "string") {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "content is required and must be a string" } },
        { status: 400 },
      );
    }

    // ファイルサイズ制限
    const contentSize = new TextEncoder().encode(content).byteLength;
    if (contentSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: { code: "PAYLOAD_TOO_LARGE", message: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` } },
        { status: 413 },
      );
    }

    // 拡張子検証
    if (!hasAllowedExtension(filePath)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Only .md files are allowed" } },
        { status: 400 },
      );
    }

    await writeFile(filePath, content);

    // 同期メタデータのisDirtyフラグを更新
    try {
      const metadata = await loadSyncMetadata();
      if (metadata.files[filePath]) {
        metadata.files[filePath] = {
          ...metadata.files[filePath],
          isDirty: true,
          localModifiedTime: new Date().toISOString(),
        };
      } else {
        // メタデータにエントリがない場合（新規ファイル or 初回Push前）は新規作成
        metadata.files[filePath] = {
          driveFileId: "",
          driveModifiedTime: "",
          localModifiedTime: new Date().toISOString(),
          lastSyncedModifiedTime: "",
          isDirty: true,
        };
      }
      await saveSyncMetadata(metadata);
    } catch {
      // メタデータ更新失敗はファイル保存自体には影響しない
    }

    return NextResponse.json({ data: { path: filePath, saved: true } });
  } catch (err) {
    if (err instanceof FileSystemError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 400 },
      );
    }
    console.error("Failed to write file:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to write file" } },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/files/[...path]
 * 指定パスのファイルまたはディレクトリを削除
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const filePath = toFilePath(segments);
    await deleteEntry(filePath);

    // syncメタデータからdriveFileIdを取得してDrive側も削除
    try {
      const metadata = await loadSyncMetadata();
      const fileMeta = metadata.files[filePath];

      if (fileMeta?.driveFileId) {
        const accessToken = await getAccessToken();
        if (accessToken) {
          const drive = createDriveClient(accessToken);
          await deleteDriveFile(drive, fileMeta.driveFileId);
        }
      }

      const updated = removeFileMetadata(metadata, filePath);
      await saveSyncMetadata(updated);
    } catch {
      // メタデータ/Drive更新失敗はファイル削除自体に影響させない
    }

    return NextResponse.json({ data: { path: filePath, deleted: true } });
  } catch (err) {
    if (err instanceof FileSystemError && err.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: err.message } },
        { status: 404 },
      );
    }
    console.error("Failed to delete entry:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete entry" } },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/files/[...path]
 * ファイルまたはディレクトリのリネーム
 *
 * Body: { newPath: string }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { path: segments } = await params;
    const filePath = toFilePath(segments);
    const body = await request.json();
    const { newPath } = body as { newPath: string };

    if (!newPath) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "newPath is required" } },
        { status: 400 },
      );
    }

    await renameEntry(filePath, newPath);

    // syncメタデータの旧パスから新パスへ移行し、Drive側の旧ファイルを削除
    try {
      const metadata = await loadSyncMetadata();
      const fileMeta = metadata.files[filePath];

      if (fileMeta) {
        // Drive側の旧ファイルを削除（次回Pushで新パスとして再アップロードされる）
        if (fileMeta.driveFileId) {
          const accessToken = await getAccessToken();
          if (accessToken) {
            const drive = createDriveClient(accessToken);
            await deleteDriveFile(drive, fileMeta.driveFileId);
          }
        }

        // 旧パスのメタデータを削除（新パスはisDirty状態で次回Push対象になる）
        const cleaned = removeFileMetadata(metadata, filePath);
        await saveSyncMetadata(cleaned);
      }
    } catch {
      // メタデータ/Drive更新失敗はリネーム自体に影響させない
    }

    return NextResponse.json({ data: { oldPath: filePath, newPath, renamed: true } });
  } catch (err) {
    if (err instanceof FileSystemError) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status },
      );
    }
    console.error("Failed to rename entry:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to rename entry" } },
      { status: 500 },
    );
  }
}
