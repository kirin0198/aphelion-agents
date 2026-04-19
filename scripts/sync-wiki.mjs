#!/usr/bin/env node
// sync-wiki.mjs
// docs/wiki/en/*.md と docs/wiki/ja/*.md を site/src/content/docs/{en,ja}/ にコピーし、
// Starlight 互換の frontmatter (title, description) を自動付与するスクリプト。
// docs/images/aphelion-logo.png も site/src/assets/logo.png に同期する。
// Node.js 22 標準ライブラリのみで動作。

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

// リポジトリ外 (wiki 外) のファイルへのリンクを置き換える先。GitHub blob URL。
// 優先順位: 1) 環境変数 APHELION_GITHUB_REPO_URL, 2) package.json の repository.url / homepage,
// 3) ハードコードのフォールバック値
const GITHUB_BLOB_BASE = resolveGithubBlobBase();

/**
 * GITHUB_BLOB_BASE を環境変数 / package.json / フォールバックの優先順で解決する。
 * @returns {string} blob URL (末尾スラッシュ付き)
 */
function resolveGithubBlobBase() {
  // 1) 環境変数
  const envUrl = process.env.APHELION_GITHUB_REPO_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  }

  // 2) package.json の repository.url または homepage
  const fallback = 'https://github.com/kirin0198/aphelion-agents/blob/main/';
  try {
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      // repository.url: "git+https://github.com/X/Y.git" 形式を変換
      const repoUrl = pkg?.repository?.url ?? pkg?.repository;
      if (typeof repoUrl === 'string') {
        const match = repoUrl.match(/github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?$/);
        if (match) {
          return `https://github.com/${match[1]}/blob/main/`;
        }
      }
      // homepage: "https://github.com/X/Y" 形式
      const homepage = pkg?.homepage;
      if (typeof homepage === 'string' && homepage.includes('github.com')) {
        const match = homepage.match(/github\.com\/([^/]+\/[^/]+)/);
        if (match) {
          return `https://github.com/${match[1]}/blob/main/`;
        }
      }
    }
  } catch (e) {
    console.warn(`warn: failed to parse package.json for repository URL: ${e.message}`);
  }

  // 3) フォールバック
  return fallback;
}

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
 * Markdown の強調記号・コードスパン・リンクを除去してプレーンテキスト化する。
 * SH-007: extractDescription の前処理として使用。
 * @param {string} str
 * @returns {string}
 */
