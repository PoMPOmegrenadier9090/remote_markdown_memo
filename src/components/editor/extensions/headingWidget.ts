import { ViewPlugin, type ViewUpdate, type DecorationSet, Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import { isCursorInRange, safeRange } from "./utils";

/**
 * 見出しのLive Preview
 * カーソルが離れた行: `# ` マークを隠し、テキストに見出しスタイルを適用
 * カーソルがある行: 生のマークダウン記法を表示
 */

const HEADING_LEVELS: Record<string, string> = {
  ATXHeading1: "cm-heading-1",
  ATXHeading2: "cm-heading-2",
  ATXHeading3: "cm-heading-3",
  ATXHeading4: "cm-heading-4",
  ATXHeading5: "cm-heading-5",
  ATXHeading6: "cm-heading-6",
};

function buildHeadingDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      const className = HEADING_LEVELS[node.name];
      if (!className) return;

      const range = safeRange(state, node.from, node.to);
      if (!range) return;
      const from = range.from;
      const to = range.to;

      // カーソルが行内にある場合はデコレーション不要（生マークダウン表示）
      if (isCursorInRange(state, from, to)) return;

      // HeaderMark （`# ` の部分）を探す
      const headerMark = node.node.getChild("HeaderMark");
      if (headerMark) {
        // `# ` 部分を隠す（HeaderMark + その後のスペース）
        const hideEnd = Math.min(headerMark.to + 1, to);
        decorations.push(
          Decoration.replace({}).range(from, hideEnd),
        );
      }

      // 見出し全体にスタイルを適用（テキスト部分）
      const textFrom = headerMark ? Math.min(headerMark.to + 1, to) : from;
      if (textFrom < to) {
        decorations.push(
          Decoration.mark({ class: className }).range(textFrom, to),
        );
      }
    },
  });

  return Decoration.set(decorations, true);
}

export const headingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: { state: EditorState }) {
      this.decorations = buildHeadingDecorations(view.state);
    }

    update(update: ViewUpdate) {
      // IME入力中はデコレーション再構築をスキップ
      if (update.view.composing) return;
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildHeadingDecorations(update.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
