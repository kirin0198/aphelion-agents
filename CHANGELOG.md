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

## 0.1.0 - 2026-04-20

### Added

- **CLI tool**: `npx aphelion-agents init` — Install Aphelion agent definitions into the current directory
  - `--platform <name>` option: target platform (`claude-code` | `copilot` | `codex`), defaults to `claude-code`
  - `--all` option: install all three platforms at once
  - `--force` option: overwrite without prompting
- **CLI tool**: `npx aphelion-agents update` — Update installed agent definitions to the bundled version
  - Shows diff (added / modified / removed) before applying
  - `--force` option: apply without prompting
  - Protects `.claude/settings.local.json` from overwrite
- **TypeScript source** under `src/` with strict mode, Node 20 target, ESM output
- **LICENSE** file (MIT)
- Build configuration: `tsup`, `tsconfig.json`, `biome.json`, `vitest.config.ts`

### Changed

- `package.json`: removed `private: true`, added `bin`, `files`, `engines`, `version`, `license`, `author`, `repository`, `homepage`

### Publish

Manual publish steps:

1. `npm login`
2. `npm run build`
3. `npm run test`
4. `npm pack` — verify included files
5. `npm publish --access public`
6. `git tag v0.1.0 && git push --tags`
