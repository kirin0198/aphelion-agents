# Aphelion Workflow Overview

> **Last updated**: 2026-04-30
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
> 更新履歴:
>   - 2026-04-24: Maintenance Flow (第4フロー) を追加
>   - 2026-04-30: doc-reviewer (cross-cutting agent) を追加 (#91)

This file provides a high-level overview of the Aphelion workflow.
Behavioral rules are defined in `.claude/rules/` (auto-loaded).
Agent-specific rules are documented in the individual files under `.claude/agents/`.

> **For flow orchestrators:** Orchestrator-specific rules (triage, handoff file specification, approval gate, error handling, phase execution loop, rollback rules) are defined in `.claude/orchestrator-rules.md`. Read this file at startup.

---

## Aphelion Workflow Model

Aphelion divides the entire project lifecycle into three primary domains — **Discovery (requirements exploration) → Delivery (design & implementation) → Operations (deploy & operations)** — plus an independent **Maintenance** flow for changes to existing projects. Each domain is managed by an independent orchestrator (flow).

### Design Principles

- **Domain separation**: Each domain runs in an independent session
- **File handoff**: Domains are connected via `.md` files (DISCOVERY_RESULT.md, DELIVERY_RESULT.md). No automatic chaining
- **Session isolation**: Each flow orchestrator runs in its own session to prevent context window bloat
- **Triage adaptation**: Each flow orchestrator assesses project characteristics at flow start and selects from 4 tiers: Minimal / Light / Standard / Full
- **Independent invocation**: Any agent can be invoked standalone as long as its input files are available

### Domain and Flow Overview

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
 (requirements)                         (design & impl)                       (deploy & ops)
 6 agents                               12 agents                              4 agents

                    Maintenance Flow ──[MAINTENANCE_RESULT.md]──▶ Delivery Flow (Major only)
                    (existing project maintenance)
                    3 new agents + reuse (analyst, architect, developer, tester,
                                          reviewer, security-auditor, codebase-analyzer)
```

**Maintenance Flow (new)**: Triggered by bug reports, CVE alerts, performance regressions,
tech debt, or small feature requests on existing projects with SPEC.md/ARCHITECTURE.md.
Performs Patch/Minor/Major triage and completes independently for Patch/Minor.
Major handoff targets Delivery Flow as a pre-processing stage.

> **Cross-cutting agents** (`sandbox-runner`, `doc-reviewer`) are not
> tied to a single domain. They are auto-inserted by flow orchestrators
> at trigger conditions defined in `.claude/orchestrator-rules.md`.

### Branching by Product Type

| PRODUCT_TYPE | Discovery | Delivery | Maintenance | Operations |
|-------------|-----------|----------|-------------|------------|
| `service` | Run | Run | Run (for maintenance) | Run |
| `tool` / `library` / `cli` | Run | Run | Run (for maintenance) | **Skip** |

---

## Agent Directory

Agent definitions are stored in `.claude/agents/` (the standard Claude Code location).
Orchestrator-specific rules are in `.claude/orchestrator-rules.md` (read on-demand by orchestrators).

### Cross-cutting agents

| Agent | Tools | Purpose | Invocation |
|-------|-------|---------|------------|
| `sandbox-runner` | Read, Bash, Grep | High-risk command execution | Auto-insert (Standard+) / explicit delegation |
| `doc-reviewer` | Read, Glob, Grep | Markdown artifact consistency review | Auto-insert (all plans) / standalone |

---

## Tech Stack Flexibility

Each agent includes Python (FastAPI) based default examples, but these are **defaults, not requirements**.

- Always prioritize the tech stack determined in SPEC.md
- Substitute Python-specific references with equivalent tools for the target tech stack
- If in doubt, confirm with the user
