# Wiki sync with recent agent/rules refactors (#62, #66, #72, #74)

> GitHub Issue: [#77](https://github.com/kirin0198/aphelion-agents/issues/77)
> Analyzed by: analyst (2026-04-26)
> Implemented in: TBD
> Next: developer

## §1 Background / Trigger

Recent merged PRs changed agent responsibilities and externalized rule contents,
but the bilingual wiki under `docs/wiki/{en,ja}/` was not updated alongside.
The Main session conducted a survey on 2026-04-26 and identified concrete
staleness in 4 wiki pages plus 3 pages requiring a consistency review.

Triggering PRs:

- **#62** — redesign `/issue-new` as structured intake gate paired with `/analyst`
- **#66** — shrink `analyst` scope by removing branch/PR creation responsibilities
- **#72** — document branch/PR creation ownership in `developer.md`
- **#74** — externalize git/repository policy into `git-rules.md`
  (added Repository / Startup Probe / Branch & PR Strategy / Behavior by
  Remote Type sections)

Concurrent context:
- Issues #75 (`chore(i18n): clarify language policy for Aphelion's own bilingual wiki`)
  and #76 (`refactor: clarify README ↔ Wiki responsibility split`) were just
  filed; their planning docs are untracked under `docs/design-notes/`.

## §2 Current state

> Line numbers below are from the survey snapshot; `developer` MUST re-grep
> before editing because intervening commits may shift them.

### A-1. `docs/wiki/en/Agents-Orchestrators.md` (analyst entry, ~L95–L103)

```
- **Responsibility**: Receives bug reports, feature requests, or refactoring
  issues for existing projects. Classifies the issue, determines approach,
  updates SPEC.md / UI_SPEC.md incrementally, creates a GitHub issue, and
  hands off to architect.
- **Outputs**: Updated SPEC.md / UI_SPEC.md (incremental), GitHub issue
  (via gh CLI), PR
- **AGENT_RESULT fields**: `ISSUE_TYPE`, `ISSUE_SUMMARY`, `BRANCH`,
  `DOCS_UPDATED`, `GITHUB_ISSUE`, `PR_URL`, `ARCHITECT_BRIEF`
```

Stale because: post-#66, `analyst` no longer creates branches, commits, pushes,
or PRs. The PR / `BRANCH` / `PR_URL` references must be removed. Post-#62, the
default handoff is `developer` (with `architect` reserved for design-impacting
issues), so the wording "hands off to architect" needs to be relaxed to "hands
off to developer (or architect when design changes are required)".

### A-2. `docs/wiki/en/Agents-Delivery.md` (developer entry, ~L65–L76)

```
- **Responsibility**: Implements code following ARCHITECTURE.md implementation
  order. Manages progress via TASK.md (supports resume). Commits per task,
  runs lint/format checks after each task.
- **Outputs**: Implementation code, TASK.md
- **AGENT_RESULT fields**: `PHASE`, `TASKS_COMPLETED`, `LAST_COMMIT`,
  `LINT_CHECK`, `FILES_CHANGED`, `ACCEPTANCE_CHECK`
```

Stale because: post-#72, `developer` is the responsible owner of branch
creation, push, and PR submission. `BRANCH` and `PR_URL` are now part of the
mandatory `AGENT_RESULT` schema (per `git-rules.md` `## Branch & PR Strategy →
AGENT_RESULT additions`). The Responsibility/Outputs text must mention branch
& PR ownership.

### A-3. `docs/wiki/en/Rules-Reference.md` (git-rules entry, ~L79–L85)

```
- **Summary**: Defines commit granularity (one commit per task, …),
  staging policy (`git add -A` is prohibited; …), and commit message format
  (`{prefix}: {task-name} (TASK-{N})` with 8 prefix types: …).
```

Stale because: post-#74, `git-rules.md` adds four new top-level sections that
this Summary does not mention:

1. `## Repository` — `Remote type` declaration in `project-rules.md`
   (`github` / `gitlab` / `gitea` / `local-only` / `none`)
2. `## Startup Probe` — once-per-session probe that resolves `REPO_STATE`
3. `## Branch & PR Strategy` — branch naming, lifecycle, PR creation flow,
   `AGENT_RESULT` additions (`BRANCH`, `PR_URL`)
4. `## Behavior by Remote Type` — per-`REPO_STATE` git-op matrix

The Interactions paragraph also needs to mention that all Bash-owning agents
run the Startup Probe (not only commit-creating ones).

### A-4. `docs/wiki/en/Agents-Discovery.md` (rules-designer entry, ~L70–L78)

```
- **Responsibility**: Interactively determines project-specific coding
  conventions, Git workflow, and build commands. Generates
  `.claude/rules/project-rules.md`. …
- **Outputs**: `.claude/rules/project-rules.md`
- **AGENT_RESULT fields**: `LANGUAGE`, `FRAMEWORK`, `COMMIT_STYLE`,
  `BRANCH_STRATEGY`
```

Stale because: post-#74, `rules-designer` is the agent that asks the user to
declare `Remote type` (the value consumed by the Startup Probe). The
Responsibility text must mention Repository declaration; the `AGENT_RESULT`
field list must add `REPO_REMOTE_TYPE` (or however #74 named the field —
`developer` should re-confirm against `.claude/agents/rules-designer.md`).

### B-1. `docs/wiki/{en,ja}/Triage-System.md` (~L160–L195)

The Maintenance Flow phase tables read:

```
Phase 2: Issue creation         → analyst           → approval
Phase 3: Issue creation         → analyst            → approval
```

Concern: post-#62, the *intake* stage of issue creation is `/issue-new` and the
*analysis* stage is `/analyst`. In the maintenance flow context the wording
"Issue creation → analyst" still works (analyst is invoked after
`change-classifier`/`impact-analyzer` already have the change classified), so
this **may not need a rewrite**. `developer` should verify by reading the
current `analyst.md` "Intake during standalone invocation" vs. the
maintenance-flow handoff sections, and only rewrite if the table genuinely
contradicts current behavior.

### B-2. `docs/wiki/{en,ja}/Architecture-Operational-Rules.md`

Last updated 2026-04-25 (one day before #74 merged). Concern: the
sandbox-defense and orchestrator-startup sections mention auto-loaded rules
but predate the new Startup Probe pattern. Verify whether any sandbox /
startup paragraph needs to add a one-line reference to
`git-rules.md → ## Startup Probe`. Likely a small addition rather than a
rewrite.

### B-3. `docs/wiki/{en,ja}/Architecture-Protocols.md`

Last updated 2026-04-25. The page contains the generic AGENT_RESULT block
template and the `blocked` STATUS example, but does **not** quote concrete
field lists for `analyst` or `developer`. So the schema in this page is not
itself stale; it just delegates to per-agent pages. The only verification
needed is that the `AGENT_RESULT` block-format example does not contradict
the new `BRANCH` / `PR_URL` fields. Expected outcome: no edit required.

### C. JA counterparts

All A-group concerns reproduce identically in the JA pages because both
language editions were translated from the same source:

- `docs/wiki/ja/Agents-Orchestrators.md` (~L96–L104) — analyst entry
- `docs/wiki/ja/Agents-Delivery.md` (~L66–L77) — developer entry
- `docs/wiki/ja/Rules-Reference.md` (~L80–L86) — git-rules entry
- `docs/wiki/ja/Agents-Discovery.md` (~L71–L79) — rules-designer entry
- Plus B-group JA pages if any rewrite is performed in EN.

(Aside: the JA pages also contain a typo `AGENT_RESTULT` instead of
`AGENT_RESULT` repeated across multiple entries. This typo predates #74 and
is **out of scope** for this issue — flag it for a future cleanup but do not
fix here, to keep the diff focused.)

### D. Untracked design notes

```
docs/design-notes/wiki-language-policy-clarification.md   (issue #75)
docs/design-notes/readme-wiki-responsibility-split.md     (issue #76)
```

Untracked in the working tree at the moment this issue was filed. They belong
to the broader "wiki improvement" scope but are tracked under their own
issues. To prevent orphaning (precedent: PR #64 absorbed orphan files from
issue #61), this PR should commit them as the **first commit (chore)** before
the wiki-edit commits.

## §3 Proposed approach

### A-1. Rewrite analyst entry in Agents-Orchestrators (en/ja)

**After (en):**

```
- **Responsibility**: Receives bug reports, feature requests, or refactoring
  issues for existing projects. Classifies the issue, determines approach,
  updates SPEC.md / UI_SPEC.md incrementally (when needed), authors the
  matching `docs/design-notes/<slug>.md` planning document, creates a GitHub
  issue, and hands off to `developer` (or `architect` when design changes
  are required). Branch creation, push, and PR submission are owned by the
  next implementation-tier agent (`developer`), not by `analyst`.
- **Inputs**: User's issue description, existing SPEC.md, ARCHITECTURE.md,
  UI_SPEC.md
- **Outputs**: `docs/design-notes/<slug>.md`, updated SPEC.md / UI_SPEC.md
  (incremental), GitHub issue (via gh CLI)
- **AGENT_RESULT fields**: `ISSUE_TYPE`, `ISSUE_SUMMARY`, `DOCS_UPDATED`,
  `GITHUB_ISSUE`, `HANDOFF_TO`, `ARCHITECT_BRIEF`
- **NEXT conditions**: `developer` (default) | `architect` (when design
  changes are required)
```

JA mirrors the same structure with the established translation glossary
(see `localization-dictionary.md`).

### A-2. Rewrite developer entry in Agents-Delivery (en/ja)

**After (en):**

```
- **Responsibility**: Implements code following ARCHITECTURE.md implementation
  order. Owns branch creation, push, and PR submission per `git-rules.md`
  `## Branch & PR Strategy`. Manages progress via TASK.md (supports resume).
  Commits per task, runs lint/format checks after each task.
- **Inputs**: SPEC.md, ARCHITECTURE.md, UI_SPEC.md (if HAS_UI), TASK.md
  (if resuming), `docs/design-notes/<slug>.md` (if invoked from analyst
  handoff)
- **Outputs**: Implementation code, TASK.md, working branch, PR
- **AGENT_RESULT fields**: `PHASE`, `TASKS_COMPLETED`, `LAST_COMMIT`,
  `LINT_CHECK`, `FILES_CHANGED`, `ACCEPTANCE_CHECK`, `BRANCH`, `PR_URL`
- **NEXT conditions**: unchanged
```

### A-3. Rewrite git-rules entry in Rules-Reference (en/ja)

**After (en):**

```
- **Canonical**: [.claude/rules/git-rules.md](../../.claude/rules/git-rules.md)
- **Scope**: All Bash-owning agents (run the Startup Probe at session start);
  `developer`, `releaser`, `scaffolder` and any agent making git commits or
  PRs (commit / branch / PR rules).
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**:
  - Bash-owning agents run `## Startup Probe` once per session to resolve
    `REPO_STATE` (`github` | `github_unauth` | `gitlab_scaffold` |
    `gitea_scaffold` | `local-only` | `none`); subsequent git/PR ops branch on
    that value via `## Behavior by Remote Type`.
  - `developer` owns branch creation, push, and PR submission per
    `## Branch & PR Strategy` and emits `BRANCH` / `PR_URL` in
    `AGENT_RESULT`.
  - `analyst` does **not** create branches or PRs; it only authors design
    notes and GitHub issues.
- **Summary**: Defines (1) commit granularity, staging policy, and message
  format (8 prefix types); (2) Co-Authored-By trailer policy; (3)
  `## Repository` — `Remote type` declaration in `project-rules.md`; (4)
  `## Startup Probe` — once-per-session probe resolving `REPO_STATE`;
  (5) `## Branch & PR Strategy` — branch naming (`fix/` / `feat/` /
  `refactor/`), branch lifecycle (create → commit → push → PR with
  `Closes #N`), and `AGENT_RESULT` additions (`BRANCH`, `PR_URL`); (6)
  `## Behavior by Remote Type` — per-`REPO_STATE` matrix for branch / commit
  / push / PR ops.
```

### A-4. Rewrite rules-designer entry in Agents-Discovery (en/ja)

**After (en):**

```
- **Responsibility**: Interactively determines project-specific coding
  conventions, Git workflow, build commands, and **Repository declaration**
  (`Remote type`: `github` | `gitlab` | `gitea` | `local-only` | `none`,
  consumed by `git-rules.md` Startup Probe). Generates
  `.claude/rules/project-rules.md`. Runs on Light and above.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md (optional),
  POC_RESULT.md (optional)
- **Outputs**: `.claude/rules/project-rules.md`
- **AGENT_RESULT fields**: `LANGUAGE`, `FRAMEWORK`, `COMMIT_STYLE`,
  `BRANCH_STRATEGY`, `REPO_REMOTE_TYPE`
- **NEXT conditions**: `scope-planner`
```

> **Verification step for developer**: Confirm the field name `REPO_REMOTE_TYPE`
> by `grep -n REPO_REMOTE_TYPE .claude/agents/rules-designer.md` before
> writing — if `rules-designer.md` uses a different name, match the canonical.

### B-group: minimal review

For each of `Triage-System.md`, `Architecture-Operational-Rules.md`,
`Architecture-Protocols.md`:

1. Read the page in full alongside the canonical sources cited at its
   bottom.
2. If a stale phrase is found, write the smallest-possible fix and bump
   `Last updated` to 2026-04-26 with an `Update history` entry.
3. If no rewrite is needed, leave the page unchanged. Record the
   verification result in the PR body so reviewers don't re-check.

Expected outcome: B-1 likely needs no change; B-2 may need a one-line
"Startup Probe" mention; B-3 needs no change.

### C. EN/JA sync policy

For every EN page edited, edit the JA counterpart in the same commit.
Use `localization-dictionary.md` for fixed UI strings; produce free-form
narrative directly in JA following the established translation pattern of
existing JA wiki pages. Do **not** fix the `AGENT_RESTULT` typo in this PR.

### D. Concurrent chore commit

The PR's first commit absorbs the two untracked design notes:

```
chore: track wiki-improvement design notes (#75, #76)

- docs/design-notes/wiki-language-policy-clarification.md
- docs/design-notes/readme-wiki-responsibility-split.md

Brings the planning docs filed alongside #75 and #76 into version
control so they aren't orphaned. Implementation of #75/#76 itself is
out of scope for this PR (#77).
```

This precedent matches PR #64's handling of #61 orphan files.

## §4 Impact / risk

- **No code changes** — wiki only. Risk surface limited to documentation
  drift between EN/JA pairs.
- **No canonical source modification** — `.claude/agents/*.md`,
  `src/.claude/rules/*.md`, `aphelion-help.md` are read-only inputs for this
  task. Modifying them would invert the source-of-truth relationship.
- **PR archival workflow** — `archive-closed-plans.yml` will archive
  `wiki-sync-recent-refactors.md` when this PR closes via `Closes #77`.
  The two D-group design notes (#75, #76) are tracked under their own
  issues and will be archived independently when those close.

## §5 Document changes

### Wiki edits (EN / JA paired)

| File | Edit |
|---|---|
| `docs/wiki/en/Agents-Orchestrators.md` | Rewrite analyst entry per §3 A-1 |
| `docs/wiki/ja/Agents-Orchestrators.md` | Same in JA |
| `docs/wiki/en/Agents-Delivery.md` | Rewrite developer entry per §3 A-2 |
| `docs/wiki/ja/Agents-Delivery.md` | Same in JA |
| `docs/wiki/en/Rules-Reference.md` | Rewrite git-rules entry per §3 A-3 |
| `docs/wiki/ja/Rules-Reference.md` | Same in JA |
| `docs/wiki/en/Agents-Discovery.md` | Rewrite rules-designer entry per §3 A-4 |
| `docs/wiki/ja/Agents-Discovery.md` | Same in JA |

### Wiki review (B-group, edit only if review confirms staleness)

| File | Action |
|---|---|
| `docs/wiki/{en,ja}/Triage-System.md` | Review only; likely no edit |
| `docs/wiki/{en,ja}/Architecture-Operational-Rules.md` | Possibly add Startup Probe one-liner |
| `docs/wiki/{en,ja}/Architecture-Protocols.md` | Review only; likely no edit |

### `Last updated` bumps

For each touched wiki file, update the front-matter:

```
> Last updated: 2026-04-26
> Update history:
>   - 2026-04-26: Sync with #62, #66, #72, #74 (issue #77)
```

### D-group chore commit

| File | Action |
|---|---|
| `docs/design-notes/wiki-language-policy-clarification.md` | `git add` (track from chore commit) |
| `docs/design-notes/readme-wiki-responsibility-split.md` | `git add` (track from chore commit) |

### Out-of-touch (must NOT change)

- `.claude/agents/analyst.md`, `developer.md`, `rules-designer.md`
- `src/.claude/rules/git-rules.md`
- `aphelion-help.md`
- `docs/design-notes/wiki-sync-recent-refactors.md` (this file — generated
  by analyst, not edited by developer beyond optional `Implemented in: <PR>`
  bump at PR open)

## §6 Acceptance criteria

Machine-verifiable checks (run from repo root):

```bash
# A-1: analyst entry no longer mentions PR / BRANCH / PR_URL
! grep -nE "BRANCH|PR_URL|, PR$|via gh CLI\\), PR" \
  docs/wiki/en/Agents-Orchestrators.md docs/wiki/ja/Agents-Orchestrators.md

# A-2: developer entry mentions branch & PR ownership and lists BRANCH/PR_URL
grep -n "BRANCH" docs/wiki/en/Agents-Delivery.md docs/wiki/ja/Agents-Delivery.md
grep -n "PR_URL" docs/wiki/en/Agents-Delivery.md docs/wiki/ja/Agents-Delivery.md

# A-3: git-rules summary mentions all four new sections
for f in docs/wiki/en/Rules-Reference.md docs/wiki/ja/Rules-Reference.md; do
  grep -c "Repository\|Startup Probe\|Branch & PR\|Behavior by Remote" "$f"
  # expect: ≥4 hits each
done

# A-4: rules-designer entry includes REPO_REMOTE_TYPE
grep -n "REPO_REMOTE_TYPE" docs/wiki/en/Agents-Discovery.md docs/wiki/ja/Agents-Discovery.md

# EN/JA sync: every EN file in the PR diff has a JA counterpart
git diff --name-only main...HEAD -- docs/wiki/en/ \
  | sed 's|/en/|/ja/|' \
  | xargs -I{} test -f {} && echo "JA counterparts present"

# Last updated bumped
for f in docs/wiki/en/Agents-Orchestrators.md docs/wiki/ja/Agents-Orchestrators.md \
         docs/wiki/en/Agents-Delivery.md docs/wiki/ja/Agents-Delivery.md \
         docs/wiki/en/Rules-Reference.md docs/wiki/ja/Rules-Reference.md \
         docs/wiki/en/Agents-Discovery.md docs/wiki/ja/Agents-Discovery.md; do
  grep -q "2026-04-26" "$f" || echo "MISSING: $f"
done

# D-group: orphan design notes are tracked
git ls-files docs/design-notes/wiki-language-policy-clarification.md
git ls-files docs/design-notes/readme-wiki-responsibility-split.md
# both should print their paths

# PR body contains "Closes #77"
gh pr view --json body --jq .body | grep -q "Closes #77"
```

Reviewer checklist:

- [ ] No content drift between EN and JA edits (paragraph counts equivalent)
- [ ] No canonical source files (`.claude/agents/*.md`,
      `src/.claude/rules/*.md`) appear in the diff
- [ ] B-group verification result recorded in PR body (edited / verified
      no change needed)
- [ ] `Closes #77` present in PR body so the design note auto-archives

## §7 Out of scope

- Implementation of issue **#75** (DESIGN.md / wiki language policy) — its
  design note is committed by this PR but its body changes are deferred
- Implementation of issue **#76** (README ↔ Wiki responsibility split) —
  same treatment
- Fixing the `AGENT_RESTULT` typo in JA wiki pages — flag for a separate
  cleanup PR to keep this diff focused on the four refactor-driven changes
- New wiki content not directly required by #62 / #66 / #72 / #74
- Any modification to `.claude/agents/*.md`, `src/.claude/rules/*.md`,
  `aphelion-help.md` (these are read-only sources of truth here)
- Localization-dictionary edits

## §8 Handoff brief for developer

### Recommended branch name

`chore/wiki-sync-recent-refactors`

(`developer` may pick a different `{short-description}` if preferred; the
prefix `chore/` is correct because no behavioral change ships.)

### Recommended commit sequence

```
1. chore: track wiki-improvement design notes (#75, #76)
   - docs/design-notes/wiki-language-policy-clarification.md
   - docs/design-notes/readme-wiki-responsibility-split.md

2. docs(wiki): rewrite analyst entry post-#62 / #66 (en/ja)
   - docs/wiki/en/Agents-Orchestrators.md
   - docs/wiki/ja/Agents-Orchestrators.md

3. docs(wiki): document developer branch/PR ownership post-#72 (en/ja)
   - docs/wiki/en/Agents-Delivery.md
   - docs/wiki/ja/Agents-Delivery.md

4. docs(wiki): expand git-rules summary post-#74 (en/ja)
   - docs/wiki/en/Rules-Reference.md
   - docs/wiki/ja/Rules-Reference.md

5. docs(wiki): add Repository declaration to rules-designer post-#74 (en/ja)
   - docs/wiki/en/Agents-Discovery.md
   - docs/wiki/ja/Agents-Discovery.md

6. (conditional) docs(wiki): B-group review fixes (en/ja)
   Only if review confirms staleness — otherwise skip.
```

Each `docs(wiki):` commit must update its file's `Last updated: 2026-04-26`
and `Update history` entry.

### PR title / body template

**Title** (≤ 70 chars):
`chore(wiki): sync with #62, #66, #72, #74 + track #75/#76 design notes`

**Body**:

````markdown
## Summary
- Sync `docs/wiki/{en,ja}/` with the four refactor PRs that changed agent
  responsibilities and externalized git/repository policy.
- Track two orphan design notes (#75, #76) in the first chore commit per
  the PR #64 precedent.

## Changes (per file pair)
- `Agents-Orchestrators.md` — rewrite analyst entry (#62, #66)
- `Agents-Delivery.md` — add branch/PR ownership + `BRANCH`/`PR_URL` to
  developer entry (#72)
- `Rules-Reference.md` — expand git-rules summary with the 4 new sections
  (#74)
- `Agents-Discovery.md` — add `REPO_REMOTE_TYPE` to rules-designer entry
  (#74)

## B-group review result
- `Triage-System.md`: <verified no change needed | edited because …>
- `Architecture-Operational-Rules.md`: <…>
- `Architecture-Protocols.md`: <…>

## Concurrent chore commit
- `docs/design-notes/wiki-language-policy-clarification.md` (#75)
- `docs/design-notes/readme-wiki-responsibility-split.md` (#76)

## Related Issue
Closes #77

## Linked Plan
docs/design-notes/wiki-sync-recent-refactors.md

## Test plan
- [ ] `grep` checks from §6 acceptance criteria pass
- [ ] EN/JA paragraph counts match per file
- [ ] `gh pr view` body contains `Closes #77`
- [ ] No `.claude/agents/` or `src/.claude/rules/` files in diff
````

### Pre-flight reminders for developer

1. Re-grep the four A-group line numbers — they may have shifted.
2. Confirm `REPO_REMOTE_TYPE` is the actual field name used in
   `.claude/agents/rules-designer.md` (`grep -n REPO_REMOTE_TYPE
   .claude/agents/rules-designer.md`); if different, match the canonical.
3. Do not touch `.claude/agents/*.md`, `src/.claude/rules/*.md`, or
   `aphelion-help.md`.
4. Commit the chore (D-group) **first** so the design notes are tracked
   before the wiki edits, mirroring PR #64's pattern.
5. Read `Contributing.md` "bilingual sync policy" before pushing.
