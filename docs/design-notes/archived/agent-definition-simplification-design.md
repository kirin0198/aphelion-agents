# Design Note: #131 §① AGENT_RESULT slim

> Last updated: 2026-05-15
> GitHub Issue: [#131](https://github.com/kirin0198/aphelion-agents/issues/131)
> Authored by: architect (2026-05-15)
> Branch: refactor/agent-definition-consolidation
> Source planning doc: docs/design-notes/agent-definition-simplification.md
> Next: developer (PR-1 implementation)
> Related: token-reduction.md (#132) — coordination noted in §"#132 handoff" below

## 0. 目的

本書は #131 PR-1 の §① "AGENT_RESULT のシンプル化" について architect 設計判断を確定する。
planning doc §"PR-1 着手前の architect open question" の 3 件に answer する形で記述する。
PR-1 §② (Project-Specific Behavior consolidation) は mechanical 削除であり architect の
設計入力は不要だが、developer の commit 順を明確化する責任は本書が持つ。

## 1. 重要な再計測 (planning doc の前提検証)

planning doc は「40 agent files」を前提に削減規模を見積もっていたが、実測の結果:

| 区分 | ファイル数 | 備考 |
|---|---|---|
| AGENT_RESULT を持つ agent | **37** | `grep -l "^AGENT_RESULT:" .claude/agents/*.md` |
| AGENT_RESULT を持たない flow orchestrator | **3** | `discovery-flow.md` / `delivery-flow.md` / `operations-flow.md` (planning doc 言及通り `agent-communication-protocol.md` の "Flow orchestrator exception" 適用) |
| 計 | **40** | |

planning doc の "40 agent × 15 行" は実態とは少しずれる。実測 (developer.md L341–361 = 21 行 /
analyst.md L401–420 = 20 行 / spec-designer.md L169–180 = 12 行) の平均は約 17 行。
ただし「~5 行に短縮」というゴールは妥当 (§5 で検証)。

## 2. Open question への answer

### Q1: `agent-communication-protocol.md` §"Field Reference" の形式 (テーブル vs 小見出し列挙)

**Decision: テーブル形式 (1 行 1 field)。**

#### Trade-offs

| 形式 | Pros | Cons |
|---|---|---|
| テーブル (採用) | 1 field = 1 row で目視走査が高速。LLM が "STATUS の値域は?" と問われたとき即引ける。垂直スペース効率が良い (30 行で 20 field をカバー可) | 値域が複数行に渡る field (例: `STATUS` の 8 状態) は `\|` 区切りで横長になりがち |
| 小見出し列挙 (`### STATUS` / `### NEXT` …) | 各 field の補足が書きやすい。markdown 目次ジャンプが効く | 20 field を `###` で並べると 60 行超で auto-load コスト増。CONSTRAINT (30 行以下) を満たせない |

採用理由: 制約 (30 行以下) を満たすにはテーブル一択。値域が長い field は `\|` で改行せず短縮表記
(例: `STATUS` は 8 状態を全列挙する代わりに "see protocol §STATUS Definitions" とリンク)。

#### Auto-load コストの確認

現状 `agent-communication-protocol.md` 全体は 86 行 (auto-load 対象)。
Field Reference 節を **+28 行** 追加して 114 行 (32% 増)。
これは #132 §B (aphelion-overview.md 軽量化) の効果でほぼ相殺されるため、
プロジェクト全体の auto-load 総量は微増にとどまる。

### Q2: protocol-canonical fields と agent-specific fields の境界

**Decision: 「2 agent 以上で emit され、かつ orchestrator が `STATUS` 同様に挙動分岐に使う field」のみ protocol に集約する。それ以外は agent prompt に残す。**

#### 全 field のカテゴリ分類 (実測ベース)

37 agent の AGENT_RESULT を grep し、重複検出。

##### (a) Protocol-canonical (Field Reference に集約。agent 側からは値域定義を削除)

これらは複数 agent で共通の値域を持つか、orchestrator が状態遷移判断に使う。

| Field | 出現 agent 数 | 値域 / 用途 |
|---|---|---|
| `STATUS` | 37 (全 agent) | success / error / failure / suspended / blocked / approved / conditional / rejected |
| `NEXT` | 37 (全 agent) | {next-agent-name} / done / suspended |
| `ARTIFACTS` | 23 | 生成ファイルの list (legacy field; 順次 `ARTIFACT_PATHS` に統合) |
| `ARTIFACT_PATHS` | 2 + 将来全 write agent | resolved file paths (document-locations.md 連携) |
| `BLOCKED_TARGET` | 2 (developer, analyst implicit) | 質問先 agent 名 |
| `BLOCKED_REASON` | 2 | freeform 説明 |
| `BRANCH` | 2 (developer, analyst) | 作業ブランチ名 (#136 で追加) |
| `PR_URL` | 1 (developer) | PR URL / skipped / reused |
| `HANDOFF_TO` | 2 (analyst, maintenance-flow) | 次フロー名 |
| `DECISION` | 1 (sandbox-runner) | execute / blocked / fallback |
| `DOC_REVIEW_RESULT` | 1 (doc-reviewer) | passed / has-inconsistencies |
| `MODE` | 3 (researcher, interviewer, test-designer, e2e-test-designer) | normal / rollback |
| `GITHUB_ISSUE` | 1 (analyst) + flow context | issue URL / skipped |
| `DENIAL_CATEGORY` / `DENIAL_COMMAND` / `DENIAL_RECOVERY` | conditional (Bash agents) | denial-categories.md 定義済 |

`PR_URL` / `GITHUB_ISSUE` は 1 agent しか emit しないが、**仕様上 `git-rules.md` が定義した共通フィールド**
なので protocol-canonical として扱う (git-rules.md と protocol.md でクロス参照)。

`DENIAL_*` は `denial-categories.md` 側に既に正規定義あり。protocol §Field Reference からは
"see denial-categories.md §4" の 1 行リンクのみ。

##### (b) Agent-specific (agent prompt に残す)

各 agent の固有 metrics / 結果報告 field。重複が無いか 1 agent でしか意味を持たないため、
agent prompt 内に値域を残して LLM が prompt を読む段階で文脈に持つことを優先。

| Field | Owner agent | 値域 |
|---|---|---|
| `ISSUE_TYPE` / `ISSUE_SUMMARY` / `DOCS_UPDATED` / `ARCHITECT_BRIEF` | analyst | analyst 固有 |
| `PHASE` / `TASKS_COMPLETED` / `LAST_COMMIT` / `LINT_CHECK` / `FILES_CHANGED` / `ACCEPTANCE_CHECK` / `FAILED_CONDITIONS` / `CURRENT_TASK` | developer | developer 固有 |
| `HAS_UI` / `PRODUCT_TYPE` / `TBD_COUNT` | spec-designer / codebase-analyzer / interviewer | 3 agent 間で値域が同じため protocol に上げる候補だが、§3 で「3 agent 間の重複は許容範囲」と判定 |
| `TECH_STACK` / `TECH_STACK_CHANGED` / `PHASES` | architect | architect 固有 |
| `TOTAL` / `PASSED` / `FAILED` / `SKIPPED` / `FAILED_TESTS` | tester | tester 固有 |
| `CRITICAL_COUNT` / `WARNING_COUNT` / `SUGGESTION_COUNT` / `CRITICAL_ITEMS` | reviewer, security-auditor | 2 agent で同じ値域だが意味は別 (review vs audit) — agent 側に残す |
| `OUTPUT_FILE` / `TEMPLATE_USED` / `TEMPLATE_VERSION` / `INPUT_ARTIFACTS` / `SKIPPED_SECTIONS` | 6 doc-flow author agents (hld/lld/ops-manual/api-reference/user-manual/handover) | 6 agent で同じ値域。doc-flow 系として protocol §Field Reference の脚注で参照する候補だが §3 で agent-specific 扱い (理由: doc-flow 専用で他 agent 横断しない) |
| `RELEVANT_UCS` | 未実装 (#132 §A) | 将来 |

##### Edge case の扱い

- **`RELEVANT_UCS` (#132 §A 予定)**: 現時点で未実装。boundary は将来追加を阻害しない設計とする。
  → Field Reference 節は **"Adding a new canonical field" 手順を 1 行だけ含める** (§3 §"How to add")。
  #132 で `RELEVANT_UCS` が複数 agent (developer → tester / security-auditor) に拡張されたら
  その時点で Field Reference に昇格させる。本 PR-1 では追加しない。
- **`BRANCH` (#136 で追加, Planning-tier 固有)**: 現状 analyst / developer の 2 agent で emit。
  既に protocol-canonical 基準を満たすため、Field Reference に含める。
- **`DENIAL_*`**: 条件付き emit (sandbox 拒否時のみ)。Field Reference には "Conditional fields"
  のサブセクションを設けて 1 行リンクで参照。値域定義は `denial-categories.md` §4 が canonical。
- **`ARTIFACTS` vs `ARTIFACT_PATHS`**: 現在は legacy `ARTIFACTS` と新規 `ARTIFACT_PATHS` が併存。
  protocol §Field Reference では `ARTIFACT_PATHS` を **canonical**、`ARTIFACTS` を **deprecated
  (kept for backward compat; agent-specific level での list of filenames)** と明示する。
  agent 側で `ARTIFACTS` を `ARTIFACT_PATHS` に置換する mechanical refactor は本 PR-1 のスコープ外
  (将来 PR-2 候補)。

### Q3: テンプレ削除後の最小記述例 (5 行以下)

**Decision: 以下の 5 行テンプレを全 37 agent (orchestrator 3 件を除く) に適用する。**

```markdown
## Output on Completion (Required)

Emit an `AGENT_RESULT` block. Required fields: `STATUS`, `NEXT`{, plus agent-specific list below}.
Agent-specific fields: {comma-separated list}.
See `.claude/rules/agent-communication-protocol.md` §"Field Reference" for canonical field semantics.

{1-line note on agent-specific behavior, e.g. "When HAS_UI: true, set NEXT: ux-designer"}
```

実体は 5 行 (見出し + 3 lines of instruction + 1 conditional note)。
条件分岐ノートが不要な agent (例: tester) は 4 行で済む。

## 3. 提案する `agent-communication-protocol.md` §"Field Reference" (fenced block)

```markdown
## Field Reference

Canonical definitions for AGENT_RESULT fields emitted by 2+ agents or parsed
by the orchestrator. Agent-specific fields are documented in each agent file.

| Field | Type / Values | Notes |
|---|---|---|
| `STATUS` | success \| error \| failure \| suspended \| blocked \| approved \| conditional \| rejected | See §"STATUS Definitions". |
| `NEXT` | {agent-name} \| done \| suspended | Routing hint for the orchestrator. |
| `ARTIFACT_PATHS` | `- <NAME>: <resolved path>` list | MUST when STATUS=success and agent wrote ≥1 artifact. See `document-locations.md`. |
| `ARTIFACTS` | filename list | **Deprecated** — kept for backward compat. New agents should use `ARTIFACT_PATHS`. |
| `BLOCKED_REASON` / `BLOCKED_TARGET` | freeform / agent-name | Required when STATUS=blocked. See §"blocked STATUS Usage". |
| `BRANCH` | branch name | MUST when a work branch was created/reused. Planning-tier and Implementation-tier agents. |
| `PR_URL` | URL \| skipped \| reused | Implementation-tier only. See `git-rules.md` §"Branch & PR Strategy". |
| `HANDOFF_TO` | agent-name \| flow-name | Used by analyst / maintenance-flow at flow boundaries. |
| `MODE` | normal \| rollback | Used by agents with rollback support (researcher / interviewer / test-designer / e2e-test-designer). |
| `GITHUB_ISSUE` | URL \| skipped (REPO_STATE=<value>) | See `git-rules.md` §"Behavior by Remote Type". |
| `DECISION` | execute \| blocked \| fallback | sandbox-runner. See `sandbox-policy.md`. |
| `DOC_REVIEW_RESULT` | passed \| has-inconsistencies | doc-reviewer. |
| `WARNING_LEGACY_DUPLICATE` | artifact name | Emitted when both `docs/<NAME>.md` and `<NAME>.md` exist. See `document-locations.md`. |
| `DENIAL_CATEGORY` / `DENIAL_COMMAND` / `DENIAL_RECOVERY` | see denial-categories.md §4 | Conditional — emit only when a Bash command was denied. |

### How to add a new canonical field

Promote a field to this table when (a) ≥2 agents emit it with identical semantics,
**or** (b) an orchestrator parses it for routing/rollback decisions. Otherwise
keep it agent-local in the owning agent's prompt.
```

実測 27 行 (heading + intro 2 lines + 13 row table + How-to-add 4 lines + blank lines)。
Note (PR #137 fix-up): `MODE` was demoted from the table (values diverge per agent); field count is 13, not 14.
制約 30 行以下を満たす。

## 4. テンプレ適用例 (3 representative agents の before / after)

### 4.1 spec-designer (write-only, few fields)

**Before** (L169–L180 = 12 行):

```markdown
## Output on Completion (Required)

```
AGENT_RESULT: spec-designer
STATUS: success | error
ARTIFACTS:
  - SPEC.md
HAS_UI: true | false
PRODUCT_TYPE: service | tool | library | cli
TBD_COUNT: {number of unresolved items}
NEXT: ux-designer | architect
```

When `HAS_UI: true`, set `NEXT: ux-designer`; when `false`, set `NEXT: architect`.
```

**After** (5 行):

```markdown
## Output on Completion (Required)

Emit an `AGENT_RESULT` block. Required fields: `STATUS`, `NEXT`, `ARTIFACT_PATHS`.
Agent-specific fields: `HAS_UI` (true|false), `PRODUCT_TYPE` (service|tool|library|cli), `TBD_COUNT`.
See `.claude/rules/agent-communication-protocol.md` §"Field Reference" for canonical field semantics.
When `HAS_UI: true`, set `NEXT: ux-designer`; when `false`, set `NEXT: architect`.
```

削減: -7 行。

### 4.2 analyst (Planning-tier, many fields)

**Before** (L401–L420 = 20 行 + 14 行 trailing notes = 34 行 total in section):

```markdown
## Required Output on Completion

```
AGENT_RESULT: analyst
STATUS: success | error
ISSUE_TYPE: bug | feature | refactor
ISSUE_SUMMARY: {one-line summary}
DOCS_UPDATED:
  - SPEC.md: updated | no_change
  - UI_SPEC.md: updated | no_change | not_exists
ARTIFACT_PATHS:
  - SPEC: {resolved path}
  - UI_SPEC: {resolved path}
GITHUB_ISSUE: {issue URL | skipped}
BRANCH: {branch name}
HANDOFF_TO: architect
ARCHITECT_BRIEF: |
  {Instructions for design changes to pass to architect.}
NEXT: architect
```

`BRANCH` is **MUST** when `STATUS: success`. It tells `architect` and `developer`
which branch to reuse so they do not create a duplicate.
```

**After** (6 行 — 1 行オーバーだが許容範囲、`ARCHITECT_BRIEF` の multi-line ペイロード説明が必要なため):

```markdown
## Required Output on Completion

Emit an `AGENT_RESULT` block. Required fields: `STATUS`, `NEXT`, `ARTIFACT_PATHS`, `BRANCH`, `HANDOFF_TO`, `GITHUB_ISSUE`.
Agent-specific fields: `ISSUE_TYPE` (bug|feature|refactor), `ISSUE_SUMMARY`, `DOCS_UPDATED` (per-artifact updated|no_change|not_exists), `ARCHITECT_BRIEF` (multi-line YAML literal describing design changes for architect).
See `.claude/rules/agent-communication-protocol.md` §"Field Reference" for canonical field semantics. `BRANCH` MUST be populated when `STATUS: success` so architect/developer reuse the same branch.
```

削減: -28 行。

### 4.3 developer (Implementation-tier, many fields)

**Before** (L341–L361 = 21 行 + 3 lines suspended note):

```markdown
## Output on Completion (Required)

Upon completion of all tasks, always output the following block.
The flow orchestrator reads this output to proceed to the next phase.

```
AGENT_RESULT: developer
STATUS: success | error | suspended | blocked
PHASE: {phase number executed}
TASKS_COMPLETED: {completed task count} / {total task count}
BRANCH: {branch name}
PR_URL: {PR URL | skipped | reused}
LAST_COMMIT: {output of git log --oneline -1}
LINT_CHECK: pass | fail | skipped
FILES_CHANGED:
  - {file path}: {new|modified}
ACCEPTANCE_CHECK: pass | fail
FAILED_CONDITIONS:
  - {failed acceptance criteria (if any)}
NEXT: test-designer | suspended
```

`STATUS: suspended` is used for session interruption. ...
```

**After** (6 行):

```markdown
## Output on Completion (Required)

Emit an `AGENT_RESULT` block. Required fields: `STATUS`, `NEXT`, `BRANCH`, `PR_URL`.
Agent-specific fields: `PHASE`, `TASKS_COMPLETED`, `LAST_COMMIT`, `LINT_CHECK`, `FILES_CHANGED` (per-file new|modified), `ACCEPTANCE_CHECK` (pass|fail), `FAILED_CONDITIONS` (list).
See `.claude/rules/agent-communication-protocol.md` §"Field Reference" for canonical field semantics.
Use `STATUS: suspended` for session interruption; set `NEXT: suspended` so the orchestrator prompts the user to resume. Use `STATUS: blocked` with `BLOCKED_REASON` / `BLOCKED_TARGET` / `CURRENT_TASK` when design ambiguity is discovered.
```

削減: -18 行 (`## Using blocked STATUS` の独立節は既存維持、テンプレ部のみ短縮)。

## 5. 削減規模の再計算

planning doc 主張: **net -370 行 (per-agent -10 × 40 + protocol +30)**。

architect 実測:

| 区分 | 値 |
|---|---|
| 対象 agent 数 (orchestrator 3 件除く) | 37 |
| 平均 per-agent 削減 (上記 3 例の平均: 7+28+18=53/3 ≒ 18 行 — ただし spec-designer の 7 行は下限) | 約 12 行/agent (保守的見積もり) |
| 合計削減 | **37 × 12 = -444 行** |
| protocol §Field Reference 追加 | **+28 行** |
| 純削減 | **-416 行** |

planning doc 主張 -370 に対し architect 見積もり -416。**planning doc 主張の 12% 以上削減**
を超えており、20% 以内の許容範囲を満たす。

## 6. §② との commit 順序 (developer への明示)

PR-1 内 §① と §② は **同じ agent file を編集する** ため commit 順が重要。
以下の 3 commit に分割することを推奨:

| Commit | 内容 | 対象ファイル | 行数変化 |
|---|---|---|---|
| **Commit 1 (§②)** | aphelion-overview.md に `### Project-rules consultation (all agents)` 節を追加 (6 行) + 40 agent file の `## Project-Specific Behavior` セクション削除 | `src/.claude/rules/aphelion-overview.md` (+6 行) + 40 agent files (-483 行) | net -477 行 |
| **Commit 2 (§①)** | `agent-communication-protocol.md` §"Field Reference" 節追加 + 37 agent file の "Output on Completion" テンプレ短縮 | `src/.claude/rules/agent-communication-protocol.md` (+28 行) + 37 agent files (-444 行) | net -416 行 |
| **Commit 3 (chore)** | `CHANGELOG.md` Unreleased entry 追加 + `TASK.md` reset | `CHANGELOG.md` (+5 行) + `TASK.md` (reset to placeholder) | +5 行 |

**順序の根拠**: §② は §① と独立 (異なる markdown セクションを編集)。先に §② を済ませてから
§① を進めると、`## Project-Specific Behavior` 削除後の「冒頭部」に `## Output on Completion`
までの距離が変わるが、§① の Edit には影響しない (Edit は heading 基準で一意に target できる)。
逆順 (§①→§②) でも理論上は機能するが、§② の方が mechanical で diff が大きくレビュー観点で
切り離しやすいため Commit 1 に置く。

PR タイトル例 (3 commit を 1 PR に):
`refactor: deduplicate agent definitions §① + §② (#131)`

## 7. 特殊扱いが必要な agent

以下は §① のテンプレ適用から **除外** または **特殊扱い** する:

### 7.1 完全除外 (AGENT_RESULT なし)

- `discovery-flow.md`
- `delivery-flow.md`
- `operations-flow.md`

理由: `agent-communication-protocol.md` §"Flow orchestrator exception" により、
これらは `AGENT_RESULT` を emit せず handoff file (`DISCOVERY_RESULT.md` 等) で完了報告する。
§① のテンプレ適用対象外。**§② の `## Project-Specific Behavior` 削除は適用する**。

### 7.2 特殊扱い (AGENT_RESULT 形式が独特)

- **`maintenance-flow.md`**: AGENT_RESULT を emit するが minimal (`STATUS` / `PLAN` /
  `MAINTENANCE_RESULT` / `HANDOFF_TO` / `NEXT` = 5 field のみ)。テンプレ適用後の差分はほぼ無いが
  一貫性のため適用する。
- **`sandbox-runner.md`**: `DECISION` / `CALLER` / `SANDBOX_MODE` / `EXIT_CODE` 等 9 field を
  emit。`DECISION` は protocol-canonical だが残り 8 field は固有。テンプレ適用 OK。
- **`doc-flow.md`**: `SLUG` / `OUTPUT_LANG` / `GENERATED_DELIVERABLES` / `SKIPPED_TYPES` /
  `TEMPLATE_VERSIONS` / `SUGGEST_DOC_REVIEW` の 6 固有 field。テンプレ適用 OK。
- **複数 AGENT_RESULT block を持つ agent** (researcher / interviewer / test-designer /
  e2e-test-designer / poc-engineer): `MODE: normal | rollback` で 2 つの block を提示している。
  テンプレ適用後は 1 つの prompt に統合し、`MODE` field の値域だけ説明文に含める。

## 8. リスクと mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| LLM が短縮テンプレを読んで `STATUS` の値域を知らずに `success/error` 以外を emit しない | 中 | テンプレに `STATUS` を必須 field として明示し、Field Reference へのリンクを 1 行に含める。Claude Code の auto-load で `agent-communication-protocol.md` が context に入るため値域は引ける |
| Field Reference の補足が agent 側 prompt に無いため LLM が値域を誤推測 | 低 | テンプレに `(values: a\|b\|c)` を inline で書く運用とする (§4.1 spec-designer 例参照) |
| protocol §Field Reference 追加で auto-load 量増 | 低 | 28 行のみ。#132 §B の aphelion-overview 軽量化でほぼ相殺 |
| 既存 orchestrator パーサが期待する field 順序が変わる | 低 | orchestrator は field 名で parse する想定 (順序非依存)。仕様確認: `delivery-flow.md` 等が `grep ^STATUS:` 形式で読んでいる前提 |
| `ARCHITECT_BRIEF` の multi-line YAML literal が inline 説明で不十分 | 中 | analyst の説明文に "multi-line YAML literal" と明記する (§4.2 採用済) |
| 6-line を超える agent の発生 | 低 | analyst のみ 6 行になる見込み。許容 (planning doc は ~5 行と書いているが "厳密 5 行" ではなく "数行" のニュアンス) |

## 9. PR-1 acceptance criteria (planning doc から引き継ぎ + architect 追加)

planning doc 既定:
- [ ] `src/.claude/rules/aphelion-overview.md` に Project-rules consultation 節 (~6 行) 追加
- [ ] 40 agent files の `## Project-Specific Behavior` セクション削除
- [ ] `src/.claude/rules/agent-communication-protocol.md` に `## Field Reference` 節追加
- [ ] 37 agent files (orchestrator 3 件除く) の "Output on Completion" テンプレ短縮
- [ ] CHANGELOG.md Unreleased エントリ追加
- [ ] net 行数削減 ~800 行以上

architect 追加:
- [ ] `agent-communication-protocol.md` の Field Reference 節は **28 行以内** (auto-load コスト制約)
- [ ] テンプレ適用後の per-agent "Output on Completion" 節は **6 行以内** (analyst のみ例外 6 行)
- [ ] orchestrator 3 件 (discovery-flow / delivery-flow / operations-flow) は §① 適用対象外
- [ ] commit 3 件構成で push (Commit 1 §② / Commit 2 §① / Commit 3 chore)
- [ ] `agent-communication-protocol.md` § "Field Reference" §"How to add" の 1 行を含む (#132 §A 拡張余地)

## 10. #132 への引き継ぎ

#132 architect が本書を踏まえて作業する際の確定情報:

1. `agent-communication-protocol.md` は本 PR-1 で **86 → 114 行** に拡大する (+28 行)。
   #132 §B (auto-load 量軽量化) の対象に含めるかは #132 architect が判断。
   architect 推奨: **対象に含めない** (Field Reference は machine-critical な仕様で削れない)。
2. `RELEVANT_UCS` の Field Reference 昇格は #132 §A 着手時に行う。本 PR-1 では追加しない。
3. `aphelion-overview.md` の `### Project-rules consultation (all agents)` (6 行) は #132 §B の
   軽量化対象から **除外**。理由は planning doc §"#132 引き継ぎ事項" の通り。

## 11. Handoff brief for developer

PR-1 の実装タスクを以下 8 件に分割。各タスクは TASK-NNN として TASK.md に記載。
全タスク完了後、`STATUS: success` で AGENT_RESULT 出力。

| TASK | 内容 | 対象ファイル | 検証コマンド |
|---|---|---|---|
| **TASK-001** | `src/.claude/rules/aphelion-overview.md` に `### Project-rules consultation (all agents)` 節を `### Document locations rule` 直下に追加 (本書 §2 planning doc から引用、6 行) | `src/.claude/rules/aphelion-overview.md` | `grep -A6 "Project-rules consultation" src/.claude/rules/aphelion-overview.md \| wc -l` (期待: 7) |
| **TASK-002** | 40 agent file の `## Project-Specific Behavior` セクション全体を削除 (見出しから次の `---` または `## ` 直前まで) | `.claude/agents/*.md` (40 件) | `grep -l "^## Project-Specific Behavior" .claude/agents/*.md \| wc -l` (期待: 0) |
| **TASK-003** | Commit 1 を作成 (`refactor: deduplicate Project-Specific Behavior across agents (TASK-001+TASK-002, #131 §②)`) + push | git | `git log --oneline -1` |
| **TASK-004** | `src/.claude/rules/agent-communication-protocol.md` に本書 §3 の fenced block を `## STATUS Definitions` の直前に追加 | `src/.claude/rules/agent-communication-protocol.md` | `awk '/^## Field Reference/,/^## STATUS Definitions/' src/.claude/rules/agent-communication-protocol.md \| wc -l` (期待: 約 30) |
| **TASK-005** | 37 agent file (orchestrator 3 件除く) の `## Output on Completion (Required)` / `## Required Output on Completion` 節を本書 §4 のテンプレに置換。各 agent の Required/Agent-specific field 分類は本書 §2 Q2 を参照 | `.claude/agents/*.md` (37 件) | `for f in .claude/agents/*.md; do awk '/^## (Required )?Output on Completion/,/^## [^OR]/' "$f" \| wc -l; done` (期待: 各 5-7 行) |
| **TASK-006** | Commit 2 を作成 (`refactor: slim AGENT_RESULT templates per protocol Field Reference (TASK-004+TASK-005, #131 §①)`) + push | git | `git log --oneline -1` |
| **TASK-007** | `CHANGELOG.md` Unreleased に entry 追加 (`### Changed` セクションに 1-2 行) + `TASK.md` を空テンプレに reset | `CHANGELOG.md`, `TASK.md` | `head -20 CHANGELOG.md` |
| **TASK-008** | Commit 3 を作成 (`chore: update CHANGELOG and reset TASK.md for #131 (TASK-007)`) + push + PR 作成 (`gh pr create`、本 design doc とリンク planning doc を PR body に含める、`Closes #131`) | git, gh | `gh pr view --json url` |

各 commit は `git-rules.md` §"Commit Message Format" 準拠。
trailer に `Co-Authored-By: Claude <noreply@anthropic.com>` を付与 (project-rules.md
default = enabled)。

### Verification gates (developer 完了前)

PR 作成前に developer が確認すべき numeric gate:

```bash
# 1. Project-Specific Behavior が 0 件
test "$(grep -l '^## Project-Specific Behavior' .claude/agents/*.md | wc -l)" = "0"

# 2. orchestrator 3 件以外で Output on Completion 節が 6 行以下
for f in $(grep -L '^name: (discovery|delivery|operations)-flow' .claude/agents/*.md); do
  size=$(awk '/^## (Required )?Output on Completion/,/^## [^OR]/' "$f" | wc -l)
  [ "$size" -le "8" ] || echo "OVERSIZE: $f ($size lines)"
done

# 3. net 削減が -800 行以上 (planning doc 主張)
git diff main..HEAD -- '.claude/agents/' 'src/.claude/rules/' | awk '
  /^-[^-]/ {removed++}
  /^\+[^+]/ {added++}
  END {print "net:", added - removed; exit (removed - added < 800)}
'

# 4. Field Reference 節が 30 行以内
awk '/^## Field Reference/,/^## STATUS Definitions/' src/.claude/rules/agent-communication-protocol.md | wc -l
# 期待: ≤ 32 (heading + body 30 + 次節 heading 1)
```

これらが全て通った段階で `STATUS: success` を emit。

## 12. ADR

### ADR-001: テーブル形式 for Field Reference

- **Context**: 共通 field の正規定義を `agent-communication-protocol.md` に集約する必要があるが、
  auto-load コストを最小化したい (制約: 30 行以下)
- **Decision**: 1 field = 1 row のテーブル形式を採用
- **Rationale**: 制約 30 行を満たせる唯一の形式。LLM の grep ベース引き当て効率も高い
- **Rejected**: 小見出し (`### STATUS` 形式) — 60 行超で auto-load コスト過大

### ADR-002: protocol-canonical / agent-specific の境界

- **Context**: agent 固有 field を protocol にも移すか agent 側に残すかの判断
- **Decision**: 「2 agent 以上で同じ値域、または orchestrator が状態遷移に使う」場合のみ
  protocol に集約。それ以外は agent 側に残す
- **Rationale**: LLM は agent prompt を読んで文脈を作るため、固有情報を agent 側に残した方が
  推論精度が高い。protocol は薄く保つことで auto-load コストを抑える
- **Rejected**: 全 field を protocol に集約 — Field Reference が 60 行超になる / agent prompt から
  実行に必要な情報が消える

### ADR-003: テンプレ 5 行 (analyst のみ例外 6 行)

- **Context**: planning doc は ~5 行ターゲット。analyst は 11 field を持つため厳密 5 行は無理
- **Decision**: 5 行を標準、analyst のみ 6 行を許容
- **Rationale**: analyst の `ARCHITECT_BRIEF` は multi-line YAML literal で説明が必要なため
  1 行追加が unavoidable
- **Rejected**: analyst を別フォーマット — 一貫性を犠牲にしてまで 1 行削る価値は低い
