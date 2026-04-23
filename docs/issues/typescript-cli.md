# Phase 1 再策定: `npx github:...` + zero-deps `.mjs` による最小配布

> 最終更新: 2026-04-24
> 更新履歴:
>   - 2026-04-19: 初版作成 (旧方針: npm publish + TypeScript CLI)
>   - 2026-04-23: **npm publish 廃止、`npx github:...` + zero-deps `.mjs` に方針転換**。旧 Phase 1 実装 (TypeScript/tsup/cac/@clack/prompts/picocolors/vitest/biome) は全撤去。`init` / `update` の 2 コマンド体制を明文化。
>   - 2026-04-24: Phase 2 以降の候補セクションを削除 (必要になったタイミングで別 issue として改めて起票)。

---

## ユーザー要件 (再確認)

本 PR の目的は **2 つだけ** である。

1. **リポジトリに更新があった際の簡略化** — メンテナ側の更新反映が `git push` のみで完結すること
2. **プロジェクト / ユーザーディレクトリへの配置簡略化** — 利用者が 1 コマンドで `.claude/` を配置・更新できること

この 2 点を満たせば良く、それ以外 (npm registry への掲載、対話 UI、プラットフォーム切替、バージョンピン等) は**スコープ外**とする。

## Issue 分類

**Refactoring (方針転換)** — 既に PR `feat/typescript-cli` ブランチ上に実装済みの Phase 1 を**破棄・再策定**する。機能目的は不変だが、実装構成を大幅に簡素化する。

---

## 旧方針 (参考 / 却下): 4 解釈比較

> 以下は 2026-04-19 時点の analyst セッションで検討した解釈。判断経緯として残す。

| 解釈 | 内容 | 旧判定 | 2026-04-23 時点の評価 |
|------|------|--------|-----------------------|
| A | CLI 導入 + 既存スクリプトも同時に TS 化 | 不採用 (スコープ過大) | 変わらず不採用 |
| B | CLI のみ導入、既存 `.mjs` はそのまま | 見送り (update 不足) | 方向性は近いが TS/ビルド系が過剰 |
| **C** | **段階リリース: Phase 1 = TS CLI (init/update)、Phase 2 で統合** | **旧採用** | **撤回**。npm publish・TS・対話 UI いずれも目的に対し過剰 |
| D | テンプレートリポジトリ方式 (degit) | 不採用 | 変わらず不採用 (UX 保持困難) |

### 旧方針 C が破棄された理由

- **目的 1 (更新の簡略化) に反する**: `npm publish` はメンテナに「push + version bump + publish」の二重作業を強いる。Phase 1 では CI 自動化も無いため、手作業負担が増える。
- **目的 2 (配置簡略化) に対し過剰**: 対話 UI・プラットフォーム切替 (`--platform copilot/codex/all`) は「`.claude/` を置くだけ」という要件に対して機能過多。
- **ビルドチェーンが目的に見合わない**: `tsup` / `typescript` / `vitest` / `biome` / `cac` / `@clack/prompts` / `picocolors` の 7 依存は、実質的には「ファイルを `fs.cp` でコピーするだけ」の処理量に対し過大。
- **バージョンピン要件が無い**: 利用者側から「特定バージョンに固定したい」という要求は出ていない。必要になれば `npx github:kirin0198/aphelion-agents#vX.Y.Z` で対応可能。

---

## 新方針 (Phase 1 再策定 / 承認済み)

### 配布方式

- **`npx github:kirin0198/aphelion-agents <command>`** を唯一の公式導入経路とする
- **npm registry への publish は行わない** (`package.json` は `private: true`)
- 更新反映は **`git push` のみ** で完結 (メンテナ側の二重作業ゼロ)
- 利用者は常に `main` ブランチの最新を取得。バージョンピンが必要な場合のみ `#vX.Y.Z` 形式で tag 参照 (これは npm の仕組みではなく npx → GitHub の標準挙動)

### CLI 実装構成

- **zero-dependency の `.mjs` 単一ファイル** (`bin/aphelion-agents.mjs`)
- 使用モジュールは **Node 標準ライブラリのみ**
  - `node:fs/promises` (`cp`, `access`, `readdir` 等)
  - `node:path`
  - `node:os` (`homedir`)
  - `node:url` (`fileURLToPath`)
- 引数パースは `process.argv` を直接処理 (サードパーティ CLI フレームワーク不使用)
- **対話 UI なし**、**プラットフォーム切替なし**、**カラー出力ライブラリなし** (必要なら ANSI エスケープを直書き)
- TypeScript / tsup / biome / vitest / cac / @clack/prompts / picocolors は **全て削除**

### コマンド仕様

