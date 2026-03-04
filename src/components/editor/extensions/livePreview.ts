import type { Extension } from "@codemirror/state";
import { livePreviewBaseTheme } from "./utils";
import { headingPlugin } from "./headingWidget";
import { emphasisPlugin } from "./emphasisWidget";
import { linkPlugin } from "./linkWidget";
import { codeBlockPlugin } from "./codeBlock";
import { listPlugin } from "./listWidget";

/**
 * Live Preview 全拡張をまとめて返す
 *
 * Obsidian風のインラインレンダリング:
 * - カーソルが離れた行: マークダウン記法を隠し、レンダリング結果を表示
 * - カーソルがある行: 生のマークダウン記法を表示（編集可能）
 */
export function livePreviewExtensions(): Extension[] {
  return [
    // ベーステーマ（CSSクラス定義）
    livePreviewBaseTheme,

    // 各Live Previewプラグイン
    headingPlugin,
    emphasisPlugin,
    linkPlugin,
    codeBlockPlugin,
    listPlugin,
  ];
}
