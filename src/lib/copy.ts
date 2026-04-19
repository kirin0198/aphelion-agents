import fs, { type Dirent } from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

/** 上書き対象外のファイルパス (相対) */
const PROTECTED_FILES = ['.claude/settings.local.json'];

/**
 * ファイルが保護対象かどうかを確認する
 * @param destPath コピー先のフルパス
 * @param destBase コピー先ベースディレクトリ
 */
export function isProtectedFile(destPath: string, destBase: string): boolean {
  const rel = path.relative(destBase, destPath).replace(/\\/g, '/');
  return PROTECTED_FILES.some((p) => rel === p || rel.startsWith(`${p}/`));
}

export interface CopyOptions {
  /** true の場合、確認なしで上書き */
  force?: boolean;
  /** コピー先ベースディレクトリ (保護判定に使用) */
  destBase?: string;
}

/**
 * ソースディレクトリをデスティネーションへ再帰コピーする
 * @param src コピー元ディレクトリ
 * @param dest コピー先ディレクトリ
 * @param options コピーオプション
 */
export async function copyDir(src: string, dest: string, options: CopyOptions = {}): Promise<void> {
  const { destBase = dest } = options;

  await fsPromises.cp(src, dest, {
    recursive: true,
    filter: (srcFile: string, destFile: string) => {
      // 保護対象ファイルはスキップ
      if (isProtectedFile(destFile, destBase)) {
        return false;
      }
      return true;
    },
  });
}

/**
 * ファイルリストを再帰的に取得する
 * @param dir 対象ディレクトリ
 * @param base ベースディレクトリ (相対パス計算用)
 * @returns ベースからの相対パスの配列
 */
export async function listFiles(dir: string, base?: string): Promise<string[]> {
  const baseDir = base ?? dir;
  const results: string[] = [];

  let entries: Dirent[];
  try {
    entries = await fsPromises.readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await listFiles(fullPath, baseDir);
      results.push(...subFiles);
    } else {
      results.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
    }
  }

  return results;
}

/**
 * 2つのディレクトリの差分ファイルリストを取得する
 * @param srcDir ソースディレクトリ (パッケージ内)
 * @param destDir デスティネーションディレクトリ (プロジェクト内)
 * @returns 追加・変更・削除の差分情報
 */
export async function diffDirs(
  srcDir: string,
  destDir: string,
): Promise<{
  added: string[];
  modified: string[];
  removed: string[];
}> {
  const [srcFiles, destFiles] = await Promise.all([listFiles(srcDir), listFiles(destDir)]);

  const srcSet = new Set(srcFiles);
  const destSet = new Set(destFiles);

  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  for (const file of srcFiles) {
    if (!destSet.has(file)) {
      added.push(file);
    } else {
      // ファイルが両方に存在する場合は変更とみなす
      const srcContent = await fsPromises.readFile(path.join(srcDir, file));
      const destContent = await fsPromises.readFile(path.join(destDir, file));
      if (!srcContent.equals(destContent)) {
        modified.push(file);
      }
    }
  }

  for (const file of destFiles) {
    if (!srcSet.has(file)) {
      removed.push(file);
    }
  }

  return { added, modified, removed };
}
