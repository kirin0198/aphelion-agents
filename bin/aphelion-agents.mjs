#!/usr/bin/env node
// aphelion-agents CLI
// zero-dependency: Node 標準ライブラリのみ使用 (node:fs/promises, node:path, node:os, node:url, node:https)
// 配布方式: npx github:kirin0198/aphelion-agents <command>

import { cp, access, readFile, writeFile, chmod, readdir, unlink, constants } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { request } from "node:https";

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
// (詳細: docs/design-notes/archived/claude-rules-isolation.md, ADR-001)
// settings.local.json も同様に src/.claude/ を canonical とする (#31, gitignore 衝突回避)。
const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(packageRoot, ".claude");
const rulesSourcePath = join(packageRoot, "src", ".claude", "rules");
const settingsLocalSourcePath = join(packageRoot, "src", ".claude", "settings.local.json");
// hooks MVP (#107): settings.json template and hooks/ canonical path
const settingsSourcePath = join(packageRoot, "src", ".claude", "settings.json");
const hooksSourcePath = join(packageRoot, "src", ".claude", "hooks");

// Aphelion 管理 hook entry を識別するためのマーカー文字列 (#114)
// command フィールドにこの文字列が含まれる entry を Aphelion 管理対象とみなす。
const APHELION_HOOK_MARKER = "aphelion-";

// 配布マニフェスト (#202, #207)
// 前回の init / update で「Aphelion が配布したファイル」と「Aphelion が知っていた
// hook スクリプト」を記録する。次回の update はこれと現在の配布物を突き合わせて
//   - upstream から撤去されたファイル (orphan) を検出し (#207)
//   - ユーザーが settings.json から削除した hook entry を復活させない (#202)
// ようにする。ターゲット側の状態ファイルであり、ソースツリーには存在しない。
const MANIFEST_NAME = ".aphelion-manifest.json";
const MANIFEST_VERSION = 1;

// このリポジトリ専用の dogfooding hook (#197)。
// src/.claude/hooks/ に置かれているが配布対象外 — 各スクリプトのヘッダーが
// "NOT shipped via bin/init" と宣言しており、settings.json テンプレートにも
// 登録が無いため、配布しても inert なファイルがユーザー環境に増えるだけになる。
// 既に配布済みの環境では、マニフェスト突合により orphan として報告される (#207)。
const DOGFOODING_HOOKS = new Set([
  "aphelion-md-sync.sh",
  "aphelion-agent-count-check.sh",
  "aphelion-task-md-lifecycle.sh",
]);

// マニフェスト導入 (0.3.9) より前に配布され、その後 upstream から撤去されたファイル。
// 旧バージョンでインストールしたユーザーにはマニフェストが無く orphan を機械的に
// 検出できないため、既知の撤去済みファイルだけは明示リストで拾う (#207)。
// マニフェストが行き渡った後は、このリストに追記する必要はない。
const LEGACY_REMOVED_FILES = [
  "commands/pm.md", // 77f1e47 で撤去 (#55 / #67) — undocumented な delivery-flow alias として残存
  // 0.3.13 以前は dogfooding hook も配布されていた (#197)。inert だが実行ビット付きで残る。
  "hooks/aphelion-md-sync.sh",
  "hooks/aphelion-agent-count-check.sh",
  "hooks/aphelion-task-md-lifecycle.sh",
];

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

// hooks/ 配下の .sh ファイルに実行権限 (0755) を付与する (#107, R8 mitigation)
// Windows 経由の git clone で実行ビットが落ちることがあるため、init / update の両方で実行する。
async function chmodHooks(hooksDir) {
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // ディレクトリ不在は silent skip
    }
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(p);
      } else if (entry.name.endsWith(".sh")) {
        await chmod(p, 0o755);
      }
    }
  }
  await walk(hooksDir);
}

// ディレクトリ配下のファイルを再帰列挙し、prefix 付きの相対パス (posix 区切り) を返す。
// 配布マニフェストの生成に使う (#207)。
async function listFilesRecursive(dir, prefix = "") {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out; // ディレクトリ不在は silent skip (配布物が欠けているだけ)
  }
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(join(dir, entry.name), rel)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

