# Getting Started

> **Language**: [English](../en/Getting-Started.md) | [日本語](../ja/Getting-Started.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: added /aphelion-init and /aphelion-help, #39)
> **Audience**: New users

This page covers everything you need to start using Aphelion: Claude Code setup, first-run walkthrough, usage scenarios, command reference, and troubleshooting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [First Run Walkthrough](#first-run-walkthrough)
- [Usage Scenarios](#usage-scenarios)
- [Command Reference](#command-reference)
- [What to Expect: A Typical Session](#what-to-expect-a-typical-session)
- [Troubleshooting](#troubleshooting)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Claude Code | Claude Code CLI installed and authenticated |

You can install Aphelion via `npx github:kirin0198/aphelion-agents init` (no clone required), or clone the repository manually:

```bash
git clone https://github.com/kirin0198/aphelion-agents.git
```

---

## Quick Start

### Install via npx (recommended)

The fastest way to get started — no cloning required:

```bash
# Initial install (into current project)
npx github:kirin0198/aphelion-agents init

# Install into user home (~/.claude/)
npx github:kirin0198/aphelion-agents init --user

# Update to latest
npx github:kirin0198/aphelion-agents update
npx github:kirin0198/aphelion-agents update --user
```

> **Cache caveat:** `npx` caches packages by `name@version`. If your local cache holds an
> older extraction at the same version string, `update` will silently copy that stale snapshot.
> To force a refresh: pin the source ref (`npx github:kirin0198/aphelion-agents#main update`)
> or clear the cache (`npm cache clean --force`) then re-run `update`.
> Compare the printed `source: aphelion-agents@<version>` against the latest
> `version` in [package.json on `main`](https://github.com/kirin0198/aphelion-agents/blob/main/package.json)
> to confirm freshness.

### Install via git clone (alternative)

Clone the repository first:

```bash
git clone https://github.com/kirin0198/aphelion-agents.git
```

Then copy the files manually:

Copy the `.claude/` directory to your project and start Claude Code:

```bash
cp -r .claude /path/to/your-project/
cd /path/to/your-project && claude

/discovery-flow I want to build a TODO app
```

---

## First Run Walkthrough

This walkthrough uses Claude Code for a new project.

**Step 1: Copy Aphelion to your project**

```bash
cp -r /path/to/aphelion-agents/.claude /path/to/your-project/
cd /path/to/your-project
claude
```

**Step 1.5: Set up project-specific rules (recommended)**

```
/aphelion-init
```

`rules-designer` walks you through language / framework, Git conventions, build commands,
output language, and Co-Authored-By policy, then writes `.claude/rules/project-rules.md`.
Skip this if you only want to evaluate Aphelion before committing to a setup. Run
`/aphelion-help` at any time to see every command this repo ships.

**Step 2: Start Discovery**

```
/discovery-flow I want to build a task management web app with user authentication
```

The orchestrator will ask you several triage questions to determine the plan. For a web app with authentication, it will likely select Standard or Full.

**Step 3: Review Discovery output**

After all Discovery phases complete, review `DISCOVERY_RESULT.md`. If you are satisfied, proceed to Delivery.

**Step 4: Start Delivery**

```
/delivery-flow
```

The orchestrator reads `DISCOVERY_RESULT.md` and performs triage again for the implementation phase.

**Step 5: Review and iterate**

At each phase, the orchestrator shows you what was generated and asks for approval. You can approve, request modifications, or stop.

**Step 6: Start Operations (service only)**

```
/operations-flow
```

Only needed if `PRODUCT_TYPE: service`. Builds Dockerfile, CI/CD, and operations plan.

---

## Usage Scenarios

### Scenario 1: New Project (Full Flow)

Start from scratch — requirements through deployment:

```
/discovery-flow I want to build a blog management system
```

After Discovery completes and you review `DISCOVERY_RESULT.md`:

```
/delivery-flow
```

After Delivery completes (for service projects):

```
/operations-flow
```

### Scenario 2: Quick Build (Delivery Only)

When you already know what to build:

```
/delivery-flow I want to build a REST API for managing contacts
```

The orchestrator will interview you directly since there is no `DISCOVERY_RESULT.md`.

### Scenario 3: Existing Project with Docs (Bug Fix or Feature)

Your project has `SPEC.md` and `ARCHITECTURE.md`:

```
/analyst There's a 500 error on the login endpoint when the email contains special characters
```

After `analyst` generates the GitHub issue and approach document:

```
/delivery-flow
```

The flow joins from Phase 3 (architecture), skipping spec and UI design.

### Scenario 3b: Maintenance flow with triage (bug / CVE / small feature)

When the change is small and you want automatic triage:

```
/maintenance-flow Login endpoint returns 500 when email contains special characters
```

`change-classifier` analyzes the trigger and proposes Patch / Minor / Major. Patch and Minor complete in a single flow; Major hands off to `/delivery-flow` automatically via `MAINTENANCE_RESULT.md`.

Prefer `/maintenance-flow` over `/analyst` when:
- The change has urgency (P1/P2 incident)
- You want automatic impact analysis (files, dependencies, regression risk)
- You need guided plan selection rather than a single-issue workflow

### Scenario 4: Existing Project without Docs

Reverse-engineer the specification first:

```
/codebase-analyzer Analyze this project and generate SPEC.md and ARCHITECTURE.md
```

After review and approval:

```
/analyst I want to add OAuth2 social login
/delivery-flow
```

### Scenario 5: Standalone Agents

You can invoke any agent directly without a flow:

```
/security-auditor  (run security audit on existing code)
/reviewer          (run code review only)
/doc-writer        (generate README and CHANGELOG)
```

---

## Command Reference

| Command | Purpose | Entry Point |
|---------|---------|-------------|
| `/aphelion-init` | First-run project rules setup (launches `rules-designer`) | Right after `npx aphelion-agents init` |
| `/aphelion-help` | List all Aphelion slash commands | Anytime, in any project |
| `/discovery-flow {description}` | Start requirements exploration | New projects |
| `/delivery-flow` | Start design & implementation | After Discovery, or with existing SPEC.md |
| `/operations-flow` | Start deployment & operations | After Delivery, service type only |
| `/analyst {issue}` | Analyze bugs/features for existing projects | Projects with SPEC.md |
| `/maintenance-flow {trigger}` | Maintenance triage and execution (Patch/Minor/Major) for existing project | Projects with SPEC.md + ARCHITECTURE.md |
| `/codebase-analyzer {instruction}` | Reverse-engineer specs from existing code | Projects without SPEC.md |

> These commands are defined as slash commands in `.claude/commands/*.md` (Claude Code).
> Run `/aphelion-help` for the canonical, always-up-to-date listing.

---

## What to Expect: A Typical Session

### Triage Questions

At flow start, the orchestrator asks 4-6 questions about your project. Answer as accurately as possible — these determine which agents run.

### Phase Approvals

After each agent completes, the orchestrator shows a summary and asks:
- **Approve and continue** — proceed to the next phase
- **Request modification** — describe changes and the agent re-runs
- **Stop** — end the flow

### Artifact Files

Each agent generates one or more files:

| Phase | Files Generated |
|-------|----------------|
| Discovery | INTERVIEW_RESULT.md, RESEARCH_RESULT.md, POC_RESULT.md, SCOPE_PLAN.md, DISCOVERY_RESULT.md |
| Delivery | SPEC.md, UI_SPEC.md, ARCHITECTURE.md, TASK.md, implementation code, TEST_PLAN.md, SECURITY_AUDIT.md, README.md |
| Operations | Dockerfile, docker-compose.yml, .github/workflows/ci.yml, DB_OPS.md, OBSERVABILITY.md, OPS_PLAN.md |

### Session Resume

If a session is interrupted (especially during `developer`), you can resume:

```
/developer  (resume from TASK.md)
```

Or restart the entire flow — it will detect existing files and ask if you want to continue or start over.

---

## Troubleshooting

### "DISCOVERY_RESULT.md is missing required fields"

Delivery Flow validates `DISCOVERY_RESULT.md` at startup. If it reports missing fields (`PRODUCT_TYPE`, "プロジェクト概要", "要件サマリー"), edit the file to add the missing sections, then re-run `/delivery-flow`.

### "Agent returned STATUS: error"

The orchestrator will present options:
- **Retry** — re-run the same agent
- **Retry with instruction** — describe what to fix before retrying
- **Skip** — skip this agent and continue
- **Stop** — abort the flow

### "Developer is stuck / taking too long"

`developer` uses `TASK.md` to track progress. If a task is taking too long, you can interrupt and resume later. The next run will start from the first incomplete task in `TASK.md`.

---

## Related Pages

- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Triage System](./Triage-System.md)

## Canonical Sources

- [README.md](../../README.md) — Project overview and Quick Start
- [.claude/commands/](../../.claude/commands/) — Slash command definitions
- [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md) — Discovery flow startup procedure
- [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md) — Delivery flow startup procedure
