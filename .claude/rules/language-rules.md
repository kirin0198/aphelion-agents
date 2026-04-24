# Language Rules

## Invariants (not configurable)

- Code, variable names, function names: **English**
- Commit messages: **English** (git convention)
- Agent definition files (this `.claude/agents/*.md`): **English**
- AGENT_RESULT block keys and values: **English** (machine-readable)

## Configurable via project-rules.md

- **Output Language** — language used for user-facing output.
  Controls: AskUserQuestion content, approval gate text, progress displays,
  agent reports to the user, code comments, user-facing documentation.

  - Source: `.claude/rules/project-rules.md` → `## Localization` → `Output Language: {en|ja}`
  - Default when project-rules.md is absent or key is missing: **en**
  - Fallback when primary language dictionary entry is missing: value of `Fallback Language` (default: `en`)

## Resolution Order

1. `.claude/rules/project-rules.md` → `## Localization` → `Output Language`
2. Default: `en`

Agents must resolve the language *at invocation time* by reading project-rules.md.
Do not cache across sessions.

## Hybrid Localization Strategy

- **Fixed UI strings** (approval gate headings, AskUserQuestion boilerplate,
  "Phase N 完了" style section headers): managed via a static dictionary
  (defined in `.claude/rules/localization-dictionary.md`).
- **Free-form narrative** (analysis summaries, explanations, error descriptions):
  the agent generates text directly in the resolved Output Language via prompt instruction.