function stripMarkdownInline(str) {
  return (
    str
      // [text](url) → text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // **text** / __text__ → text
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // *text* / _text_ → text
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // `text` → text
      .replace(/`([^`]+)`/g, '$1')
  );
}

/**
 * 本文から最初の説明段落を抽出する (140文字以内に切る)。
 * 引用行 (> ) やメタデータ行を飛ばし、通常の散文行を優先する。
 * 通常行が見つからない場合は引用行にフォールバック。
 * Markdown 強調記号・コードスパン・リンクは除去してから切り詰める。
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
        const cleaned = stripMarkdownInline(
          trimmed.replace(/^>\s*(\*\*[^*]+\*\*:\s*)?/, '').trim()
        );
        if (cleaned) {
          // SH-006: 単語境界で切り詰め
          const truncated = cleaned.slice(0, 140);
          fallback =
            cleaned.length > 140
              ? truncated.replace(/\s+\S*$/, '') + '…'
              : truncated;
        }
      }
      continue;
    }
    // SH-007: 強調記号を剥がしてから切り詰め
    const plain = stripMarkdownInline(trimmed);
    // SH-006: 単語境界で切り詰め
    const truncated = plain.slice(0, 140);
    return plain.length > 140
      ? truncated.replace(/\s+\S*$/, '') + '…'
      : truncated;
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
 * 出力は**絶対パス**にすることで、Astro が出力するディレクトリ型URL
 * (`/en/home/`) 配下でもリンクが正しく解決される (`./foo.md` のような相対
 * リンクは `/en/home/foo/` になって 404 となるため)。
 *
 * - 同一ロケール内: `./Foo.md` → `/{locale}/foo/`
 * - 言語切替: `../en/Foo.md` → `/en/foo/`、`../ja/Foo.md` → `/ja/foo/`
 * - wiki 外の .md (README.md / .claude/CLAUDE.md 等) → GitHub blob URL
 * - 外部 URL (http(s):// / mailto:) および画像 (![...]) は対象外。
 * @param {string} body
 * @param {'en' | 'ja'} locale 現在処理中のロケール
 * @returns {string}
 */
function rewriteLinks(body, locale) {
  // マッチ: `[text](path.md)` 形式のリンク。
  // `(?<!!)\]\(` の lookbehind は `]` 直前が `!` でないことを確認するが、
  // 画像構文 `![alt](./x.md)` では `]` 直前は alt テキストの末尾文字であり `!` ではない。
  // そのため lookbehind では画像を除外できない。代わりに callback 内で
  // マッチ開始位置の1文字前が `!` かどうかを確認して画像を skip する。
  // capture 1: リンクテキスト (画像判定に使用)
  // capture 2: 全パス (anchor / query 含む可能性あり)
  const re = /\[([^\]]*)\]\(([^)]+\.md(?:[?#][^)]+)?)\)/g;
  return body.replace(re, (whole, text, link, offset) => {
    // マッチ直前の文字が `!` なら画像リンク → 変換せずそのまま返す
    if (offset >= 1 && body[offset - 1] === '!') {
      return whole;
    }
    // 外部URL / アンカー単独 は対象外
    if (/^(https?:)?\/\//.test(link) || /^mailto:/.test(link) || link.startsWith('#')) {
      return whole;
    }

    // query string と anchor を分離 (.md?query#anchor の順を想定)
    const mdEndIdx = link.indexOf('.md') + 3; // .md の直後の位置
    const pathPart = link.slice(0, mdEndIdx);
    const suffix = link.slice(mdEndIdx); // ?query#anchor 等

    // query と anchor をそれぞれ抽出 (Starlight URL に anchor のみ引き継ぐ)
    const qMatch = suffix.match(/^\?([^#]*)/);
    const hMatch = suffix.match(/#(.+)$/);
    // query は Starlight のルーティングでは意味を持たないが、存在する場合は保持する
    const query = qMatch ? `?${qMatch[1]}` : '';
    const anchor = hMatch ? `#${hMatch[1]}` : '';

    // .md を剥がしてファイル名を小文字化 (kebab 正規化)
    // ファイル名パターンを緩和: 数字・アンダースコア・ドット・ハイフンを含む名前に対応
    const mdMatch = pathPart.match(/^(.*\/)?([A-Za-z0-9_.-]+)\.md$/);
    if (!mdMatch) return whole;
    const dir = mdMatch[1] ?? '';
    // kebab-case に正規化: 大文字を小文字化し、アンダースコア・スペース等をハイフンに変換
    const slug = mdMatch[2].toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // パターン判定
    // 1) 言語切替: ../en/X.md or ../ja/X.md
    const localeSwitch = dir.match(/(?:\.\.\/)+(en|ja)\/$/);
    if (localeSwitch) {
      return `[${text}](/${localeSwitch[1]}/${slug}/${query}${anchor})`;
    }

    // 2) 同一ディレクトリ (./X.md) or 暗黙同一 (X.md)
    if (dir === '' || dir === './') {
      return `[${text}](/${locale}/${slug}/${query}${anchor})`;
    }

    // 3) wiki 外の .md → GitHub blob URL (大文字小文字を保持)
    // 例: ../../.claude/CLAUDE.md → https://github.com/.../blob/main/.claude/CLAUDE.md
    const cleanedDir = dir.replace(/^(?:\.\.\/)+/, '');
    return `[${text}](${GITHUB_BLOB_BASE}${cleanedDir}${mdMatch[2]}.md${query}${anchor})`;
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
 * SH-005: \ / 改行 / タブ もエスケープする。
 * @param {Record<string, string>} fm
 * @returns {string}
 */
