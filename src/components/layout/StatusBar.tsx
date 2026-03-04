"use client";

import { CheckCircle2, Loader2, AlertCircle, Cloud } from "lucide-react";
import type { FileEntry, SyncStatus } from "@/types";

interface StatusBarProps {
  syncStatus: SyncStatus;
  currentFile: FileEntry | null;
  dirtyCount: number;
  saving?: boolean;
  syncError?: string | null;
}

export function StatusBar({ syncStatus, currentFile, dirtyCount, saving, syncError }: StatusBarProps) {
  return (
    <footer
      className="flex items-center justify-between border-t px-3"
      style={{
        height: "var(--statusbar-height)",
        backgroundColor: "var(--color-accent)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* 左側: 同期状態 */}
      <div className="flex items-center gap-2 text-[11px] text-white">
        <SyncStatusIndicator status={syncStatus} />
        {saving && (
          <span className="flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            Saving...
          </span>
        )}
        {dirtyCount > 0 && !saving && (
          <span>{dirtyCount} file{dirtyCount > 1 ? "s" : ""} modified</span>
        )}
        {syncError && (
          <span className="truncate text-red-200" title={syncError}>
            {syncError}
          </span>
        )}
      </div>

      {/* 右側: 現在のファイル情報 */}
      <div className="flex items-center gap-3 text-[11px] text-white/80">
        {currentFile && (
          <>
            <span>{currentFile.path}</span>
            <span>Markdown</span>
          </>
        )}
      </div>
    </footer>
  );
}

function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  switch (status) {
    case "idle":
      return (
        <span className="flex items-center gap-1">
          <Cloud size={12} />
          <span>Synced</span>
        </span>
      );
    case "syncing":
      return (
        <span className="flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          <span>Syncing...</span>
        </span>
      );
    case "success":
      return (
        <span className="flex items-center gap-1">
          <CheckCircle2 size={12} />
          <span>Synced</span>
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1">
          <AlertCircle size={12} />
          <span>Sync error</span>
        </span>
      );
  }
}
