"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ProgressContextValue {
  /** API処理中を示すインジケータを開始する */
  startProgress: () => void;
  /** 処理完了 */
  stopProgress: () => void;
  /** 現在処理中かどうか */
  isLoading: boolean;
}

const ProgressContext = createContext<ProgressContextValue>({
  startProgress: () => {},
  stopProgress: () => {},
  isLoading: false,
});

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const startProgress = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  const stopProgress = useCallback(() => {
    setCount((c) => Math.max(0, c - 1));
  }, []);

  const isLoading = count > 0;

  return (
    <ProgressContext.Provider value={{ startProgress, stopProgress, isLoading }}>
      {children}
      {/* トップ部分のプログレスバー */}
      {isLoading && (
        <div
          className="fixed top-0 right-0 left-0 z-50 overflow-hidden"
          style={{ height: "2px", backgroundColor: "var(--color-bg-tertiary)" }}
        >
          <div
            className="progress-bar-indeterminate h-full"
            style={{
              width: "33%",
              backgroundColor: "var(--color-accent)",
            }}
          />
        </div>
      )}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  return useContext(ProgressContext);
}
