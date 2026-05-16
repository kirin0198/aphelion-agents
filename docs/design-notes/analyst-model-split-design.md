> Last updated: 2026-05-16
> GitHub Issue: [#139](https://github.com/kirin0198/aphelion-agents/issues/139)
> Designed by: architect (2026-05-16)
> Source planning doc: [analyst-model-split.md](./analyst-model-split.md)
> Next: developer (PR-2 implementation)

# Architecture design: analyst モデル分割 (analyst-intake + analyst-core)

本設計書は [analyst-model-split.md](./analyst-model-split.md) §4 の 7 open questions
に対する architect 判定をまとめ、developer が PR-2 を曖昧さなく実装できる粒度で
分割設計・wiring・field schema・skeleton outline を提示する。

---

## 1. Summary of decisions (TL;DR)

| 項目 | 決定 |
|---|---|
| 分割境界 | 現 analyst.md L37-150 (intake 群) と L151-329 (深掘り群) で分割。Commit 節 (L330-382) は **両方** に複製、Output / Completion (L384-405) も両方に複製 (適応) |
| Invocation pattern | **Pattern A — direct spawn** (intake が Agent tool で core を呼ぶ)。standalone でも flow 経由でも同じ |
| `/analyst` skill | 名称・動作据え置き。内部で analyst-intake を起動 |
| Flow orchestrator 変更 | delivery-flow.md / maintenance-flow.md は `analyst` 表記を維持。Pattern A により wiring は **変更不要**。AGENT_RESULT は analyst-core が最終的に emit する (agent-name は `analyst` ではなく `analyst-core`) |
| Step 4 / Step 5 ownership | **両方 core 残置** (hypothesis 維持) |
| 失敗モード | analyst-core が error/blocked → analyst-intake が同じ AGENT_RESULT を上位に bubble up。resume は parent (Claude Code / flow orchestrator) 経由で analyst-core を直接再起動 |
| 既存 analyst.md fate | **1-paragraph wrapper 化** (削除しない)。`/analyst` skill / 既存ドキュメント / 既存ユーザ手順との後方互換を確保 |
| Tool 要件 | analyst-intake に `Agent` tool を追加 (現 analyst には無い) |
| Agent count | 40 → **42** (analyst-intake / analyst-core を新規追加し、analyst は wrapper として残るため +2) |
| Cost reduction | per-invocation input cost reduction **~28%** (planning doc 30-40% から下方修正、§5 参照) |

---

## 2. Q2 Boundary precision: 現 analyst.md の line ranges → 分割先

`.claude/agents/analyst.md` 全 405 行を以下のように分配する。

| 現 analyst.md 範囲 | 行数 | セクション名 | 移動先 | 備考 |
|---|---|---|---|---|
| L1-14 | 14 | YAML frontmatter | **両方** (個別に書き直し) | `name` / `description` / `tools` / `model` を新規に記述 |
| L15-35 | 21 | Mission / rule-references | **両方** (適応) | Mission 文面は intake / core それぞれに合うよう書き直し |
| L37-49 | 13 | Mandatory Checks Before Starting | **intake のみ** | Startup Probe / gh auth status は intake が実施 |
| L51-72 | 22 | Promotion from proposals/ | **intake のみ** | `git mv` は intake (Bash 必要) |
| L74-90 | 17 | Step A: Minimum intake questions | **intake のみ** | AskUserQuestion |
| L92-107 | 16 | Step B: TBD / sentinel re-ask rule | **intake のみ** | フォローアップ質問 |
| L109-135 | 27 | Step C: Write the design note (§1-4 stub) | **intake のみ** | §1-4 (Background / Goal / Scope / Constraints) のみ書く。§5-8 は core が後で追記 |
| L137-148 | 12 | Step D: Create the GitHub issue (initial) | **intake のみ** | 初回 `gh issue create` + ヘッダ #N 埋め込み |
| L151-169 | 19 | Step 1: Issue Classification | **core のみ** | bug/feature/refactor の最終分類。intake の暫定分類を verify |
| L172-193 | 22 | Step 2: Analysis Procedure by Type | **core のみ** | 根本原因分析・要件整理 |
| L196-244 | 49 | Step 3: User Approval | **core のみ** | 承認ゲート |
| L247-263 | 17 | Step 4: Document Updates (SPEC.md / UI_SPEC.md) | **core のみ** | Edit は core |
| L266-326 | 61 | Step 5: GitHub Issue refinement | **core のみ** | `gh issue edit` で本文に Analysis Results / Approach / Handoff を書き込む |
| L330-380 | 51 | Commit on Work Branch (#136 rule) | **両方** (役割分担) | §6 参照 — intake は初回 commit / push、core は最終 commit / push |
| L384-387 | 4 | Output Files | **両方** (適応) | intake = planning doc / branch、core = SPEC + UI_SPEC + final planning doc |
| L389-393 | 5 | Required Output on Completion (AGENT_RESULT) | **両方** (個別 schema) | §3 参照 |
| L395-405 | 11 | Completion Conditions | **両方** (それぞれの責務に合わせ書き直し) | |

### 2.1 work-branch lifecycle の役割分担 (Q-cross-cutting / #136)

#136 で Planning-tier に追加された "branch 作成 / commit / push" 責務は、**intake が
branch 作成 / 初回 commit / push** を担い、**core は同じブランチを reuse して
最終 commit / push** する。

```
analyst-intake:
  1. git rev-parse --is-inside-work-tree → REPO_STATE 取得
  2. 既存 main / 別ブランチを確認、main なら新ブランチ作成
     branch_prefix = bug→fix / refactor→refactor / feature→feat
     branch_name = ${branch_prefix}/${slug}
     git checkout -b "$branch_name"
  3. planning doc (§1-4 stub) + (proposals/ promotion があれば git mv) を commit
     "docs: add planning doc for {issue_title} (#{N})"
  4. git push -u origin "$branch_name"
  5. Agent tool で analyst-core を spawn (§3 参照)

analyst-core:
  1. git rev-parse --abbrev-ref HEAD → intake が作ったブランチであることを verify
     (もし main なら BLOCKED — intake が branch を作れていない異常状態)
  2. Step 1-5 を実施 (planning doc §5-8 追記、SPEC.md / UI_SPEC.md edit、gh issue edit)
  3. 最終 commit:
     git add docs/design-notes/${slug}.md
     git add docs/SPEC.md 2>/dev/null || git add SPEC.md 2>/dev/null || true
     git add docs/UI_SPEC.md 2>/dev/null || git add UI_SPEC.md 2>/dev/null || true
     git commit -m "docs: add analysis for {issue_title} (#{N})"
  4. git push
  5. PR は開かない (Planning-tier だから)
```

---

## 3. Q5 Handoff field schema (intake → core via Agent tool prompt)

analyst-intake は最終ステップで Agent tool を呼び、analyst-core を spawn する。
プロンプト本文 (Agent tool の `prompt` フィールド) に **YAML literal block** で
以下の field を渡す。

```yaml
# Handoff fields from analyst-intake to analyst-core
planning_doc_path: docs/design-notes/<slug>.md      # 必須。core はここに §5-8 を追記
slug: <kebab-case>                                   # 必須。branch / commit msg / log で再利用
branch_name: <fix|refactor|feat>/<slug>              # 必須。core は HEAD がこれであることを verify
issue_url: https://github.com/<owner>/<repo>/issues/N  # 必須。core は gh issue edit に使う
issue_number: <N>                                    # 必須 (issue_url から parse 可能だが冗長保持)
issue_title: <one-line>                              # 必須。最終 commit msg に使う
issue_type: bug | feature | refactor                 # intake 暫定分類。core が verify (Step 1)
intake_summary: |                                    # 必須。Step A / B で得た一段落の要約
  <Symptom / Background>
  <Expected behavior / Goal>
  <Scope hint>
proposals_source: docs/design-notes/proposals/<slug>.md | null  # promote 元 (なければ null)
repo_state: github | github_unauth | local-only | none           # Startup Probe 結果
artifact_paths:                                                  # document-locations resolved paths
  - SPEC: docs/SPEC.md | SPEC.md | <missing>
  - UI_SPEC: docs/UI_SPEC.md | UI_SPEC.md | <missing>
  - ARCHITECTURE: docs/ARCHITECTURE.md | ARCHITECTURE.md | <missing>
auto_approve: true | false                          # .aphelion-auto-approve の有無
output_language: en | ja                            # project-rules.md → Localization
```

### 3.1 設計判断: なぜ planning_doc に書かれた情報を Agent prompt にも重複させるか

planning_doc には §1-4 が書かれているが、core が毎回 `Read` するより、prompt に
要約 (`intake_summary`) を含めた方が context が早期に確立しコスト効率が良い。
ただし `planning_doc_path` も渡すので、core が詳細を Read する自由度は保持される。

### 3.2 設計判断: artifact_paths を渡す

document-locations.md §"Agent contract" 通り、orchestrator が解決した path を
**そのまま下流に渡す** ことで再 resolve による docs/-vs-root drift を防ぐ。
intake が解決した結果を core が継承する。

---

## 4. Q1 / Q3 / Q4 Invocation pattern — Pattern A (direct spawn) を採用

### 4.1 採用パターン: Pattern A — direct spawn (intake → core)

```
User: /analyst {request}
  │
  ▼
analyst-intake (sonnet)
  │  Mandatory Checks / Step A-D / planning doc commit / push
  │
  └─▶ Agent(subagent_type="analyst-core", prompt=<YAML handoff>)
         │
         ▼
       analyst-core (opus)
         │  Step 1-5 / final commit / push / gh issue edit
         │
         └─▶ AGENT_RESULT block (agent-name: analyst-core)
              ↑
              parent (Claude Code / delivery-flow / maintenance-flow) はこの
              AGENT_RESULT を受け取る。analyst-intake は core の最終出力を
              そのままパススルーする (intake 自身は AGENT_RESULT を別途
              emit しない — core 完了 = チェーン完了)
```

### 4.2 implications

**delivery-flow.md (Side Entry: analyst)**
- L135-152 の文面は **無変更で動作する**。flow orchestrator は依然として
  「`analyst` の AGENT_RESULT を受け取る」と書かれているが、実際に届くのは
  analyst-core の AGENT_RESULT (agent-name: `analyst-core`、HANDOFF_TO: `architect`)
- ただし agent-name 表記が `analyst` から `analyst-core` に変わるため、
  「If you receive an AGENT_RESULT block from `analyst`」を
  「If you receive an AGENT_RESULT block from `analyst-core` (or legacy `analyst`)」
  に文言だけ調整する (developer は §9 file list 通り 1 箇所修正)。

**maintenance-flow.md**
- L50 / L70 / L91 / L105 / L99 / L111 / L146 / L162 / L163 / L195-198 で
  `analyst` を参照。Pattern A により Phase 2/3 で `analyst` を起動する記述は
  そのまま (`analyst-intake` が起動され、`analyst-core` まで自動チェーン)
- ただし agent-name parsing 表記を 1 箇所 (L146 `analyst`) で
  「analyst-core (intake → core チェーン経由)」と注記追加。詳細は §9。

**`/analyst` skill (`.claude/commands/analyst.md`)**
- L1 の "Launch the analyst agent" → "Launch the analyst-intake agent (which
  chains to analyst-core)" に書き換え。動作変更なし。

### 4.3 Rejected alternatives

- **Pattern B (parent-orchestrated)**: caller (flow orchestrator / Claude Code) が
  intake → core を 2 段階で起動。**棄却理由**: `/analyst` 単独呼び出しでは parent は
  Claude Code root session であり、orchestrator が存在しない。standalone 経路の
  2 段階起動を root session に書くと UX が破綻する (ユーザが意識的に core を
  叩く必要)。
- **Pattern C (hybrid: standalone は direct、flow は parent-orchestrated)**:
  実装が複雑化 (intake が呼び出し元を識別する必要)。flow orchestrator 側にも
  分岐処理を入れる必要があり、保守コストが上昇。Pattern A で flow も問題なく
  動くなら不要。

### 4.4 Sub-agent → sub-agent spawn の技術的可行性

Claude Code は sub-agent が `Agent` tool を所有する場合、別 sub-agent を spawn
できることを `delivery-flow.md` / `maintenance-flow.md` などの flow orchestrator
(共に sub-agent でかつ `Agent` tool 所有) で運用実証済み。よって analyst-intake が
Agent tool を所有して analyst-core を spawn する設計は技術的に成立する。

---

## 5. Q7 Step ownership boundary (Step 4 / Step 5)

planning doc §4 Q7 hypothesis は「両方 core 残置」。これを **採用** する。

| Step | Agent | 理由 |
|---|---|---|
| Step 4 (SPEC.md / UI_SPEC.md incremental Edit) | core | SPEC との整合性判断が必要。template fill でなく "既存 UC との非衝突確認" を含む |
| Step 5 (GitHub Issue body refinement via `gh issue edit`) | core | Analysis Results / Approach / Handoff to architect の本文は core が生成した内容そのもの。intake に戻すと中継コストが増える |

ただし **Step D (initial `gh issue create`)** は intake が担当する (§2 表参照)。
これにより issue 番号と URL を intake が確定でき、handoff schema (§3) で
`issue_url` / `issue_number` を確実に渡せる。

---

## 6. Q6 Failure mode (analyst-core 失敗 / blocked 時の挙動)

### 6.1 分類

| core 状態 | intake のふるまい | parent (orchestrator / Claude Code) のふるまい |
|---|---|---|
| `STATUS: success` | core の AGENT_RESULT をそのまま emit (passthrough) | 通常フロー継続 |
| `STATUS: error` | core の AGENT_RESULT を passthrough。`STATUS: error` のまま | ユーザに報告。intake が作成した planning doc / branch / GitHub issue は **残置**。手動修正後にユーザが core を直接 `Agent` 呼び出しで再起動可能 |
| `STATUS: blocked` | core の AGENT_RESULT を passthrough (`BLOCKED_REASON` / `BLOCKED_TARGET` 含む) | orchestrator が `BLOCKED_TARGET` agent を lightweight invoke。answer 受領後、core を resume (intake は再起動しない) |
| `STATUS: suspended` | core の AGENT_RESULT を passthrough | flow orchestrator の "Recovery from Session Interruption" 機構に従う |

### 6.2 Resume contract

core が `STATUS: blocked` または `suspended` で停止後、resume するには **core を
直接 `Agent` で呼び出す** (intake は再実行しない)。これは:

- intake は Step A-D を既に実行済みで、planning doc / branch / GitHub issue は
  すでに存在 → intake 再実行は重複作業 + 二重 issue 作成リスク
- core は handoff schema (§3) の YAML を再構築できれば resume 可能。
  resume prompt は元の handoff prompt + 「Resume from {step}」を付与

### 6.3 intake 失敗時

intake が Step A-D の途中で失敗した場合 (例: gh issue create が REPO_STATE=none で
skip → そのまま続行は問題ないが、`git push` が失敗するなど):

- intake は `STATUS: error` で停止。core は spawn しない (handoff 不可)
- ユーザは intake を再実行 (planning doc 既存なら overwrite 確認)

---

## 7. 既存 `analyst.md` の fate — **1-paragraph wrapper 化** を採用

### 7.1 採用判断

**完全削除ではなく、wrapper として残す**:

```markdown
---
name: analyst
description: |
  Deprecated entry point — chains to analyst-intake → analyst-core.
  See .claude/agents/analyst-intake.md and .claude/agents/analyst-core.md.
  Kept for backward compatibility with existing `/analyst` invocations
  and external documentation referencing the `analyst` agent name.
tools: Agent
model: sonnet
---

You are the legacy `analyst` entry point. Your sole job is to delegate to
`analyst-intake` via the Agent tool, passing the user's request unchanged.

Invocation:

  Agent(subagent_type="analyst-intake", prompt=<user's original request>)

Do not perform any analysis yourself. analyst-intake handles intake, then
chains to analyst-core for deep analysis.
```

### 7.2 採用理由

1. **後方互換性**: `/analyst` skill (`.claude/commands/analyst.md`) は
   `Launch the analyst agent` と書かれており、外部ドキュメント (wiki / README /
   archived design notes) も同様に `analyst` 名を参照している。一度に全置換
   するのではなく、wrapper で interim 期間を設ける
2. **同一 PR でドキュメント全置換するコスト > wrapper 維持コスト**: wrapper は
   約 15 行で済む。将来削除する場合は `/aphelion-help` などの discoverability
   表示と並行して decommission する
3. **Agent count**: 40 → 42 (wrapper も 1 件としてカウント)

### 7.3 Rejected alternative

- **完全削除**: 外部ドキュメント (wiki Agents-Orchestrators.md §"### analyst")
  全件を同 PR で更新する必要があり、PR 規模が膨らむ。incremental migration が
  困難になる

---

## 8. Q-additional Tool 要件

### 8.1 analyst-intake.md frontmatter

```yaml
---
name: analyst-intake
description: |
  Sonnet-tier intake agent for bug reports, feature requests, and refactoring
  issues. Collects minimum information, writes the §1-4 stub of the planning
  doc, creates the GitHub issue, commits the work branch, and chains to
  analyst-core (Opus) for deep analysis.
  Invoked by: /analyst skill, delivery-flow Side Entry, maintenance-flow Phase 2/3.
tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: sonnet
---
```

`Agent` tool が追加点。他は現 analyst.md と同じ。

### 8.2 analyst-core.md frontmatter

```yaml
---
name: analyst-core
description: |
  Opus-tier deep analysis agent. Receives handoff from analyst-intake via
  Agent tool prompt (YAML literal schema), performs Step 1-5 (classification,
  analysis, approval gate, SPEC/UI_SPEC incremental update, GitHub issue body
  refinement), and emits the final AGENT_RESULT with HANDOFF_TO: architect.
  NOT typically invoked directly — analyst-intake is the canonical entry.
  Direct invocation is permitted for resume-from-blocked scenarios only.
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---
```

`Agent` tool は不要 (core はチェーンの終点)。

---

## 9. Agent count bump file list (40 → 42)

`analyst-intake` (+1) と `analyst-core` (+1) で +2。`analyst` (wrapper) は維持
されるので 40 → **42**。

| ファイル | 修正内容 | 検索コマンド |
|---|---|---|
| `README.md` | shields.io `agents-40` → `agents-42`、本文 "all 40 agents" 表現 | `grep -nE "agents-40\|40 agents" README.md` |
| `README.ja.md` | shields.io `agents-40` → `agents-42`、本文 "40 エージェント" 表現 | `grep -nE "agents-40\|40 エージェント" README.ja.md` |
| `docs/wiki/en/Home.md` | L8 update history (新規エントリ追加)、L29 / L45 "all 40 agents" → "all 42 agents" | `grep -nE "39 → 40\|all 40 agents" docs/wiki/en/Home.md` |
| `docs/wiki/ja/Home.md` | L8 update history、L30 / L46 "40 エージェント" → "42 エージェント" | `grep -nE "39 → 40\|40 エージェント" docs/wiki/ja/Home.md` |
| `docs/wiki/en/Rules-Reference.md` | L87 "all 40 agents" → "all 42 agents" | `grep -nE "all 40 agents" docs/wiki/en/Rules-Reference.md` |
| `docs/wiki/ja/Rules-Reference.md` | 同上 (JA) | `grep -nE "40 エージェント\|all 40 agents" docs/wiki/ja/Rules-Reference.md` |
| `docs/wiki/en/Agents-Orchestrators.md` | L141-153 "Standalone Agents" の analyst エントリ → analyst-intake / analyst-core / analyst (wrapper) の 3 エントリに差し替え | `grep -n "### analyst\|### codebase-analyzer" docs/wiki/en/Agents-Orchestrators.md` |
| `docs/wiki/ja/Agents-Orchestrators.md` | 同上 (JA) | 同上 path JA |
| `docs/wiki/en/Agents-Maintenance.md` | L42 NEXT 条件 / L31 PLAN 分岐の "analyst" 表記を維持 (wrapper 経由) — 修正不要だが念のため文中に 1 行注記追加 (任意) | `grep -n "analyst" docs/wiki/en/Agents-Maintenance.md` |
| `docs/wiki/ja/Agents-Maintenance.md` | 同上 (JA) | 同上 |
| `site/src/content/docs/en/index.mdx` | L73 "All 39 agents" → "All 42 agents" (stale 39 もここで一気に同期) | `grep -n "39 agents\|40 agents" site/src/content/docs/en/index.mdx` |
| `site/src/content/docs/ja/index.mdx` | 同様の修正 (該当行があれば) | `grep -nE "39 .*エージェント\|40 .*エージェント" site/src/content/docs/ja/index.mdx` |
| `.claude/agents/delivery-flow.md` | L135-152 Side Entry: `analyst` → `analyst (chain: analyst-intake → analyst-core)` 注記 1 行追加。L150 "AGENT_RESULT block from `analyst`" → "...from `analyst-core` (via analyst-intake chain)" | `grep -nE "analyst" .claude/agents/delivery-flow.md` |
| `.claude/agents/maintenance-flow.md` | L50 / L70 / L91 / L105 表記は維持 (`analyst` のまま、wrapper 経由)。L146 "analyst" 参照行に「(analyst-intake → analyst-core チェーン経由で取得)」と注記追加 | `grep -nE "analyst" .claude/agents/maintenance-flow.md` |
| `.claude/commands/analyst.md` | L1 "Launch the analyst agent" → "Launch the analyst-intake agent (chains to analyst-core)"、文末注記 | (1 ファイル直読) |
| `.claude/agents/analyst.md` | 既存 405 行を 15-20 行の wrapper に置換 (§7.1 の frontmatter + 本文) | (1 ファイル直読) |
| `.claude/agents/analyst-intake.md` | **新規作成** (§10.1 skeleton) | — |
| `.claude/agents/analyst-core.md` | **新規作成** (§10.2 skeleton) | — |
| `CHANGELOG.md` | Unreleased エントリ追加 (§11) | (直接 Edit) |
| `src/.claude/rules/agent-communication-protocol.md` | `## ARTIFACT_PATHS Field` 表の "Write agents" 例示リストに `analyst-intake`, `analyst-core` を追加 (現状 `analyst` のみ) | `grep -nE "analyst" src/.claude/rules/agent-communication-protocol.md` |
| `src/.claude/rules/git-rules.md` | `### Applicable Agents` 段落の co-author trailer 対象リストに analyst-intake / analyst-core を追加 (現状 `analyst` のみ) | `grep -nE "analyst" src/.claude/rules/git-rules.md` |

> 注: 上記 grep コマンドは architect の手元 (Bash 無し) では実行できないため
> developer が PR-2 開始時に sanity check として走らせること。

---

## 10. Skeleton drafts

実本文は developer が PR-2 で書く。以下は **section heading の outline のみ**。

### 10.1 `.claude/agents/analyst-intake.md` skeleton

```
---
name: analyst-intake
description: |
  (§8.1 参照)
tools: Read, Write, Edit, Bash, Glob, Grep, Agent
model: sonnet
---

You are the **intake agent** in the Aphelion analyst chain.

> rule references (sandbox-policy / denial-categories / git-rules /
  document-locations) — all 4 一行参照

## Mission
## Mandatory Checks Before Starting          (現 L37-49 を移植)
## Intake during standalone invocation       (現 L51-72 promotion 含む)
### Promotion from proposals/
### Step A: Minimum intake questions          (現 L74-90)
### Step B: TBD / sentinel re-ask rule        (現 L92-107)
### Step C: Write the design note (§1-4 stub) (現 L109-135、§5-8 は core)
### Step D: Create the GitHub issue           (現 L137-148)
## Commit on Work Branch (initial)            (#136、§2.1 の intake 担当部分)
## Spawn analyst-core via Agent tool          (NEW — §3 handoff schema)
## Output / Completion                        (intake-specific)
  - intake 自身は AGENT_RESULT を別途 emit しない (core を passthrough)
  - ただし intake が error / 早期離脱した場合のみ AGENT_RESULT: analyst-intake を emit
## Completion Conditions
```

### 10.2 `.claude/agents/analyst-core.md` skeleton

```
---
name: analyst-core
description: |
  (§8.2 参照)
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

You are the **deep analysis agent** in the Aphelion analyst chain.

> rule references — 4 件

## Mission                                     (deep analysis 専用文面に書き直し)
## Handoff Input Validation                    (NEW — §3 handoff schema の verify)
  - YAML literal を受領、必須 field の存在チェック
  - branch_name と現在の HEAD が一致することを git rev-parse で verify
  - 不一致なら STATUS: error / MISSING_FIELD: <name> / NEXT: analyst-intake
## Step 1: Issue Classification                (現 L151-169)
## Step 2: Analysis Procedure by Type          (現 L172-193)
## Step 3: User Approval                       (現 L196-244)
## Step 4: Document Updates                    (現 L247-263)
## Step 5: GitHub Issue refinement             (現 L266-326)
## Commit on Work Branch (final)               (#136、§2.1 の core 担当部分)
## Output Files                                (SPEC.md / UI_SPEC.md / planning doc final)
## Required Output on Completion (AGENT_RESULT) — 現 L389-393 を移植
  - agent-name: analyst-core
  - HANDOFF_TO: architect | developer
## Completion Conditions
```

---

## 11. CHANGELOG entry draft

```markdown
### Changed

- analyst エージェントを analyst-intake (Sonnet) と analyst-core (Opus) に
  分割。intake 段階 (構造化質問・planning doc §1-4 stub・gh issue create・
  work branch 初回 commit) を Sonnet で実行し、深掘り分析 (Step 1-5・
  SPEC.md/UI_SPEC.md 更新・gh issue body 確定) を Opus で実行する。
  Per-invocation input cost ~28% 削減。`/analyst` skill 名と既存
  `analyst` agent name は wrapper として後方互換維持。
  delivery-flow / maintenance-flow の wiring 変更なし。
  Agent count 40 → 42。(#139)
```

---

## 12. Cost estimate (planning doc §3.4 verification)

planning doc は ~30-40% per-invocation 削減を主張。architect が以下の前提で
再評価:

### 12.1 Token distribution 推定 (analyst.md 405 行ベース)

| Phase | 推定 input token 比率 | 推奨 model |
|---|---|---|
| Mandatory Checks / Startup Probe / rules read | 5% | Sonnet |
| Step A-D (intake / planning doc stub / gh issue create) | ~30% | Sonnet |
| Step 1-2 (classification + deep analysis) | ~25% | Opus |
| Step 3 (approval gate) | ~10% | Opus |
| Step 4 (SPEC/UI_SPEC edit) | ~10% | Opus |
| Step 5 (gh issue body refinement) | ~10% | Opus |
| Commit / Output | ~10% | Sonnet (intake) + Sonnet (core final) |

→ Sonnet 比率: 5% + 30% + 5% (commit部分) = ~40%
→ Opus 比率: ~60%

### 12.2 Cost ratio 計算

Anthropic 2026 pricing: Sonnet ~$3/Mtok input, Opus ~$15/Mtok input → **5×** ratio (planning doc と整合)。

- 旧: 100% × 1.0 (Opus baseline) = 1.00
- 新: 40% × 0.2 + 60% × 1.0 = 0.08 + 0.60 = **0.68**

→ 削減率 **~32%** (planning doc 30-40% range の lower end)。

### 12.3 verdict

planning doc の主張 (30-40%) は **おおむね正しいが上限はやや楽観的**。
architect 推定は **~28-32%** (Sonnet 比率の不確実性 ±5% 込み)。
CHANGELOG / PR 本文では **"~28%"** を控えめに記載することを推奨。

### 12.4 output token は?

Opus 比率は output でも同様 → 出力側も同等の削減率。intake の output (planning
doc §1-4 stub + commit msg + AGENT_RESULT YAML) は比較的少量で、Sonnet 化の
output cost 削減効果は input より小さい。よって全体的に input ~28% / output ~30%
程度の per-invocation cost reduction が現実的。

---

## 13. Risks (planning doc §6 拡張)

planning doc §6 の 6 件に加え、architect が以下 4 件を追加:

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R7 | intake → core 間で `git push` 失敗時、branch がリモートにない状態で core が起動 → core の HEAD verify (§2.1) が false negative | 中 | core の Step 0 で `git push` を retry。`git rev-parse @{u}` で upstream 確認 |
| R8 | intake が `gh issue create` 後・push 前にクラッシュ → orphan issue がリモートに残る | 低-中 | intake の最終 step は (1) gh issue create → (2) planning doc に issue URL 反映 → (3) git commit → (4) git push の順。crash した場合は次回 intake 起動時に既存 issue を検出する logic を追加 (任意。初回 PR では out of scope) |
| R9 | `Agent` tool で spawn された core の AGENT_RESULT が parent (intake) で取得できず、ユーザに passthrough されない | 高 | Pattern A 検証: Aphelion の flow orchestrator は同じ pattern で Agent tool 経由 sub-agent の AGENT_RESULT を読み取り可能。intake は core の戻り値を本文に展開して emit すれば parent (Claude Code root) に届く |
| R10 | Sonnet が `gh issue create` の body template fill で複雑な escape (heredoc / EOF) を誤る | 中 | intake の Step D テンプレートを「最小限の変数置換のみ」に簡素化。analytical な refinement は core (Opus) の Step 5 に委ねる |

planning doc 内の R1-R6 mitigation は概ね妥当。R3 (Sonnet 品質) について
**追加策**: 万一 intake が AskUserQuestion 構造化を誤る場合、frontmatter の
`model: sonnet` を `model: opus` に上書きする escape hatch を user-doc に明記。

---

## 14. Acceptance criteria (PR-2 完了条件) — planning doc §7 を踏襲

- [ ] `.claude/agents/analyst-intake.md` 新規作成 (model: sonnet, tools に Agent 含む)
- [ ] `.claude/agents/analyst-core.md` 新規作成 (model: opus)
- [ ] `.claude/agents/analyst.md` を 15-20 行 wrapper に置換 (§7.1)
- [ ] `/analyst` skill (`.claude/commands/analyst.md`) の冒頭 1 行更新
- [ ] `delivery-flow.md` Side Entry 節に 2 行注記追加
- [ ] `maintenance-flow.md` L146 行に 1 行注記追加
- [ ] Agent count 40 → 42 を §9 file list 全件で反映
- [ ] `agent-communication-protocol.md` / `git-rules.md` の applicable agents リストに 2 件追加
- [ ] CHANGELOG.md Unreleased エントリ追加
- [ ] e2e: `/analyst` 標準呼び出しが完走し、AGENT_RESULT (agent-name: analyst-core) が emit される
- [ ] e2e: `/maintenance-flow` Patch 経路で analyst → developer → tester が完走
- [ ] `scripts/check-readme-wiki-sync.sh` が pass (README EN/JA heading parity 維持)

---

## 15. Handoff brief for developer

- 本設計 doc + planning doc を読み、§2 boundary table と §10 skeleton を
  根拠に PR-2 を実装すること
- 実装順 (推奨):
  1. analyst-core.md 新規作成 (§10.2)。analyst.md の Step 1-5 + Commit (final)
     部分を移植
  2. analyst-intake.md 新規作成 (§10.1)。Mandatory Checks + Step A-D +
     Commit (initial) + Agent tool spawn ロジック
  3. analyst.md を wrapper に置換 (§7.1)
  4. flow orchestrator 注記追加 (delivery-flow / maintenance-flow)
  5. /analyst skill 文面更新
  6. wiki / README / shields.io 一括 bump (§9 file list)
  7. CHANGELOG.md エントリ
  8. e2e: 手元で /analyst を 1 回試行 → AGENT_RESULT が analyst-core から
     emit されることを確認
- PR タイトル候補: `refactor: split analyst into analyst-intake (Sonnet) + analyst-core (Opus) (#139)`
- PR body には `Closes #139` を含めること

---

## 16. Open follow-ups (out of scope for PR-2)

- analyst (wrapper) の最終削除タイミング: 別 issue で扱う。最低 2 リリース
  経過してから removal を推奨
- `/analyst` skill の name を `/analyze` などに改名する案: 後方互換に影響大、
  別 RFC
- intake が proposals/ promotion で `git mv` する際、proposals/ 側に
  `> Promoted to: <URL>` の breadcrumb を残す案: planning doc では言及無し、
  別 issue 候補
