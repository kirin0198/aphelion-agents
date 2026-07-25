# TASK.md

> Source: docs/design-notes/approval-mode-escalation-wiring.md (2026-07-25, §7.2/§8.1)

## Phase: approval-mode escalation wiring fix (#166 / #178 / #179 / #180)
Last updated: 2026-07-25
Status: In progress

## Task List

### Phase 1 (canonical, sequential)
- [x] TASK-001 (T-01): ESCALATION_REQUIRED per-agent trigger table + non-duplication rule; HANDOFF_PAYLOAD 13→14 fields | Target file: src/.claude/rules/agent-communication-protocol.md
- [x] TASK-002 (T-02): Triage-Linked Default table maintenance mapping; mandatory-checkpoint 3-mode table; two-stage APPROVAL_MODE resolution | Target file: .claude/orchestrator-rules.md
- [x] TASK-003 (T-03): In-agent approval gates (G1/G2/G3) section; invariant exception for change-classifier; Phase Execution Loop step 2 propagation | Target file: .claude/orchestrator-rules.md

### Phase 2 (parallel, depends on Phase 1)
- [x] TASK-004 (T-04): ESCALATION_REQUIRED emit triggers | Target files: .claude/agents/{developer,architect,security-auditor,tester,reviewer}.md
- [x] TASK-005 (T-05): fix mandatory HITL gate description; remove local APPROVAL_MODE mapping | Target file: .claude/agents/maintenance-flow.md
- [x] TASK-006 (T-06): two-stage APPROVAL_MODE resolution wording | Target files: .claude/agents/{discovery,delivery,operations,doc}-flow.md
- [x] TASK-007 (T-07): G1 gate three-tier priority + invariant exception + default option | Target files: .claude/agents/{change-classifier,impact-analyzer,analyst-core,codebase-analyzer,scope-planner}.md
- [ ] TASK-008 (T-08): HANDOFF_PAYLOAD approval_mode field (13→14) | Target files: .claude/agents/{analyst-intake,analyst-core}.md
- [ ] TASK-009 (T-09): project-rules template `## Approval Mode` section | Target file: .claude/agents/rules-designer.md

## Recent Commits
(updated after each task)

## Session Interruption Notes
(none yet)
