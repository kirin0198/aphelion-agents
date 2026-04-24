# Drop `platforms/` — Claude Code Only

> Reference: current `main` (HEAD `3b77b63`, 2026-04-24)
> Created: 2026-04-24
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; removal to be executed by a follow-up `developer` phase

---

## 1. Background & Motivation

### 1.1 Current state

`aphelion-agents` ships two parallel artifact trees:

- **Canonical source** — `.claude/` (Claude Code definitions).
- **Generated artifacts** — `platforms/copilot/` (GitHub Copilot) and `platforms/codex/` (OpenAI Codex),
  produced by `scripts/generate.mjs` (Node, zero-dependency).

The generator rewrites frontmatter, maps tool names (`Read`→`read`, `Bash`→`execute`, …), inlines
`orchestrator-rules.md` into the 4 flow-orchestrator agents, and converts two commands into Codex
skills (`vuln-scan`, `secrets-scan`).

### 1.2 Pain points

1. **Every `.claude/` change must be followed by `node scripts/generate.mjs` + staging `platforms/`.**
   PRs #29, #33, #34, #35 all landed with stale generated output; the backlog of
   platforms-regeneration has become visible.
2. **Double maintenance with diminishing return.** Copilot- and Codex-side substitutions
   (`AskUserQuestion` → "structured choice prompt", etc.) are best-effort; there is no feedback
   loop that confirms the rewrites still produce working behaviour on those platforms.
3. **Generated artifacts bloat the repository and PR diffs.** `platforms/copilot/agents/` is ~340 KiB
   across 31 files; unrelated refactors land with 30+ generated-file changes, obscuring reviews.
4. **No evidence of adoption.** There is no issue tracker signal, telemetry, or user
   report confirming anyone runs Aphelion via the Copilot or Codex exports.
5. **Focus cost.** Each new agent (`maintenance-flow`, `change-classifier`, `impact-analyzer`,
   `reviewer`, …) must be mentally validated against Copilot's agent-tool schema and Codex's
   32 KiB `AGENTS.md` limit. This pulls design energy away from Claude Code quality work.

### 1.3 Goal

Convert `aphelion-agents` into a **Claude Code–only** project. Remove `platforms/` and its
generator. Prune multi-platform language from README, site, wiki, and agent definitions.
Keep sandbox-policy's platform detection logic in place (see ADR-003) to preserve the future
option of re-adding platform exports without a rewrite.

---

## 2. Current Inventory of Platform-Coupled Assets

### 2.1 Files / directories to delete outright

| Path | Size | Files | Notes |
|------|------|-------|-------|
| `platforms/copilot/copilot-instructions.md` | 3.2 KiB | 1 | Generated from `aphelion-overview.md` |
| `platforms/copilot/agents/*.agent.md` | 347.9 KiB | 31 | Mirrors `.claude/agents/` with tool/path substitutions |
| `platforms/codex/AGENTS.md` | 21.3 KiB | 1 | Concatenation of overview + orchestrator-rules |
| `platforms/codex/skills/secrets-scan/SKILL.md` | — | 1 | Generated from `.claude/commands/secrets-scan.md` |
| `platforms/codex/skills/vuln-scan/SKILL.md` | — | 1 | Generated from `.claude/commands/vuln-scan.md` |
| **`platforms/` (total)** | **468 KiB** | **35** | Entire directory |
| `scripts/generate.mjs` | 14.5 KiB, 462 LOC | 1 | Generator; see §4 for residual-logic analysis |

### 2.2 Files requiring targeted updates (pruning, not deletion)

