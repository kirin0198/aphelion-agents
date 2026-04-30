#!/usr/bin/env bash
# check-readme-wiki-sync.sh
# Cross-source consistency check for README ↔ Wiki co-update set.
# Checks three things:
#   1. Agent count parity across README.md, README.ja.md, wiki/en/Home.md, wiki/ja/Home.md
#   2. Slash command list parity between .claude/commands/aphelion-help.md and
#      docs/wiki/en/Getting-Started.md
#   3. ^## heading count + order match between README.md and README.ja.md
#
# Usage: bash scripts/check-readme-wiki-sync.sh
# Exit 0 on success (silent), exit 1 on any failure with stderr message.

set -euo pipefail

# Determine repo root relative to this script's location
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

fail=0

# ---------------------------------------------------------------------------
# Check 1: Agent count parity
# ---------------------------------------------------------------------------
ACTUAL=$(ls "$REPO_ROOT/.claude/agents/" | wc -l | tr -d ' ')

# README.md: "N specialized agents" (L3) and "all N agents" (L70 link line) — collect both, dedup
README_EN=$(grep -hoE '[0-9]+ specialized agents|all [0-9]+ agents' \
  "$REPO_ROOT/README.md" | grep -oE '[0-9]+' | sort -u \
  | tr '\n' ',' | sed 's/,$//')
# README.ja.md: "N の専門エージェント" (L3) and "N エージェント" (L70 link line) — collect both, dedup
README_JA=$(grep -hoE '[0-9]+ の専門エージェント|[0-9]+ エージェント' \
  "$REPO_ROOT/README.ja.md" | grep -oE '[0-9]+' | sort -u \
  | tr '\n' ',' | sed 's/,$//')
# wiki/en/Home.md: "all N agents" (appears on multiple lines — collect all, dedup)
HOME_EN=$(grep -oE 'all [0-9]+ agents' "$REPO_ROOT/docs/wiki/en/Home.md" \
  | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')
# wiki/ja/Home.md: "31 エージェント" (appears twice on L23, L38 — deduplicate with sort -u)
HOME_JA=$(grep -oE '[0-9]+ エージェント' "$REPO_ROOT/docs/wiki/ja/Home.md" | grep -oE '[0-9]+' | sort -u | tr '\n' ',' | sed 's/,$//')

for label_value in "README.md=$README_EN" "README.ja.md=$README_JA" "wiki/en/Home.md=$HOME_EN" "wiki/ja/Home.md=$HOME_JA"; do
  label="${label_value%%=*}"
  value="${label_value#*=}"
  if [ "$value" != "$ACTUAL" ]; then
    echo "agent count mismatch: $label reports '$value', actual=$ACTUAL" >&2
    fail=1
  fi
done

# ---------------------------------------------------------------------------
# Check 2: Slash command list parity
# aphelion-help.md table rows vs Getting-Started.md backtick references
# ---------------------------------------------------------------------------
# Extract commands from table rows only (lines starting with "| `/")
HELP_CMDS=$(grep -E '^\| `/' "$REPO_ROOT/.claude/commands/aphelion-help.md" \
  | grep -oE '`/[a-z][a-z-]*`' | tr -d '`' | sort -u)
WIKI_CMDS=$(grep -oE '`/[a-z][a-z-]*' "$REPO_ROOT/docs/wiki/en/Getting-Started.md" \
  | tr -d '`' | sort -u)
DIFF=$(diff <(echo "$HELP_CMDS") <(echo "$WIKI_CMDS") || true)
if [ -n "$DIFF" ]; then
  echo "command list mismatch between aphelion-help.md and Getting-Started.md (en):" >&2
  echo "$DIFF" >&2
  fail=1
fi

# ---------------------------------------------------------------------------
# Check 3: README.md and README.ja.md have identical ^## heading count + order
# Since headings may be translated, we compare by count and by the English
# heading list extracted from README.md against itself normalised.
# Specifically: both files must have the same number of ^## headings, and
# README.md's heading sequence must match README.ja.md's heading sequence
# positionally (same number at each relative position).
# In practice: same count suffices because the two files are maintained in
# structural lockstep (identical section layout, translated text).
# ---------------------------------------------------------------------------
README_MD_COUNT=$(grep -c '^## ' "$REPO_ROOT/README.md" || true)
README_JA_COUNT=$(grep -c '^## ' "$REPO_ROOT/README.ja.md" || true)

if [ "$README_MD_COUNT" != "$README_JA_COUNT" ]; then
  echo "heading count mismatch: README.md has $README_MD_COUNT ^## headings, README.ja.md has $README_JA_COUNT" >&2
  fail=1
fi

# Check heading order by comparing the index-normalised sequence.
# Extract heading text from README.md (en canonical) and the line numbers of
# ^## occurrences from both files; compare whether the sequence of line
# positions (relative gap) is identical — this catches reordering even when
# headings are translated.
README_MD_LINES=$(grep -n '^## ' "$REPO_ROOT/README.md" | cut -d: -f1 | tr '\n' ',')
README_JA_LINES=$(grep -n '^## ' "$REPO_ROOT/README.ja.md" | cut -d: -f1 | tr '\n' ',')

if [ "$README_MD_LINES" != "$README_JA_LINES" ]; then
  echo "heading position mismatch between README.md and README.ja.md:" >&2
  echo "  README.md line positions:    $README_MD_LINES" >&2
  echo "  README.ja.md line positions: $README_JA_LINES" >&2
  fail=1
fi

exit $fail
