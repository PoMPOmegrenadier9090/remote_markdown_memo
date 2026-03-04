import { NextResponse } from "next/server";
import { auth, getAccessToken } from "@/lib/auth";
import { resolveConflictUseDrive, resolveConflictUseLocal } from "@/lib/syncEngine";
import type { ConflictResolution } from "@/types";

/**
 * POST /api/sync/resolve
 * コンフリクトを解決する
 *
 * Body: { path: string, resolution: "use-drive" | "use-local" }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
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

    const body = await request.json();
    const { path: filePath, resolution } = body as {
      path: string;
      resolution: ConflictResolution;
    };

    if (!filePath || !resolution) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "path and resolution are required" } },
        { status: 400 },
      );
    }

    if (resolution === "use-drive") {
      await resolveConflictUseDrive(accessToken, filePath);
    } else if (resolution === "use-local") {
      await resolveConflictUseLocal(accessToken, filePath);
    } else {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "resolution must be 'use-drive' or 'use-local'" } },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: { path: filePath, resolution, resolved: true },
    });
  } catch (err) {
    console.error("Conflict resolution failed:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "SYNC_ERROR", message: "Failed to resolve conflict" } },
      { status: 500 },
    );
  }
}
