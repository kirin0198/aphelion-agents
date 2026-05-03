#!/usr/bin/env bash
# Aphelion shared library: secret detection patterns.
# Sourced by:
#   - .claude/hooks/aphelion-secrets-precommit.sh
#   - .claude/commands/secrets-scan.md (after PR 1d refactor)
#
# Source-only library. Do NOT execute this script directly.
# Updates here propagate to all callers automatically (single source of truth).
# Do NOT add inline regex to caller scripts.
#
# Canonical path: src/.claude/hooks/lib/secret-patterns.sh
# Deployed to:    .claude/hooks/lib/secret-patterns.sh

# Each entry format: "<ID>|<ERE regex>"
# Regex is intended to be used with: grep -iE
# shellcheck disable=SC2034
APHELION_SECRET_PATTERNS=(
  # P1: AWS Access Key ID
  'P1|AKIA[0-9A-Z]{16}'
  # P2: GitHub PAT / OAuth token / fine-grained token
  'P2|gh[pousr]_[A-Za-z0-9]{36,}'
  # P3: OpenAI API Key (variable length new format)
  'P3|sk-[A-Za-z0-9]{20,}'
  # P4: Anthropic API Key
  'P4|sk-ant-[A-Za-z0-9_-]{20,}'
  # P5: Slack Bot/App/User/OAuth token
  'P5|xox[baprs]-[A-Za-z0-9-]{10,}'
  # P6: Stripe Live Secret Key
  'P6|sk_live_[A-Za-z0-9]{20,}'
  # P7: PEM private key header (RSA / EC / DSA / OpenSSH)
  'P7|-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'
  # P8: Generic credential assignment (api_key / token / secret / password = "...")
  'P8|(api[_-]?key|token|secret|password)[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9_+/=.~-]{16,}["'"'"']'
)

# helper: aphelion_secret_grep <input_string>
# Returns 0 if any pattern matches; prints first matching pattern ID to stdout.
# Returns 1 if no pattern matches.
aphelion_secret_grep() {
  local input="$1"
  local entry pid regex
  for entry in "${APHELION_SECRET_PATTERNS[@]}"; do
    pid="${entry%%|*}"
    regex="${entry#*|}"
    # Use `--` to prevent grep from interpreting regex starting with `-`
    # (P7 starts with `-----BEGIN`, which grep would parse as flags without `--`)
    if printf '%s' "$input" | grep -qiE -- "$regex"; then
      printf '%s\n' "$pid"
      return 0
    fi
  done
  return 1
}
