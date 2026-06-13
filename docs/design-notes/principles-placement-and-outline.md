> Last updated: 2026-06-14
> GitHub Issue: [#163](https://github.com/kirin0198/aphelion-agents/issues/163)
> Authored by: analyst-intake (2026-06-14)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/principles-placement-and-outline.md
slug: principles-placement-and-outline
branch_name: feat/principles-placement-and-outline
issue_url: https://github.com/kirin0198/aphelion-agents/issues/163
issue_number: 163
issue_title: "feat: add PRINCIPLES.md skeleton, CONTRIBUTING.md ref, and PR template checkbox"
issue_type: feature
intake_summary: |
  Symptom / Background: Aphelion lacks a PRINCIPLES.md that captures the project's
  immutable design philosophy. Without it, agents and contributors lack a reference
  for design-intent reviews. A placement decision and document skeleton are needed
  before the full principle text can be authored.
  Expected behavior / Goal: Produce (a) PRINCIPLES.md skeleton at the repo root with
  section headings and a placeholder list of candidate principles, (b) a reference
  note added to CONTRIBUTING.md, and (c) a checkbox in .github/PULL_REQUEST_TEMPLATE.md.
  Actual authoring of principle body text is deferred to a follow-up issue.
  Scope: PRINCIPLES.md (new, repo root) + CONTRIBUTING.md (reference addition) +
  .github/PULL_REQUEST_TEMPLATE.md (checkbox addition). Placement policy and skeleton
  only; principle body text is out of scope for this issue.
proposals_source: docs/design-notes/proposals/principles-placement-memo.md
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: en
-->

# PRINCIPLES.md 配置と骨子作成

## §1 Background / Motivation

Aphelion には設計思想を明文化したドキュメントが存在しない。
現状、各エージェントの振る舞い・フロー構成の根拠となる「変わらない原則」が散在しており、
新規コントリビューターやエージェント設計のレビュー時に思想準拠を判断しにくい。

`docs/design-notes/proposals/principles-placement-memo.md` に配置方針の素案があり、
今回の issue でその方針を確定し、骨子ドキュメントとして着地させる。

**原則本文の策定は今回スコープ外** とし、別 issue (follow-up) で行う。

## §2 Goal / Acceptance Criteria

以下の 3 点が完了した状態を「Done」とする。

1. **PRINCIPLES.md（骨子）** — リポジトリルート直下に新設。
   - 配置方針説明（ルート直下・手動ロード・`.claude/rules/` 不採用の理由）
   - 章立て（想定される原則の見出し一覧）
   - 各原則は見出し + 1行プレースホルダーのみ（本文策定は follow-up issue）
2. **CONTRIBUTING.md 参照追記** — レビュー前に PRINCIPLES.md をロードする旨を 1 セクション追記。
3. **PR テンプレート チェックボックス** — `.github/PULL_REQUEST_TEMPLATE.md` に
   「PRINCIPLES.md に照らして確認済み」チェックボックスを追加。

> 原則本文策定（各見出し配下の詳細文章）は follow-up issue として分離する。

## §3 Scope

| 対象 | 変更内容 | 備考 |
|------|----------|------|
| `PRINCIPLES.md`（新設） | 骨子・章立て・プレースホルダー原則リスト | ルート直下 |
| `CONTRIBUTING.md` | PRINCIPLES.md 参照セクション追記 | 既存ファイル更新 |
| `.github/PULL_REQUEST_TEMPLATE.md` | チェックボックス 1 行追加 | 既存ファイル更新 |
| 原則本文 | **対象外** | follow-up issue |
| `.claude/rules/` への追加 | **対象外** | トークンコスト増のため不採用 |

## §4 Constraints / Open Questions

- **配置場所**: ルート直下固定（proposals memo の合意済み方針を採用）
- **ロード方式**: 手動ロード（自動ロードしない）— トークンコスト制御のため
- **doc-reviewer 除外**: 思想準拠チェックは人間が HITL で担う。doc-reviewer の責任範囲に含めない
- **原則候補**: proposals memo の「想定される原則の例」を初期見出しとして採用（精査は follow-up issue）
- **Open question**: CONTRIBUTING.md が存在するかどうかは実装時に確認が必要
- **Open question**: PR テンプレートが既存の場合は追記・新規の場合は新設

---

*§5–8 (Analysis, Approach, Document changes, Handoff brief) — to be filled by analyst-core*
