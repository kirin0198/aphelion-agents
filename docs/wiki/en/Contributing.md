# Contributing

> **Language**: [English](../en/Contributing.md) | [日本語](../ja/Contributing.md)
> **Last updated**: 2026-04-24
> **Audience**: Agent developers

This page covers how to contribute to Aphelion: adding or modifying agents, updating rules, maintaining the wiki, and running the platform generator. Read this before opening a pull request.

## Table of Contents

- [Contribution Types](#contribution-types)
- [Adding a New Agent](#adding-a-new-agent)
- [Modifying an Existing Agent](#modifying-an-existing-agent)
- [Updating Rules](#updating-rules)
- [Wiki Maintenance](#wiki-maintenance)
- [Bilingual Sync Policy](#bilingual-sync-policy)
- [Regenerating Platform Files](#regenerating-platform-files)
- [Pull Request Checklist](#pull-request-checklist)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Contribution Types

| Type | Changes required |
|------|----------------|
| New agent | `.claude/agents/{name}.md` + Agents-Reference (en+ja) + generate.mjs (if new agent) |
| Modify agent | `.claude/agents/{name}.md` + Agents-Reference entry (en+ja) |
| New rule | `.claude/rules/{name}.md` + Rules-Reference (en+ja) |
| Modify rule | `.claude/rules/{name}.md` + Rules-Reference entry (en+ja) |
| Orchestrator rules change | `.claude/orchestrator-rules.md` + Architecture.md / Triage-System.md (en+ja) |
| New flow (orchestrator) | `.claude/agents/{flow}.md` + `.claude/commands/{flow}.md` + Architecture.md (figures + text) + Triage-System.md (new section) + Agents-Reference.md (new orchestrator + domain section) + Home.md (personas + glossary) + index.mdx (card) + `ORCHESTRATOR_NAMES` in generate.mjs |
| Wiki page update | `wiki/en/{page}.md` + `wiki/ja/{page}.md` (same PR) |
| Platform generator change | `scripts/generate.mjs` + regenerate `platforms/` |

---

## Adding a New Agent

1. **Create the agent definition file** at `.claude/agents/{name}.md`.

   Follow the standard frontmatter format used by existing agents:
   ```
   ---
   name: {agent-name}
   description: |
     {one-line description for orchestrator discovery}
   tools: Read, Write, Edit, Bash, Glob, Grep
   ---
   ```
   Include sections: Mission, Inputs, Workflow, Outputs, AGENT_RESULT (with all fields), NEXT conditions.

2. **Update Agents-Reference** (`wiki/en/Agents-Reference.md` and `wiki/ja/Agents-Reference.md`) with a new entry following the standard schema (Canonical, Domain, Responsibility, Inputs, Outputs, AGENT_RESULT fields, NEXT conditions). Add the entry in the appropriate domain section.

3. **If the agent is invokable as a standalone slash command**, add a corresponding command file in `.claude/commands/{name}.md`.

4. **If the agent is a new flow orchestrator**, update `.claude/orchestrator-rules.md` to include the new agent in the triage or phase sequence.

5. **Regenerate platform files**: Run `node scripts/generate.mjs` to update `platforms/copilot/` and `platforms/codex/`.

6. **Agents-Reference split threshold**: If the total agent count exceeds 40, or any single section in `Agents-Reference.md` exceeds 300 lines, consider splitting into `wiki/en/agents/{name}.md` per-agent files and converting `Agents-Reference.md` into a list + link hub. This is a future decision — open an issue to discuss first.

---

## Modifying an Existing Agent

1. **Edit the canonical file** at `.claude/agents/{name}.md`.

2. **Update the corresponding Agents-Reference entry** in both `wiki/en/Agents-Reference.md` and `wiki/ja/Agents-Reference.md` to reflect the change.

   > Keeping Agents-Reference synchronized is mandatory. If you update an agent definition without updating the wiki entry, reviewers will request a correction.

3. **Regenerate platform files**: Run `node scripts/generate.mjs` to propagate the change to `platforms/copilot/` and `platforms/codex/`.

---

## Updating Rules

1. **Edit the canonical file** at `.claude/rules/{name}.md`.

2. **Update the corresponding Rules-Reference entry** in both `wiki/en/Rules-Reference.md` and `wiki/ja/Rules-Reference.md`.

3. **If the rule change affects orchestrator behavior**, also update `wiki/en/Architecture.md` and `wiki/ja/Architecture.md`.

4. **If the rule affects triage**, also update `wiki/en/Triage-System.md` and `wiki/ja/Triage-System.md`.

5. **If the rule change affects the platform-generated files** (e.g., build-verification-commands or library-and-security-policy), regenerate platform files.

---

## Wiki Maintenance

### Editing existing pages

- Always edit the English page (`wiki/en/`) first — it is the canonical source.
- Update `> Last updated:` at the top of the English page.
- Update the corresponding Japanese page in the same PR. Update `> EN canonical:` to the current date.

### Adding a new page

1. Create `wiki/en/{slug}.md` with the standard frontmatter.
2. Create `wiki/ja/{slug}.md` with `EN canonical: {date} of wiki/en/{slug}.md`.
3. Add both pages to the `## Pages` section in `wiki/en/Home.md` and `wiki/ja/Home.md`.
4. Add `Related Pages` links in pages that are topically related.

### Untranslated page fallback

If you add a new English page but cannot provide a Japanese translation in the same PR, place a stub in `wiki/ja/{slug}.md`:

```markdown
> 本ページは英語版が先行しています。[English version](../en/{slug}.md) を参照してください。
```

Translate within 30 days and link the stub issue to the follow-up PR.

### README vs Wiki separation

- **README**: Entry point and Quick Start. Keep it short — setup, scenarios, command reference.
- **Wiki**: Detailed reference. Agent schemas, rule explanations, platform internals, triage logic.
- Do not add detailed reference content to README. Do not add Quick Start content to the wiki Home.md.

---

## Bilingual Sync Policy

The wiki is bilingual with English as canonical. The following rules are enforced in PR review:

**Mandatory:**
- Every PR that modifies `wiki/en/{page}.md` **must** also update `wiki/ja/{page}.md` in the same PR.
- English-only merges are prohibited (except for minor fixes — see below).
- The `> EN canonical: {date}` line in every `wiki/ja/` page must be updated to match the current date when the English page changes.

**Minor fix exception:**
- Typo fixes and broken link corrections in English-only may be merged without same-PR Japanese sync.
- A follow-up issue must be opened and assigned for the Japanese update within 7 days.

**Reviewer responsibility:**
- Reviewers check that `wiki/en/` and `wiki/ja/` structural parity is maintained (same sections, same headings, matching TOC).

---

## Regenerating Platform Files

Whenever you modify files in `.claude/agents/`, `.claude/rules/`, or `.claude/orchestrator-rules.md`, regenerate the platform files:

```bash
node scripts/generate.mjs
```

Stage the generated files alongside your canonical changes:

```bash
git add .claude/agents/{name}.md platforms/copilot/agents/{name}.agent.md
git add platforms/codex/AGENTS.md
```

> **Never edit `platforms/` files directly.** They are generated artifacts. Direct edits will be overwritten the next time the generator runs.

---

## Pull Request Checklist

Before opening a PR, verify:

- [ ] Canonical source (`.claude/agents/` or `.claude/rules/`) updated
- [ ] `wiki/en/` page updated (if the change affects wiki content)
- [ ] `wiki/ja/` page updated in the same PR (bilingual sync)
- [ ] `> Last updated:` line updated in modified wiki pages
- [ ] `> EN canonical:` line updated in corresponding `wiki/ja/` pages
- [ ] Agents-Reference or Rules-Reference entry updated (if agent/rule changed)
- [ ] Platform files regenerated (`node scripts/generate.mjs`) if canonical changed
- [ ] Generated `platforms/` files staged alongside canonical changes
- [ ] If a new flow / orchestrator is added, update all 4 integration points: Architecture.md figures, Triage-System.md sections, Agents-Reference.md domain section, Home.md persona entries

---

## Related Pages

- [Architecture](./Architecture.md)
- [Agents Reference](./Agents-Reference.md)
- [Rules Reference](./Rules-Reference.md)
- [Platform Guide](./Platform-Guide.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — Agent definition files (canonical)
- [.claude/rules/](../../.claude/rules/) — Rule files (canonical)
- [scripts/generate.mjs](../../scripts/generate.mjs) — Platform file generator
- [wiki/DESIGN.md](../DESIGN.md) — Wiki information architecture design
