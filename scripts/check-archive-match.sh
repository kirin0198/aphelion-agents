#!/usr/bin/env bash
# check-archive-match.sh
#
# Regression test for the archive workflow anchored grep fix (#150).
# Verifies that the whole-file line-start-anchored grep expression used by
# archive-closed-plans.yml and archive-orphan-plans.yml correctly:
#
#   1. Matches setup-improvement.md (archived, #130): the real doc that
#      was originally missed due to the head -n 20 window bug.
#   2. Matches the Pattern B regression fixture for issue #9999 (both via
#      ISSUE_NUMBER: inside the handoff block AND via the legacy header).
#   3. Does NOT produce a false positive for a document that only contains
#      a bare #N mention in prose (no anchor prefix).
#   4. Does NOT match #130 when testing for issue #13 (word-boundary check).
#   5. URL-only doc (no ISSUE_NUMBER: or header) extracts the issue number
#      from the ISSUE_URL: field correctly (locks MAJOR-1 fix).
#   6. This PR's own planning doc (archive-workflow-headn20-fix.md) does NOT
#      match for n=130 (prose/table quote) but DOES match for n=150 (real
#      header at line start) — locks the MINOR-1 line-start-anchor fix.
#
# Usage: bash scripts/check-archive-match.sh
# Exit 0 on all checks passed, exit 1 on any failure with a message on stderr.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

fail=0

# The canonical grep expression used in both archive workflows.
# Line-start anchors prevent prose sentences (e.g. "Issue #130 was...")
# and table cell quotes from over-matching. The `>` prefix is REQUIRED for
# the legacy header form — all real markers appear as `> GitHub Issue: [#N]`.
# Keep this in sync (char-for-char) with:
#   .github/workflows/archive-closed-plans.yml  (grep -qiE; ${n} instead of [0-9]+)
#   .github/workflows/archive-orphan-plans.yml  (grep -oiE; [0-9]+ for extraction)
# Anchor descriptions:
#   ^>[[:space:]]*(GitHub Issue:|Issue)[[:space:]]*\[?#N   — legacy header (required >)
#   ^[[:space:]]*ISSUE_NUMBER:[[:space:]]*N                — handoff YAML field
#   ^[[:space:]]*ISSUE_URL:.*/issues/N                     — handoff URL field (greedy .*)
match_issue() {
  local n="$1"
  local file="$2"
  grep -qiE \
    "^>[[:space:]]*(GitHub Issue:|Issue)[[:space:]]*\[?#${n}\b|^[[:space:]]*ISSUE_NUMBER:[[:space:]]*${n}\b|^[[:space:]]*ISSUE_URL:.*/issues/${n}\b" \
    "$file"
}

# ---- Check 1: setup-improvement.md (#130) --------------------------------
# This is the real-world doc that was silently skipped by the old workflow.
# The `> GitHub Issue: [#130]` marker is at line 35 (past the old head -n 20).
# The `ISSUE_NUMBER: 130` field is inside the handoff block near line 2.
DOC="${REPO_ROOT}/docs/design-notes/archived/setup-improvement.md"
if [ ! -f "${DOC}" ]; then
  echo "SKIP (file not found): ${DOC}" >&2
else
  if match_issue 130 "${DOC}"; then
    echo "PASS: setup-improvement.md matches issue #130"
  else
    echo "FAIL: setup-improvement.md should match issue #130 but did NOT" >&2
    fail=1
  fi
fi

# ---- Check 2a: Pattern B fixture -- ISSUE_NUMBER: form (#9999) -----------
FIXTURE="${REPO_ROOT}/tests/fixtures/archive/pattern-b-handoff.md"
if [ ! -f "${FIXTURE}" ]; then
  echo "FAIL: regression fixture missing: ${FIXTURE}" >&2
  fail=1
else
  if match_issue 9999 "${FIXTURE}"; then
    echo "PASS: pattern-b-handoff.md matches issue #9999"
  else
    echo "FAIL: pattern-b-handoff.md should match issue #9999 but did NOT" >&2
    fail=1
  fi
fi

# ---- Check 2b: Verify the old head -n 20 window WOULD have missed it -----
if [ -f "${FIXTURE}" ]; then
  if head -n 20 "${FIXTURE}" | grep -qE "(GitHub Issue:|Issue) \[?#9999\b"; then
    echo "NOTE: head-n-20 window found the marker (fixture may have moved)" >&2
  else
    echo "PASS: head-n-20 window correctly misses the marker (bug confirmed)"
  fi
fi