| Command | 動作 |
|---------|------|
| `npx github:kirin0198/aphelion-agents init` | カレントディレクトリに `.claude/` を新規配置。既にあればエラー終了 (`--force` で上書き許可) |
| `npx github:kirin0198/aphelion-agents init --user` | `~/.claude/` (ユーザーディレクトリ) に新規配置 |
| `npx github:kirin0198/aphelion-agents update` | カレントディレクトリの既存 `.claude/` を最新に更新。`settings.local.json` は既存があれば保護 (上書きしない) |
| `npx github:kirin0198/aphelion-agents update --user` | `~/.claude/` を同様に更新 |
| `npx github:kirin0198/aphelion-agents --version` | バージョン番号を表示 |
| `npx github:kirin0198/aphelion-agents --help` | 使用法を表示 |

> **`init` と `update` は別コマンド**であることをユーザーが明示的に要求している (初回配置と以降の更新で意味が異なるため、コマンド分離で意図を明確化)。

### 配置先の解決ロジック

- **デフォルト**: `process.cwd()/.claude/`
- **`--user` 指定時**: `os.homedir()/.claude/`

### 保護ファイル

- `update` 実行時、ターゲット側に `.claude/settings.local.json` が既に存在すればそのファイルのみコピーをスキップする (ユーザーローカル設定の保護)
- `init` ではそもそもターゲット側が存在しない前提 (存在すればエラー or `--force`)

### 前提条件

- **Node 20+** (Claude Code 利用者なら既に Node 入っている想定)
- **対象 OS**: macOS / Linux (Windows は現時点で対象外だが、将来対応する可能性があるため実装は `node:path` を使い OS 非依存に書いておくこと)

### 配布対象

- **`.claude/` のみ** (現 PR の `platforms/` (Copilot / Codex 用) は今回スコープ外)
- プラットフォーム切替機能が必要になったら別 issue で追加する

---

## 旧 PR からの差分 (developer 向け実装計画)

### 削除対象ファイル

```
tsconfig.json
tsup.config.ts
biome.json
vitest.config.ts
src/cli.ts
src/commands/init.ts
src/commands/update.ts
src/lib/copy.ts
src/lib/copy.test.ts
src/lib/sources.ts
src/lib/sources.test.ts
package-lock.json           # zero-deps のため不要
dist/                       # ビルド成果物。併せて .gitignore からも dist/ を削除
```

`src/` ディレクトリが空になるなら `src/` 自体も削除する。

### 追加対象ファイル

```
bin/aphelion-agents.mjs     # ~30〜50 行、zero-deps、shebang 付き、実行権限 0755
```

ファイル構造イメージ:

```
aphelion-agents/
├── bin/
│   └── aphelion-agents.mjs   # 新規 (shebang: #!/usr/bin/env node)
├── .claude/                   # 配布元 (変更なし)
├── platforms/                 # (変更なし、今回スコープ外)
├── scripts/                   # (変更なし)
├── docs/                      # (変更なし)
├── package.json               # 大幅簡素化
├── README.md                  # npx 節を新方針に書き換え
├── README.ja.md               # 同上
├── CHANGELOG.md               # 0.1.0 エントリを新方針に書き換え
├── LICENSE                    # (変更なし)
└── TASK.md                    # 新フェーズ向けテンプレートにリセット
```

### 修正対象ファイル

#### `package.json`

- **保持**: `name`, `version`, `description`, `license`, `author`, `repository`, `homepage`
- **変更**: `bin` を `{ "aphelion-agents": "./bin/aphelion-agents.mjs" }` に変更
- **変更**: `files` を `["bin", ".claude"]` に簡素化 (publish しないので厳密には不要だが、`npx github:` 経由でもサイズを抑える意味で残す。もしくは削除可)
- **変更**: `engines` は `{ "node": ">=20" }` を維持
- **追加**: `"private": true` (npm publish 禁止の意思表示)
- **削除**: `type: "module"` → **維持** (`.mjs` 拡張子なのでなくても動くが、明示のため残しても良い)。developer 判断。
- **削除**: `dependencies` フィールド全体
- **削除**: `devDependencies` フィールド全体
- **削除**: `scripts` のうち `build`, `test`, `lint`, `format`, `prepublishOnly`
- **保持**: `scripts` の `generate` (`node scripts/generate.mjs`), `sync-wiki` (`node scripts/sync-wiki.mjs`) — 既存スクリプトは別領域のため維持

#### `README.md` / `README.ja.md`

- 「Install via npx (recommended)」セクションを新コマンド形式に書き換え:
  ```bash
  # Initial install (into current project)
  npx github:kirin0198/aphelion-agents init

  # Install into user home (~/.claude/)
  npx github:kirin0198/aphelion-agents init --user

  # Update to latest
  npx github:kirin0198/aphelion-agents update
  npx github:kirin0198/aphelion-agents update --user
  ```
- `--platform copilot` / `--platform codex` / `--all` の記述を**削除** (機能自体が無い)
- 「既存の `cp -r` / `git clone` 手順」節は**維持** (破壊的変更を避けるため)

#### `docs/wiki/en/Getting-Started.md` / `docs/wiki/ja/Getting-Started.md`

README と同様に npx 節を新方針に合わせて書き換え。

#### `CHANGELOG.md`

