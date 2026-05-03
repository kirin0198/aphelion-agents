> Last updated: 2026-05-01
> GitHub Issue: [#114](https://github.com/kirin0198/aphelion-agents/issues/114)
> Analyzed by: analyst (2026-05-01)
> Next: architect

# init-settings-json-merge

`aphelion-agents init` が既存 `.claude/settings.json` を破壊する不具合を、JSON マージ
方式で解消するための設計ノート。

## 1. 背景 / Motivation

PR #113 (PR 1c) のレビューで、ユーザより以下の指摘があった (PR コメント原文):

> 内容は問題ないです。ただし、今回 setting.json が追加となった認識で、仮にユーザ自身で
> 作成していた場合に、上書きしてしまうことになります。
> インストール時にすでに setting.json が存在する場合は既存ファイルに追記するように
> インストールスクリプトの更新が必要です。

`update` 側は #107 PR 1a の R1 緩和策として既に "skip + warn" 保護が入っているが、
`init` 側には保護がない。`init --force` 実行時、もしくは `.claude/` を一部既設のユーザ
プロジェクトで初期化する際、ユーザ手書きの `.claude/settings.json` (Aphelion 以外の hook
設定や `outputStyle` 等) が破壊される。

## 2. Goal / Acceptance criteria

- `aphelion-agents init` および `aphelion-agents update` の双方で、既存
  `.claude/settings.json` が存在する場合、Aphelion 管理 hook entry のみを
  「追記 / 更新」する形で安全にマージできる
- 既存の Aphelion 以外の hook entry / 設定フィールドは保持される
- 同じコマンドを再実行しても重複 entry が増えない (idempotent)
- JSON parse 失敗時は安全側にフォールバック (skip + warn) し、init / update が
  例外で停止しない
- `src/.claude/settings.json` テンプレ自体は変更しない

## 3. Scope

- **対象ファイル**: `bin/aphelion-agents.mjs` (cmdInit, cmdUpdate, 新ヘルパー追加)
- **対象外**: `src/.claude/settings.json` テンプレ、`src/.claude/hooks/` 配下、
  agents/ rules/ commands/ 等の他ファイル

## 4. Constraints / Open questions

- **C1 (zero-dep 制約)**: `bin/aphelion-agents.mjs` は Node 標準ライブラリのみ
  (package.json 参照)。Node 組込 `JSON.parse` / `JSON.stringify` で実装可能。
- **C2 (Aphelion 管理 entry の識別)**: 現状 3 hooks (A/B/E) の `command` は
  全て `${CLAUDE_PROJECT_DIR}/.claude/hooks/aphelion-*.sh` パターン。
  `command` 文字列が `aphelion-` を含むかで識別する。将来 hook 名が変わる場合に
  備え、ヘルパー内に定数化しておく。
- **C3 (idempotency)**: マージ手順は (a) 既存 hooks 配列から Aphelion 管理 entry
  をフィルタ削除 → (b) template entry を末尾追記、で実現する。
- **OQ1 (matcher 衝突時の振る舞い)**: 既存 settings.json に同じ matcher (`Bash` 等)
  の非 Aphelion hook entry がある場合、template の同 matcher entry を別 entry として
  並列追記する (同 matcher で複数 entry を持つことは Claude Code spec で許可されている)。
- **OQ2 (JSON 整形)**: 書き戻し時の indent は 2 spaces 固定。改行は LF 固定 (template
  と同じ規約)。最終行に末尾改行を 1 個。

## 5. Analysis (root cause)

### 5.1 現状コード (bin/aphelion-agents.mjs)

`cmdInit` (line 125-164):

```js
// settings.json: hooks MVP テンプレートを配布 (#107)。init は新規配置なので上書き OK。
await cp(settingsSourcePath, join(targetPath, "settings.json"), {
  force: true,
});
```

→ **無条件に上書き**。ターゲット側の existence check なし。

`cmdUpdate` (line 168-239):

```js
const settingsPath = join(targetPath, "settings.json");
const hasSettings = await exists(settingsPath);
// ...
if (!hasSettings) {
  await cp(settingsSourcePath, settingsPath, { force: true });
} else {
  warn("Aphelion hooks template (.claude/settings.json) was preserved. ...");
}
```

→ R1 緩和済み。**既存があれば保護 + 英語警告**。ユーザは hook を有効化するため手動 merge を要求される。

### 5.2 cmdInit が `.claude/` 全体存在チェックを持つ件

`cmdInit` は line 128-133 で `.claude/` 全体の存在を見て `--force` 未指定なら
エラー終了する。したがって `.claude/` 自体が存在しない素のプロジェクトでは
settings.json 上書き問題は表面化しない。

しかし以下のケースで現状実装は問題:

| ケース | 現挙動 | 問題 |
|--------|--------|------|
| `.claude/` 不在 (素プロジェクト) | settings.json を新規作成 | OK |
| `.claude/settings.json` のみ手書き、`.claude/` の他は不在 | `.claude/` 存在で `--force` 要求エラー | 利用者は `--force` をつけて再実行する → settings.json 破壊 |
| `.claude/agents/` 等を持つ Aphelion 既導入プロジェクトで再 init (`--force`) | settings.json を含めて全体上書き | 利用者カスタム hook 破壊 |
| Aphelion 既導入プロジェクトで `update` | 既存 settings.json 保護 (R1) | OK だが手動 merge 要求 (UX 改善余地) |

ユーザの本来の要望「追記」は **init/update 双方で merge 動作させる** ことで満たせる。

### 5.3 PR コメントとの対応

ユーザ要望「既存ファイルに追記」 = JSON マージ。単純な skip では「追記」になっておらず、
ユーザが手動 merge する手間が残る。

## 6. Approach

### 6.1 採用方針: Option B (JSON merge)

Skip-if-exists (Option A) ではなく、**JSON マージ**を採用する。

理由:
1. ユーザ要望文言「追記」に直接適合
2. update 側 R1 (skip + warn) より一歩進んだ UX (自動有効化) を提供
3. `aphelion-` prefix 識別で idempotent merge が成立
4. JSON parse 失敗時は Option A 相当 (skip + warn) にフォールバックして安全側

### 6.2 マージアルゴリズム (擬似コード)

```js
async function mergeSettingsJson(existingPath, templatePath) {
  // 1. template を読み込み
  const templateRaw = await readFile(templatePath, "utf-8");
  const template = JSON.parse(templateRaw);

  // 2. 既存ファイルを読み込み (なければ template をそのまま書く)
  if (!(await exists(existingPath))) {
    await writeFile(existingPath, templateRaw);
    return { action: "created" };
  }

  let existing;
  try {
    existing = JSON.parse(await readFile(existingPath, "utf-8"));
  } catch (err) {
    // JSON parse 失敗: 安全側にフォールバック (skip + warn)
    return { action: "skipped_parse_error", error: err.message };
  }

  // 3. hooks フィールドが無ければ作成
  existing.hooks ??= {};

  // 4. PreToolUse / PostToolUse / Stop ... の各 event を template から merge
  const APHELION_MARKER = "aphelion-"; // command 文字列内の識別子

  for (const eventName of Object.keys(template.hooks ?? {})) {
    const templateEntries = template.hooks[eventName] ?? [];
    const existingEntries = existing.hooks[eventName] ?? [];

    // 既存配列から Aphelion 管理 entry を削除 (idempotency 保証)
    const filteredExisting = existingEntries.filter((entry) => {
      const cmds = (entry.hooks ?? []).map((h) => h.command ?? "");
      return !cmds.some((c) => c.includes(APHELION_MARKER));
    });

    // template entry を末尾追記
    existing.hooks[eventName] = [...filteredExisting, ...templateEntries];
  }

  // 5. 書き戻し (indent 2, LF, 末尾改行 1 個)
  await writeFile(existingPath, JSON.stringify(existing, null, 2) + "\n");
  return { action: "merged" };
}
```

### 6.3 cmdInit / cmdUpdate の差し替え

cmdInit (line 149-152) を:

```js
const mergeResult = await mergeSettingsJson(
  join(targetPath, "settings.json"),
  settingsSourcePath
);
reportMergeResult(mergeResult);
```

cmdUpdate (line 207-220) も同じ呼び出しに置換。`reportMergeResult()` で
`created` / `merged` / `skipped_parse_error` を ok/warn 出力に振り分ける。

### 6.4 安全側フォールバック動作

| `mergeSettingsJson` 戻り値 | 出力 | 利用者へのアクション要請 |
|----------------------------|------|--------------------------|
| `created` | `ok("settings.json (hooks template) を初期配置しました。")` | なし |
| `merged` | `ok("settings.json に Aphelion hooks をマージしました。")` | なし |
| `skipped_parse_error` | `warn("既存 .claude/settings.json の JSON 解析に失敗したため Aphelion hooks の追加をスキップしました。手動でマージしてください。")` + URL 案内 | 手動 merge |

### 6.5 検証方針

Aphelion はまだ test harness を持たないため、最低限の手動検証手順を以下に
明記する (PR description にも転記):

1. **新規プロジェクト** で `npx ... init` → `.claude/settings.json` が template 通り作成される
2. **Aphelion 以外の hook を持つ既存 settings.json** で init → 既存 hook + Aphelion hook の両方が含まれる
3. **同コマンド再実行** (idempotency) → Aphelion entry が重複しない
4. **不正 JSON ファイル** で init → スキップ + 警告、init 自体は成功終了
5. update 側でも 1〜4 を再現

## 7. Document changes

- SPEC.md / ARCHITECTURE.md / UI_SPEC.md: 本リポジトリには存在しない (Aphelion 自身の
  設計は `docs/wiki/` + `docs/design-notes/` 構成)。更新なし。
- `docs/design-notes/archived/aphelion-hooks-architecture.md` §6.3 の前提
  「init は新規配置なので上書き OK」は本 design note でロールバックされる。アーカイブ済み
  ファイルは原則修正しないため、本 design note 冒頭で経緯を引き継ぐ。
- `docs/wiki/{en,ja}/Hooks-Reference.md` に「init/update 時の挙動 (merge 動作)」を 1
  段落追加することを developer/doc-writer に推奨 (本 design note 範囲外、別 task として handoff)。

## 8. Handoff brief for architect

architect に渡す要件:

1. **`bin/aphelion-agents.mjs` 改修**
   - 新ヘルパー `mergeSettingsJson(existingPath, templatePath)` を追加 (§6.2 擬似コード参照)
   - `reportMergeResult(result)` ヘルパーで出力を統一
   - cmdInit (line 149-152) と cmdUpdate (line 207-220) の settings.json 配置ロジックを
     `mergeSettingsJson` 呼び出しに置換
   - import に `writeFile` を追加 (現在 `cp, access, readFile, chmod, readdir, constants` のみ)

2. **Aphelion 管理 entry の識別**
   - `command` 文字列が `aphelion-` を含むかで判定
   - 定数化 (`const APHELION_HOOK_MARKER = "aphelion-"`)

3. **JSON 整形規約**
   - Indent: 2 spaces
   - 改行: LF (Node 既定)
   - 末尾改行: 1 個

4. **安全側フォールバック (必須)**
   - JSON.parse 失敗時に throw しない
   - skip + warn でユーザに URL 誘導
   - init / update 双方でプロセス継続

5. **配布物テンプレ自体は変更不要**
   - `src/.claude/settings.json` には触らない

6. **検証**
   - 手動検証手順 (§6.5) を PR description に記載すること
   - 自動テスト harness 導入は本 issue スコープ外

## 9. PR strategy

- 本 fix は **新規 PR (1c.5 もしくは PR 1d 統合)** を推奨
- PR 1c (#113) は dogfooding スコープ確定済み。レビュー進行中のため変更追加は避ける
- PR 1c マージ前/後どちらでも独立適用可能 (依存なし)
- PR 1c マージ前に README / Release notes へ「init は既存 settings.json を破壊しうる」
  暫定警告を入れることは任意

## 10. Triage

**Patch** (既存 init 挙動の bug fix。新 UC 追加なし、API 変更なし)。
