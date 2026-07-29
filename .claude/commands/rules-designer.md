Launch the Rules Designer agent (project rules definition).

Through dialogue with the user (reading INTERVIEW_RESULT.md first when Discovery has already
run), determine project-specific coding conventions, Git rules, build commands, output
language, and Co-Authored-By policy. Generate `.claude/rules/project-rules.md`, which every
subsequent agent reads for project context.

INTERVIEW_RESULT.md is optional — without it the agent collects the same information by
asking directly, so this command works on a fresh install and on an existing project.

$ARGUMENTS
