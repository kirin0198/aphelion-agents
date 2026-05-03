#!/usr/bin/env bash
# aphelion-task-md-lifecycle.sh
# Aphelion dogfooding hook — TASK.md lifecycle guard (this repo only)
# Event:   PostToolUse on Write|Edit (TASK.md)
#
# Purpose: Check that TASK.md is being reset to the placeholder template when
#          all tasks are marked complete (all checkboxes ticked). Reminds
#          developer to reset TASK.md before phase completion commit.
#          Non-blocking advisory.
#
# Dogfooding rationale (OQ-C decision): The TASK.md lifecycle rule
#   (document-versioning.md §TASK.md Lifecycle) requires resetting TASK.md to
#   placeholder on phase completion. This hook catches the common mistake of
#   committing a fully-ticked TASK.md without resetting it. Clear dogfooding
#   value for this repo's own `developer` sessions. Implemented.
#
# Canonical path: src/.claude/hooks/aphelion-task-md-lifecycle.sh
# Referenced by: .claude/settings.json (this repo's dogfooding settings, NOT src/.claude/settings.json)
#
# Dogfooding note: This hook is inert in user projects (copied via bin/ overlay but
# not registered in src/.claude/settings.json). See aphelion-md-sync.sh for pattern.

set -euo pipefail

HOOK_NAME="task-md-lifecycle"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Fail-open: any uncaught error exits with 0 so hook bugs never block user work.
# shellcheck disable=SC2064
trap 'echo "[aphelion-hook:'"${HOOK_NAME}"'] internal error at line $LINENO; passing through" >&2; exit 0' ERR

# Read stdin (Claude Code hook payload JSON)
RAW_PAYLOAD="$(cat)"

# PostToolUse only (advisory; cannot block)
# Extract the file path that was written/edited
TARGET_PATH=$(printf '%s' "$RAW_PAYLOAD" \
  | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' \
  | head -1 \
  | sed -E 's/^"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')

[ -z "$TARGET_PATH" ] && exit 0

# Only act when TASK.md is the file being written
BASENAME=$(basename -- "$TARGET_PATH")
if [ "$BASENAME" != "TASK.md" ]; then
  exit 0
fi

TASK_MD_PATH="$TARGET_PATH"
if [ ! -f "$TASK_MD_PATH" ]; then
  exit 0
fi

# Count unchecked tasks [ ] and checked tasks [x]
UNCHECKED=$(grep -c '^\- \[ \]' "$TASK_MD_PATH" 2>/dev/null || true)
CHECKED=$(grep -c '^\- \[x\]' "$TASK_MD_PATH" 2>/dev/null || true)
TOTAL=$(( UNCHECKED + CHECKED ))

# If TASK.md has no task entries at all, it might already be the placeholder
if [ "$TOTAL" -eq 0 ]; then
  exit 0
fi

# If all tasks are checked and none are unchecked, phase is complete
# Remind developer to reset TASK.md to placeholder
if [ "$UNCHECKED" -eq 0 ] && [ "$CHECKED" -gt 0 ]; then
  cat >&2 <<EOF
[aphelion-hook:${HOOK_NAME}] All ${CHECKED} tasks in TASK.md are complete.
  Per document-versioning.md §TASK.md Lifecycle, reset TASK.md to placeholder
  before the final phase commit:
    echo '# TASK.md\n\n（フェーズ未割当。次回 \`developer\` 起動時に ARCHITECTURE.md を参照して再生成されます）' > TASK.md
  Then: git add TASK.md && git commit with the final phase commit.
  This ensures the next developer session starts from a clean state.
EOF
fi

# If TASK.md has more checked than unchecked (> 50% done), remind about approaching completion
if [ "$UNCHECKED" -gt 0 ] && [ "$CHECKED" -gt 0 ] && [ "$CHECKED" -gt "$UNCHECKED" ]; then
  echo "[aphelion-hook:${HOOK_NAME}] Progress: ${CHECKED}/${TOTAL} tasks complete. Remember to reset TASK.md on phase completion." >&2
fi

exit 0