function serializeFrontmatter(fm) {
  const lines = [];
  for (const [key, value] of Object.entries(fm)) {
    // 特殊文字を含む場合はクォート
    if (/[:"'#[\]{}|>*!&%@`]/.test(value) || value.includes('\n') || value.includes('\\') || value.includes('\t')) {
      const escaped = value
        .replace(/\\/g, '\\\\') // \ → \\ (先にエスケープ)
        .replace(/"/g, '\\"')   // " → \"
        .replace(/\n/g, '\\n')  // 改行 → \n
        .replace(/\t/g, '\\t'); // タブ → \t
      lines.push(`${key}: "${escaped}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

/**
 * 1ファイルを処理し、出力先に書き出す。
 *
 * 冪等性: 本関数は入力が docs/wiki/** (frontmatter なし) であることを前提とする。
 * 同一入力を複数回処理しても出力は同一になる。
 *
 * @param {string} srcPath 入力ファイルのフルパス
 * @param {string} destPath 出力ファイルのフルパス
 * @param {'en' | 'ja'} locale 現在処理中のロケール
 */
function processFile(srcPath, destPath, locale) {
  try {
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
    // NI-005: template: splash の場合は description 自動生成をスキップ
    // (splash レイアウトは description フィールドを使用しないため)
    if (!frontmatter.description && frontmatter.template !== 'splash') {
      const desc = extractDescription(body);
      if (desc) {
        frontmatter.description = desc;
      }
    }

    // H1 タイトル行を本文から削除 (frontmatter.title と重複するため)
    // リンクを Starlight 形式 (絶対パス、kebab-case、.md 除去) に書き換え
    const cleanedBody = rewriteLinks(removeH1(body), locale);

    // frontmatter ブロックを先頭に付与して結合
    const output = `---\n${serializeFrontmatter(frontmatter)}\n---\n\n${cleanedBody}`;

    fs.writeFileSync(destPath, output, 'utf-8');
    console.log(`  synced: ${path.relative(REPO_ROOT, srcPath)} → ${path.relative(REPO_ROOT, destPath)}`);
  } catch (e) {
    throw new Error(`failed to process ${srcPath}: ${e.message}`, { cause: e });
  }
}

/**
 * ロゴ画像を docs/images/aphelion-logo.png から site/src/assets/logo.png にコピーする。
 * Starlight 側のロゴと SSOT を一致させるため、変更があった場合のみ上書きする。
 * NI-001: src と dest の mtime/size を比較し、同一ならスキップする。
 */
function syncLogo() {
  if (!fs.existsSync(LOGO_SRC)) {
    console.warn(`warn: logo source not found: ${LOGO_SRC}`);
    return;
  }
  fs.mkdirSync(path.dirname(LOGO_DEST), { recursive: true });

  const srcStat = fs.statSync(LOGO_SRC);
  const destStat = fs.existsSync(LOGO_DEST) ? fs.statSync(LOGO_DEST) : null;
  if (destStat && srcStat.size === destStat.size && srcStat.mtimeMs <= destStat.mtimeMs) {
    console.log(`\n[logo] unchanged: ${path.relative(REPO_ROOT, LOGO_SRC)} (skipped)`);
    return;
  }

  fs.copyFileSync(LOGO_SRC, LOGO_DEST);
  console.log(`\n[logo] ${path.relative(REPO_ROOT, LOGO_SRC)} → ${path.relative(REPO_ROOT, LOGO_DEST)}`);
}

/**
 * メイン処理: docs/wiki/{locale}/*.md をすべて処理して site/src/content/docs/{locale}/ に出力する。
 * SH-003: 同一ロケール内で slug の重複が検出された場合は即座にエラーとして終了する。
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

    // SH-003: slug 衝突を検知するための Set
    const slugsSeen = new Set();

    for (const file of files) {
      const destFile = slugify(file);

      // SH-003: 同一ロケール内で slug が重複していれば即失敗
      if (slugsSeen.has(destFile)) {
        throw new Error(
          `slug collision detected in locale "${locale}": "${file}" conflicts with an existing slug "${destFile}". ` +
          `Check for case-insensitive duplicates (e.g. Home.md and home.md).`
        );
      }
      slugsSeen.add(destFile);

      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, destFile);
      processFile(srcPath, destPath, /** @type {'en' | 'ja'} */ (locale));
    }
  }

  console.log('\nsync-wiki: done.');
}

// SH-004: トップレベルのエラーハンドリング
try {
  main();
} catch (e) {
  console.error(`sync-wiki failed: ${e.message}`);
  process.exit(1);
}