// 今回の実行で配布するファイルの一覧 (ターゲット .claude/ からの相対パス) を作る (#207)。
// settings.json / settings.local.json はユーザー所有 (マージ・保護対象) なので含めない。
async function collectDistributedFiles() {
  const files = [];
  for (const rel of await listFilesRecursive(sourcePath)) {
    if (rel === "settings.json" || rel === "settings.local.json") continue;
    files.push(rel);
  }
  for (const rel of await listFilesRecursive(rulesSourcePath)) {
    files.push(`rules/${rel}`);
  }
  for (const rel of await listFilesRecursive(hooksSourcePath)) {
    if (DOGFOODING_HOOKS.has(rel)) continue; // 配布対象外 (#197)
    files.push(`hooks/${rel}`);
  }
  return files.sort();
}

// テンプレート entry の command から hook スクリプト名 (basename) を取り出す。
// 例: "${CLAUDE_PROJECT_DIR}/.claude/hooks/aphelion-secrets-precommit.sh"
//     → "aphelion-secrets-precommit.sh"
function hookScriptNames(entry) {
  return (entry.hooks ?? [])
    .map((h) => h.command ?? "")
    .filter((c) => c.includes(APHELION_HOOK_MARKER))
    .map((c) => c.split("/").pop());
}

// 配布マニフェストを読む。存在しない / 壊れている場合は null (= 前回情報なし)。
async function readManifest(targetPath) {
  const p = join(targetPath, MANIFEST_NAME);
  if (!(await exists(p))) return null;
  try {
    const parsed = JSON.parse(await readFile(p, "utf-8"));
    if (parsed?.manifestVersion !== MANIFEST_VERSION) return null;
    return parsed;
  } catch {
    return null; // 壊れたマニフェストは「無い」ものとして扱う (fail-safe)
  }
}

// 配布マニフェストを書き出す。
async function writeManifest(targetPath, { files, hooks, pendingOrphans = [], version }) {
  const body = {
    manifestVersion: MANIFEST_VERSION,
    aphelionVersion: version,
    _comment:
      "Generated by aphelion-agents init/update. Tracks distributed files (orphan detection) " +
      "and known hook scripts (so removing a hook entry from settings.json survives update). " +
      "Do not edit by hand; deleting it only disables those two behaviours.",
    files,
    hooks,
    pendingOrphans,
  };
  await writeFile(join(targetPath, MANIFEST_NAME), JSON.stringify(body, null, 2) + "\n");
}

// settings.json を既存ファイルにマージする (#114)
// - 既存ファイルなし: テンプレートをそのまま書き込み → { action: "created" }
// - 既存ファイルあり: Aphelion 管理 entry を削除 → template entry を末尾追記 → { action: "merged" }
// - JSON parse 失敗: skip + warn → { action: "skipped_parse_error", error: <message> }
// init / update 双方で呼び出す共通ヘルパー。
// prevHooks は前回実行時にマニフェストへ記録した「Aphelion が知っていた hook
// スクリプト名」(event → [basename])。これがあると、ユーザーが settings.json から
// 削除した entry を復活させずに済む (#202)。null (マニフェスト無し) の場合は
// 旧来どおり template を全て導入する。
async function mergeSettingsJson(existingPath, templatePath, prevHooks = null) {
  // 1. template を読み込み
  const templateRaw = await readFile(templatePath, "utf-8");
  const template = JSON.parse(templateRaw);

  // template が提供する hook スクリプト一覧 (event → [basename])。
  // 導入可否に関わらず「Aphelion が知っている」集合としてマニフェストに記録する。
  const knownHooks = {};
  for (const eventName of Object.keys(template.hooks ?? {})) {
    knownHooks[eventName] = (template.hooks[eventName] ?? []).flatMap(hookScriptNames);
  }

  // 2. 既存ファイルを読み込み (なければ template をそのまま書く)
  if (!(await exists(existingPath))) {
    await writeFile(existingPath, templateRaw);
    return { action: "created", knownHooks, disabled: [] };
  }

  let existing;
  try {
    existing = JSON.parse(await readFile(existingPath, "utf-8"));
  } catch (err) {
    // JSON parse 失敗: 安全側にフォールバック (skip + warn)
    return { action: "skipped_parse_error", error: err.message, knownHooks: prevHooks, disabled: [] };
  }

  // 3. hooks フィールドが無ければ作成
  existing.hooks ??= {};

  // 4. PreToolUse / PostToolUse / SessionStart 等の各 event を template からマージ
  const disabled = [];
  for (const eventName of Object.keys(template.hooks ?? {})) {
    const templateEntries = template.hooks[eventName] ?? [];
    const existingEntries = existing.hooks[eventName] ?? [];

    // 既存配列を「Aphelion 管理」と「ユーザー所有」に分割する。
    // ユーザー所有 entry は順序を含めてそのまま残す。
    const userEntries = [];
    const presentScripts = new Set();
    for (const entry of existingEntries) {
      const scripts = hookScriptNames(entry);
      if (scripts.length === 0) {
        userEntries.push(entry);
      } else {
        scripts.forEach((s) => presentScripts.add(s));
      }
    }

    // 前回 Aphelion が知っていたスクリプト集合。null = マニフェスト無し (初回)。
    const known = prevHooks ? new Set(prevHooks[eventName] ?? []) : null;

    const installEntries = [];
    for (const entry of templateEntries) {
      const scripts = hookScriptNames(entry);
      // マーカーを含まない template entry は常に導入する (将来の拡張用)
      if (scripts.length === 0) {
        installEntries.push(entry);
        continue;
      }
      const isPresent = scripts.some((s) => presentScripts.has(s));
      // 前回も知っていて、今 settings.json に無い → ユーザーが削除した (tombstone)
      const isUserRemoved = known !== null && !isPresent && scripts.every((s) => known.has(s));
      if (isUserRemoved) {
        disabled.push({ event: eventName, scripts });
        continue;
      }
      installEntries.push(entry);
    }

    existing.hooks[eventName] = [...userEntries, ...installEntries];
    if (existing.hooks[eventName].length === 0) {
      delete existing.hooks[eventName];
    }
  }

  // 5. 書き戻し (indent 2, LF, 末尾改行 1 個)
  await writeFile(existingPath, JSON.stringify(existing, null, 2) + "\n");
  return { action: "merged", knownHooks, disabled };
}

