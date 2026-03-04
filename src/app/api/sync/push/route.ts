import { NextResponse } from "next/server";
import { auth, getAccessToken } from "@/lib/auth";
import { pushFiles } from "@/lib/syncEngine";

/**
 * POST /api/sync/push
 * ローカルの変更をGoogle Driveにアップロード
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

    const result = await pushFiles(accessToken);

    return NextResponse.json({
      data: {
        pushed: result.pushed,
        conflicts: result.conflicts,
        errors: result.errors,
      },
    });
  } catch (err) {
    console.error("Push failed:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "SYNC_ERROR", message: "Failed to push to Google Drive" } },
      { status: 500 },
    );
  }
}
