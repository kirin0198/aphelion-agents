# `/issue-new` slash command + `docs/issues/` → `docs/design-notes/` rename

> Reference: current `main` (HEAD `827c00e`, 2026-04-25)
> Created: 2026-04-25
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#51](https://github.com/kirin0198/aphelion-agents/issues/51)

---

## 1. Background & Motivation

Today, every new piece of work requires the user to manually:

1. Ask Claude (in plain prose) to draft a planning document under `docs/issues/`.
2. Run `gh issue create` separately, copying the title/summary by hand.
3. Edit the planning doc to insert the resulting issue number into the
   `> GitHub Issue: [#N]` header.

This is repetitive and error-prone — the `analyst` agent is intended for *deep*
analysis work, not for the lightweight "open an issue + scaffold a planning doc"
workflow that happens at the very start of any task. The user wants a
single-command entry point that produces both artefacts atomically.

A second, related concern: the directory name `docs/issues/` is misleading. Its
contents are **not** issue tickets — they are RFC-style design / planning
documents (background, alternatives considered, decisions). The current name
implies redundancy with GitHub Issues and confuses new contributors. Renaming
it to `docs/design-notes/` aligns the path with the actual content type.

---

## 2. Why keep both GitHub Issues *and* in-repo design notes

Before deciding on the rename, we audited whether the directory should be
abolished entirely (single-source-of-truth in GitHub Issues). Conclusion: the
two artefacts serve **non-overlapping** roles.

| Concern | GitHub Issue | `docs/design-notes/*.md` |
|---|---|---|
| Status / assignee / labels / milestones | canonical | n/a |
| Discussion log, comments, reactions | canonical | n/a |
| Long-form design (background, alternatives, ADR-style rationale) | poor — body has limits, comments fragment context | canonical |
| Reference from a specific git commit / branch | n/a | canonical |
| Loaded as agent context (Read tool, no API/auth) | indirect | direct |
| Offline browsing | requires network | works |
| Survives issue deletion / edit | mutable upstream | git-immutable |

**Decision:** keep both. GitHub is the *tracker*; in-repo md is the *design
record*. The new slash command writes both at once; the renamed directory makes
the distinction explicit.

---

## 3. Decision summary

Selected by user (2026-04-25):

- **Automation approach: A — single new slash command `/issue-new`.**
  No changes to `analyst` in this issue (analyst extension can be a separate
  follow-up if it ever proves needed; A alone is expected to be sufficient).
- **Directory: rename `docs/issues/` → `docs/design-notes/`.**
  Includes `docs/issues/archived/` → `docs/design-notes/archived/`.
- **Out of scope for this issue:**
  - Extending `analyst` to call `gh issue create`.
  - Building a richer issue-creator agent.
  - Migrating closed planning docs out of `archived/`.

---

## 4. `/issue-new` design

### 4.1 Behaviour (high level)

`/issue-new` is a slash command file at `.claude/commands/issue-new.md` whose
body instructs Claude to:

1. Resolve user input via `AskUserQuestion`:
   - **Title** (free text — falls back to text input since titles cannot be enumerated).
   - **Category**: `feat` / `fix` / `chore` / `docs` / `refactor` / `ci` / `ops`.
     Drives the issue title prefix and the planning-doc tone.
   - **Summary** (free text, 1–3 sentences — used as both the GitHub issue body
     and the planning-doc Section 1 stub).
   - **Slug** (kebab-case filename for `docs/design-notes/<slug>.md`).
     Pre-filled from a slugified title; user can override.
2. Generate the planning-doc skeleton at `docs/design-notes/<slug>.md` using
   the same header format as existing files (Reference / Created / Author /
   Scope / GitHub Issue placeholder).
3. Run `gh issue create --title "<prefix>: <title>" --body "<summary>"` and
   capture the resulting issue number.
4. Edit the planning doc to replace the `GitHub Issue: TBD` placeholder with
   the real `[#N](https://github.com/<owner>/<repo>/issues/N)` link.
5. Report back to the user: planning-doc path + GitHub issue URL.

### 4.2 Why a slash command, not an agent

- The work is mechanical (template fill + one `gh` call). It does not require
  an isolated context window or specialised tool set.
- Slash commands in `.claude/commands/` are the established pattern for
  Aphelion entry points (12 already exist).
- An agent would require a new file under `.claude/agents/`, an `AGENT_RESULT`
  contract, and rules for how the orchestrators interact with it — all
  overhead with no benefit at this scope.

### 4.3 Permission considerations

`/issue-new` uses `gh issue create`, which is an external-net write. Under
`sandbox-policy.md` this falls under `external_net` (recommended tier).
Because the user explicitly invoked `/issue-new`, the command can proceed
without sandbox-runner delegation, but should display the resolved
`gh issue create` invocation before running it (so the user can abort
if the title/summary look wrong).

### 4.4 Skeleton template (informative — implementer's reference)

```markdown
# <Title>

> Reference: current `main` (HEAD `<short-sha>`, <YYYY-MM-DD>)
> Created: <YYYY-MM-DD>
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#N](https://github.com/<owner>/<repo>/issues/N)

---

## 1. Background & Motivation

<summary from AskUserQuestion>

---

## 2. Proposed approach

TBD — to be filled in by analyst or developer when picked up.

---

## 3. Out of scope

TBD.
```

---

## 5. Rename plan: `docs/issues/` → `docs/design-notes/`

### 5.1 Files that reference `docs/issues/`

Audit at HEAD `827c00e` (excluding the planning docs themselves):

