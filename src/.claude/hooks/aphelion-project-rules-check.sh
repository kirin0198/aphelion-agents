#!/usr/bin/env bash
# aphelion-project-rules-check.sh
# Aphelion hook D: SessionStart advisory — warns when project-rules.md is missing (#130 PR-6)
#
# Reads Claude Code SessionStart hook stdin payload (JSON), checks whether
# .claude/rules/project-rules.md exists in the session's project directory,
# and emits a one-time advisory to stderr when it is absent.
#
# This hook is advisory-only: it ALWAYS exits 0. SessionStart non-zero exits
# are non-blocking in Claude Code, but convention requires advisory hooks to
# exit 0 explicitly (unlike blocking hooks A/B which exit 2).
#
# Fires only on source==startup to avoid repeating the notice on /clear or
# /compact. Bypass: set APHELION_SKIP_RULES_CHECK=1 in the environment.
#
# Known limitation: only checks ${cwd}/.claude/rules/project-rules.md.
# Global ~/.claude/rules/project-rules.md (--user installs) is NOT checked.
# See hooks-policy.md §2.4 for rationale.
#
# Returns:
#   exit 0 — always (advisory-only)
#   exit 1 — script error (trapped → exit 0 fail-open)
#
# Canonical path: src/.claude/hooks/aphelion-project-rules-check.sh
# Deployed to:    .claude/hooks/aphelion-project-rules-check.sh

set -euo pipefail

HOOK_NAME="project-rules-check"

# Fail-open: any uncaught error exits with 0 so hook bugs never block session start.
# shellcheck disable=SC2064
trap 'echo "[aphelion-hook:'"${HOOK_NAME}"'] internal error at line $LINENO; passing through" >&2; exit 0' ERR

# Bypass: honour APHELION_SKIP_RULES_CHECK environment variable.
# If set to any non-empty value, skip the check silently.
if [ -n "${APHELION_SKIP_RULES_CHECK:-}" ]; then
  exit 0
fi

# Read stdin (Claude Code SessionStart hook payload JSON)
INPUT="$(cat)"

# Extract `source` field from JSON (bash-only, no python3 dependency).
# Pattern: "source": "startup"  (value is always a simple string)
SOURCE=$(printf '%s' "$INPUT" \
  | grep -o '"source"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed 's/.*"source"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# Source filter: only warn on startup. Skip resume / clear / compact silently.
if [ "$SOURCE" != "startup" ]; then
  exit 0
fi

# Extract `cwd` field from JSON (bash-only).
# Pattern: "cwd": "/absolute/path"
CWD=$(printf '%s' "$INPUT" \
  | grep -o '"cwd"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# Defensive fallback: if cwd could not be parsed from JSON, fall back to $PWD.
# Note: SessionStart hook runs as a subprocess; PWD is less reliable than JSON cwd,
# but it is better than an empty path.
if [ -z "$CWD" ]; then
  CWD="$PWD"
fi

# Check whether project-rules.md exists in the project's .claude/rules/ directory.
PROJECT_RULES="${CWD}/.claude/rules/project-rules.md"

if [ ! -f "$PROJECT_RULES" ]; then
  # Emit advisory to stderr (shown directly to the user by Claude Code).
  cat >&2 <<'EOF'
[aphelion-hook:project-rules-check] No project-rules.md found at .claude/rules/project-rules.md.
  Aphelion agents will fall back to defaults (Output Language: en, Co-Authored-By: enabled,
  Remote type: github) which may not match this project.
  Recommended: run /aphelion-init to generate project-rules.md for this repository.
  (This is an advisory only; it never blocks session start.)
  To silence this check, set APHELION_SKIP_RULES_CHECK=1 in your environment.
EOF
fi

# Always exit 0 — advisory-only, never blocks session start.
exit 0
