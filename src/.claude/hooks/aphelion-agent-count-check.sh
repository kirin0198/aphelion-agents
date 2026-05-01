#!/usr/bin/env bash
# aphelion-agent-count-check.sh
# Aphelion dogfooding hook — agent count consistency guard (this repo only)
# Event:   PostToolUse on Write|Edit (.claude/agents/*.md, README*.md, docs/wiki/*/Home.md)
#
# Purpose: When an agent file or README/Home.md is written, check that the agent count
#          reported in README.md / README.ja.md / wiki/en/Home.md / wiki/ja/Home.md
#          matches the actual number of .claude/agents/*.md files. Non-blocking advisory.
#
# Dogfooding rationale (OQ-C decision): The check-readme-wiki-sync.sh script already
# covers this as Check 1. This hook adds real-time feedback during editing (PostToolUse),
# before the developer reaches git commit. The dual coverage provides earlier signal with
# negligible overhead (pure grep + wc, < 50ms). Implemented.
#
# Canonical path: src/.claude/hooks/aphelion-agent-count-check.sh
# Referenced by: .claude/settings.json (this repo's dogfooding settings, NOT src/.claude/settings.json)
#
# Dogfooding note: This hook is inert in user projects (copied via bin/ overlay but
# not registered in src/.claude/settings.json). See aphelion-md-sync.sh for pattern.

set -euo pipefail

HOOK_NAME="agent-count-check"
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

# Only check when agent definition files, README, or Home.md are touched
RELEVANT=false
if printf '%s' "$TARGET_PATH" | grep -qE '(\.claude/agents/|README|docs/wiki/.*/Home\.md)'; then
  RELEVANT=true
fi

"$RELEVANT" || exit 0

# Count actual agent files
AGENTS_DIR="${PROJECT_DIR}/.claude/agents"
if [ ! -d "$AGENTS_DIR" ]; then
  exit 0
fi

ACTUAL=$(ls "$AGENTS_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')

# Extract reported counts from README.md
README_EN_PATH="${PROJECT_DIR}/README.md"
README_JA_PATH="${PROJECT_DIR}/README.ja.md"
HOME_EN_PATH="${PROJECT_DIR}/docs/wiki/en/Home.md"
HOME_JA_PATH="${PROJECT_DIR}/docs/wiki/ja/Home.md"

MISMATCH=false
MISMATCH_DETAILS=""

if [ -f "$README_EN_PATH" ]; then
  REPORTED=$(grep -hoE '[0-9]+ specialized agents|all [0-9]+ agents' "$README_EN_PATH" \
    | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
  if [ -n "$REPORTED" ] && [ "$REPORTED" != "$ACTUAL" ]; then
    MISMATCH=true
    MISMATCH_DETAILS="${MISMATCH_DETAILS}  README.md reports '${REPORTED}', actual=${ACTUAL}\n"
  fi
fi

if [ -f "$README_JA_PATH" ]; then
  REPORTED=$(grep -hoE '[0-9]+ の専門エージェント|[0-9]+ エージェント' "$README_JA_PATH" \
    | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
  if [ -n "$REPORTED" ] && [ "$REPORTED" != "$ACTUAL" ]; then
    MISMATCH=true
    MISMATCH_DETAILS="${MISMATCH_DETAILS}  README.ja.md reports '${REPORTED}', actual=${ACTUAL}\n"
  fi
fi

if [ -f "$HOME_EN_PATH" ]; then
  REPORTED=$(grep -oE 'all [0-9]+ agents' "$HOME_EN_PATH" \
    | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
  if [ -n "$REPORTED" ] && [ "$REPORTED" != "$ACTUAL" ]; then
    MISMATCH=true
    MISMATCH_DETAILS="${MISMATCH_DETAILS}  wiki/en/Home.md reports '${REPORTED}', actual=${ACTUAL}\n"
  fi
fi

if [ -f "$HOME_JA_PATH" ]; then
  REPORTED=$(grep -oE '[0-9]+ エージェント' "$HOME_JA_PATH" \
    | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
  if [ -n "$REPORTED" ] && [ "$REPORTED" != "$ACTUAL" ]; then
    MISMATCH=true
    MISMATCH_DETAILS="${MISMATCH_DETAILS}  wiki/ja/Home.md reports '${REPORTED}', actual=${ACTUAL}\n"
  fi
fi

if "$MISMATCH"; then
  echo "[aphelion-hook:${HOOK_NAME}] agent count mismatch detected (actual: ${ACTUAL}):" >&2
  printf '%b' "$MISMATCH_DETAILS" >&2
  echo "[aphelion-hook:${HOOK_NAME}] Update README.md/README.ja.md/Home.md to reflect actual count." >&2
fi

exit 0
