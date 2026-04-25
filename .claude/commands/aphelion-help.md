Show the list of Aphelion slash commands available in this session.

Aphelion ships the slash commands below under `.claude/commands/`. Claude Code
built-ins (`/init`, `/help`, `/clear`, `/agents`, etc.) are not Aphelion's
responsibility and are not listed here — run `/help` for those.

## Orchestrators (full domain flows)

| Command | Purpose |
|---------|---------|
| `/discovery-flow` | Requirements exploration: interview → research → PoC → rules → scope |
| `/delivery-flow` | Design & implementation: spec → ux → architect → … → releaser |
| `/operations-flow` | Deploy & operate (service only): infra → db-ops → observability → ops-planner |
| `/maintenance-flow` | Existing-project changes: Patch / Minor / Major triage and execution |

## Shortcuts

| Command | Purpose |
|---------|---------|
| `/pm` | Quick Delivery launch when requirements are already clear (skips Discovery) |
| `/aphelion-init` | First-run project rules setup (launches `rules-designer`) |
| `/issue-new` | Structured intake gate — collect issue details (§1–§4) and create planning doc + GitHub issue (run `/analyst` next for §5–§8) |

## Standalone agents

| Command | Purpose |
|---------|---------|
| `/analyst` | Classify and analyze an issue (bug / feature / refactor) on an existing project |
| `/codebase-analyzer` | Reverse-engineer SPEC.md / ARCHITECTURE.md from an existing codebase |
| `/rules-designer` | Generate or update `.claude/rules/project-rules.md` interactively |
| `/reviewer` | Code review against SPEC.md and ARCHITECTURE.md |
| `/tester` | Run or generate tests against TEST_PLAN.md |

## Safety helpers

| Command | Purpose |
|---------|---------|
| `/secrets-scan` | Grep-based scan for hardcoded secrets in the repo |
| `/vuln-scan` | Dependency vulnerability scan (tech-stack auto-detected) |

## Discoverability

| Command | Purpose |
|---------|---------|
| `/aphelion-help` | Show this list |

For details on any command, open `.claude/commands/<name>.md`. Agent definitions
live under `.claude/agents/` and rules under `.claude/rules/`.
