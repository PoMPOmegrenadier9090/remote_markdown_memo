"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  CloudDownload,
  CloudUpload,
  Loader2,
  LogIn,
  LogOut,
  Sun,
  Moon,
  FileStack,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

interface ToolbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPull?: () => void;
  onPush?: () => void;
  syncing?: boolean;
  authenticated?: boolean;
  user?: { name: string | null; email: string | null; image: string | null } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOpenTemplates?: () => void;
}

export function Toolbar({
  sidebarOpen,
  onToggleSidebar,
  onPull,
  onPush,
  syncing,
  authenticated,
  user,
  onSignIn,
  onSignOut,
  onOpenTemplates,
}: ToolbarProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="flex items-center justify-between border-b px-3"
      style={{
        height: "var(--toolbar-height)",
        backgroundColor: "var(--color-bg-tertiary)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* 左側: サイドバートグル + タイトル */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className={cn(
            "flex items-center justify-center rounded p-1 transition-colors",
            "hover:bg-[var(--color-bg-hover)]",
          )}
          title={sidebarOpen ? "サイドバーを閉じる" : "サイドバーを開く"}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={16} className="text-[var(--color-text-secondary)]" />
          ) : (
            <PanelLeftOpen size={16} className="text-[var(--color-text-secondary)]" />
          )}
        </button>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Remote Markdown Memo
        </span>
      </div>

      {/* 右側: テーマ切替 + テンプレート + 認証 + 同期ボタン */}
      <div className="flex items-center gap-1">
        {/* テーマ切替 */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center justify-center rounded p-1 transition-colors",
            "text-[var(--color-text-secondary)]",
            "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
          )}
          title={theme === "dark" ? "ライトテーマに切替" : "ダークテーマに切替"}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* テンプレート */}
        <button
          onClick={onOpenTemplates}
          className={cn(
            "flex items-center justify-center rounded p-1 transition-colors",
            "text-[var(--color-text-secondary)]",
            "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
          )}
          title="テンプレート (Ctrl+Shift+T)"
        >
          <FileStack size={14} />
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

        {authenticated ? (
          <>
            {/* Pull/Pushボタン */}
            <button
              onClick={onPull}
              disabled={syncing}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                "text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              title="Pull from Google Drive"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
              <span>Pull</span>
            </button>
            <button
              onClick={onPush}
              disabled={syncing}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                "text-[var(--color-text-secondary)]",
                "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
              title="Push to Google Drive"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
              <span>Push</span>
            </button>

            {/* ユーザー情報 + サインアウト */}
            <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />
            <span className="max-w-[120px] truncate text-[10px] text-[var(--color-text-muted)]">
              {user?.email ?? user?.name}
            </span>
            <button
              onClick={onSignOut}
              className={cn(
                "flex items-center justify-center rounded p-1 transition-colors",
                "text-[var(--color-text-muted)]",
                "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-secondary)]",
              )}
              title="サインアウト"
            >
              <LogOut size={13} />
            </button>
          </>
        ) : (
          <button
            onClick={onSignIn}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
              "text-[var(--color-text-secondary)]",
              "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]",
            )}
            title="Googleアカウントでサインイン"
          >
            <LogIn size={14} />
            <span>Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}
