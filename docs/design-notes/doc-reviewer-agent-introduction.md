# feat: add doc-reviewer agent for cross-flow markdown artifact consistency review

> Reference: current `main` (HEAD `e56a58d`, 2026-04-30)
> Created: 2026-04-30
> Last updated: 2026-04-30
> Analyzed by: analyst (2026-04-30)
> Author: analyst (design-only phase — no implementation yet)
> Scope: planning document; agent definition body and orchestrator wiring will be authored in a follow-up `architect` phase
> GitHub Issue: [#91](https://github.com/kirin0198/aphelion-agents/issues/91)
> Implemented in: TBD
> Next: architect

---

## 1. Background & Motivation

### 1.1 ユーザの問題意識（原文）

> 各エージェントが出力・更新するマークダウンファイルについて、
> SPEC.md を中心とした整合性レビューが存在しない。
> コード実装には `reviewer` がいるが、ドキュメント成果物にはレビュアーが
> いないという非対称を解消する。

### 1.2 なぜ今この非対称が問題か

Aphelion のワークフローはマークダウン成果物 (SPEC.md / ARCHITECTURE.md /
UI_SPEC.md / docs/design-notes/) を **エージェント間の唯一の永続的契約** として
扱う。コードは ARCHITECTURE.md に従って書かれ、テストは SPEC.md の受け入れ
基準に従って書かれる。すなわち上流ドキュメントの整合性が崩れると、下流の
コード品質ゲート (`reviewer` / `tester` / `security-auditor`) は **誤った
真実を基準にして全件 PASS してしまう**。これは silent failure であり、
コード品質ゲートでは原理的に検出できない。

具体的に発生し得る不整合の例:

1. **spec-designer が UC を改名したが UI_SPEC.md の SCR 紐付けが旧名のまま**
   → Delivery Flow Phase 6 (`developer`) は ARCHITECTURE.md だけを根拠に
   実装するため気付かない。`reviewer` も「コードと ARCHITECTURE.md の整合」
   は見るが、「ARCHITECTURE.md と UI_SPEC.md の整合」は所掌外。
2. **architect が新しいエンドポイントを ARCHITECTURE.md に追加したが、
   対応する UC が SPEC.md に存在しない**
   → 「設計 driven」で実装が進んでしまい、SPEC.md が事後追従するか、
   あるいは追従されず腐る。
3. **analyst が SPEC.md の UC-007 の受け入れ基準を改訂したが、
   既存の UC-003 がそれに依存していたケースを見落とした**
   → maintenance-flow Patch では `reviewer` が走らない (Phase 構成上)
   ため、以後の Patch の度にこの不整合が累積する。
4. **scope-planner が DISCOVERY_RESULT.md にまとめた IN/OUT が
   interviewer の INTERVIEW_RESULT.md と矛盾**
   → Delivery Flow 開始時に spec-designer が拾い直すが、
   その時点で「どちらが正」を判定する根拠がない。

### 1.3 既存 `reviewer` との対称性

`.claude/agents/reviewer.md` は **コードに対する** 5 観点レビュー
(spec compliance / design consistency / code quality / test quality /
API contract) を持つ。すなわち「成果物 (コード) ↔ 上流ドキュメント」の
垂直方向の整合は見るが、「上流ドキュメント同士」の水平方向の整合は所掌外。
本提案はこの水平方向のチェックを担う **ドキュメント版 reviewer** を新設する。

### 1.4 想定ユーザ・想定発火状況

- Discovery Flow の scope-planner 完了直後
  → DISCOVERY_RESULT.md と INTERVIEW_RESULT.md の整合
- Delivery Flow の spec-designer / architect / ux-designer 完了直後
  → SPEC.md / ARCHITECTURE.md / UI_SPEC.md の三角整合
- Maintenance Flow の analyst 完了直後 (Minor / Major)
  → SPEC.md 差分 ↔ 既存 UC の整合 (Patch では SPEC.md を更新しないので
  原則 skip)

---

## 2. Current state

### 2.1 既存の review/audit 体制

`.claude/agents/` 配下を確認した結果 (2026-04-30 時点)、コード/実装/
セキュリティに関する review-tier agent は存在するが、ドキュメント横断の
review-tier agent は存在しない。

| agent | 対象 | 起動位置 | 出力 |
|-------|------|----------|------|
| `reviewer` | 実装コード + テストコード | Delivery Phase 9 (Light+) | レビューコメント (テキスト) |
| `security-auditor` | 実装コード | Delivery Phase 10 (全プラン必須) | `SECURITY_AUDIT.md` |
| `compliance-auditor` (#56 で導入予定) | 規約準拠 (NIST/PCI-DSS/SOC2) | 複数フェーズ後段 (オプトイン) | `COMPLIANCE_AUDIT.md` |
| `doc-reviewer` (本提案) | マークダウン成果物の相互整合 | 各 spec/design/scope エージェント直後 | レビュー結果テキスト (file 出力なし) |

### 2.2 ドキュメント整合性の現状の担保方法

| 担保ポイント | 現状の仕組み | 問題 |
|--------------|--------------|------|
| 各エージェントが上流文書を Read してから書く | 各 agent definition の "Mission" / "Inputs" で Read 指示 | 「読んだ」だけで「整合させた」かは検証されない |
| `architect` が「SPEC.md @ {date}」を `ARCHITECTURE.md` 冒頭に記録する | `.claude/rules/document-versioning.md` の Traceability ルール | バージョン番号の一致は見ているが、内容の整合は見ていない |
| `reviewer` の "Spec Compliance" チェック | `reviewer.md` の Review Perspective #1 | 対象は **コード ↔ SPEC.md** の垂直整合のみ。SPEC.md 内部の整合は見ない |
| ユーザの目視レビュー (approval gate) | flow orchestrator の各 phase 後で `AskUserQuestion` | ユーザが実質的に唯一の整合性チェッカーになっている (= 仕組みとして担保がない) |

### 2.3 既存 cross-cutting agent の前例

`.claude/agents/sandbox-runner.md` は唯一の **cross-cutting agent** で、
特定ドメインに属さず複数 flow から呼ばれる。Aphelion ワークフロー上、
cross-cutting agent はオーケストレーター呼び出し方式で動作し、
独立コンテキストを持つ点が特徴。`doc-reviewer` も同じ枠組みに入る。

`.claude/orchestrator-rules.md` の "Sandbox Runner Auto-insertion" セクション
が cross-cutting agent の挿入規約のテンプレートとして機能する。
本提案では同様の "Doc Reviewer Auto-insertion" セクションを追加する。

### 2.4 現状のギャップまとめ

> マークダウン成果物の「水平方向の整合」を担保する仕組みは現在 Aphelion
> に存在せず、ユーザの目視に依存している。これが本 issue の根本動機。

---

## 3. Proposed approach

### 3.1 新 agent: `doc-reviewer`

`.claude/agents/doc-reviewer.md` として新規作成する。役割境界は次の通り:

| 観点 | `reviewer` | `doc-reviewer` (新設) |
|------|------------|----------------------|
| 主目的 | コード品質ゲート | ドキュメント整合性ゲート |
| 主な対象 | 実装コード + テストコード | SPEC.md / ARCHITECTURE.md / UI_SPEC.md / docs/design-notes/ / DISCOVERY_RESULT.md |
| 主なチェック手段 | 静的解析 + コードレビュー 5 観点 | 上流-下流文書間の整合チェック (UC ↔ エンドポイント ↔ 画面 ↔ scope) |
| 入力フェーズ | Delivery Phase 9 (Light 以上) | Discovery / Delivery / Maintenance の **複数フック** |
| 出力 | テキスト (レビューコメント) | テキスト (PASS/FAIL + 不整合リスト) |
| 必須プラン | Delivery Light 以上 | 全 flow / 全プラン (mandatory) ※ §4 Q6 で再考 |
| 自動修正 | しない | しない |
| ベーステンプレート | — | `reviewer.md` (5 観点構造) + `sandbox-runner.md` (cross-cutting 起動規約) のハイブリッド |

> **重要な補足**: ユーザーの当初要求では「reviewer はコードレビュー特化」
> との前提だが、`reviewer.md` を実際に読むと "Review Perspectives" の #1
> "Spec Compliance" には SPEC.md の UC 実装率チェックが含まれる。これは
> **コード ↔ SPEC.md の垂直整合**であり、`doc-reviewer` の **SPEC.md
> 内部 / SPEC.md ↔ ARCHITECTURE.md の水平整合** とは扱う方向が直交する。
> したがって両者は重複せず補完関係にある。`reviewer` をリネームする必要は
> ない。これは §4 Q1 で詳述する。

### 3.2 起動位置 (フェーズ横断フック)

`doc-reviewer` は以下の 5 フックから起動される。**オーケストレーター
呼び出し方式** を採用し、各成果物エージェントが AGENT_RESULT を返した
直後にオーケストレーターが `Agent` ツール経由で `doc-reviewer` を起動する。
作成エージェントは `doc-reviewer` の起動を意識しない (= 既存 agent
definition の改変は不要)。

#### Discovery Flow フック

```
discovery-flow Phase {final}: scope-planner → AGENT_RESULT
  └─ orchestrator が doc-reviewer を起動
      入力: DISCOVERY_RESULT.md, INTERVIEW_RESULT.md (および存在すれば
            RESEARCH_RESULT.md / POC_RESULT.md / SCOPE_PLAN.md)
      重点: DISCOVERY_RESULT.md の Requirements Summary が
            INTERVIEW_RESULT.md と矛盾していないか
      出力: PASS / FAIL + findings
  ├─ PASS → 既存の approval gate へ
  └─ FAIL → scope-planner へ rollback (max 3 回)
```

> **interviewer / researcher / poc-engineer 個別フェーズの後で発火しない
> 理由**: これらは「単一ドキュメントを生成」する段階であり、整合性チェック
> 対象が存在しない (比較相手がない)。最終的に `scope-planner` が
> DISCOVERY_RESULT.md として束ねた段階が初の水平整合チェックポイント。
> ただし researcher の結果を interviewer が拾い直す Standard 以上では、
> researcher 完了直後にも軽量チェックを入れる選択肢がある (§4 Q4 参照)。

#### Delivery Flow フック (3 箇所)

```
delivery-flow Phase 1: spec-designer → AGENT_RESULT
  └─ doc-reviewer (SPEC.md ↔ DISCOVERY_RESULT.md / INTERVIEW_RESULT.md)
       PASS → approval gate / FAIL → spec-designer rollback

delivery-flow Phase 2: ux-designer → AGENT_RESULT  (HAS_UI=true のみ)
  └─ doc-reviewer (UI_SPEC.md ↔ SPEC.md scope)
       PASS → approval gate / FAIL → ux-designer rollback

delivery-flow Phase 3: architect → AGENT_RESULT
  └─ doc-reviewer (ARCHITECTURE.md ↔ SPEC.md, UC↔ エンドポイント↔
                   データモデルのトレース)
       PASS → approval gate / FAIL → architect rollback
```

#### Maintenance Flow フック

```
maintenance-flow Phase {analyst}: analyst → AGENT_RESULT
  ├─ change-classifier の PLAN が Patch:
  │    分岐 A: SPEC.md 差分なし (DOCS_UPDATED に SPEC.md: no_change)
  │            → doc-reviewer skip
  │    分岐 B: SPEC.md 差分あり (Patch でも稀に発生)
  │            → doc-reviewer 起動 (差分 ↔ 既存 UC の不整合検出)
  ├─ change-classifier の PLAN が Minor / Major:
  │    SPEC.md 差分の有無に関わらず doc-reviewer 起動
  │    重点: analyst が触った UC が他 UC を壊していないか
  └─ FAIL → analyst へ rollback (max 3 回)
```

### 3.3 チェック観点 (5 観点)

`reviewer.md` の 5 観点構造を踏襲し、ドキュメント版に置き換える。

#### 観点 1: 上流-下流の網羅性 (Coverage)

- DISCOVERY_RESULT.md の各要件が SPEC.md の UC として存在するか
- SPEC.md の各 UC が ARCHITECTURE.md の対応モジュール/エンドポイントを持つか
- SPEC.md で UI を伴う UC が UI_SPEC.md の SCR と紐付いているか
- design-note (§7 で `> Linked Plan:` 経由でリンクされたもの) が
  実際に SPEC.md / ARCHITECTURE.md の差分として反映されているか

#### 観点 2: 命名・参照整合性 (Naming consistency)

- UC-XXX / SCR-XXX / API-XXX のような ID が renumber/rename された場合に
  全文書で統一されているか
- 用語集 (定義されている場合) と各文書中の用語使用が一致するか
- ファイルパスや agent 名 (例: `.claude/agents/architect.md`) が
  実在するか (`Glob` で実在確認)

#### 観点 3: スコープ整合性 (Scope alignment)

- DISCOVERY_RESULT.md の IN/OUT と SPEC.md の SCOPE が一致するか
- SPEC.md の SCOPE (IN) と ARCHITECTURE.md の実装対象が一致するか
- SPEC.md の SCOPE (OUT) と矛盾する設計が ARCHITECTURE.md にないか
- maintenance-flow で「既存 UC を壊さない」原則が守られているか
  (削除された UC を別 UC が参照していないか)

#### 観点 4: バージョン整合性 (Version traceability)

- ARCHITECTURE.md の `> Source: SPEC.md @ {date}` の日付が、
  実際の SPEC.md の `> Last updated: {date}` と一致するか
- design-note の `> GitHub Issue: [#N](...)` が実在する issue を指すか
- 同一フェーズ内で **同一文書を複数 agent が連続更新した順序**が
  整合しているか (例: spec-designer → architect の順で SPEC.md を
  どちらも更新するケース)

#### 観点 5: 受け入れ基準と承認可能性 (Acceptance criteria reviewability)

- SPEC.md の各 UC に受け入れ基準 (Acceptance Criteria) があるか
- 受け入れ基準が **テスト可能な形** で書かれているか
  (定量的 / 観測可能 / 一意に判定可能)
- maintenance-flow で改訂された受け入れ基準が、既存テストを破壊しないか

> **Out of scope (観点に含めない)**:
> - 文体・表記ゆれ (Markdown lint レベル)
> - 章立ての美しさ
> - README.md / CHANGELOG.md / wiki / commit message
> - コードコメントの整合性 (これは `reviewer` の所掌)

### 3.4 出力フォーマット

`reviewer.md` のレポート形式を **簡略化** したテキスト出力。
ファイルは生成しない (`COMPLIANCE_AUDIT.md` のような persistent 成果物に
する必要がない — 不整合は即時修正する前提)。

```
## Doc Review Report

### Target artifacts
{review 対象ファイルのリスト + Last updated date}

### Overall Assessment
{✅ PASS / ❌ FAIL}

### 🔴 INCONSISTENCY (修正必須 — orchestrator が rollback)
#### [DR-001] {不整合のタイトル}
- **Files:** `SPEC.md` ↔ `ARCHITECTURE.md`
- **観点:** {coverage / naming / scope / version / acceptance}
- **不整合内容:** {何が食い違っているか}
- **根拠:** {SPEC.md UC-XXX (line 42) と ARCHITECTURE.md §3.2 (line 88)}
- **想定対応:** {どちらをどう変更すべきか}

### 🟡 ADVISORY (改善推奨 — rollback 対象外)
#### [DA-001] {推奨改善のタイトル}
- **Files:** ...

### Coverage matrix
| 上流 ID | 下流での反映 | 状態 |
|---------|--------------|------|
| UC-001  | ARCHITECTURE.md §3.1, UI_SPEC.md SCR-001 | ✅ |
| UC-002  | ARCHITECTURE.md §3.2 | ⚠️ UI_SPEC.md に SCR なし |
| UC-003  | (none) | ❌ 設計欠落 |
```

### 3.5 AGENT_RESULT 契約

```
AGENT_RESULT: doc-reviewer
STATUS: success | failure | error
DOC_REVIEW_RESULT: pass | fail
INCONSISTENCY_COUNT: {N}
ADVISORY_COUNT: {N}
TARGET_ARTIFACTS:
  - {file path}: {Last updated date}
INCONSISTENCY_ITEMS:
  - {DR-XXX}: {short summary}
TRIGGERED_BY: spec-designer | architect | ux-designer | scope-planner | analyst
NEXT: {triggering agent | done}  # FAIL のとき rollback ターゲット
```

| STATUS | DOC_REVIEW_RESULT | 条件 |
|--------|------------------|------|
| `success` | `pass` | INCONSISTENCY_COUNT == 0 |
| `success` | `pass` | INCONSISTENCY_COUNT == 0 かつ ADVISORY のみ |
| `failure` | `fail` | INCONSISTENCY_COUNT >= 1 |
| `error` | (n/a) | doc-reviewer 自身の例外 |

### 3.6 オーケストレーター挿入規約

`.claude/orchestrator-rules.md` に "Doc Reviewer Auto-insertion"
セクションを新設し、`Sandbox Runner Auto-insertion` と同じ構造で記述する。

```
Doc Reviewer Auto-insertion

Trigger Conditions:
  オーケストレーターが以下の agent から AGENT_RESULT を受け取った直後、
  doc-reviewer を auto-insert する:
    - delivery-flow:    spec-designer, architect, ux-designer
    - discovery-flow:   scope-planner
    - maintenance-flow: analyst (PLAN=Patch かつ SPEC.md 差分なしなら skip)

Double-Execution Prevention:
  per-phase insertion flag `doc_reviewer_inserted_for_phase_id` を
  オーケストレーターが保持。同一 phase で 2 回起動しない (rollback 時は
  flag をリセットしてから再挿入)。

Standalone Agent Fallback:
  spec-designer 等が standalone 起動された場合 (orchestrator 不在)、
  doc-reviewer auto-insertion は行われない。ユーザに warning を表示し、
  手動起動を案内する (例: `/doc-reviewer SPEC.md`)。
```

### 3.7 不整合検出時の rollback 統合

`.claude/orchestrator-rules.md` の既存 "Rollback Rules" に
"Doc Review FAIL Rollback" を新設する。

```
Doc Review FAIL Rollback Flow:

doc-reviewer (DOC_REVIEW_RESULT: fail)
  → triggering agent (spec-designer / architect / ux-designer /
                      scope-planner / analyst) に修正依頼
    → 該当 agent が修正
      → doc-reviewer (再チェック)

Rollback Limit: 既存ルールと同じく max 3 回。
                超過時はユーザに判断を仰ぐ (auto-approve mode 含む)。
```

修正依頼時に triggering agent へ渡す情報:

```
## Doc Review Rollback

### Rollback source
doc-reviewer

### Inconsistencies
{INCONSISTENCY_ITEMS リスト + 観点 + 根拠}

### Files to fix
{該当ファイルパス}

### Constraints
- 既存の他 UC / 他文書を壊さない
- 修正完了後、AGENT_RESULT を再出力すること
```

### 3.8 プラン別の挙動 (`sandbox-runner` と同じく triage に従う)

| Plan | doc-reviewer 動作 |
|------|-------------------|
| Discovery Minimal | scope-planner が走らないため doc-reviewer 起動なし |
| Discovery Light/Standard/Full | scope-planner 完了後に必ず起動 |
| Delivery Minimal | spec-designer / architect 後にのみ起動 (ux-designer は走らない) |
| Delivery Light/Standard/Full | 該当する全フックで起動 |
| Maintenance Patch | analyst の DOCS_UPDATED に SPEC.md 差分があるときのみ起動 |
| Maintenance Minor/Major | analyst 完了後に必ず起動 |
| Operations Flow | **起動なし** (operations-flow はマークダウン成果物を生成・更新しないため) |

### 3.9 Output Language との整合

`doc-reviewer` 自身も `.claude/rules/project-rules.md` を読み、
`Output Language` に従って findings 文を生成する (narrative 部分のみ)。
レポートのテンプレート skeleton (`## Doc Review Report` 等の見出し) は
英語固定 — `.claude/rules/language-rules.md` の "Template skeleton strings"
ルールに従う。

ただし `doc-reviewer` は **template skeleton と narrative の混在チェック**
を **行わない**。これは Markdown lint 寄りの責務であり、別 agent
(将来検討) または `reviewer` の所掌に近い。これは §4 Q5 で詳述する。

---

## 4. Open questions

すべて Auto mode のため AskUserQuestion せず、ここに記録する。
`architect` または user とすり合わせる前提とする。

### Q1. 既存 `reviewer` のリネーム是非

**問題**: ユーザー要求では「reviewer はコード特化」と前提されているが、
`reviewer.md` 実体は "Review Perspectives" の #1 で SPEC.md 準拠
チェックを既に持っている。`doc-reviewer` 新設後に `reviewer` を
`code-reviewer` にリネームすべきか？

**仮の方針**: **リネームしない**。理由:
1. 両者は **対象方向が直交** (reviewer = 垂直 / doc-reviewer = 水平)
2. 既存 `reviewer.md` の "Spec Compliance" 観点は実コード ↔ SPEC.md の
   照合であり、本来の "code review" の枠内
3. リネームは破壊的変更 (オーケストレーター・slash command・既存ドキュメント
   への影響大)
4. 将来 `code-reviewer` という別 agent が必要になった場合のみリネーム検討

ただし `reviewer.md` の Mission に「`doc-reviewer` との境界」を 1 段落
追記することは推奨 (compliance-auditor #56 と同じ追記スタイル)。

### Q2. design-notes の対象粒度

**問題**: ユーザー要求では `docs/design-notes/<slug>.md` を対象に
含めるとあるが、design-notes は draft / planning / archived の
ライフサイクルがあり、すべての段階で SPEC.md 整合を要求するのは過剰。

**仮の方針**: 以下の段階のみ対象:
- analyst が `docs/design-notes/<slug>.md` を作成した直後 (= maintenance-flow
  Phase {analyst} 後)
- header に `> Next: developer` または `> Next: architect` が記載された
  「ready-for-handoff」状態のもの

draft 状態 (`> Next: TBD` 等) や archived 配下 (`docs/design-notes/archived/`)
は対象外。

### Q3. rollback max 3 回の根拠

**問題**: ユーザー要求でも「max 3 回」とあるが、これは既存
`.claude/orchestrator-rules.md` の "Rollback Rules" の上限と同じ。

**仮の方針**: **既存ルールに統合**する (新しい上限を作らず、
既存 "Rollback Limit" を流用)。具体的には orchestrator-rules.md の
既存 Rollback Limit セクションを「test failure / review CRITICAL /
**doc review FAIL** の 3 種類に共通の上限」として書き換える。
これにより上限管理が 1 箇所に集約される。

### Q4. discovery-flow での発火点

**問題**: scope-planner 完了後の終端チェックだけで十分か、
researcher / poc-engineer 完了後も走らせるべきか。

**仮の方針**: **scope-planner 完了後のみ** (Phase 1 として)。理由:
1. researcher / poc-engineer は単独文書を生成するだけで「整合性チェック
   対象が複数存在する」状況にならない
2. Standard / Full プランで researcher が interviewer の見落としを
   発見するケースは存在するが、それは researcher 内部のロジックで処理
   される設計 (POC_RESULT.md → INTERVIEW_RESULT.md 更新の rollback flow が
   既存)
3. 過剰な doc-reviewer 起動はユーザ体験を損なう (approval gate 数が
   増える)

将来 Phase 2 として「researcher → doc-reviewer (researcher 結果 ↔
INTERVIEW_RESULT.md の整合)」を追加検討の余地はあるが、本 issue では
対象外。

### Q5. Markdown lint 寄りチェックの扱い

**問題**: 表記ゆれ・Markdown 構文エラー・template skeleton と narrative の
混在 (language-rules.md 違反) のチェックを doc-reviewer に含めるか。

**仮の方針**: **含めない**。理由:
1. これらは **整合性** ではなく **個別文書の品質** 問題
2. Markdown lint は CI で `markdownlint` 等を回せば十分
3. doc-reviewer のスコープを肥大化させると AGENT_RESULT が読みにくくなる

ただし AGENT_RESULT の `ADVISORY_COUNT` (🟡 ADVISORY) として
「明らかに重大な lint 違反」を 1〜2 件レベルで指摘するのは許容範囲とする。

### Q6. Minimal plan での扱い

**問題**: `sandbox-runner` は Minimal で advisory のみ。`doc-reviewer` も
同様にすべきか、それとも全プラン mandatory か。

**仮の方針**: **全プラン mandatory** (`sandbox-runner` と異なる)。理由:
1. doc-reviewer は破壊的操作を伴わない pure read-only エージェントで、
   Minimal でも実行コストが低い
2. ドキュメント整合性は規模に関係なく重要 (むしろ Minimal の小規模
   プロジェクトで「コードと SPEC が乖離する」事故の方が多い)
3. Discovery Minimal は scope-planner が走らないので結果として doc-reviewer
   も走らないが、これは triage 構造由来であり「Minimal で skip」とは異なる

ただし「security-auditor は全プラン必須」と同じ強制レベルにすると
ユーザが嫌がる可能性もあるため、§4 Q6a として「ユーザ判断で
doc-reviewer を triage で skip 可能にすべきか」を残す。

#### Q6a. doc-reviewer skip オプション

**仮の方針**: **skip オプションを設けない**。security-auditor 同様、
構造的に必須とする。ただし FAIL 時の rollback 処理で「ユーザ判断で
INCONSISTENCY を承知の上で続行」を許可するオプションは持つ
(approval gate での "Approve despite findings" 選択肢)。

### Q7. doc-reviewer の `Tools:` フィールド

**問題**: `Read / Glob / Grep` のみで十分か、`Bash` も必要か。

**仮の方針**: **`Read, Glob, Grep` のみ**。理由:
1. doc-reviewer は read-only でファイルを書かない
2. 実在チェック (ファイルパスや agent 名) は `Glob` で十分
3. `Bash` を持たせると sandbox-policy / commit 権限の議論が発生し
   設計が複雑化
4. `reviewer` は `Bash` を持つが、それは静的解析ツール (ruff / eslint)
   実行のため。doc-reviewer にはそれが不要

将来 `markdownlint` を実行する選択肢が出た場合のみ `Bash` 追加検討。

### Q8. オーケストレーター呼び出し方式の妥当性検証

**問題**: ユーザー要求の「オーケストレーター呼び出し方式」は明確だが、
sandbox-runner と異なり doc-reviewer は **「caller agent からの delegation」
ではなく「caller agent の出力を後検査する」** 性格を持つ。これを
sandbox-runner の挿入規約と同じ枠で表現できるか。

**仮の方針**: 表現可能。`Sandbox Runner Auto-insertion` セクションは
"orchestrator が agent 起動の **前** に挿入する" のに対し、
`Doc Reviewer Auto-insertion` は "orchestrator が agent 起動の **後** に
挿入する" だけの違い。`Trigger Conditions` / `Double-Execution Prevention`
/ `Standalone Agent Fallback` の 3 要素構造は流用可能。
これは §3.6 で既に表現済み。

---

## 5. Document changes

### 5.1 新規ファイル

| パス | 内容 | 担当 |
|------|------|------|
| `.claude/agents/doc-reviewer.md` | 新 agent definition (本 design-note §3 をベース) | architect 設計 → developer 実装 |

### 5.2 編集ファイル

#### `.claude/orchestrator-rules.md`

- 新規セクション "Doc Reviewer Auto-insertion" を
  "Sandbox Runner Auto-insertion" と並列で追加
- 既存 "Rollback Rules" → "Rollback Limit" を「test failure / review
  CRITICAL / **doc review FAIL** の 3 種共通の上限」として書き換え
- "Triage System" 各 flow のフェーズ列に doc-reviewer の挿入位置を脚注として追記
  (実フェーズ番号は変更せず、auto-insert 旨を明記)

#### `.claude/agents/delivery-flow.md`

- "Managed Flows" の Standard Plan 例の Phase 1 / Phase 2 / Phase 3 後に
  "→ doc-reviewer (auto)" を追記 (フェーズ番号は据え置き、auto-insert 旨)
- "Rollback Rules" に "Rollback Flow on Doc Review FAIL" を追加:
  ```
  doc-reviewer (FAIL) → spec-designer / architect / ux-designer (修正)
                      → doc-reviewer (再チェック)
  ```
- "Side Entry: analyst" には doc-reviewer の追加挿入は不要 (analyst 自身は
  delivery-flow ではなく maintenance-flow / standalone から起動されるため)

#### `.claude/agents/discovery-flow.md`

- "Managed Flows" の各プラン例の最終 Phase (scope-planner) 後に
  "→ doc-reviewer (auto)" を追記
- Minimal プランは scope-planner が走らないので doc-reviewer も走らない
  旨を明記
- "Rollback Rules" に "Pattern 3: doc-reviewer FAIL → scope-planner" を追加

#### `.claude/agents/maintenance-flow.md`

- "Managed Flows" の Patch / Minor / Major 各プラン例の analyst 後に
  "→ doc-reviewer (条件付き auto)" を追記
- 条件: PLAN=Patch かつ analyst の DOCS_UPDATED に SPEC.md 差分なしなら skip
- "Rollback Rules" テーブルに "doc-reviewer FAIL | analyst | All plans" を追加

#### `.claude/agents/reviewer.md`

- Mission セクションに以下を追記 (compliance-auditor #56 と同じスタイル):
  ```markdown
  > **Boundary with `doc-reviewer`:** This agent reviews implementation
  > code against SPEC.md / ARCHITECTURE.md (vertical consistency).
  > Cross-document consistency among markdown artifacts (SPEC.md ↔
  > ARCHITECTURE.md ↔ UI_SPEC.md ↔ design-notes) is owned by
  > `doc-reviewer`, which is auto-inserted by flow orchestrators after
  > spec/design/scope agents.
  ```

#### `.claude/rules/aphelion-overview.md`

- "Agent Directory" セクションに doc-reviewer を追記
- "Domain and Flow Overview" の図に doc-reviewer の cross-cutting 性質を補足
- 更新履歴を追加

#### `.claude/rules/library-and-security-policy.md`

- 編集不要 (本 agent はセキュリティ責務に直接関与しない)

### 5.3 影響を受けない箇所

- `developer` / `tester` / `security-auditor` / `compliance-auditor` の
  既存役割は変更しない
- `interviewer` / `researcher` / `poc-engineer` / `concept-validator` /
  `rules-designer` / `change-classifier` / `impact-analyzer` の既存
  output 契約は変更しない (doc-reviewer はこれらを read-only で読むだけ)
- 既存 `SPEC.md` / `ARCHITECTURE.md` / `UI_SPEC.md` を持つプロジェクトに
  対する後方互換性あり (doc-reviewer は read-only で破壊しない)

---

## 6. Acceptance criteria

### 6.1 必須 (本 issue 完了条件)

- [ ] `.claude/agents/doc-reviewer.md` が存在し、以下を含む
  - YAML front matter (name, description, tools=`Read, Glob, Grep`, model)
  - "Project-Specific Behavior" ブロック (project-rules.md 読み込み)
  - Mission セクションで `reviewer` との境界を明示
  - 入力ファイル一覧 (SPEC.md / ARCHITECTURE.md / UI_SPEC.md /
    docs/design-notes/ / DISCOVERY_RESULT.md)
  - 5 観点 (coverage / naming / scope / version / acceptance) のチェック手順
  - 出力フォーマット (§3.4 のテキストレポート)
  - AGENT_RESULT 契約 (§3.5)
  - "Standalone invocation" セクション (orchestrator 不在時の挙動)
- [ ] `.claude/orchestrator-rules.md` に "Doc Reviewer Auto-insertion"
  セクションが追加されている
- [ ] `.claude/orchestrator-rules.md` の "Rollback Rules" が doc-reviewer
  FAIL を含む形に更新されている
- [ ] `.claude/agents/delivery-flow.md` の Managed Flows と Rollback Rules に
  doc-reviewer の挿入位置と rollback flow が記載されている
- [ ] `.claude/agents/discovery-flow.md` の Managed Flows と Rollback Rules に
  doc-reviewer の挿入位置と rollback flow が記載されている
- [ ] `.claude/agents/maintenance-flow.md` の Managed Flows と Rollback
  Rules table に doc-reviewer の挿入位置と rollback flow が記載されている
- [ ] `.claude/agents/reviewer.md` の Mission に境界記述が追記されている
- [ ] `.claude/rules/aphelion-overview.md` の Agent Directory に doc-reviewer
  が追記されている

### 6.2 推奨 (本 issue で達成できれば望ましい)

- [ ] サンプル "Doc Review Report" を `docs/examples/doc-review-sample.md`
  として 1 件配置 (架空の SPEC.md / ARCHITECTURE.md 不整合シナリオ)
- [ ] `/doc-reviewer` slash command を `.claude/commands/` に追加し、
  standalone 起動を案内できるようにする
- [ ] 既存の design-notes (`compliance-auditor.md` / `doc-flow.md` /
  `performance-optimizer.md`) を doc-reviewer のテストケースとして
  手動実行し、現状の不整合を 1 件以上検出できることを確認

### 6.3 Phase 1 では不要 (将来検討)

- researcher / poc-engineer 完了後の doc-reviewer 挿入 (§4 Q4)
- Markdown lint 統合 (§4 Q5)
- doc-reviewer 自身の AGENT_RESULT を別 agent が消費する用途
- multilingual な findings 出力 (project-rules.md の Output Language に
  従うのみ)

---

## 7. Out of scope

明示的にスコープ外とするもの。

1. **コードレビュー**
   `reviewer` の所掌。doc-reviewer は **マークダウン成果物のみ** を
   対象とする。

2. **README.md / CHANGELOG.md / wiki / commit message**
   ユーザー要求で明示的に対象外。これらは別経路 (CI workflow
   `check-readme-wiki-sync`) で担保。

3. **Markdown 構文エラー検出**
   別ツール (`markdownlint`) の所掌。§4 Q5 参照。

4. **自動修正 (auto-remediation)**
   doc-reviewer は指摘のみ。修正は triggering agent への rollback で行う。

5. **エージェント定義ファイル (`.claude/agents/*.md`) 自体の整合チェック**
   メタレベルの自己参照。本 issue では対象外
   (将来 `aphelion-self-check` のような別 agent 検討の余地あり)。

6. **Operations Flow への統合**
   operations-flow はマークダウン成果物を生成しないため、
   doc-reviewer の挿入位置がない。Operations Flow へのフックは将来
   `OPS_PLAN.md` 等を書く agent が登場した時点で再検討。

7. **観点ごとの重み付け / スコアリング**
   PASS/FAIL の二値判定のみ。「軽微な不整合 1 件は FAIL にしない」
   のような閾値設定は導入しない (recall を優先)。

---

## 8. Handoff brief for architect

### 8.1 architect への必須申し送り

1. **§3.1 役割境界表を最優先で確認** — `reviewer` との対称性が
   破綻していないか、新規視点で再評価する
2. **§3.2 起動位置の 5 フック** — Discovery / Delivery / Maintenance の
   どのフェーズに挿入するか、orchestrator の Phase 番号と整合させる
   (Phase 番号は既存のまま「auto-insert」として表現する方針)
3. **§3.6 Doc Reviewer Auto-insertion セクションのテキスト** —
   `Sandbox Runner Auto-insertion` のテンプレートを流用するが、
   "agent 起動の **後** に挿入" という方向の違いを明示する
4. **§3.7 Doc Review FAIL Rollback** — 既存の "Rollback Rules" に
   どう統合するか (新セクションとして追加する vs 既存 flow ごとに分散)
5. **§4 Open Questions の Q1, Q3, Q6 を最優先で議論** —
   - Q1 (reviewer リネーム否) は最終決定が必要
   - Q3 (rollback 上限の統合) は orchestrator-rules.md 編集方針に直結
   - Q6 (Minimal で mandatory にするか) はユーザ体験に直結

### 8.2 architect から developer への引継ぎで注意してほしい点

- `.claude/agents/doc-reviewer.md` の **YAML front matter** は
  `reviewer.md` と `sandbox-runner.md` のハイブリッドが望ましい:
  ```yaml
  name: doc-reviewer
  description: |
    Cross-cutting agent that reviews consistency among markdown artifacts
    (SPEC.md / ARCHITECTURE.md / UI_SPEC.md / docs/design-notes/).
    Auto-inserted by flow orchestrators after spec / design / scope agents.
  tools: Read, Glob, Grep
  model: sonnet  # opus は overkill, sonnet で十分なレビュー粒度
  ```
- agent 本体の長さは `reviewer.md` (~200 行) と同等を目安に。
  `sandbox-runner.md` (~210 行) より短くなる想定 (Bash がない分シンプル)
- "Standalone invocation" セクションは必須 (compliance-auditor の
  `COMPLIANCE_REQUIRED: true` のような前提条件は不要だが、
  「orchestrator 不在時はユーザに状況を確認してから走らせる」フローを記述)

### 8.3 PR 分割方針 (推奨)

architect が判断する前提だが、参考として:

| PR | 内容 | 依存関係 |
|----|------|---------|
| **PR 1 (本 issue で着手)** | `.claude/agents/doc-reviewer.md` agent definition + `.claude/orchestrator-rules.md` 編集 (Doc Reviewer Auto-insertion セクション + Rollback Rules 統合) + `reviewer.md` 境界記述追加 | なし |
| **PR 2 (本 issue で着手 or 別 issue)** | 各 flow agent (`delivery-flow.md` / `discovery-flow.md` / `maintenance-flow.md`) への挿入位置追記 + `aphelion-overview.md` Agent Directory 更新 | PR 1 |
| **PR 3 (別 issue)** | サンプル `docs/examples/doc-review-sample.md` + `/doc-reviewer` slash command | PR 1, PR 2 |

PR 1 と PR 2 を 1 PR にまとめるか分割するかは architect/developer の判断。
ファイル数 (PR 1 = 3 ファイル / PR 2 = 4 ファイル) を見て決める。

### 8.4 リスクと留意点

- **リスク 1: orchestrator-rules.md の Rollback Limit 統合で
  既存 flow の挙動を破壊する**
  → 既存 "test failure" / "review CRITICAL" の rollback 上限は変更しない。
  「上限値の出処を 1 箇所にまとめる」だけのリファクタとして扱う。
- **リスク 2: doc-reviewer FAIL が頻発し、ユーザがフローを進められない**
  → §6.2 の「approval gate で "Approve despite findings" 選択肢」を必須化。
  ただし「強制承認した結果は AGENT_RESULT に明示」する設計。
- **リスク 3: Aphelion 自身のリポジトリ (本リポジトリ) で doc-reviewer を
  走らせると、`.claude/agents/*.md` 自体が SPEC.md を持たないため
  「対象がない」となる**
  → §7 の Out of scope #5 と同じ理由で本 issue では対象外。
  本リポジトリでの doc-reviewer 動作は、テスト用に他リポジトリを用意して
  検証する。
