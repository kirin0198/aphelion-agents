#!/usr/bin/env bash
# aphelion-deps-postinstall.sh
# Aphelion hook E: PostToolUse on Bash(npm install* | uv add* | pip install* | cargo add* | go get *) — #107
#
# Reads Claude Code hook stdin payload (JSON), detects which dependency manager
# was used, then emits a non-blocking advisory to stderr recommending /vuln-scan.
#
# PostToolUse cannot block (exit 2 has no effect); this hook only advises.
# No bypass token needed — the hook is purely informational (exit 0 always).
#
# Returns:
#   exit 0 — always (non-blocking advisory)
#   exit 1 — script error (trapped → exit 0 fail-open)
#
# Canonical path: src/.claude/hooks/aphelion-deps-postinstall.sh
# Deployed to:    .claude/hooks/aphelion-deps-postinstall.sh

set -euo pipefail

HOOK_NAME="deps-postinstall"

# Fail-open: any uncaught error exits with 0 so hook bugs never block user work.
# shellcheck disable=SC2064
trap 'echo "[aphelion-hook:'"${HOOK_NAME}"'] internal error at line $LINENO; passing through" >&2; exit 0' ERR

# Read stdin (Claude Code hook payload JSON, PostToolUse includes tool_response)
RAW_PAYLOAD="$(cat)"

# Extract tool_input.command field
CMD=$(printf '%s' "$RAW_PAYLOAD" \
  | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 \
  | sed -E 's/^"command"[[:space:]]*:[[:space:]]*"//; s/"$//')

# If command not found, pass through silently
if [ -z "$CMD" ]; then
  exit 0
fi

# Identify tech stack from command prefix; determine recommended scan tool
STACK=""
SCAN_HINT=""
case "$CMD" in
  "npm install"*|"npm i "*|"npm ci"*)
    STACK="Node.js"
    SCAN_HINT="npm audit"
    ;;
  "uv add"*|"uv pip install"*)
    STACK="Python (uv)"
    SCAN_HINT="uv run pip-audit"
    ;;
  "pip install"*|"pip3 install"*)
    STACK="Python (pip)"
    SCAN_HINT="pip-audit"
    ;;
  "cargo add"*)
    STACK="Rust"
    SCAN_HINT="cargo audit"
    ;;
  "go get "*)
    STACK="Go"
    SCAN_HINT="govulncheck ./..."
    ;;
  *)
    # Command matched by settings.json if rule but not recognized here; advise generically
    STACK="unknown"
    SCAN_HINT="/vuln-scan"
    ;;
esac

# Emit non-blocking advisory to stderr
# Claude reads stderr from PostToolUse hooks and can suggest next steps.
cat >&2 <<EOF
[aphelion-hook:${HOOK_NAME}] ${STACK} dependency change detected.
  Recommended next step: run /vuln-scan to check for known vulnerabilities.
  (Manual equivalent: ${SCAN_HINT})
  You can skip this check after lockfile-only updates or when working offline.
EOF

exit 0
