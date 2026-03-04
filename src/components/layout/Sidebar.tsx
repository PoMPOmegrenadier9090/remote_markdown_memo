"use client";

import { useState, useCallback } from "react";
import { FilePlus, FolderPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileTree } from "@/components/layout/FileTree";
import { SyncFilesPanel } from "@/components/sync/SyncFilesPanel";
import type { FileEntry } from "@/types";

interface SidebarProps {
  files: FileEntry[];
  selectedFile: FileEntry | null;
  onFileSelect: (file: FileEntry) => void;
  onCreateFile?: (filePath: string) => Promise<void>;
  onCreateDirectory?: (dirPath: string) => Promise<void>;
  onDeleteEntry?: (entryPath: string) => Promise<void>;
  onMoveEntry?: (oldPath: string, newPath: string) => Promise<void>;
  loading?: boolean;
  onPush?: () => void;
  syncing?: boolean;
}

export function Sidebar({
  files,
  selectedFile,
  onFileSelect,
  onCreateFile,
  onCreateDirectory,
  onDeleteEntry,
  onMoveEntry,
  loading,
  onPush,
  syncing,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState<"file" | "directory" | null>(null);
  const [newName, setNewName] = useState("");
  const [rootDragOver, setRootDragOver] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setIsCreating(null);
      setNewName("");
      return;
    }
    try {
      const name = newName.trim();
      if (isCreating === "file") {
        const path = name.endsWith(".md") ? name : `${name}.md`;
        await onCreateFile?.(path);
      } else if (isCreating === "directory") {
        await onCreateDirectory?.(name);
      }
    } catch {
      // エラーは親コンポーネントで処理
    } finally {
      setIsCreating(null);
      setNewName("");
    }
  };

  return (
    <aside
      className="flex flex-col overflow-hidden border-r"
      style={{
        width: "var(--sidebar-width)",
        minWidth: "var(--sidebar-width)",
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* ヘッダー */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsCreating("file");
              setNewName("");
            }}
            className={cn(
              "flex items-center justify-center rounded p-0.5 transition-colors",
              "hover:bg-[var(--color-bg-hover)]",
            )}
            title="新規ファイル"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => {
              setIsCreating("directory");
              setNewName("");
            }}
            className={cn(
              "flex items-center justify-center rounded p-0.5 transition-colors",
              "hover:bg-[var(--color-bg-hover)]",
            )}
            title="新規フォルダ"
          >
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {/* 新規作成入力 */}
      {isCreating && (
        <div className="mx-2 mb-1">
          <input
            autoFocus
            className="w-full rounded border bg-[var(--color-bg-primary)] px-2 py-1 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
            style={{ borderColor: "var(--color-border)" }}
            placeholder={isCreating === "file" ? "filename.md" : "folder name"}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setIsCreating(null);
                setNewName("");
              }
            }}
            onBlur={handleCreate}
          />
        </div>
      )}

      {/* ファイルツリー */}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-1",
          rootDragOver && "bg-[var(--color-bg-hover)]",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setRootDragOver(true);
        }}
        onDragLeave={() => setRootDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setRootDragOver(false);
          const sourcePath = e.dataTransfer.getData("text/plain");
          if (!sourcePath || !onMoveEntry) return;

          // 既にルート直下にある場合はスキップ
          const fileName = sourcePath.split("/").pop() ?? sourcePath;
          if (!sourcePath.includes("/")) return;

          await onMoveEntry(sourcePath, fileName);
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : files.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">
            ファイルがありません
          </div>
        ) : (
          <FileTree
            entries={files}
            selectedPath={selectedFile?.path ?? null}
            onSelect={onFileSelect}
            onDelete={onDeleteEntry}
            onMove={onMoveEntry}
            depth={0}
          />
        )}
      </div>

      {/* 同期待ちファイル */}
      <SyncFilesPanel onPush={onPush} syncing={syncing} />
    </aside>
  );
}
