import { ViewPlugin, type ViewUpdate, type DecorationSet, Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import { isCursorInRange, safeRange } from "./utils";

/**
 * コードブロックとブロック引用のLive Preview
 *
 * - ```lang ... ``` → 背景色付きコードブロックとして表示
 * - > テキスト → 左ボーダー付きの引用ブロックとして表示
 */

function buildCodeBlockDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      // --- FencedCode: ```...``` ---
      if (node.name === "FencedCode") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;
        const cursorInRange = isCursorInRange(state, from, to);

        // コードブロック内の各行に背景色を適用
        const startLine = state.doc.lineAt(from).number;
        const endLine = state.doc.lineAt(to).number;

        for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
          const line = state.doc.line(lineNum);
          const lineText = line.text;

          // フェンス行 (```) にはcodeblock-infoクラスを適用
          if (lineNum === startLine || lineNum === endLine) {
            if (!cursorInRange) {
              // カーソル外ではフェンス行を薄く表示
              decorations.push(
                Decoration.line({ class: "cm-codeblock-line cm-codeblock-info" }).range(line.from),
              );
            } else {
              decorations.push(
                Decoration.line({ class: "cm-codeblock-line" }).range(line.from),
              );
            }
          } else {
            // コード本文行
            decorations.push(
              Decoration.line({ class: "cm-codeblock-line" }).range(line.from),
            );
          }
        }

        // カーソルが外にある場合、開始フェンス行のテキストを薄くする
        if (!cursorInRange) {
          const firstLine = state.doc.line(startLine);
          const lastLine = state.doc.line(endLine);
          // 開始フェンス（```lang）と終了フェンス（```）をmark
          if (firstLine.text.trim().startsWith("```")) {
            decorations.push(
              Decoration.mark({ class: "cm-codeblock-info" }).range(firstLine.from, firstLine.to),
            );
          }
          if (lastLine.text.trim() === "```") {
            decorations.push(
              Decoration.mark({ class: "cm-codeblock-info" }).range(lastLine.from, lastLine.to),
            );
          }
        }
      }

      // --- Blockquote: > テキスト ---
      if (node.name === "Blockquote") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;

        const startLine = state.doc.lineAt(from).number;
        const endLine = state.doc.lineAt(to).number;

        for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
          const line = state.doc.line(lineNum);
          decorations.push(
            Decoration.line({ class: "cm-blockquote-line" }).range(line.from),
          );

          // カーソルが外の場合、`> ` マークを隠す
          if (!isCursorInRange(state, line.from, line.to)) {
            const lineText = line.text;
            const quoteMatch = lineText.match(/^(\s*>\s?)/);
            if (quoteMatch) {
              decorations.push(
                Decoration.replace({}).range(line.from, line.from + quoteMatch[1].length),
              );
            }
          }
        }
      }

      // --- HorizontalRule: --- / *** / ___ ---
      if (node.name === "HorizontalRule") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;
        if (!isCursorInRange(state, from, to)) {
          // 水平線の行全体に線スタイルを適用
          const line = state.doc.lineAt(from);
          decorations.push(
            Decoration.line({
              attributes: {
                style: "border-bottom: 1px solid var(--color-border); line-height: 0.5; color: transparent;",
              },
            }).range(line.from),
          );
        }
      }
    },
  });

  return Decoration.set(decorations, true);
}

export const codeBlockPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: { state: EditorState }) {
      this.decorations = buildCodeBlockDecorations(view.state);
    }

    update(update: ViewUpdate) {
      // IME入力中はデコレーション再構築をスキップ
      if (update.view.composing) return;
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildCodeBlockDecorations(update.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
