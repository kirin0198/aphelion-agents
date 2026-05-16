# Aphelion Workflow Overview

> **Last updated**: 2026-05-16
> **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
> 更新履歴:
>   - 2026-04-24: Maintenance Flow (第4フロー) を追加
>   - 2026-04-30: doc-reviewer (cross-cutting agent) を追加 (#91)
>   - 2026-04-30: doc-flow (5th flow, customer deliverable generation) を追加 (#54)
>   - 2026-05-01: Delivery 12 → 13 agents (visual-designer 追加) (#109)
>   - 2026-05-01: Hook layer section 追加 (MVP 3 hooks, rules count 12→13) (#107)
>   - 2026-05-11: document-locations rule 追加 (docs/ デフォルト配置先, rules count 13→14) (#117)
>   - 2026-05-16: Project-rules consultation section 追加 (per-agent block 削除に伴う共通化, #131 §②)

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
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
 (requirements)                         (design & impl)                       (deploy & ops)
 6 agents                               13 agents                              4 agents

                    Maintenance Flow ──[MAINTENANCE_RESULT.md]──▶ Delivery Flow (Major only)
                    (existing project maintenance)
                    3 new agents + reuse (analyst, architect, developer, tester,
                                          reviewer, security-auditor, codebase-analyzer)

                    Doc Flow ──[DOC_FLOW_RESULT.md + docs/deliverables/{slug}/*.md]
                    (customer-deliverable doc generation, MVP=6 doc types)
                    7 agents (1 orchestrator + 6 authors)
```

**Maintenance Flow (new)**: Triggered by bug reports, CVE alerts, performance regressions,
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

---

## Agent Directory

Agent definitions are stored in `.claude/agents/` (the standard Claude Code location).
Orchestrator-specific rules are in `.claude/orchestrator-rules.md` (read on-demand by orchestrators).

### Cross-cutting agents

| Agent | Tools | Purpose | Invocation |
|-------|-------|---------|------------|
| `sandbox-runner` | Read, Bash, Grep | High-risk command execution | Auto-insert (Standard+) / explicit delegation |
| `doc-reviewer` | Read, Glob, Grep | Markdown artifact consistency review | Auto-insert (all plans) / standalone |

### Doc Flow agents

| Agent | Tools | Purpose | Invocation |
|-------|-------|---------|------------|
| `doc-flow` | Bash, Read, Write, Glob, Grep, Agent | 5th flow orchestrator | `/doc-flow` |
| `hld-author` | Read, Write, Glob, Grep | High-Level Design | via doc-flow / standalone |
| `lld-author` | Read, Write, Glob, Grep | Low-Level Design | via doc-flow / standalone |
| `ops-manual-author` | Read, Write, Glob, Grep | Ops manual | via doc-flow / standalone |
| `api-reference-author` | Read, Write, Glob, Grep | API reference (customer) | via doc-flow / standalone |
| `user-manual-author` | Read, Write, Glob, Grep | End-user manual | via doc-flow / standalone |
| `handover-author` | Read, Write, Glob, Grep | Handover package | via doc-flow / standalone |

### Hook layer

Aphelion ships a small set of Claude Code hooks under `.claude/hooks/` to provide a
fourth defense layer (proactive content scan) on top of `settings.local.json` deny
rules, `sandbox-runner` isolation, and `denial-categories` post-mortem classification.
The MVP hook set focuses on user-project safety: secrets pre-commit guard, sensitive
file write block, and dependency-install vuln-scan reminder.

See `hooks-policy.md` (rule, auto-loaded) and `docs/wiki/en/Hooks-Reference.md`
(user-facing) for details.

### Document locations rule

Aphelion uses a centralized path-resolution rule (`document-locations.md`) to determine
where planning / design / handoff documents (SPEC.md, ARCHITECTURE.md, UI_SPEC.md, etc.)
are read from and written to. New projects default to `docs/<NAME>.md`; existing projects
with root-level files continue to work via root fallback. All agents resolve document paths
through this rule rather than hard-coding paths.

See `document-locations.md` (rule, auto-loaded, #14) for the resolution algorithm, covered
artifact list, MUST NOT constraints, and hybrid-state handling.

### Project-rules consultation (all agents)

All agents `Read` `.claude/rules/project-rules.md` before user-facing
output and (Bash-owning agents) before `git commit`. Resolve `## Authoring`
→ Co-Authored-By policy (`git-rules.md`) and `## Localization` →
Output Language (`language-rules.md`). Defaults when project-rules.md is
absent: Co-Authored-By: enabled, Output Language: en.

---

## Tech Stack Flexibility

Each agent includes Python (FastAPI) based default examples, but these are **defaults, not requirements**.

- Always prioritize the tech stack determined in SPEC.md
- Substitute Python-specific references with equivalent tools for the target tech stack
- If in doubt, confirm with the user
