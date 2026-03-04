"use client";

import { useState, useCallback, useEffect } from "react";

export interface MarkdownTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

const TEMPLATES_STORAGE_KEY = "obsidian-remote-memo-templates";

/** デフォルトテンプレート */
const DEFAULT_TEMPLATES: MarkdownTemplate[] = [
  {
    id: "daily-note",
    name: "日報",
    content: `# 日報 - {{date}}

## 今日やったこと
- 

## 明日やること
- 

## メモ

`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "meeting-note",
    name: "議事録",
    content: `# 議事録 - {{date}}

## 参加者
- 

## アジェンダ
1. 

## 決定事項
- 

## アクションアイテム
- [ ] 

`,
    createdAt: new Date().toISOString(),
  },
  {
    id: "todo-list",
    name: "TODO リスト",
    content: `# TODO - {{date}}

## 優先度: 高
- [ ] 

## 優先度: 中
- [ ] 

## 優先度: 低
- [ ] 

`,
    createdAt: new Date().toISOString(),
  },
];

/**
 * マークダウンテンプレートを管理するHook
 * テンプレートはlocalStorageに保存（ローカルのみ）
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<MarkdownTemplate[]>([]);

  // localStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (stored) {
        setTemplates(JSON.parse(stored) as MarkdownTemplate[]);
      } else {
        // 初回はデフォルトテンプレートを設定
        setTemplates(DEFAULT_TEMPLATES);
        localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
    }
  }, []);

  // テンプレートが変更されたらlocalStorageに保存
  const saveTemplates = useCallback((updated: MarkdownTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
  }, []);

  /** テンプレートを追加 */
  const addTemplate = useCallback(
    (name: string, content: string) => {
      const newTemplate: MarkdownTemplate = {
        id: `template-${Date.now()}`,
        name,
        content,
        createdAt: new Date().toISOString(),
      };
      saveTemplates([...templates, newTemplate]);
      return newTemplate;
    },
    [templates, saveTemplates],
  );

  /** テンプレートを更新 */
  const updateTemplate = useCallback(
    (id: string, name: string, content: string) => {
      saveTemplates(
        templates.map((t) => (t.id === id ? { ...t, name, content } : t)),
      );
    },
    [templates, saveTemplates],
  );

  /** テンプレートを削除 */
  const deleteTemplate = useCallback(
    (id: string) => {
      saveTemplates(templates.filter((t) => t.id !== id));
    },
    [templates, saveTemplates],
  );

  /** テンプレートの内容を変数展開して取得 */
  const applyTemplate = useCallback((template: MarkdownTemplate): string => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

    return template.content
      .replace(/\{\{date\}\}/g, dateStr)
      .replace(/\{\{time\}\}/g, timeStr)
      .replace(/\{\{datetime\}\}/g, `${dateStr} ${timeStr}`);
  }, []);

  return {
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
  };
}
