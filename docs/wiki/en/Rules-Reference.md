# Rules Reference

> **Language**: [English](../en/Rules-Reference.md) | [日本語](../ja/Rules-Reference.md)
> **Last updated**: 2026-04-18
> **Audience**: Agent developers

This page is a compact reference for all 10 behavioral rules in `.claude/rules/`. Each entry summarizes scope, auto-load behavior, interactions with other rules and agents, and the key constraint the rule enforces.

For full details, follow the **Canonical** link to the source file.

## Table of Contents

- [aphelion-overview](#aphelion-overview)
- [agent-communication-protocol](#agent-communication-protocol)
- [build-verification-commands](#build-verification-commands)
- [document-versioning](#document-versioning)
- [file-operation-principles](#file-operation-principles)
- [git-rules](#git-rules)
- [language-rules](#language-rules)
- [library-and-security-policy](#library-and-security-policy)
- [sandbox-policy](#sandbox-policy)
- [user-questions](#user-questions)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## aphelion-overview

- **Canonical**: [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md)
- **Scope**: All agents and orchestrators; provides the top-level workflow context
- **Auto-load**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
- **Key constraint**: Defines the three-domain model (Discovery / Delivery / Operations), triage tiers, and agent directory location. All agents operate within this framework.
- **Interactions**: Referenced by all flow orchestrators and agents as the authoritative workflow model

---

## agent-communication-protocol

- **Canonical**: [.claude/rules/agent-communication-protocol.md](../../.claude/rules/agent-communication-protocol.md)
- **Scope**: All agents; flow orchestrators are exempt from emitting AGENT_RESULT (they produce handoff files instead)
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Orchestrators parse AGENT_RESULT STATUS values to drive approval gates, rollbacks, and error handling (see `orchestrator-rules.md`). The `blocked` STATUS triggers a lightweight architect query before developer can resume.
- **Summary**: Defines the mandatory `AGENT_RESULT` block format that every agent must emit at work completion. Specifies 7 STATUS values (`success`, `error`, `failure`, `suspended`, `blocked`, `approved`/`conditional`/`rejected`) and their meaning for orchestrator decisions. Also defines the `blocked` STATUS usage pattern: when `developer` discovers design ambiguity, it emits `BLOCKED_TARGET: architect` so the orchestrator can resolve the ambiguity before resuming.

---

## build-verification-commands

- **Canonical**: [.claude/rules/build-verification-commands.md](../../.claude/rules/build-verification-commands.md)
- **Scope**: `developer` (per-task verification) and `tester` (test execution)
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Defines the lint/format gate that `developer` must pass before committing each task. `tester` uses the test execution commands column. `e2e-test-designer` and `tester` use the E2E commands table (only when `HAS_UI: true`).
- **Summary**: Provides syntax check, lint/format, and test execution commands for Python, TypeScript, Go, Rust, and Node.js. The lint gate is mandatory — lint errors must be fixed before testing. If lint tools are not installed, syntax check only is acceptable with a note in the task report. E2E commands cover Playwright (Web), pywinauto (Windows desktop), pyautogui (cross-platform), and Playwright for Electron apps.

---

## document-versioning

- **Canonical**: [.claude/rules/document-versioning.md](../../.claude/rules/document-versioning.md)
- **Scope**: `architect`, `spec-designer`, `ux-designer`, `test-designer`, `developer`, all flow orchestrators
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Each agent that produces a design document (`SPEC.md`, `ARCHITECTURE.md`, `UI_SPEC.md`, `TEST_PLAN.md`) must record `最終更新` and `更新履歴` at the top. `developer` uses the TASK.md format defined here. Flow orchestrators use this to record artifact versions from the previous domain in the handoff file.
- **Summary**: Requires update history recording at the top of every design document using a blockquote format. Establishes a traceability chain: `architect` records which SPEC.md version was used, `developer` records which ARCHITECTURE.md version was used in TASK.md. The TASK.md format is fully specified here (task list, recent commits, interruption notes).

---

## file-operation-principles

- **Canonical**: [.claude/rules/file-operation-principles.md](../../.claude/rules/file-operation-principles.md)
- **Scope**: All agents that read or write files
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Applies to every file write operation. Works together with `git-rules` (no deletion, no staging sensitive files). Prevents `developer` from creating directories not listed in ARCHITECTURE.md.
- **Summary**: Three mandatory constraints: (1) always `Read` existing file contents before overwriting, (2) never delete files unless the user explicitly instructs it, (3) never create directories not listed in design documents (SPEC.md / ARCHITECTURE.md). If a new directory is needed, confirm with the user first.

---

## git-rules

- **Canonical**: [.claude/rules/git-rules.md](../../.claude/rules/git-rules.md)
- **Scope**: `developer`, `releaser`, `scaffolder`, and any agent that makes git commits
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: `developer` must follow one-commit-per-task granularity. `releaser` creates git tags. `git add -A` is explicitly prohibited — `developer` must use `git add {specific-files}`.
- **Summary**: Defines commit granularity (one commit per task, test code same as implementation), staging policy (`git add -A` is prohibited; use explicit file paths; never commit `.env`, `credentials.*`, `*.secret`), and commit message format (`{prefix}: {task-name} (TASK-{N})` with 8 prefix types: feat, fix, refactor, test, docs, chore, ci, ops).

---

## language-rules

- **Canonical**: [.claude/rules/language-rules.md](../../.claude/rules/language-rules.md)
- **Scope**: All agents producing any text output
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Sets language for every output type. Works with `agent-communication-protocol` (AGENT_RESULT keys/values must be English). Applies to all user-facing content in `user-questions`.
- **Summary**: Defines the language to use for each output type: code/variable names/commit messages in English; agent definition files/rules/guidelines in English; code comments/user-facing docs/reports to user in Japanese; AGENT_RESULT block keys/values in English; user-facing CLI output (AskUserQuestion content, approval gates, progress displays) in Japanese.

---

## library-and-security-policy

- **Canonical**: [.claude/rules/library-and-security-policy.md](../../.claude/rules/library-and-security-policy.md)
- **Scope**: `architect` (library selection), `developer` (library adoption), `security-auditor` (vulnerability scanning). **`security-auditor` mandate applies to all plans.**
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: `architect` records selected libraries in ARCHITECTURE.md with adoption rationale. `developer` follows ARCHITECTURE.md but can add libraries if needed (must verify adoption criteria first). `security-auditor` performs final verification via dependency scanning. The security-auditor mandatory execution rule overrides triage decisions — it runs even on Minimal plan.
- **Summary**: Three core principles for libraries: prefer standard libraries, avoid reinventing the wheel, minimize dependencies. Adoption criteria: actively maintained, widely adopted, no known CVEs, license-compatible, reasonable dependency depth. Responsibility split: architect selects, developer follows/extends, security-auditor scans. **Mandatory rule**: `security-auditor` must run on all Delivery plans including Minimal. Covers OWASP Top 10, dependency vulns, auth gaps, hardcoded secrets, input validation, and CWE checklist.

---

## sandbox-policy

- **Canonical**: [.claude/rules/sandbox-policy.md](../../.claude/rules/sandbox-policy.md)
- **Scope**: All agents that own the `Bash` tool: `developer`, `tester`, `poc-engineer`, `scaffolder`, `infra-builder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`, `observability`. (`sandbox-runner` is the policy executor, not a subject.)
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Defines the 5 dangerous command categories (`destructive_fs`, `prod_db`, `privilege_escalation`, `secret_access`, `external_net`) and 3 delegation tiers (`required`, `recommended`, `optional`). `sandbox-runner` reads this policy at startup to re-classify commands. Orchestrators reference the tier definitions to decide when to auto-insert `sandbox-runner` (Standard+ plans). Each Bash-owning agent definition file contains a one-line reference to this rule. `infra-builder` generates the devcontainer files referenced by the `container` isolation mode.
- **Sandbox Modes (§4)**: Five modes in priority order: `container` (real physical isolation via devcontainer — highest priority), `platform_permission` (Claude Code permission gate), `advisory_only` (warning only), `blocked` (execution refused), `bypassed` (no category match). Container mode is effective even when the platform operates in `auto`/`allow` mode because it provides a structural boundary independent of permission settings.
- **Decision Tree (§3)**: Container availability is checked **before** platform detection. If `.devcontainer/devcontainer.json` exists and `docker info` succeeds → `container` mode. Otherwise, fall through to platform detection and existing permission mode logic. Fallback order: `container` → `platform_permission` → `advisory_only` → `blocked`.
- **Triage × devcontainer (§5)**: Minimal = skip devcontainer generation; Light = generate, optional launch; Standard = generate, mandatory launch (required-category commands run inside container only); Full = generate, mandatory launch + audit log.
- **Summary**: Establishes when Bash-owning agents must delegate command execution to `sandbox-runner`. Provides the isolation mode decision tree keyed on container availability and platform detection. `required`-tier commands must always be delegated; `recommended`-tier should be delegated with a recorded reason if skipped; `optional`-tier is advisory only. When delegation is unavailable (Minimal plan, standalone context), the agent must warn the user and ask for explicit confirmation.

---

## user-questions

- **Canonical**: [.claude/rules/user-questions.md](../../.claude/rules/user-questions.md)
- **Scope**: All agents that need to ask the user for clarification or input
- **Auto-load behavior**: Auto-loaded by Claude Code on every session start
- **Interactions**: Flow orchestrators use `AskUserQuestion` for triage interviews, approval gates, and phase confirmations. Any agent (including `developer` when blocked) can use it to stop and ask rather than guessing.
- **Summary**: Mandates stopping and asking when there are unclear points rather than guessing. Defines two question mechanisms: `AskUserQuestion` tool (preferred for 2-4 choice questions, multi-select, code comparisons) and text output fallback (for free-text-only questions). Usage guidelines: max 4 questions per call, bundle related questions, place recommended options first with `(推奨)` suffix. The `AskUserQuestion` tool supports `multiSelect: true` for multiple selection scenarios.

---

## Related Pages

- [Architecture](./Architecture.md)
- [Agents Reference](./Agents-Reference.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/rules/](../../.claude/rules/) — All 10 rule files (authoritative source)
- [.claude/rules/aphelion-overview.md](../../.claude/rules/aphelion-overview.md) — Workflow overview (now part of the rules collection)
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Orchestrator behavior that depends on agent-communication-protocol
