# Getting Started

> **Language**: [English](../en/Getting-Started.md) | [日本語](../ja/Getting-Started.md)
> **Last updated**: 2026-07-29 (updated 2026-07-29: Scenario 5 no longer lists non-existent commands, #206; replace the broken `cp -r .claude/` manual install with the local-clone CLI path, #170; fix repository-root relative-link depth, #169; correct the "Major hands off automatically" claim, #168; 2026-05-31: force CF Pages asset re-hash to recover /getting-started/ HTTP 500, #156; 2026-05-28: add existing-project Quick Start + --user guide, #130 PR-3)
> **Audience**: New users

This page covers everything you need to start using Aphelion: Claude Code setup, first-run walkthrough, usage scenarios, command reference, and troubleshooting.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Existing Project Quick Start](#existing-project-quick-start)
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

Install Aphelion with `npx github:kirin0198/aphelion-agents init` (no clone required).
If you need an offline or version-pinned install, clone the repository and run the
same CLI from the clone — see [Install from a local clone](#install-from-a-local-clone-offline--pinned-version-alternative):

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

#### `init` vs `init --user`: which should I use?

| Case | Recommended |
|------|-------------|
| Use in a specific project | `init` (project-local) |
| Share across multiple projects | `init --user` (global) |
| Using project-rules.md | Always project-local |

> **Warning:** `project-rules.md` must be placed in the project's `.claude/rules/` directory (project-local).
> Installing Aphelion with `init --user` places agents and rules in `~/.claude/` globally, but
> `project-rules.md` must still be generated per project via `/aphelion-init`. A globally placed
> `project-rules.md` in `~/.claude/rules/` can cause unintended behavior across unrelated projects.

### Install from a local clone (offline / pinned-version alternative)

Use this when you cannot reach npm at install time, or you want to pin to a
specific commit. Clone the repository, then run the CLI **from the clone**
against your project directory:

```bash
git clone https://github.com/kirin0198/aphelion-agents.git

cd /path/to/your-project
node /path/to/aphelion-agents/bin/aphelion-agents.mjs init
claude

/aphelion-init
/discovery-flow I want to build a TODO app
```

`init` resolves its source from the clone and its target from the current
working directory, so this produces exactly the same layout as `npx … init`.
`update` works the same way.

> **Do not `cp -r .claude/` from the clone.** The repository's `.claude/`
> holds only `agents/`, `commands/`, `templates/`, and `orchestrator-rules.md`.
> The rules and hooks are distributed from `src/.claude/`, and the repository's
> own `.claude/settings.json` is a dogfooding file that registers hooks under
> `${CLAUDE_PROJECT_DIR}/src/.claude/hooks/` — paths that do not exist in your
> project. Copying it produces missing-hook errors on every Bash / Write / Edit
> call and fails `/aphelion-check`.

---

## Existing Project Quick Start

Already have a codebase? Follow these steps to bring Aphelion in:

**Step 1: Install Aphelion**

```bash
npx github:kirin0198/aphelion-agents init
# or, from a local clone: node /path/to/aphelion-agents/bin/aphelion-agents.mjs init
```

**Step 2: Set up project-specific rules**

```
/aphelion-init
```

`rules-designer` generates `.claude/rules/project-rules.md` for your project. This is required
before running any flow.

**Step 3: Generate docs (only if SPEC.md / ARCHITECTURE.md are absent)**

```
/codebase-analyzer Analyze this project and generate SPEC.md and ARCHITECTURE.md
```

Skip this step if your project already has `SPEC.md` and `ARCHITECTURE.md`.

**Step 4: Start working**

```
/analyst {issue or feature description}
# or
/maintenance-flow {trigger description}
```

Use `/analyst` for a single-issue workflow. Use `/maintenance-flow` when you want automatic
Patch / Minor / Major triage.

**Decision flowchart:**

```
Does your project have SPEC.md and ARCHITECTURE.md?
|
+-- YES --> /analyst  or  /maintenance-flow
|
+-- NO  --> /codebase-analyzer  -->  /analyst  or  /maintenance-flow
```

---

## First Run Walkthrough

This walkthrough uses Claude Code for a new project.

**Step 1: Install Aphelion into your project**

```bash
cd /path/to/your-project
npx github:kirin0198/aphelion-agents init
claude
```

**Step 2: Set up project-specific rules (required)**

```
/aphelion-init
```

`rules-designer` walks you through language / framework, Git conventions, build commands,
output language, and Co-Authored-By policy, then writes `.claude/rules/project-rules.md`.
All subsequent agents assume this file exists and read it for project context. Run
`/aphelion-help` at any time to see every command this repo ships.

**Step 3: Start Discovery**

```
/discovery-flow I want to build a task management web app with user authentication
```

The orchestrator will ask you several triage questions to determine the plan. For a web app with authentication, it will likely select Standard or Full.

**Step 4: Review Discovery output**

After all Discovery phases complete, review `DISCOVERY_RESULT.md`. If you are satisfied, proceed to Delivery.

**Step 5: Start Delivery**

```
/delivery-flow
```

The orchestrator reads `DISCOVERY_RESULT.md` and performs triage again for the implementation phase.

**Step 6: Review and iterate**

At each phase, the orchestrator shows you what was generated and asks for approval. You can approve, request modifications, or stop.

**Step 7: Start Operations (service only)**

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

`change-classifier` analyzes the trigger and proposes Patch / Minor / Major. Patch and Minor complete in a single flow; Major writes `MAINTENANCE_RESULT.md` and stops at a handoff confirmation gate — you then run `/delivery-flow` yourself, and it picks the file up at startup.

Prefer `/maintenance-flow` over `/analyst` when:
- The change has urgency (P1/P2 incident)
- You want automatic impact analysis (files, dependencies, regression risk)
- You need guided plan selection rather than a single-issue workflow

### Scenario 4: Existing Project without Docs

See [Existing Project Quick Start](#existing-project-quick-start) for the full 4-step guide,
including when to run `/codebase-analyzer` and how to proceed to `/analyst` or `/maintenance-flow`.

### Scenario 5: Standalone Agents

Some agents ship a slash command and can be invoked directly, without a flow:

```
/reviewer            (run code review only)
/tester              (run the test suite)
/codebase-analyzer   (reverse-engineer SPEC.md / ARCHITECTURE.md)
/analyst             (analyse one issue and decide the approach)
```

Agents without a slash command — `security-auditor`, `doc-writer`, `architect`,
`spec-designer` and the rest — are launched by asking for them in plain language, e.g.
"run security-auditor on this repository". Run `/aphelion-help` for the current command
list; anything not listed there has no slash command.

---

## Command Reference

| Command | Purpose | Entry Point |
|---------|---------|-------------|
| `/aphelion-init` | First-run project rules setup (launches `rules-designer`) | Right after `npx aphelion-agents init` |
| `/aphelion-help` | List all Aphelion slash commands | Anytime, in any project |
| `/aphelion-check` | Health check: verify agents, rules, hooks, gh auth, git, Docker | Anytime, in any project |
| `/discovery-flow {description}` | Start requirements exploration | New projects |
| `/delivery-flow` | Start design & implementation | After Discovery, or with existing SPEC.md |
| `/operations-flow` | Start deployment & operations | After Delivery, service type only |
| `/doc-flow` | Generate customer-facing deliverables (HLD / LLD / API reference / ops manual / user manual / handover) | Projects with SPEC.md + ARCHITECTURE.md |
| `/analyst {issue}` | Analyze bugs/features for existing projects | Projects with SPEC.md |
| `/maintenance-flow {trigger}` | Maintenance triage and execution (Patch/Minor/Major) for existing project | Projects with SPEC.md + ARCHITECTURE.md |
| `/codebase-analyzer {instruction}` | Reverse-engineer specs from existing code | Projects without SPEC.md |
| `/reviewer` | Code review against SPEC.md and ARCHITECTURE.md | Projects with SPEC.md |
| `/tester` | Run or generate tests against TEST_PLAN.md | Projects with TEST_PLAN.md |
| `/rules-designer` | Generate or update `.claude/rules/project-rules.md` interactively | Any project |
| `/secrets-scan` | Grep-based scan for hardcoded secrets in the repo | Any project |
| `/vuln-scan` | Dependency vulnerability scan (tech-stack auto-detected) | Any project |

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

**Note on `TASK.md`:** `TASK.md` follows a 3-state lifecycle:
1. **At phase start** — `developer` generates `TASK.md` populated with the
   task checklist from `ARCHITECTURE.md`.
2. **During the phase** — `developer` ticks completed checkboxes and updates
   the "Recent Commits" section after each task.
3. **At phase completion** — `developer` resets `TASK.md` to an empty
   placeholder so the next phase starts clean. A fully-ticked `TASK.md`
   committed to `main` is a rule violation (see
   `.claude/rules/document-versioning.md` §"TASK.md Lifecycle"); the phase's
   analysis and outcome belong in `docs/design-notes/<slug>.md` instead.

An empty `TASK.md` at the repository root is the correct idle state, not a
sign of incomplete work.

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

- [README.md](../../../README.md) — Project overview and Quick Start
- [.claude/commands/](../../../.claude/commands/) — Slash command definitions
- [.claude/agents/discovery-flow.md](../../../.claude/agents/discovery-flow.md) — Discovery flow startup procedure
- [.claude/agents/delivery-flow.md](../../../.claude/agents/delivery-flow.md) — Delivery flow startup procedure
