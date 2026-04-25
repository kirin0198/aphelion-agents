# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

(no changes)

## 0.3.2 - 2026-04-25

### Added

- `/aphelion-init` slash command that launches `rules-designer` for first-run
  project rules setup. Use immediately after `npx aphelion-agents init` to
  populate `.claude/rules/project-rules.md` interactively. (#39)
- `/aphelion-help` slash command listing all 14 Aphelion slash commands grouped
  by category (Orchestrators / Shortcuts / Standalone agents / Safety helpers /
  Discoverability). Static markdown table — Claude Code built-ins (`/init`,
  `/help`, `/clear`, `/agents`, etc.) are intentionally omitted; run `/help`
  for those. (#39)

### Changed

- `package.json` version bumped from `0.3.1` to `0.3.2`.
- `docs/wiki/{en,ja}/Getting-Started.md`: added a step pointing to
  `/aphelion-init` between install and first Discovery run. README.md and
  README.ja.md got the same one-line pointer.
- `docs/wiki/{en,ja}/Contributing.md` PR checklist: added a reminder that
  any PR adding a `.claude/commands/*.md` file should also append a row to
  `aphelion-help.md` so the static listing stays in sync with the directory.

## 0.3.1 - 2026-04-25

### Changed

- `.claude/settings.local.json` rewritten as a deny-list policy. `allow: ["*"]` plus
  explicit `deny` entries for destructive_fs, destructive_git, privilege_escalation,
  secret_access, prod_db, and external publish commands. Aligns settings enforcement with
  the categories already documented in `src/.claude/rules/sandbox-policy.md`. Removed
  the redundant trailing `allow` entries (`Bash(git commit:*)`, `Bash(git add:*)`,
  `Bash(gh:*)`) that were no-ops under the leading `*`. (#31)
- Canonical source for `settings.local.json` relocated to `src/.claude/settings.local.json`
  (committed template), mirroring the post-#44 layout for `rules/`. The file at
  `<repo>/.claude/settings.local.json` (gitignored) remains the Aphelion repo's own
  dev-time copy. CLI ships from `src/`; `cmdInit` writes the template to consumers,
  `cmdUpdate` preserves any pre-existing consumer customisation.
- `bin/aphelion-agents.mjs`: `cmdInit` and `cmdUpdate` now also overlay
  `src/.claude/settings.local.json` onto the target's `.claude/`. Previously the file
  shipped nothing (gitignored + excluded from `files` allowlist after PR #46), so the
  deny-list update would have been invisible to consumers.
- `package.json` `files` allowlist extended with `src/.claude/settings.local.json`.
- `package.json` version bumped from `0.3.0` to `0.3.1`.
- `.gitignore` anchored to root (`/.claude/settings.local.json`) plus a negation
  un-ignoring `src/.claude/settings.local.json` so the canonical template stays
  trackable even when the user's global gitignore matches `**/.claude/settings.local.json`.
- `scripts/smoke-update.sh` extended: asserts that `init` installs the deny-list template
  and that the file matches the canonical at `src/.claude/settings.local.json` byte-for-byte.

### Added

- `src/.claude/rules/denial-categories.md` — auto-loaded rule that classifies Bash command
  failures into `sandbox_policy` / `os_permission` / `file_not_found` / `platform_heuristic`
  and prescribes per-category recovery. Documents the manual `!cmd` shell-prompt fallback
  for cases where Claude Code's sandbox refuses a command even after `AskUserQuestion`
  approval (verified PR #29 cleanup, 2026-04-24). (#31)
- 13 Bash-owning agents (`developer`, `tester`, `poc-engineer`, `scaffolder`,
  `infra-builder`, `codebase-analyzer`, `security-auditor`, `db-ops`, `releaser`,
  `observability`, `analyst`, `change-classifier`, `impact-analyzer`) now reference
  `denial-categories.md` alongside `sandbox-policy.md`. No behavioral change beyond the
  documented diagnostic protocol.
- New "Settings deny-list policy" / "When a command is denied" subsections in
  `docs/wiki/{en,ja}/Contributing.md` covering customisation, manual fallback, and
  per-category recovery.
- New `denial-categories` entry in `docs/wiki/{en,ja}/Rules-Reference.md`. Page now
  documents 11 rules instead of 10.

### Notes

- The `preToolUse` hook prototype for one-shot escalation is intentionally **out of scope**
  per ADR-002 in `docs/issues/deny-list-permission-policy.md`. Claude Code does not
  currently expose a documented hook contract that lets settings-level "approved this
  exact invocation, just this once" semantics work — observed in PR #29 cleanup. Upstream
  feedback to Anthropic is recommended (Q5 of the planning doc) but separate from this PR.

## 0.3.0 - 2026-04-25

### Changed

- Canonical source for `.claude/rules/` relocated from `<repo>/.claude/rules/` to
  `<repo>/src/.claude/rules/` to eliminate Claude Code's additive auto-load of rules
  when working inside the Aphelion repository itself. Per ADR-001 in
  `docs/issues/claude-rules-isolation.md`, only `rules/` is moved; `agents/`,
  `commands/`, and `orchestrator-rules.md` remain at repo root because their
  override semantics (project wins over user-global) already produce correct
  single-load behavior. (#44)
- `bin/aphelion-agents.mjs` now uses a hybrid source layout: `agents/`, `commands/`,
  and `orchestrator-rules.md` are copied from `<packageRoot>/.claude/`; `rules/`
  is overlaid from `<packageRoot>/src/.claude/rules/`.
- `package.json` `files` allowlist updated: replaced `.claude/rules` with
  `src/.claude/rules`.
- `package.json` version bumped from `0.2.0` to `0.3.0` per the post-#43 policy
  ("any change under `.claude/**` requires a version bump").
- `scripts/smoke-update.sh` asserts against `src/.claude/rules/` as the canonical
  source path.

### Added

- `src/.claude/README.md` explaining the directory's purpose and warning against
  re-symlinking it to repo root.
- `docs/wiki/{en,ja}/Contributing.md` section "Editing Aphelion's own rules"
  documenting ADR-005's edit-vs-effect decoupling: maintainer rule edits do
  not take effect in their session until they run `update --user`.

### Migration

- Existing users on `0.2.0` need to run `npx github:kirin0198/aphelion-agents#main update --user`
  (or `npm cache clean --force` first if `0.3.0` doesn't pull immediately) to refresh
  `~/.claude/rules/`. The version bump invalidates the npx cache; no separate `migrate`
  command is provided per ADR-004.

## 0.2.0 - 2026-04-25

### Fixed

- `npx aphelion-agents update` now reliably propagates `.claude/rules/` updates by bumping
  `package.json` version (which invalidates the npx cache key `name@version`). Previously,
  successive `update` runs against `0.1.0` could silently reuse a stale extracted tarball
  from `~/.npm/_npx/` and overwrite the user's `.claude/` with content matching a long-past
  commit. (#43)

### Changed

- `update` now prints `source: aphelion-agents@<version>` on success so users can detect
  stale-cache scenarios at a glance.
- `--help` text now enumerates `update`'s actual scope (agents/, rules/, commands/,
  orchestrator-rules.md) and explicitly notes that `settings.local.json` is preserved.
- `package.json` `files` field tightened from a coarse `[".claude"]` allowlist to an
  explicit list of distributable subpaths. Excludes `.claude/settings.local.json` and the
  local-only `.claude/worktrees/` directory from the published tarball; npm honors `files`
  over `.npmignore` for paths matched by the field, so the explicit allowlist is the
  reliable mechanism.
- Dropped GitHub Copilot / OpenAI Codex exports; project is now Claude Code only.
  Removed `platforms/` directory (35 files, ~468 KiB), `scripts/generate.mjs`, and the
  Platform-Guide wiki page. Historical multi-platform content remains accessible in git
  history up to commit `0ebd78e`
  ("feat: design /maintenance-flow (4th flow for existing-project maintenance)").
- `sandbox-policy.md` simplified to Claude Code–only: removed 4-way platform detection
  (claude_code / copilot / codex / unknown), removed `advisory_only` sandbox mode.
- `.claude/CLAUDE.md` moved to `.claude/rules/aphelion-overview.md` with auto-load header;
  the Aphelion workflow overview is now part of the auto-loaded rules collection.
- `rules-designer` now writes project-specific rules to `.claude/rules/project-rules.md`
  instead of the project root `CLAUDE.md`.

### Added

- `scripts/smoke-update.sh` — POSIX bash release-time gate that verifies `update`
  overwrites mutated rules and preserves `settings.local.json`.
- README cache-caveat subsection (en + ja) documenting `npx ...#main update` and
  `npm cache clean --force` as the user-side workarounds when the cache is stale.
- Version-bumping policy in `docs/wiki/{en,ja}/Contributing.md`: any PR that modifies
  `.claude/agents/`, `.claude/rules/`, `.claude/commands/`, or
  `.claude/orchestrator-rules.md` MUST bump `package.json` `version`. This reverses
  the prior "no version bump required for maintainers" stance from `0.1.0` (which was
  the root cause of #43).

### Removed

- The project-root `CLAUDE.md` artifact from `rules-designer` output — Aphelion no longer
  generates it to avoid collisions with existing user `CLAUDE.md` files.

### Migration

- Existing users who rely on `.claude/CLAUDE.md`: the file has been renamed to
  `.claude/rules/aphelion-overview.md` and is now auto-loaded by Claude Code. No manual
  action required if you use the CLI (`npx aphelion-agents update`), but **make sure to
  bypass any stale npx cache** — see the README's "Cache caveat" subsection.
- Existing projects with a hand-authored `CLAUDE.md` at the project root: consider moving
  it to `.claude/rules/project-rules.md` so it is auto-loaded alongside Aphelion rules
  (optional).

## 0.1.0 - 2026-04-23

### Added

- **CLI tool**: `npx github:kirin0198/aphelion-agents init` — Install `.claude/` into the current project directory
  - `--user` flag: install into user home (`~/.claude/`)
  - `--force` flag: overwrite existing `.claude/` directory
- **CLI tool**: `npx github:kirin0198/aphelion-agents update` — Update existing `.claude/` to the latest version
  - `--user` flag: update user home (`~/.claude/`)
  - Protects `.claude/settings.local.json` from overwrite (existing file is preserved)
- **`bin/aphelion-agents.mjs`**: zero-dependency single-file CLI (Node standard library only)
  - `node:fs/promises`, `node:path`, `node:os`, `node:url` — no third-party packages
  - Node 20+ version check with Japanese error message
  - User-facing messages in Japanese (language-rules compliant)
- **LICENSE** file (MIT)

### Distribution

- **Distribution channel**: GitHub main branch via `npx github:kirin0198/aphelion-agents`
- **npm publish**: not performed (`private: true` in `package.json`)
- Originally documented as "no version bump required for maintainers"; reversed in `0.2.0`
  because the unbounded reuse of the same `name@version` key caused npx caches to serve
  stale content (#43).
