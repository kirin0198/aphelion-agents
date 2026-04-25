# `src/.claude/` — Distribution Source

This directory holds the canonical source for files that ship to consumers'
`~/.claude/` and `<project>/.claude/` via the `aphelion-agents` CLI.

Currently only `rules/` lives here. Other subtrees (`agents/`, `commands/`,
`orchestrator-rules.md`) remain at the repository root under `.claude/`.

## Why `rules/` is here and not at the repo root

Claude Code auto-loads `rules/*.md` from **both** `~/.claude/rules/` and
`<project>/.claude/rules/` in additive fashion (only `rules/` uses additive
semantics; `agents/`, `commands/`, and `settings.json` use
project-overrides-global). For Aphelion's own maintainers, having `.claude/rules/`
at the repository root collided with their user-global mirror after running
`update --user`, producing two copies of every rule in every session — and during
the rule-edit window, two materially different versions.

Relocating only `rules/` to `src/.claude/rules/` removes the project-side
auto-load slot, so a Claude Code session opened in this repository sees
**exactly one** copy of each rule (the user-global one).

See `docs/issues/archived/claude-rules-isolation.md` for the full analysis and ADRs.

## DO NOT symlink this directory upward

Adding `<repo>/.claude/rules` as a symlink (or copy) of `src/.claude/rules/`
would re-introduce the dual-load that motivated this layout. If you need
project-side rules to take effect during development, run
`node bin/aphelion-agents.mjs update --user` to deploy them to your
user-global `~/.claude/rules/` and start a new Claude Code session.

This is the deliberate edit-vs-effect decoupling documented in
`docs/wiki/{en,ja}/Contributing.md` (section: "Editing Aphelion's own rules").

## What the CLI does with this directory

`bin/aphelion-agents.mjs` reads `<packageRoot>/src/.claude/rules/` as the source
for `rules/` and writes it to `<target>/.claude/rules/` during both `init` and
`update`. The other subtrees (`agents/`, `commands/`, `orchestrator-rules.md`)
are read from `<packageRoot>/.claude/`.

## Distribution

`package.json` `files` field includes `src/.claude/rules`; the published tarball
contains `package/src/.claude/rules/*.md`. The tarball layout differs from the
extracted target layout (the CLI's `cp` flattens the `src/.claude/` prefix into
the target's `.claude/`).