| File | Type of reference |
|---|---|
| `.github/workflows/archive-closed-plans.yml` | Hard-coded glob `docs/issues/*.md` and `docs/issues/archived/<basename>` target path (lines ~74, ~80) |
| `src/.claude/rules/document-versioning.md` | Prose mention: *"the matching `docs/issues/<slug>.md` planning document"* |
| `docs/wiki/en/Contributing.md` | Prose mention: *"Planning documents in `docs/issues/` are written by the analyst phase"* |
| `docs/wiki/ja/Contributing.md` | JA equivalent |
| `docs/wiki/en/Architecture-Operational-Rules.md` | Mentioned in operational-rules wording |
| `docs/wiki/ja/Architecture-Operational-Rules.md` | JA equivalent |
| `site/src/content/docs/en/contributing.md` | Mirror of wiki |
| `site/src/content/docs/ja/contributing.md` | Mirror of wiki |
| `site/src/content/docs/en/architecture-operational-rules.md` | Mirror of wiki |
| `site/src/content/docs/ja/architecture-operational-rules.md` | Mirror of wiki |
| `CHANGELOG.md` | Historical entry — **do not rewrite**; old paths are correct as-of that release |

### 5.2 Execution order (for the future implementer)

1. `git mv docs/issues docs/design-notes` (preserves history).
2. Update `.github/workflows/archive-closed-plans.yml` — change both the scan
   glob and the archived-target path to `docs/design-notes/`.
3. Update the prose references listed in §5.1 (skip `CHANGELOG.md`).
4. Update `analyst.md` agent definition if it hard-codes the path
   (verify during implementation; the audit found no current hard-coding,
   only prose).
5. Update `/issue-new` itself to write into `docs/design-notes/`.
6. Verify by dry-running the archive workflow logic locally on a sample PR
   body containing `Closes #N`.

### 5.3 Backward compatibility

No external consumers depend on `docs/issues/` URLs (the directory is project-
internal documentation). The `git mv` preserves git blame / log, so historical
attribution is unchanged. PRs in flight at the time of the rename will need a
trivial rebase, which we accept.

---

## 6. Acceptance criteria

For the follow-up implementation PR to close this issue, the following must
hold:

1. `.claude/commands/issue-new.md` exists and is documented in `/aphelion-help`.
2. Running `/issue-new` produces (a) a populated `docs/design-notes/<slug>.md`
   and (b) a GitHub issue, with the issue number wired into the doc header.
3. `docs/issues/` no longer exists at any path; all live and archived planning
   docs are under `docs/design-notes/` (including this very planning document —
   see §7 note on self-rename).
4. `archive-closed-plans.yml` continues to function. Verification approach
   (pick one, record in PR description):
   - **Static check**: `grep -r "docs/issues" .github/` returns zero matches,
     AND `grep "docs/design-notes" .github/workflows/archive-closed-plans.yml`
     finds both the scan glob and the move-target path.
   - **Dry-run**: invoke the workflow with `workflow_dispatch` on a branch and
     confirm the archive move target resolves under `docs/design-notes/archived/`.
5. All prose references in §5.1 (excluding `CHANGELOG.md`) are updated.
   Verification: `grep -rn "docs/issues" docs/ src/ site/` returns only matches
   inside `CHANGELOG.md` (or zero matches if `CHANGELOG.md` lives elsewhere).
6. `/issue-new` has a defined behaviour for slug collision — see §7 below.

### 6.1 Verification commands (developer reference)

Run these in order at the end of the implementation PR:

```bash
# (a) directory rename complete
test ! -d docs/issues && test -d docs/design-notes

# (b) no stale references outside CHANGELOG
grep -rn "docs/issues" . \
  --exclude-dir=.git --exclude-dir=node_modules \
  --exclude=CHANGELOG.md \
  | grep -v '^Binary file' \
  || echo "OK: no stale references"

# (c) workflow updated
grep -c "docs/design-notes" .github/workflows/archive-closed-plans.yml
# expect: >= 2 (scan glob + move target)

# (d) /issue-new exists and is non-empty
test -s .claude/commands/issue-new.md
```

---

## 7. Risks and open questions

- **Wiki/site mirror drift.** `docs/wiki/**` and `site/src/content/docs/**`
  are mirrors; the implementer must update both. Failure to do so produces
  stale links in the published site.
- **`archive-closed-plans.yml` is the only piece of automation that hard-codes
  the path.** If overlooked, planning docs stop archiving silently. §6 item 4
  exists to catch this.
- **Should the rename also retitle `archived/`?** No — `archived/` is a
  sub-concept and its name is fine. Only the parent directory renames.
- **Self-rename of this planning document.** This file currently lives at
  `docs/issues/issue-new-command-and-rename.md`. The implementer's `git mv
  docs/issues docs/design-notes` will sweep it along with everything else, so
  no special handling is needed — but reviewers occasionally flag the apparent
  paradox ("the file is describing its own move"). Calling it out here so it
  is not mistaken for an oversight.
- **Slug collision in `/issue-new`.** Decision: if
  `docs/design-notes/<slug>.md` already exists, `/issue-new` must **abort with
  an error** rather than overwrite or auto-suffix. Rationale:
  - Overwriting risks silent loss of an existing design note.
  - Auto-suffixing (`<slug>-2.md`) creates near-duplicate filenames that
    fragment context.
  - Aborting forces the user to either pick a more specific slug or
    intentionally extend the existing document, both of which are the
    correct human decisions.

  Implementation note: check `test -e docs/design-notes/<slug>.md` *before*
  calling `gh issue create`, so a collision does not leave a dangling GitHub
  issue with no matching design note.
- **`gh` not authenticated.** If `gh auth status` fails, `/issue-new` should
  surface the error to the user and offer to skip GitHub issue creation
  (writing only the local design note with `> GitHub Issue: skipped (no gh
  auth)` in the header). This matches the analyst.md fallback pattern for
  missing remote.
