import { ViewPlugin, type ViewUpdate, type DecorationSet, Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import { isCursorInRange, safeRange } from "./utils";

/**
 * 強調（太字・斜体・取り消し線）のLive Preview
 *
 * - **太字** → カーソル外では ** を隠して太字スタイル適用
 * - _斜体_  → カーソル外では _ を隠して斜体スタイル適用
 * - ~~取り消し~~ → カーソル外では ~~ を隠して取り消し線適用
 * - `インラインコード` → カーソル外では ` を隠してコードスタイル適用
 */

interface EmphasisConfig {
  nodeType: string;
  markType: string;
  className: string;
}

const EMPHASIS_CONFIGS: EmphasisConfig[] = [
  { nodeType: "StrongEmphasis", markType: "EmphasisMark", className: "cm-live-bold" },
  { nodeType: "Emphasis", markType: "EmphasisMark", className: "cm-live-italic" },
  { nodeType: "Strikethrough", markType: "StrikethroughMark", className: "cm-live-strikethrough" },
  { nodeType: "InlineCode", markType: "CodeMark", className: "cm-live-inline-code" },
];

function buildEmphasisDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      const config = EMPHASIS_CONFIGS.find((c) => c.nodeType === node.name);
      if (!config) return;

      const range = safeRange(state, node.from, node.to);
      if (!range) return;
      const from = range.from;
      const to = range.to;

      // カーソルがある行は生マークダウン
      if (isCursorInRange(state, from, to)) return;

      // EmphasisMark / CodeMark を収集
      const marks: { from: number; to: number }[] = [];
      const cursor = node.node.cursor();
      if (cursor.firstChild()) {
        do {
          if (cursor.name === config.markType) {
            marks.push({ from: cursor.from, to: cursor.to });
          }
        } while (cursor.nextSibling());
      }

      // マーク記号を隠す
      for (const mark of marks) {
        const markRange = safeRange(state, mark.from, mark.to);
        if (markRange) {
          decorations.push(Decoration.replace({}).range(markRange.from, markRange.to));
        }
      }

      // テキスト部分にスタイルを適用
      if (marks.length >= 2) {
        const textFrom = marks[0].to;
        const textTo = marks[marks.length - 1].from;
        if (textFrom < textTo) {
          decorations.push(
            Decoration.mark({ class: config.className }).range(textFrom, textTo),
          );
        }
      }
    },
  });

  return Decoration.set(decorations, true);
}

export const emphasisPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: { state: EditorState }) {
      this.decorations = buildEmphasisDecorations(view.state);
    }

    update(update: ViewUpdate) {
      // IME入力中はデコレーション再構築をスキップ
      if (update.view.composing) return;
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildEmphasisDecorations(update.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
