import { NextResponse } from "next/server";
import { auth, getAccessToken } from "@/lib/auth";
import { pullFiles } from "@/lib/syncEngine";

/**
 * POST /api/sync/pull
 * Google Drive → ローカルにファイルをダウンロード（メタデータ同期含む）
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

    const result = await pullFiles(accessToken);

    return NextResponse.json({
      data: {
        created: result.created,
        updated: result.updated,
        deleted: result.deleted,
        conflicts: result.conflicts,
      },
    });
  } catch (err) {
    console.error("Pull failed:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "SYNC_ERROR", message: "Failed to pull from Google Drive" } },
      { status: 500 },
    );
  }
}
