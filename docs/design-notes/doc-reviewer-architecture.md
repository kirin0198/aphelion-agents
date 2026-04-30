# Architecture: doc-reviewer agent introduction

> Last updated: 2026-04-30
> Linked Design Note: doc-reviewer-agent-introduction.md
> Linked Issue: #91
> Source design-note: docs/design-notes/doc-reviewer-agent-introduction.md (2026-04-30)
> Authored by: architect
> Next: developer

---

## 1. Scope of this document

本ドキュメントは Issue #91「doc-reviewer agent 導入」の **technical
design document** である。Aphelion 本体リポジトリは `.claude/agents/*.md`
群と `.claude/orchestrator-rules.md` を「アーキテクチャ成果物」として扱う
ワークフロー製品なので、本書は通常プロジェクトの ARCHITECTURE.md と同じ
位置付けで利用する。

含むもの:
- Open Questions Q1 / Q3 / Q6 (および Q2 / Q4 / Q5 / Q7 / Q8 のレビュー結果) の確定
- `.claude/agents/doc-reviewer.md` の完全アウトライン (section level)
- `.claude/orchestrator-rules.md` への差分仕様
- `delivery-flow.md` / `discovery-flow.md` / `maintenance-flow.md` /
  `reviewer.md` / `aphelion-overview.md` への差分仕様
- `localization-dictionary.md` 追加項目
- PR 分割方針
- developer 向け実装チェックリスト
- テスト戦略 / rollback とエラーモードの考慮

含まないもの (= developer の責務):
- `.claude/agents/doc-reviewer.md` の本文そのもの
- 各 flow agent の差分パッチの実コード
- 動作確認 (本リポジトリには SPEC.md がないため別リポジトリで実施)

> **入力ドキュメント**:
> - `docs/design-notes/doc-reviewer-agent-introduction.md` (analyst 作成)
> - 既存 agent: `sandbox-runner.md`, `reviewer.md`, `security-auditor.md`,
>   `delivery-flow.md`, `discovery-flow.md`, `maintenance-flow.md`
> - `.claude/orchestrator-rules.md` 現行版 (HEAD `e56a58d`)

---

## 2. Design decisions (Open Questions の確定回答)

### 2.1 Q1: 既存 `reviewer` のリネーム是非 — **リネームしない**

analyst 仮判断を採用する。理由:

1. `reviewer` の "Spec Compliance" 観点と doc-reviewer のチェック方向は
   **直交関係** (reviewer = コード ↔ ドキュメントの垂直、doc-reviewer =
   ドキュメント ↔ ドキュメントの水平)。
2. リネームは破壊的変更で `commands/` / wiki / 過去の design-note への
   影響が大きい。
3. 名前空間としても `reviewer` (= 実装後の品質ゲート全般) と
   `doc-reviewer` (= 文書整合) は意味の重複が小さく、共存可能。

