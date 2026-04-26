# git-policy externalization: consolidate git/repository policy into git-rules.md

> GitHub Issue: [#73](https://github.com/kirin0198/aphelion-agents/issues/73)
> Analyzed by: analyst (2026-04-26)
> Next: developer
> Implemented in: TBD

---

## §1. Background and trigger

Aphelion は現状、**git + GitHub をハードコードで前提**として全フローが動作している。
具体的な症状:

- `project-rules.md` に「remote の種類」「GitHub を使うか否か」を宣言する canonical キーが存在しない。
- PR #72 (`305bc85`) で `developer.md` に `## Branch & PR Strategy` (約 100 行) が追加されたが、
  branch 命名規則・lifecycle・gh CLI 呼び出し等の詳細がエージェント定義側に直接記述されている。
- 同種の git/GitHub 操作（`gh auth status` チェック、`gh issue create`、PR 作成手順）は
  `analyst.md` Step 5 にも書かれており、エージェントが増えるごとに重複が広がる懸念がある。

ユーザの本質的な懸念は **`project-rules.md` および各 agent definition の肥大化が
context window を圧迫し hallucination を誘発すること**であり、
その対策として「ルール本体は単一の rule file に集約し、agents は 1 行参照だけにする」
という `sandbox-policy.md` / `denial-categories.md` と同形のパターンを採用したい。

関連:
- PR #66: analyst から branch/PR 責任を removal
- PR #72: developer.md に `## Branch & PR Strategy` を追加（その本体を本 issue で外出しする）
- Issue #71: CLOSED, MAJ-002 解消（本 issue はその次段の改修）

---

## §2. Goal and non-goals

### Goal

1. `project-rules.md` に `## Repository` セクションを導入し、
   `Remote type: github | gitlab | gitea | local-only | none` を宣言できるようにする。
2. `git-rules.md` を拡張し、以下 4 セクションを集約する。
   - `## Repository` (canonical 値の定義)
   - `## Startup Probe` (Bash 持ち agent が session 開始時に走らせる 5〜10 行のフローチャート)
   - `## Branch & PR Strategy` (PR #72 で developer.md に入った本体を移植)
   - `## Behavior by Remote Type` (各 remote 種類別の振る舞い)
3. `developer.md` の `## Branch & PR Strategy` を
   `> Follows .claude/rules/git-rules.md ...` 形式の 1 行参照 + agent 固有判断のみに縮小。
4. `analyst.md` Step 5 の重複を git-rules.md 経由に委譲。
5. `rules-designer.md` の生成テンプレに `## Repository` を組み込む。

### Non-goals (Out of scope)

詳細は §7 参照。要点:
- GitLab / Gitea の **実装は scaffolding のみ**（github / local-only 対応のみ完成）
- 既存 project-rules.md (user global 含む) への retrofit は別 issue
- rules-designer.md の対話フロー全面改修は別 issue

---

## §3. Approach (Option D: rule consolidation + lightweight startup probe)

### §3.1. Decision summary

委譲エージェント (`git-runner`) 案は **却下**。理由:

| 却下理由 | 説明 |
|---------|------|
| per-task overhead | commit/push は phase 内で N 回起こる routine 操作のため sub-agent invocation コスト × N が嵩む |
| context 再構築 | branch 名・commit message などの handoff 払い戻しで context が結局増える |
| hallucination の根本原因が残る | 複雑な rule が agent definition 側に温存される |
| AskUserQuestion 制約 | sub-agent 内で AskUserQuestion が使えない既知の制約に再びぶつかる |
| 二重委譲問題 | sandbox-runner との二重委譲で経路が複雑化する |

採用案は **Option D = rule consolidation + lookup pattern**。
各 agent は git-rules.md の Decision Flow を **読んで自分で実行する**
(`sandbox-policy.md` と同じ pattern)。sub-agent invocation のオーバーヘッドはゼロ。

### §3.2. File-level change map

| File | 役割 | 変更内容 | 影響行数の目安 |
|------|------|---------|---------------|
| `src/.claude/rules/git-rules.md` | rule 本体 | 4 セクション新設 (`## Repository` / `## Startup Probe` / `## Branch & PR Strategy` / `## Behavior by Remote Type`)。既存内容は維持し追記のみ。 | +180〜220 行 |
| `.claude/agents/developer.md` | agent definition | `## Branch & PR Strategy` (現行 84-196 行) を削除し、`> Follows .claude/rules/git-rules.md ...` 1 行 + branch 命名の agent 固有判断 (TASK 由来など) のみ残す | -90〜-100 行、+5 行 |
| `.claude/agents/analyst.md` | agent definition | Step 5 の `gh auth status` チェックを **`## Startup Probe` で吸収済み**として削除。`Remote type` 別の挙動分岐を git-rules.md に委譲。issue body template / label mapping は残す (analyst 固有なので)。 | -10〜-20 行 |
| `.claude/agents/rules-designer.md` | agent definition | Step 2 のテンプレ生成箇所に `## Repository` セクション（5-state の選択肢を含む `AskUserQuestion`）を追加。Step 3 の出力テンプレに `## Repository` を挿入。 | +30〜40 行 |
| `src/.claude/README.md` | docs | git-rules.md が拡張されたことに合わせて 1 行リンク更新（必要なら） | +0〜2 行 |
| `.claude/rules/project-rules.md` (user global, `~/.claude/rules/`) | optional | 既存ユーザの project-rules.md への retrofit は **本 issue では行わない**（§7 参照） | 0 行 |

### §3.3. New section content (sketch)

#### `## Repository` (in git-rules.md)

```markdown
## Repository

`project-rules.md` の `## Repository` → `Remote type` で declarative に宣言する。

| Value          | Meaning                                            | git ops | PR/issue tooling | Notes |
|----------------|----------------------------------------------------|---------|------------------|-------|
| `github`       | GitHub.com or GHES                                 | full    | `gh` CLI         | Default when missing |
| `gitlab`       | GitLab.com or self-hosted (scaffolding only)       | full    | `glab` CLI       | Out of scope for full impl |
| `gitea`        | Gitea / Forgejo (scaffolding only)                 | full    | `tea` CLI        | Out of scope for full impl |
| `local-only`   | Git repo without remote (e.g., personal scratch)   | local   | none             | Skip push / PR |
| `none`         | Not a git repo at all                              | skipped | none             | All git ops skipped |

Resolution order:
1. `.claude/rules/project-rules.md` → `## Repository` → `Remote type`
2. Default when project-rules.md is absent or key is missing: **`github`**
   (preserves backward compatibility with existing Aphelion projects)
```

#### `## Startup Probe` (in git-rules.md)

```markdown
## Startup Probe

Bash 持ち agent (`developer`, `analyst`, `tester`, `releaser` 等) が
session 開始時に **一度だけ** 実行する状態判定。結果は session 内で再利用してよい。

```
[Probe start]
   │
   ▼
git rev-parse --is-inside-work-tree 2>/dev/null
   │
   ├─ exit != 0  ──▶ REPO_STATE=none      (skip all git ops)
   │
   └─ exit == 0
       │
       ▼
   git remote -v 2>/dev/null
       │
       ├─ empty   ──▶ REPO_STATE=local-only  (commit only, skip push/PR)
       │
       └─ has remote
           │
           ▼
       project-rules.md `## Repository` → `Remote type`
           │
           ├─ github | (missing, default)
           │       └──▶ gh auth status; if OK → REPO_STATE=github
           │                              else  → REPO_STATE=github_unauth (warn)
           │
           ├─ gitlab | gitea
           │       └──▶ REPO_STATE=<value>_scaffold (PR/issue ops are skipped, push only)
           │
           └─ local-only | none
                   └──▶ REPO_STATE matches declared value
```

The probe runs **inline in the agent's startup phase** (no sub-agent).
Results are written into the agent's working memory and reused by all subsequent
git/PR operations within the same session.
```

#### `## Branch & PR Strategy` (in git-rules.md)

PR #72 で `developer.md` 84-196 行に追加された本体をそのまま移植。
変更点:
- 「This agent is responsible for ...」の語り出しを「Implementation-tier agents
  (`developer`, etc.) ...」に汎化。
- §3.4 で示す REPO_STATE による分岐を反映。

#### `## Behavior by Remote Type` (in git-rules.md)

```markdown
## Behavior by Remote Type

| REPO_STATE         | branch creation | commit | push       | PR / issue       |
|--------------------|-----------------|--------|------------|------------------|
| `github`           | yes             | yes    | yes        | `gh` full        |
| `github_unauth`    | yes             | yes    | yes (https credential prompt) | skipped (warn) |
| `gitlab_scaffold`  | yes             | yes    | yes        | skipped (warn)   |
| `gitea_scaffold`   | yes             | yes    | yes        | skipped (warn)   |
| `local-only`       | yes             | yes    | **skipped**| skipped          |
| `none`             | **skipped**     | **skipped** | **skipped** | **skipped**  |

When PR / issue ops are skipped, agents must:
- emit a single warning line to the user explaining which op was skipped and why,
- record `GITHUB_ISSUE: skipped (REPO_STATE=<value>)` (or analogous) in `AGENT_RESULT`.
```

### §3.4. Reference line pattern (agents → git-rules.md)

`developer.md` の `## Branch & PR Strategy` 全体を以下に置き換える:

```markdown
## Branch & PR Strategy

> Follows `.claude/rules/git-rules.md` for branch naming, lifecycle, commit/push
> conventions, PR creation, and remote-type-aware behavior. Refer to
> `## Startup Probe`, `## Branch & PR Strategy`, and `## Behavior by Remote Type`
> in that file.

### Developer-specific notes

- Branch name derivation: `developer` derives `{short-description}` from
  TASK.md's Phase header or, if absent, from the upstream
  `ARCHITECT_BRIEF`. Bug-fix tasks default to `fix/...`, otherwise `feat/...`.
- Commit granularity is governed by `## Progress Management via TASK.md` →
  `Task Completion Procedure` below; one commit per task on the working branch.
```

`analyst.md` も同様に Step 5 内の `gh auth status` チェック等を削除し、
`> Follows .claude/rules/git-rules.md ...` を `## Mandatory Checks Before Starting`
に追加。

---

## §4. Open questions

設計者・実装者で確認が必要な事項。実装着手前に解消する必要があるものは「Resolved before implementation」へ昇格させる。

| # | Question | Default position | Owner |
|---|----------|-----------------|-------|
| Q1 | Startup Probe は **bash one-liner で書く** か **shell script に外出しするか**? | bash one-liner（probe は 5〜10 行で完結する想定、外出しは保守を増やす） | developer |
| Q2 | Probe 結果の cache 戦略: session 内 in-memory のみか、それとも `/tmp/aphelion-probe-{session_id}` のような file cache を許すか? | in-memory のみ（session を跨いだ cache は state 漏れリスクあり） | developer |
| Q3 | `Remote type: gitlab` のフォールバック動作は **push までは行うが PR は skip** か **push も skip** か? | push までは行う（branch を残しておけば後で手動 PR 作成可能） | developer |
| Q4 | `Remote type: none` のとき commit すら skip するか? | skip する（その agent は `REPO_STATE=none` を AGENT_RESULT に記録して終了） | developer |
| Q5 | 既存 user global `~/.claude/rules/project-rules.md` に `## Repository` が無い場合、warning を出すか黙って `github` default に倒すか? | 黙って `github` default（後方互換性優先、warning は別 issue で導入） | developer |
| Q6 | `## Repository` セクションは `## Git Rules` の下に置くか、最上位 (top-level) に置くか? | 最上位 (top-level)（`Remote type` は git workflow より上位の宣言、`## Authoring` 等と並列） | developer |

---

## §5. Document changes

### Files to be modified

- `src/.claude/rules/git-rules.md` — 4 セクション新設（追記のみ、既存内容は維持）
- `.claude/agents/developer.md` — `## Branch & PR Strategy` 縮小（PR #72 が追加した本体を移植）
- `.claude/agents/analyst.md` — Step 5 の重複削除（Mandatory Checks に reference 追加）
- `.claude/agents/rules-designer.md` — Step 2 質問追加 + Step 3 出力テンプレに `## Repository` 挿入

### Files NOT to be modified

- 既存 SPEC.md / ARCHITECTURE.md（本 repo の自身の運用文書には該当する SPEC.md は無い）
- 既存 user global `~/.claude/rules/project-rules.md`（retrofit は別 issue）
- `src/.claude/rules/sandbox-policy.md` / `denial-categories.md`（参考にするだけ、変更なし）
- 他のすべての `.claude/agents/*.md`（developer / analyst / rules-designer 以外）

---

## §6. Acceptance criteria (mechanically verifiable)

実装完了の判定は以下を **すべて grep / `node --check` 等で機械検証可能**にする。

### AC-1: git-rules.md に 4 セクションが追加されている

```bash
for sec in "## Repository" "## Startup Probe" "## Branch & PR Strategy" "## Behavior by Remote Type"; do
  grep -F "$sec" src/.claude/rules/git-rules.md || { echo "MISSING: $sec"; exit 1; }
done
```

### AC-2: developer.md の `## Branch & PR Strategy` が縮小されている

PR #72 時点 (`305bc85`) で 84-196 行の約 113 行あったセクションが、20 行以下になっている。

```bash
awk '/^## Branch & PR Strategy$/,/^## /{ if (!/^## Branch & PR Strategy$/ && /^## /) exit; print }' \
  .claude/agents/developer.md | wc -l
# expected: <= 25
```

### AC-3: developer.md / analyst.md に git-rules.md への参照が含まれる

```bash
grep -F "Follows \`.claude/rules/git-rules.md\`" .claude/agents/developer.md
grep -F "Follows \`.claude/rules/git-rules.md\`" .claude/agents/analyst.md
```

### AC-4: rules-designer.md が `## Repository` を生成テンプレに含む

```bash
grep -n "Remote type" .claude/agents/rules-designer.md
grep -n "## Repository" .claude/agents/rules-designer.md
```

### AC-5: 既存 user-facing wiki の整合性

`site/src/content/docs/{en,ja}/rules-reference.md` に git-rules.md 拡張への
追従が含まれている、または「本 issue では更新しない」と explicit に Out of scope
されている（§7 参照、本 issue では更新しない）。

### AC-6: REPO_STATE classification の最低ライン動作確認

実装後に以下 3 ケースを手動 (もしくは tester) で確認:

| Case | Setup | Expected REPO_STATE |
|------|-------|---------------------|
| C1 | aphelion-agents repo (現環境) | `github` |
| C2 | `git init` 直後・remote 未設定の tmp dir | `local-only` |
| C3 | `git init` すらしていない tmp dir | `none` |

---

## §7. Out of scope (explicit)

本 issue では **以下を扱わない**。それぞれ別 issue にする想定。

1. **GitLab / Gitea の actual implementation**
   - 本 issue では `## Behavior by Remote Type` table と `glab`/`tea` CLI の参照を書くだけ。
   - PR / issue ops は実装段階で `gitlab_scaffold` / `gitea_scaffold` として skip する。
   - 完全対応は別 issue (`feat: gitlab support` / `feat: gitea support` 等) で扱う。

2. **既存 project-rules.md（user global 含む）への retrofit**
   - `~/.claude/rules/project-rules.md` に `## Repository` セクションを後付けする作業。
   - 既存ユーザの環境を勝手に書き換えると差分が読めなくなるため、別 issue で
     migration ガイド付きで案内する。
   - 本 issue では「無ければ default `github`」で後方互換を保つことに留める。

3. **rules-designer.md の対話フロー全面改修**
   - 現在 Round 1〜N の質問構成は project-rules.md のスキーマに引きずられて長い。
   - 本 issue では `## Repository` の追加のみで、対話フロー再設計は別 issue。

4. **`Remote type: github_enterprise` の細分化**
   - `github` で GHES も吸収する。本 issue では分離しない。

5. **wiki / README の改訂**
   - `site/src/content/docs/{en,ja}/rules-reference.md` への反映は
     **wiki polishing 系 issue とまとめる**ほうが望ましい (本 issue は core rule 改修に専念)。

---

## §8. Implementation steps for `developer`

推奨実装順 (各ステップで 1 コミット):

### Step 1: git-rules.md 拡張 (single source of truth を先に立てる)

1. `src/.claude/rules/git-rules.md` の末尾に以下 4 セクションを追記:
   - `## Repository`
   - `## Startup Probe`
   - `## Branch & PR Strategy` (developer.md 84-196 行の本体を移植・汎化)
   - `## Behavior by Remote Type`
2. ヘッダ部に `> Last updated: 2026-04-26` と update history を追加。
3. AC-1 を満たすことを `grep` で確認。
4. Commit: `refactor: extend git-rules.md with Repository / Startup Probe / Branch & PR Strategy sections`

### Step 2: developer.md の `## Branch & PR Strategy` を縮小

1. 現行 84-196 行を削除し、§3.4 で示した縮小形 (20 行以下) に置き換える。
2. AC-2, AC-3 を満たすことを確認。
3. Commit: `refactor(developer): replace inline Branch & PR Strategy with git-rules.md reference`

### Step 3: analyst.md Step 5 の重複削除

1. Step 5 冒頭または Mandatory Checks に
   `> Follows .claude/rules/git-rules.md ...` を追加。
2. `gh auth status` 等の重複部分を削除（Startup Probe で吸収）。
3. Issue body template / label mapping は analyst 固有なので残す。
4. AC-3 を満たすことを確認。
5. Commit: `refactor(analyst): defer git/remote handling to git-rules.md`

### Step 4: rules-designer.md に `## Repository` 追加

1. Step 2 に Repository 種類を尋ねる `AskUserQuestion` を 1 つ追加 (推奨: github)。
2. Step 3 の出力テンプレ (line 290 付近の `## Git Rules` の上) に `## Repository`
   セクションを挿入。
3. AC-4 を満たすことを確認。
4. Commit: `feat(rules-designer): add Repository declaration to project-rules.md template`

### Step 5: 動作確認 (AC-6)

1. `developer` 自身が新しい Startup Probe で正しく `github` と判定されることを
   manual で確認。
2. 一時ディレクトリで C2, C3 を確認。
3. Commit が不要な場合は git status を確認するだけで終了。

### Step 6: PR 作成

- branch 名: `refactor/git-policy-externalization`
- PR title: `refactor: externalize git/repository policy into git-rules.md`
- PR body: `Closes #N` (本 issue), `Linked Plan: docs/design-notes/git-policy-externalization.md`,
  AC-1〜AC-6 のチェックリスト。

---

## §9. Notes for next agent

- 本設計ノートは AskUserQuestion を使わない方針 (auto mode) で書かれている。
- analyst (本 phase) では branch / commit / push / PR を作らない (post-#66 仕様)。
  developer がブランチを切り、本ノートを含めて commit する。
- 設計ノートは untracked のままで OK。
- Output Language は ja。

