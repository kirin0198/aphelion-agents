# Language Rules

> Last updated: 2026-04-29
> Update history:
>   - 2026-04-29: Add "Hand-authored canonical narrative" section governing
>     `docs/wiki/`, `docs/design-notes/`, and `README.md` / `README.ja.md` (#75)

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
- **Template skeleton strings** (markdown headings, metadata blocks such as `> Last updated:` /
  `> Update history:`, task-list scaffolding such as `## Task list` / `## Recent commits`):
  **English-fixed**, regardless of Output Language. Free-form narrative content written
  inside the generated document is produced in the resolved Output Language.

## Hand-authored canonical narrative (this repo)

This section governs Aphelion's *own* hand-authored documents. Template
skeleton rules above apply to *agent-emitted* templates; the rules below apply
to documents committed directly by maintainers.

Per-directory canonical-language declaration:

- **`docs/wiki/{en,ja}/*.md`** — bilingual; English is canonical, Japanese
  must track in the same PR. Enforced by `wiki/en/Contributing.md`
  Bilingual Sync Policy. Skeleton headings and frontmatter fields
  (`## Related Pages`, `## Canonical Sources`, `> Last updated:`,
  `> EN canonical:`, …) are **English-fixed in both language files**, the
  same rule as agent-emitted template skeletons. Only the narrative body is
  localised.
- **`docs/design-notes/<slug>.md`** and
  **`docs/design-notes/archived/<slug>.md`** — single-file; canonical
  language matches `project-rules.md` → `Output Language` (default `en`,
  currently `ja` for this repo). No bilingual sync expected. Historical
  notes that predate this declaration may use a different language; do not
  retro-translate them.
- **`README.md` / `README.ja.md`** — bilingual at the repository root with
  English canonical, governed by the repo-root README sync convention (not
  by Contributing.md's wiki bilingual policy).

Out of scope for this section:

- `CHANGELOG.md` — English (release-notes convention).
- `Home.md` persona/glossary blocks that intentionally retain English
  proper nouns (Flow Orchestrator names, etc.). Treat as narrative
  containing English terms, not as a skeleton.
