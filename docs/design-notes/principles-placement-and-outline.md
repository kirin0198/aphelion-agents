> Last updated: 2026-06-14
> GitHub Issue: [#163](https://github.com/kirin0198/aphelion-agents/issues/163)
> Authored by: analyst-intake (2026-06-14)
> Analysis by: analyst-core (2026-06-14)
> Next: architect

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
- ~~**Open question**: CONTRIBUTING.md が存在するかどうかは実装時に確認が必要~~
  → **解決（§5）**: ルート直下に CONTRIBUTING.md は存在せず、正本は `docs/wiki/{en,ja}/Contributing.md`。両ファイルを参照追記対象とする。
- ~~**Open question**: PR テンプレートが既存の場合は追記・新規の場合は新設~~
  → **解決（§5）**: `.github/PULL_REQUEST_TEMPLATE.md` は存在しないため**新規作成**。

---

## §5 Analysis

> Updated: 2026-06-14 (analyst-core: 影響ファイルの実態確認と承認済み修正の反映)

### 分類

**Feature addition**（既存 SCOPE 外の新規ドキュメント追加とコントリビューションフロー整備）。
SPEC.md / ARCHITECTURE.md を持たないメタ（Aphelion 自身の）リポジトリであり、
本件はプロダクト機能ではなくリポジトリ運用ドキュメントの整備に該当する。

### 実態確認の結果（重要）

intake 時点の §4 Open question 2 件を、実ファイル調査で確定した。

| 確認項目 | intake 時点の想定 | 実態 | 帰結 |
|----------|-------------------|------|------|
| CONTRIBUTING の所在 | ルート直下 `CONTRIBUTING.md` を想定 | **ルートには存在しない**。`docs/wiki/en/Contributing.md`（21.6K）と `docs/wiki/ja/Contributing.md`（26.5K）が正本 | 参照追記の対象を **wiki の en / ja 両ファイル** に変更（ユーザー承認済み） |
| PR テンプレート | 既存なら追記・無ければ新設 | `.github/PULL_REQUEST_TEMPLATE.md` は**存在しない** | **新規作成**（ユーザー承認済み） |
| proposals memo | `docs/design-notes/proposals/principles-placement-memo.md` を参照 | 当該ファイルは**存在しない** | 配置方針は §3 / §4 で既に確定済みのため骨子作成には影響なし。memo 参照は骨子の根拠としては使わず、確定済み方針を直接採用 |
| SPEC.md / UI_SPEC.md | missing | いずれも**存在しない** | 本リポジトリにプロダクト spec は無く、更新不要（no_change / not_exists） |

### 要件整理（ユーザーストーリー）

- コントリビューター / エージェント設計レビュー担当者として、設計思想（変わらない原則）を
  一箇所で参照したい。レビュー時に「思想準拠か」を判断する拠り所が欲しい。
- ただしトークンコストを増やしたくないため、自動ロード（`.claude/rules/` 配下）は採用せず、
  必要時に手動でロードする運用とする。

### 思想準拠チェックの責任分界

- doc-reviewer は成果物間の整合性レビューを担うが、**思想準拠（PRINCIPLES.md への適合）チェックは
  含めない**。思想準拠は人間が HITL でレビューする（§4 Constraints に既出）。
- PR テンプレートのチェックボックスは、この HITL レビューを運用上の手続きとして担保するもの。

## §6 Approach

> Updated: 2026-06-14 (analyst-core)

architect / 実装ティアで実施する具体作業は以下。

1. **`PRINCIPLES.md`（ルート直下・新規）**
   - 冒頭に配置方針の説明を置く: (a) ルート直下固定、(b) 手動ロード（自動ロードしない）理由 =
     トークンコスト制御、(c) `.claude/rules/` を採用しない理由。
   - 「想定される原則」を章立て（見出し）として列挙し、各見出し配下は **1 行プレースホルダーのみ**。
   - 本文（各原則の詳細文章）は書かない旨を明記し、follow-up issue への分離を文中に残す。
2. **`docs/wiki/en/Contributing.md` 参照追記**
   - レビュー前に PRINCIPLES.md をロードし、思想準拠を確認する旨を 1 セクション追記。
   - 既存ファイルの**インクリメンタル編集**（全面書き換え禁止）。
   - language-rules の Bilingual Sync Policy に従い ja と同一 PR で同期。
3. **`docs/wiki/ja/Contributing.md` 参照追記**
   - en と構造（見出し位置）を lockstep に保ちつつ、本文は ja で記述。
4. **`.github/PULL_REQUEST_TEMPLATE.md`（新規作成）**
   - 「PRINCIPLES.md に照らして確認済み」チェックボックスを含む最小テンプレートを新設。
   - 既存テンプレートが無いため、Summary / Related Issue / Linked Plan / Test plan の
     標準骨子＋当該チェックボックスを備えた構成とする。

## §7 Document Changes

> Updated: 2026-06-14 (analyst-core)

| ドキュメント | 変更 | 担当 |
|--------------|------|------|
| `SPEC.md` | no_change（リポジトリに存在しない） | — |
| `UI_SPEC.md` | not_exists（UI 無し） | — |
| `ARCHITECTURE.md` | no_change（存在しない / 設計構造への影響なし） | architect 確認 |
| `PRINCIPLES.md` | **新規作成**（骨子・章立て・プレースホルダー） | 実装ティア |
| `docs/wiki/en/Contributing.md` | 参照セクション追記（インクリメンタル） | 実装ティア |
| `docs/wiki/ja/Contributing.md` | 参照セクション追記（en と同期） | 実装ティア |
| `.github/PULL_REQUEST_TEMPLATE.md` | **新規作成**（チェックボックス含む） | 実装ティア |

本 analyst-core セッションでは SPEC / UI_SPEC の更新は発生しない（存在しないため）。
実ファイル（PRINCIPLES.md / Contributing.md / PR テンプレート）の作成・編集は
architect → 実装ティアへ引き継ぐ。

## §8 Handoff Brief (for architect)

> Updated: 2026-06-14 (analyst-core)

- **設計変更の概要**: プロダクトのアーキテクチャ変更は無し。リポジトリ運用ドキュメント
  3 種（PRINCIPLES.md 新設 / wiki Contributing 両言語への参照追記 / PR テンプレート新設）の
  追加のみ。ARCHITECTURE.md の更新は不要。
- **SPEC 変更**: なし（SPEC.md 自体が存在しないメタリポジトリ）。
- **UI_SPEC 変更**: なし（SCR 追加なし）。
- **設計上の制約 / 決定事項**:
  - PRINCIPLES.md は**ルート直下固定・手動ロード**。`.claude/rules/` 配下へは置かない
    （自動ロードによるトークンコスト増を避ける）。
  - 今回スコープは**骨子のみ**。各原則の本文策定は follow-up issue へ分離。
  - 思想準拠チェックは **HITL（人間レビュー）** が担い、doc-reviewer の責任範囲外。
  - CONTRIBUTING 参照追記の対象は `docs/wiki/{en,ja}/Contributing.md` の **両ファイル**
    （ルート直下 CONTRIBUTING.md は存在しない）。Bilingual Sync Policy に従い同一 PR で同期。
  - PR テンプレートは**新規作成**（既存テンプレート無し）。
- **architect への依頼**: 上記 4 ファイルの構成（PRINCIPLES.md の章立て確定、追記セクションの
  文面・配置、PR テンプレートの項目）を設計ノートとして具体化すること。
