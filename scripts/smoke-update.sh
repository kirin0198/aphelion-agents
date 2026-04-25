#!/usr/bin/env bash
# Smoke test for `aphelion-agents update`.
# Runs in a temp directory: init -> mutate target file -> update -> assert overwrite.
# Intended for manual / pre-release runs. Exit 0 = pass, non-zero = fail.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
node "$REPO_ROOT/bin/aphelion-agents.mjs" init >/dev/null

# Assert: settings.local.json deny-list template installed by init (#31)
if ! [ -f "$TMP/.claude/settings.local.json" ]; then
  echo "FAIL: init did not install .claude/settings.local.json"
  exit 1
fi
if ! diff -q "$REPO_ROOT/src/.claude/settings.local.json" "$TMP/.claude/settings.local.json" >/dev/null; then
  echo "FAIL: init's settings.local.json diverges from canonical src/.claude/settings.local.json"
  exit 1
fi
if ! grep -q "Bash(rm -rf /\*)" "$TMP/.claude/settings.local.json"; then
  echo "FAIL: deny-list missing destructive_fs entries"
  exit 1
fi

# Mutate target side so we can detect overwrite
echo "MUTATED" > "$TMP/.claude/rules/sandbox-policy.md"

# Run update
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null

# Assert: target file no longer contains the mutation marker
if grep -qx "MUTATED" "$TMP/.claude/rules/sandbox-policy.md"; then
  echo "FAIL: rules/sandbox-policy.md was not overwritten by update"
  exit 1
fi

# Assert: target content matches repo HEAD byte-for-byte
# (canonical source for rules/ lives at src/.claude/rules/ since 0.3.0; see #44)
if ! diff -q "$REPO_ROOT/src/.claude/rules/sandbox-policy.md" "$TMP/.claude/rules/sandbox-policy.md" >/dev/null; then
  echo "FAIL: rules/sandbox-policy.md diverges from src/.claude/rules/ HEAD"
  exit 1
fi

# Assert: settings.local.json is preserved when target side has one
echo '{"local":"keep"}' > "$TMP/.claude/settings.local.json"
node "$REPO_ROOT/bin/aphelion-agents.mjs" update >/dev/null
if ! grep -q '"local":"keep"' "$TMP/.claude/settings.local.json"; then
  echo "FAIL: settings.local.json was not preserved on update"
  exit 1
fi

echo "PASS: rules/ refreshed and settings.local.json preserved"
