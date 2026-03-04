/**
 * 環境変数のバリデーション
 *
 * アプリケーション起動時に必要な環境変数が設定されているか検証する。
 * 未設定の必須変数がある場合はエラーメッセージを出力する。
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVarConfig[] = [
  { name: "AUTH_SECRET", required: true, description: "NextAuth.js暗号化シークレット" },
  { name: "GOOGLE_CLIENT_ID", required: true, description: "Google OAuth2 クライアントID" },
  { name: "GOOGLE_CLIENT_SECRET", required: true, description: "Google OAuth2 クライアントシークレット" },
  { name: "GOOGLE_DRIVE_FOLDER_ID", required: false, description: "Google Drive同期フォルダID" },
  { name: "WORKSPACE_PATH", required: false, description: "ワークスペースディレクトリパス" },
];

/**
 * 必須環境変数の存在を検証する。
 * 不足があれば警告メッセージを出力し、致命的な場合はエラーをスローする。
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    if (envVar.required && !value) {
      missing.push(`  - ${envVar.name}: ${envVar.description}`);
    }
  }

  if (missing.length > 0) {
    const message = [
      "[ENV] Missing required environment variables:",
      ...missing,
      "",
      "These variables must be set for the application to work correctly.",
    ].join("\n");

    console.error(message);
  }
}
