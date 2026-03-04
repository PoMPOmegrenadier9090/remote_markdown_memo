import { ViewPlugin, type ViewUpdate, type DecorationSet, Decoration } from "@codemirror/view";
import { matchBrackets } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";

/**
 * IME入力に対応した安全なブラケットマッチング
 *
 * @codemirror/language の bracketMatching() はIME入力中に
 * decorations.map(update.changes) で RangeError を起こすため、
 * 独自の安全な実装で置き換える。
 *
 * 違い:
 * - IME入力中（composing）はデコレーションをクリアし、マッピングをしない
 * - デコレーション位置をドキュメント長にクランプ
 */

const matchingMark = Decoration.mark({ class: "cm-matchingBracket" });
const nonmatchingMark = Decoration.mark({ class: "cm-nonmatchingBracket" });

function buildBracketDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const docLen = state.doc.length;

  for (const range of state.selection.ranges) {
    if (!range.empty) continue;

    const match =
      matchBrackets(state, range.head, -1) ||
      (range.head > 0 && matchBrackets(state, range.head - 1, 1)) ||
      matchBrackets(state, range.head, 1) ||
      (range.head < docLen && matchBrackets(state, range.head + 1, -1));

    if (!match) continue;

    const mark = match.matched ? matchingMark : nonmatchingMark;

    // start bracket
    const sf = Math.max(0, Math.min(match.start.from, docLen));
    const st = Math.max(0, Math.min(match.start.to, docLen));
    if (sf < st) {
      decorations.push(mark.range(sf, st));
    }

    // end bracket (if matched)
    if (match.end) {
      const ef = Math.max(0, Math.min(match.end.from, docLen));
      const et = Math.max(0, Math.min(match.end.to, docLen));
      if (ef < et) {
        decorations.push(mark.range(ef, et));
      }
    }
  }

  return Decoration.set(decorations, true);
}

/**
 * IME安全なブラケットマッチングプラグイン
 *
 * bracketMatching() の代わりに使用する。
 * IME入力中はデコレーションをクリアし、
 * 入力完了後に再構築する。
 */
export const safeBracketMatchingPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    private composing = false;

    constructor(view: { state: EditorState }) {
      this.decorations = buildBracketDecorations(view.state);
    }

    update(update: ViewUpdate) {
      if (update.view.composing) {
        // IME入力中: デコレーションをクリア（mapしない）
        this.decorations = Decoration.none;
        this.composing = true;
        return;
      }

      // IME入力終了後 or 通常の変更
      if (update.docChanged || update.selectionSet || this.composing) {
        this.decorations = buildBracketDecorations(update.state);
        this.composing = false;
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
