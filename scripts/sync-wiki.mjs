#!/usr/bin/env node
// sync-wiki.mjs
// docs/wiki/en/*.md と docs/wiki/ja/*.md を site/src/content/docs/{en,ja}/ にコピーし、
// Starlight 互換の frontmatter (title, description) を自動付与するスクリプト。
// docs/images/aphelion-logo.png も site/src/assets/logo.png に同期する。
// Node.js 20+ ESM。外部依存なし。

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// リポジトリルートを基準にパスを解決
const REPO_ROOT = path.resolve(__dirname, '..');
const WIKI_DIR = path.join(REPO_ROOT, 'docs', 'wiki');
const DOCS_DIR = path.join(REPO_ROOT, 'site', 'src', 'content', 'docs');
const LOGO_SRC = path.join(REPO_ROOT, 'docs', 'images', 'aphelion-logo.png');
const LOGO_DEST = path.join(REPO_ROOT, 'site', 'src', 'assets', 'logo.png');

/**
 * ファイル先頭の frontmatter ブロック (---\n...\n---) を抽出する。
 * @param {string} content ファイル全文
 * @returns {{ frontmatter: Record<string, string>, body: string }}
 */
function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const rawFm = match[1];
  const body = match[2];
  /** @type {Record<string, string>} */
  const frontmatter = {};
  for (const line of rawFm.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      frontmatter[kv[1].trim()] = kv[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return { frontmatter, body };
}

/**
 * 本文から H1 タイトル行を抽出する。
 * 最初の `# タイトル` 行を返す。見つからない場合は null。
 * @param {string} body
 * @returns {string | null}
 */
function extractTitle(body) {
  for (const line of body.split('\n')) {
    const match = line.match(/^#\s+(.+)$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * 本文から最初の説明段落を抽出する (140文字以内に切る)。
 * 引用行 (> ) やメタデータ行を飛ばし、通常の散文行を優先する。
 * 通常行が見つからない場合は引用行にフォールバック。
 * @param {string} body
 * @returns {string}
 */
function extractDescription(body) {
  /** @type {string | null} */
  let fallback = null;

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    // 空行・H1-H6・コードブロック・HTML コメント開始・区切り線はスキップ
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('```') ||
      trimmed.startsWith('<!--') ||
      /^-{3,}$/.test(trimmed) ||
      /^\|/.test(trimmed) // テーブル行もスキップ
    ) {
      continue;
    }
    // 引用行 (> で始まる) はフォールバック候補として保持
    if (trimmed.startsWith('>')) {
      if (!fallback) {
        const cleaned = trimmed.replace(/^>\s*(\*\*[^*]+\*\*:\s*)?/, '').trim();
        if (cleaned) fallback = cleaned.slice(0, 140);
      }
      continue;
    }
    // 通常の散文行: そのまま採用
    return trimmed.slice(0, 140);
  }
  return fallback ?? '';
}

/**
 * ファイル名をスラッグ化する (kebab-case 小文字)。
 * 例: Getting-Started.md → getting-started.md
 * @param {string} filename 拡張子を含むファイル名
 * @returns {string}
 */
function slugify(filename) {
  return filename.toLowerCase();
}

/**
 * Markdown 内の相対リンクを Starlight のルーティング形式に書き換える。
 * - `./Foo-Bar.md` → `./foo-bar/`
 * - `./Foo-Bar.md#anchor` → `./foo-bar/#anchor`
 * - `../en/Foo.md` → `../en/foo/`
 * - 絶対 URL (http:// / https:// / mailto:) や image 参照 (!\[...]) は対象外。
 * Starlight はファイル名を lowercase kebab-case でスラッグ化するため揃える。
 * @param {string} body
 * @returns {string}
 */
function rewriteLinks(body) {
  // マッチ: `](<prefix><filename>.md<optional #anchor>)`
  // prefix はオプションで `./` `../` `../en/` `../ja/` 等
  // filename は英数字とハイフンのみを対象 (外部URLの誤マッチを避ける)
  const re = /\]\(((?:\.{1,2}\/)+(?:(?:en|ja)\/)?)([A-Za-z][A-Za-z0-9-]*)\.md(#[^)]+)?\)/g;
  return body.replace(re, (_, prefix, name, anchor) => {
    const slug = name.toLowerCase();
    return `](${prefix}${slug}/${anchor ?? ''})`;
  });
}

/**
 * 本文から H1 タイトル行を削除する (frontmatter の title と重複するため)。
 * 最初の `# タイトル` 行のみ削除。
 * @param {string} body
 * @returns {string}
 */
function removeH1(body) {
  const lines = body.split('\n');
  let removed = false;
  const result = [];
  for (const line of lines) {
    if (!removed && /^#\s+.+$/.test(line)) {
      removed = true;
      // H1 の次の空行も除去 (見た目整理)
      continue;
    }
    result.push(line);
  }
  // 先頭の余分な空行を取り除く
  while (result.length > 0 && result[0].trim() === '') {
    result.shift();
  }
  return result.join('\n');
}

/**
 * frontmatter オブジェクトを YAML 文字列にシリアライズする。
 * 値に : や ' が含まれる場合はダブルクォートで囲む。
 * @param {Record<string, string>} fm
 * @returns {string}
 */
function serializeFrontmatter(fm) {
  const lines = [];
  for (const [key, value] of Object.entries(fm)) {
    // 特殊文字を含む場合はクォート
    if (/[:"'#[\]{}|>*!&%@`]/.test(value) || value.includes('\n')) {
      const escaped = value.replace(/"/g, '\\"');
      lines.push(`${key}: "${escaped}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * 1ファイルを処理し、出力先に書き出す。
 * @param {string} srcPath 入力ファイルのフルパス
 * @param {string} destPath 出力ファイルのフルパス
 */
function processFile(srcPath, destPath) {
  const raw = fs.readFileSync(srcPath, 'utf-8');
  const { frontmatter, body } = extractFrontmatter(raw);

  // title と description を補完
  if (!frontmatter.title) {
    const title = extractTitle(body);
    if (title) {
      frontmatter.title = title;
    } else {
      // ファイル名からフォールバック
      const baseName = path.basename(srcPath, '.md');
      frontmatter.title = baseName.replace(/-/g, ' ');
    }
  }
  if (!frontmatter.description) {
    const desc = extractDescription(body);
    if (desc) {
      frontmatter.description = desc;
    }
  }

  // H1 タイトル行を本文から削除 (frontmatter.title と重複するため)
  // リンクを Starlight 形式 (kebab-case, .md 除去, 末尾スラッシュ) に書き換え
  const cleanedBody = rewriteLinks(removeH1(body));

  // frontmatter ブロックを先頭に付与して結合
  const output = `---\n${serializeFrontmatter(frontmatter)}\n---\n\n${cleanedBody}`;

  fs.writeFileSync(destPath, output, 'utf-8');
  console.log(`  synced: ${path.relative(REPO_ROOT, srcPath)} → ${path.relative(REPO_ROOT, destPath)}`);
}

/**
 * ロゴ画像を docs/images/aphelion-logo.png から site/src/assets/logo.png にコピーする。
 * Starlight 側のロゴと SSOT を一致させるため、毎ビルド時に上書きする。
 */
function syncLogo() {
  if (!fs.existsSync(LOGO_SRC)) {
    console.warn(`warn: logo source not found: ${LOGO_SRC}`);
    return;
  }
  fs.mkdirSync(path.dirname(LOGO_DEST), { recursive: true });
  fs.copyFileSync(LOGO_SRC, LOGO_DEST);
  console.log(`\n[logo] ${path.relative(REPO_ROOT, LOGO_SRC)} → ${path.relative(REPO_ROOT, LOGO_DEST)}`);
}

/**
 * メイン処理: docs/wiki/{locale}/*.md をすべて処理して site/src/content/docs/{locale}/ に出力する。
 */
function main() {
  syncLogo();

  const locales = ['en', 'ja'];

  for (const locale of locales) {
    const srcDir = path.join(WIKI_DIR, locale);
    const destDir = path.join(DOCS_DIR, locale);

    if (!fs.existsSync(srcDir)) {
      console.warn(`warn: source directory not found: ${srcDir}`);
      continue;
    }

    // 出力ディレクトリ作成 (存在しない場合)
    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.md'));
    console.log(`\n[${locale}] ${files.length} files found in ${path.relative(REPO_ROOT, srcDir)}`);

    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destFile = slugify(file);
      const destPath = path.join(destDir, destFile);
      processFile(srcPath, destPath);
    }
  }

  console.log('\nsync-wiki: done.');
}

main();
