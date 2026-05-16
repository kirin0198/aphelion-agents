> Last updated: 2026-05-16
> GitHub Issue: [#139](https://github.com/kirin0198/aphelion-agents/issues/139)
> Designed by: architect (2026-05-16)
> Source planning doc: [analyst-model-split.md](./analyst-model-split.md)
> Next: developer (PR-2 implementation)
>
> Design history:
>   - v1 (2026-05-16): initial design, adopted **Pattern A — direct spawn** (intake spawns
>     core via Agent tool). 5 MINOR / 3 MAJOR / 0 CRITICAL findings from reviewer.
>   - v2 (2026-05-16, this revision): **redesign §4 around Pattern B (dual-path) after
>     feasibility test FAILED for Pattern A**. The Agent tool is not surfaced to sub-agents
>     by the Claude Code harness — sub-agent → sub-agent spawn is structurally impossible.
>     Pattern A (intake spawning core from inside a sub-agent context) is therefore
>     unimplementable. §4 has been replaced with a dual-path design that branches on
>     invocation context (standalone vs flow). §1 / §6 / §9 / §10 / §11 / §12 / §13
>     adjusted to match. Boundary table (§2) / handoff schema (§3) / step ownership (§5) /
>     tool requirements (§8) substantially unchanged.

# Architecture design: analyst モデル分割 (analyst-intake + analyst-core)

本設計書は [analyst-model-split.md](./analyst-model-split.md) §4 の 7 open questions
に対する architect 判定をまとめ、developer が PR-2 を曖昧さなく実装できる粒度で
分割設計・wiring・field schema・skeleton outline を提示する。

> **Note (v2):** agent count delta 40 → **42** differs from planning doc's 40 → 41 claim
> because **`analyst.md` is retained as the top-level orchestrator** (Pattern B dual-path
> requirement, see §4) rather than deleted. `analyst.md` is rewritten — it is **not** a
> wrapper and **not** a deprecated entry; it is the active top-level orchestrator on the
> standalone path. Net agents added: analyst-intake (+1), analyst-core (+1), analyst (kept,
> rewritten). Total 40 → 42.

---

## 1. Summary of decisions (TL;DR)

| 項目 | 決定 |
|---|---|
| 分割境界 | 現 analyst.md L37-148 (intake 群) と L151-329 (深掘り群) で分割。Commit 節 (L330-382) は **両方** に複製、Output / Completion (L384-405) も両方に複製 (適応) |
| Invocation pattern | **Pattern B — dual-path** (standalone path: `analyst.md` が top-level orchestrator として intake → core を順に Agent spawn / flow path: 各 flow orchestrator が intake → core を順に Agent spawn)。詳細は §4 |
| `/analyst` skill | 名称・動作据え置き。`.claude/commands/analyst.md` は変更不要 (引き続き `analyst` agent を起動) |
| Flow orchestrator 変更 | delivery-flow.md / maintenance-flow.md は **実質的な書き換えが必要** (1 行注記では不十分)。これらの flow は `analyst.md` を spawn してはならず、自身で `analyst-intake` → `analyst-core` のチェーンを実行する必要がある。詳細は §4.3 |
| Step 4 / Step 5 ownership | **両方 core 残置** (hypothesis 維持) |
| 失敗モード | 二経路それぞれで resume contract 定義。standalone は planning doc に HTML-comment 形式で handoff YAML を persist し、再起動時にスキップ判定。詳細は §6.4 |
| 既存 analyst.md fate | **top-level orchestrator として保持 (Sonnet, 約 60 行に書き換え)**。削除でも wrapper でもない。Pattern B 構造上必須 |
| Tool 要件 | analyst.md (orchestrator) に `Agent` tool 必須。analyst-intake / analyst-core は `Agent` tool **不要** (両方 sub-agent としてのみ起動されるため) |
| Agent count | 40 → **42** (analyst-intake / analyst-core を新規追加、analyst は rewritten で残るため +2) |
| Cost reduction | per-invocation input cost reduction **~24%** (planning doc 30-40% / v1 28% から下方修正、§12 参照) |

---

## 2. Q2 Boundary precision: 現 analyst.md の line ranges → 分割先

`.claude/agents/analyst.md` 全 405 行を以下のように分配する。

| 現 analyst.md 範囲 | 行数 | セクション名 | 移動先 | 備考 |
|---|---|---|---|---|
| L1-14 | 14 | YAML frontmatter | **3 ファイル** (個別に書き直し) | `analyst.md` (orchestrator, sonnet, Agent あり) / `analyst-intake.md` (sonnet, Agent なし) / `analyst-core.md` (opus, Agent なし) |
| L15-35 | 21 | Mission / rule-references | **3 ファイル** (適応) | orchestrator は最小限。intake / core はそれぞれの責務に合わせ書き直し |
| L37-49 | 13 | Mandatory Checks Before Starting | **intake のみ** | Startup Probe / gh auth status は intake が実施 |
| L52-58 | 7 | Intake intro (Promotion 説明文) | **intake のみ** | 文脈導入。何を intake が担当するかの説明 |
| L59-72 | 14 | Promotion from proposals/ | **intake のみ** | `git mv` は intake (Bash 必要) |
| L74-90 | 17 | Step A: Minimum intake questions | **intake のみ** | AskUserQuestion |
| L92-107 | 16 | Step B: TBD / sentinel re-ask rule | **intake のみ** | フォローアップ質問 |
| L109-135 | 27 | Step C: Write the design note (§1-4 stub) | **intake のみ** | §1-4 (Background / Goal / Scope / Constraints) のみ書く。§5-8 は core が後で追記 |
| L137-148 | 12 | Step D: Create the GitHub issue (initial) | **intake のみ** | 初回 `gh issue create` + ヘッダ #N 埋め込み + handoff YAML を HTML コメントとして planning doc に persist (§6.4) |
| L151-169 | 19 | Step 1: Issue Classification | **core のみ** | bug/feature/refactor の最終分類。intake の暫定分類を verify |
| L172-193 | 22 | Step 2: Analysis Procedure by Type | **core のみ** | 根本原因分析・要件整理 |
| L196-244 | 49 | Step 3: User Approval | **core のみ** | 承認ゲート |
| L247-263 | 17 | Step 4: Document Updates (SPEC.md / UI_SPEC.md) | **core のみ** | Edit は core |
| L266-326 | 61 | Step 5: GitHub Issue refinement | **core のみ** | `gh issue edit` で本文に Analysis Results / Approach / Handoff を書き込む |
| L330-382 | 53 | Commit on Work Branch (#136 rule) | **両方** (役割分担) | §6 / §2.1 参照 — intake は初回 commit / push、core は最終 commit / push |
| L384-387 | 4 | Output Files | **両方** (適応) | intake = planning doc / branch、core = SPEC + UI_SPEC + final planning doc |
| L389-393 | 5 | Required Output on Completion (AGENT_RESULT) | **3 ファイル** (個別 schema) | orchestrator (standalone path) はチェーンの最終結果を passthrough。intake / core はそれぞれ個別 AGENT_RESULT |
| L395-405 | 11 | Completion Conditions | **3 ファイル** (それぞれの責務に合わせ書き直し) | |

### 2.1 work-branch lifecycle の役割分担 (Q-cross-cutting / #136)

#136 で Planning-tier に追加された "branch 作成 / commit / push" 責務は、**intake が
branch 作成 / 初回 commit / push** を担い、**core は同じブランチを reuse して
最終 commit / push** する。

`git-rules.md` の Startup Probe (`git rev-parse --abbrev-ref HEAD` による非-main 開始
ブランチ検出) に従う点に注意。intake は probe 結果を handoff YAML の `repo_state` /
`branch_name` で core に渡し、core はそれらを inheritance するのみ (再 probe しない)。

```
analyst-intake:
  1. git rev-parse --is-inside-work-tree → REPO_STATE 取得 (git-rules.md Startup Probe)
  2. 既存 main / 別ブランチを確認、main なら新ブランチ作成
     branch_prefix = bug→fix / refactor→refactor / feature→feat
     branch_name = ${branch_prefix}/${slug}
     git checkout -b "$branch_name"
  3. planning doc (§1-4 stub) を作成。末尾 (または冒頭の Update history 下) に
     HTML コメントで handoff YAML を埋め込む (§6.4)
  4. (proposals/ promotion があれば git mv) を含めて commit
     "docs: add planning doc for {issue_title} (#{N})"
  5. git push -u origin "$branch_name"
  6. AGENT_RESULT (STATUS: success, HANDOFF_TO: analyst-core) を emit
     ※ caller (analyst.md orchestrator か flow orchestrator) がこれを受領し、
        次に analyst-core を spawn する。intake は自分で core を spawn しない

analyst-core:
  1. git rev-parse --abbrev-ref HEAD → intake が作ったブランチであることを verify
     (もし main なら BLOCKED — caller が branch を inherit していない異常状態)
  2. Step 1-5 を実施 (planning doc §5-8 追記、SPEC.md / UI_SPEC.md edit、gh issue edit)
  3. 最終 commit:
     git add docs/design-notes/${slug}.md
     git add docs/SPEC.md 2>/dev/null || git add SPEC.md 2>/dev/null || true
     git add docs/UI_SPEC.md 2>/dev/null || git add UI_SPEC.md 2>/dev/null || true
     git commit -m "docs: add analysis for {issue_title} (#{N})"
  4. git push
  5. PR は開かない (Planning-tier だから)
  6. AGENT_RESULT (STATUS: success, HANDOFF_TO: architect) を emit
```

---

## 3. Q5 Handoff field schema (caller → core via Agent tool prompt)

caller (standalone path では analyst.md orchestrator、flow path では各 flow orchestrator)
は analyst-core を Agent tool で spawn する際に、プロンプト本文 (Agent tool の `prompt`
フィールド) に **YAML literal block** で以下の field を渡す。analyst-intake は対応する
field を AGENT_RESULT 内に出力し、caller がそれを抽出して core 向け prompt に組み込む。

```yaml
# Handoff fields from analyst-intake (via caller) to analyst-core
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
intake が解決した結果を caller 経由で core が継承する。

### 3.3 intake AGENT_RESULT への埋め込み形式

intake は終了時に AGENT_RESULT block を emit し、その中に上記 YAML を `HANDOFF_PAYLOAD` セクションとして含める:

```
AGENT_RESULT: analyst-intake
STATUS: success
ARTIFACT_PATHS:
  - planning_doc: docs/design-notes/<slug>.md
HANDOFF_TO: analyst-core
HANDOFF_PAYLOAD: |
  <YAML block from §3 above>
NEXT: analyst-core
```

caller はこの `HANDOFF_PAYLOAD` を抽出して analyst-core spawn 時の prompt にそのまま貼り付ける。

---

## 4. Q1 / Q3 / Q4 Invocation pattern — Pattern B (dual-path) を採用

### 4.0 採用根拠 (feasibility test for Pattern A: **FAIL**)

v1 設計では Pattern A (intake が Agent tool で core を直接 spawn) を採用していたが、
feasibility test で **棄却** された。general-purpose sub-agent で実施したスモークテスト結果:

> "The Agent tool is not in my available toolset and not in the deferred-tools list.
> ToolSearch `select:Agent` from within a sub-agent returns 'No matching deferred tools
> found'. A sub-agent spawned via the Agent tool from the top-level session does not
> itself receive the Agent tool, regardless of whether its definition declares
> `tools: Agent`. The harness appears to gate the Agent tool to the top-level session
> only — there is no nested-spawn capability surfaced to sub-agents."

具体的含意:
- 既存の `tools: Agent` 5 件 (delivery-flow / discovery-flow / doc-flow / maintenance-flow
  / operations-flow) が動作するのは、これらが slash command 経由で起動される
  **top-level entry point** だから。sub-agent としては起動されない
- sub-agent として spawn された agent は `tools: Agent` を frontmatter で宣言していても
  実際には Agent tool を使えない

→ Pattern A (intake が sub-agent から core を spawn) は **構造的に不可能**。
Pattern B (dual-path) に redesign する。

### 4.1 採用パターン: Pattern B — dual-path

```
┌────────────────────────────────────────────────────────────────────┐
│  Standalone path (user invokes /analyst directly)                  │
└────────────────────────────────────────────────────────────────────┘

User: /analyst {request}
  │
  ▼
analyst (sonnet, top-level orchestrator, has Agent tool)
  │
  ├─▶ Agent(subagent_type="analyst-intake", prompt=<user's request>)
  │      │
  │      ▼
  │    analyst-intake (sonnet, sub-agent, NO Agent tool)
  │      │  Mandatory Checks / Step A-D / planning doc commit / push
  │      │  (handoff YAML を planning doc に HTML コメントで persist)
  │      │
  │      └─▶ AGENT_RESULT (STATUS: success, HANDOFF_PAYLOAD: <YAML>)
  │
  ├─ (analyst が HANDOFF_PAYLOAD を抽出)
  │
  ├─▶ Agent(subagent_type="analyst-core", prompt=<HANDOFF_PAYLOAD YAML>)
  │      │
  │      ▼
  │    analyst-core (opus, sub-agent, NO Agent tool)
  │      │  Step 1-5 / final commit / push / gh issue edit
  │      │
  │      └─▶ AGENT_RESULT (STATUS: success, HANDOFF_TO: architect)
  │
  └─▶ analyst が core の AGENT_RESULT を passthrough emit
        (agent-name: analyst, ただし HANDOFF_TO / NEXT 等は core のものを継承)


┌────────────────────────────────────────────────────────────────────┐
│  Flow path (delivery-flow / maintenance-flow が analyst を要求)    │
└────────────────────────────────────────────────────────────────────┘

User: /delivery-flow  (or /maintenance-flow)
  │
  ▼
delivery-flow (top-level orchestrator, has Agent tool)
  │  Phase X: "Side Entry: analyst needed"
  │
  ├─▶ Agent(subagent_type="analyst-intake", prompt=<context>)
  │      │
  │      ▼
  │    analyst-intake → AGENT_RESULT (HANDOFF_PAYLOAD: <YAML>)
  │
  ├─ (flow が HANDOFF_PAYLOAD を抽出)
  │
  ├─▶ Agent(subagent_type="analyst-core", prompt=<HANDOFF_PAYLOAD YAML>)
  │      │
  │      ▼
  │    analyst-core → AGENT_RESULT (HANDOFF_TO: architect)
  │
  └─▶ flow が core の結果を受領し、次フェーズ (architect 等) に進む

※ flow orchestrator は `analyst` (orchestrator) を spawn してはならない。
  なぜなら `analyst` は内部で Agent tool を使うが、sub-agent として spawn された場合
  Agent tool が使えず失敗する (feasibility test 結果)。
  flow orchestrator 自身が top-level であるため、intake → core のチェーンを
  flow が直接書く必要がある。
```

### 4.2 重要原則: analyst.md (orchestrator) を sub-agent として呼ばない

`analyst.md` は **Agent tool を内部利用する** ため、その動作には自身が top-level
であることが前提となる。よって:

- `/analyst` skill から起動 (top-level) → OK
- delivery-flow / maintenance-flow から spawn (sub-agent) → **NG**

flow orchestrator から analyst 相当の処理を要求する場合は、flow orchestrator 自身が
`analyst-intake` → `analyst-core` の 2 段階を spawn する。中間の `analyst.md` を
経由しない。

### 4.3 implications

**delivery-flow.md (Side Entry: analyst)**

L135-152 の文面は **実質的に書き換えが必要** (v1 で「1 行注記で十分」と書いたのは誤り)。
具体的には:

- 「`analyst` agent を spawn する」記述を、「`analyst-intake` → `analyst-core` を順に
  spawn する」と書き換え
- intake の AGENT_RESULT から `HANDOFF_PAYLOAD` を抽出し、core の prompt に
  そのまま渡すロジックを明記
- Side Entry セクション (L135-152) は概ね 10-15 行程度の追記が必要 (intake / core
  spawn の 2 段階 + HANDOFF_PAYLOAD 中継の手順)

差分例 (delivery-flow.md L135-152 周辺):

```
Before:
  - Spawn `analyst` with the user's request.
  - On STATUS: success, proceed to architect phase.

After:
  - Spawn `analyst-intake` with the user's request.
    Receive AGENT_RESULT containing HANDOFF_PAYLOAD (YAML).
  - Extract HANDOFF_PAYLOAD verbatim.
  - Spawn `analyst-core` with prompt: HANDOFF_PAYLOAD content.
    Receive AGENT_RESULT with HANDOFF_TO: architect.
  - On STATUS: success, proceed to architect phase using core's AGENT_RESULT.
  - NOTE: do NOT spawn `analyst.md` directly — it uses the Agent tool internally
    and would fail when invoked as a sub-agent.
```

**maintenance-flow.md**

L50 / L70 / L91 / L105 / L99 / L111 / L146-148 / L162 / L163 / L195-198 で
`analyst` を参照。これらすべてで意味論的に `analyst-intake → analyst-core` の
チェーンを起動する必要がある。Information Passing table (L146-148) と Phase 2/3
のチェーン記述で 2 段階 spawn の手順を明示する必要がある。

差分箇所は概ね 3-5 ブロック (Phase 2 / Phase 3 / Information Passing table /
リカバリ節)。各 1-3 行の追記/書き換えで、合計 10-20 行程度の修正規模。

**`/analyst` skill (`.claude/commands/analyst.md`)**

L1 の "Launch the analyst agent" は **変更不要**。skill は引き続き `analyst.md`
(top-level orchestrator) を起動する。実装は orchestrator 内で intake → core を
チェーンする形に変わるが、skill から見た interface は同じ。

### 4.4 Rejected alternatives

- **Pattern A (intake が sub-agent から Agent tool で core を spawn)**: feasibility
  test で sub-agent → sub-agent spawn が不可能と判明 (§4.0)。**棄却**
- **Pattern C (hybrid: standalone は単一 agent / flow も単一 agent)**: 分割効果なし。
  cost 削減目標を達成できない
- **Pattern D (top-level wrapper を skill 経由で直接 intake → core を spawn する thin layer に書き換え、`analyst` agent 自体を削除)**: skill `.claude/commands/analyst.md`
  に Agent tool を持たせる必要があるが、skill は agent ではないため Agent tool を
  持てない。よって何らかの top-level agent を中継する必要があり、それが `analyst.md`
  である。**棄却** (構造制約)

### 4.5 Sub-agent → sub-agent spawn の技術的可行性 (再記)

feasibility test 結果より、sub-agent から Agent tool を使った sub-agent spawn は
**不可能**。よって全てのチェーン処理は top-level agent (slash-command 経由で起動
された agent) が担当する必要がある。Pattern B はこの制約に沿った唯一の設計。

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

## 6. Q6 Failure mode

### 6.1 分類

| core 状態 | caller のふるまい (analyst.md orchestrator / flow orchestrator 共通) |
|---|---|
| `STATUS: success` | 通常フロー継続 (HANDOFF_TO: architect 等) |
| `STATUS: error` | ユーザに報告。intake が作成した planning doc / branch / GitHub issue は **残置**。手動修正後にユーザが resume (§6.4 参照) |
| `STATUS: blocked` | caller が `BLOCKED_TARGET` agent を lightweight invoke (orchestrator-rules 通り)。answer 受領後、core を resume |
| `STATUS: suspended` | flow orchestrator の "Recovery from Session Interruption" 機構に従う。standalone では §6.4 の resume contract |

### 6.2 intake 失敗時

intake が Step A-D の途中で失敗した場合 (例: gh issue create が REPO_STATE=none で
skip → そのまま続行は問題ないが、`git push` が失敗するなど):

- intake は `STATUS: error` で停止。AGENT_RESULT に部分完了状態を記録
- caller (analyst.md or flow) は core を spawn せず、ユーザに intake のエラーを報告
- ユーザは intake を再実行可能 (再実行時の動作は §6.4)

### 6.3 core 失敗時 (intake は成功済み)

intake は成功し、core が `STATUS: error / blocked / suspended` の場合:

- planning doc / branch / GitHub issue は既存 (intake が作成済)
- caller (analyst.md or flow) は core の AGENT_RESULT を受領し、上位にエスカレート
- resume contract は §6.4

### 6.4 Resume contract (NEW — MAJOR-2 対応)

**設計方針**: intake が planning doc に **handoff YAML を HTML コメント形式で persist** し、
resume 時に caller がそれを検出して intake をスキップ、core から再開する。

#### 6.4.1 intake が persist する handoff コメント

intake は Step D の最終段階 (commit 直前) で、planning doc の冒頭メタデータブロック
直下に以下を埋め込む:

```markdown
> Last updated: 2026-05-16
> GitHub Issue: [#N](...)
> Authored by: analyst-intake

<!-- analyst-handoff
planning_doc_path: docs/design-notes/<slug>.md
slug: <slug>
branch_name: feat/<slug>
issue_url: https://github.com/.../issues/N
issue_number: N
issue_title: <title>
issue_type: feature
intake_summary: |
  <summary>
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: docs/SPEC.md
  - UI_SPEC: <missing>
  - ARCHITECTURE: docs/ARCHITECTURE.md
auto_approve: false
output_language: ja
-->

# Planning: ...
```

#### 6.4.2 Standalone resume (`/analyst` 再起動時)

`analyst.md` (orchestrator) は起動時に以下を実施:

1. ユーザ入力からスラグ候補を推測 (issue 番号 / キーワード)
2. `docs/design-notes/` 配下を Glob し、handoff コメントを含む planning doc を検索
3. ヒットした場合: ユーザに「Resume from analyst-core? (handoff YAML detected)」と
   AskUserQuestion で確認
   - Yes → handoff YAML を parse し、`analyst-core` を直接 Agent spawn (intake スキップ)
   - No → intake から通常起動 (新規 issue 扱い)
4. ヒットしなかった場合: intake から通常起動

#### 6.4.3 Flow orchestrator resume

delivery-flow / maintenance-flow が intake → core チェーンの途中 (core 失敗後) で
再起動された場合、同様に planning doc の handoff コメントを検出して core から再開できる。
flow orchestrator は自身の Recovery from Session Interruption 機構の一部として
handoff コメント検出ロジックを持つ。

#### 6.4.4 Rejected alternative

- **Resume を MVP 対象外とし、ユーザに新規 issue として再実行を求める**: 簡単だが
  重複 issue / 重複 planning doc / 重複 branch が発生し UX が悪化。**棄却**

---

## 7. 既存 `analyst.md` の fate — **top-level orchestrator として書き換え** を採用

> Note: agent count 40 → 42 differs from planning doc's 40 → 41 because analyst.md is
> retained as the top-level orchestrator (Pattern B requirement, §4) rather than deleted.

### 7.1 採用判断

Pattern B 構造上、**`/analyst` skill 経由の top-level エントリは必須**。よって
`analyst.md` を削除はせず、**60 行程度の top-level orchestrator に書き換える**。
これは v1 の「15-20 行 wrapper」とは異なり、実質的なロジック (intake → core チェーン /
HANDOFF_PAYLOAD 中継 / resume detection) を含む meaningful agent である。

```markdown
---
name: analyst
description: |
  Top-level orchestrator for standalone /analyst invocations. Chains analyst-intake
  (Sonnet, structured intake) → analyst-core (Opus, deep analysis) and passes the
  handoff payload between them. Detects existing planning docs for resume scenarios.
  Invoked by: /analyst slash command only.
  NOT invoked from flow orchestrators (they spawn analyst-intake / analyst-core
  directly themselves, since analyst.md uses the Agent tool which is unavailable
  in sub-agent contexts).
tools: Read, Glob, Grep, Agent
model: sonnet
---

You are the top-level analyst orchestrator. Your job is to:

1. Detect existing planning docs with `<!-- analyst-handoff -->` blocks (resume case)
   - If found: parse YAML, ask user to confirm resume, then spawn analyst-core only
2. Otherwise (fresh invocation): spawn analyst-intake with the user's request
   - Receive AGENT_RESULT with HANDOFF_PAYLOAD (YAML block)
   - Extract HANDOFF_PAYLOAD content
   - Spawn analyst-core with prompt set to the HANDOFF_PAYLOAD content
3. Receive analyst-core's AGENT_RESULT and emit it as your own final output
   (with agent-name rewritten to `analyst` for backward compatibility)

You do not perform analysis. You do not write files. You only orchestrate.

## Failure handling

- intake STATUS: error → report to user, do not spawn core, exit
- core STATUS: error/blocked/suspended → passthrough to user; resume mechanism
  per docs/design-notes/analyst-model-split-design.md §6.4

## Tool requirements

- Agent (required — to spawn analyst-intake and analyst-core)
- Read, Glob, Grep (for resume detection: scanning docs/design-notes/ for
  <!-- analyst-handoff --> blocks)
- NO Write/Edit/Bash (orchestrator does not modify files or run git)
```

### 7.2 採用理由

1. **Pattern B 構造上必須**: skill `/analyst` から intake → core の 2 段階を起動する
   ためには、Agent tool を持つ top-level agent が必要。skill 自身は Agent tool を
   持てない (skill ≠ agent)
2. **後方互換性**: `/analyst` skill / 外部ドキュメント (wiki / README / archived design
   notes) は `analyst` 名を参照しており、これを温存できる
3. **Cost 影響軽微**: orchestrator は Sonnet 動作で、全体 work の ~5% 程度のみ
   (詳細は §12)

### 7.3 Rejected alternatives

- **完全削除 + skill を直接 intake にバインド**: skill は intake → core の 2 段階を
  チェーンできない (skill は単一 agent 起動の interface)。**棄却**
- **15-20 行 wrapper (v1 案)**: Pattern A 前提だったため成立した。Pattern B では
  orchestrator が intake AGENT_RESULT から HANDOFF_PAYLOAD 抽出 / core spawn /
  passthrough emit のロジックを実装する必要があり、wrapper レベルでは不足。**棄却**

---

## 8. Q-additional Tool 要件

### 8.1 analyst.md (orchestrator) frontmatter

```yaml
---
name: analyst
description: |
  (§7.1 参照)
tools: Read, Glob, Grep, Agent
model: sonnet
---
```

`Agent` tool **必須** (intake → core を spawn するため)。`Read / Glob / Grep` は
resume detection (planning doc 検索) で利用。`Write / Edit / Bash` **不要** (orchestrator
は自身でファイル変更・git 操作を行わない)。

### 8.2 analyst-intake.md frontmatter

```yaml
---
name: analyst-intake
description: |
  Sonnet-tier intake agent. Collects minimum information via AskUserQuestion,
  writes the §1-4 stub of the planning doc with an `<!-- analyst-handoff -->`
  YAML block for resume detection, creates the GitHub issue, and commits the
  work branch's initial state. Emits HANDOFF_PAYLOAD in AGENT_RESULT for the
  caller to forward to analyst-core.
  Invoked as a sub-agent by: analyst (standalone), delivery-flow, maintenance-flow.
  NOT invoked directly via slash command.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---
```

**`Agent` tool 不要** (sub-agent として spawn されるため、Agent tool が使えない;
core spawn は caller が行う)。

### 8.3 analyst-core.md frontmatter

```yaml
---
name: analyst-core
description: |
  Opus-tier deep analysis agent. Receives handoff YAML (per design-notes
  schema §3) via the spawn prompt, performs Step 1-5 (classification,
  analysis, approval gate, SPEC/UI_SPEC incremental update, GitHub issue
  body refinement), and emits the final AGENT_RESULT with HANDOFF_TO: architect.
  Invoked as a sub-agent by: analyst (standalone), delivery-flow, maintenance-flow.
  NOT invoked directly via slash command.
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---
```

`Agent` tool 不要 (チェーンの終点で、自身は他 agent を spawn しない)。

---

## 9. Agent count bump file list (40 → 42)

> Note: agent count delta 40 → 42 (not 40 → 41 as planning doc claimed) because
> `analyst.md` is retained as the top-level orchestrator under Pattern B (§4),
> not deleted. Net: analyst-intake (+1) + analyst-core (+1) + analyst (kept, rewritten).

| ファイル | 修正内容 | 検索コマンド |
|---|---|---|
| `README.md` | shields.io `agents-40` → `agents-42`、本文 "all 40 agents" 表現 | `grep -nE "agents-40\|40 agents" README.md` |
| `README.ja.md` | shields.io `agents-40` → `agents-42`、本文 "40 エージェント" 表現 | `grep -nE "agents-40\|40 エージェント" README.ja.md` |
| `docs/wiki/en/Home.md` | L8 update history (新規エントリ追加)、L29 / L45 "all 40 agents" → "all 42 agents" | `grep -nE "39 → 40\|all 40 agents" docs/wiki/en/Home.md` |
| `docs/wiki/ja/Home.md` | L8 update history、L30 / L46 "40 エージェント" → "42 エージェント" | `grep -nE "39 → 40\|40 エージェント" docs/wiki/ja/Home.md` |
| `docs/wiki/en/Rules-Reference.md` | L87 "all 40 agents" → "all 42 agents" | `grep -nE "all 40 agents" docs/wiki/en/Rules-Reference.md` |
| `docs/wiki/ja/Rules-Reference.md` | 同上 (JA) | `grep -nE "40 エージェント\|all 40 agents" docs/wiki/ja/Rules-Reference.md` |
| `docs/wiki/en/Agents-Orchestrators.md` | L141-153 "Standalone Agents" の analyst エントリ → analyst (orchestrator) / analyst-intake / analyst-core の 3 エントリに差し替え | `grep -n "### analyst\|### codebase-analyzer" docs/wiki/en/Agents-Orchestrators.md` |
| `docs/wiki/ja/Agents-Orchestrators.md` | 同上 (JA) | 同上 path JA |
| `docs/wiki/en/Agents-Maintenance.md` | L42 NEXT 条件 / L31 PLAN 分岐の "analyst" 表記を維持 (orchestrator 経由) — 文中に 1 行注記追加 (任意) | `grep -n "analyst" docs/wiki/en/Agents-Maintenance.md` |
| `docs/wiki/ja/Agents-Maintenance.md` | 同上 (JA) | 同上 |
| `site/src/content/docs/en/index.mdx` | L73 "All 39 agents" → "All 42 agents" (stale 39 もここで一気に同期) | `grep -n "39 agents\|40 agents" site/src/content/docs/en/index.mdx` |
| `site/src/content/docs/ja/index.mdx` | verify in PR-2 (grep `39\|40\|41\|42` first); update or skip if no count string present | `grep -nE "39\|40\|41\|42" site/src/content/docs/ja/index.mdx` |
| `.claude/agents/delivery-flow.md` | L135-152 Side Entry を **書き換え** (§4.3 参照、約 10-15 行の追記)。`analyst` → `analyst-intake → analyst-core` の 2 段階 spawn を明示 | `grep -nE "analyst" .claude/agents/delivery-flow.md` |
| `.claude/agents/maintenance-flow.md` | Phase 2 / Phase 3 / Information Passing table (L146-148) / リカバリ節を **書き換え** (§4.3 参照、合計 10-20 行)。intake → core チェーン記述 | `grep -nE "analyst" .claude/agents/maintenance-flow.md` |
| `.claude/commands/analyst.md` | **変更不要** (skill は引き続き `analyst` agent を起動。orchestrator が intake → core をチェーン) | (1 ファイル直読で確認) |
| `.claude/agents/analyst.md` | 既存 405 行を 60 行程度の **top-level orchestrator** に置換 (§7.1) | (1 ファイル直読) |
| `.claude/agents/analyst-intake.md` | **新規作成** (§10.2 skeleton) | — |
| `.claude/agents/analyst-core.md` | **新規作成** (§10.3 skeleton) | — |
| `CHANGELOG.md` | Unreleased エントリ追加 (§11) | (直接 Edit) |
| `src/.claude/rules/agent-communication-protocol.md` | `## ARTIFACT_PATHS Field` 表の "Write agents" 例示リストに `analyst-intake`, `analyst-core` を追加 (現状 `analyst` のみ) | `grep -nE "analyst" src/.claude/rules/agent-communication-protocol.md` |
| `src/.claude/rules/git-rules.md` | `### Applicable Agents` 段落の co-author trailer 対象リストに analyst-intake / analyst-core を追加 (現状 `analyst` のみ) | `grep -nE "analyst" src/.claude/rules/git-rules.md` |

> 注: 上記 grep コマンドは architect の手元 (Bash 無し) では実行できないため
> developer が PR-2 開始時に sanity check として走らせること。

---

## 10. Skeleton drafts

実本文は developer が PR-2 で書く。以下は **section heading の outline のみ**。

### 10.1 `.claude/agents/analyst.md` (orchestrator, rewritten) skeleton

```
---
name: analyst
description: |
  (§8.1 / §7.1 参照)
tools: Read, Glob, Grep, Agent
model: sonnet
---

You are the top-level analyst orchestrator.

> rule references (minimal — sandbox-policy is N/A as no Bash; document-locations
  for planning doc resolution)

## Mission
  - Orchestrate analyst-intake → analyst-core chain for /analyst standalone invocations
  - Detect resume scenarios via <!-- analyst-handoff --> blocks in existing planning docs

## Resume detection
  - Glob docs/design-notes/*.md for <!-- analyst-handoff --> blocks matching user's
    request hints
  - On match: AskUserQuestion to confirm resume → skip intake, jump to core spawn
  - On miss: fresh invocation, start with intake spawn

## Spawn analyst-intake (fresh case)
  - Agent(subagent_type="analyst-intake", prompt=<user's original request>)
  - Receive AGENT_RESULT, extract HANDOFF_PAYLOAD

## Spawn analyst-core
  - Agent(subagent_type="analyst-core", prompt=<HANDOFF_PAYLOAD YAML>)
  - Receive AGENT_RESULT (HANDOFF_TO: architect)

## Passthrough to caller
  - Emit AGENT_RESULT: analyst (agent-name rewritten for back-compat),
    inheriting STATUS / HANDOFF_TO / NEXT / ARTIFACT_PATHS from core

## Failure handling
  - intake STATUS: error → emit AGENT_RESULT: analyst STATUS: error, no core spawn
  - core STATUS: error/blocked/suspended → passthrough; user reads error and resumes
    via §6.4 mechanism (re-run /analyst, orchestrator detects handoff block)

## Completion Conditions
```

### 10.2 `.claude/agents/analyst-intake.md` skeleton

```
---
name: analyst-intake
description: |
  (§8.2 参照)
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

You are the **intake agent** in the Aphelion analyst chain.

> rule references (sandbox-policy / denial-categories / git-rules / document-locations)
  — all 4 一行参照

## Mission
## Mandatory Checks Before Starting          (現 L37-49 を移植)
## Intake during standalone invocation       (現 L52-72 promotion 含む)
### Promotion from proposals/                (現 L59-72)
### Step A: Minimum intake questions          (現 L74-90)
### Step B: TBD / sentinel re-ask rule        (現 L92-107)
### Step C: Write the design note (§1-4 stub + handoff YAML HTML comment) (現 L109-135 + §6.4)
### Step D: Create the GitHub issue           (現 L137-148)
## Commit on Work Branch (initial)            (#136、§2.1 の intake 担当部分)
## Required Output on Completion (AGENT_RESULT)
  - STATUS: success | error
  - HANDOFF_TO: analyst-core (on success)
  - HANDOFF_PAYLOAD: |
      <YAML per §3>
  - ARTIFACT_PATHS: planning_doc / branch
## Completion Conditions
```

### 10.3 `.claude/agents/analyst-core.md` skeleton

```
---
name: analyst-core
description: |
  (§8.3 参照)
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---

You are the **deep analysis agent** in the Aphelion analyst chain.

> rule references — 4 件

## Mission                                     (deep analysis 専用文面に書き直し)
## Handoff Input Validation                    (NEW — §3 handoff schema の verify)
  - Spawn prompt から YAML literal を受領、必須 field の存在チェック
  - branch_name と現在の HEAD が一致することを git rev-parse で verify
  - 不一致なら STATUS: error / MISSING_FIELD: <name>
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
  分割し、`analyst` を top-level orchestrator (Sonnet) として書き換え。
  Pattern B (dual-path) 設計: standalone (`/analyst`) は `analyst` orchestrator が
  intake → core を順に Agent spawn。flow 経由 (delivery-flow / maintenance-flow)
  は各 flow 自身が intake → core をチェーンする (sub-agent → sub-agent spawn が
  Claude Code harness で不可のため)。intake 段階 (構造化質問・planning doc §1-4
  stub・gh issue create・work branch 初回 commit) を Sonnet で、深掘り分析
  (Step 1-5・SPEC.md/UI_SPEC.md 更新・gh issue body 確定) を Opus で実行する。
  resume 機構: planning doc に `<!-- analyst-handoff -->` YAML を埋め込み、
  再起動時に intake をスキップして core から再開可能。
  Per-invocation input cost ~24% 削減。`/analyst` skill 名は据え置き。
  delivery-flow / maintenance-flow の wiring は約 10-20 行ずつ書き換え。
  Agent count 40 → 42。(#139)
```

---

## 12. Cost estimate (planning doc §3.4 / v1 §12 verification)

planning doc は ~30-40% per-invocation 削減を主張。v1 design は ~28% と推定。
v2 design (Pattern B dual-path) で再評価:

### 12.1 Line distribution (実測)

| Phase | 行数 | 行比率 | model |
|---|---|---|---|
| Intake (L37-148) | 112 | 30% | Sonnet |
| Core (L151-405) | 254 | 70% | Opus |

### 12.2 Token distribution 推定

Line ratio (30/70) vs token ratio の差異検討:

**Option (a) — token ratio justification**: intake 部分は AskUserQuestion JSON block /
template heredoc / 多数の sentinel string 列挙を含むため、行あたりの token 密度が
core (主に prose) より高い可能性がある。これにより token 比率が 35-40/60-65 に
シフトする可能性。だが定量検証は架空で、保守的に line ratio を採用するのが安全。

**Option (b) — line ratio を採用、cost 推定を下方修正**: line 比率 (30/70) を
そのまま token 比率と仮定。これが MAJOR-3 reviewer 指摘の推奨対応。

**v2 採用**: **Option (b)** — 保守的に。

### 12.3 Cost ratio 計算 (orchestrator overhead 込み)

Anthropic 2026 pricing: Sonnet ~$3/Mtok input, Opus ~$15/Mtok input → **5×** ratio。

- 旧 (single analyst.md on Opus): 100% × 1.0 = **1.00**
- 新 (Pattern B):
  - analyst.md orchestrator (Sonnet): ~5% overhead
  - analyst-intake (Sonnet): ~30% × 0.95 (orchestrator share を差し引いた残り) ≈ 28.5%
  - analyst-core (Opus): ~70% × 0.95 ≈ 66.5%
  - 計算: 0.05 × 0.2 + 0.285 × 0.2 + 0.665 × 1.0 = 0.01 + 0.057 + 0.665 = **0.732**

→ 削減率 **~27%**。

簡略化計算 (orchestrator overhead 無視):
- 0.30 × 0.2 + 0.70 × 1.0 = 0.06 + 0.70 = **0.76**
- 削減率 **~24%**

### 12.4 verdict

planning doc の主張 (30-40%) は **やや楽観的**。v1 design (~28%) は token/line ratio
混同 (40/60 vs 30/70) があり再計算が必要。v2 design (orchestrator overhead 込み)
で **~24-27%** が現実的なレンジ。

CHANGELOG / PR 本文では **conservative に "~24%"** を記載することを推奨 (under-promise)。
flow 経由 invocation では analyst.md orchestrator overhead が発生しないため (flow が
直接 intake / core を spawn)、flow path は ~27% に近い削減率となる。

### 12.5 output token

Opus 比率は output でも同様 → 出力側も同等の削減率。intake の output (planning
doc §1-4 stub + commit msg + AGENT_RESULT YAML) は比較的少量で、Sonnet 化の
output cost 削減効果は input より小さい。全体的に input ~24% / output ~26%
程度の per-invocation cost reduction が現実的。

---

## 13. Risks (planning doc §6 拡張)

planning doc §6 の 6 件に加え、architect が以下 5 件を追加 (v1 の 4 件に R11 追加):

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R7 | intake → core 間 (caller 中継) で `git push` 失敗時、branch がリモートにない状態で core が起動 → core の HEAD verify (§2.1) が false negative | 中 | core の Step 0 で `git push` を retry。`git rev-parse @{u}` で upstream 確認 |
| R8 | intake が `gh issue create` 後・push 前にクラッシュ → orphan issue がリモートに残る | 低-中 | intake の最終 step は (1) gh issue create → (2) planning doc に issue URL + handoff YAML 反映 → (3) git commit → (4) git push の順。crash した場合は §6.4 resume 機構が次回起動時に planning doc を検出して core から再開 |
| R9 | caller (orchestrator or flow) が intake AGENT_RESULT から HANDOFF_PAYLOAD を正しく抽出できない / core への prompt 注入で escape が壊れる | 高 | HANDOFF_PAYLOAD は **YAML literal block (`|`)** 形式で改行を保持。caller は block を verbatim にコピーする (改変禁止)。e2e test で round-trip 検証 |
| R10 | Sonnet が `gh issue create` の body template fill で複雑な escape (heredoc / EOF) を誤る | 中 | intake の Step D テンプレートを「最小限の変数置換のみ」に簡素化。analytical な refinement は core (Opus) の Step 5 に委ねる |
| R11 | Agent tool spawn timeout: analyst.md orchestrator (top-level) が intake or core spawn 時に harness timeout | 中 | analyst.md orchestrator は `STATUS: error` を emit、`HANDOFF_TO: user` を付加し、ユーザに手動 resume を案内 (再 `/analyst` 起動 → §6.4 resume 検出経路) |

planning doc 内の R1-R6 mitigation は概ね妥当。R3 (Sonnet 品質) について
**追加策**: 万一 intake が AskUserQuestion 構造化を誤る場合、frontmatter の
`model: sonnet` を `model: opus` に上書きする escape hatch を user-doc に明記。

---

## 14. Acceptance criteria (PR-2 完了条件) — planning doc §7 を踏襲

- [ ] `.claude/agents/analyst-intake.md` 新規作成 (model: sonnet, **Agent tool 含まない**)
- [ ] `.claude/agents/analyst-core.md` 新規作成 (model: opus, **Agent tool 含まない**)
- [ ] `.claude/agents/analyst.md` を 60 行程度の **top-level orchestrator** に置換 (§7.1 / §10.1)
      (model: sonnet, **Agent tool 含む**, Write/Edit/Bash なし)
- [ ] `/analyst` skill (`.claude/commands/analyst.md`) は変更不要 (動作確認のみ)
- [ ] `delivery-flow.md` Side Entry 節を 10-15 行書き換え (§4.3)
- [ ] `maintenance-flow.md` Phase 2 / 3 / Information Passing table (L146-148) / リカバリ節を合計 10-20 行書き換え
- [ ] Agent count 40 → 42 を §9 file list 全件で反映
- [ ] `agent-communication-protocol.md` / `git-rules.md` の applicable agents リストに 2 件追加
- [ ] CHANGELOG.md Unreleased エントリ追加
- [ ] handoff YAML HTML コメント形式 (§6.4) を intake が planning doc に persist
- [ ] e2e: `/analyst` 標準呼び出しが完走し、AGENT_RESULT (agent-name: analyst, core 結果 passthrough) が emit される
- [ ] e2e: `/maintenance-flow` Patch 経路で intake → core → developer → tester が完走
- [ ] e2e: standalone resume — `/analyst` 再起動時に handoff コメントを検出し core から再開
- [ ] `scripts/check-readme-wiki-sync.sh` が pass (README EN/JA heading parity 維持)

---

## 15. Handoff brief for developer

- 本設計 doc + planning doc を読み、§2 boundary table と §10 skeleton を
  根拠に PR-2 を実装すること
- 実装順 (推奨):
  1. analyst-core.md 新規作成 (§10.3)。analyst.md の Step 1-5 + Commit (final)
     部分を移植。Handoff Input Validation セクション (§3 / §6.4) を追加
  2. analyst-intake.md 新規作成 (§10.2)。Mandatory Checks + Step A-D +
     Commit (initial) + handoff YAML HTML コメント埋め込みロジック (§6.4)
  3. analyst.md を top-level orchestrator に置換 (§10.1 / §7.1)。
     resume detection (Glob で `<!-- analyst-handoff -->` 検索) を含む
  4. delivery-flow.md の Side Entry 書き換え (§4.3)
  5. maintenance-flow.md の Phase 2/3 / Information Passing table 書き換え (§4.3)
  6. /analyst skill 変更不要 (動作確認のみ)
  7. wiki / README / shields.io 一括 bump (§9 file list)
  8. CHANGELOG.md エントリ
  9. e2e: 手元で /analyst を 1 回試行 → AGENT_RESULT が analyst から emit され、
     かつ HANDOFF_TO / NEXT が core 由来であることを確認
  10. e2e: standalone resume シナリオ — analyst-core を手動で error 終了させ、
      再度 /analyst 起動 → handoff コメント検出 → core skip-to-resume の確認
- PR タイトル候補: `refactor: split analyst into analyst-intake (Sonnet) + analyst-core (Opus) (#139)`
- PR body には `Closes #139` を含めること

---

## 16. Open follow-ups (out of scope for PR-2)

- analyst.md orchestrator の最終削除タイミング: Pattern B が必須とするため当面削除不可。
  Claude Code harness が将来 sub-agent → sub-agent spawn を許可した場合、Pattern A
  への移行検討。別 issue
- `/analyst` skill の name を `/analyze` などに改名する案: 後方互換に影響大、
  別 RFC
- intake が proposals/ promotion で `git mv` する際、proposals/ 側に
  `> Promoted to: <URL>` の breadcrumb を残す案: planning doc では言及無し、
  別 issue 候補
- resume 機構の handoff YAML フォーマットを agent-communication-protocol.md 本体に
  正式化する案 (現状は本設計 doc 内のみ規定): 別 RFC
