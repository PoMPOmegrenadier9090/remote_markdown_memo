import { NextResponse } from "next/server";
import { getFileTree, createFile, createDirectory, FileSystemError } from "@/lib/fileSystem";

/** 許可するファイル拡張子 */
const ALLOWED_EXTENSIONS = [".md"];

/** ファイル拡張子を検証する */
function hasAllowedExtension(filePath: string): boolean {
  return ALLOWED_EXTENSIONS.some((ext) => filePath.toLowerCase().endsWith(ext));
}

/**
 * GET /api/files
 * ワークスペースのファイルツリーを取得
 */
export async function GET() {
  try {
    const tree = await getFileTree();
    return NextResponse.json({ data: tree });
  } catch (err) {
    console.error("Failed to get file tree:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get file tree" } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/files
 * 新規ファイルまたはディレクトリを作成
 *
 * Body: { path: string, type: "file" | "directory", content?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path: filePath, type, content } = body as {
      path: string;
      type: "file" | "directory";
      content?: string;
    };

    if (!filePath || !type) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "path and type are required" } },
        { status: 400 },
      );
    }

    if (type === "directory") {
      await createDirectory(filePath);
    } else {
      if (!hasAllowedExtension(filePath)) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "Only .md files are allowed" } },
          { status: 400 },
        );
      }
      await createFile(filePath, content ?? "");
    }

    return NextResponse.json({ data: { path: filePath, type } }, { status: 201 });
  } catch (err) {
    if (err instanceof FileSystemError) {
      const status = err.code === "ALREADY_EXISTS" ? 409 : 400;
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status },
      );
    }
    console.error("Failed to create entry:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create entry" } },
      { status: 500 },
    );
  }
}
