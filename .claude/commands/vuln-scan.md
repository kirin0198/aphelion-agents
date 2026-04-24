Run a vulnerability scan on the project's dependencies.

## Steps

1. Auto-detect the project's tech stack by checking for the following files:
   - `pyproject.toml` / `requirements.txt` → Python
   - `package.json` → Node.js
   - `go.mod` → Go
   - `Cargo.toml` → Rust

2. Run the scan tool that corresponds to the detected tech stack:
   - Python: `uv run pip-audit 2>/dev/null || pip-audit 2>/dev/null`
   - Node.js: `npm audit`
   - Go: `govulncheck ./...`
   - Rust: `cargo audit`

3. If the tool is not installed, report this and provide installation instructions

4. Report results in the following format:

```
## Vulnerability Scan Results

- Tech stack: {detected result}
- Scan tool: {tool used}
- Vulnerabilities found: {count}

### Detected Vulnerabilities (if any)
| Package | Current Version | Vulnerability | Severity | Fixed Version |
|---------|----------------|---------------|----------|---------------|

### Recommended Actions
{Proposed remediation steps}
```

$ARGUMENTS
