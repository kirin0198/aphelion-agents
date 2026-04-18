#!/usr/bin/env python3
"""
Generate platform-specific agent configurations from Claude Code canonical source.

Usage:
    python scripts/generate.py                    # Generate all platforms
    python scripts/generate.py --platform copilot # Copilot only
    python scripts/generate.py --platform codex   # Codex only
    python scripts/generate.py --clean            # Remove generated files
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLAUDE_DIR = ROOT / ".claude"
PLATFORMS_DIR = ROOT / "platforms"

# ---------------------------------------------------------------------------
# Tool-name mapping: Claude Code -> GitHub Copilot
# ---------------------------------------------------------------------------
COPILOT_TOOL_MAP: dict[str, str] = {
    "Read": "read",
    "Write": "edit",
    "Edit": "edit",
    "Bash": "execute",
    "Glob": "search",
    "Grep": "search",
    "Agent": "agent",
    "WebSearch": "web",
    "WebFetch": "web",
}

# Orchestrator agent stems (need orchestrator-rules inlined)
ORCHESTRATOR_NAMES = {"discovery-flow", "delivery-flow", "operations-flow"}

# Commands to convert to Codex skills (standalone utilities only)
CODEX_SKILL_COMMANDS = ["vuln-scan", "secrets-scan"]

# Codex AGENTS.md size limit
CODEX_MAX_BYTES = 32 * 1024


# ---------------------------------------------------------------------------
# YAML frontmatter parser (no external dependency)
# ---------------------------------------------------------------------------
def parse_frontmatter(content: str) -> tuple[dict[str, str], str]:
    """Parse YAML frontmatter and markdown body from file content.

    Returns (frontmatter_dict, body_string). If no frontmatter is found,
    returns ({}, full_content).
    """
    if not content.startswith("---"):
        return {}, content

    lines = content.split("\n")
    end_line = None
    for i, line in enumerate(lines[1:], 1):
        if line.strip() == "---":
            end_line = i
            break

    if end_line is None:
        return {}, content

    fm_lines = lines[1:end_line]
    body = "\n".join(lines[end_line + 1 :])

    fm: dict[str, str] = {}
    current_key: str | None = None
    multiline_buf: list[str] = []

    for line in fm_lines:
        m = re.match(r"^([a-z_-]+):\s*(.*)", line)
        if m:
            # flush previous key
            if current_key is not None and multiline_buf:
                fm[current_key] = "\n".join(multiline_buf).strip()
            current_key = m.group(1)
            value = m.group(2).strip()
            if value == "|":
                multiline_buf = []
            elif value:
                fm[current_key] = value
                current_key = None
                multiline_buf = []
            else:
                fm[current_key] = ""
                current_key = None
                multiline_buf = []
        elif current_key is not None:
            multiline_buf.append(line)

    if current_key is not None and multiline_buf:
        fm[current_key] = "\n".join(multiline_buf).strip()

    return fm, body


# ---------------------------------------------------------------------------
# Copilot generation
# ---------------------------------------------------------------------------
def _copilot_frontmatter(fm: dict[str, str]) -> str:
    """Build Copilot-compatible YAML frontmatter from Claude agent metadata."""
    parts = ["---"]

    if "name" in fm:
        parts.append(f"name: {fm['name']}")

    if "description" in fm:
        desc = fm["description"]
        if "\n" in desc:
            parts.append("description: |")
            for dl in desc.split("\n"):
                parts.append(f"  {dl}")
        else:
            parts.append(f'description: "{desc}"')

    if "tools" in fm:
        claude_tools = [t.strip() for t in fm["tools"].split(",")]
        seen: set[str] = set()
        copilot_tools: list[str] = []
        for t in claude_tools:
            mapped = COPILOT_TOOL_MAP.get(t, t.lower())
            if mapped not in seen:
                copilot_tools.append(mapped)
                seen.add(mapped)
        parts.append("tools:")
        for t in copilot_tools:
            parts.append(f"  - {t}")

    # model is omitted — Copilot uses its own model selection
    parts.append("---")
    return "\n".join(parts)


def _replace_copilot(text: str) -> str:
    """Replace Claude Code-specific references with Copilot equivalents."""
    result = text

    # Tool names in backticks
    for claude, copilot in COPILOT_TOOL_MAP.items():
        result = result.replace(f"`{claude}`", f"`{copilot}`")

    # AskUserQuestion — backtick-wrapped and invocation patterns
    result = result.replace(
        "`AskUserQuestion`", "text output with structured choices"
    )
    result = re.sub(
        r"(?:Use |use |via |using )`?AskUserQuestion`?",
        "present choices to the user via text output",
        result,
    )
    # Section headers and remaining bare references
    result = result.replace(
        "### AskUserQuestion Tool (Recommended)",
        "### Structured Choices (Recommended)",
    )
    result = result.replace(
        "### AskUserQuestion Usage Examples",
        "### Structured Choice Examples",
    )
    result = re.sub(r"AskUserQuestion", "structured choice prompt", result)

    # Path references
    result = result.replace(
        ".claude/orchestrator-rules.md", ".github/orchestrator-rules.md"
    )
    result = result.replace(".claude/agents/", ".github/agents/")
    result = result.replace(".claude/CLAUDE.md", ".github/copilot-instructions.md")
    # Standalone CLAUDE.md (not preceded by path separator)
    result = re.sub(r"(?<![/.])CLAUDE\.md", "copilot-instructions.md", result)

    # Agent invocation pattern
    result = re.sub(
        r"Agent\(\s*\n?\s*subagent_type:\s*\"([^\"]+)\"",
        r"@\1 (",
        result,
    )

    return result


def generate_copilot(*, clean: bool = False) -> None:
    """Generate GitHub Copilot configuration under platforms/copilot/."""
    copilot_dir = PLATFORMS_DIR / "copilot"

    if clean:
        if copilot_dir.exists():
            shutil.rmtree(copilot_dir)
            print(f"  Cleaned: {copilot_dir}")
        return

    copilot_dir.mkdir(parents=True, exist_ok=True)
    agents_dir = copilot_dir / "agents"
    agents_dir.mkdir(exist_ok=True)

    # --- copilot-instructions.md (from CLAUDE.md) ---
    claude_md = (CLAUDE_DIR / "CLAUDE.md").read_text(encoding="utf-8")
    instructions = _replace_copilot(claude_md)
    instructions = instructions.replace(
        "# CLAUDE.md — Aphelion Workflow Common Rules",
        "# Aphelion Workflow Common Rules",
    )
    # Remove the Claude-specific orchestrator file reference
    instructions = re.sub(
        r"> \*\*For flow orchestrators:\*\*[^\n]*\n",
        "",
        instructions,
    )
    out = copilot_dir / "copilot-instructions.md"
    out.write_text(instructions, encoding="utf-8")
    print(f"  {out}")

    # --- orchestrator-rules (for inlining into orchestrator agents) ---
    orch_rules_raw = (CLAUDE_DIR / "orchestrator-rules.md").read_text(encoding="utf-8")
    orch_rules = _replace_copilot(orch_rules_raw)

    # --- agent files ---
    count = 0
    for src in sorted((CLAUDE_DIR / "agents").glob("*.md")):
        content = src.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(content)

        # Copilot uses .agent.md extension
        out_name = src.stem + ".agent.md"

        if not fm:
            # plain file — just do text replacements
            (agents_dir / out_name).write_text(
                _replace_copilot(content), encoding="utf-8"
            )
            count += 1
            continue

        header = _copilot_frontmatter(fm)
        converted = _replace_copilot(body)

        # Inline orchestrator-rules for flow orchestrators
        if src.stem in ORCHESTRATOR_NAMES:
            converted = re.sub(
                r"> \*\*共通ルール:\*\*[^\n]*\n",
                "",
                converted,
            )
            converted = (
                converted.rstrip() + "\n\n---\n\n" + orch_rules
            )

        (agents_dir / out_name).write_text(
            header + "\n" + converted, encoding="utf-8"
        )
        count += 1

    print(f"  {agents_dir}/ ({count} agents)")


# ---------------------------------------------------------------------------
# Codex generation
# ---------------------------------------------------------------------------
def _replace_codex(text: str) -> str:
    """Remove / neutralise Claude Code-specific references for Codex."""
    result = text

    # Strip backtick-wrapped tool names to plain words
    for claude in COPILOT_TOOL_MAP:
        result = result.replace(f"`{claude}` tool", "the appropriate tool")
        result = result.replace(f"`{claude}`", claude.lower())

    result = result.replace("`AskUserQuestion`", "asking the user")
    result = re.sub(
        r"(?:Use |use |via |using )`?AskUserQuestion`?",
        "ask the user",
        result,
    )
    # Section headers and remaining bare references
    result = result.replace(
        "### AskUserQuestion Tool (Recommended)",
        "### Structured User Questions (Recommended)",
    )
    result = re.sub(r"AskUserQuestion", "user prompt", result)

    # Path references
    result = result.replace(
        ".claude/orchestrator-rules.md", "the orchestrator rules section below"
    )
    result = result.replace(".claude/agents/", "agents/")
    result = result.replace(".claude/CLAUDE.md", "the global rules above")
    result = re.sub(r"(?<![/.])CLAUDE\.md", "global rules", result)

    return result


def generate_codex(*, clean: bool = False) -> None:
    """Generate OpenAI Codex configuration under platforms/codex/."""
    codex_dir = PLATFORMS_DIR / "codex"

    if clean:
        if codex_dir.exists():
            shutil.rmtree(codex_dir)
            print(f"  Cleaned: {codex_dir}")
        return

    codex_dir.mkdir(parents=True, exist_ok=True)

    # --- AGENTS.md (CLAUDE.md + orchestrator-rules) ---
    claude_md = (CLAUDE_DIR / "CLAUDE.md").read_text(encoding="utf-8")
    orch_rules = (CLAUDE_DIR / "orchestrator-rules.md").read_text(encoding="utf-8")

    claude_conv = _replace_codex(claude_md)
    orch_conv = _replace_codex(orch_rules)

    claude_conv = claude_conv.replace(
        "# CLAUDE.md — Aphelion Workflow Common Rules",
        "# Aphelion Workflow Rules",
    )
    claude_conv = re.sub(
        r"> \*\*For flow orchestrators:\*\*[^\n]*\n", "", claude_conv
    )

    agents_md = claude_conv.rstrip() + "\n\n---\n\n" + orch_conv

    size_bytes = len(agents_md.encode("utf-8"))
    size_kb = size_bytes / 1024
    out = codex_dir / "AGENTS.md"
    out.write_text(agents_md, encoding="utf-8")
    status = "OK" if size_bytes <= CODEX_MAX_BYTES else "EXCEEDS 32KiB LIMIT"
    print(f"  {out} ({size_kb:.1f}KiB — {status})")

    # --- Skills from commands ---
    commands_dir = CLAUDE_DIR / "commands"
    for cmd_name in CODEX_SKILL_COMMANDS:
        cmd_path = commands_dir / f"{cmd_name}.md"
        if not cmd_path.exists():
            continue

        cmd_content = cmd_path.read_text(encoding="utf-8")
        first_line = cmd_content.split("\n")[0].strip()

        skill_dir = codex_dir / "skills" / cmd_name
        skill_dir.mkdir(parents=True, exist_ok=True)

        # Strip $ARGUMENTS placeholder
        body = _replace_codex(cmd_content)
        body = re.sub(r"\n?\$ARGUMENTS\s*\n?", "", body)

        skill_md = f"---\nname: {cmd_name}\ndescription: {first_line}\n---\n\n{body}"
        skill_out = skill_dir / "SKILL.md"
        skill_out.write_text(skill_md, encoding="utf-8")
        print(f"  {skill_out}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate platform-specific agent files from Claude Code source"
    )
    parser.add_argument(
        "--platform",
        choices=["copilot", "codex"],
        help="Generate for a specific platform only (default: all)",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Remove all generated files under platforms/",
    )
    args = parser.parse_args()

    print("Aphelion — Platform Generator")
    print("=" * 40)

    if args.platform in (None, "copilot"):
        print("\n[GitHub Copilot]")
        generate_copilot(clean=args.clean)

    if args.platform in (None, "codex"):
        print("\n[OpenAI Codex]")
        generate_codex(clean=args.clean)

    if not args.clean:
        print("\n" + "=" * 40)
        print("Done! To use in your project:\n")
        print("  Copilot:  cp -r platforms/copilot/* <project>/.github/")
        print("  Codex:    cp platforms/codex/AGENTS.md <project>/")
        print("            cp -r platforms/codex/skills/ <project>/")


if __name__ == "__main__":
    main()
