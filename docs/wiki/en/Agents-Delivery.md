# Agents Reference: Delivery Domain

> **Language**: [English](../en/Agents-Delivery.md) | [日本語](../ja/Agents-Delivery.md)
> **Last updated**: 2026-05-15
> **Update history**:
>   - 2026-05-15: Add TASK.md reset responsibility to developer row (#128)
>   - 2026-05-01: Add visual-designer (HAS_UI + Standard/Full only); update ux-designer NEXT (#109)
>   - 2026-04-26: Sync with #72, #74 (issue #77)
>   - 2026-04-25: split from Agents-Reference.md; #42
> **Audience**: Agent developers

This page is one of five pages split from the original Agents-Reference.md (#42). It covers the Delivery domain agents. See the sibling pages for other domains: [Orchestrators & Cross-Cutting](./Agents-Orchestrators.md), [Discovery](./Agents-Discovery.md), [Operations](./Agents-Operations.md), [Maintenance](./Agents-Maintenance.md).

## Table of Contents

- [Delivery Domain](#delivery-domain)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Delivery Domain

The Delivery domain (13 agents) handles design, implementation, testing, and release.

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
- **Responsibility**: Reads SPEC.md and CONCEPT_VALIDATION.md to generate UI_SPEC.md with wireframes, screen flows, and component specs. Visual identity (color, typography, spacing, design system) is delegated to `visual-designer` on Standard/Full; on Minimal/Light, ux-designer applies a lightweight visual default and records it in UI_SPEC.md Section 1. Runs only when HAS_UI: true.
- **Inputs**: SPEC.md, CONCEPT_VALIDATION.md (optional)
- **Outputs**: UI_SPEC.md
- **AGENT_RESULT fields**: `SCREENS`, `COMPONENTS`, `RESPONSIVE`, `ACCESSIBILITY`, `VISUAL_POLICY`
- **NEXT conditions**:
  - Standard / Full plan → `visual-designer`
  - Minimal / Light plan → `architect`

### visual-designer

- **Canonical**: [.claude/agents/visual-designer.md](../../.claude/agents/visual-designer.md)
- **Domain**: Delivery
- **Responsibility**: Reads UI_SPEC.md (and CONCEPT_VALIDATION.md if present) and produces VISUAL_SPEC.md — the canonical visual specification: color palette, typography scale, spacing/radius/shadow tokens, design-token JSON export, component library selection with rationale, WCAG accessibility level, responsive breakpoints, tone & manner, iconography. Runs only when HAS_UI: true AND plan ≥ Standard. Skipped on Minimal/Light (ux-designer's lightweight default applies in that case).
- **Inputs**: UI_SPEC.md, CONCEPT_VALIDATION.md (optional), SPEC.md (for non-functional constraints)
- **Outputs**: VISUAL_SPEC.md
- **AGENT_RESULT fields**: `DESIGN_SYSTEM`, `WCAG_LEVEL`, `DARK_MODE`, `TOKENS_EXPORTED`
- **NEXT conditions**: `architect`

### architect

- **Canonical**: [.claude/agents/architect.md](../../.claude/agents/architect.md)
- **Domain**: Delivery
- **Responsibility**: Reads SPEC.md (and UI_SPEC.md / VISUAL_SPEC.md) to produce ARCHITECTURE.md with tech stack decisions, module design, data models, API design, test strategy, and implementation order.
- **Inputs**: SPEC.md, UI_SPEC.md (if HAS_UI), VISUAL_SPEC.md (if HAS_UI and plan ≥ Standard), DISCOVERY_RESULT.md (if available)
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
- **Responsibility**: Implements code following ARCHITECTURE.md implementation order. Owns branch creation, push, and PR submission per `git-rules.md` `## Branch & PR Strategy`. Manages progress via TASK.md (supports resume). Commits per task, runs lint/format checks after each task. **Resets TASK.md to the empty placeholder at phase completion** per `document-versioning.md` §"TASK.md Lifecycle".
- **Inputs**: SPEC.md, ARCHITECTURE.md, UI_SPEC.md (if HAS_UI), VISUAL_SPEC.md (if HAS_UI and plan ≥ Standard), TASK.md (if resuming), `docs/design-notes/<slug>.md` (if invoked from analyst handoff)
- **Outputs**: Implementation code, TASK.md, working branch, PR
- **AGENT_RESULT fields**: `PHASE`, `TASKS_COMPLETED`, `LAST_COMMIT`, `LINT_CHECK`, `FILES_CHANGED`, `ACCEPTANCE_CHECK`, `BRANCH`, `PR_URL`
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

## Related Pages

- [Agents Reference: Orchestrators & Cross-Cutting](./Agents-Orchestrators.md)
- [Agents Reference: Discovery Domain](./Agents-Discovery.md)
- [Agents Reference: Operations Domain](./Agents-Operations.md)
- [Agents Reference: Maintenance Domain](./Agents-Maintenance.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Triage System](./Triage-System.md)
- [Rules Reference](./Rules-Reference.md)
- [Contributing](./Contributing.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — All agent definition files (authoritative source)
- [.claude/orchestrator-rules.md](../../.claude/orchestrator-rules.md) — Flow orchestrator rules and triage
