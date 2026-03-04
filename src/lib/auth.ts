import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

/**
 * Google OAuthのアクセストークンをリフレッシュする
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const refreshed = await response.json();

    if (!response.ok) {
      throw new Error(refreshed.error ?? "Failed to refresh token");
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in as number),
      // リフレッシュトークンが返ってきた場合のみ更新（通常は返らない）
      refreshToken: (refreshed.refresh_token as string | undefined) ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error instanceof Error ? error.message : "Unknown error");
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 初回サインイン時: OAuthトークンを保存
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // トークンが有効期限内ならそのまま返す （60秒のバッファ）
      if (
        typeof token.expiresAt === "number" &&
        Date.now() < (token.expiresAt * 1000 - 60_000)
      ) {
        return token;
      }

      // トークン期限切れ → リフレッシュ
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // セッションにはエラー情報のみ付与（accessTokenはサーバー側JWTにのみ保持）
      return {
        ...session,
        error: token.error as string | undefined,
      };
    },
  },
  pages: {
    signIn: "/",
  },
});

/**
 * サーバーサイドでJWTからアクセストークンを安全に取得する
 * セッションにトークンを含めず、サーバーサイドのみで使用
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken =
      cookieStore.get("authjs.session-token")?.value ??
      cookieStore.get("__Secure-authjs.session-token")?.value;

    if (!sessionToken) return null;

    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const token = await decode({
      token: sessionToken,
      secret,
      salt: cookieStore.get("__Secure-authjs.session-token")
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
    });

    return (token?.accessToken as string) ?? null;
  } catch {
    return null;
  }
}
