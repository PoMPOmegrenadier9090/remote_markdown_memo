"use client";

import { useState, useCallback } from "react";
import type { SyncStatus, ConflictInfo, ConflictResolution } from "@/types";

interface SyncResult {
  created?: string[];
  updated?: string[];
  deleted?: string[];
  pushed?: string[];
  conflicts?: ConflictInfo[];
  errors?: Array<{ path: string; message: string }>;
}

/**
 * Google Drive同期を管理するHook
 */
export function useSync() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Pull: Google Drive → ローカル */
  const pull = useCallback(async (): Promise<SyncResult | null> => {
    setStatus("syncing");
    setError(null);

    try {
      const res = await fetch("/api/sync/pull", { method: "POST" });

      if (res.status === 401) {
        setStatus("error");
        setError("Not authenticated. Please sign in.");
        return null;
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Pull failed");
      }

      const body = await res.json();
      const result = body.data as SyncResult;

      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      }

      setLastResult(result);
      setStatus("success");

      // 3秒後にidleに戻す
      setTimeout(() => setStatus("idle"), 3000);

      return result;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Pull failed");
      return null;
    }
  }, []);

  /** Push: ローカル → Google Drive */
  const push = useCallback(async (): Promise<SyncResult | null> => {
    setStatus("syncing");
    setError(null);

    try {
      const res = await fetch("/api/sync/push", { method: "POST" });

      if (res.status === 401) {
        setStatus("error");
        setError("Not authenticated. Please sign in.");
        return null;
      }

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Push failed");
      }

      const body = await res.json();
      const result = body.data as SyncResult;

      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      }

      setLastResult(result);
      setStatus("success");

      setTimeout(() => setStatus("idle"), 3000);

      return result;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Push failed");
      return null;
    }
  }, []);

  /** コンフリクト解決 */
  const resolveConflict = useCallback(
    async (filePath: string, resolution: ConflictResolution) => {
      try {
        const res = await fetch("/api/sync/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: filePath, resolution }),
        });

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error?.message ?? "Resolve failed");
        }

        // 解決済みのコンフリクトを除去
        setConflicts((prev) => prev.filter((c) => c.path !== filePath));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Resolve failed");
      }
    },
    [],
  );

  /** 全コンフリクトをクリア */
  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    status,
    conflicts,
    lastResult,
    error,
    pull,
    push,
    resolveConflict,
    clearConflicts,
  };
}
