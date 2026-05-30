# Aphelion Workflow Overview

> **Last updated**: 2026-05-30
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
> See git log for change history.

This file provides a high-level overview of the Aphelion workflow.
Behavioral rules are defined in `.claude/rules/` (auto-loaded).
Agent-specific rules are documented in the individual files under `.claude/agents/`.

> **For flow orchestrators:** Orchestrator-specific rules (triage, handoff file specification, approval gate, error handling, phase execution loop, rollback rules) are defined in `.claude/orchestrator-rules.md`. Read this file at startup.

---

## Aphelion Workflow Model

Aphelion divides the entire project lifecycle into three primary domains — **Discovery (requirements exploration) → Delivery (design & implementation) → Operations (deploy & operations)** — plus an independent **Maintenance** flow for changes to existing projects, and an independent **Doc** flow for customer-deliverable doc generation. Each domain is managed by an independent orchestrator (flow).

### Design Principles

- **Domain separation**: Each domain runs in an independent session
- **File handoff**: Domains are connected via `.md` files (DISCOVERY_RESULT.md, DELIVERY_RESULT.md). No automatic chaining
- **Session isolation**: Each flow orchestrator runs in its own session to prevent context window bloat
- **Triage adaptation**: Each flow orchestrator assesses project characteristics at flow start and selects from 4 tiers: Minimal / Light / Standard / Full
- **Independent invocation**: Any agent can be invoked standalone as long as its input files are available

### Domain and Flow Overview

```
Discovery Flow → Delivery Flow → Operations Flow
(6 agents)       (13 agents)     (4 agents)

Maintenance Flow → Delivery Flow (Major handoff only)
Doc Flow (on-demand, 7 agents: 1 orchestrator + 6 authors)
```

**Maintenance Flow**: Triggered by bug reports, CVE alerts, performance regressions,
tech debt, or small feature requests on existing projects with SPEC.md/ARCHITECTURE.md.
Performs Patch/Minor/Major triage and completes independently for Patch/Minor.
Major handoff targets Delivery Flow as a pre-processing stage.

> **Cross-cutting agents** (`sandbox-runner`, `doc-reviewer`) are not
> tied to a single domain. They are auto-inserted by flow orchestrators
> at trigger conditions defined in `.claude/orchestrator-rules.md`.

### Branching by Product Type

| PRODUCT_TYPE | Discovery | Delivery | Maintenance | Operations | Doc |
|-------------|-----------|----------|-------------|------------|-----|
| `service` | Run | Run | Run (for maintenance) | Run | Run (on demand) |
| `tool` / `library` / `cli` | Run | Run | Run (for maintenance) | **Skip** | Run (user-manual / ops-manual auto-skip) |

### PRODUCT_TYPE Resolution Order

Agents that need PRODUCT_TYPE resolve it using the following fallback chain (highest priority first):

1. `DISCOVERY_RESULT.md` — `PRODUCT_TYPE: ...` field (set by discovery-flow)
2. `SPEC.md` — `## Product Type` section or `Product Type:` field (set by spec-designer)
3. `.claude/rules/project-rules.md` — `## Project Overview` → `Product Type:` line (set by rules-designer)
4. Default: `service`

This order ensures backward compatibility: existing projects without a `Product Type:` line in
project-rules.md will default to `service`, preserving current behavior.

---

## Agent Directory

Agent definitions are stored in `.claude/agents/` (the standard Claude Code location).
Orchestrator-specific rules are in `.claude/orchestrator-rules.md` (read on-demand by orchestrators).

### Cross-cutting agents

`sandbox-runner` (high-risk command execution) and `doc-reviewer` (artifact consistency review) are cross-cutting agents not tied to a single domain. See their respective agent files for tools and invocation details.

### Hook layer

See `hooks-policy.md` (rule, auto-loaded) and `docs/wiki/en/Hooks-Reference.md` (user-facing).

### Document locations rule

See `document-locations.md` (rule, auto-loaded, #14).

### Project-rules consultation (all agents)

All agents `Read` `.claude/rules/project-rules.md` before user-facing
output and (Bash-owning agents) before `git commit`. Resolve `## Authoring`
→ Co-Authored-By policy (`git-rules.md`) and `## Localization` →
Output Language (`language-rules.md`). Defaults when project-rules.md is
absent: Co-Authored-By: enabled, Output Language: en.

---

## Tech Stack Flexibility

Each agent includes Python (FastAPI) based default examples, but these are **defaults, not requirements**. Always prioritize the tech stack determined in SPEC.md and substitute Python-specific references with equivalent tools for the target stack.
