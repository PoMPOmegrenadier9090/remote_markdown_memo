import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiRateLimiter, syncRateLimiter } from "@/lib/rateLimit";

/**
 * Next.js Middleware: APIルートの認証・CSRF・レートリミットを強制する
 *
 * /api/files/* と /api/sync/* へのリクエストに対して
 * NextAuth.jsセッションの有効性を検証する。
 * 認証されていない場合は 401 を返す。
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 認証が必要なAPIパス
  const protectedPaths = ["/api/files", "/api/sync"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  // 認証チェック
  if (!req.auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 },
    );
  }

  // レートリミット（ユーザーIDベース）
  const rateLimitKey = req.auth.user?.email ?? "anonymous";
  const isSyncPath = pathname.startsWith("/api/sync");
  const limiter = isSyncPath ? syncRateLimiter : apiRateLimiter;

  if (!limiter.check(rateLimitKey)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." } },
      { status: 429 },
    );
  }

  // CSRF保護: 変更系リクエストの Origin/Referer 検証
  const method = req.method;
  const mutatingMethods = ["POST", "PUT", "DELETE", "PATCH"];

  if (mutatingMethods.includes(method)) {
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");
    const host = req.headers.get("host");

    if (host) {
      const allowedOrigin = `http://${host}`;
      const allowedOriginHttps = `https://${host}`;
      const requestOrigin = origin ?? (referer ? new URL(referer).origin : null);

      if (requestOrigin && requestOrigin !== allowedOrigin && requestOrigin !== allowedOriginHttps) {
        return NextResponse.json(
          { error: { code: "CSRF_REJECTED", message: "Cross-origin request rejected" } },
          { status: 403 },
        );
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/files/:path*", "/api/sync/:path*"],
};
