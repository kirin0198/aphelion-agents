# Hooks Policy

> **Last updated**: 2026-05-01
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
> Update history:
>   - 2026-05-01: initial release — MVP 3 hooks (A / B / E) (#107)

This rule documents Aphelion's Claude Code hooks: their role, distribution, bypass rules,
and interaction with other policy layers. All agents should be aware of this policy when
recommending `git commit`, file write, or dependency install operations.

---

## 1. Overview

Aphelion ships a set of Claude Code hooks that act as the **fourth defense layer** — proactive
content scanning — on top of the existing three layers:

| Layer | Mechanism | When it acts |
|-------|-----------|-------------|
| 1 | `settings.local.json` deny rules | Static pattern match; blocks before tool execution |
| 2 | `sandbox-runner` agent | Isolation of `required`-tier Bash commands (Standard+ plans) |
| 3 | `denial-categories.md` | Post-failure diagnosis and recovery guidance |
| **4** | **Hooks (this file)** | **Proactive content scan; inspects command content before commit / write** |

The deny layer (Layer 1) blocks by command shape (e.g., `git push --force`). It does **not**
inspect the *contents* of a commit. Hooks fill this gap: they read `git diff --cached` output
or file paths to detect sensitive data before it reaches the repository or disk.

Hooks are distributed via `src/.claude/hooks/` (canonical) and deployed to
`.claude/hooks/` in user projects via `npx aphelion-agents init / update`.

---

## 2. Available Hooks (MVP)

Three hooks form the initial release. All scripts reside at
`src/.claude/hooks/` (canonical) → deployed to `.claude/hooks/`.

| ID | Script | Event | Matcher | if condition | Block? | Bypass |
|----|--------|-------|---------|-------------|--------|--------|
| A | `aphelion-secrets-precommit.sh` | `PreToolUse` | `Bash` | `Bash(git commit*)` | Yes (exit 2) | `[skip-secrets-check]` in commit message |
| B | `aphelion-sensitive-file-guard.sh` | `PreToolUse` | `Write\|Edit` | See §2.2 | Yes (exit 2) | None (edit `settings.json` to disable) |
| E | `aphelion-deps-postinstall.sh` | `PostToolUse` | `Bash` | See §2.3 | No (exit 0 + stderr) | N/A (advisory only) |

A shared pattern library lives at `.claude/hooks/lib/secret-patterns.sh`.
It defines `APHELION_SECRET_PATTERNS` (8 ERE regexes, IDs P1–P8) used by hook A.

### 2.1 Hook A — aphelion-secrets-precommit

**Purpose**: Scan the staged diff for known secret patterns before `git commit` is executed.

**Operation**:
1. Parses `tool_input.command` from stdin JSON to detect `[skip-secrets-check]` bypass marker.
2. Runs `git diff --cached -U0` to obtain only added lines (`^+` prefix, excluding `+++` headers).
3. Tests each added line against the 8 patterns in `secret-patterns.sh` using `grep -iE`.
4. On match: emits a stderr message reporting the pattern ID (not the matched value), then exits 2 to block the commit.
5. On no match: exits 0.

**Exit semantics**:
- `0` — No secrets detected; commit proceeds.
- `1` — Script internal error (caught by `trap ERR`); falls through to `exit 0` (fail-open).
- `2` — Secret pattern matched; commit is blocked.

**stderr format** (on block):
```
[aphelion-hook:secrets-precommit] BLOCKED: staged diff matches secret pattern {ID}.
- The actual matching value is intentionally NOT printed (avoid leaking via logs).
- Re-scan with /secrets-scan to inspect with LLM-aware placeholder detection.
- If the match is a placeholder / sample, append [skip-secrets-check] to the
  commit message and re-run.
```

### 2.2 Hook B — aphelion-sensitive-file-guard

**Purpose**: Block writes to files whose names match conventional secret-file patterns.

**if condition** (from `settings.json`):
```
Write(.env*)|Write(**/*.pem)|Write(**/*.key)|Write(**/credentials.*)|Write(**/*.secret)|Write(**/id_rsa)|Write(**/id_ed25519)|Write(**/id_ecdsa)|Edit(.env*)|Edit(**/*.pem)|Edit(**/*.key)|Edit(**/credentials.*)
```

**Path decision order** (higher priority overrides lower):
1. `ALLOW_PATH_PATTERNS` match (path contains `/tests?/`, `/__fixtures__/`, `/fixtures/`, `/examples/`, `/docs/`) → allow
2. `ALLOW_SUFFIXES` match (basename ends with `.example`, `.template`, `.sample`, `.dist`) → allow
3. `BLOCK_GLOBS` match (`.env`, `.env.*`, `*.pem`, `*.key`, `credentials.*`, `*.secret`, `id_rsa`, `id_ed25519`, `id_ecdsa`) → block
4. Anything else → allow

**Exit semantics**:
- `0` — Path is allowed; write proceeds.
- `1` — Script internal error (trap ERR); falls through to exit 0 (fail-open).
- `2` — Path is blocked.

**stderr format** (on block):
```
[aphelion-hook:sensitive-file-guard] BLOCKED: write to sensitive file
  path: {absolute path}
  matched glob: {glob}
  rationale: this filename is conventionally used for secrets ...
  bypass: there is no commit-message-style bypass for this hook.
    To proceed, edit .claude/settings.json and remove the
    aphelion-sensitive-file-guard PreToolUse entry, or rename the target file
    to one of: *.example, *.template, *.sample, *.dist.
```

### 2.3 Hook E — aphelion-deps-postinstall

**Purpose**: Emit a non-blocking advisory message after dependency installation commands,
prompting the developer to run a vulnerability scan.

**if condition** (from `settings.json`):
```
Bash(npm install*)|Bash(npm i *)|Bash(npm ci*)|Bash(uv add*)|Bash(uv pip install*)|Bash(pip install*)|Bash(cargo add*)|Bash(go get *)
```

**Operation**: Detects the tech stack from the command prefix (npm / uv / pip / cargo / go)
and emits a stderr message recommending the matching vulnerability scan command.

**Exit semantics**: Always `0` (`PostToolUse` hooks cannot block tool execution).

**stderr format**:
```
[aphelion-hook:deps-postinstall] {Stack} dependency change detected.
  Recommended next step: run /vuln-scan to check for known vulnerabilities.
  (Manual equivalent: {scan command})
  Skipping recommended after lockfile-only updates or when offline.
```

---

## 3. Bypass Mechanisms

| Hook | Bypass Method | Notes |
|------|--------------|-------|
| A (secrets-precommit) | Append `[skip-secrets-check]` to the commit message | Conventional Commits style; applies regardless of `-m` or `-F` |
| B (sensitive-file-guard) | No bypass marker — edit `.claude/settings.json` to remove the hook entry | Intentional: a bypass marker would undermine multi-layer defense |
| E (deps-postinstall) | No bypass needed — advisory only; always exits 0 | — |

When hook A blocks due to a false positive (e.g., a placeholder value that looks like a real
secret), use `/secrets-scan` to confirm it is safe, then append `[skip-secrets-check]` and retry.

---

## 4. Distribution Policy

### 4.1 Canonical location

```
src/.claude/hooks/
├── lib/
│   └── secret-patterns.sh      # Shared pattern library (P1–P8)
├── aphelion-secrets-precommit.sh
├── aphelion-sensitive-file-guard.sh
└── aphelion-deps-postinstall.sh

src/.claude/settings.json       # Hook registration template
```

All hook scripts and the settings template are in `src/.claude/` and are distributed
by the same overlay-copy mechanism as `src/.claude/rules/`.

### 4.2 init / update semantics

`npx aphelion-agents init` (first-time setup):
- Copies `src/.claude/settings.json` to `.claude/settings.json` (new file only; never overwrites).
- Copies all files in `src/.claude/hooks/` to `.claude/hooks/` (recursive overlay).
- Sets execute bit (`chmod 0755`) on all `*.sh` files via `chmodHooks()`.

`npx aphelion-agents update`:
- **`settings.json`** — Protected: if `.claude/settings.json` already exists, it is preserved and a warning is printed. User customisations (added hooks, disabled entries) are not overwritten.
- **`hooks/`** — Overlay: always re-copied from canonical. Ensures bug fixes and new patterns reach all deployed hook scripts automatically.
- Re-runs `chmodHooks()` to restore execute bits if lost (e.g., after a Windows git clone).

### 4.3 User customisation

To add a custom hook without losing it on `update`:
- Place the script at `.claude/hooks/local/your-hook.sh` (outside the overlay target).
- Register it in `.claude/settings.json` under the relevant event section.

To disable an Aphelion hook:
- Edit `.claude/settings.json` and delete or comment out the relevant `PreToolUse` or `PostToolUse` entry.
- The entry will not be restored by `update` (settings.json is protected after init).

---

## 5. Failure Modes

| Scenario | Behaviour | Recovery |
|----------|-----------|---------|
| Hook script exits with uncaught error | `trap ERR` catches it and exits 0 (fail-open). Work is not blocked by hook bugs. | Review `[aphelion-hook:…] internal error` message in stderr. Report to Aphelion issue tracker. |
| Hook script times out (Claude Code default: 60 s) | Claude Code emits a warning; hook is skipped. | Contact Aphelion issue tracker if timeout is recurrent. |
| `git` binary not found | Hook A outputs an early-exit warning and exits 0. Commit proceeds. | Ensure `git` is on PATH inside the project environment. |
| Execute bit missing on hook script | Claude Code cannot exec the script; hook fails with `permission denied`. Run `aphelion-agents update` to restore bits. | Re-run `npx aphelion-agents update`. |
| Regex false positive (hook A) | Commit is blocked with pattern ID. | Use `/secrets-scan` to confirm it is a placeholder, then append `[skip-secrets-check]`. |

---

## 6. Interactions with Other Policies

| Policy | Relationship |
|--------|-------------|
| `sandbox-policy.md` | Hooks act before sandbox delegation. A hook blocking `git commit` (exit 2) prevents the command from reaching the `sandbox-runner` delegation step. |
| `denial-categories.md` | If a hook's block is misread as a denial by Claude Code's auto-mode, diagnose with `denial-categories.md` — the cause is `sandbox_policy` (hook block), not `os_permission`. |
| `library-and-security-policy.md` | Hook E (deps-postinstall) is the runtime signal that triggers the vulnerability scanning recommended in `library-and-security-policy.md`. The `/vuln-scan` command performs the full scan. |

---

## 7. Auto-load Notes

- File location: `src/.claude/rules/hooks-policy.md` (canonical; deployed to `.claude/rules/hooks-policy.md` in user projects)
- This file is in `.claude/rules/` and is auto-loaded by Claude Code on every session start, applying to all agents.
- The hooks themselves (`*.sh`) are **not** rule files; they are executed by Claude Code's hook runtime, not loaded as context.
- Canonical pattern library: `src/.claude/hooks/lib/secret-patterns.sh` — single source of truth for P1–P8 regexes. The `/secrets-scan` slash command will reference this library after PR 1d refactor.
