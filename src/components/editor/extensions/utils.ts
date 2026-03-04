import { EditorView, Decoration, type DecorationSet, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

export function clampPos(state: EditorState, pos: number): number {
  return Math.max(0, Math.min(pos, state.doc.length));
}

export function safeRange(
  state: EditorState,
  from: number,
  to: number,
): { from: number; to: number } | null {
  const safeFrom = clampPos(state, from);
  const safeTo = clampPos(state, to);
  if (safeFrom > safeTo) return null;
  return { from: safeFrom, to: safeTo };
}

/**
 * カーソルが指定範囲内にあるかを判定
 * Obsidian風: カーソルが近くにある場合は生マークダウンを表示
 */
export function isCursorInRange(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  const range = safeRange(state, from, to);
  if (!range) return false;

  const selection = state.selection;
  for (const range of selection.ranges) {
    // カーソルが行内にあるかを判定（行単位で展開）
    const lineFrom = state.doc.lineAt(clampPos(state, range.from)).from;
    const lineTo = state.doc.lineAt(clampPos(state, range.to)).to;
    if (range.from <= lineTo && range.to >= lineFrom) {
      return true;
    }
  }
  return false;
}

/**
 * シンタックスツリーを走査して指定ノードタイプに一致するデコレーションを収集する
 */
export function collectDecorations(
  state: EditorState,
  nodeTypes: string[],
  handler: (node: SyntaxNode, state: EditorState) => Range<Decoration>[] | null,
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      if (nodeTypes.includes(node.name)) {
        const result = handler(node.node, state);
        if (result) {
          decorations.push(...result);
        }
      }
    },
  });

  return Decoration.set(decorations, true);
}

/**
 * マークダウン記号を隠すためのDecoration
 * カーソルが離れている行でマーク記号（**, ##等）を非表示にする
 */
export function hideMarkDecoration(from: number, to: number): Range<Decoration> {
  return Decoration.replace({}).range(from, to);
}

/**
 * テキストにスタイルを適用するDecoration
 */
export function styledDecoration(
  from: number,
  to: number,
  attributes: Record<string, string>,
): Range<Decoration> {
  return Decoration.mark({ attributes }).range(from, to);
}

/**
 * Widgetを挿入するためのベースクラス
 */
export class InlineWidget extends WidgetType {
  constructor(
    protected readonly content: string,
    protected readonly className: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = this.className;
    span.textContent = this.content;
    return span;
  }

  eq(other: InlineWidget): boolean {
    return this.content === other.content && this.className === other.className;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * チェックボックスWidget
 */
export class CheckboxWidget extends WidgetType {
  constructor(private readonly checked: boolean) {
    super();
  }

  toDOM(): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.checked;
    input.className = "cm-checkbox-widget";
    input.setAttribute("aria-label", this.checked ? "Completed" : "Todo");
    return input;
  }

  eq(other: CheckboxWidget): boolean {
    return this.checked === other.checked;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * 画像を表示するWidget
 */
export class ImageWidget extends WidgetType {
  constructor(
    private readonly src: string,
    private readonly alt: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-image-widget";

    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.className = "cm-image-preview";
    img.style.maxWidth = "100%";
    img.style.maxHeight = "400px";
    img.style.borderRadius = "4px";
    img.style.marginTop = "4px";
    img.style.marginBottom = "4px";

    wrapper.appendChild(img);
    return wrapper;
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src && this.alt === other.alt;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * 水平線Widget
 */
export class HorizontalRuleWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hr = document.createElement("hr");
    hr.className = "cm-hr-widget";
    hr.style.border = "none";
    hr.style.borderTop = "1px solid var(--color-border)";
    hr.style.margin = "8px 0";
    return hr;
  }

  eq(): boolean {
    return true;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/**
 * ViewPluginで使用するdecoration更新関数の型
 */
export type DecorationBuilder = (state: EditorState) => DecorationSet;

/**
 * EditorViewテーマ拡張としてLive Preview用CSSを注入
 */
export const livePreviewBaseTheme = EditorView.baseTheme({
  // 見出し（カーソルが離れた行）
  ".cm-heading-1": { fontSize: "1.6em", fontWeight: "bold", color: "#4fc1ff", lineHeight: "1.4" },
  ".cm-heading-2": { fontSize: "1.4em", fontWeight: "bold", color: "#4fc1ff", lineHeight: "1.4" },
  ".cm-heading-3": { fontSize: "1.2em", fontWeight: "bold", color: "#4fc1ff", lineHeight: "1.4" },
  ".cm-heading-4": { fontSize: "1.1em", fontWeight: "bold", color: "#4fc1ff", lineHeight: "1.4" },
  ".cm-heading-5": { fontSize: "1.05em", fontWeight: "bold", color: "#4fc1ff", lineHeight: "1.4" },
  ".cm-heading-6": { fontWeight: "bold", color: "#4fc1ff", lineHeight: "1.4" },

  // 強調
  ".cm-live-bold": { fontWeight: "bold", color: "#569cd6" },
  ".cm-live-italic": { fontStyle: "italic", color: "#c586c0" },
  ".cm-live-strikethrough": { textDecoration: "line-through", color: "#808080" },

  // インラインコード
  ".cm-live-inline-code": {
    fontFamily: "var(--font-mono, monospace)",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: "1px 4px",
    borderRadius: "3px",
    color: "#ce9178",
    fontSize: "0.9em",
  },

  // リンク
  ".cm-live-link": {
    color: "#4ec9b0",
    textDecoration: "underline",
    cursor: "pointer",
  },

  // ブロック引用
  ".cm-blockquote-line": {
    borderLeft: "3px solid #6a9955",
    paddingLeft: "12px",
    color: "#6a9955",
    fontStyle: "italic",
  },

  // コードブロック
  ".cm-codeblock-line": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: "0.9em",
  },
  ".cm-codeblock-info": {
    color: "#808080",
    fontSize: "0.85em",
  },

  // チェックボックス
  ".cm-checkbox-widget": {
    verticalAlign: "middle",
    marginRight: "4px",
    cursor: "pointer",
    accentColor: "var(--color-accent)",
  },

  // 画像
  ".cm-image-widget": {
    display: "block",
  },

  // 水平線
  ".cm-hr-widget": {
    display: "block",
    margin: "8px 0",
  },

  // 隠しマーク（フェード用）
  ".cm-hidden-mark": {
    fontSize: "0",
    width: "0",
    display: "inline",
    overflow: "hidden",
  },
});
