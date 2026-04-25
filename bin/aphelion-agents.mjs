#!/usr/bin/env node
// aphelion-agents CLI
// zero-dependency: Node 標準ライブラリのみ使用 (node:fs/promises, node:path, node:os, node:url)
// 配布方式: npx github:kirin0198/aphelion-agents <command>

import { cp, access, readFile, constants } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// Node バージョンチェック (>=20 が必須)
const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajor < 20) {
  console.error(
    `エラー: Node.js 20 以上が必要です (現在のバージョン: ${process.versions.node})。`,
  );
  console.error("Node.js の更新方法: https://nodejs.org/");
  process.exit(1);
}

// パッケージルートとソースパスを解決
// bin/aphelion-agents.mjs → パッケージルート
// 二重ロード回避のため rules/ のみ src/.claude/rules/ から、
// agents/ commands/ orchestrator-rules.md は <packageRoot>/.claude/ から取得する
// (詳細: docs/issues/claude-rules-isolation.md, ADR-001)
// settings.local.json も同様に src/.claude/ を canonical とする (#31, gitignore 衝突回避)。
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(packageRoot, ".claude");
const rulesSourcePath = join(packageRoot, "src", ".claude", "rules");
const settingsLocalSourcePath = join(packageRoot, "src", ".claude", "settings.local.json");

// ユーザーへのメッセージ (ANSI カラー: 最小限の直書き)
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function ok(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function fail(msg) {
  console.error(`${RED}エラー:${RESET} ${msg}`);
}

function warn(msg) {
  console.warn(`${YELLOW}警告:${RESET} ${msg}`);
}

// ディレクトリまたはファイルが存在するか確認
async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// package.json からバージョンを読み込む
async function getVersion() {
  const pkgPath = join(packageRoot, "package.json");
  try {
    const raw = await readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(raw);
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

// ヘルプテキストを表示
function showHelp() {
  console.log(`
使い方: npx github:kirin0198/aphelion-agents <command> [options]

コマンド:
  init            カレントディレクトリに .claude/ を新規配置する
  init --user     ~/.claude/ (ユーザーホーム) に新規配置する
  update          カレントディレクトリの .claude/ を最新に更新する
                  (更新: agents/, rules/, commands/, orchestrator-rules.md。
                   保護: settings.local.json は既存があれば上書きしない)
  update --user   ~/.claude/ を最新に更新する

オプション:
  --force         init 時に既存 .claude/ を強制上書きする
  --user          ターゲットをユーザーホーム (~/.claude/) に切り替える
  --version       バージョンを表示する
  --help          このヘルプを表示する

例:
  npx github:kirin0198/aphelion-agents init
  npx github:kirin0198/aphelion-agents init --user
  npx github:kirin0198/aphelion-agents update
  npx github:kirin0198/aphelion-agents update --user
  `.trim());
}

// init コマンド: ターゲットに .claude/ を新規配置
async function cmdInit(targetPath, force) {
  const targetExists = await exists(targetPath);

  if (targetExists && !force) {
    fail(`${targetPath} は既に存在します。`);
    console.error("既存ディレクトリを保持したい場合は update を使用してください。");
    console.error("上書きするには --force を指定してください。");
    process.exit(1);
  }

  if (targetExists && force) {
    warn(`既存の ${targetPath} を上書きします (--force)。`);
  }

  try {
    await cp(sourcePath, targetPath, { recursive: true, force: true });
    await cp(rulesSourcePath, join(targetPath, "rules"), {
      recursive: true,
      force: true,
    });
    // settings.local.json: deny-list テンプレートを配布 (#31)。init は新規配置なので上書き OK。
    await cp(settingsLocalSourcePath, join(targetPath, "settings.local.json"), {
      force: true,
    });
    ok(`.claude/ を ${targetPath} に配置しました。`);
  } catch (err) {
    fail(`コピーに失敗しました: ${err.message}`);
    process.exit(1);
  }
}

// update コマンド: ターゲットの .claude/ を最新に更新する
// settings.local.json は既存がある場合のみ保護 (上書きしない)
async function cmdUpdate(targetPath) {
  const targetExists = await exists(targetPath);

  if (!targetExists) {
    fail(`${targetPath} が見つかりません。`);
    console.error("先に init コマンドで初期配置を行ってください。");
    process.exit(1);
  }

  // settings.local.json の保護: ターゲット側に既存ファイルがある場合のみスキップ
  const settingsLocalPath = join(targetPath, "settings.local.json");
  const hasSettingsLocal = await exists(settingsLocalPath);

  try {
    // Option A: cp の filter でsettings.local.json をスキップ (ターゲット既存の場合のみ)
    await cp(sourcePath, targetPath, {
      recursive: true,
      force: true,
      filter: (src) => {
        if (hasSettingsLocal && src.endsWith("settings.local.json")) {
          return false; // スキップ (既存を保護)
        }
        return true;
      },
    });
    // rules/ は src/.claude/rules/ から overlay (二重ロード回避のため repo root に置かない構造)
    await cp(rulesSourcePath, join(targetPath, "rules"), {
      recursive: true,
      force: true,
    });
    // settings.local.json: deny-list テンプレートを配布 (#31)。
    // 既存があれば保護し、無ければ初期テンプレートとして書き込む。
    if (!hasSettingsLocal) {
      await cp(settingsLocalSourcePath, settingsLocalPath, { force: true });
    }
    const version = await getVersion();
    ok(`.claude/ を ${targetPath} に更新しました (source: aphelion-agents@${version})。`);
    if (hasSettingsLocal) {
      ok("settings.local.json は保護されました (既存を保持)。");
    }
  } catch (err) {
    fail(`更新に失敗しました: ${err.message}`);
    process.exit(1);
  }
}

// メイン処理: argv パースとコマンド振り分け
async function main() {
  const args = process.argv.slice(2);

  // グローバルフラグを先にチェック
  if (args.includes("--version")) {
    const version = await getVersion();
    console.log(version);
    return;
  }

  if (args.includes("--help") || args.length === 0) {
    showHelp();
    return;
  }

  // コマンドとフラグを解析
  const command = args[0];
  const useUser = args.includes("--user");
  const force = args.includes("--force");

  // 不明なフラグの検出
  const knownFlags = new Set(["--user", "--force", "--version", "--help"]);
  const unknownFlags = args.slice(1).filter((a) => a.startsWith("--") && !knownFlags.has(a));
  if (unknownFlags.length > 0) {
    fail(`不明なオプション: ${unknownFlags.join(", ")}`);
    console.error("--help で使用法を確認してください。");
    process.exit(1);
  }

  // ターゲットパスを解決
  const targetBase = useUser ? homedir() : process.cwd();
  const targetPath = join(targetBase, ".claude");

  // コマンドを実行
  switch (command) {
    case "init":
      await cmdInit(targetPath, force);
      break;
    case "update":
      await cmdUpdate(targetPath);
      break;
    default:
      fail(`不明なコマンド: ${command}`);
      console.error("--help で使用法を確認してください。");
      process.exit(1);
  }
}

main().catch((err) => {
  fail(`予期しないエラーが発生しました: ${err.message}`);
  process.exit(1);
});
