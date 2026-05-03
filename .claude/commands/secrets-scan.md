Scan the source code for hardcoded secrets using the canonical pattern set from Aphelion hook A.

## Steps

1. Source the canonical pattern library to obtain the 8 secret patterns (P1–P8):

   The patterns are defined in `.claude/hooks/lib/secret-patterns.sh` (deployed from
   `src/.claude/hooks/lib/secret-patterns.sh`). Use the Grep tool to search for each pattern
   in turn across the working tree, excluding `.git/`, `node_modules/`, `vendor/`, and
   `dist/` directories. Case-insensitive matching (`-i`) applies to all patterns.

   Pattern reference (sourced from `secret-patterns.sh` for parity with hook A):

   | ID | Name | Pattern |
   |----|------|---------|
   | P1 | AWS Access Key | `AKIA[0-9A-Z]{16}` |
   | P2 | GitHub PAT / OAuth | `gh[pousr]_[A-Za-z0-9]{36,}` |
   | P3 | OpenAI API Key | `sk-[A-Za-z0-9]{20,}` |
   | P4 | Anthropic API Key | `sk-ant-[A-Za-z0-9_-]{20,}` |
   | P5 | Slack Token | `xox[baprs]-[A-Za-z0-9-]{10,}` |
   | P6 | Stripe Live Secret | `sk_live_[A-Za-z0-9]{20,}` |
   | P7 | PEM Private Key | `-----BEGIN (RSA \|EC \|DSA \|OPENSSH )?PRIVATE KEY-----` |
   | P8 | Generic credential assignment | `(api[_-]?key\|token\|secret\|password)[[:space:]]*[:=][[:space:]]*["'][A-Za-z0-9_+/=.~-]{16,}["']` |

   These patterns are the single source of truth: any update to `secret-patterns.sh`
   automatically propagates to both this command and hook A (secrets-precommit).

2. For each detected item, determine:
   - Is it a real secret, or a placeholder/sample value?
   - If it is an environment variable reference (`os.environ`, `process.env`, etc.), classify it as safe.
   - If the match is in a test fixture, documentation example, or ends with `.example` /
     `.template` / `.sample` / `.dist`, classify it as likely safe.

3. Report results in the following format:

```
## Secrets Scan Results

- Files scanned: {file count}
- Excluded: .git/, node_modules/, vendor/, dist/
- Patterns used: Aphelion P1–P8 (sourced from .claude/hooks/lib/secret-patterns.sh)
- Issues found: {count}

### Detected Items (if any)
| # | File:Line | Pattern ID | Type | Verdict | Value (masked) |
|---|-----------|-----------|------|---------|----------------|
| 1 | {path}:{line} | {P1–P8} | {AWS key / GitHub PAT / ...} | {action required / safe} | {first 4 chars}**** |

### Recommended Actions
{How to migrate to environment variables, etc.}
```

4. If no items are detected, explicitly report "No secrets found".

5. If hook A blocked a recent commit with a pattern ID (e.g., "BLOCKED: pattern P3"),
   this command provides the LLM-aware judgment step: re-examine the flagged content,
   determine if it is a placeholder, and advise whether to append `[skip-secrets-check]`
   to the commit message.

$ARGUMENTS
