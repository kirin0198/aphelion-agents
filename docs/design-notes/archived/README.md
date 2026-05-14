# Archived Planning Documents

> For active planning docs (issue still open), see
> [`../README.md`](../README.md).
> For issue-less ideas, see [`../proposals/README.md`](../proposals/README.md).

Historical record of planning documents whose corresponding GitHub issues are
**closed** and whose work has shipped. Files here are preserved verbatim from the
analyst phase that produced them, including superseded line numbers, ADR
references to since-removed code, and decisions that later evolved.

## Why these are kept

- **Traceability** — each file ties an analyst-phase decision to the PR(s) that
  shipped it. ADRs in particular often explain *why* a tempting alternative was
  rejected; that reasoning is still useful when revisiting the same problem.
- **Onboarding** — new contributors who want to understand a feature's design
  history can read the planning doc before the code.
- **Cross-reference** — newer planning documents (in `docs/design-notes/`) cite older
  ones by relative path. Moving rather than deleting preserves those links.

## What does NOT belong here

- Planning docs whose corresponding issue is still **open**. Those live in
  `docs/design-notes/` (one level up).
- Documents that were never tied to an issue / PR. Those should be elsewhere
  (e.g. `docs/wiki/` for evergreen reference).
- Files modified after archival. Once archived, treat the file as read-only;
  if the same problem recurs, write a new planning document with a fresh
  filename and reference the archived one.

## How files arrive here

1. **Automatic** (the default) — `.github/workflows/archive-closed-plans.yml`
   fires on `pull_request: opened` / `edited` / `synchronize`. It scans the PR
   body for `Closes #N` / `Fixes #N` / `Resolves #N` keywords, finds matching
   planning docs by `GitHub Issue: [#N](...)` header reference, `git mv`'s
   them into this directory, and pushes the commit back to the PR branch.
   The archive move ships **in the same PR as the work**, not as a separate
   follow-up PR.

   The workflow is idempotent: if the planning doc is already archived (or
   no match exists), it is a no-op. Bot loops are prevented by an actor
   filter plus the idempotency check.

   **Edge case.** The workflow trusts `Closes #N` as a commitment that
   merging will close the issue. If the PR is ultimately closed *without
   merging*, manually move the file back: `git mv docs/design-notes/archived/<slug>.md
   docs/design-notes/<slug>.md` and open a small chore PR.

2. **Weekly safety net** — `.github/workflows/archive-orphan-plans.yml`
   runs every Monday at 03:00 UTC and on-demand via `workflow_dispatch`.
   It catches planning docs whose linked issue was closed but were not
   picked up by the PR-driven workflow (e.g. the PR body lacked a
   `Closes #N` keyword, or the issue was closed without a PR).
   The workflow opens a `chore: archive orphaned planning docs` PR for
   human review; it never commits directly to main.

3. **Manual fallback** — `git mv docs/design-notes/<slug>.md docs/design-notes/archived/`
   then commit. Use this if neither automated path applied (e.g. the
   planning doc has no `> GitHub Issue:` header).

See [Contributing.md](../../wiki/en/Contributing.md) for the full PR checklist
and policy.
