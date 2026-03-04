import { ViewPlugin, type ViewUpdate, type DecorationSet, Decoration, WidgetType } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import { isCursorInRange, safeRange } from "./utils";

/**
 * リンクと画像のLive Preview
 *
 * - [テキスト](url) → カーソル外ではクリック可能なリンクとして表示
 * - ![alt](url) → カーソル外では画像をインライン表示
 */

/** リンクテキストをクリック可能に表示するWidget */
class LinkWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly url: string,
  ) {
    super();
  }

  toDOM(): HTMLElement {
    const a = document.createElement("a");
    a.textContent = this.text;
    a.href = this.url;
    a.className = "cm-live-link";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    // Ctrl/Cmd + クリックで開く
    a.addEventListener("click", (e) => {
      if (e.ctrlKey || e.metaKey) {
        window.open(this.url, "_blank", "noopener,noreferrer");
      }
      e.preventDefault();
    });
    return a;
  }

  eq(other: LinkWidget): boolean {
    return this.text === other.text && this.url === other.url;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

/** 画像プレビューWidget */
class ImagePreviewWidget extends WidgetType {
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
    img.style.maxWidth = "100%";
    img.style.maxHeight = "400px";
    img.style.borderRadius = "4px";
    img.style.marginTop = "4px";
    img.style.display = "block";

    img.onerror = () => {
      wrapper.textContent = `[Image not found: ${this.alt}]`;
      wrapper.style.color = "var(--color-error)";
      wrapper.style.fontSize = "0.85em";
    };

    wrapper.appendChild(img);
    return wrapper;
  }

  eq(other: ImagePreviewWidget): boolean {
    return this.src === other.src && this.alt === other.alt;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function buildLinkDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(state);

  tree.iterate({
    enter(node) {
      // --- リンク: [text](url) ---
      if (node.name === "Link") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;
        if (isCursorInRange(state, from, to)) return;

        // リンクテキストとURLを抽出
        const linkText = node.node.getChild("LinkLabel");
        const linkUrl = node.node.getChild("URL");

        if (linkText && linkUrl) {
          const text = state.doc.sliceString(linkText.from + 1, linkText.to - 1); // [ ] を除く
          const url = state.doc.sliceString(linkUrl.from, linkUrl.to);

          // 全体をWidgetで置換
          decorations.push(
            Decoration.replace({
              widget: new LinkWidget(text, url),
            }).range(from, to),
          );
        }
      }

      // --- 画像: ![alt](url) ---
      if (node.name === "Image") {
        const range = safeRange(state, node.from, node.to);
        if (!range) return;
        const from = range.from;
        const to = range.to;
        if (isCursorInRange(state, from, to)) return;

        const fullText = state.doc.sliceString(from, to);
        const match = fullText.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (match) {
          const alt = match[1];
          const src = match[2];

          // マークダウン記法全体を置換してプレビュー表示
          decorations.push(
            Decoration.replace({
              widget: new ImagePreviewWidget(src, alt),
            }).range(from, to),
          );
        }
      }
    },
  });

  return Decoration.set(decorations, true);
}

export const linkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: { state: EditorState }) {
      this.decorations = buildLinkDecorations(view.state);
    }

    update(update: ViewUpdate) {
      // IME入力中はデコレーション再構築をスキップ
      if (update.view.composing) return;
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLinkDecorations(update.state);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
