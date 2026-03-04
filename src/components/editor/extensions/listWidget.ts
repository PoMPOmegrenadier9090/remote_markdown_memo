import { ViewPlugin, type ViewUpdate, type DecorationSet, Decoration, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import { isCursorInRange, safeRange } from "./utils";

/**
 * リスト・チェックボックスのLive Preview
 *
 * - [x] テキスト → チェック済みチェックボックスWidget + テキスト
 * - [ ] テキスト → 未チェックチェックボックスWidget + テキスト
 * - 通常リスト項目のマーカー装飾
 */

/** チェックボックスWidget */
class TaskCheckboxWidget extends WidgetType {
  constructor(
    private readonly checked: boolean,
    private readonly pos: number,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = this.checked;
    input.className = "cm-checkbox-widget";
    input.setAttribute("data-pos", String(this.pos));
    return input;
  }

  eq(other: TaskCheckboxWidget): boolean {
    return this.checked === other.checked && this.pos === other.pos;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildListDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      // --- Task (チェックボックス付きリスト項目) ---
      if (node.name === "Task") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;
        if (isCursorInRange(state, from, to)) return;

        const line = state.doc.lineAt(from);
        const lineText = line.text;

        // `- [x] ` or `- [ ] ` パターンを検出
        const taskMatch = lineText.match(/^(\s*[-*+]\s+)\[([ xX])\]\s/);
        if (taskMatch) {
          const isChecked = taskMatch[2].toLowerCase() === "x";
          const listMarkerEnd = line.from + taskMatch[1].length;
          const checkboxEnd = listMarkerEnd + 3 + 1; // [x] + space
          const safeCheckboxEnd = Math.min(checkboxEnd, line.to);

          // `- [x] ` 全体を チェックボックスWidgetで置換
          decorations.push(
            Decoration.replace({
              widget: new TaskCheckboxWidget(isChecked, listMarkerEnd),
            }).range(line.from, safeCheckboxEnd),
          );

          // チェック済みの場合、テキストを薄く
          if (isChecked && safeCheckboxEnd < line.to) {
            decorations.push(
              Decoration.mark({
                attributes: {
                  style: "text-decoration: line-through; opacity: 0.6;",
                },
              }).range(safeCheckboxEnd, line.to),
            );
          }
        }

        return false; // 子ノードは探索不要
      }

      // --- BulletList / OrderedList のマーカー装飾 ---
      if (node.name === "ListMark") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;

        // タスクリスト内のマークは上で処理済み
        const parent = node.node.parent;
        if (parent?.name === "Task") return;

        if (isCursorInRange(state, from, to)) return;

        // リストマーカーにアクセントカラーを適用
        decorations.push(
          Decoration.mark({
            attributes: { style: "color: #569cd6;" },
          }).range(from, to),
        );
      }
    },
  });

  return Decoration.set(decorations, true);
}

export const listPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: { state: EditorState }) {
      this.decorations = buildListDecorations(view.state);
    }

    update(update: ViewUpdate) {
      // IME入力中はデコレーション再構築をスキップ
      if (update.view.composing) return;
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildListDecorations(update.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
