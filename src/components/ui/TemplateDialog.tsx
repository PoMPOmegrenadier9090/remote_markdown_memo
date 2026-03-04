"use client";

import { useState } from "react";
import { X, Plus, Trash2, FileText, Edit3, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarkdownTemplate } from "@/hooks/useTemplates";

interface TemplateDialogProps {
  templates: MarkdownTemplate[];
  onSelect: (content: string) => void;
  onAdd: (name: string, content: string) => void;
  onUpdate: (id: string, name: string, content: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function TemplateDialog({
  templates,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: TemplateDialogProps) {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), content);
    setMode("list");
    setName("");
    setContent("");
  };

  const handleUpdate = () => {
    if (!editId || !name.trim()) return;
    onUpdate(editId, name.trim(), content);
    setMode("list");
    setEditId(null);
    setName("");
    setContent("");
  };

  const startEdit = (template: MarkdownTemplate) => {
    setEditId(template.id);
    setName(template.name);
    setContent(template.content);
    setMode("edit");
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg shadow-2xl"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {mode === "list" ? "テンプレート" : mode === "create" ? "新規テンプレート" : "テンプレート編集"}
          </h2>
          <div className="flex items-center gap-2">
            {mode === "list" && (
              <button
                onClick={() => {
                  setMode("create");
                  setName("");
                  setContent("");
                }}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors",
                  "hover:bg-[var(--color-bg-hover)]",
                )}
                style={{ color: "var(--color-text-accent)" }}
              >
                <Plus size={12} />
                新規作成
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 transition-colors hover:bg-[var(--color-bg-hover)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === "list" ? (
            <div className="flex flex-col gap-2">
              {templates.length === 0 ? (
                <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                  テンプレートがありません
                </p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--color-bg-hover)]"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    <FileText size={16} className="shrink-0" style={{ color: "var(--color-text-accent)" }} />
                    <button
                      className="flex-1 text-left"
                      onClick={() => onSelect(template.id)}
                    >
                      <div className="text-sm" style={{ color: "var(--color-text-primary)" }}>
                        {template.name}
                      </div>
                      <div
                        className="mt-0.5 truncate text-xs"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {template.content.split("\n")[0].replace(/^#+\s*/, "").substring(0, 60)}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(template);
                        }}
                        className="rounded p-1 transition-colors hover:bg-[var(--color-bg-active)]"
                        style={{ color: "var(--color-text-secondary)" }}
                        title="編集"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`テンプレート「${template.name}」を削除しますか？`)) {
                            onDelete(template.id);
                          }
                        }}
                        className="rounded p-1 transition-colors hover:bg-[var(--color-bg-active)]"
                        style={{ color: "var(--color-error)" }}
                        title="削除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* 作成/編集フォーム */
            <div className="flex flex-col gap-3">
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  テンプレート名
                </label>
                <input
                  autoFocus
                  className="w-full rounded border px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                  placeholder="例: 日報"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  内容 <span style={{ color: "var(--color-text-muted)" }}>
                    ({"{{date}}"}, {"{{time}}"}, {"{{datetime}}"} が使えます)
                  </span>
                </label>
                <textarea
                  className="w-full resize-none rounded border px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-accent)]"
                  style={{
                    backgroundColor: "var(--color-bg-input)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                    height: "200px",
                  }}
                  placeholder="マークダウンテンプレートを入力..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setMode("list");
                    setEditId(null);
                    setName("");
                    setContent("");
                  }}
                  className="rounded px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-bg-hover)]"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  キャンセル
                </button>
                <button
                  onClick={mode === "create" ? handleCreate : handleUpdate}
                  disabled={!name.trim()}
                  className={cn(
                    "flex items-center gap-1 rounded px-3 py-1.5 text-xs text-white transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                  style={{ backgroundColor: "var(--color-accent)" }}
                >
                  <Check size={12} />
                  {mode === "create" ? "作成" : "更新"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
