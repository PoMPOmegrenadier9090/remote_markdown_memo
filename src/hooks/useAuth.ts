"use client";

import { useState, useCallback, useEffect } from "react";
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

interface AuthUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

interface AuthState {
  authenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * 認証状態を管理するHook
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    authenticated: false,
    user: null,
    loading: true,
    error: null,
  });

  /** セッション情報を取得 */
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session-info");
      if (!res.ok) throw new Error("Failed to check session");
      const body = await res.json();
      const data = body.data;

      setState({
        authenticated: data.authenticated,
        user: data.user ?? null,
        loading: false,
        error: data.error ?? null,
      });
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to check authentication",
      }));
    }
  }, []);

  /** サインイン（CSRFトークン付きPOSTリクエストで処理） */
  const signIn = useCallback(() => {
    nextAuthSignIn("google");
  }, []);

  /** サインアウト */
  const signOut = useCallback(async () => {
    await nextAuthSignOut({ redirectTo: "/" });
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return {
    ...state,
    signIn,
    signOut,
    refresh: checkSession,
  };
}
