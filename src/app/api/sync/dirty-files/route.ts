import { NextResponse } from "next/server";
import { loadSyncMetadata } from "@/lib/syncMetadata";

/**
 * GET /api/sync/dirty-files
 * 同期待ち（isDirty: true）のファイル一覧を返す
 */
export async function GET() {
  try {
    const metadata = await loadSyncMetadata();
    const dirtyFiles = Object.entries(metadata.files)
      .filter(([, meta]) => meta.isDirty)
      .map(([path, meta]) => ({
        path,
        localModifiedTime: meta.localModifiedTime,
        driveFileId: meta.driveFileId,
      }));

    return NextResponse.json({ data: dirtyFiles });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
