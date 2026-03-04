"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/** 開いているタブの状態 */
export interface TabState {
  /** ファイルパス (一意キー) */
  path: string;
  /** ファイル名 */
  name: string;
  /** 現在のコンテンツ */
  content: string;
  /** 最後に保存されたコンテンツ */
  savedContent: string;
}

/**
 * エディタの状態管理Hook
 * 複数タブ・ファイルの読み込み・保存・自動保存を管理する
 */
export function useEditor() {
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabsRef = useRef(tabs);

  // tabsの最新値をrefで保持（useCallback依存を避ける）
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // アクティブタブの情報を導出
  const activeTab = tabs.find((t) => t.path === activeTabPath) ?? null;
  const currentPath = activeTabPath;
  const content = activeTab?.content ?? "";
  const isDirty = activeTab ? activeTab.content !== activeTab.savedContent : false;

  /** 全タブのうちdirtyなものの数 */
  const dirtyCount = tabs.filter((t) => t.content !== t.savedContent).length;

  /** ファイルを開く（既に開いていればタブ切り替え、なければ新規タブ追加） */
  const openFile = useCallback(async (filePath: string) => {
    // 既に開いている場合はタブ切り替えのみ
    const existing = tabsRef.current.find((t) => t.path === filePath);
    if (existing) {
      setActiveTabPath(filePath);
      return;
    }

    // 前回のauto-saveタイマーをキャンセル
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    setLoading(true);
    setError(null);
    setActiveTabPath(filePath);

    try {
      const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`/api/files/${encodedPath}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to open file");
      }
      const body = await res.json();
      const fileContent = body.data.content as string;
      const name = filePath.split("/").pop() ?? filePath;

      setTabs((prev) => [
        ...prev,
        { path: filePath, name, content: fileContent, savedContent: fileContent },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  /** アクティブタブを手動保存 */
  const save = useCallback(async () => {
    const tab = tabsRef.current.find((t) => t.path === activeTabPath);
    if (!activeTabPath || !tab || tab.content === tab.savedContent) return;

    setSaving(true);
    setError(null);
    try {
      const encodedPath = activeTabPath.split("/").map(encodeURIComponent).join("/");
      const res = await fetch(`/api/files/${encodedPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tab.content }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error?.message ?? "Failed to save file");
      }
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTabPath ? { ...t, savedContent: t.content } : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }, [activeTabPath]);

  /** コンテンツ変更ハンドラー (auto-save付き) */
  const updateContent = useCallback(
    (newContent: string) => {
      if (!activeTabPath) return;

      const targetPath = activeTabPath;

      setTabs((prev) =>
        prev.map((t) =>
          t.path === targetPath ? { ...t, content: newContent } : t,
        ),
      );

      // debounce auto-save (2秒)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const encodedPath = targetPath.split("/").map(encodeURIComponent).join("/");
          const res = await fetch(`/api/files/${encodedPath}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: newContent }),
          });
          if (res.ok) {
            setTabs((prev) =>
              prev.map((t) =>
                t.path === targetPath ? { ...t, savedContent: newContent } : t,
              ),
            );
          }
        } catch {
          // auto-save失敗は静かに無視（手動保存に委ねる）
        } finally {
          setSaving(false);
        }
      }, 2000);
    },
    [activeTabPath],
  );

  /** 特定のタブを閉じる */
  const closeTab = useCallback(
    (path: string) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.path === path);
        const newTabs = prev.filter((t) => t.path !== path);

        // 閉じるのがアクティブタブなら隣のタブに切り替え
        if (activeTabPath === path) {
          if (newTabs.length === 0) {
            setActiveTabPath(null);
          } else {
            const newIdx = Math.min(idx, newTabs.length - 1);
            setActiveTabPath(newTabs[newIdx].path);
          }
        }

        return newTabs;
      });

      setError(null);
    },
    [activeTabPath],
  );

  /** アクティブタブを閉じる (後方互換) */
  const closeFile = useCallback(() => {
    if (activeTabPath) {
      closeTab(activeTabPath);
    }
  }, [activeTabPath, closeTab]);

  /** タブを切り替える */
  const switchTab = useCallback((path: string) => {
    setActiveTabPath(path);
  }, []);

  /** タブのパスを更新（ファイル移動時） */
  const updateTabPath = useCallback(
    (oldPath: string, newPath: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.path === oldPath
            ? { ...t, path: newPath, name: newPath.split("/").pop() ?? newPath }
            : t,
        ),
      );
      if (activeTabPath === oldPath) {
        setActiveTabPath(newPath);
      }
    },
    [activeTabPath],
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    // 後方互換性のあるプロパティ
    currentPath,
    content,
    isDirty,
    loading,
    saving,
    error,
    openFile,
    save,
    updateContent,
    closeFile,

    // マルチタブ用プロパティ
    tabs,
    activeTabPath,
    dirtyCount,
    closeTab,
    switchTab,
    updateTabPath,
  };
}
