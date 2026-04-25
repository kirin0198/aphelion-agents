# Aphelion Repo vs User-Global `.claude/rules/` — Dual-Load Resolution

> Reference: current `main` (HEAD `55b2e37`, 2026-04-25, post-PR #45)
> Created: 2026-04-25
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the chosen option will be executed in a follow-up phase
> GitHub Issue: [#44](https://github.com/kirin0198/aphelion-agents/issues/44)

---

## 1. Background & Motivation

### 1.1 The dual-load mechanism

Claude Code auto-loads files under `.claude/rules/*.md` from **both** `~/.claude/rules/`
(user-global) and `<project>/.claude/rules/` (project-local) into the system prompt of every
session opened inside the project directory. Unlike `agents/`, `commands/`, and `settings.json`
— which use **project-overrides-global** semantics — `rules/` uses **additive** semantics:
both copies are emitted, in two separately-tagged blocks ("user's private global instructions"
and "project instructions, checked into the codebase").

This is documented Claude Code behavior, not a bug in Claude Code. It cannot be changed from
within Aphelion.

### 1.2 Why Aphelion uniquely suffers from it

For a normal consumer of Aphelion, the user-global `~/.claude/rules/` is the **only** copy
that exists. The project they are working on does not ship `.claude/rules/`. No duplication.

For Aphelion **itself**, the canonical source of `.claude/rules/` lives at the repo root
(`<repo>/.claude/rules/`) so that `bin/aphelion-agents.mjs init|update` can copy it to
consumers' `~/.claude/`. Maintainers who run `npx aphelion-agents update --user` then have
the same content mirrored at `~/.claude/rules/`. From that moment on, every session opened
inside `~/git/aphelion-agents/` loads both copies.

### 1.3 Observed evidence in this very session

The system prompt at the top of the analyst session that authored this document contains:

- `aphelion-overview.md` listed twice (once as "user's private global instructions",
  once as "project instructions"), the user-global tagged `Last updated: 2026-04-24`
  and the project tagged `Last updated: 2026-04-24`.
- `sandbox-policy.md` listed twice, **with materially different content**: user-global
  dated `2026-04-18` (still includes multi-platform detection, `advisory_only` mode,
  `copilot`/`codex` branches), project-local dated `2026-04-25` (Claude-Code-only after
  #36 / PR #41). The agent receives both versions simultaneously and must reconcile them
  at inference time.

A diff inventory taken at HEAD `55b2e37` (post-PR #45):

| File | user-global (2026-04-25 02:32) | project (varies) | identical? |
|------|-------------------------------|------------------|------------|
| `agent-communication-protocol.md` | 1555 B | 1555 B | yes |
| `aphelion-overview.md` | 3467 B | 3467 B | yes |
| `build-verification-commands.md` | 1591 B | 1591 B | yes |
| `document-versioning.md` | 2111 B | 2111 B | yes |
| `file-operation-principles.md` | 251 B | 251 B | yes |
| `git-rules.md` | 1795 B | 1795 B | yes |
| `language-rules.md` | 1468 B | 1468 B | yes |
| `library-and-security-policy.md` | 2236 B | 2236 B | yes |
| `localization-dictionary.md` | 3108 B | 3108 B | yes |
| `sandbox-policy.md` | **8145 B** | **7486 B** | **no** |
| `user-questions.md` | 1551 B | 1551 B | yes |

10/11 are byte-identical because the maintainer ran `update --user` recently. One is stale.
That single divergence is enough to put the agent in a contradictory-rules state — exactly
what `sandbox-policy.md` is supposed to prevent.

### 1.4 Why PR #45 (the #43 fix) does not close #44

PR #45 made the user-global mirror **easier to keep fresh**:

- Bumped `package.json` to `0.2.0`, breaking the npx cache that previously pinned everyone
  to the 2026-04-18 sandbox-policy.
- Added a Contributing rule that any change to `.claude/**` requires a version bump,
  forcing future caches to invalidate.
- `update` now prints `source: aphelion-agents@<ver>` so users can spot stale runs.

What PR #45 did **not** change:

1. `~/.claude/rules/` and `<repo>/.claude/rules/` still both auto-load when the maintainer
   opens a session inside the repo. The "fresh mirror" is loaded twice, not once.
2. Token cost: every session pays ~26 KB × 2 = ~52 KB of rules content (rough estimate
   ~13k tokens at 4 chars/token). For Aphelion maintainers who keep many sessions open
   while iterating, this compounds.
3. Divergence-during-edit: the maintainer is the one **producing** rule edits. While a
   PR is in flight, the project tree has the new content but `~/.claude/rules/` still has
   the old (until the PR merges and the maintainer re-runs `update --user`). During that
   window — which is exactly when rule changes are being designed and tested — the
   maintainer's session runs against contradictory rules.

#43 reduces the **probability** of stale mirrors lingering forever; #44 is about the
**structural fact** of dual-load itself.

### 1.5 Goal

Decide a strategy that either:

- (A) eliminates dual-load **structurally** (one source of truth at session start), or
- (B) explicitly accepts dual-load as a "won't fix" with a clear rationale and a runbook
  for handling the divergence-during-edit window.

Either outcome is acceptable; the decision must be **explicit and documented** so future
maintainers (and contributors landing on the repo cold) know what to expect.

---

## 2. Inventory

### 2.1 What auto-loads today

When a Claude Code session starts inside `~/git/aphelion-agents/`:

| Path | Loaded by Claude Code? | Override or additive? |
|------|------------------------|----------------------|
| `~/.claude/CLAUDE.md` | Yes (instructions) | n/a |
| `~/.claude/rules/*.md` | Yes (auto-load) | additive |
| `~/.claude/agents/*.md` | Yes when invoked | project overrides global |
| `~/.claude/commands/*.md` | Yes when invoked | project overrides global |
| `~/.claude/settings.json` | Yes | project overrides global |
| `~/.claude/orchestrator-rules.md` | Yes when orchestrator agent reads it | n/a (single read at runtime) |
| `<repo>/.claude/rules/*.md` | Yes (auto-load) | additive — **dual-loaded with above** |
| `<repo>/.claude/agents/*.md` | Yes when invoked | wins over user-global |
| `<repo>/.claude/commands/*.md` | Yes when invoked | wins over user-global |
| `<repo>/.claude/orchestrator-rules.md` | Yes when read | wins over user-global |
| `<repo>/.claude/settings.local.json` | Yes | merged |

Dual-load applies only to `rules/`. The other `.claude/**` subtrees are correctly behaved
under the project-overrides-global model. **Issue #44 is scoped to `rules/`**.

### 2.2 Token-cost rough estimate

`wc -c` on `<repo>/.claude/rules/*.md` totals **26,619 bytes**. Roughly 6,500 tokens per copy
(at 4 chars/token). Dual-load = ~13,000 tokens of static rules content per session opened in
the repo, of which **half is structural waste**. Real-world impact is larger because the
duplicated content also crowds out useful context near the bottom of the session window over
long iterations.

### 2.3 Divergence-risk surfaces (post-PR #45)

| Surface | Pre-#45 risk | Post-#45 risk |
|---------|--------------|---------------|
| Forgetting to run `update --user` after merge | High (no signal) | Medium (`source: aphelion-agents@<ver>` line surfaces it on next run) |
| Stale npx cache | High (silent) | Low (version bump invalidates) |
| Edit window between PR open and merge | High (unchanged) | High (unchanged) |
| Co-existing aphelion installs across multiple machines | Medium | Medium (each must `update --user` independently) |

The "edit window" surface is what #44 must address; the others are now adequately covered.

### 2.4 Files unique to this issue

`sandbox-policy.md` is the canary. It is the largest rule (~8 KB), changes most frequently
(it was the focus of #36, PR #41, and the immediate driver behind detecting #44), and any
divergence shows up materially in agent behavior because it gates `Bash` invocations.

Closing #44 in a way that protects `sandbox-policy.md` will protect the rest by the same
mechanism.

---

## 3. Options Considered

### 3.1 Option A — Operational rule, no code change (issue body §1)

Document a procedure: "before working on aphelion, move `~/.claude/rules/` aside; restore
when done."

- Eliminates dual-load? **Yes, while followed.**
- Setup cost: per-session manual step.
- Failure mode: forgetting on session restart; partial restore on interrupted shell.
- Compatibility with PR #45: orthogonal — works regardless of how `update` behaves.
- Verdict: brittle. Rejected on its own; viable as a fallback documented alongside another
  option.

### 3.2 Option B — Relocate canonical source out of `.claude/rules/` (issue body §2)

Move the source of truth to e.g. `src/.claude/rules/`. The repo root has no
`.claude/rules/`, so Claude Code never auto-loads the project copy. CLI's `sourcePath`
constant changes to `join(packageRoot, "src/.claude")`.

- Eliminates dual-load? **Yes, structurally.** The auto-load slot for project-local
  `rules/` is empty; only `~/.claude/rules/` loads.
- Setup cost: one-time CLI patch + `package.json` `files` array update + verify
  `npm pack --dry-run` ships from `src/.claude/`.
- Failure mode: maintainer-side dev experience changes — when working **on** aphelion, the
  rules don't load at the project level. This is the issue body's listed concern, but
  arguably a feature: maintainers editing Aphelion's *own* rules should not be governed by
  the rules they are editing (chicken-and-egg). They are still governed by their
  user-global mirror, which is the published-and-deployed snapshot.
- Compatibility with PR #45: requires updating the smoke test path
  (`scripts/smoke-update.sh`) to read from `src/.claude/`. Trivial.
- Side benefit: clarifies the role of the directory. `src/.claude/` reads as "source", not
  "config that applies to this project". Future contributors are less likely to mistake one
  for the other.
- Verdict: **structural, durable, low-cost.** This is the analyst's recommendation.

### 3.3 Option C — Devcontainer that doesn't mount `~/.claude/` (issue body §3)

Define a devcontainer (`.devcontainer/devcontainer.json`) that runs Aphelion development
in an isolated container with a clean `$HOME`. User-global rules don't propagate.

- Eliminates dual-load? **Yes, while inside the container.**
- Setup cost: high — devcontainer image, mount layout, network config, IDE integration.
- Failure mode: contributors who don't use VS Code / devcontainer tooling get nothing.
  Sandbox-policy already calls for a devcontainer at Standard tier, so this isn't entirely
  new infrastructure, but provisioning it for *Aphelion's own development* (vs. for
  consumers) is still net-new work.
- Compatibility with PR #45: no interaction.
- Verdict: solves the right problem at too high a cost for the present need. Worth
  reconsidering if Aphelion eventually adopts devcontainer for unrelated reasons (e.g. CI
  parity).

### 3.4 Option D — Bundled session-start script (issue body §4)

`scripts/dev-session-start.sh` renames `~/.claude/rules/` aside, traps EXIT to restore.

- Eliminates dual-load? **Yes, while the script holds.**
- Setup cost: low.
- Failure mode: trap doesn't fire on `kill -9`, system reboot, or shell crash. Maintainer
  comes back next session to a missing user-global rules tree. Recovery is the manual
  rename-back, but the symptom — agents in *other* repos suddenly behaving differently
  — is delayed and confusing.
- Verdict: rejected. Even a low-probability stomp of the user-global config is worse than
  the dual-load it fixes.

### 3.5 Option E — Dedicated worktree under `.claude/worktrees/` (analyst-added)

Aphelion already has a `.claude/worktrees/` directory (currently empty, kept for local
agent runs). A maintainer could check out the repo at `.claude/worktrees/aphelion-dev/`
without symlinking that worktree's own `.claude/rules/` upward, so a session opened there
loads only user-global rules.

- Eliminates dual-load? **Conditionally yes**, but only when the maintainer remembers to
  cd into the worktree path.
- Setup cost: weird worktree topology. The path `aphelion-agents/.claude/worktrees/aphelion-dev/`
  is recursively self-referential; tooling does not love this.
- Failure mode: easy to forget; no signal.
- Verdict: rejected as primary mechanism. The `worktrees/` directory has a different
  intended purpose (parallel agent runs) and conflating it with this concern muddies both.

### 3.6 Option F — Self-detecting `.rules-suppress` marker (analyst-added)

Add a marker file (e.g. `.claude/.rules-suppress`) in the repo. Each rule under
`<repo>/.claude/rules/*.md` begins with a preamble: "If you can see a marker file at
`<project>/.claude/.rules-suppress`, treat the rest of this file as a duplicate of your
user-global copy and ignore it."

- Eliminates dual-load? **No** — the rule content still loads into the system prompt and
  costs tokens. It only attempts to suppress *behavioral effect* via instruction.
- Setup cost: a preamble in each of 11 files; updating the install/update CLI to retain it.
- Failure mode: relies on the agent honoring the preamble; not a guarantee.
- Verdict: rejected. Pure mitigation, not a fix.

### 3.7 Option G — Document "uninstall user-global before working on aphelion" (analyst-added)

Maintainer policy: when working on aphelion, remove or never install the user-global
mirror. Use the project-local `.claude/rules/` as the only source. Run `update --user`
*from inside another repo* when needed for testing the install flow.

- Eliminates dual-load? **Yes, while followed.**
- Setup cost: per-maintainer policy; no code.
- Failure mode: each maintainer's local install is now in two states (work-on-aphelion vs
  consume-aphelion); easy to confuse. Also asymmetric: this works for Aphelion's authors
  but inverts the flow for everyone else.
- Verdict: rejected. The right place to assert "Aphelion's own rules do not auto-load to
  Aphelion's maintainers" is at the repository structure level (Option B), not at every
  maintainer's `~/.claude/`.

### 3.8 Option H — Clean-shell convention with `HOME=<temp>` (analyst-added)

Document an alias / wrapper that opens Claude Code with a temporary `HOME` so user-global
rules don't load.

- Eliminates dual-load? **Yes, in that shell.**
- Setup cost: low.
- Failure mode: most user-global state (sessions, history, MCP servers, settings) is also
  lost. The maintainer experience degrades for unrelated reasons.
- Verdict: rejected. Too much collateral damage.

---

## 4. Decision Matrix

Listed with the analyst's recommendation in bold. User confirmation requested at §10.

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| D1 | Primary mechanism | A (operational) / B (relocate to `src/.claude/`) / C (devcontainer) / D (script) / E (worktree) / F (marker) / G (uninstall policy) / H (clean shell) | **B — relocate canonical source to `src/.claude/`** |
| D2 | Repository structure | (a) `src/.claude/rules/` etc., (b) `dist/.claude/`, (c) `templates/.claude/` | **(a) `src/.claude/`** — `src/` is the conventional "source" connotation; `dist/` implies a build step (none exists); `templates/` reads as scaffolding when the tree is actually a deployable mirror |
| D3 | Whether to keep a *thin* project-local `.claude/` for maintainer convenience | (a) no — repo root has no `.claude/` at all, (b) yes — keep `agents/`, `commands/`, `orchestrator-rules.md`, `settings.local.json` at repo root and only relocate `rules/`, (c) yes — keep all of `.claude/` as a symlink to `src/.claude/` | **(b) keep non-rules at repo root, relocate only rules/** — `agents/` and `commands/` use override semantics so duplicating them is harmless and benefits maintainer DX (project-side agent definitions still load); `rules/` is the only additive surface, so only it needs to move. See ADR-001. |
| D4 | CLI source-path resolution | (a) hard-code `src/.claude/`, (b) probe both `src/.claude/` and `.claude/` for backward compat, (c) drive via package.json `aphelion.sourcePath` field | **(a) hard-code** — single supported layout post-migration; #45's version bump policy already handles transition. Probe-fallback adds permanent code complexity for a one-shot migration |
| D5 | What `package.json` `files` ships | (a) `bin`, `src/.claude/agents`, `src/.claude/rules`, `src/.claude/commands`, `src/.claude/orchestrator-rules.md`, (b) keep `.claude/...` in `files` and use a copy script | **(a) ship from `src/.claude/`** — keeps the published tarball layout identical (`.claude/rules/` after extraction is a function of `cp` destination, not source) only because `cp` flattens. Verify with `npm pack --dry-run` post-migration. |
| D6 | Smoke test path update | (a) update `scripts/smoke-update.sh` to read source from `src/.claude/`, (b) run smoke test from the published tarball instead of repo root | **(a) update path** — same script, one path constant. (b) is over-engineered for the present scope. |
| D7 | Maintainer-facing docs | (a) `docs/wiki/{en,ja}/Contributing.md` adds a section "Editing Aphelion's own rules", (b) inline note in `src/.claude/README.md`, (c) both | **(c) both** — Contributing.md is where contributors look first; an in-tree README at `src/.claude/README.md` is what someone editing those files actually has open |
| D8 | Migration sequencing | (a) one PR moving everything, (b) two PRs (move + CLI rewire), (c) three PRs (move, CLI, docs) | **(a) one PR** — atomicity matters: a half-migrated state has neither the dual-load fix nor a working `update`. The diff is mechanical (a `git mv` plus one constant change plus one `files` update) and reviews cleanly as one. |
| D9 | Version bump | (a) `0.3.0` (minor), (b) `0.2.1` (patch) | **(a) `0.3.0`** — repository structure change is meaningful; minor signals it; #45's policy says "bump for any `.claude/**` change" so the bump is required regardless |
| D10 | Backward-compat for cached `0.2.x` users | (a) none — they re-run `update`, (b) ship a one-shot `migrate` command | **(a) none** — `update` already handles it; the version bump invalidates caches; no user-visible breakage |
| D11 | Operational fallback documented as well | (a) yes — also document "move `~/.claude/rules/` aside" as an emergency manual mitigation, (b) no — Option B alone is the answer | **(b) no** — once Option B lands, dual-load cannot occur. Documenting the manual workaround invites cargo-cult application. If a future regression breaks Option B, that's a separate incident. |

---

## 5. ADRs

### ADR-001 — Move only `rules/` out of repo root, not all of `.claude/`

- **Status**: proposed
- **Context**: Three subtrees (`agents/`, `commands/`, `orchestrator-rules.md`) and one
  non-source file (`settings.local.json`) live alongside `rules/` under `<repo>/.claude/`.
  Claude Code's load semantics differ per subtree.
- **Decision**: Relocate only `rules/`. Leave `agents/`, `commands/`, `orchestrator-rules.md`,
  and `settings.local.json` at repo root.
- **Rationale**:
  - `agents/` and `commands/` use **override** semantics — when project and user-global
    have the same filename, the project copy wins. Duplication doesn't compound; tokens
    don't double; maintainer DX *benefits* (editing an agent definition while a session
    is open immediately picks up the project copy).
  - `orchestrator-rules.md` is read on demand by orchestrator agents, not auto-loaded.
    No system-prompt cost.
  - `settings.local.json` is per-project and never duplicated.
  - Only `rules/` is additive. Move only what's broken.
- **Consequence**: Repo root retains a `.claude/` directory with the non-additive subtrees.
  CLI source path becomes a hybrid: `agents/` from `<repo>/.claude/agents/`, `rules/` from
  `<repo>/src/.claude/rules/`. Not ideal for symmetry, but avoids regressing maintainer DX
  on the parts that already work correctly.
- **Alternative considered**: Move all of `.claude/` to `src/.claude/`. Rejected because it
  imposes a *real* DX regression on maintainers (project-side agent definitions stop
  loading) to fix a problem that exists only on `rules/`.

### ADR-002 — `src/.claude/rules/` over `dist/.claude/rules/` or `templates/.claude/rules/`

- **Status**: proposed
- **Context**: Naming the relocated directory matters for contributor intuition.
- **Decision**: `src/`.
- **Rationale**:
  - `dist/` connotes build output. There is no build step; the files are the source.
    Misleading.
  - `templates/` connotes scaffolding (parameterized). The files are not parameterized;
    they ship verbatim. Misleading.
  - `src/` connotes "source-of-truth that gets distributed". Closest to the actual role.
- **Consequence**: A new top-level `src/` directory in a repo that is otherwise content-only.
  Reasonable trade.
- **Alternative considered**: Keep at repo root and rely on operational discipline.
  Rejected — see Option A in §3.

### ADR-003 — One PR, not phased

- **Status**: proposed
- **Context**: The migration touches `git mv .claude/rules src/.claude/rules`,
  `bin/aphelion-agents.mjs` (one constant), `package.json` (`files` array + `version`),
  and `scripts/smoke-update.sh` (one path).
- **Decision**: Single PR.
- **Rationale**: The intermediate states (move done but CLI not rewired, or vice versa)
  are broken. Phased PRs introduce a window where `update` ships an empty tree or duplicate
  trees. Atomic merge is the safer path.
- **Consequence**: PR diff is somewhat large in line count (a `git mv` shows as adds + deletes
  on naive diff viewers), but each constituent change is small and self-contained.

### ADR-004 — Do not bundle a `migrate` command

- **Status**: proposed
- **Context**: After version `0.3.0` ships, users running a stale `0.2.x` cache have
  `~/.claude/` populated from the old layout. They need only re-run
  `npx github:kirin0198/aphelion-agents update --user` to refresh.
- **Decision**: No `migrate` command. The version bump triggers a fresh tarball; `update`
  handles the rest.
- **Rationale**: A `migrate` command would have a one-week useful lifetime. Permanent CLI
  surface for a transient need.
- **Consequence**: Users must run `update --user` once after the bump. Document in README
  alongside the existing cache-caveat section.

### ADR-005 — Aphelion maintainers do not work under their own rules at the project level

- **Status**: proposed
- **Context**: Option B's dev-experience implication is that when a maintainer edits
  `src/.claude/rules/sandbox-policy.md`, the file does *not* take effect in their session
  until they run `update --user` (which copies it to `~/.claude/rules/`).
- **Decision**: Accept this as a feature, not a bug.
- **Rationale**:
  - Editing a rule and being immediately governed by it is a *meta* problem (the editor
    cannot see the consequences of their own edit until they're done editing). Decoupling
    edit-time from effect-time avoids the chicken-and-egg.
  - The user-global mirror represents the *deployed, stable* version of the rules.
    Maintaining a clean separation between "what I'm editing" and "what governs my
    session" is desirable.
  - Maintainers can validate edits via the smoke test (`scripts/smoke-update.sh`) and via
    the standard release path (bump version, run `update --user`, verify in a new session).
- **Consequence**: Document this clearly in `docs/wiki/{en,ja}/Contributing.md`.
  Maintainers reading "why don't my rule edits take effect?" need a one-paragraph
  explanation pointing back to this ADR.

---

## 6. Specific Edit Plans

> Line numbers reflect HEAD `55b2e37`. **Implementation is out of scope for this analyst
> phase**; this section is a forward-look only.

### 6.1 Repo structure change

```text
git mv .claude/rules src/.claude/rules
```

After: repo root has `.claude/agents/`, `.claude/commands/`, `.claude/orchestrator-rules.md`,
`.claude/settings.local.json`, `.claude/worktrees/`, and **no** `.claude/rules/`. New
`src/.claude/rules/` holds the canonical content.

### 6.2 `bin/aphelion-agents.mjs`

Replace L24:

```diff
-const sourcePath = join(packageRoot, ".claude");
+const sourcePath = join(packageRoot, "src", ".claude");
```

… or, since per ADR-001 the non-rules subtrees stay at repo root, a hybrid layout where
`init`/`update` copy from two source trees and merge into a single target. Either:

(a) **Single source**: also `git mv` `agents/`, `commands/`, `orchestrator-rules.md`,
`settings.local.json` into `src/.claude/`. The single-constant CLI change above suffices.
This regresses maintainer DX per ADR-001.

(b) **Hybrid source**: maintain two source roots in the CLI. `cmdInit`/`cmdUpdate` first
copy `<repo>/.claude/{agents,commands,orchestrator-rules.md}` then overlay
`<repo>/src/.claude/rules/`. About 6 LOC of additional logic.

**Recommendation**: go with (b). The maintainer DX preservation outweighs the small CLI
complexity. ADR-001 already commits to this trade-off.

### 6.3 `package.json`

```diff
   "files": [
     "bin",
-    ".claude/agents",
-    ".claude/rules",
+    ".claude/agents",
     ".claude/commands",
-    ".claude/orchestrator-rules.md"
+    ".claude/orchestrator-rules.md",
+    "src/.claude/rules"
   ],
   "version": "0.2.0"  →  "0.3.0"
```

Verify: `npm pack --dry-run` ships rules from `src/.claude/rules/` to a path that, when
extracted into the npx cache, the CLI knows to read from. Concretely, the tarball will
contain `package/src/.claude/rules/*.md`; the CLI's `sourcePath = join(packageRoot, "src",
".claude")` resolves correctly.

### 6.4 `scripts/smoke-update.sh`

Update the assertion that diff-checks rules content against `<repo>/.claude/rules/`. Change
that path to `<repo>/src/.claude/rules/`. One-line change.

### 6.5 Documentation

- `docs/wiki/{en,ja}/Contributing.md`: add a section "Editing Aphelion's own rules" (or
  similar) explaining ADR-005's edit-vs-effect decoupling and the new `src/.claude/rules/`
  location.
- `src/.claude/README.md`: a new short README explaining the directory's purpose, pointing
  to Contributing.md for the policy, and warning maintainers not to add a symlink at the
  repo root (which would re-introduce dual-load).
- `docs/issues/claude-rules-isolation.md`: this document, kept as the historical record.
- `CHANGELOG.md` `[Unreleased]` entry under `### Changed`:
  ```text
  - Canonical source for `.claude/rules/` relocated to `src/.claude/rules/` to eliminate
    Claude Code's additive auto-load of rules when working inside the Aphelion repo.
    See `docs/issues/claude-rules-isolation.md`. (#44)
  - `package.json` version bumped from 0.2.0 to 0.3.0.
  ```

### 6.6 Verification steps (for the eventual implementation phase)

1. `git mv` completes cleanly; `git status` shows the rename, not adds + deletes.
2. `npm pack --dry-run` lists `package/src/.claude/rules/*.md` (11 files) and no
   `package/.claude/rules/` entries.
3. `bash scripts/smoke-update.sh` exits 0 against the new layout.
4. Run `node bin/aphelion-agents.mjs update --user` against a throwaway HOME; confirm
   `~/.claude/rules/sandbox-policy.md` matches `src/.claude/rules/sandbox-policy.md`.
5. Open a new Claude Code session in the repo root; inspect the system prompt; confirm
   `rules/*.md` content appears **once** (under "user's private global instructions" only).
6. Open a new session in a *consumer* repo with `~/.claude/` populated by Aphelion's
   `update --user`; confirm rules still auto-load (no regression for consumers).

---

## 7. Acceptance Criteria

Lifted from Issue #44's "受入条件" and refined:

1. [ ] Adopted strategy is documented (this planning doc, plus Contributing.md update).
2. [ ] When a Claude Code session is opened inside `~/git/aphelion-agents/`, the
       `.claude/rules/*.md` content appears in the system prompt **exactly once** (the
       user-global copy), not twice.
3. [ ] `npx github:kirin0198/aphelion-agents update --user` (post-bump) successfully
       refreshes `~/.claude/rules/` from the relocated source.
4. [ ] `bash scripts/smoke-update.sh` exits 0 against the new layout.
5. [ ] No regression for consumers: a fresh Claude Code project (without `<project>/.claude/`)
       still auto-loads user-global rules from `~/.claude/rules/`.
6. [ ] `package.json` version is bumped to `0.3.0` and a CHANGELOG entry is added.
7. [ ] Contributing.md (EN + JA) explains the new layout and the edit-vs-effect decoupling
       per ADR-005.

---

## 8. Out of Scope

- **Asking Claude Code to change rules-loading semantics** (project-overrides-global for
  `rules/`). External dependency; not actionable from within this repo.
- **Devcontainer for Aphelion development** (Option C). Tracked separately if the need
  arises for unrelated reasons (CI parity, sandbox-policy alignment, etc.).
- **Rewriting the CLI in TypeScript.** Tracked under #23 / `docs/issues/typescript-cli.md`.
- **Eliminating `.claude/worktrees/`.** Different concern; tracked alongside the worktree
  feature itself.
- **Auto-publishing to npm.** Project remains `private`; distribution stays via
  `npx github:`.
- **#43 (already shipped in PR #45).** Mentioned only for relationship; no further work
  here.

---

## 9. References

- Issue #44 — bug report (this document's authority for scope)
- Issue #43 / PR #45 — version-bump-driven npx-cache fix; necessary precondition but does
  not close #44
- Issue #36 / PR #41 — Claude Code–only refactor; produced the post-2026-04-25
  sandbox-policy.md content that diverged from the user-global mirror
- `docs/issues/cli-update-rules-bug.md` — sibling planning doc; format/tone reference
- `docs/issues/drop-platforms.md` — sibling planning doc; format reference
- `bin/aphelion-agents.mjs` — current CLI source (for §6.2 patch reference)
- `package.json` — current `files` and `version` (for §6.3 patch reference)
- `scripts/smoke-update.sh` — current smoke test (for §6.4 patch reference)
- `~/git/aphelion-agents/.claude/rules/sandbox-policy.md` — concrete example of a
  diverged-from-global file at the time #44 was raised (resolved separately by
  `update --user` post-#45, but the structural dual-load remains regardless)

---

## 10. Open Questions (awaiting user sign-off)

The following resolutions are **proposed**; the user's reply confirms or overrides each.

- Q1 (D1, D2): Adopt **Option B — relocate canonical source to `src/.claude/rules/`** as
  the structural fix?
- Q2 (D3, ADR-001): Keep `agents/`, `commands/`, `orchestrator-rules.md`, and
  `settings.local.json` at repo root (only `rules/` moves)?
- Q3 (D4): Hard-code the new path in the CLI without a backward-compat probe?
- Q4 (D8, ADR-003): Single PR for the migration?
- Q5 (D9, D10, ADR-004): Bump to `0.3.0`, no separate `migrate` command?
- Q6 (ADR-005): Accept "Aphelion maintainers' rule edits don't take effect until
  `update --user`" as a feature, and document accordingly?
- Q7 (Out of Scope): Confirm devcontainer-based isolation (Option C) is deferred to a
  separate ticket?