**確定アクション**: `reviewer.md` の Mission に `doc-reviewer` との境界を
1 段落追記する (compliance-auditor #56 と同じ追記スタイル)。具体文面は
§5.4 で確定。

### 2.2 Q3: rollback 上限の統合 — **既存 max-3 に統合**

analyst 仮判断を採用する。

**確定アクション**:
`.claude/orchestrator-rules.md` の "Rollback Rules" セクション冒頭に
`### Rollback Limit (Common)` という共通サブセクションを新設し、
"Rollbacks are limited to 3 times maximum." の記述をそこへ移す。
既存の "Test Failure Rollback Flow" / "Review CRITICAL Rollback Flow" /
新設する "Doc Review FAIL Rollback Flow" / 各 flow ファイル側の
Rollback Rules セクションは、上限値そのものは記述せず
「Common Rollback Limit を共有する」と参照する。

**重要な不変条件**: 既存 flow (delivery-flow.md `### Rollback Limit`、
discovery-flow.md "Rollbacks are limited to 3 times maximum"、
orchestrator-rules.md "Rollbacks are limited to 3 times maximum") の
**動作** (max 3) は変更しない。これはあくまで **値の出処を 1 箇所に
集約するリファクタ** である。

### 2.3 Q6: Minimal plan で mandatory にするか — **mandatory**

analyst 仮判断を採用する。理由:

1. doc-reviewer は read-only (`Tools: Read, Glob, Grep`) で破壊的操作を
   伴わない。
2. 計算コストも小さい (Bash や静的解析を実行しない、複数ファイル read
   のみ)。
3. ドキュメント整合は規模に依存しない品質要件 (むしろ Minimal の小規模
   プロジェクトで「コードと SPEC が乖離する」事故が多発する経験則がある)。

**確定アクション**:
- Delivery Minimal でも spec-designer / architect 直後に doc-reviewer を
  auto-insert (ux-designer は Minimal で走らないため対象外)。
- Discovery Minimal は scope-planner が走らない triage 構造のため
  「結果として doc-reviewer も走らない」 (Minimal で skip するのではなく
  「triage 起点が無い」)。
- Maintenance Patch は条件付き (SPEC.md 差分があるときのみ走る)。

FAIL 頻発時のユーザ回避策として、approval gate に
**"Approve despite findings"** を必須選択肢として追加する (§5.1.3)。

### 2.4 Q2 / Q4 / Q5 / Q7 / Q8 のレビュー結果

| Q | analyst 仮判断 | architect レビュー結果 |
|---|--------------|----------------------|
| Q2 | design-notes は `> Next: developer` または `> Next: architect` 記載のものだけ対象 | **採用**。draft / archived を含めると false-positive が増えてレビューノイズになる。実装は §3.4 Inputs で確定 |
| Q4 | discovery-flow は scope-planner 後のみ | **採用**。researcher / poc-engineer は単独文書しか産まないため整合チェック対象外 |
| Q5 | Markdown lint は対象外 | **採用**。ただし AGENT_RESULT の ADVISORY (🟡) 段に「重大な lint 違反 1〜2 件」を記載することは許容 (§3.5 Severity 定義) |
| Q7 | Tools = `Read, Glob, Grep` のみ | **採用**。Bash 不要。これにより sandbox-policy.md / commit 権限の議論が不要になる |
| Q8 | "post-insert" 型として表現可能 | **採用**。Sandbox Runner Auto-insertion のテンプレート構造 (Trigger Conditions / Double-Execution Prevention / Standalone Agent Fallback) を流用しつつ「pre-insert」/「post-insert」の方向違いだけを明記 |

---

## 3. doc-reviewer.md complete outline

`.claude/agents/doc-reviewer.md` の完全な section 構成。各 section の
配置順序、見出しレベル、必須内容を以下に確定する。
**実装本文は developer が書く** (本ドキュメントは骨格のみ)。

### 3.1 YAML front matter

```yaml
---
name: doc-reviewer
description: |
  Cross-cutting agent that reviews consistency among markdown artifacts
  (SPEC.md / ARCHITECTURE.md / UI_SPEC.md / docs/design-notes/ /
  DISCOVERY_RESULT.md). Auto-inserted by flow orchestrators after
  spec / design / scope / analyst agents.
  Used in the following situations:
  - Orchestrator inserts after spec-designer / ux-designer / architect /
    scope-planner / analyst (post-insertion)
  - User invokes standalone for ad-hoc consistency check
  Prerequisites: at least two markdown artifacts must exist for
  consistency comparison; runs in read-only mode.
tools: Read, Glob, Grep
model: sonnet
---
```

理由:
- `name` / `description` / `tools` / `model` は `reviewer.md` と
  `sandbox-runner.md` に倣う必須フィールド
- `model: sonnet` 選定理由: opus は overkill。整合チェックは構造的読解
  であり、複雑な推論は不要。コスト効率を優先
- `tools` から Bash を除外 (Q7 確定済み)
- `color` フィールドは既存 agent でも省略しているものが多いため省略する

### 3.2 Project-Specific Behavior block

`reviewer.md` / `sandbox-runner.md` と完全に同じ文面を踏襲。

```markdown
## Project-Specific Behavior

Before producing user-facing output, consult
`.claude/rules/project-rules.md` (via `Read`) and apply:

- `## Localization` → `Output Language` (see `.claude/rules/language-rules.md`)

If `.claude/rules/project-rules.md` is absent, apply defaults:
- Output Language: en

---
```

### 3.3 Mission section

1 段落 + reviewer / code との境界明示 1 段落 + 補足注 1 段落の構成。

要点:
- 「マークダウン成果物の **水平整合**」を担う agent
- `reviewer` (垂直整合 = コード ↔ SPEC.md) との直交関係を明示
- 「コードレビューはしない / README/CHANGELOG/wiki は対象外」を Mission 段落で先出し
- ファイルを生成しない (テキストレポートのみ) ことも明示

### 3.4 Inputs section

新設の必須セクション。`reviewer.md` の "Workflow" 内に埋め込まれている
入力読み込み手順を、doc-reviewer では独立した節として扱う。

```markdown
## Inputs

### Required
- 比較対象として最低 2 つの markdown artifact が存在すること

### Read order (priority)
1. SPEC.md (上流真実)
2. ARCHITECTURE.md (設計層)
3. UI_SPEC.md (UI 設計層、HAS_UI=true のみ)
4. DISCOVERY_RESULT.md (要件層)
5. INTERVIEW_RESULT.md (要件層、存在すれば)
6. docs/design-notes/<slug>.md
   - **対象条件**: header に `> Next: developer` または `> Next: architect` を含むもののみ
   - **対象外**: `docs/design-notes/archived/` 配下、`> Next: TBD` / `> Next: (none)` 等のドラフト
7. (任意) RESEARCH_RESULT.md / POC_RESULT.md / SCOPE_PLAN.md

### Behavior on missing inputs
- 比較対象が 1 件しか存在しない場合 → STATUS: success / DOC_REVIEW_RESULT: pass /
  INCONSISTENCY_COUNT: 0 / NOTES: "No comparison target available." を返して終了
- TRIGGERED_BY 指定の必須上流 (例: spec-designer 起動時の SPEC.md) が存在しない →
  STATUS: error
```

### 3.5 Five Review Perspectives

`reviewer.md` の 5 観点構造に揃える。各観点は subsection として記述。

#### 観点 1: Coverage (上流-下流の網羅性)

- DISCOVERY_RESULT.md の各要件 → SPEC.md UC への対応
- SPEC.md の各 UC → ARCHITECTURE.md のモジュール / エンドポイント
- SPEC.md UC (HAS_UI=true) → UI_SPEC.md SCR
- design-note (`> Linked Plan` 経由) → SPEC.md / ARCHITECTURE.md 差分への反映

#### 観点 2: Naming consistency (命名・参照整合性)

- UC-XXX / SCR-XXX / API-XXX 等 ID の renumber/rename 整合
- 用語集 (定義あれば) と本文の用語使用一致
- 参照されているファイルパス・agent 名の実在 (`Glob` で検証)

#### 観点 3: Scope alignment (スコープ整合性)

- DISCOVERY_RESULT.md IN/OUT ↔ SPEC.md SCOPE
- SPEC.md SCOPE (IN) ↔ ARCHITECTURE.md 実装対象
- SPEC.md SCOPE (OUT) と矛盾する設計が ARCHITECTURE.md に無いこと
- maintenance-flow: 削除/改訂された UC を別 UC が参照していないこと

#### 観点 4: Version traceability (バージョン整合性)

- ARCHITECTURE.md の `> Source: SPEC.md @ {date}` が SPEC.md
  `> Last updated: {date}` と一致
- design-note の `> GitHub Issue: [#N]` の実在 (リンク自体の到達確認は
  しない — Bash を持たないため。Grep で `> GitHub Issue:` 行の存在のみ確認)
- 同一フェーズ内で複数 agent が同一文書を更新する順序整合
  (例: spec-designer → architect が SPEC.md をどちらも更新するケース)

#### 観点 5: Acceptance reviewability (受け入れ基準と承認可能性)

- SPEC.md 各 UC に Acceptance Criteria が存在
- 受け入れ基準が **テスト可能** (定量的 / 観測可能 / 一意判定可能)
- maintenance-flow で改訂された Acceptance Criteria が既存テストを破壊
  していないこと

> **明示的に観点に含めない**:
> - Markdown 構文 lint レベル (markdownlint で別途)
> - 文体 / 表記ゆれ
> - README.md / CHANGELOG.md / wiki / commit message
> - コードコメント

### 3.6 Severity definition

3 段階モデルを採用。`reviewer.md` の CRITICAL/WARNING/SUGGESTION とは
名称を変えて、ドキュメント層であることを明示する。

| Severity | 略号 | 意味 | rollback 影響 |
|----------|-----|------|---------------|
| 🔴 INCONSISTENCY | DR-XXX | 上流-下流または横断の食い違い (修正必須) | FAIL → triggering agent へ rollback |
| 🟡 ADVISORY | DA-XXX | 改善推奨 (lint 寄り、軽微な表記揺れ等) | rollback 対象外 |
| 🟢 INFO | DI-XXX | 情報提供のみ | rollback 対象外 |

INCONSISTENCY が 1 件以上 → DOC_REVIEW_RESULT: fail
INCONSISTENCY 0 件 (ADVISORY/INFO のみ or 何もなし) → DOC_REVIEW_RESULT: pass

### 3.7 Output Report Format

ファイルは生成しない (`SECURITY_AUDIT.md` のような persistent artifact
にしない)。テキストレポートのみ。テンプレート skeleton (見出し) は英語固定、
narrative は Output Language に従う (analyst design-note §3.4 と同じ)。

```markdown
## Doc Review Report

### Target artifacts
- {path}: Last updated {date}
- ...

### Triggered by
{spec-designer | ux-designer | architect | scope-planner | analyst | standalone}

### Overall Assessment
{✅ PASS | ❌ FAIL}

---

### 🔴 INCONSISTENCY (must fix; rollback target)

#### [DR-001] {title}
- **Files:** `SPEC.md` ↔ `ARCHITECTURE.md`
- **Perspective:** {coverage | naming | scope | version | acceptance}
- **Inconsistency:** {何が食い違っているか}
- **Evidence:** SPEC.md UC-XXX (line 42) / ARCHITECTURE.md §3.2 (line 88)
- **Suggested fix:** {どちらをどう変更すべきか}

---

### 🟡 ADVISORY (recommended; not a rollback trigger)

#### [DA-001] {title}
- **Files:** ...
- **Detail:** ...

---

### 🟢 INFO

#### [DI-001] {title}
- **Detail:** ...

---

### Coverage matrix
| Upstream ID | Downstream reflection | Status |
|-------------|----------------------|--------|
| UC-001 | ARCHITECTURE.md §3.1, UI_SPEC.md SCR-001 | ✅ |
| UC-002 | ARCHITECTURE.md §3.2 | ⚠️ UI_SPEC.md SCR not found |
| UC-003 | (none) | ❌ design missing |

---

### Next Steps
→ INCONSISTENCY exists: orchestrator rolls back to {triggering agent}
→ ADVISORY only: pass; consider improvements at next opportunity
→ Empty: ✅ pass
```

### 3.8 AGENT_RESULT contract

```
AGENT_RESULT: doc-reviewer
STATUS: success | failure | error
DOC_REVIEW_RESULT: pass | fail
INCONSISTENCY_COUNT: {N}
ADVISORY_COUNT: {N}
INFO_COUNT: {N}
TARGET_ARTIFACTS:
  - {file path}: {Last updated date}
INCONSISTENCY_ITEMS:
  - {DR-XXX}: {short summary}
TRIGGERED_BY: spec-designer | ux-designer | architect | scope-planner | analyst | standalone
NEXT: {triggering agent on FAIL | done}
```

PASS/FAIL 決定ルール (analyst design-note §3.5 を踏襲):

| STATUS | DOC_REVIEW_RESULT | 条件 |
|--------|------------------|------|
| `success` | `pass` | INCONSISTENCY_COUNT == 0 |
| `failure` | `fail` | INCONSISTENCY_COUNT >= 1 |
| `error` | (n/a) | doc-reviewer 自身の例外 (ファイル読込失敗、入力不足など) |

> NOTES: 「`success` + `fail`」の組み合わせは無い。INCONSISTENCY を検出した
> ら STATUS は `failure`。これは reviewer.md の `STATUS: rejected` と
> 同等の意味。

### 3.9 Workflow section

```markdown
## Workflow

1. Read project-rules.md (Project-Specific Behavior block)
2. Identify TRIGGERED_BY (caller agent name; "standalone" if missing)
3. Read input artifacts per §3.4 priority order
   - Use Glob to enumerate docs/design-notes/<slug>.md candidates
   - Filter design-notes by `> Next: developer` or `> Next: architect` line
4. Run 5 review perspectives in order (coverage → naming → scope → version → acceptance)
5. Classify findings by severity (DR / DA / DI)
6. Build coverage matrix
7. Emit Doc Review Report (text only)
8. Emit AGENT_RESULT block
```

### 3.10 Standalone invocation section

`sandbox-runner.md` の "Non-Goals" / `compliance-auditor` の standalone
ガイドのスタイルを参考に、「orchestrator 不在時」のフォールバック手順を
記述する。

```markdown
## Standalone Invocation

When invoked directly by the user (no flow orchestrator):

1. TRIGGERED_BY を `standalone` として扱う
2. ユーザに対象アーティファクトを確認 (引数で渡されていない場合):
   - 「SPEC.md と ARCHITECTURE.md の整合チェックでよいか」を尋ねる
3. orchestrator が存在しないため rollback は発火しない
   - INCONSISTENCY を検出しても自動 rollback は行わず、ユーザに修正対象
     を提示するのみ
4. AGENT_RESULT.NEXT は常に `done`
```

### 3.11 Constraints / Out of scope section

`reviewer.md` の "Quality Criteria" 末尾と同じスタイル。

```markdown
## Out of Scope

- コードレビュー (これは `reviewer` の責務)
- README.md / CHANGELOG.md / wiki / commit message の整合
- Markdown 構文エラー検出 (markdownlint で別途実施)
- 自動修正 (auto-remediation) — 指摘のみで rollback による修正に委ねる
- `.claude/agents/*.md` 自体のメタ整合チェック (将来の self-check agent で扱う)
```

### 3.12 Completion conditions section

`reviewer.md` の末尾と同じ。

```markdown
## Completion Conditions

- [ ] All input artifacts per §3.4 priority were read
- [ ] All 5 review perspectives were evaluated
- [ ] Coverage matrix was generated
- [ ] AGENT_RESULT block was emitted
- [ ] DOC_REVIEW_RESULT was set to pass or fail (never undefined)
```

### 3.13 想定行数

`reviewer.md` (~200 行) と同等を上限目安。Bash と静的解析記述を持たない
ため、実装後は ~180 行前後を見込む。

---

## 4. orchestrator-rules.md changes

### 4.1 新規セクション "Doc Reviewer Auto-insertion"

挿入位置: 既存 "Sandbox Runner Auto-insertion" セクション (line 71〜115) の
**直後**。並列構造で記述する。

```markdown
---

## Doc Reviewer Auto-insertion

This section defines how flow orchestrators insert `doc-reviewer`
automatically after agents that produce or update markdown artifacts.

> **Insertion direction**: Unlike `sandbox-runner` (pre-insertion before a
> Bash command runs), `doc-reviewer` is **post-inserted** after the
> upstream agent emits its AGENT_RESULT. The Trigger Conditions /
> Double-Execution Prevention / Standalone Agent Fallback structure mirrors
> Sandbox Runner Auto-insertion but applies to the agent's exit, not entry.

### Trigger Conditions

The orchestrator inserts `doc-reviewer` **after** receiving an
`AGENT_RESULT` from the following agents:

| Flow | Trigger agents | Conditions |
|------|----------------|------------|
| delivery-flow | spec-designer, ux-designer, architect | All plans (Minimal+). ux-designer triggers only when HAS_UI=true |
| discovery-flow | scope-planner | Light/Standard/Full only. Minimal has no scope-planner so doc-reviewer is not triggered structurally. |
| maintenance-flow | analyst | Patch: only if `analyst.DOCS_UPDATED` contains SPEC.md (no_change → skip). Minor/Major: always |

### Double-Execution Prevention

The orchestrator tracks a per-phase insertion flag
`doc_reviewer_inserted_for_phase_id`. If set for the current phase, skip
auto-insertion. On rollback, the flag is reset before re-insertion.

### Standalone Agent Fallback

When a triggering agent (e.g., spec-designer) is invoked outside a flow
orchestrator, no auto-insertion happens. The user may invoke
`/doc-reviewer` manually.

### Invocation Format

```
Agent(
  subagent_type: "doc-reviewer",
  prompt: "Review markdown artifacts for cross-document consistency.
           triggered_by: {agent_name}
           target_artifacts: {paths}
           phase_id: {phase_id}",
  description: "doc review after {agent_name}"
)
```

Parse the returned `AGENT_RESULT` block:
- `STATUS: success` and `DOC_REVIEW_RESULT: pass` → proceed to approval gate
- `STATUS: failure` and `DOC_REVIEW_RESULT: fail` → enter Doc Review FAIL Rollback Flow (§Rollback Rules)
- `STATUS: error` → follow Common Error Handling
```

### 4.2 既存 "Rollback Rules" セクションの拡張

挿入位置: line 418 以降。`### Rollback Limit (Common)` を新設。

#### 4.2.1 Rollback Limit を共通化

現状: line 420-421
> Rollbacks are limited to **3 times maximum**. If exceeded, report the
> situation to the user and ask for their decision.

これを以下に置き換える:

```markdown
### Rollback Limit (Common)

Rollbacks are limited to **3 times maximum**, applied as a single shared
limit across:
- Test failure rollback
- Review CRITICAL rollback
- Security audit CRITICAL rollback
- **Doc review FAIL rollback (new)**

If the limit is exceeded, report to the user and ask for their decision
(see "Approve despite findings" option in Approval Gate, when applicable).
The per-flow rollback sections below inherit this limit and must not
declare their own.
```

#### 4.2.2 "Doc Review FAIL Rollback Flow" 新設

挿入位置: 既存 "Review CRITICAL Rollback Flow" (line 442〜446) の直後。

```markdown
### Doc Review FAIL Rollback Flow

```
doc-reviewer (DOC_REVIEW_RESULT: fail)
  → triggering agent (spec-designer / ux-designer / architect /
                      scope-planner / analyst) で修正
    → doc-reviewer (re-check)
```

Triggering agent への rollback prompt:

```
## Doc Review Rollback

### Rollback source
doc-reviewer

### Inconsistencies
{INCONSISTENCY_ITEMS list with perspective and evidence}

### Files to fix
{file paths from INCONSISTENCY_ITEMS}

### Constraints
- 既存の他 UC / 他文書を壊さない
- 修正完了後 AGENT_RESULT を再出力すること
- ARCHITECTURE.md と SPEC.md の双方を編集する場合、両方の Last updated を
  更新すること
```

After rollback, the orchestrator clears the
`doc_reviewer_inserted_for_phase_id` flag and re-runs `doc-reviewer`.
```

### 4.3 Approval Gate に "Approve despite findings" 選択肢追加

挿入位置: line 374-415 の "Approval Gate" セクション。

doc-reviewer が `DOC_REVIEW_RESULT: fail` を返し、かつ rollback Limit
(max 3) に達した場合のみ表示する第 4 選択肢として追加する。
通常の approval gate (Phase N 完了時) には追加しない。

```markdown
### Approval Gate after Doc Review FAIL (rollback limit exceeded)

When `doc-reviewer` repeatedly fails and the shared rollback limit is
reached, the orchestrator presents a special gate:

```json
{
  "questions": [{
    "question": "doc-reviewer reported {N} inconsistencies after {3} rollbacks. How would you like to proceed?",
    "header": "Doc review failed",
    "options": [
      {"label": "Continue rollback", "description": "Override the 3-time limit and try once more"},
      {"label": "Approve despite findings", "description": "Accept INCONSISTENCY findings and continue to next phase"},
      {"label": "Abort", "description": "Stop the workflow"}
    ],
    "multiSelect": false
  }]
}
```

If "Approve despite findings" is selected, record this in the phase
completion log and tag the eventual AGENT_RESULT chain with
`DOC_REVIEW_OVERRIDE: true` so downstream artifacts (e.g.,
DELIVERY_RESULT.md) reflect that an override occurred.
```

---

## 5. Per-flow patch specifications

### 5.1 delivery-flow.md

#### 5.1.1 Managed Flows (Standard Plan example) (line 103〜116)

各該当 phase の直後に "→ doc-reviewer (auto)" を追記する。phase 番号は
据え置き、auto-insert は番号を消費しない (orchestrator-rules.md の
Auto-insertion セクションで定義)。

差分:

```diff
 ### New Development (Standard Plan Example)
 ```
-Phase 1:  Spec definition        → spec-designer      → ⏸ User approval
-Phase 2:  UI design              → ux-designer        → ⏸ User approval  (UI projects only)
-Phase 3:  Architecture design    → architect          → ⏸ User approval
+Phase 1:  Spec definition        → spec-designer      → doc-reviewer (auto) → ⏸ User approval
+Phase 2:  UI design              → ux-designer        → doc-reviewer (auto) → ⏸ User approval  (UI projects only)
+Phase 3:  Architecture design    → architect          → doc-reviewer (auto) → ⏸ User approval
 Phase 4:  Project initialization → scaffolder         → ⏸ User approval
 Phase 5:  Implementation         → developer          → ⏸ User approval
 ...
 ```
```

triage table (line 60-65) は変更しない (auto-insert は triage に出ない)。

#### 5.1.2 Rollback Rules セクション (line 184〜262)

"Rollback Flow on Security Audit CRITICAL" (line 232〜239) の **直後** に
新セクション挿入:

```markdown
### Rollback Flow on Doc Review FAIL

```
doc-reviewer (FAIL detected)
  → triggering agent (spec-designer / ux-designer / architect)
    → doc-reviewer (re-check)
```

Limit: shared via orchestrator-rules.md "Rollback Limit (Common)".
On limit exceeded, the orchestrator presents the
"Approve despite findings" gate (see orchestrator-rules.md Approval Gate
after Doc Review FAIL).
```

`### Rollback Limit` (line 241〜245) を以下に書き換える:

```markdown
### Rollback Limit

Inherits the shared limit from `.claude/orchestrator-rules.md`
"Rollback Limit (Common)" (max 3 across test / review / security audit /
doc review failures).
```

#### 5.1.3 Progress Display (line 294〜325)

doc-reviewer が走った phase は "Phase N (+ doc-review ✅)" のように追記。
ただしこれは optional (developer 判断)。最低限、completion summary に
"Doc review: ✅ {N pass} / ❌ {N fail}" 行を追加する。

### 5.2 discovery-flow.md

#### 5.2.1 Managed Flows 各プラン (line 191〜221)

Light / Standard / Full の最終 Phase (scope-planner) の行を以下のように
修正:

```diff
-Phase 3: Scope definition        → scope-planner     → ⏸ User approval → Done
+Phase 3: Scope definition        → scope-planner     → doc-reviewer (auto) → ⏸ User approval → Done
```

(Standard では Phase 5、Full では Phase 6 が同様に修正対象)

Minimal Plan (line 191〜195) は scope-planner が走らない。以下の脚注を
セクション末尾に追加:

```markdown
> **Note on Minimal**: Minimal plan ends after `interviewer`. Since
> `doc-reviewer` is triggered post-`scope-planner`, it is not invoked in
> Minimal. This is by structural absence, not by an explicit "skip" rule.
```

#### 5.2.2 Rollback Rules (line 225〜279)

"Pattern 2" (line 258〜279) の **直後** に "Pattern 3" を追加:

```markdown
### Pattern 3: doc-reviewer FAIL → scope-planner

```
doc-reviewer (DOC_REVIEW_RESULT: fail, TRIGGERED_BY: scope-planner)
  → scope-planner (修正)
    → doc-reviewer (再チェック)
```

Pass to scope-planner during rollback:

```
## Rollback: Doc review failed

### Rollback source
doc-reviewer

### Inconsistencies
{INCONSISTENCY_ITEMS list with perspective and evidence}

### Files to fix
DISCOVERY_RESULT.md (and possibly INTERVIEW_RESULT.md / SCOPE_PLAN.md)

### Request
- Resolve the inconsistencies above without removing already-confirmed
  requirements
- Re-emit AGENT_RESULT after fixing
```

Limit: shared via orchestrator-rules.md "Rollback Limit (Common)".
```

`### Rollback Limit` 相当の記述 (line 228) は以下に書き換え:

```markdown
Rollbacks are limited per `.claude/orchestrator-rules.md` "Rollback Limit
(Common)" (max 3 across all rollback types).
```

### 5.3 maintenance-flow.md

#### 5.3.1 Managed Flows 各 Plan (line 76〜111)

Patch / Minor / Major の analyst 行の直後に条件付き auto を追加:

```diff
-Phase 2: Issue creation / approach        → analyst            → ⏸ User approval
+Phase 2: Issue creation / approach        → analyst            → doc-reviewer (conditional auto) → ⏸ User approval
```

(Minor は Phase 3、Major は Phase 3 の analyst 行が対象)

各 plan 末尾に注記を追加:

```markdown
> **Conditional auto for doc-reviewer (Patch only)**: doc-reviewer is
> auto-inserted only when `analyst.DOCS_UPDATED` contains SPEC.md or
> ARCHITECTURE.md with a non-empty diff. If `DOCS_UPDATED` reports
> SPEC.md as `no_change`, doc-reviewer is skipped (no rollback chain
> formed).
> Minor and Major always invoke doc-reviewer after analyst.
```

#### 5.3.2 Rollback Rules table (line 154〜163)

既存テーブルに 1 行追加:

```diff
 | Trigger | Roll Back To | Notes |
 |---------|-------------|-------|
 | tester failure | developer | Max 3 retries |
 | reviewer CRITICAL | developer | Minor only (Patch has no reviewer) |
 | security-auditor CRITICAL | developer | Major only (pre-audit detection) |
 | developer blocked | architect (differential mode) | Minor only. Patch rolls back to analyst |
+| doc-reviewer FAIL | analyst | All plans (Patch only when triggered). Shares Rollback Limit (Common) |
```

冒頭の "Inherits ... Rollback Rules" 行はそのまま。Rollback Limit は
common 参照になるため、新規上限値は記載しない。

### 5.4 reviewer.md (boundary clarification)

挿入位置: Mission section (line 30〜34) の直後、`---` (line 36) の **前**。

```diff
 ## Mission

 Review implementation code from both `SPEC.md` (spec compliance) and `ARCHITECTURE.md` (design consistency) perspectives,
 and generate a quality report. **You do not modify code; you focus solely on presenting feedback.**

 **Note:** Security aspects are handled by `security-auditor`, so this agent does not perform deep security inspections. Obvious issues (such as hardcoded passwords) are flagged, but systematic checks like OWASP Top 10 are delegated to security-auditor.

+> **Boundary with `doc-reviewer`:** This agent reviews implementation
+> code against SPEC.md / ARCHITECTURE.md (vertical consistency).
+> Cross-document consistency among markdown artifacts (SPEC.md ↔
+> ARCHITECTURE.md ↔ UI_SPEC.md ↔ design-notes) is owned by
+> `doc-reviewer`, which is auto-inserted by flow orchestrators after
+> spec / design / scope / analyst agents.
+
 ---
```

### 5.5 aphelion-overview.md (registry)

> **Note**: 本リポジトリには `.claude/rules/aphelion-overview.md` は存在しない
> (user-level global にのみ存在)。リポジトリ内に配置された aphelion-overview を
> 想定しているプロジェクト向けに、developer は **更新が反映されるべきパス**
> を `Glob` で確認した上で更新する。本リポジトリにファイルが無ければ更新作業は
> skip し、AGENT_RESULT に `APHELION_OVERVIEW_UPDATED: skipped (file not found in repo)`
> を記載する。

存在する場合の差分:

#### 5.5.1 Update history 追記

```diff
 > **Last updated**: 2026-04-24
 > **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
 > 更新履歴:
 >   - 2026-04-24: Maintenance Flow (第4フロー) を追加
+>   - 2026-04-30: doc-reviewer (cross-cutting agent) を追加 (#91)
```

`> **Last updated**: 2026-04-24` 行も `2026-04-30` に更新。

#### 5.5.2 Agent Directory に doc-reviewer 追記

`## Agent Directory` セクション末尾に以下を追加:

```markdown
### Cross-cutting agents

| Agent | Tools | Purpose | Invocation |
|-------|-------|---------|------------|
| `sandbox-runner` | Read, Bash, Grep | High-risk command execution | Auto-insert (Standard+) / explicit delegation |
| `doc-reviewer` | Read, Glob, Grep | Markdown artifact consistency review | Auto-insert (all plans) / standalone |
```

#### 5.5.3 Domain and Flow Overview 図への補足

既存の図 (line 30〜39) の直後に以下の注を追加:

```markdown
> **Cross-cutting agents** (`sandbox-runner`, `doc-reviewer`) are not
> tied to a single domain. They are auto-inserted by flow orchestrators
> at trigger conditions defined in `.claude/orchestrator-rules.md`.
```

---

## 6. localization-dictionary.md additions

> **Note**: 本リポジトリには `.claude/rules/localization-dictionary.md`
> は存在しない (user-level global にのみ存在)。本リポジトリに **配置されて
> いる場合のみ** 更新する。なければ §5.5 と同様に `LOCALIZATION_DICTIONARY_UPDATED:
> skipped (file not found in repo)` を AGENT_RESULT に記載。

存在する場合の追加項目:

### Approval Gate 表に 1 行追加

```diff
 | key                    | en                                                                                   | ja                                                                           |
 |------------------------|--------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
 | phase_complete_header  | "Phase {N} complete: {agent}"                                                        | "Phase {N} 完了: {agent}"                                                    |
 | artifacts_label        | "Generated artifacts"                                                                | "生成された成果物"                                                            |
 | content_summary_label  | "Summary"                                                                            | "内容サマリー"                                                                |
 | approval_question      | "Phase {N} artifacts reviewed. Proceed to the next phase?"                           | "Phase {N} の成果物を確認しました。次のフェーズに進みますか？"                |
 | approve_and_continue   | "Approve and continue"                                                               | "承認して続行"                                                                |
 | request_modification   | "Request modification"                                                               | "修正を指示"                                                                  |
 | abort                  | "Abort"                                                                              | "中断"                                                                        |
+| approve_despite_findings | "Approve despite findings"                                                         | "指摘を承知の上で承認"                                                       |
+| continue_rollback      | "Continue rollback"                                                                  | "rollback を継続"                                                            |
+| doc_review_failed_header | "Doc review failed"                                                                | "ドキュメントレビュー失敗"                                                   |
+| doc_review_failed_question | "doc-reviewer reported {N} inconsistencies after {M} rollbacks. How would you like to proceed?" | "doc-reviewer が {M} 回の rollback 後も {N} 件の不整合を報告しています。どう進めますか？" |
```

---

## 7. PR strategy (final decision)

analyst design-note §8.3 の推奨と同じく **2 PR 分割** を採用する。

| PR | 内容 | ファイル | 依存 |
|----|------|---------|------|
| **PR 1** | doc-reviewer 本体 + orchestrator-rules + reviewer 境界 | `.claude/agents/doc-reviewer.md` (新規), `.claude/orchestrator-rules.md` (編集), `.claude/agents/reviewer.md` (Mission 1 段落追記) | なし |
| **PR 2** | 各 flow への配線 | `.claude/agents/delivery-flow.md`, `discovery-flow.md`, `maintenance-flow.md` (+ aphelion-overview.md / localization-dictionary.md があれば) | PR 1 |

**理由**:
- PR 1 のみで `/doc-reviewer` standalone 起動は機能する (orchestrator
  経由でなくても agent は動く)。レビュアの認知負荷を分割する効果がある
- PR 2 は配線のみで、実装ロジックの議論が PR 1 で済んでいる前提
- 1 PR 統合案 (7 ファイル) は、reviewer 観点で「設計議論」と「機械的
  配線」が混じり review 効率が落ちる

PR 1 単体で **半機能状態** が出来上がる点は許容する (orchestrator が
auto-insert しないだけで、agent としては正常)。

---

## 8. Implementation checklist for developer

### 8.1 Phase 1 (PR 1)

- [ ] `.claude/agents/doc-reviewer.md` を新規作成 (§3 outline に従う)
  - [ ] YAML frontmatter (§3.1)
  - [ ] Project-Specific Behavior block (§3.2)
  - [ ] Mission section + reviewer 境界 (§3.3)
  - [ ] Inputs section (§3.4) — design-note フィルタ条件含む
  - [ ] 5 Review Perspectives (§3.5)
  - [ ] Severity definition table (§3.6)
  - [ ] Output Report Format sample (§3.7)
  - [ ] AGENT_RESULT contract (§3.8)
  - [ ] Workflow section (§3.9)
  - [ ] Standalone invocation section (§3.10)
  - [ ] Out of scope section (§3.11)
  - [ ] Completion conditions (§3.12)
  - [ ] 行数確認 (~180 行目安、最大 200 行)
- [ ] `.claude/orchestrator-rules.md` 編集
  - [ ] "Doc Reviewer Auto-insertion" セクション追加 (§4.1)
  - [ ] "Rollback Limit (Common)" 共通化 (§4.2.1)
  - [ ] "Doc Review FAIL Rollback Flow" 追加 (§4.2.2)
  - [ ] "Approval Gate after Doc Review FAIL" 追加 (§4.3)
  - [ ] **既存の Test/Review CRITICAL rollback 動作が変化していないこと** を git diff で確認
- [ ] `.claude/agents/reviewer.md` 編集
  - [ ] Mission section に境界記述 1 段落追記 (§5.4)
- [ ] PR 1 の commit message: `feat: introduce doc-reviewer agent (#91)`
- [ ] PR 1 の body に `Closes #91` ではなく `Linked Issue: #91` (PR 2 で
      最終的に閉じるため)

### 8.2 Phase 2 (PR 2)

- [ ] `.claude/agents/delivery-flow.md` 編集
  - [ ] Managed Flows の Phase 1/2/3 行に "→ doc-reviewer (auto)" 追記 (§5.1.1)
  - [ ] Rollback Rules に Rollback Flow on Doc Review FAIL 追加 (§5.1.2)
  - [ ] Rollback Limit を Common 参照に書き換え
- [ ] `.claude/agents/discovery-flow.md` 編集
  - [ ] 各 plan の最終 Phase 行に "→ doc-reviewer (auto)" 追記 (§5.2.1)
  - [ ] Minimal の構造的 skip 注記追加
  - [ ] Rollback Rules に Pattern 3 追加 (§5.2.2)
- [ ] `.claude/agents/maintenance-flow.md` 編集
  - [ ] 各 plan の analyst 行に "→ doc-reviewer (conditional auto)" 追記 (§5.3.1)
  - [ ] Conditional auto 注記追加
  - [ ] Rollback Rules table に doc-reviewer FAIL 行追加 (§5.3.2)
- [ ] `.claude/rules/aphelion-overview.md` (存在すれば、§5.5)
  - [ ] Update history 追記
  - [ ] Agent Directory に Cross-cutting agents 表追加
  - [ ] Domain and Flow Overview 図に注追加
- [ ] `.claude/rules/localization-dictionary.md` (存在すれば、§6)
  - [ ] Approval Gate 表に 4 行追加
- [ ] PR 2 の commit message: `feat: wire doc-reviewer into all three flows (#91)`
- [ ] PR 2 の body に `Closes #91`

### 8.3 commit 単位

- PR 1 は 3 commit 推奨 (doc-reviewer / orchestrator-rules / reviewer
  境界 を別コミット)
- PR 2 は 4 commit (delivery / discovery / maintenance / overview+dict)

### 8.4 行数 sanity check

| ファイル | 既存 | 想定後 |
|----------|------|--------|
| doc-reviewer.md (新規) | — | ~180 |
| orchestrator-rules.md | ~446 | ~530 |
| reviewer.md | ~197 | ~205 |
| delivery-flow.md | ~372 | ~395 |
| discovery-flow.md | ~379 | ~415 |
| maintenance-flow.md | ~322 | ~335 |

---

## 9. Test strategy

### 9.1 自己テストの限界

本リポジトリ (Aphelion 本体) には SPEC.md / ARCHITECTURE.md が存在しない
(`.claude/agents/*.md` 自身が「アーキテクチャ成果物」)。したがって
**doc-reviewer を本リポジトリに対して実行しても比較対象が無い** ため、
フル機能テストは実施できない。これは analyst design-note §7 (Out of
scope #5) で既に確認済み。

### 9.2 採用するテスト手段

| 種別 | 手段 | 場所 |
|------|------|------|
| 形式テスト | YAML frontmatter / markdown lint | `.claude/agents/doc-reviewer.md` 本体に対し developer が手動実行 |
| 構造テスト | 必須セクション (Mission / Inputs / 5 Perspectives / AGENT_RESULT) の存在を grep で確認 | developer が `grep -E '^## ' .claude/agents/doc-reviewer.md` で目視確認 |
| 動作テスト (PASS シナリオ) | 整合した SPEC.md + ARCHITECTURE.md fixture で起動 → INCONSISTENCY_COUNT=0 を期待 | 別リポジトリ (developer が選定。例: Aphelion で過去 spec-designer を走らせた sample プロジェクト) |
| 動作テスト (FAIL シナリオ) | 故意に UC を 1 つ落とした SPEC.md + ARCHITECTURE.md で起動 → INCONSISTENCY_COUNT>=1 を期待 | 同上 |
| 統合テスト | delivery-flow を auto-approve mode で走らせ doc-reviewer が auto-insert されることを確認 | 別リポジトリ |

### 9.3 fixture 推奨

developer は本リポジトリ内に **fixture サンプル** (架空の SPEC.md /
ARCHITECTURE.md ペア) を **配置しない** こと。理由:
- `.claude/rules/file-operation-principles.md`「設計文書に存在しない
  ディレクトリは作らない」原則に反する
- fixture は別 issue (analyst design-note §6.2) で `docs/examples/`
  配下に配置を検討する案があるが、本 issue の scope 外

### 9.4 acceptance check (分散実行)

PR 1 マージ後、開発者は以下を手動確認:

```bash
# YAML frontmatter parse
head -20 .claude/agents/doc-reviewer.md

# 必須セクションの存在
grep -E '^## (Project-Specific Behavior|Mission|Inputs|.*Review Perspectives|.*Output|AGENT_RESULT|Workflow|Standalone|Out of Scope|Completion Conditions)$' .claude/agents/doc-reviewer.md

# Tools 行の確認 (Bash が含まれていないこと)
grep -E '^tools:' .claude/agents/doc-reviewer.md
```

---

## 10. Rollback / failure mode considerations

### 10.1 既存挙動を変えない不変条件

- delivery-flow.md / discovery-flow.md / maintenance-flow.md の
  既存 rollback 上限 (max 3) の **挙動値** は変更しない。値の出処を
  orchestrator-rules.md 共通セクションに集約するだけのリファクタである
- security-auditor の必須性 (Delivery 全プラン) は変更しない
- analyst の side-entry ステータスは変更しない

### 10.2 想定する failure mode

| Failure | 原因 | 対処 |
|---------|------|------|
| doc-reviewer FAIL が 3 回連続 | INCONSISTENCY を機械的に直しきれないケース (SPEC 自身の構造的欠陥など) | "Approve despite findings" でユーザに最終判断を委ねる (§4.3) |
| doc-reviewer がエラー (STATUS: error) | 入力ファイル読込失敗 / 想定外のフォーマット | Common Error Handling を踏襲 (Retry / Skip / Abort)。auto-approve mode では Retry × 3 |
| auto-insertion で同一 phase の二重実行 | rollback 後に flag リセット忘れ | `doc_reviewer_inserted_for_phase_id` flag を確実にリセット (§4.1 Double-Execution Prevention) |
| standalone 起動 + 比較対象 1 件のみ | ユーザが SPEC.md だけを渡した | STATUS: success / pass / "No comparison target available" の NOTES を返す (§3.4 Behavior on missing inputs) |
| reviewer.md 境界記述追加で既存 Mission 文面が破損 | 編集ミス | PR 1 の git diff で `git diff .claude/agents/reviewer.md` を目視確認。新規追加 1 段落以外の差分が出ないこと |

### 10.3 ロールアウト戦略

- PR 1 マージ直後: doc-reviewer は orchestrator から auto-insert され
  ない (PR 2 まで wiring なし)。standalone 起動でのみ機能する
- PR 2 マージ直後: 全 flow から auto-insert される。**既存ユーザの
  ワークフローに新たな承認ゲートが 1〜3 件追加される** ため、CHANGELOG
  および wiki に Breaking-ish change として記載する (developer が PR 2
  description に記載)
- 万一問題発生時: PR 2 を revert すれば PR 1 の状態に戻り、ユーザに
  影響を与えない (graceful degradation)

---

## Implementation handoff to developer

本書の §3〜§10 を順に消化することで `.claude/agents/doc-reviewer.md`
本体および各 flow への配線が完了する。実装中に設計上の疑問が出た場合は
`AGENT_RESULT.STATUS: blocked` で architect に差し戻すこと。
