# copilot-instructions.md — Aphelion Workflow Overview

This file provides a high-level overview of the Aphelion workflow.
Behavioral rules are defined in `.claude/rules/` (auto-loaded).
Agent-specific rules are documented in the individual files under `.github/agents/`.


---

## Aphelion Workflow Model

Aphelion divides the entire project lifecycle into three domains — **Discovery (requirements exploration) → Delivery (design & implementation) → Operations (deploy & operations)** — each managed by an independent orchestrator (flow).

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
```

### Branching by Product Type

| PRODUCT_TYPE | Discovery | Delivery | Operations |
|-------------|-----------|----------|------------|
| `service` | Run | Run | Run |
| `tool` / `library` / `cli` | Run | Run | **Skip** |

---

## Agent Directory

Agent definitions are stored in `.github/agents/` (the standard Claude Code location).
Orchestrator-specific rules are in `.github/orchestrator-rules.md` (read on-demand by orchestrators).

---

## Tech Stack Flexibility

Each agent includes Python (FastAPI) based default examples, but these are **defaults, not requirements**.

- Always prioritize the tech stack determined in SPEC.md
- Substitute Python-specific references with equivalent tools for the target tech stack
- If in doubt, confirm with the user
