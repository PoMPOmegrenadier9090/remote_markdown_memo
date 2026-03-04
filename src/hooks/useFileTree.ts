"use client";

import { useState, useCallback, useEffect } from "react";
import type { FileEntry } from "@/types";

/**
 * ファイルツリーの状態管理Hook
 * API経由でワークスペースのファイル一覧を取得・操作する
 */
export function useFileTree() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** ファイルツリーを取得 */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files");
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to fetch file tree");
      }
      const body = await res.json();
      setFiles(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  /** 新規ファイル作成 */
  const createFile = useCallback(
    async (filePath: string, content: string = "") => {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, type: "file", content }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to create file");
      }
      await refresh();
    },
    [refresh],
  );

  /** 新規ディレクトリ作成 */
  const createDirectory = useCallback(
    async (dirPath: string) => {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: dirPath, type: "directory" }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to create directory");
      }
      await refresh();
    },
    [refresh],
  );

  /** ファイル/ディレクトリ削除 */
  const deleteEntry = useCallback(
    async (entryPath: string) => {
      const encodedPath = entryPath.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`/api/files/${encodedPath}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to delete entry");
      }
      await refresh();
    },
    [refresh],
  );

  /** リネーム */
  const renameEntry = useCallback(
    async (oldPath: string, newPath: string) => {
      const encodedPath = oldPath.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`/api/files/${encodedPath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPath }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to rename entry");
      }
      await refresh();
    },
    [refresh],
  );

  // 初回ロード
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    files,
    loading,
    error,
    refresh,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
  };
}
