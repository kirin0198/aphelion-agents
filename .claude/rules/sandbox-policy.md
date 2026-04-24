# Sandbox Policy

> **Last updated**: 2026-04-25
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start

This rule applies to all agents that own the `Bash` tool:
`developer`, `tester`, `poc-engineer`, `scaffolder`, `infra-builder`, `codebase-analyzer`,
`security-auditor`, `db-ops`, `releaser`, `observability`.

(`sandbox-runner` itself owns Bash but is the *executor* of this policy, not a subject of it.
Re-delegation from `sandbox-runner` to itself is prohibited — when `caller_agent == "sandbox-runner"`, skip re-classification.)

---

## 1. Dangerous Command Categories

Before executing any shell command via `Bash`, classify it against the following categories.

| Category | Pattern Examples | Default Tier |
|----------|-----------------|--------------|
| **destructive_fs** | `rm\s+-[rRfF]*\s+/`, `rm\s+-[rRfF]*\s+~`, `mkfs`, `dd\s+of=`, `shred`, `find\s+.*-delete`, `>\s*/dev/sd` | required |
| **prod_db** | Connection strings containing `PROD`, `PRODUCTION`, `LIVE` in env var names; `psql\s+.*prod`, `mongosh?\s+.*prod`, `mysql\s+.*--host=.*prod` | required |
| **privilege_escalation** | `sudo\b`, `su\s+-`, `chmod\s+777`, `chown\s+root`, `setuid`, `doas\b` | required |
| **secret_access** | `cat\s+.*\.env`, `cat\s+.*credentials`, `cat\s+.*\.secret`, `gh\s+auth\s+token`, `aws\s+configure`, `kubectl\s+config\s+view\s+--raw` | required |
| **external_net** | `curl\s+.*(https?://)(?!localhost\|127\.)`, `wget\b`, `ssh\s+`, `scp\s+`, `rsync\s+.*::`, `nc\s+`, `npm\s+publish`, `cargo\s+publish`, `twine\s+upload` | recommended |

### Tier Definitions

- **`required`** — Must delegate to `sandbox-runner`. In Standard/Full plans, the orchestrator inserts `sandbox-runner` automatically. In Minimal/Light plans, the calling agent must delegate explicitly and display a user warning if it cannot.
- **`recommended`** — The calling agent should delegate to `sandbox-runner`. If delegation is skipped, record the reason in the `AGENT_RESULT` output.
- **`optional`** — Delegation is discretionary. Advisory only; no delegation required.

---

## 2. Delegation Condition Table

| Category             | Tier        | Orchestrator Auto-insert (Standard+) | Explicit Delegation |
|----------------------|-------------|--------------------------------------|---------------------|
| destructive_fs       | required    | Yes                                  | Always              |
| prod_db              | required    | Yes                                  | Always              |
| privilege_escalation | required    | Yes                                  | Always              |
| secret_access        | required    | Yes                                  | Always              |
| external_net         | recommended | Yes                                  | If caller decides   |
| (no match)           | optional    | No                                   | No                  |

---

## 3. Isolation Mode Decision Tree

When a command matches a category, select the isolation mode as follows:

```
[Command Input]
    │
    ▼
[Category Classification] ── no category match ──▶ [bypassed: execute directly]
    │
    ▼
[Container Availability Check]
    │
    ├─ .devcontainer/devcontainer.json exists AND `docker info` succeeds
    │       └──▶ [container: execute via devcontainer / docker-compose.dev.yml]
    │                (strongest isolation — bypasses permission mode concerns)
    │
    └─ container unavailable (devcontainer missing OR docker daemon not running)
            │
            ▼
        [Claude Code Permission Mode Selection]
            │
            ├─ required category → permission: `ask` (when settings.json not configured) or `deny`
            ├─ recommended category → permission: `ask`
            └─ optional category → permission: `allow` + audit log
```

**Fallback order (confirmed):**
`container` → `platform_permission` → `blocked`

> **Note on auto mode and container isolation:** Even when Claude Code operates in `auto` / `allow` mode (which would otherwise bypass permission gates), running inside a container still provides real physical isolation. `container` mode is therefore always the strongest option regardless of the permission mode setting.

> **Claude Code only:** Aphelion is a Claude Code–only project. This policy assumes Claude Code as the execution host. No multi-platform detection is performed.

---

## 4. Sandbox Modes

| Mode | Description |
|------|-------------|
| `container` | Command runs inside the project's devcontainer (`.devcontainer/devcontainer.json`) or `docker-compose.dev.yml`. Provides real physical isolation. Highest priority when available. |
| `platform_permission` | Claude Code permission mode controls execution (allow / ask / deny) |
| `blocked` | Execution refused; user must confirm or override |
| `bypassed` | No category match; executed directly without sandbox |

**Priority order:** `container` > `platform_permission` > `blocked`

> `container` mode provides real physical isolation independent of the platform's permission mode setting.
> Even when running in `auto`/`allow` mode, container isolation remains effective as a structural boundary.

---

## 5. Triage Plan × sandbox-runner Placement

| Plan | sandbox-runner Placement | devcontainer Generation | devcontainer Launch Mode | Notes |
|------|-------------------------|------------------------|--------------------------|-------|
| **Minimal** | Not used (policy advisory only) | **Skipped** | N/A | Policy violations: user warning only. `infra-builder` does not generate devcontainer. |
| **Light** | Explicit delegation from calling agent only | **Generated** | **Optional** (user starts `devcontainer open` when needed) | `required` categories: explicit delegation; others: advisory |
| **Standard** | Orchestrator auto-insert enabled | **Generated** | **Mandatory** — `required`-category Bash commands run inside the container only | Docker daemon unavailable → fallback to `platform_permission` |
| **Full** | Same as Standard + audit log written to SECURITY_AUDIT.md | **Generated** | **Mandatory + audit log** (devcontainer entry/exit recorded) | `security-auditor` post-processes audit log |

In Operations Flow, at Standard and above, place `sandbox-runner` before `db-ops`, `releaser`, and `observability`.

---

## 6. Agent Behavior When Unable to Delegate

When `sandbox-runner` is unavailable (Minimal plan, standalone invocation) and a `required` category command must be executed:

1. Display a warning to the user explaining the risk
2. Ask the user for explicit confirmation before proceeding
3. Record in `AGENT_RESULT` that delegation was skipped and the reason

Example warning format:
```
⚠️ 警告: このコマンドは sandbox-policy の `{category}` カテゴリに該当します。
sandbox-runner が利用できないため、直接実行します。
コマンド: {command}
続行する場合は確認してください。
```

---

## 7. Auto-load Notes

- File location: `.claude/rules/sandbox-policy.md`
- This file is in `.claude/rules/` and is auto-loaded by Claude Code on every session start, applying to all agents.
- Each Bash-owning agent's definition file contains a one-line reference to this policy. Detailed checks are centralized here.
- `sandbox-runner` itself reads this policy at startup to re-classify commands received from callers.
