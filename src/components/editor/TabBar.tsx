"use client";

import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TabState } from "@/hooks/useEditor";

interface TabBarProps {
  tabs: TabState[];
  activeTabPath: string | null;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  saving?: boolean;
}

export function TabBar({ tabs, activeTabPath, onTabSelect, onTabClose, saving }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div
      className="flex items-end overflow-x-auto border-b"
      style={{
        minHeight: "35px",
        backgroundColor: "var(--color-bg-tertiary)",
        borderColor: "var(--color-border)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeTabPath;
        const isDirty = tab.content !== tab.savedContent;

        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "group relative flex items-center gap-1.5 border-r px-3 py-1.5 text-xs",
              "cursor-pointer select-none transition-colors",
              isActive
                ? "border-b-2 bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]",
            )}
            style={{
              borderRightColor: "var(--color-border)",
              borderBottomColor: isActive ? "var(--color-accent)" : "transparent",
            }}
            onClick={() => onTabSelect(tab.path)}
          >
            <FileText
              size={12}
              className={
                isActive
                  ? "text-[var(--color-text-accent)]"
                  : "text-[var(--color-text-muted)]"
              }
            />
            <span className="max-w-[120px] truncate">{tab.name}</span>

            {/* Dirty indicator / saving */}
            {isDirty && (
              <span
                className={cn(
                  "ml-0.5 text-[var(--color-text-muted)]",
                  saving && isActive && "animate-pulse",
                )}
              >
                ●
              </span>
            )}

            {/* 閉じるボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.path);
              }}
              className={cn(
                "ml-1 rounded p-0.5 transition-colors",
                "hover:bg-[var(--color-bg-active)]",
                // アクティブでないタブはホバー時のみ表示
                !isActive && "opacity-0 group-hover:opacity-100",
              )}
              title={`${tab.name} を閉じる`}
              aria-label={`${tab.name} を閉じる`}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
