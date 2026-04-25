# Document Versioning

## Recording Update History

When updating any design document (SPEC.md, ARCHITECTURE.md, UI_SPEC.md, TEST_PLAN.md), record the update date at the beginning of the file.

```markdown
> 最終更新: {YYYY-MM-DD}
> 更新履歴:
>   - {YYYY-MM-DD}: {変更概要}
```

## Traceability

- `architect` records which version of SPEC.md was used as the basis for design at the top of `ARCHITECTURE.md`
- `developer` records which version of ARCHITECTURE.md was used as the basis for implementation in `TASK.md`
- Each flow orchestrator records the artifact version from the previous domain in the handoff file

## TASK.md Format

State file used by `developer` to persist implementation progress across sessions.
Generated at implementation start and updated upon each task completion.

```markdown
# TASK.md

> 参照元: ARCHITECTURE.md ({バージョン or 最終更新日})

## フェーズ: {フェーズ名}
最終更新: {日時}
ステータス: 進行中

## タスク一覧

### Phase {N}
- [ ] TASK-001: {タスク名} | 対象ファイル: src/...
- [ ] TASK-002: {タスク名} | 対象ファイル: src/...

## 直近のコミット
（タスク完了のたびに git log --oneline -3 を記録する）

## 中断時のメモ
（セッション中断時に状況をここに記録する）
```

## TASK.md Lifecycle

- Generated at the start of a new implementation phase (`developer` writes it based on ARCHITECTURE.md).
- Updated at each task completion (tick the checkbox, refresh the recent-commits section, commit with `git add TASK.md`).
- **On phase completion**, reset TASK.md to the empty template (one-line placeholder) so the next `developer` invocation starts from a clean state. Commit the reset as part of the phase's final commit or as a trailing `chore:` commit.
  - Rationale: a completed TASK.md with every checkbox ticked is not a design artifact — the phase's analysis and outcome belong in the matching `docs/design-notes/<slug>.md` planning document. Leaving a completed TASK.md in the repo risks the next `developer` session misreading it as a resume target.