| Path | LOC | What changes |
|------|-----|-------------|
| `package.json` | 25 | Remove `scripts.generate`; update top-level `description` |
| `README.md` | 245 | See §5.1 |
| `README.ja.md` | 245 | See §5.1 |
| `site/src/content/docs/en/index.mdx` | 82 | Drop Platform-Guide card + multi-platform tagline |
| `site/src/content/docs/ja/index.mdx` | 82 | Same, Japanese side |
| `site/astro.config.mjs` | 66 | Remove `platform-guide` entry from `PAGES` array |
| `docs/wiki/en/Home.md` | 109 | See §5.2 |
| `docs/wiki/ja/Home.md` | 110 | Same, Japanese side |
| `docs/wiki/en/Getting-Started.md` | 335 | Drop Copilot / Codex Quick Start + troubleshooting sections |
| `docs/wiki/ja/Getting-Started.md` | 330 | Same |
| `docs/wiki/en/Contributing.md` | 190 | Drop "Regenerating Platform Files" section + PR-checklist items |
| `docs/wiki/ja/Contributing.md` | 191 | Same |
| `docs/wiki/en/Architecture.md` | 459 | Replace single Platform-Guide link reference (line 410) |
| `docs/wiki/ja/Architecture.md` | 466 | Same |
| `docs/wiki/DESIGN.md` | 345 | Revise §1.1 (8-page → 7-page), drop platforms-as-consumer framing (§§ at lines 203, 209-210, 233, 242, 271, 290, 343-344) |

### 2.3 Files requiring deletion (wiki page pair)

| Path | LOC | Notes |
|------|-----|-------|
| `docs/wiki/en/Platform-Guide.md` | 337 | Remove outright (see ADR-002 for rationale) |
| `docs/wiki/ja/Platform-Guide.md` | 338 | Same |

### 2.4 Files intentionally **not** modified

- `.claude/rules/sandbox-policy.md` — platform-detection logic (`$CLAUDE_CODE_*` / `$GITHUB_COPILOT_*` /
  `$OPENAI_CODEX_*`) stays as-is. See ADR-003.
- `.claude/agents/sandbox-runner.md` — platform-mapping table stays. Same rationale.
- `CHANGELOG.md` — historical entries for the multi-platform feature remain untouched; a new
  entry describing the removal will be appended by the executing phase.
- `ISSUE.md` (root) — historical; do not edit.
- `docs/issues/*.md` — past planning docs may reference `platforms/`; these are archival and are
  not updated. See ADR-004.
- `site/src/content/docs/{en,ja}/platform-guide.md` — these are `sync-wiki.mjs` outputs; they will
  simply disappear the next time the sync script runs, because the sources are gone.
- `scripts/sync-wiki.mjs` — verified clean of platforms references.
- `bin/aphelion-agents.mjs` — already Claude-only (only copies `.claude/`); no change needed.
- `.gitignore` — does not reference `platforms/`; no change needed.

### 2.5 Files that do not exist (sanity check outcomes)

- `site/src/content/docs/{en,ja}/platform-guide.md` — verified these *are* present today as sync
  outputs, and will be regenerated-as-empty (i.e. stop existing) after the next `sync-wiki` run.
  Confirm during developer phase and, if needed, delete them explicitly.

---

## 3. Decisions to Make (unresolved — pending user sign-off)

Listed with the analyst's recommendation in bold.

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | Fate of `platforms/` directory | (a) physical delete, (b) keep as "legacy snapshot" | **(a) delete**. History remains in git. |
| D2 | Fate of `scripts/generate.mjs` | (a) delete, (b) keep minimized, (c) split residual logic | **(a) delete**. No residual logic (see §4). |
| D3 | Fate of `docs/wiki/{en,ja}/Platform-Guide.md` | (a) delete, (b) replace with "deprecated" stub | **(a) delete**. A stub keeps confusion alive. |
| D4 | `sandbox-policy.md` platform detection | (a) keep, (b) simplify to Claude Code only | **(a) keep** (see ADR-003). |
| D5 | Back-compat tag for last multi-platform commit | (a) no tag, (b) tag `v0.1.0-multiplatform`, (c) tag a new branch | **(a) no tag**. git log + PR #34 are sufficient anchors. |
| D6 | PR split strategy | (a) single PR, (b) two PRs (deletion + docs), (c) three PRs | **(b) two PRs** — see §7. |
| D7 | `wiki/DESIGN.md` "8 pages" principle | (a) revise to 7, (b) keep 8 and treat Platform-Guide as a reserved slot | **(a) revise to 7** (see ADR-005). |
| D8 | `package.json` `description` field | Current: *"AI coding agent definitions for Claude Code, GitHub Copilot, and OpenAI Codex"* | Replace with **"AI coding agent definitions for Claude Code — Discovery, Delivery, Operations workflow."** |
| D9 | CHANGELOG entry wording | Unreleased section heading | **"Changed — dropped GitHub Copilot / OpenAI Codex exports; project is now Claude Code only."** |
| D10 | Communication to existing Copilot/Codex users | (a) none, (b) GitHub Discussion / Release notes | **(b)**: add a note in the release notes referencing the last commit SHA that still contains `platforms/`. |

