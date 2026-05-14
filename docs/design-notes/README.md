# Planning Documents (active)

Working planning documents produced during the analyst phase of the
Aphelion workflow. Each file here is tied to a GitHub issue that is still
**open**. Once the issue closes (typically when the corresponding PR
merges), the file is moved into `archived/` automatically.

For closed/historical notes, see [`archived/README.md`](./archived/README.md).
For ideas that have NOT been promoted to a GitHub issue yet, see
[`proposals/README.md`](./proposals/README.md).

## Header convention

Every planning doc directly under this directory MUST start with the
following frontmatter-style header (the comment-quoted block at the very
top of the file):

```markdown
> Last updated: <YYYY-MM-DD>
> GitHub Issue: [#N](<URL>)
> Analyzed by: analyst (<YYYY-MM-DD>)
> Next: <architect | developer | TBD>
```

The `> GitHub Issue: [#N](...)` line is **required** so that the archive
automation can match the file to its issue. If you write a planning doc
without a backing issue, place it under `proposals/` instead.

## Evergreen notes

A small number of files in this directory may lack a `> GitHub Issue:`
header. These are **evergreen reference notes** — architectural overviews
or standing guidelines that are not tied to any single issue. The archive
automation skips these files safely (they contain no issue number to
match). Do not move them unless the content has become stale or has been
superseded by a wiki page.

Current evergreen notes: `compliance-auditor.md`, `performance-optimizer.md`.

## Lifecycle

```
docs/design-notes/proposals/<slug>.md     (idea, no issue)
              │
              │ analyst promotes the idea, creates a GitHub issue
              ▼
docs/design-notes/<slug>.md               (active planning doc, this directory)
              │
              │ PR merges with `Closes #N` body  (reactive path)
              │   .github/workflows/archive-closed-plans.yml
              │   moves file inside the merging PR
              │ ─── OR ───
              │ weekly cron finds the linked issue is CLOSED
              │   .github/workflows/archive-orphan-plans.yml
              │   opens a separate "chore: archive orphaned" PR
              ▼
docs/design-notes/archived/<slug>.md      (historical record)
```

## Manual fallback

If neither automated path moved the file (rare; e.g. the issue has no
backing PR and the cron has not yet run), archive manually:

```bash
git mv docs/design-notes/<slug>.md docs/design-notes/archived/
git commit -m "chore: archive <slug> manually"
```

## What does NOT belong here

- Closed-issue planning docs → see `archived/`.
- Issue-less ideas / drafts → see `proposals/`.
- Evergreen reference material (architecture overviews, glossaries) →
  see `docs/wiki/`.
- Customer-facing deliverables → see `docs/deliverables/{slug}/`.

## Cross-references

- [`archived/README.md`](./archived/README.md) — historical planning docs
- [`proposals/README.md`](./proposals/README.md) — pre-issue idea staging
- `docs/wiki/en/Contributing.md` — PR checklist incl. archive policy
- `.github/workflows/archive-closed-plans.yml` — reactive archive
- `.github/workflows/archive-orphan-plans.yml` — weekly safety net