// mergeSettingsJson の戻り値を元にユーザー向けメッセージを出力する (#114)
function reportMergeResult(result) {
  switch (result.action) {
    case "created":
      ok("settings.json (hooks template) を初期配置しました。");
      break;
    case "merged":
      ok("settings.json に Aphelion hooks をマージしました。");
      break;
    case "skipped_parse_error":
      warn(
        "既存 .claude/settings.json の JSON 解析に失敗したため Aphelion hooks の追加をスキップしました。" +
        `手動でマージしてください。(詳細: ${result.error}) ` +
        "参考: https://github.com/kirin0198/aphelion-agents/blob/main/src/.claude/settings.json"
      );
      break;
    default:
      warn(`settings.json の処理で不明な結果が返されました: ${result.action}`);
  }
  // ユーザーが削除した hook を復活させなかったことを明示する (#202)
  for (const d of result.disabled ?? []) {
    ok(
      `${d.scripts.join(", ")} (${d.event}) は settings.json から削除されているため再追加しませんでした。` +
      "再度有効にするには settings.json にエントリを戻すか、init --force を実行してください。"
    );
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

// GitHub main ブランチの package.json からリモートバージョンを取得する
// キャッシュ陳腐化検知 (Approach B: advisory-only) のために cmdUpdate() が使用する。
// ネットワーク不可・タイムアウト・非200・JSONパース失敗のいずれでも null を返す (silent skip)。
const REMOTE_PKG_URL =
  "https://raw.githubusercontent.com/kirin0198/aphelion-agents/main/package.json";

async function fetchRemoteVersion() {
  return new Promise((resolve) => {
    const req = request(
      REMOTE_PKG_URL,
      {
        headers: { "User-Agent": "aphelion-agents-cli" },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume(); // データを消費してソケットを解放
          resolve(null);
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const pkg = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
            const ver = typeof pkg.version === "string" ? pkg.version : null;
            resolve(ver ? { version: ver } : null);
          } catch {
            resolve(null);
          }
        });
        res.on("error", () => resolve(null));
      },
    );
    // タイムアウト: 3000ms で強制破棄
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

// ヘルプテキストを表示
function showHelp() {
  console.log(`
使い方: npx github:kirin0198/aphelion-agents <command> [options]

コマンド:
  init            カレントディレクトリに .claude/ を新規配置する
  init --user     ~/.claude/ (ユーザーホーム) に新規配置する
  update          カレントディレクトリの .claude/ を最新に更新する
                  (更新: agents/, rules/, commands/, templates/, orchestrator-rules.md, hooks/。
                   settings.json: Aphelion hooks をマージ (ユーザー設定と、ユーザーが
                   削除した Aphelion hook entry を保持)。
                   保護: settings.local.json は既存があれば上書きしない。
                   報告: upstream から撤去済みのファイルが残っていれば一覧表示する)
  update --user   ~/.claude/ を最新に更新する

オプション:
  --force         init 時に既存 .claude/ を強制上書きする
  --prune         update 時に、upstream から撤去済みのファイルを実際に削除する
                  (指定しない限り update はファイルを削除しない)
  --user          ターゲットをユーザーホーム (~/.claude/) に切り替える
  --version       バージョンを表示する
  --help          このヘルプを表示する

例:
  npx github:kirin0198/aphelion-agents init
  npx github:kirin0198/aphelion-agents init --user
  npx github:kirin0198/aphelion-agents update
  npx github:kirin0198/aphelion-agents update --prune
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
    // settings.json / settings.local.json は専用ロジックで処理するため cp から除外 (#114)
    await cp(sourcePath, targetPath, {
      recursive: true,
      force: true,
      filter: (src) => {
        if (src.endsWith("settings.json")) {
          return false; // mergeSettingsJson() で処理
        }
        if (src.endsWith("settings.local.json")) {
          return false; // 専用 cp で処理
        }
        return true;
      },
    });
    await cp(rulesSourcePath, join(targetPath, "rules"), {
      recursive: true,
      force: true,
    });
    // settings.local.json: deny-list テンプレートを配布 (#31)。init は新規配置なので上書き OK。
    await cp(settingsLocalSourcePath, join(targetPath, "settings.local.json"), {
      force: true,
    });
    // settings.json: 既存ファイルがあればマージ、なければ新規配置 (#114)
    const initMergeResult = await mergeSettingsJson(
      join(targetPath, "settings.json"),
      settingsSourcePath
    );
    reportMergeResult(initMergeResult);
    // hooks/: canonical 配布物を overlay copy し、実行ビットを付与 (#107, R8 mitigation)
    // dogfooding hook は除外する (#197)
    await cp(hooksSourcePath, join(targetPath, "hooks"), {
      recursive: true,
      force: true,
      filter: (src) => !DOGFOODING_HOOKS.has(src.split("/").pop()),
    });
    await chmodHooks(join(targetPath, "hooks"));
    // 配布マニフェストを記録 (#202, #207)
    await writeManifest(targetPath, {
      files: await collectDistributedFiles(),
      hooks: initMergeResult.knownHooks ?? {},
      version: await getVersion(),
    });
    ok(`.claude/ を ${targetPath} に配置しました。`);
  } catch (err) {
    fail(`コピーに失敗しました: ${err.message}`);
    process.exit(1);
  }
}

// 前回配布したが今回の配布物に含まれないファイル (orphan) を検出する (#207)。
// 候補 = 前回マニフェストの配布物 ∪ LEGACY_REMOVED_FILES。
// LEGACY 分を常に含めるのは、マニフェスト導入後の環境でも「導入時に prune しな
// かった旧ファイル」が二度と報告されなくなるのを防ぐため。
async function findOrphans(targetPath, manifest, currentFiles) {
  const currentSet = new Set(currentFiles);
  const candidates = [
    ...new Set([
      ...(manifest?.files ?? []),
      ...(manifest?.pendingOrphans ?? []),
      ...LEGACY_REMOVED_FILES,
    ]),
  ];
  const orphans = [];
  for (const rel of candidates) {
    if (currentSet.has(rel)) continue;
    if (await exists(join(targetPath, rel))) {
      orphans.push(rel);
    }
  }
  return orphans;
}

// orphan を報告する (prune=false) か削除する (prune=true)。
// 戻り値は「処理後もターゲットに残っている orphan」= 次回も報告すべきもの。
async function reconcileOrphans(targetPath, orphans, prune) {
  if (orphans.length === 0) return [];
  if (!prune) {
    warn(
      `upstream から撤去済みのファイルが ${orphans.length} 件残っています ` +
      "(古いコマンド / エージェント / フックがセッションに現れる原因になります):"
    );
    for (const rel of orphans) {
      console.error(`    .claude/${rel}`);
    }
    console.error("  削除するには: npx github:kirin0198/aphelion-agents update --prune");
    console.error("  (--prune を付けない限り、update がファイルを削除することはありません)");
    return orphans; // 未解決 — 次回の update でも報告する
  }
  const remaining = [];
  for (const rel of orphans) {
    try {
      await unlink(join(targetPath, rel));
      ok(`削除しました: .claude/${rel} (upstream から撤去済み)`);
    } catch (err) {
      warn(`削除に失敗しました: .claude/${rel} (${err.message})`);
      remaining.push(rel);
    }
  }
  return remaining;
}

// update コマンド: ターゲットの .claude/ を最新に更新する
// settings.local.json は既存がある場合のみ保護 (上書きしない)
async function cmdUpdate(targetPath, prune = false) {
  // キャッシュ陳腐化検知 (Approach B): 更新処理開始前にリモートバージョンを非同期取得する。
  // 失敗しても更新フローはブロックしない (null = skip)。
  const remoteResult = await fetchRemoteVersion().catch(() => null);

  const targetExists = await exists(targetPath);

  if (!targetExists) {
    fail(`${targetPath} が見つかりません。`);
    console.error("先に init コマンドで初期配置を行ってください。");
    process.exit(1);
  }

  // settings.local.json の保護: ターゲット側に既存ファイルがある場合のみスキップ
  const settingsLocalPath = join(targetPath, "settings.local.json");
  const hasSettingsLocal = await exists(settingsLocalPath);

  // settings.json: mergeSettingsJson() が直接書き込むため cp では常にスキップ (#114)
  const settingsPath = join(targetPath, "settings.json");

  // 前回の配布マニフェスト (#202, #207)。無い場合は null = 前回情報なし。
  const prevManifest = await readManifest(targetPath);

  try {
    // cp の filter で settings.local.json / settings.json を除外 (各々専用ロジックで処理)
    await cp(sourcePath, targetPath, {
      recursive: true,
      force: true,
      filter: (src) => {
        if (hasSettingsLocal && src.endsWith("settings.local.json")) {
          return false; // スキップ (既存を保護)
        }
        if (src.endsWith("settings.json")) {
          return false; // スキップ (mergeSettingsJson() で処理)
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
    // settings.json: 既存ファイルがあればマージ、なければ新規配置 (#114)
    // prevManifest.hooks を渡すことで、ユーザーが削除した entry を復活させない (#202)
    const updateMergeResult = await mergeSettingsJson(
      settingsPath,
      settingsSourcePath,
      prevManifest?.hooks ?? null
    );
    reportMergeResult(updateMergeResult);
    if (prevManifest === null) {
      console.error(
        "  注: 今回から .claude/.aphelion-manifest.json で配布状態を追跡します。" +
        "以降は settings.json から削除した Aphelion hook が update で復活しなくなります (#202)。"
      );
    }
    // hooks/: canonical 更新を毎回反映 (regex / バグ修正の配布のため overlay copy) (#107)
    // dogfooding hook は除外する (#197)
    await cp(hooksSourcePath, join(targetPath, "hooks"), {
      recursive: true,
      force: true,
      filter: (src) => !DOGFOODING_HOOKS.has(src.split("/").pop()),
    });
    await chmodHooks(join(targetPath, "hooks"));
    const version = await getVersion();
    // 撤去済みファイルの突合 (#207): 既定は報告のみ、--prune 指定時のみ削除する
    const currentFiles = await collectDistributedFiles();
    const pendingOrphans = await reconcileOrphans(
      targetPath,
      await findOrphans(targetPath, prevManifest, currentFiles),
      prune
    );
    // 配布マニフェストを更新 (#202, #207)
    // 未解決 orphan は pendingOrphans として持ち越し、次回の update でも報告する。
    await writeManifest(targetPath, {
      files: currentFiles,
      hooks: updateMergeResult.knownHooks ?? prevManifest?.hooks ?? {},
      pendingOrphans,
      version,
    });
    // キャッシュ陳腐化チェック: リモートバージョンとローカルバージョンを比較する。
    // remoteResult が null の場合はネットワーク不可など → silent skip (1行の情報メッセージのみ)。
    if (remoteResult === null) {
      console.error("バージョン確認をスキップしました (network unavailable)");
    } else if (remoteResult.version !== version) {
      // バージョン不一致 → キャッシュ陳腐化の可能性をアドバイスする (Approach B)
      warn(
        `新しいバージョンが利用可能です: aphelion-agents@${version} → ${remoteResult.version} (remote)`,
      );
      console.error("  現在のキャッシュには古い tarball が残っている可能性があります。");
      console.error("  最新版で再実行する場合:");
      console.error(
        "    npm cache clean --force && npx github:kirin0198/aphelion-agents#main update",
      );
      console.error("  （今回はキャッシュ済みバージョンで update を続行します）");
    }
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
  const prune = args.includes("--prune");

  // 不明なフラグの検出
  const knownFlags = new Set(["--user", "--force", "--prune", "--version", "--help"]);
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
      await cmdUpdate(targetPath, prune);
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
