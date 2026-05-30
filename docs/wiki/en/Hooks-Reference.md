# Hooks Reference

> **Language**: [English](../en/Hooks-Reference.md) | [日本語](../ja/Hooks-Reference.md)
> **Last updated**: 2026-05-30
> **Update history**:
>   - 2026-05-30: add Hook D — aphelion-project-rules-check (SessionStart advisory) (#130 PR-6)
>   - 2026-05-01: initial release — MVP 3 hooks (#107)
> **Audience**: Aphelion users (developers operating hooks in user projects)

This page is the user-facing reference for the Claude Code hooks that Aphelion distributes.
Hooks act as the fourth defense layer — proactive content scanning — on top of the existing
deny rules, sandbox isolation, and post-failure diagnosis.

For the full policy (auto-load rule for agents), see
[hooks-policy.md](../../.claude/rules/hooks-policy.md).

## Table of Contents

- [Hook A — aphelion-secrets-precommit](#hook-a--aphelion-secrets-precommit)
- [Hook B — aphelion-sensitive-file-guard](#hook-b--aphelion-sensitive-file-guard)
- [Hook D — aphelion-project-rules-check](#hook-d--aphelion-project-rules-check)
- [Hook E — aphelion-deps-postinstall](#hook-e--aphelion-deps-postinstall)
- [How hooks are distributed](#how-hooks-are-distributed)
- [Disabling a hook](#disabling-a-hook)
- [Adding your own hook](#adding-your-own-hook)
- [Troubleshooting](#troubleshooting)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Hook A — aphelion-secrets-precommit

**Script**: `.claude/hooks/aphelion-secrets-precommit.sh`
**Event**: `PreToolUse`
**Matcher**: `Bash`
**Activates on**: `Bash(git commit*)`
**Blocks**: Yes (exit 2)

### What it does

Before Claude Code executes `git commit`, this hook scans the staged diff
(`git diff --cached -U0`) for known secret patterns. Only added lines are inspected;
removed lines are ignored. The hook uses eight ERE regexes (IDs P1–P8) defined in
`.claude/hooks/lib/secret-patterns.sh`:

| ID | Pattern |
|----|---------|
| P1 | AWS Access Key (`AKIA[0-9A-Z]{16}`) |
| P2 | GitHub PAT / OAuth token (`gh[pousr]_...`) |
| P3 | OpenAI API key (`sk-...`) |
| P4 | Anthropic API key (`sk-ant-...`) |
| P5 | Slack token (`xox[baprs]-...`) |
| P6 | Stripe live secret (`sk_live_...`) |
| P7 | RSA / EC / DSA / OpenSSH private key header |
| P8 | Generic credential assignment (`api_key =`, `password =`, `token = "..."` etc.) |

If a match is found, the hook:
1. Prints the matched **pattern ID** to stderr (the actual value is intentionally withheld to avoid leaking via logs).
2. Exits 2, which causes Claude Code to block the `git commit` call.

If no match is found, the hook exits 0 and the commit proceeds normally.

### Bypass

Append `[skip-secrets-check]` anywhere in the commit message:

```bash
git commit -m "feat: add sample config [skip-secrets-check]"
```

Use this when the hook triggers on a known-safe placeholder value (e.g., `MY_API_KEY_HERE`).
Before bypassing, use `/secrets-scan` to confirm the value is not a real secret.

### When to use bypass

- The value is a placeholder (`TODO_REPLACE`, `<YOUR_TOKEN>`, `example_key`).
- The value is in documentation or test fixtures (but ideally those paths should be
  in an `ALLOW_PATH_PATTERNS` directory such as `tests/` or `docs/`).

---

## Hook B — aphelion-sensitive-file-guard

**Script**: `.claude/hooks/aphelion-sensitive-file-guard.sh`
**Event**: `PreToolUse`
**Matcher**: `Write|Edit`
**Activates on**: See below
**Blocks**: Yes (exit 2)

### What it does

Before Claude Code writes to or edits a file, this hook checks whether the target path
matches a conventionally sensitive filename. If matched, the write is blocked.

**Activated on these filename patterns** (from `settings.json`):
```
Write(.env*)  Write(**/*.pem)  Write(**/*.key)  Write(**/credentials.*)
Write(**/*.secret)  Write(**/id_rsa)  Write(**/id_ed25519)  Write(**/id_ecdsa)
Edit(.env*)   Edit(**/*.pem)   Edit(**/*.key)   Edit(**/credentials.*)
```

**Path decision order** (higher priority wins):

| Priority | Condition | Result |
|----------|-----------|--------|
| 1 (highest) | Path contains `/tests?/`, `/__fixtures__/`, `/fixtures/`, `/examples/`, `/docs/` | Allow |
| 2 | Filename ends with `.example`, `.template`, `.sample`, `.dist` | Allow |
| 3 | Filename matches a `BLOCK_GLOB` | Block |
| 4 (lowest) | Anything else | Allow |

**Examples**:

| Path | Decision | Reason |
|------|----------|--------|
| `/project/.env` | Block | `.env` glob match |
| `/project/.env.example` | Allow | `.example` suffix |
| `/project/tests/fixtures/.env` | Allow | `tests/` path pattern |
| `/project/certs/server.pem` | Block | `*.pem` glob match |
| `/project/docs/sample.pem` | Allow | `docs/` path pattern |

### Bypass

There is **no bypass marker** for hook B. This is intentional: writing to files like `.env`
or `*.pem` directly in the project tree is almost always a mistake. If you genuinely need to
create such a file, edit `.claude/settings.json` and remove the
`aphelion-sensitive-file-guard` entry from the `PreToolUse` section.

The entry will not be restored by `npx aphelion-agents update` (settings.json is protected
after the first init).

---

## Hook D — aphelion-project-rules-check

**Script**: `.claude/hooks/aphelion-project-rules-check.sh`
**Event**: `SessionStart`
**Matcher**: (none — SessionStart has no matcher)
**Activates on**: session startup (`source == "startup"`)
**Blocks**: No (always exits 0)

### What it does

At the start of each new Claude Code session, this hook checks whether
`.claude/rules/project-rules.md` exists in the project directory. If the file is absent,
it emits a one-time advisory to stderr reminding you to run `/aphelion-init`.

Without `project-rules.md`, Aphelion agents fall back to built-in defaults that may not
match your project:
- **Output Language**: `en` (English)
- **Co-Authored-By**: enabled
- **Remote type**: `github`

The hook only fires on `source == "startup"` — not on `/clear`, `/compact`, or session
resume — so the notice appears at most once per fresh session.

**Example output** (when `project-rules.md` is absent):
```
[aphelion-hook:project-rules-check] No project-rules.md found at .claude/rules/project-rules.md.
  Aphelion agents will fall back to defaults (Output Language: en, Co-Authored-By: enabled,
  Remote type: github) which may not match this project.
  Recommended: run /aphelion-init to generate project-rules.md for this repository.
  (This is an advisory only; it never blocks session start.)
  To silence this check, set APHELION_SKIP_RULES_CHECK=1 in your environment.
```

### Known limitation

Hook D only checks the **project-local** path `${cwd}/.claude/rules/project-rules.md`.
If you installed Aphelion with `init --user` and your `project-rules.md` lives at
`~/.claude/rules/project-rules.md`, the hook will still emit the advisory (false positive).
Use the bypass below to silence it.

### Bypass

Set `APHELION_SKIP_RULES_CHECK=1` in your environment before starting Claude Code:

```bash
export APHELION_SKIP_RULES_CHECK=1
claude
```

Or add it to your shell profile (`~/.bashrc`, `~/.zshrc`) to silence it permanently across
all projects:

```bash
echo 'export APHELION_SKIP_RULES_CHECK=1' >> ~/.bashrc
```

---

## Hook E — aphelion-deps-postinstall

**Script**: `.claude/hooks/aphelion-deps-postinstall.sh`
**Event**: `PostToolUse`
**Matcher**: `Bash`
**Activates on**: `npm install*`, `npm i *`, `npm ci*`, `uv add*`, `uv pip install*`, `pip install*`, `cargo add*`, `go get *`
**Blocks**: No (always exits 0)

### What it does

After a dependency installation command completes, this hook emits an advisory message on
stderr recommending a vulnerability scan. It detects the tech stack from the command prefix
and suggests the appropriate tool:

| Command prefix | Stack | Recommended scan |
|---------------|-------|-----------------|
| `npm*` | Node.js | `npm audit` |
| `uv*` | Python | `uv run pip-audit` |
| `pip*` | Python | `pip-audit` |
| `cargo*` | Rust | `cargo audit` |
| `go*` | Go | `govulncheck ./...` |

**Example output**:
```
[aphelion-hook:deps-postinstall] Node.js dependency change detected.
  Recommended next step: run /vuln-scan to check for known vulnerabilities.
  (Manual equivalent: npm audit)
  Skipping recommended after lockfile-only updates or when offline.
```

### Bypass

No bypass is needed — hook E is advisory only and never blocks execution.
You can safely ignore the message during lockfile-only updates or in offline environments.

---

## How hooks are distributed

Aphelion distributes hooks via `npx aphelion-agents init` and `npx aphelion-agents update`.

### init (first-time setup)

```bash
npx github:kirin0198/aphelion-agents init
```

- Copies `src/.claude/settings.json` (hook registration template) to your project's
  `.claude/settings.json` — merging Aphelion hooks into an existing file, or creating a
  fresh file. The `SessionStart` block for hook D is included.
- Copies all files in `src/.claude/hooks/` to `.claude/hooks/` (recursive overlay).
- Sets execute permissions (`chmod 0755`) on all `*.sh` files so Claude Code can run them.

### update

```bash
npx aphelion-agents update
```

- **`settings.json`** — Merge: re-applies all Aphelion-managed hook entries (identified by
  `aphelion-` in the command path) while preserving your custom or disabled entries. The
  `SessionStart` block for hook D is automatically added to existing installations.
- **`hooks/`** — Overlay: always re-copied from canonical. Ensures bug fixes and new
  secret patterns reach your project automatically.
- Restores execute permissions if lost (e.g., after a Windows git clone).

---

## Disabling a hook

To permanently disable a specific hook, edit `.claude/settings.json` and delete or
comment out the relevant entry.

**Example — disable hook A (secrets-precommit)**:

```json
{
  "hooks": {
    "PreToolUse": [
      // Delete or comment out the aphelion-secrets-precommit entry here
      {
        "matcher": "Write|Edit",
        "if": "...",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/aphelion-sensitive-file-guard.sh"
      }
    ],
    "PostToolUse": [ ... ]
  }
}
```

The change will not be overwritten by `npx aphelion-agents update` because
`settings.json` merges are idempotent for user-deleted entries.

---

## Adding your own hook

To add a custom hook without losing it on `update`:

1. Place your script at `.claude/hooks/local/your-hook.sh` (outside the overlay target).
2. Add execute permissions: `chmod +x .claude/hooks/local/your-hook.sh`.
3. Register it in `.claude/settings.json` under the relevant event section:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "if": "Bash(git push*)",
        "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/local/your-hook.sh",
        "description": "Your custom hook"
      }
    ]
  }
}
```

Scripts in `.claude/hooks/local/` are not touched by `aphelion-agents update`.

---

## Troubleshooting

**Hook does not seem to fire**

1. Check that the hook script is executable:
   ```bash
   ls -la .claude/hooks/*.sh
   ```
   If the execute bit is missing, run `npx aphelion-agents update` to restore it.

2. Verify that the hook entry exists in `.claude/settings.json` under the correct event.

3. Confirm that Claude Code is reading `.claude/settings.json` (the file must be at the
   project root level, not inside a subdirectory).

**Hook A fires on every commit (false positive)**

Run `/secrets-scan` to inspect the staged content with LLM-aware placeholder detection.
If the value is confirmed safe, append `[skip-secrets-check]` to the commit message.

If the same pattern keeps triggering false positives on your project, open an issue at
[github.com/kirin0198/aphelion-agents](https://github.com/kirin0198/aphelion-agents)
with the pattern ID (e.g., P8) and a safe example of the false-positive content.

**Hook D fires even though I have a global project-rules.md**

Hook D only checks the project-local `.claude/rules/project-rules.md`. If you use
`init --user`, your `project-rules.md` is at `~/.claude/rules/` and the hook cannot
find it. Set `APHELION_SKIP_RULES_CHECK=1` in your environment to silence the advisory.

**WSL / Windows note**

Aphelion hooks require `bash` and `grep -E`. On WSL2 (recommended) and macOS / Linux,
these are available by default. Windows native (PowerShell without WSL) is **not currently
supported** — a PowerShell-compatible hook set is planned for Phase 2.

If you use Aphelion on WSL2, ensure your project is stored inside the WSL filesystem
(`/home/…`) rather than a Windows mount (`/mnt/c/…`) to avoid performance issues with
`git diff --cached` in hook A.

---

## Related Pages

- [Rules Reference](./Rules-Reference.md) — hooks-policy entry with agent-developer scope
- [Getting Started](./Getting-Started.md) — overall Aphelion setup guide

## Canonical Sources

- [src/.claude/hooks/](../../src/.claude/hooks/) — Canonical hook scripts
- [src/.claude/settings.json](../../src/.claude/settings.json) — Hook registration template
- [src/.claude/rules/hooks-policy.md](../../src/.claude/rules/hooks-policy.md) — Auto-loaded policy rule
