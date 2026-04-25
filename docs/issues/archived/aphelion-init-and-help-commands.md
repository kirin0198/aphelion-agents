# `/aphelion-init` and `/aphelion-help` slash commands

> Reference: current `main` (HEAD `3fd16cf`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the fix will be executed in a follow-up `developer` phase
> GitHub Issue: [#39](https://github.com/kirin0198/aphelion-agents/issues/39)

---

## 1. Background & Motivation

`.claude/commands/` already ships 12 slash commands (one per orchestrator / standalone
agent / safety helper), but two everyday entry points are missing:

1. **A first-run rules-setup entry.** After `npx aphelion-agents init`, the user has
   `.claude/` files on disk but no project-specific `project-rules.md`. The
   `rules-designer` agent exists for exactly this purpose but is not surfaced as a
   slash command, so users must type `/agents` and pick it manually, or invoke the
   agent name verbatim.
2. **A discoverability entry.** There is no in-session way to enumerate Aphelion's
   slash commands. Users must `ls .claude/commands/` from a shell. Claude Code's
   built-in `/help` covers Claude Code itself, not Aphelion.

Issue #39 proposes adding `/aphelion-init` and `/aphelion-help`. The `aphelion-`
prefix is mandatory: Claude Code reserves `/init` (CLAUDE.md generation) and `/help`
(CLI help), and we need to coexist without shadowing either.

---

## 2. Inventory of existing `.claude/commands/`

12 files at HEAD `3fd16cf`:

| Command | Domain | One-liner |
|---------|--------|-----------|
| `discovery-flow` | Orchestrator | Discovery domain orchestrator (interview → research → poc → rules → scope) |
| `delivery-flow` | Orchestrator | Delivery domain orchestrator (spec → ux → architect → … → releaser) |
| `operations-flow` | Orchestrator | Operations domain orchestrator (infra → db-ops → observability → ops-planner) |
| `maintenance-flow` | Orchestrator | Maintenance domain orchestrator (Patch / Minor / Major triage) |
| `pm` | Shortcut | Quick Delivery launch when requirements are already clear |
| `analyst` | Standalone agent | Issue analysis on existing projects (bug / feature / refactor) |
| `codebase-analyzer` | Standalone agent | Reverse-engineer SPEC.md / ARCHITECTURE.md from an existing codebase |
| `rules-designer` | Standalone agent | Generate `.claude/rules/project-rules.md` interactively |
| `reviewer` | Standalone agent | Code review against SPEC.md / ARCHITECTURE.md |
| `tester` | Standalone agent | Run / generate tests against TEST_PLAN.md |
| `secrets-scan` | Safety | Grep-based scan for hardcoded secrets |
| `vuln-scan` | Safety | Tech-stack-aware dependency vulnerability scan |

Note the existing format. Each agent-launching command is 1-3 sentences plus a
`$ARGUMENTS` placeholder. `secrets-scan.md` and `vuln-scan.md` are longer because
they encode an actual procedure rather than launching an agent. Examples:

`analyst.md`:
```
Launch the analyst agent (issue analysis and approach decision).

Receive a bug report, feature addition, or refactoring issue, and determine the approach and update documentation.
Review existing SPEC.md and ARCHITECTURE.md, classify and analyze the issue,
and then request user approval of the proposed approach.

User requirements:
$ARGUMENTS
```

`rules-designer.md`:
```
Launch the Rules Designer agent (project rules definition).

Read INTERVIEW_RESULT.md, and through dialogue with the user, determine project-specific coding conventions,
Git rules, build commands, and other standards. Generate a CLAUDE.md file in the project root.

$ARGUMENTS
```

(Side note: that "Generate a CLAUDE.md" wording is stale — `rules-designer` writes
`.claude/rules/project-rules.md`, not `CLAUDE.md`. Out of scope here, but flagged
for a doc-cleanup follow-up.)

The naming pattern is consistent: lowercase-with-hyphens, file basename equals the
slash-command name. `delivery-flow` and `maintenance-flow` confirm hyphens are
permitted in arbitrary positions, so `aphelion-init` and `aphelion-help` are
syntactically fine. No name collision exists today (verified via
`ls .claude/commands/`).

---

## 3. Concrete content for the two new commands

### 3.1 `.claude/commands/aphelion-init.md`

```
Launch the Rules Designer agent for first-run project setup.

Use this immediately after `npx aphelion-agents init` to populate
`.claude/rules/project-rules.md` interactively. The agent asks about language /
framework, Git conventions, build commands, output language, and Co-Authored-By
policy, then writes the rules file used by every subsequent agent.

If `.claude/rules/project-rules.md` already exists, the agent will detect it and
ask whether to amend or recreate. INTERVIEW_RESULT.md is optional; running this
command standalone (without prior Discovery artifacts) is supported.

User requirements:
$ARGUMENTS
```

Rationale:
- One-liner equivalents (e.g. just `Launch rules-designer.`) work, but the existing
  command files all carry a 2-3 line context paragraph. Matching that tone keeps
  the file inventory homogeneous.
- We do NOT pre-check `project-rules.md` existence in the command body — that is
  `rules-designer`'s own responsibility (the agent already reads existing files at
  startup). The command body just calls out the behavior so the user knows what to
  expect.
- `$ARGUMENTS` is preserved so the user can pass extra hints
  (e.g. `/aphelion-init Python + FastAPI, English output`).

### 3.2 `.claude/commands/aphelion-help.md`

Pre-rendered (static) listing. The body IS the listing; no runtime enumeration of
`.claude/commands/`. See decision matrix D2 below for the trade-off analysis.

```
Show the list of Aphelion slash commands available in this session.

Aphelion ships the slash commands below under `.claude/commands/`. Claude Code
built-ins (`/init`, `/help`, `/clear`, `/agents`, etc.) are not Aphelion's
responsibility and are not listed here — run `/help` for those.

## Orchestrators (full domain flows)

| Command | Purpose |
|---------|---------|
| `/discovery-flow` | Requirements exploration: interview → research → PoC → rules → scope |
| `/delivery-flow` | Design & implementation: spec → ux → architect → … → releaser |
| `/operations-flow` | Deploy & operate (service only): infra → db-ops → observability → ops-planner |
| `/maintenance-flow` | Existing-project changes: Patch / Minor / Major triage and execution |

## Shortcuts

| Command | Purpose |
|---------|---------|
| `/pm` | Quick Delivery launch when requirements are already clear (skips Discovery) |
| `/aphelion-init` | First-run project rules setup (launches `rules-designer`) |

## Standalone agents

| Command | Purpose |
|---------|---------|
| `/analyst` | Classify and analyze an issue (bug / feature / refactor) on an existing project |
| `/codebase-analyzer` | Reverse-engineer SPEC.md / ARCHITECTURE.md from an existing codebase |
| `/rules-designer` | Generate or update `.claude/rules/project-rules.md` interactively |
| `/reviewer` | Code review against SPEC.md and ARCHITECTURE.md |
| `/tester` | Run or generate tests against TEST_PLAN.md |

## Safety helpers

| Command | Purpose |
|---------|---------|
| `/secrets-scan` | Grep-based scan for hardcoded secrets in the repo |
| `/vuln-scan` | Dependency vulnerability scan (tech-stack auto-detected) |

## Discoverability

| Command | Purpose |
|---------|---------|
| `/aphelion-help` | Show this list |

For details on any command, open `.claude/commands/<name>.md`. Agent definitions
live under `.claude/agents/` and rules under `.claude/rules/`.
```

This is 14 entries (12 existing + 2 new). Size after frontmatter: ~50 lines. The
listing is grouped by the same domains used in `aphelion-overview.md` so users
familiar with Aphelion's mental model can find what they want quickly.

---

## 4. Decision matrix

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | What does `/aphelion-init` do? | (a) launch `rules-designer` directly, (b) wrap with extra orchestration (detect missing `INTERVIEW_RESULT.md`, ask whether to run Discovery first, etc.) | **(a) launch directly** — keeps the command shape identical to the existing 10 agent-launchers; `rules-designer` already handles missing-input cases. Wrapping adds branching that duplicates the agent's own logic. |
| D2 | Static vs runtime listing for `/aphelion-help` | (a) static markdown body (hard-coded), (b) instruct the agent to enumerate `.claude/commands/*.md` at runtime | **(a) static markdown** — runtime enumeration is unreliable in slash-command bodies (the body is interpreted as a prompt, not executed code) and produces inconsistent formatting across sessions. Maintenance burden is the trade-off, addressed by ADR-001. |
| D3 | Include Claude Code built-ins (`/init`, `/help`, `/clear`, `/agents`) in the listing? | (a) yes, (b) no | **(b) no** — those are platform commands, not Aphelion's; including them blurs ownership and risks drifting out of date with Claude Code releases. Mention `/help` in the preamble as the pointer for built-ins, nothing more. |
| D4 | Should `/aphelion-init` accept arguments? | (a) yes (`$ARGUMENTS`), (b) no | **(a) yes** — symmetry with every other agent-launcher; lets users pass hints like `/aphelion-init Python only`. |
| D5 | README / wiki Getting Started update — in this PR or split? | (a) in this PR (small, additive), (b) split | **(a) in this PR** — a single line change in README.md / README.ja.md and the equivalent in `docs/wiki/{en,ja}/Getting-Started.md` is mechanical; splitting it leaves the new commands undocumented in the meantime. |
| D6 | Version bump | (a) `0.3.1` → `0.3.2` (patch), (b) `0.3.1` → `0.4.0` (minor) | **(a) `0.3.2`** — additive, no breaking change to existing commands or CLI. Per the post-#43 policy any `.claude/commands/` change requires *some* bump; patch is the right granularity here. |
| D7 | CHANGELOG.md entry | (a) under Added, (b) under Changed, (c) skip | **(a) Added** — two new files = one Added entry. |
| D8 | Update the stale "CLAUDE.md" wording in `rules-designer.md` command body? | (a) yes, fix it here, (b) leave it for a separate doc-cleanup ticket | **(b) separate ticket** — out of #39's scope; flagging it in this doc is enough for now. Keeps PR diff focused. |
| D9 | PR split | (a) single PR (commands + version bump + CHANGELOG + README/wiki), (b) two PRs | **(a) single PR** — same surface, same risk class. ~5 files touched. |

---

## 5. ADRs

### ADR-001 — Static listing in `/aphelion-help`, not runtime enumeration

- **Status**: proposed
- **Context**: A slash-command file's body becomes the prompt sent to Claude Code
  when the user invokes it. Asking the model to "enumerate `.claude/commands/`
  and produce a table" works in principle but yields inconsistent formatting
  (column widths, ordering, group naming all drift between runs) and burns tokens
  on a task that is functionally a static lookup.
- **Decision**: Hard-code the table in `aphelion-help.md`.
- **Consequence**: When a contributor adds a new command (rare — 12 commands
  added across the project's lifetime), they MUST also add a row to
  `aphelion-help.md`. This is a low-frequency obligation.
- **Mitigation**: Add a one-line note to `docs/wiki/{en,ja}/Contributing.md`'s PR
  checklist: "If this PR adds or removes a `.claude/commands/*.md` file, update
  `aphelion-help.md` to match." (Optional in this PR; can be deferred. See Q4.)
- **Alternative considered**: Hybrid — keep the static table but instruct the
  agent to flag drift if it notices a missing entry. Rejected as over-engineered
  for the current command-count cardinality (~12).

### ADR-002 — Single PR bundles commands + docs + version bump

- **Status**: proposed
- **Context**: The change touches `.claude/commands/aphelion-init.md` (new),
  `.claude/commands/aphelion-help.md` (new), `package.json` (version),
  `CHANGELOG.md`, `README.md` / `README.ja.md`, and
  `docs/wiki/{en,ja}/Getting-Started.md`. All serve the same goal: ship two new
  slash commands with the discoverability they need.
- **Decision**: One PR.
- **Consequence**: ~7 file diff. Reviewable in one pass. Contrast with the recent
  PR #38 + #41 split for #36 — that split was justified because it removed code
  in step 1 and updated language conventions in step 2. No analogous separation
  exists here.

### ADR-003 — Don't pre-check existing `project-rules.md` in `/aphelion-init`

- **Status**: proposed
- **Context**: A reasonable concern is "what if the user runs `/aphelion-init`
  twice and clobbers their rules?" One option is for the slash command body to
  pre-check existence and warn.
- **Decision**: Delegate that check to `rules-designer` itself. The slash command
  body just routes to the agent.
- **Consequence**: `rules-designer` already reads existing files via the `Read`
  tool at startup (per `.claude/agents/rules-designer.md`). It can surface a
  "rules already exist — overwrite or amend?" question via `AskUserQuestion`.
  Pre-checking in the slash command body would duplicate that logic.
- **Risk if rules-designer doesn't currently handle re-runs**: The agent's
  `## Workflow` describes interactive rule determination starting from a blank
  slate. If it does NOT detect existing `project-rules.md` and just overwrites,
  that is a `rules-designer` bug, not an `/aphelion-init` bug. Out of scope here.
  Recommend filing as a separate ticket if confirmed. (See Q5.)

---

## 6. Specific edit plans

> Line numbers reflect HEAD `3fd16cf`.

### 6.1 `.claude/commands/aphelion-init.md` (new)

Content as specified in §3.1.

### 6.2 `.claude/commands/aphelion-help.md` (new)

Content as specified in §3.2.

### 6.3 `package.json`

```diff
-  "version": "0.3.1",
+  "version": "0.3.2",
```

### 6.4 `CHANGELOG.md`

Append under `## [Unreleased]` → `### Added`:

```markdown
- `/aphelion-init` slash command — first-run shortcut to launch `rules-designer`
  for project-specific rules setup. Use immediately after
  `npx aphelion-agents init`. (#39)
- `/aphelion-help` slash command — lists all Aphelion slash commands organised
  by domain (orchestrators / shortcuts / standalone agents / safety helpers).
  Claude Code built-ins are intentionally excluded. (#39)
```

### 6.5 `README.md`

After the existing `update` example block (~line 52) and before the "Cache caveat"
heading, add:

```markdown
After installing, run `/aphelion-init` inside Claude Code to set up
`project-rules.md` interactively. Run `/aphelion-help` any time to list all
Aphelion slash commands.
```

### 6.6 `README.ja.md`

JA mirror of §6.5.

### 6.7 `docs/wiki/en/Getting-Started.md`

In the "First Run Walkthrough" section, before "Step 2: Start Discovery", insert
a new step:

```markdown
**Step 1.5: Initialise project rules (recommended)**

```
/aphelion-init
```

Generates `.claude/rules/project-rules.md` through a short interactive
session. Run `/aphelion-help` at any time for the full list of Aphelion slash
commands.
```

### 6.8 `docs/wiki/ja/Getting-Started.md`

JA mirror of §6.7.

### 6.9 `site/` mirror

Run `node scripts/sync-wiki.mjs` to mirror wiki changes into `site/`.

---

## 7. Acceptance Criteria

Refined from issue #39's "受入条件":

1. [ ] `.claude/commands/aphelion-init.md` exists; running `/aphelion-init`
       launches `rules-designer`.
2. [ ] `.claude/commands/aphelion-help.md` exists; running `/aphelion-help`
       displays the full slash-command listing grouped by domain.
3. [ ] No name collision with existing `.claude/commands/*.md` or Claude Code
       built-ins (`/init`, `/help`, `/clear`, `/agents`).
4. [ ] All 12 existing commands appear in the `/aphelion-help` listing, plus
       the two new ones (14 total). Ordering matches §3.2.
5. [ ] `package.json` version bumped to `0.3.2`.
6. [ ] `CHANGELOG.md` `[Unreleased]` section has an `Added` entry referencing
       both new commands and #39.
7. [ ] README.md and README.ja.md mention `/aphelion-init` in Getting Started.
8. [ ] `docs/wiki/{en,ja}/Getting-Started.md` mention `/aphelion-init` (with
       site/ mirror updated).
9. [ ] Distribution check: `npm pack --dry-run` lists both new files under
       `.claude/commands/`.

---

## 8. Test Plan (for the implementation phase)

The executing `developer` should verify, after edits:

1. `ls .claude/commands/ | wc -l` returns 14 (was 12).
2. `cat .claude/commands/aphelion-help.md` lists 14 commands with the four
   group headings.
3. `npm pack --dry-run` shows both new files and version `0.3.2`.
4. Manual: in a Claude Code session against a fresh checkout, type
   `/aphelion-` and confirm tab-completion (or autocomplete equivalent) shows
   `aphelion-init` and `aphelion-help`.
5. Manual: run `/aphelion-init` and confirm `rules-designer` launches.
6. Manual: run `/aphelion-help` and confirm the listing matches §3.2.
7. `git diff --stat` shows ~7 files changed (commands × 2, package.json,
   CHANGELOG, README × 2, wiki × 2, site mirror).

---

## 9. Out of Scope

Per issue #39's "非スコープ" plus this analyst's clarifications:

- **CLI changes (`bin/aphelion-agents.mjs`).** The `init` / `update`
  subcommands stay as-is.
- **`rules-designer` agent body changes.** Including the stale "CLAUDE.md"
  wording in `.claude/commands/rules-designer.md` (D8). Separate ticket.
- **Runtime enumeration tooling for `/aphelion-help`.** Per ADR-001.
- **Inclusion of Claude Code built-ins in the listing.** Per D3.
- **Auto-detection of existing `project-rules.md` from inside the slash
  command.** Per ADR-003 — that is `rules-designer`'s responsibility.

---

## 10. Handoff to `architect`

`architect` needs to:

1. Confirm Q1-Q5 once the user signs off (or adjust if the user overrides).
2. Confirm no `ARCHITECTURE.md` update is required — `aphelion-agents` itself
   has no root-level `ARCHITECTURE.md`, and the wiki `Architecture-*.md` files
   describe the agent model, not the slash-command surface.
3. Hand a single TASK.md to `developer` covering, in order:
   - create `.claude/commands/aphelion-init.md`
   - create `.claude/commands/aphelion-help.md`
   - bump `package.json` version to `0.3.2`
   - append `CHANGELOG.md` `[Unreleased]` → `Added`
   - update `README.md` Getting Started
   - update `README.ja.md` Getting Started
   - update `docs/wiki/en/Getting-Started.md`
   - update `docs/wiki/ja/Getting-Started.md`
   - run `node scripts/sync-wiki.mjs` to refresh `site/`
4. Decide whether `tester` needs to be involved. Recommendation: **no** — the
   change is a static-content addition with no executable code path. The
   manual test plan in §8 suffices.

---

## 11. References

- `.claude/commands/*.md` — existing command-file format reference (12 files)
- `.claude/agents/rules-designer.md` — agent that `/aphelion-init` launches
- `package.json` — version field (current `0.3.1`)
- Issue #39 — feature request (this document's authority for scope)
- `docs/issues/cli-update-rules-bug.md` — template / tone reference for this
  planning doc; also the source of the "any `.claude/commands/` change requires
  a version bump" policy adopted in D6
- HEAD `3fd16cf` — current `main` baseline for line-number references

---

## 12. Open Questions (awaiting user sign-off)

The following resolutions are **proposed**; the user's reply confirms or
overrides each.

- Q1 (D2, ADR-001): Static markdown table for `/aphelion-help` (no runtime
  enumeration)?
- Q2 (D3): Exclude Claude Code built-ins from the `/aphelion-help` listing,
  with one preamble line pointing users at `/help` for built-ins?
- Q3 (D5): Include README and wiki Getting-Started updates in this same PR
  (versus a doc-only follow-up)?
- Q4 (ADR-001 mitigation): Add a one-line "if you add a `.claude/commands/*.md`
  file, also add a row to `aphelion-help.md`" entry to the wiki Contributing.md
  PR checklist in this PR? (Default: yes if Q3 is yes.)
- Q5 (ADR-003): If `rules-designer` does not currently detect existing
  `project-rules.md` on re-run, file a separate ticket — confirm we do not
  block #39 on that?
