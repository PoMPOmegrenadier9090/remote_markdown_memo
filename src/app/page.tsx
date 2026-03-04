"use client";

import { Toolbar } from "@/components/layout/Toolbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { EditorArea } from "@/components/editor/EditorArea";
import { StatusBar } from "@/components/layout/StatusBar";
import { ConflictDialog } from "@/components/sync/ConflictDialog";
import { TemplateDialog } from "@/components/ui/TemplateDialog";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { ProgressProvider, useProgress } from "@/components/ui/ProgressBar";
import { useState, useCallback, useEffect } from "react";
import { useFileTree } from "@/hooks/useFileTree";
import { useEditor } from "@/hooks/useEditor";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { useTemplates } from "@/hooks/useTemplates";
import type { FileEntry } from "@/types";

export default function HomePage() {
  return (
    <ToastProvider>
      <ProgressProvider>
        <HomePageInner />
      </ProgressProvider>
    </ToastProvider>
  );
}

function HomePageInner() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const fileTree = useFileTree();
  const editor = useEditor();
  const authState = useAuth();
  const sync = useSync();
  const templates = useTemplates();
  const { showToast } = useToast();
  const { startProgress, stopProgress } = useProgress();

  // アクティブタブからselectedFileを導出
  const selectedFile: FileEntry | null = editor.activeTabPath
    ? {
        path: editor.activeTabPath,
        name: editor.activeTabPath.split("/").pop() ?? editor.activeTabPath,
        type: "file",
      }
    : null;

  const handleFileSelect = useCallback(
    (file: FileEntry) => {
      if (file.type === "file") {
        editor.openFile(file.path);
      }
    },
    [editor],
  );

  const handleCreateFile = useCallback(
    async (filePath: string) => {
      await fileTree.createFile(filePath);
    },
    [fileTree],
  );

  const handleCreateDirectory = useCallback(
    async (dirPath: string) => {
      await fileTree.createDirectory(dirPath);
    },
    [fileTree],
  );

  const handleDeleteEntry = useCallback(
    async (entryPath: string) => {
      await fileTree.deleteEntry(entryPath);
      // 削除されたファイルのタブがあれば閉じる
      if (editor.tabs.some((t) => t.path === entryPath)) {
        editor.closeTab(entryPath);
      }
    },
    [fileTree, editor],
  );

  /** ファイル/フォルダを移動 */
  const handleMoveEntry = useCallback(
    async (oldPath: string, newPath: string) => {
      await fileTree.renameEntry(oldPath, newPath);
      // 移動したファイルがタブで開かれていればパスを更新
      editor.updateTabPath(oldPath, newPath);
    },
    [fileTree, editor],
  );

  /** Pull: Google Drive → ローカル */
  const handlePull = useCallback(async () => {
    startProgress();
    showToast("info", "Google Driveからファイルを取得中...");
    const result = await sync.pull();
    stopProgress();

    if (result) {
      const parts: string[] = [];
      if (result.created?.length) parts.push(`${result.created.length}件 作成`);
      if (result.updated?.length) parts.push(`${result.updated.length}件 更新`);
      if (result.deleted?.length) parts.push(`${result.deleted.length}件 削除`);
      if (result.conflicts?.length) parts.push(`${result.conflicts.length}件 コンフリクト`);

      if (parts.length > 0) {
        showToast("success", `Pull完了: ${parts.join(", ")}`);
      } else {
        showToast("success", "Pull完了: 変更はありません");
      }

      // Pull後にファイルツリーを更新
      await fileTree.refresh();
      // 現在開いているファイルが更新/削除された場合は再読み込み
      if (editor.currentPath) {
        const wasUpdated =
          result.updated?.includes(editor.currentPath) ||
          result.created?.includes(editor.currentPath);
        const wasDeleted = result.deleted?.includes(editor.currentPath);
        if (wasDeleted) {
          editor.closeFile();
        } else if (wasUpdated) {
          editor.openFile(editor.currentPath);
        }
      }
    } else if (sync.error) {
      showToast("error", `Pull失敗: ${sync.error}`);
    }
  }, [sync, fileTree, editor, showToast, startProgress, stopProgress]);

  /** Push: ローカル → Google Drive */
  const handlePush = useCallback(async () => {
    startProgress();
    showToast("info", "Google Driveにファイルをアップロード中...");
    const result = await sync.push();
    stopProgress();

    if (result) {
      const pushed = result.pushed?.length ?? 0;
      if (pushed > 0) {
        showToast("success", `Push完了: ${pushed}件のファイルをアップロードしました`);
      } else {
        showToast("success", "Push完了: アップロードするファイルはありません");
      }
      await fileTree.refresh();
    } else if (sync.error) {
      showToast("error", `Push失敗: ${sync.error}`);
    }
  }, [sync, fileTree, showToast, startProgress, stopProgress]);

  /** Ctrl/Cmd+S で手動保存, Ctrl/Cmd+Shift+T でテンプレート */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        editor.save();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "t") {
        e.preventDefault();
        setTemplateDialogOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editor]);

  /** テンプレートからファイルを新規作成する */
  const handleTemplateSelect = useCallback(
    async (templateId: string) => {
      const template = templates.templates.find((t) => t.id === templateId);
      if (!template) return;
      const content = templates.applyTemplate(template);
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `${template.name}_${dateStr}.md`;

      try {
        await fileTree.createFile(fileName, content);
        showToast("success", `テンプレート「${template.name}」からファイルを作成しました`);
        setTemplateDialogOpen(false);

        // 作成したファイルを開く
        editor.openFile(fileName);
      } catch (err) {
        showToast("error", err instanceof Error ? err.message : "ファイルの作成に失敗しました");
      }
    },
    [templates, fileTree, editor, showToast],
  );

  return (
    <div className="flex h-screen flex-col">
      {/* ツールバー */}
      <Toolbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onPull={handlePull}
        onPush={handlePush}
        syncing={sync.status === "syncing"}
        authenticated={authState.authenticated}
        user={authState.user}
        onSignIn={authState.signIn}
        onSignOut={authState.signOut}
        onOpenTemplates={() => setTemplateDialogOpen(true)}
      />

      {/* メインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <Sidebar
            files={fileTree.files}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateDirectory={handleCreateDirectory}
            onDeleteEntry={handleDeleteEntry}
            onMoveEntry={handleMoveEntry}
            loading={fileTree.loading}
            onPush={handlePush}
            syncing={sync.status === "syncing"}
          />
        )}

        <EditorArea
          file={selectedFile}
          content={editor.content}
          onChange={editor.updateContent}
          loading={editor.loading}
          saving={editor.saving}
          isDirty={editor.isDirty}
          tabs={editor.tabs}
          activeTabPath={editor.activeTabPath}
          onTabSelect={editor.switchTab}
          onTabClose={editor.closeTab}
        />
      </div>

      {/* ステータスバー */}
      <StatusBar
        syncStatus={sync.status}
        currentFile={selectedFile}
        dirtyCount={editor.dirtyCount}
        saving={editor.saving}
        syncError={sync.error}
      />

      {/* コンフリクトダイアログ */}
      {sync.conflicts.length > 0 && (
        <ConflictDialog
          conflicts={sync.conflicts}
          onResolve={(path, resolution) => {
            sync.resolveConflict(path, resolution);
          }}
          onClose={sync.clearConflicts}
        />
      )}

      {/* テンプレートダイアログ */}
      {templateDialogOpen && (
        <TemplateDialog
          templates={templates.templates}
          onSelect={handleTemplateSelect}
          onAdd={templates.addTemplate}
          onUpdate={templates.updateTemplate}
          onDelete={templates.deleteTemplate}
          onClose={() => setTemplateDialogOpen(false)}
        />
      )}
    </div>
  );
}
