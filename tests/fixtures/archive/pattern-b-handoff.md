<!-- analyst-handoff
planning_doc_path: docs/design-notes/pattern-b-handoff-fixture.md
slug: pattern-b-handoff-fixture
branch_name: fix/pattern-b-regression-9999
issue_url: https://github.com/example/repo/issues/9999
issue_number: 9999
issue_title: "test: Pattern B regression fixture for archive workflow"
issue_type: bug
intake_summary: |
  Regression fixture that reproduces the head -n 20 window bug.
  The analyst-handoff block is intentionally long (~24 lines total),
  so the legacy header line is pushed to approximately line 28 —
  past the old head-n-20 scan window. Workflows must detect the issue
  number via the ISSUE_NUMBER field above (line 6) even when the
  legacy header cannot be reached by a head-n-20 window.
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: <none>
  - UI_SPEC: <none>
  - ARCHITECTURE: <none>
auto_approve: false
output_language: en
-->
> Last updated: 2026-05-30
> Update history:
>   - 2026-05-30: Initial creation as regression fixture for #150
> GitHub Issue: [#9999](https://github.com/example/repo/issues/9999)
> Authored by: fixture

# Pattern B Handoff Regression Fixture

This file is a minimal stub that reproduces the `head -n 20` bug (issue #150).
The `<!-- analyst-handoff -->` block above is intentionally ~24 lines long so
that the legacy header is pushed to line 27, past the old head-n-20 window.

## Purpose

Prove that the fixed whole-file anchored grep in `archive-closed-plans.yml`
and `archive-orphan-plans.yml` correctly detects issue **#9999** via:

1. `ISSUE_NUMBER: 9999` inside the handoff block (line 6 above)
2. `> GitHub Issue: [#9999]` legacy header (line 27 above)

The old `head -n 20 | grep -qE ...` expression finds neither: the
`ISSUE_NUMBER:` token lacks the `#` prefix expected by the legacy pattern,
and the legacy header is at line 27.

## Verification

Run `scripts/check-archive-match.sh` to verify the grep expression matches
this fixture for issue 9999 and does not produce false positives.
