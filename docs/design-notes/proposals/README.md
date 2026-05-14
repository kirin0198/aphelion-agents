# Proposals

Pre-issue ideas and exploration notes. Files here are intentionally
**not** tied to a GitHub issue. They exist to give contributors a place
to draft a problem statement before deciding whether it merits a real
planning doc + issue.

## Header convention

Proposals do NOT use the same header as planning docs. Use the following
instead (the `> GitHub Issue:` line is deliberately absent):

```markdown
> Status: proposal
> Author: <name or handle>
> Created: <YYYY-MM-DD>
> Last updated: <YYYY-MM-DD>
```

## Lifecycle

1. **Draft** — write `proposals/<slug>.md` with whatever level of detail
   you have. No PR template, no review gate.
2. **Promote** — once the proposal is ready to act on, an analyst:
   - opens a GitHub issue,
   - moves the file to `docs/design-notes/<slug>.md` (or rewrites it
     from scratch using the analyst design-note template),
   - replaces the `> Status: proposal` header block with the standard
     `> GitHub Issue: [#N](...)` block.
3. **Reject / pending** — leave the file in place. If the project has
   accumulated rejected proposals, consider moving them to
   `proposals/archived/` (deferred; see §5).

## Out of scope for automation

- `proposals/*.md` are **excluded** from `archive-closed-plans.yml`
  (they have no issue number to match) and from
  `archive-orphan-plans.yml` (the cron only walks
  `docs/design-notes/*.md` one level deep).
- Aphelion agents (`doc-reviewer`, `handover-author`, ...) do NOT read
  files under `proposals/`. They are human-facing scratch space.

## Cross-references

- [`../README.md`](../README.md) — active planning docs
- [`../archived/README.md`](../archived/README.md) — closed planning docs
