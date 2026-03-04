"use client";

import { useState, useEffect, useCallback } from "react";
import { CloudUpload, RefreshCw, Loader2, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncFilesPanelProps {
  onPush?: () => void;
  syncing?: boolean;
}

interface DirtyFile {
  path: string;
  localModifiedTime: string;
  driveFileId: string;
}

export function SyncFilesPanel({ onPush, syncing }: SyncFilesPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [dirtyFiles, setDirtyFiles] = useState<DirtyFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDirtyFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/dirty-files");
      if (res.ok) {
        const body = await res.json();
        setDirtyFiles(body.data ?? []);
      }
    } catch {
      // 静かに失敗
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirtyFiles();
    // 10秒ごとに更新
    const interval = setInterval(fetchDirtyFiles, 10000);
    return () => clearInterval(interval);
  }, [fetchDirtyFiles]);

  return (
    <div
      className="border-t"
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* ヘッダー */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded(!expanded); }}
        className={cn(
          "flex w-full items-center justify-between px-4 py-2 text-left transition-colors cursor-pointer",
          "hover:bg-[var(--color-bg-hover)]",
        )}
        style={{ color: "var(--color-text-secondary)" }}
      >
        <div className="flex items-center gap-1.5">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            同期待ち
          </span>
          {dirtyFiles.length > 0 && (
            <span
              className="ml-1 rounded-full px-1.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              {dirtyFiles.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchDirtyFiles();
            }}
            className="rounded p-0.5 transition-colors hover:bg-[var(--color-bg-active)]"
            title="更新"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
          {dirtyFiles.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPush?.();
              }}
              disabled={syncing}
              className="rounded p-0.5 transition-colors hover:bg-[var(--color-bg-active)]"
              title="すべてPush"
            >
              {syncing ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <CloudUpload size={11} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ファイルリスト */}
      {expanded && (
        <div className="max-h-[200px] overflow-y-auto px-1 pb-2">
          {loading && dirtyFiles.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
            </div>
          ) : dirtyFiles.length === 0 ? (
            <p
              className="px-3 py-3 text-center text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              同期待ちのファイルはありません
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {dirtyFiles.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center gap-2 rounded-sm px-3 py-1 text-xs transition-colors hover:bg-[var(--color-bg-hover)]"
                >
                  <FileText size={12} style={{ color: "var(--color-warning)" }} className="shrink-0" />
                  <span className="truncate-text" style={{ color: "var(--color-text-secondary)" }}>
                    {file.path}
                  </span>
                  {!file.driveFileId && (
                    <span
                      className="ml-auto shrink-0 rounded px-1 text-[9px] font-medium"
                      style={{
                        backgroundColor: "var(--color-success)",
                        color: "white",
                      }}
                    >
                      新規
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
