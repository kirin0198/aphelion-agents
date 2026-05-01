#!/usr/bin/env bash
# aphelion-md-sync.sh
# Aphelion dogfooding hook — MD sync guard (this repo only, NOT shipped via bin/init)
# Event:   PostToolUse on Edit|Write (docs/wiki/* or README*)
#          PreToolUse  on Bash(git commit*)
#
# Purpose: Remind developer to run check-readme-wiki-sync.sh when wiki or README files
#          are modified. Fires as a non-blocking advisory (PostToolUse) or a blocking
#          pre-commit gate (PreToolUse on git commit).
#
# Canonical path: src/.claude/hooks/aphelion-md-sync.sh
# Referenced by: .claude/settings.json (this repo's dogfooding settings, NOT src/.claude/settings.json)
#
# Dogfooding note: This hook is inert in user projects (copied via bin/ overlay but
# not registered in src/.claude/settings.json). To activate in user projects, manually
# add it to .claude/settings.json.

set -euo pipefail

HOOK_NAME="md-sync"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Fail-open: any uncaught error exits with 0 so hook bugs never block user work.
# shellcheck disable=SC2064
trap 'echo "[aphelion-hook:'"${HOOK_NAME}"'] internal error at line $LINENO; passing through" >&2; exit 0' ERR

# Read stdin (Claude Code hook payload JSON)
RAW_PAYLOAD="$(cat)"

# Determine event type from the payload: PreToolUse payloads have "tool_name" and "tool_input"
# PostToolUse payloads also have "tool_response". We detect by checking for "tool_response".
IS_POST_TOOL_USE=false
if printf '%s' "$RAW_PAYLOAD" | grep -q '"tool_response"'; then
  IS_POST_TOOL_USE=true
fi

# Check if sync script exists in this repo
SYNC_SCRIPT="${PROJECT_DIR}/scripts/check-readme-wiki-sync.sh"

if "$IS_POST_TOOL_USE"; then
  # PostToolUse on Edit|Write — advisory only (cannot block)
  # Extract the modified file path
  TARGET_PATH=$(printf '%s' "$RAW_PAYLOAD" \
    | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' \
    | head -1 \
    | sed -E 's/^"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')

  # Check if the file is a wiki or README file that requires sync check
  NEEDS_SYNC=false
  if printf '%s' "$TARGET_PATH" | grep -qE '(docs/wiki/|README)'; then
    NEEDS_SYNC=true
  fi

  if "$NEEDS_SYNC"; then
    echo "[aphelion-hook:${HOOK_NAME}] wiki/README file modified: $(basename "$TARGET_PATH")" >&2
    echo "[aphelion-hook:${HOOK_NAME}] Run 'bash scripts/check-readme-wiki-sync.sh' before committing." >&2
  fi
  exit 0
else
  # PreToolUse on Bash(git commit*) — run sync check and block if it fails
  # Extract commit command
  RAW_CMD=$(printf '%s' "$RAW_PAYLOAD" \
    | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | head -1 \
    | sed -E 's/^"command"[[:space:]]*:[[:space:]]*"//; s/"$//')

  # Only act on git commit commands
  if ! printf '%s' "$RAW_CMD" | grep -qE '^git commit'; then
    exit 0
  fi

  # Bypass marker
  if printf '%s' "$RAW_CMD" | grep -qE '\[skip-md-sync\]'; then
    echo "[aphelion-hook:${HOOK_NAME}] bypass marker [skip-md-sync] found — skipping sync check" >&2
    exit 0
  fi

  # Check if any staged files require sync validation
  STAGED=$(git -C "$PROJECT_DIR" diff --cached --name-only 2>/dev/null || true)
  if [ -z "$STAGED" ]; then
    exit 0
  fi

  NEEDS_SYNC=false
  if printf '%s\n' "$STAGED" | grep -qE '(docs/wiki/|README)'; then
    NEEDS_SYNC=true
  fi

  if ! "$NEEDS_SYNC"; then
    # No wiki/README files staged — skip sync check
    exit 0
  fi

  # Run the sync check script
  if [ ! -f "$SYNC_SCRIPT" ]; then
    echo "[aphelion-hook:${HOOK_NAME}] sync script not found at ${SYNC_SCRIPT}; passing through" >&2
    exit 0
  fi

  if ! bash "$SYNC_SCRIPT" 2>&1; then
    cat >&2 <<EOF
[aphelion-hook:${HOOK_NAME}] BLOCKED: check-readme-wiki-sync.sh reported inconsistencies.
- Fix the reported issues, then re-run git commit.
- Bypass: append [skip-md-sync] to the commit message if the sync check is a false positive.
EOF
    exit 2
  fi

  exit 0
fi