---

## 4. `scripts/generate.mjs` — Residual-Logic Analysis

Read top-to-bottom; every function is platform-specific:

| Region | Function(s) | Purpose | Re-usable outside platforms? |
|--------|-------------|---------|------------------------------|
| L19-47 | `COPILOT_TOOL_MAP`, `ORCHESTRATOR_NAMES`, `CODEX_SKILL_COMMANDS` constants | Tables for rewriting | **No** |
| L57-116 | `parseFrontmatter` | YAML frontmatter parser (zero-dep) | **Potentially yes** — but `sync-wiki.mjs` has its own parser (`extractFrontmatter`, L80-96) which is already the de-facto standard for this repo. Duplicating it here is unnecessary. |
| L126-167 | `copilotFrontmatter` | Build Copilot frontmatter | **No** |
| L174-213 | `replaceCopilot` | Copilot-specific text rewriter | **No** |
| L219-301 | `generateCopilot` | Orchestrate Copilot tree generation | **No** |
| L311-340 | `replaceCodex` | Codex-specific text rewriter | **No** |
| L346-409 | `generateCodex` | Orchestrate Codex tree generation | **No** |
| L414-460 | CLI entry | Flag parsing + banner | **No** |

**Conclusion**: no residual logic worth salvaging. Delete the entire file.

---

## 5. Specific Edit Plans

> Line numbers reflect files at HEAD `3b77b63`.

### 5.1 `README.md` / `README.ja.md`

**Remove** (EN example; JA gets the same edits):

| Lines | Content |
|-------|---------|
| 7 | `A multi-platform collection of AI coding agent definitions…` |
| 34-42 | `### Supported Platforms` table + generator pointer |
| 81-92 | GitHub Copilot + OpenAI Codex "Install via git clone" blocks |
| 170-196 | `platforms/` section of the file-structure tree + "Regenerate platform files" block |
| 198-207 | `### Platform Comparison` table |
| 223 | `[Platform Guide]` row in the documentation table |
| 237 | `- **Multi-platform** — Claude Code (canonical), GitHub Copilot, OpenAI Codex` |

**Replace**:

- Line 7 → `A collection of AI coding agent definitions for Claude Code that automates the entire project lifecycle with 27 specialized agents.`
- Line 237 → `- **Claude Code native** — Built on Claude Code's Agent tool, sub-agent orchestration, and permission modes`

After edits, the `## File Structure` subsection shows only `.claude/`. The `## Documentation` table
drops one row (Platform Guide).

### 5.2 `docs/wiki/en/Home.md` / `docs/wiki/ja/Home.md`

| Lines (en) | Action |
|------------|--------|
| 7 | Drop "multi-platform". New text: "Welcome to the **Aphelion Wiki** — the detailed reference for the Aphelion Claude Code agent workflow." |
| 20, 24-25 | Remove Platform-Guide and "how to add…platforms" rows |
| 40 | Drop Platform-Guide row |
| 71-74 | Delete entire "I want to use Aphelion on GitHub Copilot or OpenAI Codex" block |

Japanese file: identical edits at equivalent lines.

### 5.3 `docs/wiki/en/Getting-Started.md` / `docs/wiki/ja/Getting-Started.md`

| Lines (en) | Action |
|------------|--------|
| 7 | Drop "platform-specific" — reword to "Claude Code setup, first-run walkthrough…" |
| 12 | Drop TOC entry "Quick Start by Platform" (replace with "Quick Start") |
| 25-29 | Simplify requirements table to Claude Code only |
| 39 | Heading `## Quick Start by Platform` → `## Quick Start` |
| 78-99 | Delete GitHub Copilot + OpenAI Codex sections entirely |
| 257 | Reword footnote: drop "or invoked through the agent mode interface (Copilot)" |
| 314-320 | Delete "Copilot: Agents not appearing" and "Codex: Flow commands not working" troubleshooting entries |
| 328 | Drop Platform-Guide link from Related Pages |

