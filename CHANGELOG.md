# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

(no changes)

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
