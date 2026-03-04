"use client";

import { AlertTriangle, Cloud, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConflictInfo, ConflictResolution } from "@/types";

interface ConflictDialogProps {
  conflicts: ConflictInfo[];
  onResolve: (path: string, resolution: ConflictResolution) => void;
  onClose: () => void;
}

/**
 * コンフリクト解決ダイアログ
 * Pull/Push時にDrive側とローカル側の両方が変更されていた場合に表示
 */
export function ConflictDialog({ conflicts, onResolve, onClose }: ConflictDialogProps) {
  if (conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="mx-4 max-h-[80vh] w-full max-w-lg overflow-hidden rounded-lg border shadow-xl"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
        }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <AlertTriangle size={18} className="text-[var(--color-warning)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            コンフリクトが検出されました
          </h2>
        </div>

        {/* コンフリクトリスト */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            以下のファイルはローカルとGoogle Driveの両方で変更されています。
            どちらの版を使用するか選択してください。
          </p>

          <div className="space-y-3">
            {conflicts.map((conflict) => (
              <ConflictItem
                key={conflict.path}
                conflict={conflict}
                onResolve={onResolve}
              />
            ))}
          </div>
        </div>

        {/* フッター */}
        <div
          className="flex justify-end border-t px-4 py-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            onClick={onClose}
            className={cn(
              "rounded px-3 py-1.5 text-xs transition-colors",
              "bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)]",
              "hover:bg-[var(--color-bg-active)] hover:text-[var(--color-text-primary)]",
            )}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function ConflictItem({
  conflict,
  onResolve,
}: {
  conflict: ConflictInfo;
  onResolve: (path: string, resolution: ConflictResolution) => void;
}) {
  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ja-JP");
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="rounded border p-3"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg-primary)",
      }}
    >
      <p className="mb-2 text-xs font-medium text-[var(--color-text-primary)]">
        {conflict.path}
      </p>

      <div className="mb-2.5 space-y-1 text-[10px] text-[var(--color-text-muted)]">
        <div className="flex items-center gap-1">
          <HardDrive size={10} />
          ローカル: {formatTime(conflict.localModifiedTime)}
        </div>
        <div className="flex items-center gap-1">
          <Cloud size={10} />
          Drive: {formatTime(conflict.driveModifiedTime)}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onResolve(conflict.path, "use-drive")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors",
            "bg-blue-600/20 text-blue-400",
            "hover:bg-blue-600/30",
          )}
        >
          <Cloud size={12} />
          Drive版を使う
        </button>
        <button
          onClick={() => onResolve(conflict.path, "use-local")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors",
            "bg-orange-600/20 text-orange-400",
            "hover:bg-orange-600/30",
          )}
        >
          <HardDrive size={12} />
          ローカル版を使う
        </button>
      </div>
    </div>
  );
}
