import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/**
 * VS Code 風 エディタテーマ
 * CodeMirror 6 のEditorView.themeとHighlightStyleを統合
 * CSS変数を使用するため、ライト/ダーク両方に対応
 */

/** エディタUIのテーマ（CSS変数ベースで自動切替） */
const baseTheme = EditorView.theme(
  {
    "&": {
      color: "var(--color-text-primary)",
      backgroundColor: "var(--color-bg-primary)",
      fontSize: "14px",
      fontFamily: "var(--font-mono, 'Fira Code', 'Cascadia Code', Consolas, monospace)",
    },
    ".cm-content": {
      padding: "16px 20px",
      caretColor: "var(--color-text-primary)",
      lineHeight: "1.7",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--color-text-primary)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "var(--cm-selection-bg, rgba(38, 79, 120, 0.6))",
      },
    ".cm-activeLine": {
      backgroundColor: "var(--cm-active-line-bg, rgba(255, 255, 255, 0.04))",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-bg-primary)",
      color: "var(--color-text-muted)",
      border: "none",
      paddingLeft: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--cm-active-line-bg, rgba(255, 255, 255, 0.04))",
      color: "var(--color-text-secondary)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      minWidth: "32px",
      textAlign: "right",
      paddingRight: "12px",
      fontSize: "12px",
    },
    ".cm-foldGutter": {
      width: "14px",
    },
    ".cm-matchingBracket": {
      backgroundColor: "rgba(0, 122, 204, 0.3)",
      outline: "1px solid rgba(0, 122, 204, 0.5)",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgba(234, 92, 0, 0.33)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(234, 92, 0, 0.55)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "rgba(173, 214, 255, 0.15)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--color-bg-tertiary)",
      border: "1px solid var(--color-border)",
      color: "var(--color-text-primary)",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li": {
        padding: "2px 8px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "var(--color-accent)",
        color: "#fff",
      },
    },
    ".cm-panels": {
      backgroundColor: "var(--color-bg-tertiary)",
      borderBottom: "1px solid var(--color-border)",
    },
    ".cm-panel.cm-search": {
      padding: "4px 8px",
    },
    ".cm-panel.cm-search input, .cm-panel.cm-search button": {
      fontSize: "12px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: "var(--color-bg-input)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border)",
      borderRadius: "2px",
      padding: "2px 6px",
    },
    ".cm-panel.cm-search button": {
      backgroundColor: "var(--color-bg-input)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border)",
      borderRadius: "2px",
      cursor: "pointer",
    },
  },
);

/** マークダウンシンタックスハイライト（CSS変数でテーマ対応） */
const markdownHighlightStyle = HighlightStyle.define([
  // 見出し
  { tag: tags.heading1, color: "var(--cm-heading, #4fc1ff)", fontWeight: "bold", fontSize: "1.6em" },
  { tag: tags.heading2, color: "var(--cm-heading, #4fc1ff)", fontWeight: "bold", fontSize: "1.4em" },
  { tag: tags.heading3, color: "var(--cm-heading, #4fc1ff)", fontWeight: "bold", fontSize: "1.2em" },
  { tag: tags.heading4, color: "var(--cm-heading, #4fc1ff)", fontWeight: "bold", fontSize: "1.1em" },
  { tag: tags.heading5, color: "var(--cm-heading, #4fc1ff)", fontWeight: "bold", fontSize: "1.05em" },
  { tag: tags.heading6, color: "var(--cm-heading, #4fc1ff)", fontWeight: "bold" },

  // 強調
  { tag: tags.strong, color: "#569cd6", fontWeight: "bold" },
  { tag: tags.emphasis, color: "#c586c0", fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through", color: "#808080" },

  // コード
  { tag: tags.monospace, color: "#ce9178", backgroundColor: "rgba(255, 255, 255, 0.06)", borderRadius: "3px" },

  // リンク
  { tag: tags.link, color: "#4ec9b0", textDecoration: "underline" },
  { tag: tags.url, color: "#4ec9b0" },

  // リスト
  { tag: tags.list, color: "#569cd6" },

  // 引用
  { tag: tags.quote, color: "#6a9955", fontStyle: "italic" },

  // メタ（マークダウン記法の記号部分）
  { tag: tags.processingInstruction, color: "#808080" },
  { tag: tags.meta, color: "#808080" },

  // コメント
  { tag: tags.comment, color: "#6a9955" },

  // キーワード
  { tag: tags.keyword, color: "#569cd6" },
  { tag: tags.string, color: "#ce9178" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.bool, color: "#569cd6" },
  { tag: tags.null, color: "#569cd6" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.punctuation, color: "#808080" },
  { tag: tags.variableName, color: "#9cdcfe" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.typeName, color: "#4ec9b0" },
  { tag: tags.className, color: "#4ec9b0" },
  { tag: tags.definition(tags.variableName), color: "#9cdcfe" },
  { tag: tags.propertyName, color: "#9cdcfe" },
]);

/** エクスポート: テーマ全体をまとめた拡張 */
export const editorTheme = [
  baseTheme,
  syntaxHighlighting(markdownHighlightStyle),
];