- `## 0.1.0 - 2026-04-20` エントリを**新方針に沿って書き換え**:
  - TypeScript / tsup / cac / @clack/prompts / picocolors / vitest / biome の記述を削除
  - 「zero-dependency `.mjs` CLI via `npx github:...`」と明記
  - `init` / `update` (+ `--user`) の 2 コマンド構成を明記
  - 「Publish」節 (npm login → publish 手順) を削除し、「Distribution: GitHub main branch via `npx github:...`」と明記
- 日付は developer が commit する日に合わせて更新してよい

#### `TASK.md`

- 既存の Phase 1 タスクは全て完了状態だが、方針転換により**実質無効**
- 新フェーズ向けにテンプレートにリセット (空のチェックリストに戻す)
- `参照元: docs/issues/typescript-cli.md (2026-04-23)` に更新

#### `.gitignore`

- `dist/` エントリを削除 (もう生成しないため) — developer が確認

### 維持対象 (変更禁止)

- `.claude/` 配下 (配布元として保護)
- `LICENSE`
- `platforms/` (今回スコープ外)
- `scripts/generate.mjs` / `scripts/sync-wiki.mjs`

---

## 受入条件 (Phase 1 再策定版 完了定義)

- [ ] `bin/aphelion-agents.mjs` が存在し、shebang + 実行権限 (0755) が設定されている
- [ ] `node bin/aphelion-agents.mjs --help` で使用法が表示される
- [ ] `node bin/aphelion-agents.mjs --version` で `package.json` の `version` が表示される
- [ ] temp dir で `node bin/aphelion-agents.mjs init` を実行すると、カレントディレクトリに `.claude/` がコピーされる
- [ ] 既に `.claude/` が存在する状態で `init` を実行するとエラー終了する
- [ ] `node bin/aphelion-agents.mjs update` を既存 `.claude/` があるディレクトリで実行すると更新される
- [ ] `update` 時に既存の `.claude/settings.local.json` が上書きされない (保護される)
- [ ] `--user` フラグでターゲットが `~/.claude/` に切り替わる (検証は temp HOME で可)
- [ ] `package.json` の `dependencies` / `devDependencies` が空 (or 存在しない)
- [ ] `package.json` に `private: true` が設定されている
- [ ] 旧 TS 実装ファイル (`src/`, `tsconfig.json`, `tsup.config.ts`, `biome.json`, `vitest.config.ts`) が全て削除されている
- [ ] `package-lock.json` が削除されている
- [ ] `README.md` / `README.ja.md` / `docs/wiki/{en,ja}/Getting-Started.md` が新コマンド形式に更新されている
- [ ] `CHANGELOG.md` の 0.1.0 エントリが新方針に沿って書き換えられている
- [ ] `TASK.md` がテンプレート状態にリセットされている

## developer 向けブリーフ

### 実装指針

**`bin/aphelion-agents.mjs` 構造 (概念)**

```js
#!/usr/bin/env node
import { cp, access, constants } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// 1. argv パース: command (init|update), flags (--user, --force, --version, --help)
// 2. ソースパス解決: fileURLToPath(import.meta.url) → パッケージルート → .claude/
// 3. ターゲット解決: --user ? homedir()/.claude : cwd()/.claude
// 4. init: ターゲット存在チェック → 無ければ cp(recursive) / あれば --force 必須
// 5. update: ターゲット存在必須 → settings.local.json だけ退避 → cp(recursive, force:true) → 退避を戻す
// 6. エラーメッセージは日本語 (language-rules 準拠)
```

**エラーハンドリング**

- Node バージョンチェック: `process.versions.node` の major を数値化し、20 未満なら日本語で説明メッセージを出して `process.exit(1)`
- `try/catch` を徹底。`ENOENT` / `EEXIST` 等は個別にユーザーフレンドリーなメッセージに変換
- 未知の command / flag は `--help` を案内して exit code 1

**`settings.local.json` 保護の実装パターン**

Option A (推奨): `cp` の `filter` オプションで `settings.local.json` だけコピー対象から除外 (ターゲットに既存の場合のみ)
Option B: 事前に退避 → `cp` → 退避を戻す (より明示的だが I/O 多め)

どちらでも良いが、developer は選んだ方針を CHANGELOG または実装コメントに簡潔に記録すること。

### 実装しないこと (再確認)

- TypeScript 化、ビルドチェーンの再導入
- 対話プロンプト (`@clack/prompts` 等)
- プラットフォーム切替 (`--platform copilot/codex/all`)
- `platforms/` のコピー機能
- `npm publish` 手順ドキュメント
- GitHub Actions CI
- バージョンピン UI (`--version-pin` 等)
- `scripts/generate.mjs` / `scripts/sync-wiki.mjs` の書き換え

---

## 制約とスコープ外 (再策定版 Phase 1)

- **コード実装は developer の担当**: 本 issue 更新時点では実装を行わない
- **既存 commit は触らない**: developer が旧実装削除 + 新実装追加をまとめてコミットする
- **`.claude/` 配下への変更禁止** (配布元として保護)
- **`platforms/` への変更禁止** (今回スコープ外)
- **npm publish に関する手順・ドキュメントは残さない** (混乱回避のため完全に除去する)
