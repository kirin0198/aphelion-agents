#!/usr/bin/env bash
# aphelion-secrets-precommit.sh
# Aphelion hook A: PreToolUse on Bash(git commit*) — #107
#
# Reads Claude Code hook stdin payload (JSON), extracts the git commit command,
# then scans `git diff --cached -U0` for secret patterns.
#
# Returns:
#   exit 0 — no secrets found; commit proceeds
#   exit 2 — secret pattern matched; commit is blocked (PreToolUse block)
#   exit 1 — script error (trapped → exit 0 fail-open so user work is not stopped)
#
# Bypass: append [skip-secrets-check] to the commit message.
# Example: git commit -m "feat: add foo [skip-secrets-check]"
#
# Canonical path: src/.claude/hooks/aphelion-secrets-precommit.sh
# Deployed to:    .claude/hooks/aphelion-secrets-precommit.sh

set -euo pipefail

HOOK_NAME="secrets-precommit"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LIB_DIR="${PROJECT_DIR}/.claude/hooks/lib"

# Fail-open: any uncaught error exits with 0 so hook bugs never block user work.
# shellcheck disable=SC2064
trap 'echo "[aphelion-hook:'"${HOOK_NAME}"'] internal error at line $LINENO; passing through" >&2; exit 0' ERR

# Read stdin (Claude Code hook payload JSON)
RAW_PAYLOAD="$(cat)"

# Extract tool_input.command field (single-line command value assumed)
# Uses grep + sed; no jq dependency per architect §3.4 constraint.
RAW_CMD=$(printf '%s' "$RAW_PAYLOAD" \
  | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/^"command"[[:space:]]*:[[:space:]]*"//; s/"$//')

# If the command field is empty, pass through (unexpected payload format)
if [ -z "$RAW_CMD" ]; then
  exit 0
fi

# Bypass: if commit message contains [skip-secrets-check], skip scan
if printf '%s' "$RAW_CMD" | grep -qE '\[skip-secrets-check\]'; then
  echo "[aphelion-hook:${HOOK_NAME}] bypass marker [skip-secrets-check] found — skipping scan" >&2
  exit 0
fi

# Load canonical secret patterns
if [ ! -f "${LIB_DIR}/secret-patterns.sh" ]; then
  echo "[aphelion-hook:${HOOK_NAME}] lib/secret-patterns.sh not found at ${LIB_DIR}; passing through" >&2
  exit 0
fi
# shellcheck source=lib/secret-patterns.sh
source "${LIB_DIR}/secret-patterns.sh"

# Obtain staged diff (only added lines; exclude diff headers)
# git -C PROJECT_DIR ensures monorepo subtree commits are also covered.
DIFF=$(git -C "$PROJECT_DIR" diff --cached -U0 2>/dev/null || true)

if [ -z "$DIFF" ]; then
  # Nothing staged; pass through
  exit 0
fi

# Filter to added lines only: lines starting with '+' but not '+++'
ADDED_LINES=$(printf '%s\n' "$DIFF" | grep -E '^\+' | grep -vE '^\+\+\+' || true)

if [ -z "$ADDED_LINES" ]; then
  exit 0
fi

# Scan added lines against each secret pattern
HIT_PATTERN=""
for entry in "${APHELION_SECRET_PATTERNS[@]}"; do
  pid="${entry%%|*}"
  regex="${entry#*|}"
  # Use `--` to prevent grep from interpreting regex starting with `-`
  # (P7 starts with `-----BEGIN`, which grep would parse as flags without `--`)
  if printf '%s' "$ADDED_LINES" | grep -qiE -- "$regex"; then
    HIT_PATTERN="$pid"
    break
  fi
done

if [ -n "$HIT_PATTERN" ]; then
  # Report pattern ID only — intentionally do NOT print the matched value
  # to prevent secret leakage into Claude transcript / commit logs (R7).
  cat >&2 <<EOF
[aphelion-hook:${HOOK_NAME}] BLOCKED: staged diff matches secret pattern ${HIT_PATTERN}.
- The actual matching value is intentionally NOT printed (avoid leaking via logs).
- Re-scan with /secrets-scan to inspect with LLM-aware placeholder detection.
- If the match is a placeholder / sample, append [skip-secrets-check] to the
  commit message and re-run.
EOF
  exit 2
fi

exit 0
