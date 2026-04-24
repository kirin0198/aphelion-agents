Scan the source code for hardcoded secrets.

## Steps

1. Search for the following patterns using the Grep tool (exclude `.env`, `.env.example`, `*.secret`, and test fixtures):

   - API keys: `api[_-]?key\s*[:=]\s*["'][^"']{8,}["']`
   - Passwords: `password\s*[:=]\s*["'][^"']+["']`
   - Secrets: `secret\s*[:=]\s*["'][^"']{8,}["']`
   - Tokens: `token\s*[:=]\s*["'][^"']{8,}["']`
   - Connection strings: `(mysql|postgres|mongodb|redis)://[^\s"']+`
   - AWS access keys: `AKIA[0-9A-Z]{16}`
   - Private keys: `-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----`
   - Bearer tokens: `Bearer\s+[A-Za-z0-9\-._~+/]{20,}`

2. For each detected item, determine:
   - Is it a real secret, or a placeholder/sample value?
   - If it is an environment variable reference (`os.environ`, `process.env`, etc.), classify it as safe

3. Report results in the following format:

```
## Secrets Scan Results

- Files scanned: {file count}
- Excluded: .env, .env.example, test fixtures
- Issues found: {count}

### Detected Items (if any)
| # | File:Line | Type | Verdict | Value (masked) |
|---|-----------|------|---------|----------------|
| 1 | {path}:{line} | {API key / password / ...} | {action required / safe} | {first 4 chars}**** |

### Recommended Actions
{How to migrate to environment variables, etc.}
```

4. If no items are detected, explicitly report "No secrets found"

$ARGUMENTS
