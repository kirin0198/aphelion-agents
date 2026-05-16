> Last updated: 2026-05-16
> GitHub Issue: [#139](https://github.com/kirin0198/aphelion-agents/issues/139)
> Authored by: analyst (2026-05-16)
> Parent context: [archived/token-reduction.md](./archived/token-reduction.md) (#132 closed) §"PR-2 = §C Model split"
> Next: architect (mandatory — agent split boundary, invocation pattern, flow orchestrator wiring)

# Analyst モデル分割 — analyst-intake (Sonnet) + analyst-core (Opus)

#132 §C (token-reduction の Model split 案) を独立した issue として切り出したもの。
#132 自体は PR-1 (§B aphelion-overview.md slim) のマージで close 済。
本 issue は §C の単独実施を目的とし、archived/token-reduction.md §"PR-2" を起点に
具体設計を進める。

## 1. Background / motivation

`.claude/agents/analyst.md` は 405 行、`model: opus` で動作している。
全フェーズが Opus で実行されるため、構造化入力収集 (intake) や template fill のような
高精度を要さない処理にも Opus トークンコストを支払っている。

archived/token-reduction.md §C より:

> 現状 analyst は opus 指定だが、フェーズによって必要な精度が異なる。
> フェーズごとにモデルを使い分けることでコストを削減する。
>
> | フェーズ | 現状 | 推奨モデル | 理由 |
> |---|---|---|---|
> | Phase A: インテーク収集 | opus | Sonnet | 構造化質問の収集は高精度不要 |
> | Phase B: TBD 再質問・センチネル | opus | Sonnet | ルールベースの処理 |
> | 深掘り分析 (§5–§8 生成) | opus | Opus | 設計判断・根本原因分析が必要 |
> | SPEC.md 差分更新 | opus | Sonnet | テンプレート的な書き込み |
> | GitHub issue 作成 | opus | Sonnet | フォーマット整形のみ |

## 2. Root cause / structural analysis

`.claude/agents/analyst.md` の structure (実測):

| 範囲 | 行数 | フェーズ | 推奨モデル |
|---|---|---|---|
| l.26-36 | 11 | Mission | (frontmatter のみ) |
| l.37-51 | 15 | Mandatory Checks Before Starting (rules read / probe) | Sonnet |
| l.52-150 | 99 | **Intake** (Step A intake Q&A / Step B TBD / Step C draft doc / Step D gh issue create) | **Sonnet** |
| l.151-170 | 20 | Step 1: Issue Classification | Opus (判断ロジック) |
| l.172-194 | 23 | Step 2: Analysis Procedure by Type | **Opus** (根本原因分析) |
| l.196-245 | 50 | Step 3: User Approval | Opus (説明品質重要) |
| l.247-264 | 18 | Step 4: Document Updates (SPEC.md / UI_SPEC.md) | Opus (整合性判断) |
| l.266-328 | 63 | Step 5: GitHub Issue refinement | Sonnet (template fill) |
| l.330-382 | 53 | Commit on Work Branch (#136 rule) | Sonnet (mechanical) |
| l.384-405 | 22 | Output / Completion | (両方共通) |

→ 自然な分割線: **Step D と Step 1 の間** (line ~150)。

ただし Step 5 (GitHub Issue refinement) は ARCHITECT_BRIEF など analyst-core の出力を
issue body に書き込むため、core 側に残すのが妥当。または、core が必要情報を返却し、
intake 経由で final gh issue update を行う設計も可能。これは architect 判断。

## 3. Hypothesis: agent split design

### 3.1 analyst-intake (Sonnet)

- **Model**: sonnet
- **Tools**: Read, Write, Edit, Bash, Glob, Grep, **Agent** (new — to spawn analyst-core)
- **Scope**:
  - Mandatory Checks Before Starting
  - Promotion from proposals/
  - Step A: Minimum intake questions
  - Step B: TBD / sentinel re-ask rule
  - Step C: Write the design note (§1-4 draft only — Background, Type, Scope, Initial analysis stub)
  - Step D: Create the GitHub issue (initial body, type label, slug)
  - Commit on Work Branch (planning doc + work branch creation per #136)
  - **Spawn analyst-core via Agent tool**, passing:
    - planning_doc_path
    - slug
    - branch_name
    - issue_url
    - issue_type (bug/feature/refactor)
  - Emit `AGENT_RESULT` with `STATUS: success`, `HANDOFF_TO: analyst-core`, `NEXT: analyst-core`

### 3.2 analyst-core (Opus)

- **Model**: opus
- **Tools**: Read, Write, Edit, Bash, Glob, Grep
- **Inputs from intake** (via Agent prompt):
  - planning_doc_path, slug, branch_name, issue_url, issue_type
- **Scope**:
  - Step 1: Issue Classification (verify intake's tentative classification)
  - Step 2: Analysis by type (deep root-cause / design analysis)
  - Step 3: User Approval gate
  - Step 4: Document updates (SPEC.md / UI_SPEC.md incremental edit)
  - Step 5: GitHub issue body refinement + ARCHITECT_BRIEF construction
  - Final commit (analysis additions to planning doc + SPEC/UI_SPEC edits)
  - Emit final `AGENT_RESULT` with `HANDOFF_TO: architect`, `NEXT: architect`

### 3.3 `/analyst` skill behavior (preserved)

- Skill `analyst` continues to invoke `analyst-intake` (not visible to user)
- `analyst-intake` → `analyst-core` chain runs transparently
- User experiences identical Q&A flow

### 3.4 Cost estimate (informal)

Sonnet input is ~5× cheaper than Opus. If intake consumes ~50% of analyst's
total input tokens and runs on Sonnet:

- Old: 100% × Opus_rate = baseline
- New: 50% × Sonnet_rate + 50% × Opus_rate = 0.5 × (Opus/5) + 0.5 × Opus = 0.6 × Opus

→ ~40% input cost reduction per analyst invocation. Output cost reduction
similar (Sonnet output ~5× cheaper). Net per-invocation savings ~30-40%.

## 4. Architect open questions

1. **Invocation pattern**: direct spawn from intake (intake → core) vs parent-orchestrated (caller spawns both)?
   - Trade-off: direct is simpler for `/analyst` standalone; parent-orchestrated is cleaner for delivery-flow / maintenance-flow integration
   - **Hypothesis**: direct spawn for standalone, parent-orchestrated for flow orchestrators. Both patterns coexist
2. **Boundary precision**: exact line ranges from current analyst.md that move to each new file
3. **`/analyst` skill name retention**: keep `/analyst` as user-visible entry (recommended) or expose both
4. **Flow orchestrator wiring**: `delivery-flow.md` / `maintenance-flow.md` references to `analyst` — update them to `analyst-intake` (chained) or call both explicitly?
5. **Handoff fields between intake and core**: exact list (planning_doc_path, slug, branch_name, issue_url, issue_type, ...?)
6. **Failure mode**: if analyst-core (Opus) fails, can analyst-intake retry, or restart from scratch?
   - **Hypothesis**: emit `STATUS: blocked` with `BLOCKED_TARGET: analyst-core` and let user resume
7. **Step 4 / Step 5 ownership**: SPEC.md update and final issue body refinement — both stay in core, OR Step 5 moves back to intake (mechanical) using core's output?

## 5. Agent count bump propagation

40 → 41. Same propagation set as #54 (doc-flow), #133 (specialized reviewers):

- `README.md` body + shields.io badge (`agents-40` → `agents-41`)
- `README.ja.md` body + shields.io badge (Same-PR sync mandatory per language-rules.md §3.2)
- `docs/wiki/en/Home.md` (3 references — update history, table row, table row)
- `docs/wiki/ja/Home.md` (mirror)
- `src/.claude/rules/aphelion-overview.md` Domain and Flow Overview ASCII diagram (analyst sits in Delivery? actually Maintenance/cross-domain — verify with architect)
- `docs/wiki/{en,ja}/Agents-Maintenance.md` or `Agents-Orchestrators.md` (analyst's home page — verify which one lists it)
- `CHANGELOG.md`

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| ユーザ体感の変化 (intake → core 切り替え時のレイテンシ等) | 中 | analyst-intake が transparent spawn する設計でユーザには見えない。レイテンシは Sonnet 高速化で相殺 |
| analyst-intake / analyst-core 間のコンテキスト引き継ぎ漏れ | 高 | 引き継ぎ field 一覧を architect 段階で明示確定 (open question 5)。template に組み込む |
| Sonnet が intake 品質を満たさない (質問の構造化が劣化等) | 中 | analyst-intake は AskUserQuestion / 構造化テンプレ fill 主体。Sonnet で十分の見込み。万一の場合は frontmatter を opus に上書きする option を残す |
| delivery-flow / maintenance-flow の analyst 呼び出しが破綻 | 高 | architect が wiring 詳細設計。両 flow の e2e テストを実施 |
| `/analyst` skill 動作変更でドキュメントが古くなる | 中 | wiki Agents-Orchestrators.md または Agents-Maintenance.md の analyst 説明を同 PR で更新 |
| Agent tool が intake に必要だが、agent-tool 連鎖の制約 (Claude Code 仕様) | 中 | architect が技術検証。代替案として parent-orchestrated パターンを用意 |

## 7. Acceptance criteria

- [ ] `.claude/agents/analyst-intake.md` 新規作成 (`model: sonnet`, Tools 含む Agent)
- [ ] `.claude/agents/analyst-core.md` 新規作成 (`model: opus`)
- [ ] `.claude/agents/analyst.md` 削除 or 1-paragraph wrapper 化 (architect 判断)
- [ ] `/analyst` skill 起動でユーザ体感が変わらない (Q&A / planning doc / issue / SPEC update / AGENT_RESULT)
- [ ] `delivery-flow.md` / `maintenance-flow.md` の analyst 呼び出しが新フローに対応
- [ ] Agent count bump 40 → 41 が README / README.ja / Home.md (EN+JA) / shields.io / aphelion-overview / Agents-* wiki / site/index.mdx に反映
- [ ] CHANGELOG.md Unreleased エントリ
- [ ] e2e: `/analyst` 標準呼び出しが完走する
- [ ] e2e: `/maintenance-flow` (analyst を含むパス) が完走する

## 8. Handoff brief for architect

- 着手順:
  1. 本 planning doc §4 open questions を全て answer
  2. `docs/design-notes/analyst-model-split-design.md` を作成して具体設計 (line range / field list / wiring 詳細) を記述
  3. 同ブランチ (`refactor/analyst-model-split`) に commit + push (#136 Planning-tier rule)
- 必須読み込み:
  - 本 planning doc
  - `.claude/agents/analyst.md` (現状実装)
  - `.claude/agents/delivery-flow.md`, `.claude/agents/maintenance-flow.md` (analyst 呼び出し箇所)
  - `archived/token-reduction.md` §C (元提案)
  - `archived/agent-definition-simplification-design.md` (Field Reference 構造の参考)
- 出力: design doc + architect open questions の全 answer。
  developer は design doc を読んで PR-2 を実装。
