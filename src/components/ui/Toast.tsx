"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        // アニメーション開始
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
        // 実際に削除
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 200);
      }, duration);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* トースト表示領域 */}
      <div className="fixed right-4 bottom-10 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;

  const bgColor =
    toast.type === "success"
      ? "var(--color-success)"
      : toast.type === "error"
        ? "var(--color-error)"
        : "var(--color-accent)";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-4 py-2.5 text-xs text-white shadow-lg",
        toast.exiting ? "toast-exit" : "toast-enter",
      )}
      style={{
        backgroundColor: bgColor,
        minWidth: "280px",
        maxWidth: "420px",
      }}
    >
      <Icon size={14} className="shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-white/20"
      >
        <X size={12} />
      </button>
    </div>
  );
}
