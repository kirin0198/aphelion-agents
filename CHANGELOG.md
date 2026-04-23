# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `.claude/CLAUDE.md` moved to `.claude/rules/aphelion-overview.md` with auto-load header; the Aphelion workflow overview is now part of the auto-loaded rules collection
- `rules-designer` now writes project-specific rules to `.claude/rules/project-rules.md` instead of the project root `CLAUDE.md`

### Removed

- The project-root `CLAUDE.md` artifact from `rules-designer` output — Aphelion no longer generates it to avoid collisions with existing user `CLAUDE.md` files

### Migration

- Existing users who rely on `.claude/CLAUDE.md`: the file has been renamed to `.claude/rules/aphelion-overview.md` and is now auto-loaded by Claude Code. No manual action required if you use the CLI (`npx aphelion-agents update`).
- Existing projects with a hand-authored `CLAUDE.md` at the project root: consider moving it to `.claude/rules/project-rules.md` so it is auto-loaded alongside Aphelion rules (optional).
- CLI distribution is automatically updated to the new layout — no individual migration script execution is required.

---

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
- Updates are distributed by `git push` to the main branch only — no version bump or publish step required for maintainers
