import { validateEnv } from "@/lib/validateEnv";

/**
 * Next.js Instrumentation Hook
 * サーバー起動時に一度だけ呼ばれる。
 * 環境変数の検証を実行する。
 */
export async function register() {
  validateEnv();
}
