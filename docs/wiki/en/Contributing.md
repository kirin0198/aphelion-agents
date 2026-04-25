# Contributing

> **Language**: [English](../en/Contributing.md) | [日本語](../ja/Contributing.md)
> **Last updated**: 2026-04-25 (updated 2026-04-25: /aphelion-init and /aphelion-help commands, #39)
> **Audience**: Agent developers

This page covers how to contribute to Aphelion: adding or modifying agents, updating rules, and maintaining the wiki. Read this before opening a pull request.

## Table of Contents

- [Contribution Types](#contribution-types)
- [Adding a New Agent](#adding-a-new-agent)
- [Modifying an Existing Agent](#modifying-an-existing-agent)
- [Updating Rules](#updating-rules)
- [Wiki Maintenance](#wiki-maintenance)
- [Bilingual Sync Policy](#bilingual-sync-policy)
- [Pull Request Checklist](#pull-request-checklist)
- [Related Pages](#related-pages)
- [Canonical Sources](#canonical-sources)

---

## Contribution Types

| Type | Changes required |
|------|----------------|
| New agent | `.claude/agents/{name}.md` + the matching Agents-{domain}.md page (en+ja) |
| Modify agent | `.claude/agents/{name}.md` + matching Agents-{domain}.md entry (en+ja) |
| New rule | `.claude/rules/{name}.md` + Rules-Reference (en+ja) |
| Modify rule | `.claude/rules/{name}.md` + Rules-Reference entry (en+ja) |
| Orchestrator rules change | `.claude/orchestrator-rules.md` + Architecture-Operational-Rules.md / Triage-System.md (en+ja) |
| New flow (orchestrator) | `.claude/agents/{flow}.md` + `.claude/commands/{flow}.md` + Architecture-Domain-Model.md (figures + text) + Architecture-Operational-Rules.md (Phase Execution Loop) + Triage-System.md (new section) + Agents-Orchestrators.md (new orchestrator) + Agents-{Domain}.md (new domain section if applicable) + Home.md (personas + glossary) + index.mdx (card) |
| Wiki page update | `wiki/en/{page}.md` + `wiki/ja/{page}.md` (same PR) |

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

2. **Update the matching Agents-{Domain} page** in both `wiki/en/` and `wiki/ja/`: `Agents-Discovery.md`, `Agents-Delivery.md`, `Agents-Operations.md`, `Agents-Maintenance.md`, or `Agents-Orchestrators.md` for cross-cutting agents (flow orchestrators, sandbox-runner, analyst, codebase-analyzer). Add a new entry following the standard schema (Canonical, Domain, Responsibility, Inputs, Outputs, AGENT_RESULT fields, NEXT conditions).

3. **If the agent is invokable as a standalone slash command**, add a corresponding command file in `.claude/commands/{name}.md`.

4. **If the agent is a new flow orchestrator**, update `.claude/orchestrator-rules.md` to include the new agent in the triage or phase sequence.

5. **Agents-Reference split threshold**: The Agents-Reference was split into 5 domain pages in #42. If any single domain page exceeds ~250 lines, or the total agent count exceeds 50, consider further splitting into per-agent files (`wiki/en/agents/{name}.md`). This is a future decision — open an issue to discuss first.

---

## Modifying an Existing Agent

1. **Edit the canonical file** at `.claude/agents/{name}.md`.

2. **Update the corresponding entry** in the matching `Agents-{Domain}.md` page (en+ja) to reflect the change.

   > Keeping the Agents-{Domain} pages synchronized with `.claude/agents/` is mandatory. If you update an agent definition without updating the matching wiki entry, reviewers will request a correction.

---

## Updating Rules

1. **Edit the canonical file** at `src/.claude/rules/{name}.md` (see "Editing Aphelion's own rules" below for the layout rationale).

2. **Update the corresponding Rules-Reference entry** in both `wiki/en/Rules-Reference.md` and `wiki/ja/Rules-Reference.md`.

3. **If the rule change affects orchestrator behavior**, also update the relevant Architecture sub-page (`wiki/{en,ja}/Architecture-Operational-Rules.md` for runtime behaviors, `Architecture-Domain-Model.md` for conceptual changes, `Architecture-Protocols.md` for AGENT_RESULT / handoff schema changes).

4. **If the rule affects triage**, also update `wiki/en/Triage-System.md` and `wiki/ja/Triage-System.md`.

### Editing Aphelion's own rules

The canonical source for `rules/*.md` lives at `src/.claude/rules/`, **not** at `.claude/rules/`. This is intentional.

Claude Code auto-loads `rules/*.md` from both `~/.claude/rules/` (user-global) and `<project>/.claude/rules/` (project-local) in additive fashion. For Aphelion's own maintainers, that previously meant every session opened inside the repo loaded two copies of every rule — and during the rule-edit window, two materially different versions. Relocating the source out of the repo-root `.claude/rules/` slot eliminates the structural dual-load. See `docs/issues/claude-rules-isolation.md` (#44) for the full analysis.

**Practical consequence**: when you edit a rule under `src/.claude/rules/`, your in-progress edit does **not** automatically take effect in your current Claude Code session. Your session is governed by your user-global mirror at `~/.claude/rules/`, which is the deployed snapshot. To pick up your edit:

1. Bump `package.json` `version` per the policy below.
2. Run `node bin/aphelion-agents.mjs update --user` (or after merge, `npx github:kirin0198/aphelion-agents#main update --user`).
3. Start a new Claude Code session.

This edit-vs-effect decoupling is deliberate: editing a rule while being simultaneously governed by it is a chicken-and-egg problem. Decoupling avoids it.

> Do **not** symlink `src/.claude/rules/` to `<repo>/.claude/rules/`. That re-introduces the dual-load this layout was designed to remove.

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
- **Wiki**: Detailed reference. Agent schemas, rule explanations, triage logic.
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

## Pull Request Checklist

Before opening a PR, verify:

- [ ] Canonical source (`.claude/agents/` or `.claude/rules/`) updated
- [ ] `wiki/en/` page updated (if the change affects wiki content)
- [ ] `wiki/ja/` page updated in the same PR (bilingual sync)
- [ ] `> Last updated:` line updated in modified wiki pages
- [ ] `> EN canonical:` line updated in corresponding `wiki/ja/` pages
- [ ] Matching `Agents-{Domain}.md` or `Rules-Reference.md` entry updated (if agent/rule changed)
- [ ] If a new flow / orchestrator is added, update all integration points: Architecture-Domain-Model.md figures, Architecture-Operational-Rules.md (Phase Execution Loop), Triage-System.md sections, Agents-Orchestrators.md (cross-cutting agent entry), and Home.md persona entries
- [ ] If a new file is added under `.claude/commands/`, also append a row to `.claude/commands/aphelion-help.md` so the static command listing stays in sync with the directory (#39)
- [ ] `package.json` `version` bumped if any file under `.claude/agents/`, `.claude/rules/`, `.claude/commands/`, or `.claude/orchestrator-rules.md` was modified (see "Version bumping policy" below)
- [ ] `bash scripts/smoke-update.sh` exits 0 (release-time gate; run before tagging)

### Version bumping policy

Any PR that modifies the canonical source under `.claude/agents/`, `.claude/rules/`,
`.claude/commands/`, or `.claude/orchestrator-rules.md` MUST bump `package.json`
`version`. This is the only thing that invalidates downstream `npx` caches —
without a bump, users running `npx ... update` will keep receiving the previous
snapshot even after `git push` to `main`.

- Default: bump the patch component (`0.2.0` → `0.2.1`).
- Bump the minor component when adding a new agent, a new flow, or a breaking
  rule.
- Document the change in `CHANGELOG.md` under the `## [Unreleased]` section.

### Settings deny-list policy

`<project>/.claude/settings.local.json` ships with a deny-list shape: `allow: ["*"]` and
explicit `deny` entries for destructive operations. Categories: `destructive_fs`,
`destructive_git`, `privilege_escalation`, `secret_access`, `prod_db`, `external_publish`.
The list mirrors the categories in `.claude/rules/sandbox-policy.md` §1.

Customising: deny entries can be removed locally if your workflow needs a banned command
(`git push --force-with-lease` against your own fork, for example). Removed entries are
not propagated back when running `npx aphelion-agents update` — the filter at copy time
preserves your local `settings.local.json`.

### When a command is denied

See `.claude/rules/denial-categories.md` for the full protocol. Quick reference:

- **Sandbox / policy denial** → `AskUserQuestion` to confirm intent. If still blocked
  after approval, paste `!cmd` into the chat input (manual fallback). Claude Code does
  not currently honor in-conversation approval as a one-shot allowlist.
- **POSIX `Permission denied`** → run `ls -la {path}`; if owned by `root`, run
  `sudo chown -R $USER {path}` and retry. This is *not* a sandbox-policy issue; the
  approval flow will not help.
- **Claude Code auto-mode refusal** (sub-agent boundary, branch-protection heuristic,
  "External System Write", etc.) — not configurable from `settings.local.json`. Either
  approve per-invocation, run the command from the parent session, or split the
  workflow so the heuristic does not fire.

---

## Related Pages

- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Architecture: Protocols](./Architecture-Protocols.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [Agents Reference: Orchestrators](./Agents-Orchestrators.md)
- [Rules Reference](./Rules-Reference.md)

## Canonical Sources

- [.claude/agents/](../../.claude/agents/) — Agent definition files (canonical)
- [.claude/rules/](../../.claude/rules/) — Rule files (canonical)
- [wiki/DESIGN.md](../DESIGN.md) — Wiki information architecture design
