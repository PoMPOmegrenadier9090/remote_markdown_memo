"use client";

import { useRef, useEffect, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { safeBracketMatchingPlugin } from "@/components/editor/extensions/safeBracketMatching";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { editorTheme } from "@/components/editor/theme";
import { livePreviewExtensions } from "@/components/editor/extensions/livePreview";
import { markdownShortcuts } from "@/components/editor/extensions/markdownShortcuts";

interface MarkdownEditorProps {
  /** 初期コンテンツ */
  content: string;
  /** 現在開いているファイルパス */
  filePath?: string;
  /** 内容が変更された際のコールバック */
  onChange?: (content: string) => void;
  /** 読み取り専用かどうか */
  readOnly?: boolean;
}

export function MarkdownEditor({ content, filePath, onChange, readOnly = false }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const applyingExternalChangeRef = useRef(false);
  const lastFilePathRef = useRef<string | undefined>(filePath);

  // onChangeの最新値を保持（再レンダリング時にリスナーを再登録しない）
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const createUpdateListener = useCallback(() => {
    return EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current && !applyingExternalChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });
  }, []);

  // EditorViewの初期化
  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        // プラグインエラーの安全な処理（IME入力中のRangeError等）
        EditorView.exceptionSink.of((e) => {
          if (e instanceof RangeError && e.message.includes("out of range for changeset")) {
            // IME入力中のデコレーションマッピングエラーは無視
            return;
          }
          console.error("CodeMirror plugin error:", e);
        }),

        // 基本機能
        history(),
        safeBracketMatchingPlugin,
        closeBrackets(),
        highlightSelectionMatches(),

        // キーマップ
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...closeBracketsKeymap,
          ...markdownShortcuts,
          indentWithTab,
        ]),

        // マークダウン言語サポート
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

        // カスタムテーマ
        editorTheme,

        // Live Preview 拡張
        ...livePreviewExtensions(),

        // 変更リスナー
        createUpdateListener(),

        // 読み取り専用
        EditorState.readOnly.of(readOnly),

        // エディタ設定
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // content は初期化時のみ使用。以降はEditorView内部で管理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, createUpdateListener]);

  // 外部からcontentが変更された場合（ファイル切り替え・Pull反映時）
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    const fileChanged = lastFilePathRef.current !== filePath;
    lastFilePathRef.current = filePath;

    // 入力中は再同期しない（DOM changeとの競合回避）。
    // ただしファイル切り替え時は強制的に同期する。
    if (!fileChanged && view.hasFocus) return;
    if (currentContent === content) return;

    applyingExternalChangeRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentContent.length,
        insert: content,
      },
      selection: {
        anchor: Math.min(view.state.selection.main.anchor, content.length),
      },
    });
    applyingExternalChangeRef.current = false;
  }, [content, filePath]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto"
      style={{ backgroundColor: "var(--color-bg-primary)" }}
    />
  );
}