### 5.4 `docs/wiki/en/Contributing.md` / `docs/wiki/ja/Contributing.md`

| Lines (en) | Action |
|------------|--------|
| 7 | Drop "running the platform generator" clause |
| 17 | Drop TOC entry `Regenerating Platform Files` |
| 35 | Delete table row "Platform generator change" |
| 60, 74, 88 | Delete steps referring to `node scripts/generate.mjs` |
| 120 | Drop "platform internals" clause |
| 143-158 | Delete entire "## Regenerating Platform Files" section |
| 172-173 | Delete PR-checklist items about platform regeneration |
| 183 | Drop Platform-Guide entry from Related Pages |
| 189 | Drop `scripts/generate.mjs` link from Canonical Sources |

### 5.5 `docs/wiki/en/Architecture.md` / `docs/wiki/ja/Architecture.md`

Line 410 (only affected line): replace

> `…See [Platform Guide](./Platform-Guide.md) for per-platform configuration details.`

with

> `…See [.claude/rules/sandbox-policy.md](../../.claude/rules/sandbox-policy.md) for sandbox-mode configuration details.`

The mermaid diagram (L433-L444) mentions `platform_permission` as a sandbox mode — this is *sandbox*
platform detection, not *AI platform* detection, and stays. Phrase is intentional.

### 5.6 `docs/wiki/DESIGN.md`

| Lines | Action |
|-------|--------|
| 29 | Change "**8 ページ構成を維持**する" → "**7 ページ構成**に改訂する（旧 Platform-Guide を廃止）" |
| 38 | Delete the row for `Platform-Guide` |
| 203 | Delete sentence starting "生成物の目的 |" |
| 209-210 | Delete sentence about `scripts/generate.py` scanning + README mention |
| 233, 242 | Remove "Platform-Guide.md" from the file-tree listings |
| 271 | Delete "Task 4-1: docs/wiki/en/Platform-Guide.md…" task |
| 290 | Delete risk row mentioning Wiki-from-Platform discovery |
| 343-344 | Delete `platforms/copilot/` and `scripts/generate.py` citations |

Also append to "更新履歴":

```
>   - 2026-04-24: Platform-Guide ページ廃止に伴い 8→7 ページ構成に改訂
```

### 5.7 `site/astro.config.mjs`

Delete L16:

```js
{ slug: 'platform-guide',   labelEn: 'Platform Guide',    labelJa: 'プラットフォームガイド' },
```

### 5.8 `site/src/content/docs/{en,ja}/index.mdx`

- Description frontmatter: drop "Multi-platform" / "マルチプラットフォーム対応" prefix.
- Remove the final `<Card>` in the "Explore the Documentation" / "ドキュメント" grid (Platform
  Guide card, L78-81 in both files).

### 5.9 `package.json`

```diff
 {
   "name": "aphelion-agents",
   "version": "0.1.0",
-  "description": "AI coding agent definitions for Claude Code, GitHub Copilot, and OpenAI Codex",
+  "description": "AI coding agent definitions for Claude Code — Discovery, Delivery, Operations workflow",
   …
   "scripts": {
-    "generate": "node scripts/generate.mjs",
     "sync-wiki": "node scripts/sync-wiki.mjs"
   }
 }
```

### 5.10 `CHANGELOG.md`

Append under a new `## [Unreleased]` section (or extend the existing one):

```
### Changed
- Dropped GitHub Copilot / OpenAI Codex exports. Aphelion is now Claude Code only.
  Removed `platforms/` directory, `scripts/generate.mjs`, and the Platform-Guide wiki page.
  Historical multi-platform content remains accessible in git history up to commit <SHA>.
```

---

## 6. Wiki — 7-Page Configuration After Removal

| # | slug | labelEn | labelJa |
|---|------|---------|---------|
| 1 | `home` | Overview | 概要 |
| 2 | `getting-started` | Getting Started | はじめる |
| 3 | `architecture` | Architecture | アーキテクチャ |
| 4 | `triage-system` | Triage System | トリアージシステム |
| 5 | `agents-reference` | Agents Reference | エージェントリファレンス |
| 6 | `rules-reference` | Rules Reference | ルールリファレンス |
| 7 | `contributing` | Contributing | コントリビューション |

