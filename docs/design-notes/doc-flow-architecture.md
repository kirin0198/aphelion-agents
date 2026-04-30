# Architecture: doc-flow orchestrator (5th flow, customer-deliverable doc generation)

> Last updated: 2026-04-30
> Linked Design Note: docs/design-notes/doc-flow.md (analyst, 2026-04-30 reframe)
> Linked Issue: [#54](https://github.com/kirin0198/aphelion-agents/issues/54)
> Source design-note: doc-flow.md (HEAD `e56a58d`, 2026-04-30)
> Authored by: architect
> Next: developer

---

## 1. Scope of this document

本ドキュメントは Issue #54「doc-flow orchestrator 導入」の **technical
design document** である。Aphelion 本体リポジトリは `.claude/agents/*.md`
群と `.claude/orchestrator-rules.md`、`.claude/templates/**` を
"アーキテクチャ成果物" として扱うワークフロー製品なので、本書は通常
プロジェクトの ARCHITECTURE.md と同じ位置付けで利用する。

### 含むもの (architect の責務)

- Open Questions Q-A〜Q-H の確定回答 (analyst 推奨を踏襲または再考)
- `.claude/agents/doc-flow.md` の完全アウトライン (section level)
- 6 author agent (`hld-author`, `lld-author`, `ops-manual-author`,
  `api-reference-author`, `user-manual-author`, `handover-author`) の
  skeleton 仕様 (frontmatter / Mission / Inputs / Outputs / AGENT_RESULT)
- `.claude/orchestrator-rules.md` への差分仕様
- `src/.claude/rules/aphelion-overview.md` への差分仕様
- README × 2 / Home.md × 2 への agent count bump 戦略
- PR 分割方針 (B 案 = 各 PR 単独で CI pass)
- developer 向け実装チェックリスト (PR 1 用)
- テスト戦略 / 互換性 / risk register

### 含まないもの (developer の責務)

- `.claude/agents/doc-flow.md` の本文そのもの
- 6 author agent の **本実装** (テンプレ resolution + artifact 読み取り
  + doc 本文生成ロジックは PR 2 で developer が書く)
- 6 種テンプレ本文 (PR 2)
- wiki 詳細追記の本文 (PR 3)

> **入力ドキュメント**:
> - `docs/design-notes/doc-flow.md` (analyst 2026-04-30 reframe)
> - 既存 orchestrator: `discovery-flow.md`, `delivery-flow.md`,
>   `operations-flow.md`, `maintenance-flow.md`
> - 既存 doc-related agent: `doc-writer.md`, `architect.md`,
>   `spec-designer.md`, `ux-designer.md`
> - `.claude/orchestrator-rules.md` (HEAD `e56a58d`)
> - `src/.claude/rules/aphelion-overview.md`
> - `scripts/check-readme-wiki-sync.sh` (CI 制約の正規ソース)
> - `docs/design-notes/archived/doc-reviewer-architecture.md` (cross-cutting
>   配線の前例)

### 用語

- **author agent**: doc-flow 配下の 6 種 doc を生成する子 agent の総称
  (`hld-author` 〜 `handover-author`)
- **deliverable**: doc-flow が生成する顧客向け doc。
  `docs/deliverables/{slug}/{type}.md` に出力する
- **template resolution**: 各 author agent が起動時に参照するテンプレート
  ファイルを解決する手順 (Q-C で確定)

---

## 2. Open Questions の確定回答 (Q-A〜Q-H)

各回答は **採用 / 再考の理由 → 確定アクション** の順で記述する。

### 2.1 Q-A: 各 author agent の Tools

**確定**: `Read, Write, Glob, Grep` の 4 つ。`Edit` / `Bash` は持たせない。

**採用理由**:
- MVP scope は **新規生成のみ**で差分更新を行わない (analyst §4.6 の
  Phase 2 降格事項) ため `Edit` は不要。
- 6 author agent は既存 artifact を **Read** し、テンプレを **Read** し、
  単一の deliverable を **Write** するだけで完結する。
- `Bash` は orchestrator (`doc-flow`) 側に集約する。author 個別に Bash
  を持たせると `git log` 引用や `ls` などの副作用ポイントが分散し
  sandbox-policy 上の管理が煩雑になる。author は副作用ゼロを保つ。

**orchestrator (`doc-flow`) の Tools**: `Bash, Read, Write, Glob, Grep,
Agent` (既存 `discovery-flow.md` 等と同等)。`Bash` の用途は:
- repo state probe (`git rev-parse --is-inside-work-tree` 等、
  git-rules.md §Startup Probe)
- existing deliverable 検出 (`ls docs/deliverables/{slug}/`)
- DOC_FLOW_RESULT.md 書き出し前の `mkdir -p`

**Phase 2 で見直す事項**: 差分更新モード導入時に `Edit` を author 側へ
追加する案。本 MVP では取らない。

### 2.2 Q-B: 出力 path 戦略

**確定**: `docs/deliverables/{slug}/{type}.md` で固定。`{slug}` 解決順序は
以下:

1. `--slug {value}` 引数で明示
2. 引数未指定 + project-rules.md `## Project` → `Slug:` フィールド
3. 上記いずれも無ければ `AskUserQuestion` で対話質問 (推奨デフォルト
   `default`)
4. AUTO_APPROVE モードで対話不可な場合は `default` を採用

**多言語出力時の path 区別**: 単一 invocation で `--lang` は 1 つに
固定 (II の起動時引数、analyst §4.4)。同じ slug で en/ja 両方を生成したい
場合は **別 invocation で 2 回起動** する設計とし、出力衝突を避けるため
`{slug}/{type}.md` ではなく **`{slug}/{type}.{lang}.md`** をデフォルト
ファイル名規約とする。

> 例: `docs/deliverables/acme-portal/hld.ja.md`,
> `docs/deliverables/acme-portal/hld.en.md`

ただし「単一言語のみ運用」を明示するプロジェクトは煩雑なので、`--lang`
が project-rules.md の Output Language と一致する場合は **言語サフィックス
省略** を許容する (`{slug}/{type}.md`)。これは orchestrator が判定し
author に出力 path を渡す。

**override**: 出力 path をプロジェクト側で再配置したいユーザは
project-rules.md `## Doc Flow` → `Output Base:` (default
`docs/deliverables`) を参照する設計とする。MVP では `docs/deliverables`
固定で実装し、override は Phase 2。

### 2.3 Q-C: テンプレ言語切替方式 + resolution order

**確定**: **(i) en/ja 別ファイル方式**。テンプレファイル名は
`{type}.{lang}.md`。

**Resolution order** (各 author agent が起動時に実行):

```
1. {project_root}/.claude/templates/doc-flow/{type}.{lang}.md
2. {project_root}/.claude/templates/doc-flow/{type}.md         # lang fallback
3. {repo_root}/.claude/templates/doc-flow/{type}.{lang}.md     # Aphelion built-in
4. {repo_root}/.claude/templates/doc-flow/{type}.md            # Aphelion built-in lang fallback
5. agent-emit fallback (テンプレファイル不在 → agent 内蔵の最低限章立て)
```

`{repo_root}` の解決は: agent 起動時に `git rev-parse --show-toplevel` で
取得 (orchestrator が引数として渡す)。Aphelion 自身を install したリポ
構成で、`.claude/templates/doc-flow/` が存在することを前提とする。

**採用理由**:
- カスタムテンプレ作成時にユーザが章名を翻訳しやすい (analyst §4.4 推奨)。
- runtime 翻訳は LLM 出力のブレを生み、カスタムテンプレとの組み合わせで
  整合性検証が困難。
- ファイルシステム上で diff が取りやすく、PR レビュー観点でも有利。

**Phase 2 検討事項**: 1 つのテンプレファイルに front matter で
`languages: [en, ja]` を持たせ章ごとに対訳を埋める単一ファイル方式。
MVP では取らない。

### 2.4 Q-D: テンプレ変数埋め込み方式

**確定**: **placeholder + 動的生成のハイブリッド** (analyst 推奨踏襲)。

#### 2.4.1 placeholder 構文

`{{namespace.field}}` 形式の Mustache-like syntax を採用 (依存ライブラリ
は持たない、author agent が単純な文字列置換で実装)。

**理由**: `{single}` だと markdown 本文の `{example}` 風の擬似コードと
衝突する。`{{double}}` は markdown 中で誤解されにくく、Jinja2 / Handlebars
などの既存 template 文化と整合する。

#### 2.4.2 標準 placeholder 一覧 (orchestrator が author に渡す)

| placeholder | 由来 | 例 |
|-------------|------|------|
| `{{project.name}}` | project-rules.md または `--project-name` | `Acme Portal` |
| `{{project.slug}}` | `--slug` または対話 | `acme-portal` |
| `{{doc.lang}}` | `--lang` | `ja` |
| `{{doc.type}}` | author agent 名から派生 | `hld`, `lld` 等 |
| `{{doc.generated_at}}` | 起動時刻 ISO8601 | `2026-04-30` |
| `{{doc.template_version}}` | テンプレ frontmatter | `1.0` |
| `{{spec.summary}}` | SPEC.md `## Project Overview` | (動的生成) |
| `{{spec.use_cases}}` | SPEC.md `## Use Cases` の reformat | (動的生成) |
| `{{architecture.overview}}` | ARCHITECTURE.md `## 1.` | (動的生成) |
| `{{architecture.tech_stack}}` | ARCHITECTURE.md `## 1. Tech Stack` 表 | (動的生成) |
| `{{architecture.modules}}` | ARCHITECTURE.md `## 3. Module Design` | (動的生成) |
| `{{ui_spec.screens}}` | UI_SPEC.md (存在時) | (動的生成) |
| `{{ops.runbook}}` | infra-builder / observability の出力 | (動的生成) |
| `{{security.summary}}` | SECURITY_AUDIT.md (引継ぎ資料のみ) | (動的生成) |
| `{{tests.summary}}` | TEST_PLAN.md / 結果 (引継ぎ資料のみ) | (動的生成) |

#### 2.4.3 author agent の解決ルール

- **固定値 placeholder** (`{{project.name}}`, `{{doc.lang}}` 等):
  orchestrator から引数で受け取り、単純文字列置換。
- **artifact 由来 placeholder** (`{{spec.use_cases}}` 等): author agent が
  対象 artifact を Read し、章立てに合わせて再構成する (LLM 動的生成)。
- **解決不能 placeholder**: 該当 artifact 不在 (例: UI_SPEC.md 無し) →
  該当章を skip し、deliverable 内に `> _Note: UI_SPEC.md not present;
  this section was skipped._` を残す (en/ja でテンプレに対訳を持つ)。

### 2.5 Q-E: エンドユーザマニュアルの section 構成

**確定**: **UC 別 (UC-001 ごとに 1 章)** を基本構成。UI_SPEC.md がある
場合は各 UC 章内に「画面操作スクショ案内」を補足セクションとして追加。

**UI_SPEC.md 不在時 (CLI / library / tool)**: `user-manual-author` は
`AGENT_RESULT.STATUS=skipped`、`SKIP_REASON: no UI (UI_SPEC.md not found)`
を返す。orchestrator はこれを受けて以下を選択:

- **Standard / Full plan**: skipped を許容し phase 完了。`SKIPPED_TYPES:
  user-manual` を最終 AGENT_RESULT に記録。
- **Minimal / Light plan**: skipped を許容し phase 完了 (同上)。
- **明示 `--types user-manual` 単独起動 + UI 不在**: error 扱いではなく
  warning + skip。ユーザに「UI_SPEC.md が無いため空の deliverable に
  なります。続行しますか？」と AskUserQuestion で確認、承認時のみ最低限
  の枠だけを出力。

**Phase 2 検討事項**: 画面別 (SCR-001 ごとに 1 章) との混在モード。MVP は
UC 別固定。

### 2.6 Q-F: アーカイブ artifact の読み取り

**確定**: **MVP は最新 artifact のみ**。`docs/design-notes/archived/`
配下は読まない。

**理由**:
- archive は Aphelion 自身のメタ doc 維持系統に紐付く (analyst §4.6 で
  Phase 2 降格)。
- 顧客向け deliverable は「現時点の確定版」を反映するべきで、過去 design
  note の意思決定履歴は引継ぎ資料の `## 2. 設計判断履歴` 章で **現行**
  design-notes (archive されていないもの) のみを参照すればよい。

**Phase 2 検討事項**: `handover-author` が `docs/design-notes/archived/`
を再帰的に走査し ADR 集として再パッケージするモード。

### 2.7 Q-G: doc-reviewer の組み込み

**確定**: **MVP は組み込まない**。doc-flow 完了時の AGENT_RESULT に
`SUGGEST_DOC_REVIEW: true` を出力するのみ (suggest only)。

**理由**:
- `doc-reviewer` は SPEC.md / ARCHITECTURE.md / UI_SPEC.md など Aphelion
  正規 artifact 間の整合をチェックする agent (#91 で導入済み)。
- doc-flow が生成する deliverable は「正規 artifact から派生した
  パッケージ」であり、doc-reviewer の現行 trigger 条件
  (`spec-designer / ux-designer / architect / scope-planner / analyst`)
  には含まれない。
- HLD ↔ LLD ↔ API リファレンスの相互整合は Phase 2 で別 reviewer
  バリエーション (`deliverable-reviewer` 等) を検討する。

**確定アクション**:
- doc-flow の `AGENT_RESULT` に `SUGGEST_DOC_REVIEW: true` を必ず出力。
- orchestrator-rules.md の "Doc Reviewer Auto-insertion" 表に doc-flow
  を **追加しない** (MVP では trigger 対象外)。
- doc-flow 完了 summary に「`/doc-reviewer` を別途起動して相互整合を
  確認することを推奨します」とテキストで案内 (Output Language 適用)。

### 2.8 Q-H: テンプレ更新時の互換性

**確定**: **テンプレ frontmatter に `template_version: {major}.{minor}` を
持たせる**。再生成時に既存 deliverable の `<!-- template_version: x.y -->`
HTML コメントと比較し、major bump 検出時に AskUserQuestion で確認。

**フォーマット**:

```markdown
---
template_version: 1.0
type: hld
language: ja
---
# {{doc.type}}: {{project.name}}

<!-- template_version: 1.0 -->
<!-- generated_at: {{doc.generated_at}} -->

...
```

**動作**:
- 同じ deliverable path に既存ファイルがあった場合、author agent は
  HTML コメントから既存 version を読む。
- minor bump (1.0 → 1.1) → 警告のみ、上書き続行。
- major bump (1.0 → 2.0) → orchestrator に `STATUS: blocked +
  BLOCKED_REASON: template_major_bump` を返し、orchestrator が
  AskUserQuestion で「上書き / 旧 path にバックアップ / abort」を確認。
- AUTO_APPROVE モード時は「旧 path にバックアップ + 上書き」を自動採用
  (バックアップ先: `{path}.v{old_version}.bak`)。

**注意点 (analyst から提起)**: AskUserQuestion はこのアーキテクト
session で利用不可と判明したが、**developer 実装時 / orchestrator 実行時
には利用可能**。本確定は実行時前提なので問題なし。万一実行時にも
AskUserQuestion が利用不可な状況 (例: API 互換性が変わる) が判明した
場合、§11 Risk register R-3 に従って fallback (= AUTO_APPROVE 同等の
バックアップ + 上書き) を選ぶ。

---

## 3. doc-flow.md (orchestrator) complete outline

PR 1 で developer が `.claude/agents/doc-flow.md` を実装する際、本節の
構造に従う。**本書は outline までを定義し、本文は developer が書く**。

### 3.1 frontmatter

```yaml
---
name: doc-flow
description: |
  Orchestrator for the Doc domain. Generates customer-deliverable docs
  (HLD / LLD / ops manual / API reference / end-user manual / handover)
  from existing Aphelion artifacts. Use when:
  - Asked to "generate customer documentation" / "produce deliverables"
  - Project has SPEC.md / ARCHITECTURE.md and needs customer-facing repackaging
  - At project closeout to assemble a handover package
  Launches each author agent in sequence with user approval gates.
  Final output: DOC_FLOW_RESULT.md + docs/deliverables/{slug}/*.md
tools: Bash, Read, Write, Glob, Grep, Agent
model: opus
color: cyan   # 既存 4 flow と区別。実際の色は developer 判断
---
```

> 既存 `discovery-flow.md` / `delivery-flow.md` の frontmatter と同等構造。
> `model: opus` は意思決定密度の高い orchestrator として既存方針に整合。

### 3.2 Project-Specific Behavior block

既存 4 orchestrator と同じ block を冒頭に配置:

- `.claude/rules/project-rules.md` を Read し `Output Language` を解決
- 不在時 default `en`

### 3.3 Mission

2 段落で記述:

1. **doc-flow の責務範囲**: 顧客向け deliverable の派生生成のみ。社内向け
   artifact (SPEC.md 等) の生成・更新は責務外。
2. **doc-writer との境界**: doc-writer は **OSS / 開発者向け** README,
   CHANGELOG, 内部 API doc を生成する。doc-flow は **顧客 / 運用 / エンド
   ユーザ向け** deliverable を生成する。両者は読者・粒度・出力 path が
   分離されており、入力 artifact (SPEC.md, ARCHITECTURE.md) のみ共有する。

### 3.4 Startup

既存 orchestrator の Startup と同じ 4 ステップ:

1. `.claude/orchestrator-rules.md` を Read
2. auto-approve mode 検出 (`.aphelion-auto-approve` / `.telescope-auto-approve`)
3. **doc-flow 固有**: 引数解析 (`--lang`, `--types`, `--slug`,
   `--target-project`)
4. Triage に進む

### 3.5 Triage

#### 3.5.1 Triage 質問

`AskUserQuestion` (1 round, 3 質問):

- Q1: doc type の選択 (multiSelect): hld / lld / ops-manual / api-reference
  / user-manual / handover (default: 全 6)
  - 引数 `--types hld,lld` が渡されていればこの質問を skip
- Q2: 出力言語: ja / en (default: project-rules.md の Output Language)
  - 引数 `--lang` が渡されていれば skip
- Q3: slug: 自由入力 (default: project-rules.md `## Project` → `Slug:`、
  なければ `default`)
  - 引数 `--slug` が渡されていれば skip

#### 3.5.2 Triage Plan 判定

| Plan | Condition | Author agents to launch |
|------|-----------|-------------------------|
| **Minimal** | 1〜2 doc type | 選択された author agent のみ |
| **Light** | 3〜4 doc type | 選択された author agent のみ |
| **Standard** | 5〜6 doc type | 選択された全 author agent |
| **Full** | 6 doc type 全部 + 互換性検証 | 全 author agent + post 検証 (template_version 比較) |

> Full は Standard と launch agent が同じだが、orchestrator が完了後に
> 「全 deliverable の `template_version` が同一であること」を verify する
> step を追加 (developer 実装時に詳細化)。

#### 3.5.3 Triage 結果提示

既存 4 orchestrator と同様: text 出力 + AskUserQuestion で承認確認。

### 3.6 Managed Flows

```
[Selected types only — order matters for dependency hints]

Phase 1: HLD                     → hld-author             → ⏸ Approval
Phase 2: LLD                     → lld-author             → ⏸ Approval
Phase 3: API Reference           → api-reference-author   → ⏸ Approval
Phase 4: Ops Manual              → ops-manual-author      → ⏸ Approval
Phase 5: End-User Manual         → user-manual-author     → ⏸ Approval
                                   (skipped if no UI_SPEC.md)
Phase 6: Handover                → handover-author        → ⏸ Approval
                                   (前 5 種完了後に推奨)

→ DOC_FLOW_RESULT.md 生成 → 完了 summary
```

**依存関係 (推奨順だが MVP では強制しない)**:
- HLD → LLD: ARCHITECTURE.md を共有して粒度が連続
- HLD / LLD → API Reference: API 章を含む
- 全 5 種 → Handover: 引継ぎ資料は他 5 種への索引を持つ

`--types` で部分起動した場合、依存先の deliverable が無いことは warning
として deliverable 末尾に注記する (例: `> _Note: this handover document
references HLD/LLD which were not generated in this run._`)。

### 3.7 Phase Execution Loop

orchestrator-rules.md "Phase Execution Loop" を踏襲。doc-flow 固有事項:

- 各 author agent への prompt に以下を必ず含める:
  - `slug`, `lang`, `output_path`, `template_version_required`,
    `repo_root` (テンプレ resolution 用)
  - 入力 artifact の絶対 path リスト
  - existing deliverable の有無 (上書き判定)
- author agent が `STATUS: skipped` を返した場合、phase は完了として
  扱い (failure ではない)、`SKIPPED_TYPES` リストに追加。
- author agent が `STATUS: blocked` (template_major_bump) を返した場合、
  AskUserQuestion → 結果に応じて agent を re-launch。

### 3.8 Approval Gate

orchestrator-rules.md "Approval Gate" を踏襲。doc-flow 固有:

- phase 完了時の summary に「生成された deliverable の **先頭 30 行プレ
  ビュー**」を含める (artifact path だけでなく中身を即座に確認できるため)。
- "Request modification" 選択時、修正指示を author agent に渡して
  **同一 phase を re-run**。

### 3.9 Rollback Rules

doc-flow に専用 rollback flow は無い (テスト失敗・review CRITICAL は
発生しない)。ただし orchestrator-rules.md の "Rollback Limit (Common)"
は適用し、template_major_bump の AskUserQuestion で「abort」が選ばれた
場合は phase 単位で打ち切る。

### 3.10 DOC_FLOW_RESULT.md (final output template)

```markdown
# Doc Flow Result: {project.name}

> Created: {YYYY-MM-DD}
> Doc Flow Plan: {Minimal | Light | Standard | Full}
> Slug: {slug}
> Output Language: {ja | en}

## Generated Deliverables

| Type | Path | Status | Template Version |
|------|------|--------|------------------|
| HLD | docs/deliverables/{slug}/hld.{lang}.md | success | 1.0 |
| LLD | docs/deliverables/{slug}/lld.{lang}.md | success | 1.0 |
| ... | ... | success / skipped | ... |

## Skipped Types
{list with reasons, e.g. "user-manual: no UI_SPEC.md"}

## Suggested Next Steps
- Run `/doc-reviewer` to verify cross-deliverable consistency
- ...
```

### 3.11 AGENT_RESULT (orchestrator が user-facing で返す)

```
AGENT_RESULT: doc-flow
STATUS: success | error | partial
SLUG: {slug}
OUTPUT_LANG: {ja | en}
GENERATED_DELIVERABLES:
  - docs/deliverables/{slug}/hld.{lang}.md
  - ...
SKIPPED_TYPES:
  - user-manual: no UI_SPEC.md
TEMPLATE_VERSIONS:
  hld: 1.0
  lld: 1.0
  ...
SUGGEST_DOC_REVIEW: true
NEXT: done
```

> orchestrator-rules.md の **"Flow orchestrator exception"** に従い、
> doc-flow も基本的には DOC_FLOW_RESULT.md を成果物として完了するが、
> 既存 maintenance-flow が AGENT_RESULT を出すのと整合させて
> doc-flow も上記 block を出力する。

### 3.12 Slash command 引数仕様 (`.claude/commands/doc-flow.md`)

| 引数 | 必須 | デフォルト | 説明 |
|------|------|------------|------|
| `--types` | No | 全 6 | カンマ区切り (`hld,lld,ops-manual,api-reference,user-manual,handover`) |
| `--lang` | No | project-rules.md の Output Language | `ja` または `en` |
| `--slug` | No | project-rules.md `## Project` → `Slug:` または対話 | output dir 名 |
| `--target-project` | No | cwd | 顧客プロジェクトの repo root |

呼び出し例:

```
/doc-flow
/doc-flow --types hld,lld
/doc-flow --lang en --slug acme-portal
/doc-flow --types handover --slug acme-portal --lang ja
```

### 3.13 Standalone vs flow invocation

doc-flow は **flow orchestrator** なので必ず session entry。他 flow
からの自動連鎖はしない (既存 4 flow と同じ方針)。ユーザが明示起動する。

---

## 4. 6 author agent skeleton specifications

PR 1 では各 author agent を **skeleton** (frontmatter + Mission + Inputs
+ Outputs + Out of scope + AGENT_RESULT のみ、本文生成ロジックは記述
しない) として配置する。**PR 2 で developer が本実装に書き換える**。

各 agent の skeleton 行数想定: **70〜90 行 / agent**。本書では構造のみ
定義する。

### 4.1 hld-author

#### frontmatter
```yaml
---
name: hld-author
description: |
  HLD (High-Level Design) author agent for doc-flow. Generates a
  customer-facing system overview from SPEC.md and ARCHITECTURE.md.
  Use only via doc-flow orchestrator (or standalone with explicit args).
  Output: docs/deliverables/{slug}/hld.{lang}.md
tools: Read, Write, Glob, Grep
model: sonnet
color: cyan
---
```

#### Mission
1 段落: 顧客プロジェクト統括 / 顧客アーキテクト向けに、SPEC.md と
ARCHITECTURE.md からシステム全体像を再パッケージする。実装詳細には立ち
入らず、章立ては「1. システム概要 / 2. システム全体構成 / 3. サブシステム
分割 / 4. 外部連携 / 5. 非機能要件 / 6. 採用技術 / 7. 制約・前提」に固定
(IEEE 1471 / ISO/IEC/IEEE 42010 のアーキテクチャ記述標準を参考)。

#### Inputs (read-only)
- `SPEC.md` (必須)
- `ARCHITECTURE.md` (必須)
- `DISCOVERY_RESULT.md` (任意、§5 非機能要件の補強)
- テンプレファイル (Q-C resolution order)

#### Outputs
- `docs/deliverables/{slug}/hld.{lang}.md` (単一ファイル)
- 言語サフィックス省略条件は §2.2 参照

#### Out of scope
- src/* など実装コードは読まない (粒度違い)
- LLD レベルのクラス・関数仕様は出さない (lld-author の責務)

#### AGENT_RESULT
```
AGENT_RESULT: hld-author
STATUS: success | error | blocked
OUTPUT_FILE: docs/deliverables/{slug}/hld.{lang}.md
TEMPLATE_USED: {repo_root}/.claude/templates/doc-flow/hld.{lang}.md | agent-emit-fallback
TEMPLATE_VERSION: 1.0
INPUT_ARTIFACTS:
  - SPEC.md (last_updated: {date})
  - ARCHITECTURE.md (last_updated: {date})
SKIPPED_SECTIONS:
  - section name: reason (例 "5. 非機能要件: DISCOVERY_RESULT.md not found")
NEXT: lld-author | done
BLOCKED_REASON: {if STATUS: blocked, e.g. template_major_bump}
```

#### Standalone invocation
- 引数: `--slug`, `--lang`, `--repo-root` (default cwd) を必須化
- doc-flow 経由でない場合は user に直接 `AGENT_RESULT` を返す

#### Skeleton 行数想定: ~85 行

---

### 4.2 lld-author

#### frontmatter
```yaml
---
name: lld-author
description: |
  LLD (Low-Level Design) author agent. Generates module / class / API
  signature level documentation for the customer's developer / maintenance
  team. Reads ARCHITECTURE.md and the implementation source.
  Output: docs/deliverables/{slug}/lld.{lang}.md
tools: Read, Write, Glob, Grep
model: sonnet
color: cyan
---
```

#### Mission
ARCHITECTURE.md と src/* (signature レベル) から、保守担当者が読める
詳細設計書を生成する。章立ては「1. モジュール構成 / 2. クラス・関数仕様
/ 3. データ構造 / 4. API シグネチャ / 5. アルゴリズム / 6. エラー
ハンドリング」(IEEE 1016 SDD を参考)。

#### Inputs
- `ARCHITECTURE.md` (必須)
- `src/**` (Glob で signature 抽出、本文は引用しない)
- `TASK.md` (任意、実装履歴の補足)
- テンプレファイル

#### Outputs
- `docs/deliverables/{slug}/lld.{lang}.md`
- (Phase 2) module 別の分割 `docs/deliverables/{slug}/lld/{module}.md`

#### Out of scope
- 実装ロジックの逐行説明 (LLD は signature と責務まで)
- 顧客に提示しない private/internal API

#### AGENT_RESULT
```
AGENT_RESULT: lld-author
STATUS: success | error | blocked
OUTPUT_FILE: docs/deliverables/{slug}/lld.{lang}.md
TEMPLATE_USED: ...
TEMPLATE_VERSION: 1.0
INPUT_ARTIFACTS:
  - ARCHITECTURE.md (last_updated: {date})
  - src/* ({N} files scanned)
NEXT: api-reference-author | done
```

#### Skeleton 行数想定: ~85 行

---

### 4.3 ops-manual-author

#### frontmatter
```yaml
---
name: ops-manual-author
description: |
  Ops manual author agent. Repackages infrastructure scripts, deployment
  procedures, and observability runbooks into a customer-operations team
  facing manual.
  Output: docs/deliverables/{slug}/ops-manual.{lang}.md
tools: Read, Write, Glob, Grep
model: sonnet
color: cyan
---
```

#### Mission
infra-builder / releaser / observability の出力 (Dockerfile, compose,
runbook) を顧客運用部門向けに体裁を整え、起動・停止・監視・リストア・
連絡フローを 1 冊の運用マニュアルにまとめる。章立ては
ITIL v4 Service Operation の構成を参考に固定。

#### Inputs
- `Dockerfile`, `docker-compose.yml`, `infra/**` (Glob)
- `OBSERVABILITY.md` (任意)
- `OPS_PLAN.md` (任意、Operations Flow の最終出力)
- `OPS_RESULT.md` (任意)
- テンプレファイル

#### Outputs
- `docs/deliverables/{slug}/ops-manual.{lang}.md`

#### Out of scope
- 開発者向けの環境構築 (README の領域)
- セキュリティ詳細 (SECURITY_AUDIT.md からの抜粋に限定)

#### AGENT_RESULT
```
AGENT_RESULT: ops-manual-author
STATUS: success | error | skipped | blocked
OUTPUT_FILE: docs/deliverables/{slug}/ops-manual.{lang}.md
TEMPLATE_USED: ...
TEMPLATE_VERSION: 1.0
SKIP_REASON: {if STATUS: skipped, e.g. "no infra artifacts (PRODUCT_TYPE != service)"}
INPUT_ARTIFACTS: [...]
NEXT: user-manual-author | done
```

> PRODUCT_TYPE が `tool / library / cli` で Operations Flow 未実行の
> プロジェクトでは `STATUS: skipped` を許容。

#### Skeleton 行数想定: ~90 行

---

### 4.4 api-reference-author

#### frontmatter
```yaml
---
name: api-reference-author
description: |
  API reference author agent. Generates a customer-developer facing API
  reference (auth, common spec, per-endpoint spec, samples, rate limits,
  changelog) from SPEC.md, ARCHITECTURE.md, and src/* signatures.
  Output: docs/deliverables/{slug}/api-reference.{lang}.md
tools: Read, Write, Glob, Grep
model: sonnet
color: cyan
---
```

#### Mission
SPEC.md (Use Cases) と ARCHITECTURE.md (`## 5. API Design`) と src/* の
endpoint signature を統合し、外部 SDK / API 利用ガイドの粒度で API
リファレンスを生成する。doc-writer が出す内部 API doc とは読者・粒度・
出力 path が分離 (本書 §3.3 Mission 第 2 段落参照)。

#### Inputs
- `SPEC.md`
- `ARCHITECTURE.md` (`## 5. API Design`)
- `src/**` (Glob、endpoint signature 抽出)
- `openapi.yaml` / `openapi.json` (任意、自動生成 spec があれば優先)
- テンプレファイル

#### Outputs
- `docs/deliverables/{slug}/api-reference.{lang}.md`

#### Out of scope
- private/internal endpoint
- doc-writer が既に生成した内部 API doc は **読まない** (重複回避)

#### AGENT_RESULT
```
AGENT_RESULT: api-reference-author
STATUS: success | error | skipped
OUTPUT_FILE: docs/deliverables/{slug}/api-reference.{lang}.md
TEMPLATE_USED: ...
TEMPLATE_VERSION: 1.0
ENDPOINT_COUNT: {N}
SKIP_REASON: {if no API endpoints found}
NEXT: ops-manual-author | done
```

#### Skeleton 行数想定: ~90 行

---

### 4.5 user-manual-author

#### frontmatter
```yaml
---
name: user-manual-author
description: |
  End-user manual author agent. Generates a UC-by-UC operation guide for
  the actual end users of the system. Requires UI_SPEC.md to produce
  a non-skip output; falls back to STATUS: skipped when UI_SPEC.md is
  absent.
  Output: docs/deliverables/{slug}/user-manual.{lang}.md
tools: Read, Write, Glob, Grep
model: sonnet
color: cyan
---
```

#### Mission
SPEC.md の Use Case と UI_SPEC.md の画面定義を組み合わせ、業務システムの
実利用者が読める操作手順書を生成する。章構成は **UC 別**。UI_SPEC.md が
ある場合は各 UC 章内に画面操作の補足を入れる。`{{spec.use_cases}}`
placeholder を中心に展開。

#### Inputs
- `SPEC.md` (必須)
- `UI_SPEC.md` (任意、無ければ skip 判定)
- テンプレファイル

#### Outputs
- `docs/deliverables/{slug}/user-manual.{lang}.md`
- スクリーンショットは MVP では「ここにスクショを挿入」プレースホルダー
  のみ生成 (実画像撮影は範囲外)

#### Out of scope
- スクリーンショットの自動撮影
- 動画チュートリアル
- API 利用者向けの内容 (api-reference-author の責務)

#### AGENT_RESULT
```
AGENT_RESULT: user-manual-author
STATUS: success | error | skipped
OUTPUT_FILE: docs/deliverables/{slug}/user-manual.{lang}.md
TEMPLATE_USED: ...
TEMPLATE_VERSION: 1.0
UC_COUNT: {N}
HAS_UI_SPEC: true | false
SKIP_REASON: {if STATUS: skipped, e.g. "no UI (UI_SPEC.md not found)"}
NEXT: handover-author | done
```

#### Skeleton 行数想定: ~85 行

---

### 4.6 handover-author

#### frontmatter
```yaml
---
name: handover-author
description: |
  Handover document author agent. Generated at project closeout to package
  the design history, known issues, test/security summary, and operational
  notes for the successor maintenance team.
  Output: docs/deliverables/{slug}/handover.{lang}.md
tools: Read, Write, Glob, Grep
model: sonnet
color: cyan
---
```

#### Mission
SPEC.md / ARCHITECTURE.md / SECURITY_AUDIT.md / TEST_PLAN.md / 現行
`docs/design-notes/*.md` (archived は除外、§2.6 参照) を統合し、後任
保守チームへの引継ぎパッケージを生成する。章立ては「1. プロジェクト概要
/ 2. 設計判断履歴 / 3. 既知の課題・宿題 / 4. テスト・セキュリティ監査
結果サマリ / 5. 運用申し送り / 6. 関連 doc 索引」。

#### Inputs
- `SPEC.md`, `ARCHITECTURE.md`, `SECURITY_AUDIT.md`, `TEST_PLAN.md`
- `docs/design-notes/*.md` (archived/ は除外)
- 同 slug の他 deliverable (索引化)
- テンプレファイル

#### Outputs
- `docs/deliverables/{slug}/handover.{lang}.md`

#### Out of scope
- archived design-notes (§2.6 で MVP 範囲外)
- 移行計画書 (Phase 2 の別 doc type)

#### AGENT_RESULT
```
AGENT_RESULT: handover-author
STATUS: success | error
OUTPUT_FILE: docs/deliverables/{slug}/handover.{lang}.md
TEMPLATE_USED: ...
TEMPLATE_VERSION: 1.0
DESIGN_NOTES_REFERENCED: {N}
RELATED_DELIVERABLES:
  - docs/deliverables/{slug}/hld.{lang}.md
  - ...
NEXT: done
```

#### Skeleton 行数想定: ~95 行

---

## 5. orchestrator-rules.md changes (差分仕様)

PR 1 で `.claude/orchestrator-rules.md` に以下を追記する。

### 5.1 Triage System に doc-flow を追加

`### Maintenance Flow Triage` の **直後**に以下のサブセクションを挿入:

```markdown
### Doc Flow Triage

| Plan | Condition | Author agents to launch |
|------|-----------|-------------------------|
| Minimal | 1–2 doc types selected | selected authors only |
| Light | 3–4 doc types selected | selected authors only |
| Standard | 5–6 doc types selected | selected authors |
| Full | All 6 + post-generation template_version verification | all 6 authors + verify step |

> **About doc-flow**: Fifth flow independent from Discovery / Delivery /
> Operations / Maintenance. Generates customer-deliverable docs (HLD / LLD
> / ops manual / API reference / end-user manual / handover) from existing
> Aphelion artifacts. Triggered manually via `/doc-flow`. No automatic
> chaining from other flows.

> **doc type skip rules**: `user-manual` is skipped when UI_SPEC.md is not
> present (PRODUCT_TYPE: tool / library / cli typical). `ops-manual` is
> skipped when no infra artifacts exist.
```

### 5.2 Handoff File Specification に DOC_FLOW_RESULT.md を追加

`### OPS_RESULT.md` の **直後**に以下を追加:

```markdown
### DOC_FLOW_RESULT.md

Final output of Doc Flow. Consumed by users (and optionally by
`/doc-reviewer` for cross-deliverable consistency review).

**DOC_FLOW_RESULT.md required fields:**
- `Slug` (output directory name under docs/deliverables/)
- `Output Language` (ja | en)
- "Generated Deliverables" table (must list at least 1 row)
- "Skipped Types" section (may be empty)
- "Suggested Next Steps" section
```

### 5.3 Doc Reviewer Auto-insertion 表は変更しない

§2.7 の確定通り、`doc-flow` および 6 author agent は doc-reviewer の
trigger 表に追加しない (suggest-only 方針)。

### 5.4 Phase Execution Loop / Approval Gate / Common Error Handling は変更しない

doc-flow は既存 common rule をそのまま利用する。

---

## 6. aphelion-overview.md changes (差分仕様)

PR 1 で `src/.claude/rules/aphelion-overview.md` に以下を追記する。

### 6.1 更新履歴 entry 追加

```markdown
> 更新履歴:
>   - 2026-04-24: Maintenance Flow (第4フロー) を追加
>   - 2026-04-30: doc-reviewer (cross-cutting agent) を追加 (#91)
>   - 2026-04-30: doc-flow (5th flow, customer deliverable generation) を追加 (#54)
```

### 6.2 Aphelion Workflow Model 段落の更新

冒頭文を以下に変更:

> Aphelion divides the entire project lifecycle into three primary
> domains — **Discovery → Delivery → Operations** — plus an independent
> **Maintenance** flow for changes to existing projects, and an
> independent **Doc** flow for customer-deliverable doc generation.
> Each domain is managed by an independent orchestrator (flow).

### 6.3 Domain and Flow Overview の図を更新

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
 (requirements)                         (design & impl)                       (deploy & ops)
 6 agents                               12 agents                              4 agents

                    Maintenance Flow ──[MAINTENANCE_RESULT.md]──▶ Delivery Flow (Major only)
                    (existing project maintenance)

                    Doc Flow ──[DOC_FLOW_RESULT.md + docs/deliverables/{slug}/*.md]
                    (customer-deliverable doc generation, MVP=6 doc types)
                    7 agents (1 orchestrator + 6 authors)
```

### 6.4 Branching by Product Type 表に Doc 列追加

```markdown
| PRODUCT_TYPE | Discovery | Delivery | Maintenance | Operations | Doc |
|-------------|-----------|----------|-------------|------------|-----|
| `service` | Run | Run | Run (for maintenance) | Run | Run (on demand) |
| `tool` / `library` / `cli` | Run | Run | Run (for maintenance) | **Skip** | Run (user-manual / ops-manual auto-skip) |
```

### 6.5 Agent Directory に doc-flow agent 群を追加

`### Cross-cutting agents` テーブルの **直後**に以下を追加:

```markdown
### Doc Flow agents

| Agent | Tools | Purpose | Invocation |
|-------|-------|---------|------------|
| `doc-flow` | Bash, Read, Write, Glob, Grep, Agent | 5th flow orchestrator | `/doc-flow` |
| `hld-author` | Read, Write, Glob, Grep | High-Level Design | via doc-flow / standalone |
| `lld-author` | Read, Write, Glob, Grep | Low-Level Design | via doc-flow / standalone |
| `ops-manual-author` | Read, Write, Glob, Grep | Ops manual | via doc-flow / standalone |
| `api-reference-author` | Read, Write, Glob, Grep | API reference (customer) | via doc-flow / standalone |
| `user-manual-author` | Read, Write, Glob, Grep | End-user manual | via doc-flow / standalone |
| `handover-author` | Read, Write, Glob, Grep | Handover package | via doc-flow / standalone |
```

> 注: `src/.claude/rules/aphelion-overview.md` を変更したら、init script
> 経由で `.claude/rules/aphelion-overview.md` (リポジトリ root に installed
> するもの) も同期更新される設計を確認すること (developer 実装時に確認)。

---

## 7. README + Home.md count bump details (32 → 39)

### 7.1 sync check が見る 4 箇所

`scripts/check-readme-wiki-sync.sh` の Check 1 が parity を要求する
4 箇所を以下に **正確に**列挙する:

#### 箇所 1: `README.md`
- 検出 regex: `[0-9]+ specialized agents`
- 該当行: `README.md:3`
  ```
  A collection of AI coding agent definitions for Claude Code that automates the entire project lifecycle with 32 specialized agents.
  ```
- 変更後: `... with 39 specialized agents.`

#### 箇所 2: `README.ja.md`
- 検出 regex: `[0-9]+ の専門エージェント`
- 該当行: `README.ja.md:3`
  ```
  Claude Code 向け AI コーディングエージェント定義集です。32 の専門エージェントがプロジェクトの全工程を自動化します。
  ```
- 変更後: `... 39 の専門エージェントが ...`

#### 箇所 3: `docs/wiki/en/Home.md`
- 検出 regex: `all [0-9]+ agents`
- 該当行: `Home.md:22` (README↔Wiki 比較表) と `Home.md:37` (TOC) の 2 箇所
  ```
  L22: ... NEXT conditions |
  L22 中: all 32 agents
  L37: ... — all 32 agents | Agent developers |
  ```
- 変更後: 両方 `all 39 agents` に bump

#### 箇所 4: `docs/wiki/ja/Home.md`
- 検出 regex: `[0-9]+ エージェント` (script は `sort -u` で重複排除して
  単一値として比較)
- 該当行: `Home.ja.md:23` (README↔Wiki 比較表), `Home.ja.md:38` (TOC)
  ```
  L23: ... 32 エージェントの入出力と NEXT 条件 |
  L38: ... 32 エージェント全件 | エージェント開発者 |
  ```
- 変更後: 両方 `39 エージェント` に bump

> 注意: `Home.ja.md` には `第 4 のフロー` のような「N の」表記がある
> (line 77, 90)。script の regex は `[0-9]+ エージェント` なのでこれら
> は誤マッチしない。実装時に `grep -n 'エージェント' docs/wiki/ja/Home.md`
> で全 hit を確認し、bump 対象が L23 / L38 のみであることを再確認する。

### 7.2 README.md / README.ja.md の 5th flow 言及 (任意)

PR 1 では count bump のみが必須。5th flow の narrative 言及は PR 1 で
任意 / PR 3 で本格追記。**PR 1 で narrative を変えるなら heading 構造を
変えてはならない** (Check 3 が `^## ` の line position 一致を要求)。

具体的に:
- `## What's Aphelion` 直後の mermaid 図に Doc Flow ノードを追加すると
  README.md 行数が増え README.ja.md と heading position がずれる。
- **回避策**: PR 1 では mermaid 図を変えない。本文中の `## Features` や
  `## Learn more` の bullet に「+ Doc Flow (`/doc-flow`)」を追加する場合、
  README.md / README.ja.md で **同じ行数だけ**追加する (推奨は同一行数の
  対訳 1 行追加)。

### 7.3 Home.md の 5th flow 言及 (任意 + 推奨)

PR 1 で Home.md の以下を更新するのが望ましい (sync check は通る):

- L22 / L37 の `all 32 agents` → `all 39 agents`
- 同表内 "Agents Reference (5 pages)" → "Agents Reference (5 + 1 pages)"
  または現状維持。新ページ `Agents-Doc.md` 追加は PR 3 で行うため、
  PR 1 では count bump のみ反映、ページ名追加は PR 3。
- glossary の `Maintenance Flow` 直後に `Doc Flow` entry 追加 (任意)

PR 1 が最低限通すべき条件: **count bump 4 箇所のみ。narrative 追記は
PR 3 でまとめてもよい**。

### 7.4 Heading position parity (Check 3) 保護方針

PR 1 で README.md / README.ja.md を編集する際は:

1. 既存の `^## ` heading の **追加・削除・並び替えを禁止**
2. 数字 bump 以外の本文変更は **同一行数で en/ja 両方に同等変更**を
   入れる
3. PR 提出前に `bash scripts/check-readme-wiki-sync.sh` を必ずローカル
   実行して exit 0 を確認

PR 1 で count bump 4 箇所のみ (= 各ファイル 1 行ずつ修正、heading 触らず)
で済ませるのが最も安全。

---

## 8. PR strategy (B 案 final)

ユーザ確定済み「各 PR 単独で CI 通過する境界」を実装可能形に展開する。

### 8.1 PR 1: orchestrator + author skeletons + count bump

#### 含むファイル

**新規追加**:
- `.claude/agents/doc-flow.md` (orchestrator 本実装、§3 outline に従う)
- `.claude/agents/hld-author.md` (skeleton, §4.1)
- `.claude/agents/lld-author.md` (skeleton, §4.2)
- `.claude/agents/ops-manual-author.md` (skeleton, §4.3)
- `.claude/agents/api-reference-author.md` (skeleton, §4.4)
- `.claude/agents/user-manual-author.md` (skeleton, §4.5)
- `.claude/agents/handover-author.md` (skeleton, §4.6)
- `.claude/commands/doc-flow.md` (slash command 定義、§3.12)

**修正**:
- `.claude/orchestrator-rules.md` (§5)
- `src/.claude/rules/aphelion-overview.md` (§6)
- `.claude/commands/aphelion-help.md` (Orchestrators 表に `/doc-flow`)
- `README.md` (§7.1 箇所 1: count bump)
- `README.ja.md` (§7.1 箇所 2: count bump)
- `docs/wiki/en/Home.md` (§7.1 箇所 3: count bump、L22 + L37)
- `docs/wiki/ja/Home.md` (§7.1 箇所 4: count bump、L23 + L38)

#### 含まないもの

- `.claude/templates/doc-flow/**` (PR 2)
- 6 author agent の本実装ロジック (PR 2)
- wiki narrative 詳細追記 (PR 3)
- `docs/wiki/{en,ja}/Agents-Doc.md` 新ページ (PR 3、採否は architect 判断
  だが本書では **PR 3 で追加を推奨**)

#### CI 通過条件 (PR 1 単独)

- `bash scripts/check-readme-wiki-sync.sh` exit 0
  - Check 1: agent count = 39 が 4 箇所一致 (`ls .claude/agents/ | wc -l`
    が 39 になっていること = 既存 32 + 新規 7)
  - Check 2: aphelion-help.md と Getting-Started.md の slash command 表
    一致 (Getting-Started.md 側でも `/doc-flow` を追記する必要あり →
    本書 §8.4 で確認)
  - Check 3: README.md / README.ja.md の `^## ` line position 一致
- PR 説明文に `Closes #54` (Issue を本 PR で完全 close するか #54 を
  parent issue 扱いにし PR 1 では `Linked Issue: #54` のみとするかは
  developer/releaser 判断)

#### branch
`feat/doc-flow-orchestrator-skeleton` (git-rules.md §Branch Naming)

#### commit 一覧予想
1. `feat: scaffold doc-flow orchestrator and 6 author skeletons (#54)`
2. `feat: add /doc-flow slash command and aphelion-help entry (#54)`
3. `docs: register doc-flow in orchestrator-rules.md (#54)`
4. `docs: register doc-flow in aphelion-overview.md (#54)`
5. `docs: bump agent count 32 → 39 in README and Home.md (#54)`

5 commit 構成を推奨 (1 task 1 commit; git-rules.md)。

### 8.2 PR 2: templates + author agent full implementation

#### 含むファイル

**新規追加**:
- `.claude/templates/doc-flow/hld.en.md`, `hld.ja.md`
- `.claude/templates/doc-flow/lld.en.md`, `lld.ja.md`
- `.claude/templates/doc-flow/ops-manual.en.md`, `ops-manual.ja.md`
- `.claude/templates/doc-flow/api-reference.en.md`, `api-reference.ja.md`
- `.claude/templates/doc-flow/user-manual.en.md`, `user-manual.ja.md`
- `.claude/templates/doc-flow/handover.en.md`, `handover.ja.md`

(計 12 ファイル)

**修正**:
- `.claude/agents/hld-author.md` (skeleton → 本実装)
- `.claude/agents/lld-author.md` (同)
- `.claude/agents/ops-manual-author.md` (同)
- `.claude/agents/api-reference-author.md` (同)
- `.claude/agents/user-manual-author.md` (同)
- `.claude/agents/handover-author.md` (同)

#### 含まないもの
- 新規 agent (count 影響なし)

#### CI 通過条件 (PR 2 単独)
- `bash scripts/check-readme-wiki-sync.sh` exit 0
  - count は変わらず 39 で 4 箇所一致 (PR 1 で既に bump 済み)
- 任意 dogfooding: aphelion-agents 自身を target にして 1 doc 試行 (別 PR)

#### branch
`feat/doc-flow-authors`

### 8.3 PR 3: wiki narrative

#### 含むファイル

**新規追加** (推奨):
- `docs/wiki/en/Agents-Doc.md` (6 author agent の独立 reference page)
- `docs/wiki/ja/Agents-Doc.md` (同 ja)

**修正**:
- `docs/wiki/en/Triage-System.md` (Doc Flow Triage 表追加)
- `docs/wiki/ja/Triage-System.md` (同 ja)
- `docs/wiki/en/Architecture-Domain-Model.md` (4-domain → 5-domain)
- `docs/wiki/ja/Architecture-Domain-Model.md` (同 ja)
- `docs/wiki/en/Agents-Orchestrators.md` (Flow Orchestrators 節に doc-flow)
- `docs/wiki/ja/Agents-Orchestrators.md` (同 ja)
- `docs/wiki/en/Home.md` (TOC に Agents-Doc.md リンク追加、5th flow
  narrative 補強)
- `docs/wiki/ja/Home.md` (同 ja)
- `README.md` (任意: 5th flow narrative 補強、heading 構造維持)
- `README.ja.md` (同 ja)

#### CI 通過条件 (PR 3 単独)
- `bash scripts/check-readme-wiki-sync.sh` exit 0
  - count は 39 のまま (新 agent 追加なし)
  - heading position parity 維持 (README pair 編集時)
  - aphelion-help.md と Getting-Started.md の command list 一致
    (PR 1 で既に同期済みだが、Getting-Started.md を編集する場合は
    `/doc-flow` を残すこと)

#### branch
`docs/doc-flow-wiki-readme`

### 8.4 cross-PR 留意事項

- **PR 1 で `.claude/commands/doc-flow.md` を追加する場合、
  `.claude/commands/aphelion-help.md` の Orchestrators 表にも `/doc-flow`
  を追加し、さらに `docs/wiki/en/Getting-Started.md` の slash command
  リストにも `/doc-flow` を追加する**。Check 2 はこの 2 ファイル間の
  parity を見る。
  - Getting-Started.md には ja 版 `docs/wiki/ja/Getting-Started.md` も
    存在する (Check 2 は en 側のみだが、bilingual policy で ja 同期必須)。
- **PR 3 を最初に書きたい誘惑がある (narrative の方が書きやすい) が、
  PR 1 を必ず最初に merge する**。理由: agent count 39 への bump が
  PR 1 にあり、PR 3 を先に出すと wiki narrative の link 先 (Agents-Doc.md
  への `all 39 agents` 言及) と実 agent count が乖離する。

---

## 9. Test strategy

### 9.1 PR 1 単独での sync check 検証

ローカル検証手順:

```bash
cd /home/ysato/git/aphelion-agents
# 1. 新規 7 agent を追加した状態を再現 (skeleton で良い)
ls .claude/agents/ | wc -l       # 39 を確認
# 2. README/Home の bump 確認
grep -n 'specialized agents' README.md
grep -n '専門エージェント' README.ja.md
grep -n 'all .* agents' docs/wiki/en/Home.md
grep -n 'エージェント' docs/wiki/ja/Home.md
# 3. sync check
bash scripts/check-readme-wiki-sync.sh && echo OK
```

CI 上では `.github/workflows/check-readme-wiki-sync.yml` (advisory) が
同コマンドを実行 (既存)。

### 9.2 PR 1 の手動動作確認

agent skeleton の段階では本実装が無いので動作確認は限定的:

- `claude` 起動後 `/doc-flow` を実行 → orchestrator が起動し triage
  question が出ること
- triage 承認 → 6 author skeleton が phase ごとに起動を試み、
  `STATUS: error` (本実装無し) または `STATUS: skipped` を返すこと
- 全 phase 完了後、orchestrator が DOC_FLOW_RESULT.md を生成すること
  (中身は空でも可、§3.10 の構造を持つこと)

PR 1 の段階では「skeleton による placeholder 動作」を許容し、本実装は
PR 2 で完成。

### 9.3 PR 2 でのテンプレ resolution 動作確認

dogfooding: aphelion-agents 自身を target に 1 〜 2 doc type を試行
(SPEC.md 不在のため hld / lld は適合しない可能性あり、`handover` のみ
試行が現実的)。

```bash
cd /tmp && mkdir test-project && cd test-project
# 最低限の SPEC.md / ARCHITECTURE.md を用意
echo "# Test" > SPEC.md
echo "# Test Arch" > ARCHITECTURE.md
# .claude/templates/doc-flow/ がプロジェクトに無い状態
# Aphelion 内蔵テンプレが使われることを確認
claude
> /doc-flow --types hld --slug test-project --lang ja
# docs/deliverables/test-project/hld.ja.md が生成されること
# 中身がテンプレ章立てに従っていること
```

### 9.4 PR 3 での wiki bilingual sync 確認

```bash
# en/ja で `^## ` heading 数を比較
diff \
  <(grep -c '^## ' docs/wiki/en/Triage-System.md) \
  <(grep -c '^## ' docs/wiki/ja/Triage-System.md)
# 同様に他ページ
```

`docs/wiki/{en,ja}/Contributing.md` "Bilingual Sync Policy" を遵守。

### 9.5 互換性テスト (Phase 2 視野)

`template_version: 1.0` → `1.1` (minor) の minor bump は warning のみ、
`1.0` → `2.0` (major) は AskUserQuestion を発火することを確認する手動
テスト手順を PR 2 の README または developer notes に記載 (Phase 2
で自動テスト化)。

---

## 10. Implementation checklist for developer (PR 1 用)

PR 1 を提出するために developer が踏む手順を順序付きで列挙する。

### 10.1 事前準備

- [ ] git-rules.md `### Startup Probe` を実行し `REPO_STATE` を確認
- [ ] branch 作成: `git checkout -b feat/doc-flow-orchestrator-skeleton`
- [ ] 既存 agent count 確認: `ls .claude/agents/ | wc -l` → 32

### 10.2 Skeleton 配置 (commit 1)

- [ ] `.claude/agents/doc-flow.md` 作成 (§3 outline 全反映)
- [ ] `.claude/agents/hld-author.md` 作成 (§4.1 skeleton, ~85 行)
- [ ] `.claude/agents/lld-author.md` 作成 (§4.2 skeleton, ~85 行)
- [ ] `.claude/agents/ops-manual-author.md` 作成 (§4.3, ~90 行)
- [ ] `.claude/agents/api-reference-author.md` 作成 (§4.4, ~90 行)
- [ ] `.claude/agents/user-manual-author.md` 作成 (§4.5, ~85 行)
- [ ] `.claude/agents/handover-author.md` 作成 (§4.6, ~95 行)
- [ ] `ls .claude/agents/ | wc -l` → 39 を確認
- [ ] commit 1: `feat: scaffold doc-flow orchestrator and 6 author skeletons (#54)`

### 10.3 Slash command + help (commit 2)

- [ ] `.claude/commands/doc-flow.md` 作成 (§3.12 引数仕様)
- [ ] `.claude/commands/aphelion-help.md` 修正: Orchestrators 表に
      `/doc-flow` 追加
- [ ] `docs/wiki/en/Getting-Started.md` 修正: slash command リストに
      `/doc-flow` 追加 (Check 2 通過のため必須)
- [ ] `docs/wiki/ja/Getting-Started.md` 修正: 同上 (bilingual sync)
- [ ] commit 2: `feat: add /doc-flow slash command and aphelion-help entry (#54)`

### 10.4 orchestrator-rules.md (commit 3)

- [ ] `.claude/orchestrator-rules.md` 修正: §5 の差分仕様反映
  - [ ] Triage System に `### Doc Flow Triage` 追加
  - [ ] Handoff File Specification に `### DOC_FLOW_RESULT.md` 追加
- [ ] commit 3: `docs: register doc-flow in orchestrator-rules.md (#54)`

### 10.5 aphelion-overview.md (commit 4)

- [ ] `src/.claude/rules/aphelion-overview.md` 修正: §6 の差分仕様反映
  - [ ] 更新履歴 entry 追加
  - [ ] Workflow Model 段落更新
  - [ ] Domain and Flow Overview 図更新
  - [ ] Branching by Product Type 表に Doc 列追加
  - [ ] Agent Directory に Doc Flow agents テーブル追加
- [ ] **重要**: ルートの `.claude/rules/aphelion-overview.md` は
      `src/.claude/rules/aphelion-overview.md` から install されるため、
      該当する場合は同期確認 (init script の挙動を確認、必要なら別途
      同期 commit)
- [ ] commit 4: `docs: register doc-flow in aphelion-overview.md (#54)`

### 10.6 README + Home count bump (commit 5)

- [ ] `README.md` L3: `32 specialized agents` → `39 specialized agents`
- [ ] `README.ja.md` L3: `32 の専門エージェント` → `39 の専門エージェント`
- [ ] `docs/wiki/en/Home.md` L22, L37: `all 32 agents` → `all 39 agents`
- [ ] `docs/wiki/ja/Home.md` L23, L38: `32 エージェント` → `39 エージェント`
- [ ] **`bash scripts/check-readme-wiki-sync.sh && echo OK` を実行し
      exit 0 を確認** (失敗時は §7.1 / §7.4 を再確認)
- [ ] commit 5: `docs: bump agent count 32 → 39 in README and Home.md (#54)`

### 10.7 Push + PR

- [ ] `git push -u origin feat/doc-flow-orchestrator-skeleton`
- [ ] `gh pr create` (git-rules.md §Pull request creation の template):
  - [ ] Title: `feat: add doc-flow orchestrator and 6 author skeletons (#54, PR 1/3)`
  - [ ] Body に `Linked Issue: #54` (Issue は PR 3 で close するため
        `Closes` ではなく `Linked Issue`)
  - [ ] Body に `Linked Plan: docs/design-notes/doc-flow.md`
  - [ ] Body に `Linked Architecture: docs/design-notes/doc-flow-architecture.md`
  - [ ] Test plan checklist (sync check の手動確認)

### 10.8 完了確認

- [ ] CI green (sync check advisory)
- [ ] reviewer レビュー受領
- [ ] AGENT_RESULT 出力 (developer の Required Output)

---

## 11. Risk register

| ID | Risk | 影響 | 確率 | Mitigation |
|----|------|------|------|------------|
| R-1 | sync check Check 3 が PR 1 で fail (README pair の heading position ずれ) | PR 1 が CI fail し merge 不可 | 中 | PR 1 では README/README.ja.md は count bump (1 行修正) のみに留め、heading 構造を絶対変更しない (§7.4) |
| R-2 | Check 2 の slash command list parity が fail (`/doc-flow` を片側だけ追加) | 同上 | 中 | §10.3 で aphelion-help.md と Getting-Started.md (en) の **両方**に `/doc-flow` を追加。ja 版 Getting-Started.md も忘れず同期 |
| R-3 | テンプレ major version bump 時に AskUserQuestion が利用不可な状況 (Q-H 注意点) | 既存 deliverable を意図せず上書き | 低 | author agent は AskUserQuestion 失敗時に AUTO_APPROVE 同等の「`{path}.v{old}.bak` 退避 + 上書き」へ自動 fallback |
| R-4 | UI_SPEC.md 不在時 user-manual-author の skip が orchestrator に「failure」と誤判定される | phase rollback が走る | 低 | orchestrator は `STATUS: skipped` を success と同等に扱う (§3.7)。既存 rollback rules には影響しない |
| R-5 | doc-flow と doc-writer の責務境界が曖昧で運用上重複 | ユーザ混乱 / 重複生成 | 中 | doc-flow.md Mission 第 2 段落で明示分離 (§3.3)。doc-writer.md にも 1 段落追記 (PR 1 の任意 commit、または PR 3 の wiki narrative) |
| R-6 | aphelion-agents 自身を dogfooding した場合、SPEC.md 不在で大半の author が STATUS: skipped を返す | dogfooding の網羅性が低い | 中 | Phase 2 で「Aphelion 自身用 minimal SPEC.md」を design-notes 経由で導入する案を別 issue 化 (本 MVP 範囲外) |
| R-7 | architect 段階で `AskUserQuestion` が利用不可だったため、確定回答に user 追認漏れがある | 仕様逸脱 | 低 | 本書 §2 の確定はすべて analyst 推奨踏襲または明示的な technical rationale 付き再考。重大変更は無い。developer / reviewer フェーズで user が違和感を感じれば PR レビュー時に修正 |
| R-8 | `src/.claude/rules/aphelion-overview.md` と install 後の `.claude/rules/aphelion-overview.md` の同期忘れ | install ユーザに新フローが見えない | 中 | §10.5 で install 機構の挙動を確認するチェックボックスを設置。必要なら init script 側にも同期 logic を追加 |
| R-9 | PR 1 単独で agent skeleton のみ merge された後、ユーザが `/doc-flow` を実行して "skeleton 動作" に困惑 | ユーザ混乱 | 低 | doc-flow.md Mission 末尾または triage 結果テキストに `> Note: This is a skeleton release; full doc generation is enabled in PR 2.` を一時的に記載 (PR 2 で削除) |
| R-10 | `--types` で部分起動した際の依存欠落 (LLD 単独起動で HLD 未生成) | deliverable 内整合性低下 | 低 | §3.6 の通り依存欠落 deliverable 末尾に warning 注記を author が追加。MVP では強制依存解決はしない |

---

## 12. Appendix: 章立ての業界標準参考

各 author agent の章立て選定根拠 (developer 向け補足):

- **HLD**: ISO/IEC/IEEE 42010:2011 (Architecture Description) の
  viewpoint 概念。日本国内では IPA「機能要件の合意形成ガイド」HLD 部
- **LLD**: IEEE 1016-2009 (Software Design Descriptions, SDD)。
  module / data / interface / detailed design の 4 view を簡略化
- **運用マニュアル**: ITIL v4 Service Operation の主要プロセス
  (Event / Incident / Request / Problem / Access management) を運用観点
  で抽出
- **API リファレンス**: OpenAPI 3.x の semantic を踏襲し、Stripe / GitHub
  REST API のリファレンス構成 (auth → common → endpoints → samples →
  rate limit → changelog) を採用
- **エンドユーザマニュアル**: ISO/IEC 26514:2008 (User documentation) の
  task-oriented 構造。UC 別章立てはこれに最も適合
- **IEEE 標準のライセンス制約**: 章立て構造 (見出しの順序) は著作物では
  ないため流用可能。標準本文の引用は禁止

---

## 13. Handoff to developer

### 13.1 NEXT
`developer`

### 13.2 developer 向け要約

PR 1 から開始すること。範囲は §8.1 を **正規ソース**として従う。
PR 1 単独で `bash scripts/check-readme-wiki-sync.sh` が exit 0 になる
必要があるため:

1. 6 author skeleton + orchestrator + slash command + aphelion-help を
   同梱 (agent count を 32 → 39 に確実に上げる)
2. `README.md` / `README.ja.md` / `docs/wiki/en/Home.md` /
   `docs/wiki/ja/Home.md` の 4 箇所を count bump (32 → 39)
3. heading position parity (Check 3) を壊さないよう README pair の
   `^## ` 構造は触らない
4. Check 2 通過のため `/doc-flow` を `aphelion-help.md` と
   `Getting-Started.md` (en/ja) に追加

PR 2 / PR 3 は §8.2 / §8.3 に従う。本書 §10 の checklist を順番に潰す
こと。
