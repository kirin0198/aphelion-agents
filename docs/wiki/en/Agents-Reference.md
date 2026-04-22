# Agents Reference

> **Language**: [English](../en/Agents-Reference.md) | [日本語](../ja/Agents-Reference.md)
> **Last updated**: 2026-04-18
> **Audience**: Agent developers

This page provides a compact reference for all 27 Aphelion agents plus the 4 flow orchestrators. Each entry follows a standard schema: canonical file link, domain, responsibility, inputs, outputs, AGENT_RESULT fields, and NEXT conditions.

For full details on any agent, follow the **Canonical** link to the source file in `.claude/agents/`.

## Table of Contents

- [Flow Orchestrators](#flow-orchestrators)
- [Discovery Domain (6 agents)](#discovery-domain)
- [Delivery Domain (12 agents)](#delivery-domain)
- [Operations Domain (4 agents)](#operations-domain)
- [Safety Agents (1 agent)](#safety-agents)
- [Standalone Agents (2 agents)](#standalone-agents)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Flow Orchestrators

Flow orchestrators manage entire domains. They are not triage-selected agents but session entry points.

### discovery-flow

- **Canonical**: [.claude/agents/discovery-flow.md](../../.claude/agents/discovery-flow.md)
- **Domain**: Orchestrator (Discovery)
- **Responsibility**: Manages the entire requirements exploration flow. Performs triage, launches agents in sequence, handles approvals and rollbacks, generates DISCOVERY_RESULT.md.
- **Inputs**: User's project description (via command argument)
- **Outputs**: DISCOVERY_RESULT.md (final handoff), INTERVIEW_RESULT.md, RESEARCH_RESULT.md, POC_RESULT.md, CONCEPT_VALIDATION.md, SCOPE_PLAN.md
- **AGENT_RESULT fields**: N/A (orchestrators do not emit AGENT_RESULT; they produce handoff files)
- **NEXT conditions**: Prompts user to run `/delivery-flow` after completion

### delivery-flow

- **Canonical**: [.claude/agents/delivery-flow.md](../../.claude/agents/delivery-flow.md)
- **Domain**: Orchestrator (Delivery)
- **Responsibility**: Manages the entire design, implementation, testing, and review flow. Reads DISCOVERY_RESULT.md, performs triage, handles rollbacks on test/review failures, generates DELIVERY_RESULT.md.
- **Inputs**: DISCOVERY_RESULT.md (optional), existing SPEC.md / ARCHITECTURE.md
- **Outputs**: DELIVERY_RESULT.md (final handoff), SPEC.md, ARCHITECTURE.md, implementation code, TEST_PLAN.md, SECURITY_AUDIT.md, README.md
- **AGENT_RESULT fields**: N/A
- **NEXT conditions**: Prompts user to run `/operations-flow` (if service) after completion

### operations-flow

- **Canonical**: [.claude/agents/operations-flow.md](../../.claude/agents/operations-flow.md)
- **Domain**: Orchestrator (Operations)
- **Responsibility**: Manages the deploy and operations flow. Only for PRODUCT_TYPE: service. Reads DELIVERY_RESULT.md, performs triage, generates OPS_RESULT.md.
- **Inputs**: DELIVERY_RESULT.md (required), ARCHITECTURE.md, SPEC.md
- **Outputs**: OPS_RESULT.md, Dockerfile, docker-compose.yml, CI/CD pipeline, DB_OPS.md, OBSERVABILITY.md, OPS_PLAN.md
- **AGENT_RESULT fields**: N/A
- **NEXT conditions**: Flow complete (user handles deployment)

---

## Discovery Domain

The Discovery domain (6 agents) handles requirements exploration.

### interviewer

- **Canonical**: [.claude/agents/interviewer.md](../../.claude/agents/interviewer.md)
- **Domain**: Discovery
- **Responsibility**: Conducts requirements interviews, discovers implicit requirements, determines PRODUCT_TYPE and HAS_UI, generates INTERVIEW_RESULT.md. Runs on all Discovery plans.
- **Inputs**: User's project description (from discovery-flow)
- **Outputs**: INTERVIEW_RESULT.md
- **AGENT_RESULT fields**: `PRODUCT_TYPE`, `HAS_UI`, `REQUIREMENTS_COUNT`, `IMPLICIT_REQUIREMENTS`
- **NEXT conditions**:
  - Minimal plan → `done`
  - Light plan → `scope-planner` (skips scope-planner in light — actually `rules-designer`)
  - Standard / Full plan → `researcher`
  - Rollback from poc-engineer → re-interview infeasible requirements

### researcher

- **Canonical**: [.claude/agents/researcher.md](../../.claude/agents/researcher.md)
- **Domain**: Discovery
- **Responsibility**: Researches domain knowledge, competitors, external APIs, and technical risks. Defines ubiquitous language. Runs on Standard and Full plans.
- **Inputs**: INTERVIEW_RESULT.md
- **Outputs**: RESEARCH_RESULT.md
- **AGENT_RESULT fields**: `RISKS_FOUND`, `EXTERNAL_DEPS`, `COMPETITORS_ANALYZED`, `UBIQUITOUS_TERMS`
- **NEXT conditions**:
  - Standard / Full plan → `poc-engineer`
  - Rolled back from scope-planner → `scope-planner`

### poc-engineer

- **Canonical**: [.claude/agents/poc-engineer.md](../../.claude/agents/poc-engineer.md)
- **Domain**: Discovery
- **Responsibility**: Validates technical feasibility with minimal PoC code. Identifies infeasible requirements and proposes alternatives. Runs on Standard and Full plans.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md
- **Outputs**: POC_RESULT.md, code under `poc/` directory
- **AGENT_RESULT fields**: `VERIFIED`, `BLOCKED_ITEMS`, `TECH_RECOMMENDATION`
- **NEXT conditions**:
  - No infeasible requirements, Full plan + HAS_UI → `concept-validator`
  - No infeasible requirements, otherwise → `rules-designer`
  - Infeasible requirements found → `interviewer` (rollback, STATUS: blocked)

### concept-validator

- **Canonical**: [.claude/agents/concept-validator.md](../../.claude/agents/concept-validator.md)
- **Domain**: Discovery
- **Responsibility**: Validates UI/UX concept through wireframes and user flow diagrams. Runs only on Full plan when HAS_UI: true.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md (optional), POC_RESULT.md (optional)
- **Outputs**: CONCEPT_VALIDATION.md
- **AGENT_RESULT fields**: `SCREENS`, `UX_ISSUES`, `IMPROVEMENTS`
- **NEXT conditions**: `scope-planner`

### rules-designer

- **Canonical**: [.claude/agents/rules-designer.md](../../.claude/agents/rules-designer.md)
- **Domain**: Discovery
- **Responsibility**: Interactively determines project-specific coding conventions, Git workflow, and build commands. Generates `.claude/rules/project-rules.md`. Runs on Light and above.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md (optional), POC_RESULT.md (optional)
- **Outputs**: `.claude/rules/project-rules.md`
- **AGENT_RESULT fields**: `LANGUAGE`, `FRAMEWORK`, `COMMIT_STYLE`, `BRANCH_STRATEGY`
- **NEXT conditions**: `scope-planner`

### scope-planner

- **Canonical**: [.claude/agents/scope-planner.md](../../.claude/agents/scope-planner.md)
- **Domain**: Discovery
- **Responsibility**: Defines MVP, prioritizes requirements with MoSCoW, assesses risks and costs, determines handoff readiness, and generates DISCOVERY_RESULT.md. Runs on Light and above.
- **Inputs**: INTERVIEW_RESULT.md, RESEARCH_RESULT.md, POC_RESULT.md, CONCEPT_VALIDATION.md (as available)
- **Outputs**: SCOPE_PLAN.md, DISCOVERY_RESULT.md
- **AGENT_RESULT fields**: `MVP_SCOPE`, `MUST_COUNT`, `SHOULD_COUNT`, `RISKS`, `HANDOFF_READY`
- **NEXT conditions**:
  - HANDOFF_READY: true → `done`
  - HANDOFF_READY: false → `researcher` (rollback, STATUS: blocked)

---

## Delivery Domain

The Delivery domain (12 agents) handles design, implementation, testing, and release.

### spec-designer

- **Canonical**: [.claude/agents/spec-designer.md](../../.claude/agents/spec-designer.md)
- **Domain**: Delivery
- **Responsibility**: Transforms requirements from DISCOVERY_RESULT.md into a structured SPEC.md. Selects recommended tech stack. Determines HAS_UI and PRODUCT_TYPE.
- **Inputs**: DISCOVERY_RESULT.md (optional), user requirements (if no Discovery)
- **Outputs**: SPEC.md
- **AGENT_RESULT fields**: `HAS_UI`, `PRODUCT_TYPE`, `TBD_COUNT`
- **NEXT conditions**:
  - HAS_UI: true → `ux-designer`
  - HAS_UI: false → `architect`

### ux-designer

- **Canonical**: [.claude/agents/ux-designer.md](../../.claude/agents/ux-designer.md)
- **Domain**: Delivery
- **Responsibility**: Reads SPEC.md and CONCEPT_VALIDATION.md to generate UI_SPEC.md with wireframes, screen flows, and component specs. Runs only when HAS_UI: true.
- **Inputs**: SPEC.md, CONCEPT_VALIDATION.md (optional)
- **Outputs**: UI_SPEC.md
- **AGENT_RESULT fields**: `SCREENS`, `COMPONENTS`, `RESPONSIVE`, `ACCESSIBILITY`
- **NEXT conditions**: `architect`

### architect

- **Canonical**: [.claude/agents/architect.md](../../.claude/agents/architect.md)
- **Domain**: Delivery
- **Responsibility**: Reads SPEC.md (and UI_SPEC.md) to produce ARCHITECTURE.md with tech stack decisions, module design, data models, API design, test strategy, and implementation order.
- **Inputs**: SPEC.md, UI_SPEC.md (if HAS_UI), DISCOVERY_RESULT.md (if available)
- **Outputs**: ARCHITECTURE.md
- **AGENT_RESULT fields**: `TECH_STACK`, `TECH_STACK_CHANGED`, `PHASES`
- **NEXT conditions**:
  - Standard / Full plan → `scaffolder`
  - Minimal / Light plan → `developer`

### scaffolder

- **Canonical**: [.claude/agents/scaffolder.md](../../.claude/agents/scaffolder.md)
- **Domain**: Delivery
- **Responsibility**: Initializes the project structure from ARCHITECTURE.md: creates directories, installs dependencies, places config files, creates an entry point, and verifies the build. Runs on Standard and above.
- **Inputs**: SPEC.md, ARCHITECTURE.md
- **Outputs**: Project scaffold (directories, pyproject.toml / package.json, .env.example, .gitignore, entry point)
- **AGENT_RESULT fields**: `TECH_STACK`, `DIRECTORIES_CREATED`, `PACKAGES_INSTALLED`, `BUILD_CHECK`
- **NEXT conditions**: `developer`

### developer

- **Canonical**: [.claude/agents/developer.md](../../.claude/agents/developer.md)
- **Domain**: Delivery
- **Responsibility**: Implements code following ARCHITECTURE.md implementation order. Manages progress via TASK.md (supports resume). Commits per task, runs lint/format checks after each task.
- **Inputs**: SPEC.md, ARCHITECTURE.md, UI_SPEC.md (if HAS_UI), TASK.md (if resuming)
- **Outputs**: Implementation code, TASK.md
- **AGENT_RESULT fields**: `PHASE`, `TASKS_COMPLETED`, `LAST_COMMIT`, `LINT_CHECK`, `FILES_CHANGED`, `ACCEPTANCE_CHECK`
- **NEXT conditions**:
  - Normal completion → `test-designer`
  - Session interrupted → `suspended`
  - Design ambiguity → `blocked` (BLOCKED_TARGET: architect)

### test-designer

- **Canonical**: [.claude/agents/test-designer.md](../../.claude/agents/test-designer.md)
- **Domain**: Delivery
- **Responsibility**: Creates TEST_PLAN.md with test cases covering all UC acceptance criteria. Also performs root cause analysis on test failures (rollback mode). Does not write test code.
- **Inputs**: SPEC.md, ARCHITECTURE.md, implementation code
- **Outputs**: TEST_PLAN.md
- **AGENT_RESULT fields**: `TOTAL_CASES`, `UC_COVERAGE`, `HAS_UI`
- **NEXT conditions**:
  - HAS_UI: true → `e2e-test-designer`
  - HAS_UI: false → `tester`
  - Rollback mode → `developer` (implementation bug) or `tester` (test code bug)

### e2e-test-designer

- **Canonical**: [.claude/agents/e2e-test-designer.md](../../.claude/agents/e2e-test-designer.md)
- **Domain**: Delivery
- **Responsibility**: Appends E2E and GUI test cases to TEST_PLAN.md. Selects E2E tool (Playwright, pywinauto, pyautogui) based on project type. Runs only when HAS_UI: true.
- **Inputs**: SPEC.md, ARCHITECTURE.md, UI_SPEC.md, TEST_PLAN.md, implementation code
- **Outputs**: TEST_PLAN.md (E2E section appended)
- **AGENT_RESULT fields**: `E2E_TOOL`, `TOTAL_E2E_CASES`, `SCREEN_COVERAGE`
- **NEXT conditions**: `tester`

### tester

- **Canonical**: [.claude/agents/tester.md](../../.claude/agents/tester.md)
- **Domain**: Delivery
- **Responsibility**: Creates test code from TEST_PLAN.md and executes it. Reports results including per-test-case pass/fail status. In Minimal plan, also handles test design.
- **Inputs**: TEST_PLAN.md, ARCHITECTURE.md, implementation code
- **Outputs**: Test code files (tests/), test execution results
- **AGENT_RESULT fields**: `TOTAL`, `PASSED`, `FAILED`, `SKIPPED`, `FAILED_TESTS`
- **NEXT conditions**:
  - All pass → `reviewer`
  - Any failure → `test-designer` (root cause analysis)

### reviewer

- **Canonical**: [.claude/agents/reviewer.md](../../.claude/agents/reviewer.md)
- **Domain**: Delivery
- **Responsibility**: Reviews code across 5 perspectives: spec compliance, design consistency, code quality, test quality, API contracts. Does not modify code. Runs on Light and above.
- **Inputs**: SPEC.md, ARCHITECTURE.md, implementation code, test results
- **Outputs**: Review report (text output, no separate file)
- **AGENT_RESULT fields**: `CRITICAL_COUNT`, `WARNING_COUNT`, `SUGGESTION_COUNT`, `CRITICAL_ITEMS`
- **NEXT conditions**:
  - No CRITICAL → `done` (STATUS: approved or conditional)
  - CRITICAL found → `developer` (STATUS: rejected)

### security-auditor

- **Canonical**: [.claude/agents/security-auditor.md](../../.claude/agents/security-auditor.md)
- **Domain**: Delivery
- **Responsibility**: Audits implementation for OWASP Top 10, dependency vulnerabilities, auth/authorization gaps, hardcoded secrets, input validation, and CWE items. **Mandatory on all plans.**
- **Inputs**: SPEC.md, ARCHITECTURE.md, implementation code, dependency files
- **Outputs**: SECURITY_AUDIT.md
- **AGENT_RESULT fields**: `CRITICAL_COUNT`, `WARNING_COUNT`, `INFO_COUNT`, `CRITICAL_ITEMS`, `DEPENDENCY_VULNS`
- **NEXT conditions**:
  - No CRITICAL → `done`
  - CRITICAL found → `developer`

### doc-writer

- **Canonical**: [.claude/agents/doc-writer.md](../../.claude/agents/doc-writer.md)
- **Domain**: Delivery
- **Responsibility**: Generates README.md, CHANGELOG.md, and API documentation from SPEC.md, ARCHITECTURE.md, and git log. Runs on Standard and above.
- **Inputs**: SPEC.md, ARCHITECTURE.md, implementation code, git log
- **Outputs**: README.md, CHANGELOG.md
- **AGENT_RESULT fields**: `DOCS_COUNT`
- **NEXT conditions**:
  - Full plan → `releaser`
  - Standard plan → `done`

### releaser

- **Canonical**: [.claude/agents/releaser.md](../../.claude/agents/releaser.md)
- **Domain**: Delivery
- **Responsibility**: Assigns SemVer version, updates CHANGELOG.md, generates RELEASE_NOTES.md, updates version files, creates a git tag, and optionally creates a GitHub Release draft. Runs on Full plan only.
- **Inputs**: SPEC.md, CHANGELOG.md, git tags, test/review/security results
- **Outputs**: RELEASE_NOTES.md, CHANGELOG.md (updated), version files, git tag
- **AGENT_RESULT fields**: `VERSION`, `TAG`, `PACKAGE_BUILT`, `GH_RELEASE_DRAFT`
- **NEXT conditions**: `done`

---

## Operations Domain

The Operations domain (4 agents) handles deployment infrastructure and operations planning. Only runs for PRODUCT_TYPE: service.

### infra-builder

- **Canonical**: [.claude/agents/infra-builder.md](../../.claude/agents/infra-builder.md)
- **Domain**: Operations
- **Responsibility**: Generates Dockerfile (multi-stage), docker-compose.yml, GitHub Actions CI/CD, .env.example, security headers, and **sandbox infrastructure** (`.devcontainer/devcontainer.json` and `docker-compose.dev.yml` for container-isolated execution). Runs on all Operations plans.
- **Inputs**: DELIVERY_RESULT.md, ARCHITECTURE.md, implementation code
- **Outputs**: Dockerfile, .dockerignore, docker-compose.yml, docker-compose.override.yml, .github/workflows/ci.yml, .env.example, `.devcontainer/devcontainer.json` (Light+), `docker-compose.dev.yml` (Light+, when project uses Compose)
- **AGENT_RESULT fields**: `FILES_CREATED`, `DOCKER_BUILD`, `SECURITY_HEADERS`, `DEVCONTAINER_GENERATED`, `DEV_COMPOSE_GENERATED`, `SANDBOX_INFRA_PATH`
- **Sandbox infra generation policy**: Minimal → skip; Light → generate (optional launch); Standard → generate + mandatory launch; Full → generate + mandatory launch + audit log
- **Directory separation**: Production infra (`Dockerfile`, `docker-compose.yml`) must never reference sandbox infra (`.devcontainer/`, `docker-compose.dev.yml`). Sandbox infra referencing production is not recommended.
- **NEXT conditions**:
  - Standard / Full plan → `db-ops`
  - Light plan → `ops-planner`

### db-ops

- **Canonical**: [.claude/agents/db-ops.md](../../.claude/agents/db-ops.md)
- **Domain**: Operations
- **Responsibility**: Defines production DB configuration, migration procedures (with rollback), destructive change risk assessment, backup/restore procedures, and monitoring thresholds. Runs on Standard and Full plans.
- **Inputs**: ARCHITECTURE.md (data model, tech stack), migration files
- **Outputs**: DB_OPS.md
- **AGENT_RESULT fields**: `MIGRATIONS`, `DESTRUCTIVE_CHANGES`, `DB_TYPE`, `BACKUP_STRATEGY`
- **NEXT conditions**:
  - Full plan → `observability`
  - Standard plan → `ops-planner`

### observability

- **Canonical**: [.claude/agents/observability.md](../../.claude/agents/observability.md)
- **Domain**: Operations
- **Responsibility**: Designs and implements health checks, structured logging, RED metrics, alert rules, and performance baselines. Runs on Full plan only.
- **Inputs**: ARCHITECTURE.md, DELIVERY_RESULT.md, implementation code
- **Outputs**: OBSERVABILITY.md, health check implementation code
- **AGENT_RESULT fields**: `HEALTH_CHECKS`, `ALERT_RULES`, `METRICS`
- **NEXT conditions**: `ops-planner`

### ops-planner

- **Canonical**: [.claude/agents/ops-planner.md](../../.claude/agents/ops-planner.md)
- **Domain**: Operations
- **Responsibility**: Creates deploy procedures (with rollback points), rollback trigger conditions, incident response playbooks (P1-P4 severity), and maintenance checklists. Generates OPS_RESULT.md.
- **Inputs**: ARCHITECTURE.md, DELIVERY_RESULT.md, infra-builder/db-ops/observability artifacts
- **Outputs**: OPS_PLAN.md, OPS_RESULT.md
- **AGENT_RESULT fields**: `DEPLOY_READY`, `RUNBOOKS`, `MAINTENANCE_ITEMS`
- **NEXT conditions**: `done`

---

## Safety Agents

These agents enforce safety policies across other agents. They may be invoked automatically by orchestrators or explicitly delegated from any Bash-owning agent.

### sandbox-runner

- **Canonical**: [.claude/agents/sandbox-runner.md](../../.claude/agents/sandbox-runner.md)
- **Domain**: Safety (cross-cutting)
- **Responsibility**: Executes high-risk commands using the strongest available isolation. First attempts `container` mode (devcontainer + Docker); falls back to platform permission controls if unavailable. Re-classifies commands against `sandbox-policy.md` and returns a complete audit trail including fallback reason.
- **Inputs**: `command`, `working_directory`, `timeout_sec`, `risk_hint`, `allow_network`, `allow_write_paths`, `dry_run`, `reason`, `caller_agent`
- **Outputs**: `stdout`, `stderr`, `exit_code`, `sandbox_mode`, `detected_risks`, `decision`, `fallback_reason`, `notes`
- **Execution path selection** (Step 2 of workflow):
  1. Check for `.devcontainer/devcontainer.json` in the repository
  2. Run `docker info` with 5-second timeout
  3. Both OK → `container` mode (mount working directory only; `--network=none` by default; no host env vars)
  4. Either fails → fallback to `platform_permission` with `FALLBACK_REASON` recorded
- **AGENT_RESULT fields**: `STATUS`, `SANDBOX_MODE`, `EXIT_CODE`, `DETECTED_RISKS`, `DECISION`, `CALLER`, `DURATION_MS`, `FALLBACK_REASON` (omitted when container mode succeeds)
- **NEXT conditions**:
  - Called by another agent → returns to caller agent
  - Invoked standalone → `done`
  - Session interrupted → `suspended`

---

## Standalone Agents

These two agents operate outside the triage system, invoked directly by the user.

### analyst

- **Canonical**: [.claude/agents/analyst.md](../../.claude/agents/analyst.md)
- **Domain**: Standalone
- **Responsibility**: Receives bug reports, feature requests, or refactoring issues for existing projects. Classifies the issue, determines approach, updates SPEC.md / UI_SPEC.md incrementally, creates a GitHub issue, and hands off to architect.
- **Inputs**: User's issue description, existing SPEC.md, ARCHITECTURE.md, UI_SPEC.md
- **Outputs**: Updated SPEC.md / UI_SPEC.md (incremental), GitHub issue (via gh CLI), PR
- **AGENT_RESULT fields**: `ISSUE_TYPE`, `ISSUE_SUMMARY`, `BRANCH`, `DOCS_UPDATED`, `GITHUB_ISSUE`, `PR_URL`, `ARCHITECT_BRIEF`
- **NEXT conditions**: `architect` (delivery-flow joins from Phase 3)

### codebase-analyzer

- **Canonical**: [.claude/agents/codebase-analyzer.md](../../.claude/agents/codebase-analyzer.md)
- **Domain**: Standalone
- **Responsibility**: Reverse-engineers SPEC.md and ARCHITECTURE.md from an existing codebase that lacks documentation. Enables the project to join the standard Aphelion workflow via analyst → delivery-flow.
- **Inputs**: Existing codebase (source files in working directory)
- **Outputs**: SPEC.md, ARCHITECTURE.md (reverse-engineered)
- **AGENT_RESULT fields**: `HAS_UI`, `PRODUCT_TYPE`, `LANGUAGE`, `FRAMEWORK`, `UC_COUNT`, `ENTITY_COUNT`, `TBD_COUNT`
- **NEXT conditions**: `done` (user then runs `/analyst` or `/delivery-flow`)

---

## Related Pages

- [Architecture](./Architecture.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — All 27 agent definition files (authoritative source)
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow orchestrator rules and triage