This is enforced in exactly three places and must stay in sync:

- `site/astro.config.mjs` `PAGES` array
- `docs/wiki/DESIGN.md` §1.1 table
- Sidebar links that each wiki page renders at its bottom (Related Pages)

---

## 7. PR Split Strategy

Recommendation (D6): **two PRs**, in this order.

### PR 1 — `chore: remove platforms/ and generate.mjs`

Purpose: physically remove generated output and the generator. No doc changes.

- `git rm -r platforms/`
- `git rm scripts/generate.mjs`
- `package.json`: remove `scripts.generate` and update `description`
- Single commit. Message prefix: `chore:` (per `.claude/rules/git-rules.md`).

### PR 2 — `docs: drop multi-platform language — Claude Code only`

Purpose: align all documentation with the new reality.

- README.md, README.ja.md
- docs/wiki/DESIGN.md
- docs/wiki/{en,ja}/Home.md
- docs/wiki/{en,ja}/Getting-Started.md
- docs/wiki/{en,ja}/Contributing.md
- docs/wiki/{en,ja}/Architecture.md
- docs/wiki/{en,ja}/Platform-Guide.md → deletion
- site/astro.config.mjs
- site/src/content/docs/{en,ja}/index.mdx
- Run `node scripts/sync-wiki.mjs` locally to refresh `site/src/content/docs/{en,ja}/*.md`
  (should also cause `platform-guide.md` files under site/ to stop being regenerated — delete
  them by hand if they remain).
- CHANGELOG.md entry

Single commit per PR is appropriate because the changes within each PR are all one logical task
(per `.claude/rules/git-rules.md` — one commit per task).

**Why two PRs, not one** — the deletion PR is mechanical and fast to review; keeping it separate
lets the heavier docs PR be reviewed against a clean main without the noise of 35 deleted files.

---

## 8. ADRs

### ADR-001 — Full deletion of `platforms/` (not minimization)

- **Status**: proposed
- **Context**: Maintaining a minimized generator (e.g. "only produce `copilot-instructions.md`")
  still requires ongoing verification that the rewrites are correct.
- **Decision**: Delete `platforms/` and `scripts/generate.mjs` wholesale. No intermediate state.
- **Consequence**: anyone needing Copilot/Codex exports after this change must either (a) fork
  and restore from git history, or (b) run the generator against an older `main` checkout. Both
  are acceptable per D10.

### ADR-002 — Delete `Platform-Guide.md` (do not keep as deprecated stub)

- **Status**: proposed
- **Context**: Deprecated-stub pages attract partial reads and mislead users into thinking the
  feature still exists in some limited form.
- **Decision**: Delete both language pages. Add a release-notes pointer (D10) so users searching
  for "Aphelion Copilot" find the deprecation signal.
- **Consequence**: Home.md, Astro sidebar, and DESIGN.md must update to 7-page layout in the same PR.

### ADR-003 — Keep `sandbox-policy.md` platform detection logic unchanged

- **Status**: proposed
- **Context**: `sandbox-policy.md` detects the execution host (`claude_code`/`copilot`/`codex`/
  `unknown`) to select a permission mode. This is orthogonal to whether we *distribute* Copilot
  or Codex exports — the detection is about who is *running* Aphelion.
- **Decision**: Do not simplify. Keep the 4-way detection.
- **Consequence**: If a user forks and re-exports to Copilot/Codex, sandbox behaviour still
  degrades gracefully. No loss from keeping ~20 lines.

### ADR-004 — Do not retroactively edit past `docs/issues/*.md`

- **Status**: proposed
- **Context**: Six historical planning docs mention `platforms/`. They are archival; editing
  them obscures the decision timeline.
- **Decision**: Leave them untouched. Only new docs reference the post-removal state.
- **Consequence**: Anyone reading a 2026-04-19 planning doc will see "platforms/copilot" references.
  Acceptable for an archive.

### ADR-005 — Revise wiki DESIGN.md from "8-page principle" to "7-page"

