"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileEntry } from "@/types";

interface FileTreeProps {
  entries: FileEntry[];
  selectedPath: string | null;
  onSelect: (entry: FileEntry) => void;
  onDelete?: (entryPath: string) => Promise<void>;
  onMove?: (oldPath: string, newPath: string) => Promise<void>;
  depth: number;
}

export function FileTree({ entries, selectedPath, onSelect, onDelete, onMove, depth }: FileTreeProps) {
  return (
    <ul className="list-none p-0 m-0">
      {entries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDelete={onDelete}
          onMove={onMove}
          depth={depth}
        />
      ))}
    </ul>
  );
}

interface FileTreeItemProps {
  entry: FileEntry;
  selectedPath: string | null;
  onSelect: (entry: FileEntry) => void;
  onDelete?: (entryPath: string) => Promise<void>;
  onMove?: (oldPath: string, newPath: string) => Promise<void>;
  depth: number;
}

function FileTreeItem({ entry, selectedPath, onSelect, onDelete, onMove, depth }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isDirectory = entry.type === "directory";
  const isSelected = entry.path === selectedPath;

  const handleClick = () => {
    if (isDirectory) {
      setExpanded(!expanded);
    }
    onSelect(entry);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = isDirectory
      ? `フォルダ "${entry.name}" とその中身を削除しますか？`
      : `ファイル "${entry.name}" を削除しますか？`;
    if (window.confirm(message)) {
      await onDelete?.(entry.path);
    }
  };

  // --- Drag & Drop ---
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", entry.path);
      e.dataTransfer.effectAllowed = "move";
    },
    [entry.path],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDirectory) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOver(true);
    },
    [isDirectory],
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!isDirectory || !onMove) return;

      const sourcePath = e.dataTransfer.getData("text/plain");
      if (!sourcePath) return;

      // 自分自身や子孫への移動を防止
      if (sourcePath === entry.path || entry.path.startsWith(sourcePath + "/")) return;

      const fileName = sourcePath.split("/").pop() ?? sourcePath;
      const newPath = `${entry.path}/${fileName}`;

      // 移動先が同じならスキップ
      if (sourcePath === newPath) return;

      await onMove(sourcePath, newPath);
    },
    [isDirectory, onMove, entry.path],
  );

  // ルートへのドロップ用（depth === 0 の場合、親リストでハンドル）
  const handleRootDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDirectory) return;
      e.preventDefault();
    },
    [isDirectory],
  );

  return (
    <li>
      <div
        className="group relative"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <button
          onClick={handleClick}
          draggable
          onDragStart={handleDragStart}
          onDragOver={isDirectory ? handleDragOver : handleRootDragOver}
          onDragLeave={handleDragLeave}
          onDrop={isDirectory ? handleDrop : undefined}
          className={cn(
            "flex w-full items-center gap-1 rounded-sm py-[2px] pr-6 text-left text-[13px] transition-colors",
            "hover:bg-[var(--color-bg-hover)]",
            isSelected && !isDirectory && "bg-[var(--color-bg-active)]",
            dragOver && "ring-1 ring-[var(--color-accent)] bg-[var(--color-bg-hover)]",
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* ディレクトリの展開/折りたたみアイコン */}
          {isDirectory ? (
            <span className="flex w-4 items-center justify-center text-[var(--color-text-muted)]">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          ) : (
            <span className="w-4" />
          )}

          {/* ファイル/フォルダアイコン */}
          {isDirectory ? (
            expanded ? (
              <FolderOpen size={14} className="shrink-0 text-[var(--color-warning)]" />
            ) : (
              <Folder size={14} className="shrink-0 text-[var(--color-warning)]" />
            )
          ) : (
            <FileText size={14} className="shrink-0 text-[var(--color-text-accent)]" />
          )}

          {/* ファイル名 */}
          <span
            className={cn(
              "truncate-text",
              isSelected && !isDirectory
                ? "text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)]",
            )}
          >
            {entry.name}
          </span>
        </button>

        {/* 削除ボタン */}
        {hovering && onDelete && (
          <button
            onClick={handleDelete}
            className={cn(
              "absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded p-0.5 transition-colors",
              "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-error)]",
            )}
            title="削除"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* 子エントリ */}
      {isDirectory && expanded && entry.children && (
        <FileTree
          entries={entry.children}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onDelete={onDelete}
          onMove={onMove}
          depth={depth + 1}
        />
      )}
    </li>
  );
}
