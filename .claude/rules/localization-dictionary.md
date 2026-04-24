# Localization Dictionary

Fixed UI strings used by all agents. Agents resolve `Output Language` from
project-rules.md and pick the matching column.

For agents using these strings: look up the key in the table below and substitute
template placeholders (`{N}`, `{M}`, `{agent}`) at render time.

---

## Approval Gate

| key                    | en                                                                                   | ja                                                                           |
|------------------------|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| phase_complete_header  | "Phase {N} complete: {agent}"                                                        | "Phase {N} 完了: {agent}"                                                    |
| artifacts_label        | "Generated artifacts"                                                                | "生成された成果物"                                                            |
| content_summary_label  | "Summary"                                                                            | "内容サマリー"                                                                |
| approval_question      | "Phase {N} artifacts reviewed. Proceed to the next phase?"                           | "Phase {N} の成果物を確認しました。次のフェーズに進みますか？"                |
| approve_and_continue   | "Approve and continue"                                                               | "承認して続行"                                                                |
| request_modification   | "Request modification"                                                               | "修正を指示"                                                                  |
| abort                  | "Abort"                                                                              | "中断"                                                                        |

---

## AskUserQuestion Fallback

| key                  | en                                   | ja                                          |
|----------------------|--------------------------------------|---------------------------------------------|
| pause_marker_header  | "⏸ Confirmation needed"              | "⏸ 確認事項があります"                       |
| resume_after_answer  | "Work resumes after your reply."     | "回答をいただいてから作業を再開します。"      |
| recommended_suffix   | "(recommended)"                      | "(推奨)"                                     |

---

## Progress Display

| key          | en                                          | ja                                           |
|--------------|---------------------------------------------|----------------------------------------------|
| phase_start  | "▶ Phase {N}/{M}: launching {agent}"        | "▶ Phase {N}/{M}: {agent} を起動します"       |
