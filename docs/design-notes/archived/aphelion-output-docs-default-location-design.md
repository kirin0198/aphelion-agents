> Last updated: 2026-05-11
> Revised 2026-05-11 (P1/P2 review feedback)
> GitHub Issue: [#117](https://github.com/kirin0198/aphelion-agents/issues/117)
> Linked Plan: docs/design-notes/aphelion-output-docs-default-location.md
> Designed by: architect (2026-05-11)
> Next: developer
>
> Revision notes (2026-05-11):
>   - P1-1: 擬似コード関数記法 `resolve_read()` / `resolve_write_new()` /
>     `resolve_write_update()` を全廃。`document-locations.md` のアルゴリズム節を
>     自然言語＋表で書き直し (既存 `sandbox-policy.md` / `denial-categories.md`
>     と同じ規範スタイルに揃える)。
>   - P1-2: 各 agent 定義への差分を「冒頭 1 行の参照宣言 + Output File 見出しの
>     括弧書き 1 箇所」の **最小差分パターン** に縮小。Required Verification 節
>     や Read 一覧は触らない (auto-load された rule が規範になる)。
>   - P1-3: 既存ファイル探索を **`Glob("{docs/<NAME>.md,<NAME>.md}")` 1 回** に
>     統一。二段 Read は MUST NOT 化し、`denial-categories.md` の
>     `file_not_found` 誤検知を回避。
>   - P2-1: `ARTIFACT_PATHS:` フィールドを `agent-communication-protocol.md` の
>     **一級フィールド (MUST for Write-agents)** に格上げ。orchestrator は
>     `ARTIFACT_PATHS` を後続 agent prompt に **必ず carry** する。
>   - P2-2: `TASK.md` の扱いを「決定済み: root 固定 (document-locations.md の
>     対象外)」に確定。`document-versioning.md` の TASK.md Lifecycle と整合。
>   - P2-3: codebase-analyzer の AskUserQuestion に
>     **auto-approve 時の docs/ デフォルト・フォールバック**を明記。

# Design: Aphelion 生成ドキュメントの配置先を docs/ 配下にデフォルト化

本書は Issue [#117](https://github.com/kirin0198/aphelion-agents/issues/117) (Planning doc:
[aphelion-output-docs-default-location.md](./aphelion-output-docs-default-location.md))
の architect フェーズ設計書である。Aphelion 本体 (aphelion-agents リポジトリ)
の **agent 定義 / rules / templates / commands** を変更し、生成される
`SPEC.md` `ARCHITECTURE.md` `UI_SPEC.md` `VISUAL_SPEC.md` `DISCOVERY_RESULT.md`
`HANDOVER.*` などのデフォルト出力先を、リポジトリ直下から `docs/` 配下へ
切り替える。既存プロジェクトを壊さないため「直下フォールバック」を組み合わせる
(planning doc §4 案 B)。

---

## §1 アーキテクチャ概要

### 1.1 設計原則

1. **集中ルール化** — パス解決ロジックを 1 か所
   (`.claude/rules/document-locations.md`, 新規) に集約する。
   各 agent はこのルールを冒頭で参照宣言するのみで、自前で擬似コードや
   ハードコードしたパスは持たない (既存 `sandbox-policy.md` /
   `denial-categories.md` と同じ "agents-as-rules" 委譲モデル)。
2. **agent への差分は最小限** — Write を行う agent には
   `## Output File:` 見出しの括弧書き 1 箇所を追記するのみ。Read 一覧 /
   Required Verification 節は触らない (auto-load 済みの rule が規範になる)。
3. **下位互換は読み取りフォールバック・書き込み新規デフォルト** —
   - **Read**: `Glob("{docs/<NAME>.md,<NAME>.md}")` 1 回で発見した
     最初のパス。両方ヒット時は `docs/` を優先。
   - **Write (新規作成)**: 必ず `docs/<NAME>.md` に置く。
   - **Write (既存更新)**: 直前の Read で解決されたパスをそのまま使う
     (既存リポは直下のまま、新規リポは docs/ 配下のまま育つ)。
4. **テンプレ skeleton は English-fixed のまま** —
   `> Source: SPEC.md @ ...` 等の skeleton 文字列は変更しない。実体ファイルの
   配置先のみが変わる。エージェントは Source 表記を実際の解決パスで埋める。

### 1.2 全体図

```
       ┌─────────────────────────────────────────────────────────┐
       │  .claude/rules/document-locations.md (new)              │
       │   - Resolution table (Read: Glob {docs/,root}, Write:   │
       │     always docs/, Update: stay-where-found)             │
       │   - Variable / artifact name table                      │
       └────────────────────────────▲────────────────────────────┘
                                    │ Auto-loaded (session start)
        ┌──────────────────┬────────┴────────┬──────────────────┐
        ▼                  ▼                 ▼                  ▼
   spec-designer       architect       developer/...         handover-author
   (Write SPEC)        (Write ARCH)    (Read SPEC,ARCH)      (Read SPEC,ARCH)
        │                  │                 │                  │
        └── Each agent declares "Follows document-locations.md" ┘
            in its prompt prelude; resolves at runtime.
                                    │
                                    ▼
        ┌────────────────────────────────────────────────────┐
        │ Project repo (user side)                           │
        │  docs/SPEC.md       ←─ new default                 │
        │  docs/ARCHITECTURE.md                              │
        │  docs/UI_SPEC.md                                   │
        │  docs/VISUAL_SPEC.md                               │
        │  docs/DISCOVERY_RESULT.md                          │
        │  docs/DELIVERY_RESULT.md (orchestrator-produced)   │
        │  docs/HANDOVER.{en,ja}.md (legacy/optional)        │
        │  SPEC.md (legacy direct-root, kept if it exists)   │
        │  TASK.md (root-fixed; out of scope for this rule)  │
        └────────────────────────────────────────────────────┘
```

### 1.3 スコープ

| Item | In-scope | Out-of-scope |
|------|----------|--------------|
| 移動対象ファイル種別 | SPEC, ARCHITECTURE, UI_SPEC, VISUAL_SPEC, DISCOVERY_RESULT, DELIVERY_RESULT, OPS_RESULT, MAINTENANCE_RESULT, HANDOVER, SECURITY_AUDIT, TEST_PLAN | `docs/deliverables/{slug}/*` (既に docs/ 配下), `docs/design-notes/` (現状維持), **`TASK.md` (root 固定; §7.2 で確定)** |
| ユーザープロジェクトへの自動マイグレーション | No (フォールバックで吸収) | リポジトリの既存ファイル移動を agent が勝手に行うこと |
| 設定ファイル `.aphelionrc` 導入 | No (Future work) | (planning doc §8 保留事項) |
| aphelion-agents 自身の dogfooding 移行 | No (別 issue 扱い) | この PR で SPEC.md/ARCHITECTURE.md を新設すること |

---

## §2 変更対象ファイル一覧

リポジトリ相対パス。`✏` は新規作成、`📝` は内容更新、`👀` は影響確認 (場合により小修正)。

### 2.1 ルール (rules) ― 新規・更新

| Path | Action | 内容概要 |
|------|--------|----------|
| `src/.claude/rules/document-locations.md` | ✏ new | パス解決アルゴリズム (自然言語の手順表) + 対象ファイル一覧 (§3.1) を定義 |
| `src/.claude/rules/file-operation-principles.md` | 📝 | 「対象成果物のパスは `document-locations.md` を参照」と 1 行追加 |
| `src/.claude/rules/aphelion-overview.md` | 📝 | rules 数を +1 (13→14)。表に `document-locations.md` を追加 |
| `src/.claude/rules/document-versioning.md` | 📝 | 例示ファイル名の括弧書きを「(`docs/SPEC.md` ほか、または legacy `SPEC.md`)」に置換。**TASK.md 節は変更しない (root 固定)** |
| `src/.claude/rules/agent-communication-protocol.md` | 📝 | `ARTIFACT_PATHS:` を **MUST フィールド (Write-agents)** として追記 (§3.3) |

> ⚠️ ファイルの実体は `src/.claude/rules/` (canonical)。`bin/aphelion-agents.mjs`
> の overlay-copy ロジックが `.claude/rules/` に配布するため、bin スクリプトは
> 変更不要 (新規 rules ファイルは自動で配布される)。

### 2.2 Orchestrator 共通

| Path | Action | 内容概要 |
|------|--------|----------|
| `.claude/orchestrator-rules.md` | 📝 | `## Handoff File Specification` の各 RESULT.md 例示に「(default: `docs/<NAME>.md`)」を併記。`Phase Execution Loop` step 2 に **`ARTIFACT_PATHS` を次 agent prompt へ carry する** 旨を必須化 (P2-1) |
| `.claude/agents/discovery-flow.md` | 📝 | 冒頭に「Follows .claude/rules/document-locations.md ...」1 行を追加 |
| `.claude/agents/delivery-flow.md` | 📝 | 同上 + 「At Startup」の既存ファイル検出を `Glob` 1 回パターンに置換 |
| `.claude/agents/maintenance-flow.md` | 📝 | 同上 |
| `.claude/agents/doc-flow.md` | 📝 | 同上 |
| `.claude/agents/operations-flow.md` | 📝 | 同上 |

### 2.3 Agent 定義 (Delivery / Maintenance / Doc)

書き込み (Write) を行う agent ＝ 「新規作成は `docs/` 配下」が責務:

| Agent | Write 対象 | 変更点 (最小差分) |
|-------|-----------|--------|
| `.claude/agents/spec-designer.md` | SPEC.md | 冒頭 1 行参照宣言 + `## Output File:` 見出しに括弧書き |
| `.claude/agents/architect.md` | ARCHITECTURE.md | 同上 |
| `.claude/agents/ux-designer.md` | UI_SPEC.md | 同上 |
| `.claude/agents/visual-designer.md` | VISUAL_SPEC.md | 同上 |
| `.claude/agents/codebase-analyzer.md` | SPEC.md, ARCHITECTURE.md | 同上 + **AskUserQuestion (auto-approve 時は docs/ デフォルト)** (§7.1) |
| `.claude/agents/analyst.md` | SPEC.md / UI_SPEC.md (incremental Edit) | 同上 |

読み込み (Read) のみ行う agent:

| Agent | Read 対象 | 変更点 (最小差分) |
|-------|-----------|--------|
| `.claude/agents/developer.md` | SPEC, ARCHITECTURE, UI_SPEC | **冒頭 1 行参照宣言のみ** (Required Verification 節は触らない) |
| `.claude/agents/tester.md`, `reviewer.md`, `security-auditor.md`, `scaffolder.md` | SPEC, ARCHITECTURE | 同上 |
| `.claude/agents/doc-reviewer.md` | SPEC, ARCHITECTURE, UI_SPEC, DISCOVERY_RESULT | 同上 |
| `.claude/agents/handover-author.md` | SPEC, ARCHITECTURE, SECURITY_AUDIT, TEST_PLAN | 同上。出力 (`docs/deliverables/{slug}/handover.{lang}.md`) は不変 |
| `.claude/agents/hld-author.md`, `lld-author.md`, `api-reference-author.md`, `ops-manual-author.md`, `user-manual-author.md` | SPEC, ARCHITECTURE 系 | 同上 |
| `.claude/agents/impact-analyzer.md`, `change-classifier.md`, `test-designer.md`, `e2e-test-designer.md`, `db-ops.md`, `infra-builder.md`, `observability.md`, `releaser.md`, `ops-planner.md`, `scope-planner.md`, `interviewer.md`, `researcher.md`, `concept-validator.md`, `poc-engineer.md`, `rules-designer.md`, `doc-writer.md` | 各種 | **冒頭 1 行参照宣言のみ**。本文中の `SPEC.md` `ARCHITECTURE.md` といった prose 表現は **そのまま残す** (rule に従って解決される前提) |

### 2.4 Templates

| Path | Action | 内容概要 |
|------|--------|----------|
| `.claude/templates/doc-flow/handover.en.md` | 📝 | "Source artifacts" 表 (L179-180) の `SPEC.md` / `ARCHITECTURE.md` 行に小注記 ("resolved per document-locations.md") |
| `.claude/templates/doc-flow/handover.ja.md` | 📝 | 同上 (ja) |
| `.claude/templates/doc-flow/hld.{en,ja}.md` | 👀 | `> Source: ARCHITECTURE.md @ {date}` の skeleton はそのままで OK。値埋め時に解決パスを使う |
| `.claude/templates/doc-flow/lld.{en,ja}.md` | 👀 | 同上 |
| `.claude/templates/doc-flow/api-reference.{en,ja}.md` | 👀 | 同上 |
| `.claude/templates/doc-flow/ops-manual.{en,ja}.md` | 👀 | 同上 |
| `.claude/templates/doc-flow/user-manual.{en,ja}.md` | 👀 | 同上 |

> 方針: skeleton 文字列 (英語固定) は変えない。テンプレを fill する author agent
> 側で「実体ファイルの相対パス」を Source 行に書く (例: `> Source: docs/SPEC.md @ 2026-05-05`)。

### 2.5 Commands

| Path | Action | 内容概要 |
|------|--------|----------|
| `.claude/commands/aphelion-help.md` | 📝 | help 一覧の `SPEC.md / ARCHITECTURE.md` 表記を `SPEC.md / ARCHITECTURE.md (docs/ 配下、既存リポはルート直下も可)` に更新 |
| `.claude/commands/aphelion-init.md` | 📝 | 「初期配置時にユーザープロジェクトの `docs/` 配下にドキュメントが置かれる」旨を 1 段落追加 |
| `.claude/commands/analyst.md`, `codebase-analyzer.md`, `reviewer.md`, `doc-flow.md` | 👀 | 言及表現を最小限揃える |

### 2.6 Wiki / README (英語 = canonical, 日本語追従)

| Path | Action |
|------|--------|
| `docs/wiki/en/Architecture-Domain-Model.md` | 📝 (SPEC/ARCHITECTURE のデフォルト配置先記載があれば追記) |
| `docs/wiki/en/Architecture-Operational-Rules.md` | 📝 |
| `docs/wiki/en/Getting-Started.md` | 📝 |
| `docs/wiki/en/Agents-Delivery.md` `Agents-Maintenance.md` `Agents-Doc.md` `Agents-Discovery.md` `Agents-Operations.md` `Agents-Orchestrators.md` | 📝 (リポ直下と書かれている箇所のみ) |
| `docs/wiki/en/Rules-Reference.md` | 📝 (新 rule `document-locations.md` を追加) |
| `docs/wiki/ja/*` の上記対応ファイル | 📝 (Same-PR sync rule per `language-rules.md`) ― **PR-C checklist に EN/JA 両方更新を明記** |
| `README.md` / `README.ja.md` | 👀 (Quick Start に SPEC.md がリポ直下と書かれていないか確認、必要なら修正) |
| `CHANGELOG.md` | 📝 (1 行: "Default output location for Aphelion-generated docs moved to `docs/`; existing projects keep working via root-fallback.") |

### 2.7 Scripts / Workflows

| Path | Action |
|------|--------|
| `scripts/check-readme-wiki-sync.sh` | 👀 (SPEC/ARCH 直接参照はないが、wiki 同期チェックでヘディング数比較に影響しないか確認) |
| `scripts/sync-wiki.mjs` | 👀 (同上) |
| `bin/aphelion-agents.mjs` | 変更不要 (overlay copy なので新 rules ファイルは自動配布) |
| `.github/workflows/*.yml` | 変更不要 (生成物の出力先には触れない) |
| `scripts/check-doc-locations.sh` (任意 / P3) | ✏ new (PR-D。MVP 同梱推奨 ~30 行) |

---

## §3 変更内容の詳細

### 3.1 `document-locations.md` の中身 (新規 rule)

> **改訂方針 (P1-1 / P1-3)**: 既存の `sandbox-policy.md` / `denial-categories.md`
> と同じく **自然言語＋表** で規範を示す。擬似コード関数 (`resolve_read()` 等)
> は LLM が tool 呼び出しに誤投入するリスクがあるため採用しない。
> 既存ファイル探索は **`Glob("{docs/<NAME>.md,<NAME>.md}")` 1 回** に統一する
> (二段 Read は MUST NOT)。

```markdown
# Document Locations

> Last updated: <date>
> Auto-loaded: Yes — placed in `.claude/rules/`, loaded on every session start

This rule defines where Aphelion-generated planning / design / handoff
documents live. All agents and orchestrators MUST resolve document paths
through this rule rather than hard-coding `SPEC.md` / `ARCHITECTURE.md` to
the repository root.

## Covered artifacts

| Artifact name        | Default (new project)         | Legacy fallback (root)     | Producer / Consumer |
|----------------------|-------------------------------|----------------------------|---------------------|
| `SPEC.md`            | `docs/SPEC.md`                | `SPEC.md`                  | spec-designer / analyst write; many agents read |
| `ARCHITECTURE.md`    | `docs/ARCHITECTURE.md`        | `ARCHITECTURE.md`          | architect / codebase-analyzer write |
| `UI_SPEC.md`         | `docs/UI_SPEC.md`             | `UI_SPEC.md`               | ux-designer writes (skipped if HAS_UI=false) |
| `VISUAL_SPEC.md`     | `docs/VISUAL_SPEC.md`         | `VISUAL_SPEC.md`           | visual-designer writes (Standard+ only) |
| `DISCOVERY_RESULT.md`| `docs/DISCOVERY_RESULT.md`    | `DISCOVERY_RESULT.md`      | discovery-flow writes |
| `DELIVERY_RESULT.md` | `docs/DELIVERY_RESULT.md`     | `DELIVERY_RESULT.md`       | delivery-flow writes |
| `OPS_RESULT.md`      | `docs/OPS_RESULT.md`          | `OPS_RESULT.md`            | operations-flow writes |
| `MAINTENANCE_RESULT.md` | `docs/MAINTENANCE_RESULT.md` | `MAINTENANCE_RESULT.md`  | maintenance-flow Major handoff |
| `HANDOVER.en.md`     | `docs/HANDOVER.en.md`         | `HANDOVER.en.md`           | Legacy HANDOVER (separate from docs/deliverables/) |
| `HANDOVER.ja.md`     | `docs/HANDOVER.ja.md`         | `HANDOVER.ja.md`           | Same |
| `TEST_PLAN.md`       | `docs/TEST_PLAN.md`           | `TEST_PLAN.md`             | test-designer writes |
| `SECURITY_AUDIT.md`  | `docs/SECURITY_AUDIT.md`      | `SECURITY_AUDIT.md`        | security-auditor writes |

Files **NOT** covered by this rule (their paths are stable and absolute):

- `TASK.md` — **root-fixed**, intermediate state file (see
  `document-versioning.md` → `## TASK.md Lifecycle`). Not a design artifact.
- `docs/design-notes/<slug>.md` and `docs/design-notes/archived/<slug>.md`
- `docs/design-notes/proposals/<slug>.md` (see Issue #118 design)
- `docs/deliverables/{slug}/*.md` (doc-flow artifacts)
- `.claude/**/*` (agent / rule definitions themselves)
- `README.md`, `README.ja.md`, `CHANGELOG.md`, `LICENSE`

## Resolution rules

| Operation | Rule |
|-----------|------|
| **Read** an existing artifact | Run `Glob("{docs/<NAME>.md,<NAME>.md}")` **once**. Use the first match. When both paths match, prefer the `docs/` copy and emit `WARNING_LEGACY_DUPLICATE: <NAME>` in `AGENT_RESULT`. If no match, the artifact is treated as missing (caller decides: error vs. proceed). |
| **Write (new)** a fresh artifact | Always write to `docs/<NAME>.md`. Never default to the repository root for new files. |
| **Write (update)** an existing artifact | Use the same path that the most recent Read returned. The orchestrator carries the resolved path forward via `ARTIFACT_PATHS` (see `agent-communication-protocol.md`); the writing agent MUST NOT re-resolve and risk a docs/-vs-root switch mid-flow. |

**MUST NOT**:

- Perform two sequential `Read("docs/<NAME>.md") → Read("<NAME>.md")` calls.
  This produces a spurious `file_not_found` on the first call which
  `denial-categories.md` (Category: `file_not_found`) would otherwise trigger
  diagnostic retries against. Use the single `Glob` form.
- Auto-move (`git mv`) a legacy root file into `docs/`. Migration is the
  user's choice. An opt-in migration command is future work (out of scope
  for MVP).

## Hybrid state (both paths exist)

If both `docs/<NAME>.md` and `<NAME>.md` exist after the `Glob`:

1. Treat the `docs/` copy as authoritative.
2. Emit `WARNING_LEGACY_DUPLICATE: <NAME>` in `AGENT_RESULT`.
3. Surface a single user-facing line: "Both docs/SPEC.md and SPEC.md exist.
   Using docs/SPEC.md as authoritative. Please remove the legacy file
   manually after confirming content parity. Aphelion will not auto-delete."

## Agent contract

- spec-designer, architect, ux-designer, visual-designer, codebase-analyzer,
  analyst — write per the Write rules above. On first invocation in a new
  project, write to `docs/<NAME>.md`. On incremental update, use the
  `ARTIFACT_PATHS` value passed in by the orchestrator.
- developer, tester, reviewer, security-auditor, doc-reviewer,
  handover-author, hld/lld/api-reference/ops-manual/user-manual-author —
  read per the Read rule. If the artifact is required and missing, return
  `STATUS: error` with `MISSING_ARTIFACT: <NAME>` in `AGENT_RESULT`.
- Flow orchestrators read this rule (auto-loaded) and **MUST carry
  `ARTIFACT_PATHS` into every subsequent agent prompt** (see
  `orchestrator-rules.md` → Phase Execution Loop step 2).
```

### 3.2 各 agent 定義の変更パターン (P1-2: 最小差分)

> **改訂方針 (P1-2)**: 現案は agent ごとに +13 行 / +70 tokens × 41 agents =
> 約 +2,900 tokens を持ち込む大規模変更だった。これをやめ、各 agent への
> 差分は **以下の 2 種類のみ** に縮小する。

**パターン 1 — 冒頭の参照宣言 (全 41 agent 一律)**

agent prompt の `## Tools` 一覧 (または Mission 節の直下) に以下 1 行を追加:

```
Follows .claude/rules/document-locations.md for artifact path resolution.
New artifacts default to docs/; legacy root files are read if present.
```

これだけで、auto-load された rule が規範になるため、本文中で `SPEC.md` や
`ARCHITECTURE.md` という prose 表現を残しても agent は適切に解決する。

**パターン 2 — Output File 見出しの括弧書き (Write を行う agent のみ)**

before:
```
## Output File: `ARCHITECTURE.md`
```

after:
```
## Output File: `ARCHITECTURE.md` (resolved per document-locations.md; default `docs/ARCHITECTURE.md`)
```

**変更しないもの (重要):**

- `## Required Verification Before Starting Work` 節の Read 一覧
  → 触らない。本文に `SPEC.md` `ARCHITECTURE.md` と書いたままで OK。
- テンプレ skeleton 文字列 (`> Source: SPEC.md @ {date}` 等) → 不変。
- Read/Write tool 呼び出しの引数として直接書かれている prose リテラル
  (例: "Read SPEC.md and verify ...") → 不変。

> P3 取り込み案: `<NAME_PATH>` 変数記法は読みづらいため、prose 中の表現は
> `SPEC.md (resolved per rule)` のような自然な英語で統一する。

**期待効果:**

| 指標 | 旧設計 | 改訂後 |
|------|--------|--------|
| agent 1 ファイルあたりの差分行数 | ~13 行 | ~2 行 (Write agents) / 1 行 (Read-only agents) |
| 41 agents 合計トークン増 | ~+2,900 tokens | ~+450 tokens |
| 既存ファイル探索コスト (Standard flow) | 2 Read × N artifacts | 1 Glob × N artifacts (-2,400〜4,000 tokens/flow) |

### 3.3 AGENT_RESULT 拡張 (P2-1: ARTIFACT_PATHS を一級フィールド化)

> **改訂方針 (P2-1)**: 旧案は `ARTIFACT_PATHS` を「任意追加可」としていたが、
> agent ごとに出方が割れて orchestrator が path を carry できなくなる。
> **Write を行う agent は MUST 出力** とする。

`agent-communication-protocol.md` への差分 (before/after):

**before** (現状):
```
AGENT_RESULT: {agent-name}
STATUS: success | error | failure | suspended | blocked | approved | conditional | rejected
...(agent-specific fields)
NEXT: {next-agent-name | done | suspended}
```

**after** (改訂):
```
AGENT_RESULT: {agent-name}
STATUS: success | error | failure | suspended | blocked | approved | conditional | rejected
...(agent-specific fields)
ARTIFACT_PATHS:                     # MUST when STATUS=success and the agent wrote ≥1 artifact
  - SPEC: docs/SPEC.md              # or `SPEC.md` if legacy-root mode
  - ARCHITECTURE: docs/ARCHITECTURE.md
NEXT: {next-agent-name | done | suspended}
```

**MUST / OPTIONAL マトリクス:**

| Agent role | ARTIFACT_PATHS 出力 |
|------------|---------------------|
| Write を行う agent (spec-designer, architect, ux-designer, visual-designer, codebase-analyzer, analyst, security-auditor, test-designer 等) | **MUST** — 当該セッションで Write した artifact をすべて列挙 |
| Read のみの agent (developer, reviewer, tester, doc-reviewer, handover-author 等) | OPTIONAL — Read で resolve した path を参考情報として列挙してよい |
| Flow orchestrator (delivery-flow 等) | MUST — handoff RESULT.md 自身の path を含めて列挙 |

`orchestrator-rules.md` → `## Phase Execution Loop` step 2 への追加 (脚注扱い
ではなく必須化):

```
2. Launch the next agent.
   ─ MUST carry ARTIFACT_PATHS from the previous agent's AGENT_RESULT
     into the next agent's prompt (verbatim). This prevents per-agent
     re-resolution from drifting between docs/ and root mid-flow.
```

### 3.4 Orchestrator 側のフロー変更 (P2-1 反映)

`delivery-flow.md` の "At Startup" 既存ファイル検出ステップを以下に置換:

```
2. Inspect existing artifacts (single Glob per name):
     For each of {SPEC, ARCHITECTURE, UI_SPEC, VISUAL_SPEC}:
       Run Glob("{docs/<NAME>.md,<NAME>.md}") once.
       Record the first match as the artifact's resolved path
       (prefer docs/ on tie; emit WARNING_LEGACY_DUPLICATE).
3. If any existing artifact is found, confirm with AskUserQuestion:
     "Existing files found at: {paths}. Continue from here / Start over?"
4. Build ARTIFACT_PATHS from the resolved paths and carry it into every
   subsequent agent prompt. Per orchestrator-rules.md Phase Execution Loop
   step 2, this carry is MANDATORY.
```

Progress display は **prose 形式** (P3 取り込み案) に揃える:

```
Artifacts:
  SPEC.md          ✅  (docs/SPEC.md)         ← resolved per rule
  ARCHITECTURE.md  ✅  (docs/ARCHITECTURE.md) ← resolved per rule
```

---

## §4 後方互換戦略の実装方針

### 4.1 新規プロジェクト判別

「新規プロジェクト」とは "docs/ にも root にも対象ファイルが無い" 状態。
`Glob("{docs/<NAME>.md,<NAME>.md}")` の結果が空であれば新規とみなし、
書き込み時に `docs/` 配下を採用する。

### 4.2 既存プロジェクト判別 (root 直下に既存ファイルあり)

`Glob` がルート直下のみを返した時点で、その agent の同セッション内では
"legacy mode" として記録し、以後の更新も root に対して行う。
orchestrator が `ARTIFACT_PATHS` を session-scoped に持ち回るため、
mid-flow で挙動がブレない (P2-1 で MUST 化により保証)。

### 4.3 ハイブリッド状態 (docs/ と root の両方にファイルが存在する)

§3.1 の "Hybrid state" 節と同じ。`docs/` 優先、`WARNING_LEGACY_DUPLICATE` を
`AGENT_RESULT` に必ず出す。auto-delete はしない。

### 4.4 移行コマンド (Future)

planning doc §8 で保留された `.aphelionrc` 案と同様、`npx aphelion-agents migrate-docs`
のような opt-in 移行コマンドを将来検討する。今回の MVP では実装しない。
ユーザは手動で `git mv SPEC.md docs/SPEC.md` を行えばよい。

### 4.5 dogfooding (aphelion-agents 自身)

本リポジトリは現在 SPEC.md / ARCHITECTURE.md を持たない (agents-as-rules 設計
のため)。将来 dogfooding として導入する場合は最初から `docs/` 配下に作る。
今 PR では「リポ自身のファイル新設」は行わない (別 issue 扱い)。

---

## §5 テスト戦略

aphelion-agents には現状ユニットテスト基盤がない (CLI と markdown が主成果物)。
そのため **手動検証手順** を中心とし、補助的に **静的 grep ガード** を追加する。

### 5.1 静的検証 (mandatory)

PR ベースで以下のチェックリストを通す。

1. `grep -rEn "Read\\((\"|')(docs/)?SPEC\\.md|Read\\((\"|')(docs/)?ARCHITECTURE\\.md" .claude/`
   → 0 件。(具体的なパスを Read 呼び出しに直接渡している場所が無いこと)
2. `grep -rEn "Write\\((\"|')(docs/)?SPEC\\.md|Write\\((\"|')(docs/)?ARCHITECTURE\\.md" .claude/`
   → 0 件。
3. agent 冒頭の参照宣言行 `Follows .claude/rules/document-locations.md` が
   Write を行う 6 agent + Read のみの主要 agent に存在すること。
4. `agent-communication-protocol.md` に `ARTIFACT_PATHS:` が一級フィールドと
   して記載されていること (`grep -n "ARTIFACT_PATHS" src/.claude/rules/agent-communication-protocol.md`)。

(P3 / 任意) `scripts/check-doc-locations.sh` を新設し、上記 grep を CI で
走らせる案 (PR-D, ~30 行)。MVP 同梱推奨。

### 5.2 動的検証 (手動シナリオ)

| シナリオ | 手順 | 期待結果 |
|---------|------|----------|
| S1: クリーン新規プロジェクト | tmp ディレクトリで `npx aphelion-agents init`. delivery-flow を Minimal で起動し、簡単な spec を書かせる | `docs/SPEC.md`, `docs/ARCHITECTURE.md` が生成される。root 直下に SPEC.md は無い |
| S2: 既存 root-style プロジェクト | tmp ディレクトリに `SPEC.md` を先に置いてから delivery-flow を起動 | architect は root の SPEC.md を読む。書き込む ARCHITECTURE.md も root に置かれる。orchestrator の progress display に `(SPEC.md)` と表示される |
| S3: ハイブリッド | `docs/SPEC.md` と root `SPEC.md` を両方置いて起動 | docs/ を採用し WARNING_LEGACY_DUPLICATE が出る |
| S4: handover-author | S1 状態で handover-author を呼ぶ | `docs/deliverables/{slug}/handover.{lang}.md` 内 §6 Related Document Index に `docs/SPEC.md` `docs/ARCHITECTURE.md` が列挙される |
| S5: doc-reviewer | S2 状態で doc-reviewer を呼ぶ | 旧 root パスを認識し、INCONSISTENCY = 0 で pass する |
| S6: developer in resume | S1 状態で developer 実行 → 途中で `TASK.md` (**root**) を残し session 中断 → resume | TASK.md は root 固定で読み書きする (docs/ は探さない) |
| S7: ARTIFACT_PATHS 伝搬 | S1 状態で delivery-flow を Standard で起動。architect → developer 遷移で developer prompt に `ARTIFACT_PATHS: SPEC=docs/SPEC.md, ARCHITECTURE=docs/ARCHITECTURE.md` が含まれること | developer は再 Glob せずにそのまま Read |

### 5.3 リグレッション観点

- doc-reviewer の Coverage matrix (§Five Review Perspectives ▸ Perspective 2 "Defined terms" -
  "Referenced file paths and agent names actually exist") が、新 path で
  Glob を成功させるか。
- `archive-closed-plans.yml` workflow は本変更の影響を受けない (対象は
  `docs/design-notes/`)。`design-notes-archive-safety-net-and-proposals-design.md`
  (Issue #118 設計書) と独立。

---

## §6 実装の分割案 (PR 単位)

依存順に 3 (+1 optional) PR に切る。

### PR-A: rules 新設と orchestrator-rules / protocol 更新 (foundation)

- 新規: `src/.claude/rules/document-locations.md` (§3.1 改訂版)
- 更新: `src/.claude/rules/file-operation-principles.md`,
  `src/.claude/rules/document-versioning.md` (例示更新のみ。TASK.md 節は不変),
  `src/.claude/rules/aphelion-overview.md`
- 更新: `src/.claude/rules/agent-communication-protocol.md` (`ARTIFACT_PATHS:`
  一級フィールド化, §3.3)
- 更新: `.claude/orchestrator-rules.md` (Handoff File Spec, Phase Execution Loop
  step 2 で ARTIFACT_PATHS carry を MUST 化)
- doc-reviewer の "Referenced file paths and agent names actually exist"
  検証ロジックに rule への参照を組み込む

→ この PR だけで動作テスト可能 (rules はあっても agent 側が宣言行を持って
いなければ何も起こらない == 完全に後方互換)。

### PR-B: agent 定義の最小差分書き換え (bulk update)

- §2.3 の全 agent ファイルを §3.2 の **最小差分パターン** で書き換え:
  - 冒頭 1 行参照宣言 (41 agents 一律)
  - Write agents の Output File 括弧書き (6 agents)
- delivery-flow / maintenance-flow / doc-flow / discovery-flow / operations-flow
  の orchestrator agent 定義の "At Startup" を §3.4 の Glob 1 回パターンに更新。
- Templates の Source 行のヘルプテキスト微修正。

→ PR-A merge 後に取り掛かる。差分は最小化されたが agent ファイル数が多い
ため domain 別 (Delivery / Maintenance / Doc / Discovery / Operations) に
更に分割しても良い。

### PR-C: docs (wiki / README / CHANGELOG)

- §2.6 の wiki ページを EN canonical + JA Same-PR sync。
  - **PR-C checklist に「en/ja 両方を同一 PR で更新」を明記** (P3 取り込み)。
- README は記述があれば修正。CHANGELOG にエントリ追加。

→ PR-B merge 後。

### (Optional, recommended for MVP) PR-D: grep guard CI

- `scripts/check-doc-locations.sh` 追加 (~30 行)。§5.1 の grep を実行。
- `.github/workflows/check-doc-locations.yml` で PR ごとに実行。
- レビュー所見で **MVP 同梱推奨** とされたため、可能なら PR-A〜C と同時期に
  merge する。

---

## §7 リスクと未確定事項

### 7.1 リスク

| Risk | Impact | Mitigation |
|------|--------|-----------|
| 機械的置換による副作用 (テンプレ skeleton まで巻き込んで書き換える) | template_version 整合性が崩れ、handover-author などが失敗する | 改訂後は最小差分パターンのため、機械置換が触る範囲はごく狭い。skeleton 行はリテラル一致で除外 |
| docs/ と root の両方に古いファイルが残ったまま気づかない | doc-reviewer が古いほうを参照して誤判定 | WARNING_LEGACY_DUPLICATE を AGENT_RESULT に必ず出し、orchestrator が progress display で太字表示 |
| ARTIFACT_PATHS の orchestrator → agent 伝播漏れ | mid-flow で agent ごとに再 resolution が走り、競合時にちぐはぐ | **P2-1 で MUST 化**。`orchestrator-rules.md` Phase Execution Loop step 2 に「MUST carry ARTIFACT_PATHS」を明記。`agent-communication-protocol.md` 側でも MUST フィールドとして規定 |
| codebase-analyzer の特殊性 (両ファイルを reverse-engineer 同時生成) | 既存リポ直下に SPEC.md が無くても勝手に `docs/` 配下に書いて困惑される | **codebase-analyzer は invocation 直後に AskUserQuestion で "Output to docs/ (default) or repository root?" を確認する。ただし `.aphelion-auto-approve` 下では AskUserQuestion がブロッキングしないよう、`orchestrator-rules.md` の Auto-Approve Mode 規約に従い `docs/` 既定でフォールバックする (= AskUserQuestion 自体をスキップして docs/ に書く)** (P2-3 反映) |
| ユーザの自作スクリプトが直下 SPEC.md を前提にしている | 新規 prj だと SPEC.md が見当たらず壊れる | CHANGELOG / wiki Migration Notes で明示 |
| 二段 Read 残存による file_not_found 誤検知 | `denial-categories.md` の `file_not_found` カテゴリが発火し、リトライ・診断が走る | **P1-3 で Glob 1 回に統一**。§5.1 静的検証 grep #1, #2 で残存を検出 |

### 7.2 未確定事項 → 改訂で **決定済み** に移動

> 旧案では 6 件保留していたが、レビュー所見で 2 件 (TASK.md / codebase-analyzer
> AskUserQuestion) が確定し、残りも整理した。以下は **改訂後の最終状態**。

**決定済み (改訂で確定):**

1. **`TASK.md` を `docs/` に動かすか?** → **決定: root 固定** (P2-2)。
   根拠: `document-versioning.md` の "TASK.md Lifecycle" に「phase 完了時に
   リセット」と定義され、TASK.md は中間状態ファイルで design artifact では
   ない。`document-locations.md` の対象外として明示する。
2. **codebase-analyzer の AskUserQuestion 分岐** → **決定: auto-approve 時は
   `docs/` 既定でフォールバック** (P2-3)。`orchestrator-rules.md` の
   Auto-Approve Mode 規約と整合させ、AskUserQuestion をブロッキングさせない。
3. **`SECURITY_AUDIT.md` `TEST_PLAN.md` を docs/ に動かすか?** → **決定:
   `docs/` 直下に置く方針**。`document-locations.md` 表に含む。
4. **orchestrator が "Start over" を選んだとき legacy ファイルを削除するか?**
   → **決定: 削除しない (残す + warning)**。auto-delete は破壊的。
5. **`.aphelionrc` (planning doc §8) は本 PR では対象外** → **決定: 対象外**
   (Future work)。CHANGELOG / Migration Notes で明示。
6. **HANDOVER.{en,ja}.md と `docs/deliverables/{slug}/handover.{lang}.md` の
   重複** → **決定: 後者 (deliverables 配下) が主流**。HANDOVER.{en,ja}.md は
   legacy。`document-locations.md` 表には fallback として残すが、handover-author
   のデフォルト出力は deliverables 配下のまま不変。

**残る軽微な未確定事項 (developer 着手中に判断):**

- doc-reviewer の Coverage matrix で `> Source: SPEC.md @ {date}` の左辺文字列
  正規化 (docs/SPEC.md と SPEC.md を等価視するヘルパ) を `document-locations.md`
  に追記するか、doc-reviewer 側で完結させるか。→ developer 判断。

---

## §8 Handoff brief for developer

- **着手順**: PR-A (rules + orchestrator-rules + protocol) → PR-B (agent
  最小差分書き換え) → PR-C (wiki / README / CHANGELOG) → (任意) PR-D
  (grep guard CI)。
- **必須読み込み**:
  - `.claude/rules/file-operation-principles.md`
  - `.claude/rules/document-versioning.md` (特に TASK.md Lifecycle 節)
  - `.claude/rules/sandbox-policy.md` / `denial-categories.md`
    (規範スタイルの参考)
  - `.claude/rules/agent-communication-protocol.md` (ARTIFACT_PATHS 追加先)
  - `.claude/agents/handover-author.md` (path 解決の好例)
  - 本設計書 §3.1 (rule 本文ドラフト改訂版) / §3.2 (最小差分パターン) /
    §3.3 (ARTIFACT_PATHS MUST 化)
- **特に注意してほしい点**:
  1. 最小差分パターンを厳守。Read 一覧や Required Verification 節は触らない。
  2. `orchestrator-rules.md` の `Phase Execution Loop` step 2 に
     `MUST carry ARTIFACT_PATHS` を明記すること。
  3. codebase-analyzer の AskUserQuestion 分岐は **auto-approve 時のフォール
     バック (docs/ 既定)** を必ず実装すること (§7.1 リスク表参照)。
  4. TASK.md は root 固定。`document-locations.md` の表に含めないこと。
  5. wiki Bilingual Sync Policy (Same-PR) を遵守。`Rules-Reference.md`
     の rules カウントを 13 → 14 と更新する際は EN/JA 両方を同じ PR で。
  6. 二段 Read を残さない (§5.1 grep #1, #2 で検出)。

```
NEXT: developer
HANDOFF_TO: developer
TECH_STACK_CHANGED: false
PHASES: 3 (PR-A foundation / PR-B agent minimal-diff / PR-C docs) + 1 optional (PR-D grep guard)
```
