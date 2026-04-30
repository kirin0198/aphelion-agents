Launch the Doc Flow agent (customer-deliverable documentation orchestrator).

Generate customer-facing deliverable documents (HLD, LLD, API Reference, Ops Manual,
End-User Manual, Handover) from existing Aphelion artifacts (SPEC.md, ARCHITECTURE.md, etc.).

Triage is performed at startup to select which doc types to generate and in which language.
Each author agent runs in sequence with an approval gate after each phase.
Final output: DOC_FLOW_RESULT.md + docs/deliverables/{slug}/*.md

Arguments (all optional):
- `--types hld,lld,...`   Comma-separated list of doc types to generate (default: all 6)
- `--lang ja|en`          Output language (default: project-rules.md Output Language)
- `--slug {name}`         Output directory name under docs/deliverables/ (default: interactive)
- `--target-project {path}` Customer project repo root (default: cwd)

Examples:
  /doc-flow
  /doc-flow --types hld,lld
  /doc-flow --lang en --slug acme-portal
  /doc-flow --types handover --slug acme-portal --lang ja

User arguments:
$ARGUMENTS