# ---- Check 3: False-positive guard ----------------------------------------
# A document that only contains "Refs #4242" in prose (no anchor prefix)
# must NOT match issue #4242.
TMPFILE=$(mktemp)
trap 'rm -f "${TMPFILE}"' EXIT
cat > "${TMPFILE}" <<'NODOC'
# Some prose doc

This document is related to Refs #4242, see also #4242 for context.
The fix was tracked in ticket #4242.
NODOC

if match_issue 4242 "${TMPFILE}"; then
  echo "FAIL: false-positive detected — bare #4242 in prose should NOT match" >&2
  fail=1
else
  echo "PASS: no false positive for bare #4242 in prose"
fi

# ---- Check 4: Word-boundary guard -----------------------------------------
# Issue #13 must not match a doc whose only marker is ISSUE_NUMBER: 130.
cat > "${TMPFILE}" <<'NODOC'
<!-- analyst-handoff
ISSUE_NUMBER: 130
-->
NODOC

if match_issue 13 "${TMPFILE}"; then
  echo "FAIL: word-boundary failed — issue #13 matched ISSUE_NUMBER: 130" >&2
  fail=1
else
  echo "PASS: word-boundary OK — issue #13 does not match ISSUE_NUMBER: 130"
fi

# ---- Check 5: URL-only extraction (MAJOR-1 lock) --------------------------
# A doc with ONLY an issue_url: field at line start (no ISSUE_NUMBER: and no
# GitHub Issue: header) must still extract the correct issue number.
# This assertion would have caught the [^[:space:]]* dead-anchor bug.
cat > "${TMPFILE}" <<'NODOC'
<!-- analyst-handoff
issue_url: https://github.com/x/y/issues/7777
issue_title: "URL-only fixture for MAJOR-1 lock"
-->

# URL-only fixture

No ISSUE_NUMBER field and no GitHub Issue header above.
Only the issue_url: line should trigger a match for #7777.
NODOC

if match_issue 7777 "${TMPFILE}"; then
  echo "PASS: URL-only doc matches issue #7777 (MAJOR-1 lock)"
else
  echo "FAIL: URL-only doc did NOT match issue #7777 — MAJOR-1 fix may be broken" >&2
  fail=1
fi

# Also verify the orphan-style extraction (grep -oiE | grep -oE '[0-9]+$' | head -n1)
extracted=$(grep -oiE \
  '^>[[:space:]]*(GitHub Issue:|Issue)[[:space:]]*\[?#[0-9]+|^[[:space:]]*ISSUE_NUMBER:[[:space:]]*[0-9]+|^[[:space:]]*ISSUE_URL:.*/issues/[0-9]+' \
  "${TMPFILE}" \
  | grep -oE '[0-9]+$' \
  | head -n1 || true)
if [ "${extracted}" = "7777" ]; then
  echo "PASS: URL-only orphan-style extraction yields 7777"
else
  echo "FAIL: URL-only orphan-style extraction yielded '${extracted}' (expected 7777)" >&2
  fail=1
fi

# ---- Check 6: Prose-overmatch guard (MINOR-1 lock) -------------------------
# This PR's own planning doc quotes #130 inside table cells and prose. With
# the old un-anchored expression those lines would over-match. The new line-
# start anchors prevent this. The doc also owns issue #150 via a real header
# and handoff fields at line start — that must still match.
PLANNING_DOC="${REPO_ROOT}/docs/design-notes/archive-workflow-headn20-fix.md"
if [ ! -f "${PLANNING_DOC}" ]; then
  echo "SKIP (file not found): ${PLANNING_DOC}" >&2
else
  # n=130: prose/table quotes only — must NOT match
  if match_issue 130 "${PLANNING_DOC}"; then
    echo "FAIL: archive-workflow-headn20-fix.md over-matched #130 (MINOR-1 not fixed)" >&2
    fail=1
  else
    echo "PASS: archive-workflow-headn20-fix.md does NOT match #130 (prose quotes only)"
  fi

  # n=150: real header at line 2 — MUST match
  if match_issue 150 "${PLANNING_DOC}"; then
    echo "PASS: archive-workflow-headn20-fix.md matches #150 (real header)"
  else
    echo "FAIL: archive-workflow-headn20-fix.md should match #150 but did NOT" >&2
    fail=1
  fi
fi

# ---- Summary ---------------------------------------------------------------
if [ "${fail}" -eq 0 ]; then
  echo "All archive-match checks passed."
  exit 0
else
  echo "One or more checks FAILED — see messages above." >&2
  exit 1
fi
