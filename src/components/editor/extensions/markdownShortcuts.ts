import { EditorView } from "@codemirror/view";
import { type KeyBinding } from "@codemirror/view";

/**
 * Markdown書式のショートカットキー定義
 *
 * - Ctrl/Cmd+B: 太字 (**text**)
 * - Ctrl/Cmd+I: 斜体 (*text*)
 * - Ctrl/Cmd+Shift+S: 取り消し線 (~~text~~)
 * - Ctrl/Cmd+K: リンク ([text](url))
 * - Ctrl/Cmd+Shift+K: コードブロック (```...```)
 * - Ctrl/Cmd+`: インラインコード (`text`)
 * - Ctrl/Cmd+Shift+1: 見出し1 (# )
 * - Ctrl/Cmd+Shift+2: 見出し2 (## )
 * - Ctrl/Cmd+Shift+3: 見出し3 (### )
 */

/** 選択テキストをマークダウン記法で囲む */
function wrapSelection(view: EditorView, before: string, after: string): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  // 既に囲まれている場合は解除
  const docFrom = Math.max(0, from - before.length);
  const docTo = Math.min(view.state.doc.length, to + after.length);
  const surrounding = view.state.sliceDoc(docFrom, docTo);

  if (surrounding.startsWith(before) && surrounding.endsWith(after) && surrounding.length >= before.length + after.length) {
    // 解除
    view.dispatch({
      changes: [
        { from: docFrom, to: docFrom + before.length, insert: "" },
        { from: to, to: to + after.length, insert: "" },
      ],
      selection: { anchor: docFrom, head: docFrom + selected.length },
    });
    return true;
  }

  // 囲む
  const newText = `${before}${selected}${after}`;
  view.dispatch({
    changes: { from, to, insert: newText },
    selection: {
      anchor: from + before.length,
      head: from + before.length + selected.length,
    },
  });
  return true;
}

/** 行頭にプレフィックスを追加/解除 */
function toggleLinePrefix(view: EditorView, prefix: string): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  const lineText = line.text;

  if (lineText.startsWith(prefix)) {
    // 解除
    view.dispatch({
      changes: { from: line.from, to: line.from + prefix.length, insert: "" },
    });
  } else {
    // 既存の見出し記法を除去してから付加
    const headingMatch = lineText.match(/^#{1,6}\s/);
    const removeLength = headingMatch ? headingMatch[0].length : 0;
    view.dispatch({
      changes: { from: line.from, to: line.from + removeLength, insert: prefix },
    });
  }
  return true;
}

/** コードブロックを挿入 */
function insertCodeBlock(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  const block = `\`\`\`\n${selected || ""}\n\`\`\``;
  view.dispatch({
    changes: { from, to, insert: block },
    selection: { anchor: from + 4, head: from + 4 + selected.length },
  });
  return true;
}

export const markdownShortcuts: KeyBinding[] = [
  {
    key: "Mod-b",
    run: (view) => wrapSelection(view, "**", "**"),
  },
  {
    key: "Mod-i",
    run: (view) => wrapSelection(view, "*", "*"),
  },
  {
    key: "Mod-Shift-s",
    run: (view) => wrapSelection(view, "~~", "~~"),
  },
  {
    key: "Mod-k",
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      const link = `[${selected || "text"}](url)`;
      view.dispatch({
        changes: { from, to, insert: link },
        selection: {
          // URLの位置にカーソル
          anchor: from + (selected || "text").length + 3,
          head: from + (selected || "text").length + 6,
        },
      });
      return true;
    },
  },
  {
    key: "Mod-`",
    run: (view) => wrapSelection(view, "`", "`"),
  },
  {
    key: "Mod-Shift-k",
    run: insertCodeBlock,
  },
  {
    key: "Mod-Shift-1",
    run: (view) => toggleLinePrefix(view, "# "),
  },
  {
    key: "Mod-Shift-2",
    run: (view) => toggleLinePrefix(view, "## "),
  },
  {
    key: "Mod-Shift-3",
    run: (view) => toggleLinePrefix(view, "### "),
  },
];
