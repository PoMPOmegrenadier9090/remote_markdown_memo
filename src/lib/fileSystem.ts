import { promises as fs } from "fs";
import path from "path";
import type { FileEntry } from "@/types";

/**
 * ローカルファイルシステム操作ライブラリ
 * Docker Volume上のworkspaceディレクトリを操作する
 */

const WORKSPACE_PATH = process.env.WORKSPACE_PATH ?? path.join(process.cwd(), "workspace");

/** ワークスペースの絶対パスを取得 */
function resolveWorkspacePath(relativePath: string): string {
  const base = path.resolve(WORKSPACE_PATH);
  const resolved = path.resolve(WORKSPACE_PATH, relativePath);
  // パストラバーサル防止（prefix collision 対策で path.sep を追加）
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new FileSystemError("INVALID_PATH", "Invalid file path");
  }
  return resolved;
}

/** カスタムエラークラス */
export class FileSystemError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "FileSystemError";
  }
}

/**
 * ワークスペースディレクトリの存在を確認し、なければ作成
 */
export async function ensureWorkspace(): Promise<void> {
  try {
    await fs.access(WORKSPACE_PATH);
  } catch {
    await fs.mkdir(WORKSPACE_PATH, { recursive: true });
  }
}

/**
 * ディレクトリを再帰的に走査してファイルツリーを構築
 */
export async function getFileTree(relativePath: string = ""): Promise<FileEntry[]> {
  await ensureWorkspace();
  const absPath = resolveWorkspacePath(relativePath);

  try {
    const entries = await fs.readdir(absPath, { withFileTypes: true });
    const result: FileEntry[] = [];

    // アルファベット順にソート（ディレクトリ優先）
    const sorted = entries
      .filter((e) => !e.name.startsWith(".")) // 隠しファイルを除外
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (const entry of sorted) {
      const entryRelativePath = relativePath
        ? `${relativePath}/${entry.name}`
        : entry.name;

      if (entry.isDirectory()) {
        const children = await getFileTree(entryRelativePath);
        result.push({
          path: entryRelativePath,
          name: entry.name,
          type: "directory",
          children,
        });
      } else if (entry.name.endsWith(".md")) {
        // マークダウンファイルのみ対象
        result.push({
          path: entryRelativePath,
          name: entry.name,
          type: "file",
        });
      }
    }

    return result;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * ファイルの内容を読み取る
 */
export async function readFile(relativePath: string): Promise<string> {
  const absPath = resolveWorkspacePath(relativePath);

  try {
    return await fs.readFile(absPath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new FileSystemError("NOT_FOUND", `File not found: ${relativePath}`);
    }
    throw err;
  }
}

/**
 * ファイルの内容を書き込む（既存ファイルの更新）
 */
export async function writeFile(relativePath: string, content: string): Promise<void> {
  const absPath = resolveWorkspacePath(relativePath);

  // 親ディレクトリが存在しなければ作成
  const dir = path.dirname(absPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(absPath, content, "utf-8");
}

/**
 * 新規ファイルを作成（既に存在する場合はエラー）
 */
export async function createFile(relativePath: string, content: string = ""): Promise<void> {
  const absPath = resolveWorkspacePath(relativePath);

  // 既存ファイルチェック
  try {
    await fs.access(absPath);
    throw new FileSystemError("ALREADY_EXISTS", `File already exists: ${relativePath}`);
  } catch (err) {
    if (err instanceof FileSystemError) throw err;
    // ENOENT = ファイルが存在しない → OK
  }

  // 親ディレクトリ作成
  const dir = path.dirname(absPath);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(absPath, content, "utf-8");
}

/**
 * 新規ディレクトリを作成
 */
export async function createDirectory(relativePath: string): Promise<void> {
  const absPath = resolveWorkspacePath(relativePath);
  await fs.mkdir(absPath, { recursive: true });
}

/**
 * ファイルまたはディレクトリを削除
 */
export async function deleteEntry(relativePath: string): Promise<void> {
  const absPath = resolveWorkspacePath(relativePath);

  try {
    const stat = await fs.stat(absPath);
    if (stat.isDirectory()) {
      await fs.rm(absPath, { recursive: true });
    } else {
      await fs.unlink(absPath);
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new FileSystemError("NOT_FOUND", `Entry not found: ${relativePath}`);
    }
    throw err;
  }
}

/**
 * ファイルまたはディレクトリをリネーム
 */
export async function renameEntry(oldPath: string, newPath: string): Promise<void> {
  const absOld = resolveWorkspacePath(oldPath);
  const absNew = resolveWorkspacePath(newPath);

  // 移動先の親ディレクトリを確保
  const newDir = path.dirname(absNew);
  await fs.mkdir(newDir, { recursive: true });

  try {
    await fs.rename(absOld, absNew);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new FileSystemError("NOT_FOUND", `Entry not found: ${oldPath}`);
    }
    throw err;
  }
}

/**
 * ファイルのメタデータを取得
 */
export async function getFileStat(relativePath: string) {
  const absPath = resolveWorkspacePath(relativePath);

  try {
    const stat = await fs.stat(absPath);
    return {
      size: stat.size,
      modifiedTime: stat.mtime.toISOString(),
      createdTime: stat.birthtime.toISOString(),
      isDirectory: stat.isDirectory(),
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new FileSystemError("NOT_FOUND", `Entry not found: ${relativePath}`);
    }
    throw err;
  }
}
