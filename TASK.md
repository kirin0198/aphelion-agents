# TASK.md

> Source: docs/design-notes/aphelion-output-docs-default-location-design.md (2026-05-11)

## Phase: PR-B agent bulk update — document-locations reference in all agents
Last updated: 2026-05-11
Status: In progress

## Task List

### Phase A (PR-A: foundation) — COMPLETED
- [x] TASK-001: Create src/.claude/rules/document-locations.md (new rule) | Target file: src/.claude/rules/document-locations.md
- [x] TASK-002: Update src/.claude/rules/agent-communication-protocol.md (ARTIFACT_PATHS as first-class field) | Target file: src/.claude/rules/agent-communication-protocol.md
- [x] TASK-003: Update src/.claude/rules/aphelion-overview.md (rules count 13→14, add document-locations entry) | Target file: src/.claude/rules/aphelion-overview.md
- [x] TASK-004: Update src/.claude/rules/file-operation-principles.md (add reference to document-locations.md) | Target file: src/.claude/rules/file-operation-principles.md
- [x] TASK-005: Update src/.claude/rules/document-versioning.md (update example filenames with docs/ notation) | Target file: src/.claude/rules/document-versioning.md
- [x] TASK-006: Update .claude/orchestrator-rules.md (Glob 1-pass pattern at startup + ARTIFACT_PATHS carry MUST) | Target file: .claude/orchestrator-rules.md

### Phase B (PR-B: agent bulk update)
- [x] TASK-B01: Add document-locations reference to Delivery Flow agents + Output File headings + delivery-flow Glob pattern | Target: .claude/agents/{spec-designer,architect,ux-designer,visual-designer,developer,scaffolder,reviewer,tester,test-designer,e2e-test-designer,security-auditor,doc-writer,delivery-flow}.md
- [x] TASK-B02: Add document-locations reference to Maintenance Flow agents | Target: .claude/agents/{change-classifier,impact-analyzer,analyst,maintenance-flow}.md
- [x] TASK-B03: Add document-locations reference to Doc Flow agents + fix user-manual-author hardcoded Read | Target: .claude/agents/{hld-author,lld-author,api-reference-author,ops-manual-author,user-manual-author,handover-author,doc-reviewer,doc-flow}.md
- [x] TASK-B04: Add document-locations reference to Discovery Flow agents | Target: .claude/agents/{interviewer,researcher,poc-engineer,concept-validator,scope-planner,discovery-flow}.md
- [x] TASK-B05: Add document-locations reference to Operations Flow agents | Target: .claude/agents/{infra-builder,db-ops,observability,ops-planner,operations-flow}.md
- [x] TASK-B06: Add document-locations reference to cross-cutting agents + Output File headings | Target: .claude/agents/{codebase-analyzer,rules-designer,sandbox-runner,releaser}.md
- [x] TASK-B07: Static grep verification | 0 hardcoded hits, 40/40 agents with reference

## Recent Commits
- refactor: add document-locations reference to Delivery Flow agents (PR-B of #117)
- refactor: add document-locations reference to Maintenance Flow agents (PR-B of #117)
- refactor: add document-locations reference to Doc Flow agents (PR-B of #117)
- refactor: add document-locations reference to Discovery Flow agents (PR-B of #117)
- refactor: add document-locations reference to Operations Flow agents (PR-B of #117)
- refactor: add document-locations reference to cross-cutting agents (PR-B of #117)

## Session Interruption Notes
PR-A fully completed. Starting PR-B agent bulk update on feature/issue-117-pr-b-agent-bulk-update branch.
