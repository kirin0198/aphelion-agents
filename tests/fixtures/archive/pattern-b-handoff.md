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
  The analyst-handoff block here is ~24 lines, pushing the
  > GitHub Issue: [#9999] marker past line 20 (to around line 35).
  Both the ISSUE_NUMBER: field inside this block (line ~6) and the
  legacy header line (~35) must be detected by the archive workflows.
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

This file is a minimal stub that reproduces the `head -n 20` bug described in
GitHub Issue #150. The `<!-- analyst-handoff -->` block above is intentionally
~24 lines long so that the `> GitHub Issue: [#9999]` marker is pushed past
line 20 (it appears at approximately line 35 in this file).

## Purpose

Prove that the fixed whole-file anchored grep in `archive-closed-plans.yml`
and `archive-orphan-plans.yml` correctly detects issue **#9999** via:

1. `ISSUE_NUMBER: 9999` inside the handoff block (line ~6 above)
2. `> GitHub Issue: [#9999]` legacy header (line ~35 above)

The old `head -n 20 | grep -qE ...` expression would have missed both.

## Verification

Run `scripts/check-archive-match.sh` to verify the grep expression matches
this fixture for issue 9999 and does not produce false positives.
