import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/auth/session-info
 * 現在の認証状態を返す（フロントエンドからpolling用）
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({
      data: { authenticated: false },
    });
  }

  return NextResponse.json({
    data: {
      authenticated: true,
      user: {
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
      },
      error: session.error ?? null,
    },
  });
}
