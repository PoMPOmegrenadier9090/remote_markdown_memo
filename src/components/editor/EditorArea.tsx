"use client";

import { FileText, Loader2 } from "lucide-react";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { TabBar } from "@/components/editor/TabBar";
import type { FileEntry } from "@/types";
import type { TabState } from "@/hooks/useEditor";

interface EditorAreaProps {
  file: FileEntry | null;
  content?: string;
  onChange?: (content: string) => void;
  loading?: boolean;
  saving?: boolean;
  isDirty?: boolean;
  /** マルチタブ用 */
  tabs?: TabState[];
  activeTabPath?: string | null;
  onTabSelect?: (path: string) => void;
  onTabClose?: (path: string) => void;
}

export function EditorArea({
  file,
  content,
  onChange,
  loading,
  saving,
  tabs,
  activeTabPath,
  onTabSelect,
  onTabClose,
}: EditorAreaProps) {
  if (!file && (!tabs || tabs.length === 0)) {
    return <EmptyState />;
  }

  if (loading) {
    return (
      <main
        className="flex flex-1 flex-col overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-primary)" }}
      >
        {/* タブバー（ローディング中も表示） */}
        {tabs && tabs.length > 0 && onTabSelect && onTabClose && (
          <TabBar
            tabs={tabs}
            activeTabPath={activeTabPath ?? null}
            onTabSelect={onTabSelect}
            onTabClose={onTabClose}
            saving={saving}
          />
        )}
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-muted)]" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* タブバー */}
      {tabs && tabs.length > 0 && onTabSelect && onTabClose ? (
        <TabBar
          tabs={tabs}
          activeTabPath={activeTabPath ?? null}
          onTabSelect={onTabSelect}
          onTabClose={onTabClose}
          saving={saving}
        />
      ) : null}

      {/* CodeMirror 6 エディタ */}
      {file && (
        <div className="flex-1 overflow-hidden">
          <MarkdownEditor
            content={content ?? ""}
            filePath={file.path}
            onChange={onChange}
          />
        </div>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <main
      className="flex flex-1 items-center justify-center"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <FileText size={48} className="text-[var(--color-text-muted)]" />
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            ファイルを選択して編集を開始
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            左のサイドバーからマークダウンファイルを選んでください
          </p>
        </div>
      </div>
    </main>
  );
}
