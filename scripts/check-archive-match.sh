#!/usr/bin/env bash
# check-archive-match.sh
#
# Regression test for the archive workflow anchored grep fix (#150).
# Verifies that the whole-file anchored grep expression used by
# archive-closed-plans.yml and archive-orphan-plans.yml correctly:
#
#   1. Matches setup-improvement.md (archived, #130): the real doc that
#      was originally missed due to the head -n 20 window bug.
#   2. Matches the Pattern B regression fixture for issue #9999 (both via
#      ISSUE_NUMBER: inside the handoff block AND via the legacy header).
#   3. Does NOT produce a false positive for a document that only contains
#      a bare #N mention in prose (no anchor prefix).
#   4. Does NOT match #130 when testing for issue #13 (word-boundary check).
#
# Usage: bash scripts/check-archive-match.sh
# Exit 0 on all checks passed, exit 1 on any failure with a message on stderr.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

fail=0

# The canonical grep expression used in both archive workflows.
# Keep this in sync with:
#   .github/workflows/archive-closed-plans.yml   (grep -qiE form)
#   .github/workflows/archive-orphan-plans.yml   (grep -oiE form)
match_issue() {
  local n="$1"
  local file="$2"
  grep -qiE \
    "(GitHub Issue:|Issue) \[?#${n}\b|ISSUE_NUMBER:[[:space:]]*${n}\b|ISSUE_URL:.*/issues/${n}\b" \
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

# ---- Summary ---------------------------------------------------------------
if [ "${fail}" -eq 0 ]; then
  echo "All archive-match checks passed."
  exit 0
else
  echo "One or more checks FAILED — see messages above." >&2
  exit 1
fi