- **Status**: proposed
- **Context**: DESIGN.md §1.1 currently codifies 8 pages and justifies the number in §1.2.
- **Decision**: Update the table and §1.1 heading text. §1.2 ("Agents-Reference を 1 ページに
  まとめる根拠") is orthogonal to page count and stays.
- **Consequence**: Wiki now self-describes as 7-page; future additions explicitly change this
  contract.

### ADR-006 — No back-compat git tag for last multi-platform commit

- **Status**: proposed
- **Context**: Tagging `v0.1.0-multiplatform` signals long-term support we do not intend to provide.
- **Decision**: No tag. Cite the commit SHA in CHANGELOG and release notes (D10).
- **Consequence**: Users who need it can `git log --all -- platforms/` to find the last commit.

---

## 9. Test Plan (for the implementation phase)

The executing `developer` should verify, after edits:

1. `node scripts/sync-wiki.mjs` runs clean (no errors, no warnings beyond expected image unchanged).
2. `cd site && npx astro build` succeeds with no broken-link warnings for `/en/platform-guide/`
   or `/ja/platform-guide/`.
3. `rg -i --hidden -g '!.git' 'platforms/(copilot|codex)'` returns hits only in
   `docs/issues/*.md`, `CHANGELOG.md` (historical), and `ISSUE.md` (historical).
4. `rg -i --hidden -g '!.git' 'platform-guide'` returns no hits.
5. `rg -i --hidden -g '!.git' 'generate\.mjs'` returns only the deletion line in `package.json`
   history (i.e. no live references).
6. `npm run sync-wiki` in the project root still works — because `sync-wiki.mjs` itself is untouched.
7. `npx github:kirin0198/aphelion-agents --help` (the CLI) still exposes only `init` / `update`.
8. Manual click-through of https://aphelion-agents.pages.dev/ locally (`astro dev`) confirms
   hero page and sidebar show 7 entries.

---

## 10. Handoff to `architect`

`architect` needs to:

1. Acknowledge D1-D10 resolutions once user confirms (or adjust if user overrides).
2. Produce an implementation task list (TASK.md style) mapping the two PRs above onto concrete
   ordered tasks.
3. Decide whether any `ARCHITECTURE.md` update is needed — `aphelion-agents` itself has no
   `ARCHITECTURE.md` at the root; the wiki `Architecture.md` is updated as a doc edit in §5.5.
   Likely no `architect`-specific design work beyond reviewing this plan.

---

## 11. Open Questions (awaiting user response)

Because sub-agents cannot call `AskUserQuestion`, the following are listed here for explicit
approval in the user's reply:

- Q1 (D1-D3 confirmation): Accept full deletion of `platforms/`, `scripts/generate.mjs`, and
  `Platform-Guide.md` pair? **(analyst recommends yes)**
- Q2 (D4): Keep sandbox-policy platform detection as-is? **(yes)**
- Q3 (D5, D6, D10): No tag; two PRs; release-notes pointer — accept as a bundle? **(yes)**
- Q4 (D8): Accept the proposed `package.json` `description` replacement string?
- Q5: Any objection to revising wiki DESIGN.md's "8-page principle" to 7 pages (ADR-005)?
- Q6: Should this planning document itself be amended in a later commit with the user's sign-off
  notes, or is the GitHub Issue (see §12) the canonical sign-off record?

---

## 12. GitHub Issue

An accompanying GitHub Issue will be filed with the title:

```
chore: drop Copilot/Codex platform outputs — Claude Code only
```

Body will summarize §1 (motivation) and §7 (PR split), and link back to this file.

Label: `refactor` (present in the repo label set; see `gh label list`).

---

## 13. References

- `.claude/rules/aphelion-overview.md` — workflow overview (canonical)
- `.claude/rules/sandbox-policy.md` — sandbox detection (unchanged by this work)
- `docs/wiki/DESIGN.md` — wiki information architecture (updated in §5.6)
- Commit `b02868d` — "feat: add GitHub Copilot and OpenAI Codex multi-platform support" (original)
- Commit `3be1992` — "refactor: unify scripts runtime to Node.js (generate.py → generate.mjs)"
