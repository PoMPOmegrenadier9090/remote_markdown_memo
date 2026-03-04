import { NextResponse } from "next/server";
import { auth, getAccessToken } from "@/lib/auth";
import { syncMetadata } from "@/lib/syncEngine";

/**
 * POST /api/sync/metadata
 * Google Driveのメタデータとローカルを同期する（ファイル本文はダウンロードしない）
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      );
    }

    if (session.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { error: { code: "TOKEN_ERROR", message: "Failed to refresh access token. Please sign in again." } },
        { status: 401 },
      );
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Access token not available" } },
        { status: 401 },
      );
    }

    const result = await syncMetadata(accessToken);

    return NextResponse.json({
      data: {
        newFiles: result.newFiles,
        deletedFiles: result.deletedFiles,
        updatedFiles: result.updatedFiles,
        totalDriveFiles: result.driveFiles.length,
      },
    });
  } catch (err) {
    console.error("Metadata sync failed:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "SYNC_ERROR", message: "Failed to sync metadata" } },
      { status: 500 },
    );
  }
}
