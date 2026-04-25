Launch the Rules Designer agent for first-run project setup.

Use this immediately after `npx aphelion-agents init` to populate
`.claude/rules/project-rules.md` interactively. The agent asks about language /
framework, Git conventions, build commands, output language, and Co-Authored-By
policy, then writes the rules file used by every subsequent agent.

If `.claude/rules/project-rules.md` already exists, the agent will detect it and
ask whether to amend or recreate. INTERVIEW_RESULT.md is optional; running this
command standalone (without prior Discovery artifacts) is supported.

User requirements:
$ARGUMENTS
