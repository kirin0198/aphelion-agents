# Deny-List Permission Policy — Loosen Defaults, Deny Only Destructive Commands

> Reference: current `main` (HEAD `0632dd3`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the fix will be executed in a follow-up `developer` phase
> GitHub Issue: [#31](https://github.com/kirin0198/aphelion-agents/issues/31) (with two follow-up comments dated 2026-04-24)

---

## 1. Background & Motivation

### 1.1 Reported symptom (issue body)

During PR #29, ordinary commands invoked by sub-agents kept being denied by Claude Code's
permission guards. Four concrete cases were recorded:

| Denied command | Denial source (claimed) | Destructiveness | User assessment |
|----------------|-------------------------|-----------------|-----------------|
| `gh issue create ...` (analyst sub-agent) | sandbox "External System Write" | None (write API but reversible) | Excessive |
| `git push -u origin feat/maintenance-flow` | auto-mode heuristic ("non-session branch") | Non-force push is non-destructive | Excessive |
| `Read ~/.claude/settings.local.json` | "out of project scope" | Read-only | Excessive |
| `cat ~/.claude/settings.json` | Same as above | Read-only | Excessive |

The current `.claude/settings.local.json` shipped at `<packageRoot>/.claude/settings.local.json`
declares `allow: ["*", ...]` plus only two `deny` entries (`git push --force *`, `Read(./.env)`).
The user's framing: this is the worst of both worlds — wide allow lets dangerous commands
through, while a separate, **uncontrollable**, layer (Claude Code's auto-mode heuristics) blocks
benign ones. The proposal is to flip to a **deny-list** approach: keep `allow: ["*"]` but
explicitly enumerate destructive patterns under `deny`.

### 1.2 Follow-up comment 1 (2026-04-24) — one-shot escalation

While cleaning up after PR #29 (`rm -rf site/dist.bak.<timestamp>`), the user found:

1. Sandbox refuses `rm -rf site/dist.bak.*`.
2. Agent surfaces an `AskUserQuestion` asking "delete? (recommended)".
3. User selects "delete".
4. **Sandbox refuses again on retry**.
5. User has to drop to the chat input and type `!rm -rf …` manually.

The user reads this as: deny-list is binary (permanent yes/no) with no concept of
"approved this exact invocation, just this once". They request a "one-shot escalation"
mechanism: when a deny-listed command has been explicitly approved through `AskUserQuestion`,
the next single execution of that exact command (matched on full argv) should pass.

The user proposes four design candidates (see issue), preferring **C (preToolUse hook)**
combined with **A (one-shot token)**.

### 1.3 Follow-up comment 2 (2026-04-24) — denial-category disambiguation

Subsequent investigation revealed the `rm -rf site/dist.bak.<timestamp>` failure was **not**
a sandbox refusal at all. The directory contained sub-paths owned by `root:root` (created
by an earlier Docker build run as root). The non-root user `ysato` literally cannot remove
those entries — POSIX returns `EACCES`/`EPERM`. Both the user *and the agent* misread the
error as "policy denial" and ran the (futile) approval flow. The actual fix would have
been `sudo chown -R $USER site/dist.bak.*` followed by `rm -rf …`.

The user therefore wants agents to distinguish denial **categories**:

| Category | Detection | Recommended user action |
|----------|-----------|--------------------------|
| `sandbox_policy` | Matches a deny entry in `.claude/settings.local.json` | `AskUserQuestion` → one-shot escalation |
| `os_permission` | `EACCES` / `EPERM` / non-owner write to root-owned path | `sudo` or `chown -R $USER` |
| `file_not_found` | `ENOENT` | Re-check path |
| `platform_heuristic` | Claude Code auto-mode (branch protection, "External System Write", etc.) | Manual fallback or context re-evaluation |

Concretely: surface the category, and (for `os_permission`) include a `ls -la` / `stat`
hint identifying the offending owner so the user can pick the right remediation.

### 1.4 Goal

Three concerns to address, in priority order:

1. **Settings template revision.** Replace the current `.claude/settings.local.json` with a
   deny-list template that enumerates the categories already documented in
   `src/.claude/rules/sandbox-policy.md` §1.
2. **Denial transparency.** Give agents a concrete protocol for diagnosing *which layer*
   denied a Bash command and what to do for each category. Adding this protocol as an
   auto-loaded rule (`src/.claude/rules/denial-categories.md`) makes it visible to every
   Bash-owning agent without per-agent edits.
3. **Recovery runbook.** Document the manual `!command` shell-prompt fallback as the
   officially-supported escape hatch for the case Claude Code's sandbox refuses even after
   `AskUserQuestion` approval (comment 1's observed bug). This is **not** a workaround we
   can engineer away from inside Aphelion — see §3 — so we treat it as a documented
   recovery path with clear "when to use" guidance.

The bug is **not** "Aphelion's deny rules are wrong". It is two separate pathologies:
(a) the existing settings template is too permissive on the deny side and too noisy on the
allow side; (b) agents have no shared vocabulary for diagnosing denials, so they retry the
wrong fix repeatedly.

---

## 2. Current Inventory

### 2.1 What controls a Bash command's fate today

There are **three** layers, not two as the issue body implies. In execution order:

| # | Layer | Source of truth | Aphelion can control? |
|---|-------|-----------------|------------------------|
| 1 | Pre-tool: Claude Code auto-mode heuristics | Internal to Claude Code (branch protection, "External System Write" detection, scope checks for `~/...` reads) | **No** — not configurable from `settings.json`. |
| 2 | Pre-tool: `permissions.{allow,deny,defaultMode}` in `.claude/settings.local.json` | This repo (shipped in tarball) | **Yes** — directly. |
| 3 | Tool execution (Bash → POSIX) | OS kernel | **No** — but Aphelion can teach agents to *recognise* the resulting errors. |

`src/.claude/rules/sandbox-policy.md` is a fourth, **advisory** layer: it categorises commands
into `destructive_fs / prod_db / privilege_escalation / secret_access / external_net`, and
asks agents to delegate to `sandbox-runner` for `required` categories. It is **not enforced**
— it is read-only guidance the agents are asked to follow. The settings.json `deny` list is
the only enforcement Aphelion ships.

### 2.2 Current `.claude/settings.local.json` (HEAD `0632dd3`)

```json
{
  "permissions": {
    "allow": ["*", "Bash(git commit:*)", "Bash(git add:*)", "Bash(gh:*)"],
    "deny": ["Bash(git push --force *)", "Read(./.env)"]
  },
  "outputStyle": "default"
}
```

Observations:

- The redundant `Bash(git commit:*)`, `Bash(git add:*)`, `Bash(gh:*)` entries inside `allow`
  are no-ops because `*` already covers them. They date from before `*` was added; they are
  noise we can drop.
- `deny` covers exactly **one destructive category** (forced git push) and **one secret
  pattern** (`./.env`). Compared to `sandbox-policy.md` §1, this is missing `destructive_fs`,
  `prod_db`, `privilege_escalation`, `secret_access` (broad), and `external_net` (publish
  commands).
- `defaultMode` is unset, so Claude Code uses its built-in default (currently `default`,
  i.e. ask for unknown tools). The issue body proposes `"defaultMode": "acceptEdits"`,
  which biases toward auto-accepting Edit tool actions (orthogonal to Bash deny-list).

### 2.3 How the file ships

Per PR #46 (issue #44), the canonical `.claude/rules/` source moved to `src/.claude/rules/`.
The CLI (`bin/aphelion-agents.mjs:117-150`) overlays rules from there at `init`/`update` time.
**Settings shipping is unchanged**: `<packageRoot>/.claude/settings.local.json` is included
in the tarball and copied to the target on `init`. On `update`, the target's existing
`settings.local.json` is preserved (filter at `cp` time). **Net effect**: the template ships
once at `init`; future template revisions do not propagate to existing consumers without
manual intervention.

This is intentional and correct (consumers may have customised their settings), but it has
an implication for this work: a bad template revision is hard to retract. We must ship the
new template confidently the first time, because users on stale `init`'d trees won't
automatically pick up corrections.

### 2.4 How agents reference the existing policy today

`grep -l sandbox-policy .claude/agents/*.md` returns 13 agents (all Bash owners). Every
match is a single-line directive of the form:

```
> Follows `.claude/rules/sandbox-policy.md` for command risk classification and delegation to `sandbox-runner`.
```

There is **no** existing per-agent guidance for: (a) what to do when a Bash invocation
fails with `Permission denied`, (b) how to distinguish a sandbox refusal from a POSIX
permission error, or (c) when to invoke `AskUserQuestion` for escalation. The wider issue
in comment 1 (sandbox refuses post-approval) is therefore **plausible**: agents currently
have no protocol that says "if the user approved through `AskUserQuestion`, surface the
manual `!cmd` fallback and stop retrying the same blocked path".

`sandbox-runner.md` has a `decision: asked_and_allowed` enum value but no implementation
of one-shot escalation in the actual deny-list mechanism (which lives in settings.json,
which sandbox-runner doesn't write to).

### 2.5 Mapping the four denied cases from §1.1 to layers

| Denied command | Likely layer | Aphelion control |
|----------------|--------------|-------------------|
| `gh issue create` from analyst sub-agent | (1) auto-mode heuristic — sub-agent context "External System Write" | None. Workaround: parent agent runs `gh` itself and passes results down, or user approves the sub-agent. |
| `git push -u origin feat/...` | (1) auto-mode heuristic — non-session branch | None. Workaround: explicit user approval, or `git push origin HEAD` from the session's checkout. |
| `Read ~/.claude/settings.local.json` | (1) auto-mode heuristic — out-of-project read | None directly. The `Read` tool's home-dir scope check is a Claude Code default. Workaround: use `Bash(cat ~/.claude/settings.local.json)` (which our deny-list would *not* deny) and accept that the read happens via Bash. |
| `cat ~/.claude/settings.json` | (1) auto-mode heuristic — same as above | Same. |

**Key finding**: zero of the four canonical "excessive denial" cases in the issue body are
fixed by changes to `settings.local.json`. They are all heuristic refusals at layer 1,
which Aphelion does not control. The deny-list refresh is therefore valuable for **layer 2
correctness** (the dangerous-command coverage gap) but does **not** by itself relieve the
specific friction the issue opens with. The runbook in §6 has to acknowledge this honestly.

---

## 3. In Scope vs. Out of Scope

### 3.1 In scope (Aphelion can ship)

- **S1.** Revise `<packageRoot>/.claude/settings.local.json` to a deny-list shape covering
  every category in `src/.claude/rules/sandbox-policy.md` §1.
- **S2.** Add `src/.claude/rules/denial-categories.md` — a new auto-loaded rule documenting
  the four denial categories, detection signals, and recommended remediation per category.
  Auto-loads from the same directory as the other rules; no per-agent prompt edits beyond
  one cross-reference line.
- **S3.** Add a one-line cross-reference in each Bash-owning agent's prompt body pointing to
  `denial-categories.md` (mirroring the existing `sandbox-policy.md` reference). 13 agents
  total; mechanical edit.
- **S4.** Add a "manual `!cmd` fallback" runbook section to `denial-categories.md`
  documenting the case where `AskUserQuestion` approval does not unblock the sandbox
  (comment 1's observation). This is the **honest** documentation of an external limitation.
- **S5.** Update `docs/wiki/{en,ja}/Contributing.md` (or equivalent) with a "Sandbox &
  permissions" subsection summarising the deny-list policy, the category vocabulary, and
  the manual fallback. Cross-links to `denial-categories.md`.
- **S6.** Bump `package.json` version per the policy in #43 (any change under `.claude/**`
  or `src/.claude/**` requires a bump). Add a CHANGELOG entry.

### 3.2 Out of scope (Aphelion cannot fix from inside)

- **O1.** Claude Code auto-mode heuristics. The four §1.1 denials all live here. Best
  Aphelion can do is *document* them and recommend either (a) per-invocation user approval,
  (b) running the command from the parent (non-sub-agent) session, or (c) the manual `!cmd`
  fallback. We will not "fix" them.
- **O2.** A first-class one-shot escalation mechanism that automatically forwards
  `AskUserQuestion` approval into a sandbox bypass. This is what comment 1 wants. The
  observed bug (sandbox still refuses post-approval) is a Claude Code platform behavior, not
  a settings.json artifact — there is no `settings.local.json` field that says "this command
  was approved via AskUserQuestion, allow the next invocation". The four design candidates
  in comment 1 (A/B/C/D) all require either Claude Code platform support (A, B, C via hooks)
  or fall back to manual user action (D). Of these, only D is implementable today; A/B/C
  require either a Claude Code feature or a hook-system contract that we don't have.
- **O3.** A first-party `preToolUse` hook implementation. Claude Code's hook system exists
  but the contract for *one-shot* allowlisting (rather than always-allow or always-deny) is
  not documented. We could prototype a hook that prompts the user and writes a token file,
  with the next Bash invocation reading the token before executing — but: (a) this duplicates
  the AskUserQuestion logic the agent already runs, (b) the token-file approach has obvious
  TOCTOU concerns, (c) we'd be the only consumer of an undocumented hook surface. ADR-002
  argues for deferring this until upstream documents the surface.
- **O4.** Removing the `~/.claude/` global rules tree. Out of scope per #44 / PR #46 (already
  resolved by relocating `rules/` to `src/.claude/rules/`).

### 3.3 What we owe the user honestly

The issue body has 11 acceptance criteria. Of those:

- 8 (the destructive-command cases) are addressable in scope via S1.
- 1 (the one-shot escalation) is **not addressable** without Claude Code platform support;
  we'll close it by documenting the manual `!cmd` fallback (S4) and reframe the AC.
- 2 (denial-category surfacing for `sandbox_policy` vs `os_permission`) are addressable
  via S2/S3 — agents will diagnose post-hoc from `stderr` patterns rather than getting
  category metadata from a sandbox API (which doesn't exist today).

§9 spells out the reframed acceptance criteria.

---

## 4. Decisions to Make

Listed with the analyst's recommendation in bold. User confirmation requested at §11.

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | Adopt the issue body's deny-list draft verbatim, or refine? | (a) verbatim, (b) refine to harmonise with `sandbox-policy.md` §1, (c) minimal changes only | **(b) refine** — a few entries in the draft are too greedy (e.g. `Bash(sudo*)` is correct but `Bash(git clean -f*)` will block legitimate `git clean -f -d` in throwaway test trees). See §5.1. |
| D2 | `defaultMode` value | (a) unset (Claude Code default), (b) `"acceptEdits"`, (c) `"plan"`, (d) explicitly `"default"` | **(a) unset** — the Edit-tool default doesn't directly touch the deny-list use case. Adding `acceptEdits` is a separate UX decision (auto-accept file edits) that confuses this PR's scope. Drop it from the draft. |
| D3 | Where does denial-category guidance live? | (a) new `src/.claude/rules/denial-categories.md`, (b) new section appended to `sandbox-policy.md`, (c) inline in each agent | **(a) new file** — `sandbox-policy.md` is already long and is about *prevention* (delegation/categories before execution). Denial categories are about *post-failure* diagnosis. Different lifecycle, different file. Keeps each rule focused. |
| D4 | Should agents reference `denial-categories.md` via the same one-liner pattern as `sandbox-policy.md`? | (a) yes (mirror existing pattern), (b) embed inline in each agent | **(a) yes** — mirror the existing convention. 13 mechanical edits. |
| D5 | Do we attempt a `preToolUse` hook prototype now? | (a) yes (case A from comment 1), (b) no, ship documented manual fallback only | **(b) no** — see §3.2 O3 and ADR-002. We don't have a clean Claude Code hook contract for "one-shot allow" today. Document the manual fallback (`!cmd`) as the honest interim. Revisit in a follow-up issue if Claude Code adds a documented hook for this. |
| D6 | Should `denial-categories.md` include a decision tree (flowchart) or just a table? | (a) table only, (b) table + small decision tree | **(b)** — agents follow flowcharts well. Keep it ≤10 lines. |
| D7 | Bundle settings revision + denial-categories rule in one PR or split? | (a) one PR, (b) two PRs | **(a) one PR** — they are co-designed (the rule explains how to react to a deny, the deny-list is what gets reacted to). Reviewer reads the change as a unit. |
| D8 | What to do about the four `allow` redundancies (`git commit:*`, `git add:*`, `gh:*` already covered by `*`)? | (a) drop them, (b) keep them as documentation of intent | **(a) drop** — keeping no-op entries that look like overrides is misleading. The whitelist of "expected commands" belongs in README/wiki, not in JSON. |
| D9 | Should `denial-categories.md` recommend specific shell snippets for `os_permission` (e.g. `sudo chown -R $USER {path}`)? | (a) yes, (b) no — too prescriptive | **(a) yes** — concretely, "if you see `EACCES` and `ls -la` shows `root` ownership, run `sudo chown -R $USER {path}` before retrying". Saves 30 minutes the next time the dist-backup case recurs. Keep examples in a fenced block; agent copies the suggested command into its `AskUserQuestion`. |
| D10 | Should we add a smoke test that verifies the deny-list is picked up by Claude Code? | (a) yes, (b) no — manual verification only | **(b) no** — the deny-list's effect is observed via Claude Code's behavior, which we cannot script from outside. The smoke test would have to drive Claude Code interactively, which we don't have infrastructure for. Manual verification per §10 is sufficient. |
| D11 | Should we propose upstream feedback to Anthropic on the comment 1 bug? | (a) yes (file as a Claude Code issue / feedback), (b) no | **(a) yes** — note in §11 that the user (or analyst, on user's request) should report "AskUserQuestion approval does not unblock subsequent sandbox-denied retries" to Anthropic. Out of scope for this PR's diff but on the table for follow-up. |
| D12 | Branch / PR title prefix | (a) `chore:`, (b) `docs:`, (c) `feat:` | **(a) `chore:`** — primarily a configuration / settings change, with documentation augmentation. Matches the issue body's prefix. |

---

## 5. Specific Edit Plans

> Line numbers reflect HEAD `0632dd3`.

### 5.1 `<packageRoot>/.claude/settings.local.json`

**Replace** the file with the deny-list shape below. Keys reorganised: `allow` becomes a
single wildcard (consistent with the deny-list mental model), `deny` exhaustively enumerates
each category, with a preceding line of comments grouping them by `sandbox-policy.md`
category for traceability. (Note: the file is JSON, not JSONC. We strip comments and rely
on key-grouping for human readability.)

```json
{
  "permissions": {
    "allow": ["*"],
    "deny": [
      "Bash(rm -rf /*)",
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(rm -rf ~/)",
      "Bash(dd of=/dev/*)",
      "Bash(mkfs *)",
      "Bash(mkfs.*)",
      "Bash(shred *)",
      "Bash(find * -delete)",

      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git push --force-with-lease*)",
      "Bash(git reset --hard origin/*)",
      "Bash(git update-ref -d*)",

      "Bash(sudo *)",
      "Bash(sudo)",
      "Bash(su -*)",
      "Bash(doas *)",
      "Bash(chmod 777*)",
      "Bash(chown root*)",

      "Read(./.env)",
      "Read(./.env.*)",
      "Read(**/credentials.*)",
      "Read(**/*.secret)",
      "Read(**/*.pem)",
      "Read(**/*.key)",
      "Bash(cat *.env)",
      "Bash(cat *.env.*)",
      "Bash(cat *credentials*)",
      "Bash(gh auth token)",

      "Bash(psql *prod*)",
      "Bash(psql *PRODUCTION*)",
      "Bash(mongosh *prod*)",
      "Bash(mysql *--host=*prod*)",

      "Bash(npm publish*)",
      "Bash(cargo publish*)",
      "Bash(twine upload*)"
    ]
  },
  "outputStyle": "default"
}
```

Differences from the issue-body draft (per D1, D8):

- **Dropped** `"defaultMode": "acceptEdits"` (D2 — out of scope, separate decision).
- **Dropped** the trailing redundant entries `Bash(git commit:*)`, `Bash(git add:*)`,
  `Bash(gh:*)` from `allow` (D8 — covered by `*`).
- **Dropped** `Bash(git clean -f*)` and `Bash(git clean -fd*)` from the draft. `git clean
  -fd` is routine inside throwaway test trees and `worktrees/`. Damage potential is bounded
  to the current directory and is not in the same risk class as `rm -rf /`. Document in
  the runbook that an agent operating outside its expected cwd should still ask before
  `git clean`.
- **Dropped** `Bash(git branch -D*)` from the draft. Force-deleting a branch is recoverable
  (reflog) and is a frequent legitimate operation in ops/maintenance flows. Same risk-class
  argument.
- **Dropped** `Bash(git reset --hard*)` (greedy form), **kept** `Bash(git reset --hard
  origin/*)` only. Rationale: the most destructive form of `--hard` is the one that throws
  away local work to match upstream; `git reset --hard HEAD~1` (rewinding by one) is a
  common workflow that should not require approval each time.
- **Added** `Read(**/*.pem)` and `Read(**/*.key)` to the secret group. The draft only had
  `*.secret`; PEM/key files are at least as sensitive.
- **Added** `Bash(sudo)` and `Bash(mkfs.*)` (without trailing space) to catch alternate
  forms.

### 5.2 New file: `src/.claude/rules/denial-categories.md`

```markdown
# Denial Categories

> **Last updated**: 2026-04-25
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every
> session start

This rule applies to all agents that own the `Bash` tool. When a `Bash` (or `Read`)
invocation fails or is refused, classify the failure into one of the categories below
**before retrying**. Retrying without diagnosing wastes user time and obscures the real
problem.

---

## 1. Categories

| Category | Detection | Recommended action | Avoid |
|----------|-----------|--------------------|-------|
| `sandbox_policy` | Stderr / tool-error contains "permission denied by …", "blocked by deny rule", or matches a pattern in `.claude/settings.local.json` `deny` | `AskUserQuestion` to confirm intent. If approved, run the command via the **manual `!cmd` fallback** (§3) — the sandbox cannot be unblocked from inside the agent. | Retrying the same command unmodified. Surfacing approval prompts in a loop. |
| `os_permission` | Stderr contains `Permission denied`, errno `EACCES` or `EPERM`. Often accompanied by a non-owner user attempting to write a `root`-owned path. | Run `ls -la {path}` (or `stat {path}`) to identify the owner. If owner is `root` and the agent is non-root: surface the diagnosis to the user and recommend `sudo chown -R $USER {path}` followed by retry. | Treating it as a sandbox denial. Issuing `AskUserQuestion` for "policy approval" — the policy was not the cause. |
| `file_not_found` | Stderr contains `No such file or directory`, errno `ENOENT` | Re-check the path. Run `ls {dirname}` to inspect what is there. Ask the user only if the path is genuinely ambiguous. | Recreating the file blindly. Switching to a different (wrong) path. |
| `platform_heuristic` | Tool-error mentions "External System Write", "non-session branch", "out-of-project read", or similar Claude Code auto-mode language. **Not** present in any settings.json file. | Honest report to the user: "Claude Code's auto-mode refused this. I cannot configure around it." Offer alternatives: parent-session retry, manual `!cmd` fallback, or split the workflow so the heuristic does not fire. | Editing `.claude/settings.local.json` to "fix" it — the file does not control this layer. |

---

## 2. Decision flow

```
Bash command fails
       │
       ▼
[Read stderr + exit code]
       │
       ├─ Matches deny pattern in settings.local.json or
       │   stderr says "permission denied by deny rule"
       │       └──▶ sandbox_policy → AskUserQuestion + §3 fallback
       │
       ├─ stderr contains "Permission denied" / EACCES / EPERM
       │       └──▶ os_permission → ls -la → recommend chown/sudo
       │
       ├─ stderr contains "No such file or directory" / ENOENT
       │       └──▶ file_not_found → re-check path
       │
       └─ Tool-error mentions Claude Code auto-mode language
               └──▶ platform_heuristic → honest report; do not edit settings
```

---

## 3. The manual `!cmd` fallback

When a deny-listed command is needed for legitimate cleanup and the user has explicitly
approved it via `AskUserQuestion`, the **agent cannot bypass the sandbox** — Claude Code
does not honor an in-conversation approval as a one-shot allowlist (verified in PR #29
cleanup, 2026-04-24). The supported recovery is:

1. The agent stops attempting the command.
2. The agent surfaces a single message containing the exact command to run.
3. The user pastes that command into the chat input prefixed with `!` (e.g.
   `!rm -rf /tmp/build-artefacts/`). The leading `!` runs the command directly in the
   user's shell, bypassing the agent's sandbox.
4. The agent resumes once the user reports completion.

Do **not** loop back into another `AskUserQuestion` after the first refusal-after-approval.
The user already approved; the failure is at the sandbox layer, not the user's intent.

---

## 4. Reporting in `AGENT_RESULT`

When a Bash command was denied or failed and the agent stopped:

```
DENIAL_CATEGORY: sandbox_policy | os_permission | file_not_found | platform_heuristic
DENIAL_COMMAND: {full command as attempted}
DENIAL_RECOVERY: {action taken or recommended — e.g. "user ran !cmd manually" / "user ran sudo chown" / "no recovery, escalated to user"}
```

These three fields are added to the standard `AGENT_RESULT` block when applicable. Omit
them when no denial occurred.

---

## 5. Auto-load Notes

- File location: `.claude/rules/denial-categories.md`
- Auto-loaded by Claude Code on every session start (same mechanism as `sandbox-policy.md`).
- Each Bash-owning agent's definition file should contain a one-line reference:
  > Follows `.claude/rules/denial-categories.md` for post-failure diagnosis when a Bash
  > command is denied.
```

### 5.3 Cross-references in 13 Bash-owning agents

For each of `developer.md`, `tester.md`, `poc-engineer.md`, `scaffolder.md`,
`infra-builder.md`, `codebase-analyzer.md`, `security-auditor.md`, `db-ops.md`, `releaser.md`,
`observability.md`, `analyst.md`, `change-classifier.md`, `impact-analyzer.md`, add the
following line directly under the existing `sandbox-policy.md` reference:

```markdown
> Follows `.claude/rules/denial-categories.md` for post-failure diagnosis when a Bash command is denied.
```

This is a one-line append per file, 13 files. Mechanical.

`sandbox-runner.md` already handles denial in its own protocol; do not add the
cross-reference there (it would be circular — `sandbox-runner` is *who* the policy
delegates to, not a consumer of post-failure diagnosis).

### 5.4 `package.json`

```diff
 {
   "name": "aphelion-agents",
-  "version": "0.3.0",
+  "version": "0.3.1",
```

Patch bump (per the policy in #43, post-PR #46 baseline of `0.3.0`). Although new deny
entries change *what gets gated*, the change does not break any existing consumer's
settings.local.json (which `cmdUpdate` preserves) — it only affects fresh `init` runs
and consumers who choose to overwrite. Patch is the right granularity.

### 5.5 `CHANGELOG.md`

Append under `## [Unreleased]`:

```markdown
### Changed
- `.claude/settings.local.json` rewritten as a deny-list policy. `allow: ["*"]` plus
  explicit `deny` entries for destructive_fs, destructive_git, privilege_escalation,
  secret_access, prod_db, and external publish commands. Aligns settings enforcement with
  the categories already documented in `src/.claude/rules/sandbox-policy.md`. (#31)
- `package.json` version bumped from `0.3.0` to `0.3.1`.

### Added
- `src/.claude/rules/denial-categories.md` — auto-loaded rule that classifies Bash
  command failures into `sandbox_policy` / `os_permission` / `file_not_found` /
  `platform_heuristic` and prescribes per-category recovery. Documents the manual
  `!cmd` shell-prompt fallback for cases where Claude Code's sandbox refuses a
  command even after `AskUserQuestion` approval. (#31)
- 13 Bash-owning agents now reference `denial-categories.md` alongside
  `sandbox-policy.md`. No behavioral change beyond the documented diagnostic protocol.

### Notes
- Out of scope, see #31 §3.2: "one-shot escalation" via `preToolUse` hook (requires
  Claude Code platform support not currently documented).
```

### 5.6 `docs/wiki/{en,ja}/Contributing.md`

> **Note (deviation from earlier draft):** The original §5.6 targeted
> `Platform-Guide.md`, which was deleted in PR #41 (#36 / Claude Code-only
> refactor). The closest live home for permission-policy documentation is
> `Contributing.md` — adjacent to the existing "Editing Aphelion's own rules"
> section. Add a new sibling subsection.

Append after the "Version bumping policy" subsection:

```markdown
### Settings deny-list policy

`<project>/.claude/settings.local.json` ships with a deny-list shape:
`allow: ["*"]` and explicit `deny` entries for destructive operations.
Categories: destructive_fs, destructive_git, privilege_escalation, secret_access,
prod_db, external_publish. The list mirrors the categories in
`.claude/rules/sandbox-policy.md` §1.

Customising: deny entries can be removed locally if your workflow needs a banned
command (`git push --force-with-lease` against your own fork, for example). Removed
entries are not propagated back when running `npx aphelion-agents update` — the
filter at copy time preserves your local `settings.local.json`.

### When a command is denied

See `.claude/rules/denial-categories.md` for the full protocol. Quick reference:

- Sandbox/policy denial → AskUserQuestion → if still blocked, paste `!cmd` into the
  chat input (manual fallback).
- POSIX `Permission denied` → run `ls -la {path}`; if `root`-owned, `sudo chown -R
  $USER {path}` then retry.
- Claude Code auto-mode refusal (sub-agent boundary, branch-protection heuristic, etc.)
  → not configurable from settings; either approve per-invocation or run the command
  from the parent session.
```

Mirror in `wiki/ja/Contributing.md` (bilingual sync per repo convention; section
headers stay in English per the #40 terminology policy).

---

## 6. ADRs

### ADR-001 — Mirror sandbox-policy categories rather than designing a fresh deny-list taxonomy

- **Status**: proposed
- **Context**: The issue body's draft enumerates categories (destructive_fs, destructive_git,
  …) that overlap heavily with `src/.claude/rules/sandbox-policy.md` §1 but are not in
  one-to-one correspondence (e.g. the draft has a separate `destructive_git` group; the
  policy folds git into `destructive_fs`-adjacent). A clean deny-list could either
  (a) re-derive its own categories or (b) adopt the policy's categories verbatim and add
  new ones only when sandbox-policy lacks a category.
- **Decision**: (b). Use the policy's five categories (`destructive_fs`, `prod_db`,
  `privilege_escalation`, `secret_access`, `external_net`) as the spine, and add
  `destructive_git` and `external_publish` as new spine entries. The settings.json file's
  `deny` block is grouped in the same order. Future updates to either file should preserve
  the parallel structure.
- **Consequence**: Reviewers can verify category coverage by diffing
  settings.local.json against sandbox-policy.md §1 line by line. New categories require
  edits in two places (the policy table and the settings deny block), but this is the
  correct surface area for a "spine".
- **Alternative considered**: A single category called `denied` with a flat list. Rejected
  — it conflates risk profiles and prevents per-category recovery guidance.

### ADR-002 — Defer `preToolUse` hook prototype; document manual fallback instead

- **Status**: proposed
- **Context**: Comment 1 of #31 wants a one-shot escalation mechanism. The "right"
  implementation is a `preToolUse` hook that intercepts deny-list matches, prompts the
  user, and one-shot-allows the command on approval. Claude Code does have a hook system,
  but: (i) the documented behavior of hooks for "allow/deny" is not "one-shot allow",
  (ii) writing such a hook means owning a token-store with TOCTOU and persistence concerns,
  (iii) we'd be the only consumer of an undocumented contract.
- **Decision**: Do not ship a hook prototype in this PR. Document the manual `!cmd`
  fallback (§5.2) as the supported recovery. File a follow-up issue if Anthropic publishes
  a formal one-shot allow API.
- **Consequence**: One-shot escalation remains a manual, multi-step user action. Acceptance
  criterion 8 from the issue body is reframed (see §9).
- **Alternative considered**: Ship a minimal hook now. Rejected — high build cost, low
  payoff (the typical destructive cleanup is a one-off, and the manual `!cmd` fallback is
  acceptable for one-offs).

### ADR-003 — Place denial-categories in a new rule file rather than appending to sandbox-policy

- **Status**: proposed
- **Context**: D3 considered appending denial-categories to `sandbox-policy.md` instead of
  creating a new file.
- **Decision**: New file. `sandbox-policy.md` is *prevention* (categorisation before
  execution, delegation to sandbox-runner). `denial-categories.md` is *post-failure
  diagnosis*. They share vocabulary but have distinct lifecycle.
- **Consequence**: Two files for agents to load instead of one. Each is shorter and stays
  focused. Mirror the cross-reference convention already used for `sandbox-policy.md`.
- **Alternative considered**: One combined file. Rejected — the prevention guidance is
  already 137 LOC; combining would push past 250 LOC and obscure both halves.

### ADR-004 — Drop `defaultMode: "acceptEdits"` from the draft

- **Status**: proposed
- **Context**: The issue body's settings draft includes `"defaultMode": "acceptEdits"`,
  which auto-approves Edit-tool actions. This is orthogonal to the Bash deny-list and
  changes UX in ways the issue does not discuss.
- **Decision**: Drop. Add separately in a future issue if the user wants it.
- **Consequence**: The deny-list PR is purely about Bash/Read denials. Edit-tool UX
  is unchanged from current behavior.
- **Alternative considered**: Include it for "completeness". Rejected — bundles two
  unrelated decisions into one PR review.

### ADR-005 — Drop greedy `git reset --hard*` and `git clean -f*` patterns from the draft

- **Status**: proposed
- **Context**: §5.1 explains: these forms are routinely used in legitimate workflows
  (rewinding by one commit, cleaning a throwaway test tree). Their broadest form would
  block ops/maintenance work daily.
- **Decision**: Keep only the strictly-destructive forms (`git reset --hard origin/*`,
  `git update-ref -d`). Document in `denial-categories.md` that agents operating outside
  their expected cwd should self-restrict.
- **Consequence**: Some recoverable destructive operations (e.g. `git reset --hard` against
  a local-only commit) will run without explicit confirmation. Mitigated by reflog (recoverable).
- **Alternative considered**: Keep the greedy forms and rely on AskUserQuestion. Rejected —
  observed friction in #31 itself shows AskUserQuestion-then-deny loops are worse UX than
  trusting the agent for low-risk forms.

---

## 7. Inventory of file edits

Concrete file-level summary for the executing `developer`:

| Path | Action | LOC delta (approx) |
|------|--------|--------------------|
| `<packageRoot>/.claude/settings.local.json` | Replace contents | -8 / +45 |
| `src/.claude/rules/denial-categories.md` | New file | +110 |
| `.claude/agents/{13 files}` | One-line append each | +1 × 13 = +13 |
| `package.json` | Version bump | -1 / +1 |
| `CHANGELOG.md` | Append `[Unreleased]` block | +18 |
| `docs/wiki/en/Contributing.md` | Append subsection | +30 |
| `docs/wiki/ja/Contributing.md` | Append subsection (mirror) | +30 |
| `site/` (mirrored from wiki via `node scripts/sync-wiki.mjs`) | Regenerate | (build artefact) |

Total: ~258 LOC added, ~9 LOC removed. One PR (per D7).

---

## 8. Out of Scope

- O1 — Claude Code auto-mode heuristics (the four §1.1 denials).
- O2 — Automatic one-shot escalation via `AskUserQuestion`.
- O3 — `preToolUse` hook implementation (revisit when upstream publishes a hook contract
  for one-shot allow).
- O4 — Removing `~/.claude/` global rules tree (already addressed by #44 / PR #46).
- O5 — `defaultMode: "acceptEdits"` (orthogonal Edit-tool UX decision; separate issue if wanted).
- O6 — Smoke test for deny-list coverage (no automation surface; manual verification only).
- O7 — Migration guidance for users with custom `settings.local.json`. The existing
  `update` command already preserves their file; migration is opt-in and out of scope here.

---

## 9. Acceptance Criteria (reframed)

The original issue body has 11 acceptance items. Reframed under what Aphelion can verify:

1. [ ] `<packageRoot>/.claude/settings.local.json` `deny` block contains entries covering
       all five `sandbox-policy.md` §1 categories plus `destructive_git` and
       `external_publish`.
2. [ ] After `npx github:kirin0198/aphelion-agents#main init` against a fresh target,
       `.claude/settings.local.json` matches §5.1 byte-for-byte (modulo final newline).
3. [ ] `git push --force` matches a deny entry. (Verified by inspection — Claude Code's
       behavior under that match is its own concern.)
4. [ ] `rm -rf /` and `dd of=/dev/sda` match deny entries. (Same caveat.)
5. [ ] `Read(./.env)`, `Read(**/credentials.*)`, `Read(**/*.secret)`, `Read(**/*.pem)`,
       `Read(**/*.key)` all match deny entries.
6. [ ] `sudo *`, `chmod 777*` match deny entries.
7. [ ] Production-DB connection patterns (`psql *prod*`, `mongosh *prod*`,
       `mysql *--host=*prod*`) match deny entries.
8. [ ] `npm publish*`, `cargo publish*`, `twine upload*` match deny entries.
9. [ ] `src/.claude/rules/denial-categories.md` exists, documents the four denial
       categories with detection signals and recommended actions, and is auto-loaded.
10. [ ] All 13 Bash-owning agents reference `denial-categories.md` in their preamble.
11. [ ] `package.json` `version` is `0.3.0`.
12. [ ] `CHANGELOG.md` `[Unreleased]` block has the entries from §5.5.
13. [ ] `docs/wiki/{en,ja}/Contributing.md` has the new "Settings deny-list policy" and
       "When a command is denied" sub-sections.
14. [ ] `site/` is regenerated from the wiki edits (run `node scripts/sync-wiki.mjs`).

**Reframed away** (originals 8 and 11 from the issue body):

- ~~"deny-list commands can run once after AskUserQuestion approval"~~ → see ADR-002. The
  documented manual `!cmd` fallback is the supported recovery. New AC: §9.9 covers the
  documentation.
- ~~"sandbox_policy / os_permission denial categories are surfaced in the UI"~~ → reframed
  to "agents diagnose denial category from `stderr` and report it in `AGENT_RESULT`".
  Detection happens at the agent layer (stderr parsing), not as a Claude Code platform
  feature. New AC: §9.9 plus the `DENIAL_CATEGORY` field in `AGENT_RESULT`.

---

## 10. Test Plan (for the implementation phase)

The executing `developer` should verify, after edits:

1. `node bin/aphelion-agents.mjs init` against a fresh tmpdir produces a target whose
   `.claude/settings.local.json` matches §5.1 byte-for-byte.
2. `bash scripts/smoke-update.sh` (existing from #43) passes.
3. `node bin/aphelion-agents.mjs --help` is unchanged (this PR does not touch CLI surface).
4. `npm pack --dry-run` reports the expected file count (existing files + the new
   `src/.claude/rules/denial-categories.md`); version `0.3.0`.
5. `node scripts/sync-wiki.mjs` runs cleanly and updates `site/`.
6. Manual: open a fresh Claude Code session in a tmpdir initialised from this branch.
   Attempt `Bash(rm -rf /tmp/aphelion-test/)` (should be denied — it doesn't match any
   deny pattern, this is a control test that ordinary `rm -rf` of a project-local path
   still works).
7. Manual: attempt `Bash(rm -rf /)` (should be denied by the new deny entry).
8. Manual: attempt `Bash(git push --force origin HEAD)` (should be denied).
9. Manual: read `denial-categories.md` end-to-end; verify the prescribed `AGENT_RESULT`
   fields match what `agent-communication-protocol.md` already documents (no contradiction).
10. Manual: verify cross-reference lines added to all 13 Bash-owning agents (find via
    `grep -L denial-categories .claude/agents/*.md` — expected output: only `sandbox-runner.md`
    is missing it, which is correct per §5.3).

---

## 11. Open Questions (awaiting user sign-off)

The following resolutions are **proposed**; the user's reply confirms or overrides each.

- **Q1 (D1, D5, D8)**: Adopt the refined deny-list in §5.1, dropping the issue-body draft's
  `defaultMode: "acceptEdits"`, the redundant `allow` entries, and the greedy
  `git clean -f*` / `git branch -D*` / `git reset --hard*` patterns?
- **Q2 (D3, D4)**: Ship `denial-categories.md` as a new auto-loaded rule, with one-line
  cross-references in all 13 Bash-owning agents?
- **Q3 (D5, ADR-002)**: Defer the `preToolUse` hook prototype; ship the documented manual
  `!cmd` fallback as the supported recovery for sandbox-after-approval cases?
- **Q4 (D7)**: One PR for settings + new rule + agent cross-refs + wiki + version bump +
  CHANGELOG?
- **Q5 (D11)**: Should the analyst (or user) follow up by filing an upstream issue with
  Anthropic on "AskUserQuestion approval does not unblock subsequent sandbox-denied retries"
  (PR #29 cleanup observation)?
- **Q6 (D12)**: Branch name `chore/deny-list-permission-policy`, PR title prefix `chore:`?
- **Q7**: Acceptance criteria 8 and 11 from the original issue body are reframed in §9. Are
  the reframed forms acceptable, or does the user want a stronger commitment (e.g. a
  prototype hook in this PR despite ADR-002)?

---

## 12. Handoff to `architect`

`architect` needs to:

1. Acknowledge D1-D12 once the user approves Q1-Q7 (or adjust if user overrides).
2. Confirm that no `ARCHITECTURE.md` update is needed — `aphelion-agents` itself has no
   root-level `ARCHITECTURE.md`. The wiki `Architecture.md` is doc-only and unaffected
   beyond the new Platform-Guide subsection (already enumerated in §5.6).
3. Hand a single TASK.md to `developer` covering, in order:
   - Replace `<packageRoot>/.claude/settings.local.json` with §5.1 contents.
   - Add `src/.claude/rules/denial-categories.md` with §5.2 contents.
   - Append the cross-reference line to each of the 13 Bash-owning agents (mechanical edit).
   - Bump `package.json` version to `0.3.0`.
   - Append to `CHANGELOG.md` the §5.5 block.
   - Update `docs/wiki/{en,ja}/Contributing.md` per §5.6.
   - Run `node scripts/sync-wiki.mjs` to mirror wiki changes into `site/`.
   - Run `bash scripts/smoke-update.sh` and `node bin/aphelion-agents.mjs --help` for
     regression check.
4. Decide whether `tester` involvement is needed. Recommendation: no — the change is
   data + documentation + mechanical agent edits. Manual verification per §10 is
   sufficient. `security-auditor` should still run as part of normal Delivery flow.

---

## 13. References

- `.claude/settings.local.json` — current settings shipped with the package
- `src/.claude/rules/sandbox-policy.md` — existing policy (categories spine for ADR-001)
- `.claude/agents/sandbox-runner.md` — owner of `decision: asked_and_allowed` enum (existing)
- `.claude/agents/developer.md` — example Bash-owning agent showing current single-line
  cross-reference pattern
- `bin/aphelion-agents.mjs:117-150` — `cmdUpdate` filter that protects existing
  `settings.local.json` (relevant to migration considerations in §3.3)
- Issue #31 — bug report (this document's authority for scope) and its two follow-up
  comments (one-shot escalation, denial-category disambiguation)
- Issue #43 — npx update / cache reliability (informs the version-bump policy in §5.4)
- Issue #44 — rules dual-load fix (informs the rules location in §5.2)
- `docs/issues/cli-update-rules-bug.md` — template / tone reference for this planning doc
- `docs/issues/sandbox-design.md` — existing sandbox / sandbox-runner design (context for
  ADR-003)
