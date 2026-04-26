# feat: add performance-optimizer agent to maintenance-flow

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#58](https://github.com/kirin0198/aphelion-agents/issues/58)
> Linked Plan: docs/design-notes/performance-optimizer.md

---

## 1. Background & Motivation

### 1.1 ユーザの動機（memo 原文）

> パフォーマンス最適化のエージェント追加。maintenance-flow に追加想定。

### 1.2 なぜ専用エージェントが必要か

現在の `maintenance-flow` は `change-classifier` で 5 つの trigger type
(`bug` / `feature` / `tech_debt` / `performance` / `security`) をトリアージしている。
このうち `performance` カテゴリは triage 段階では識別されるものの、
**triage 後の処理は他カテゴリと共通の analyst → developer ラインに合流する**
ため、以下のパフォーマンス特有のループが設計上 missing になっている。

1. **計測（プロファイリング）** — どこが遅いのか、データで裏取りする
2. **ボトルネック特定** — 計測結果から原因モジュール／クエリ／関数を絞り込む
3. **改善案評価** — アルゴリズム変更／キャッシュ／非同期化など複数案の費用対効果を比較
4. **計測再実行（before/after 比較）** — 改善が retrograde regression を生まないか検証

これは bug fix の「再現 → 原因特定 → 修正 → 回帰テスト」とは異なるループで、
特に **(a) before/after の数値比較** と **(c) 改善案の trade-off 分析** が
analyst の責務範囲を超える。専門エージェントとして切り出すのが妥当。

### 1.3 既存 agent では不足する理由

| 既存 agent | パフォーマンス案件で不足する点 |
|------------|------------------------|
| `analyst` | 計測データの解釈・ボトルネック特定の専門知識を持たない |
| `impact-analyzer` | 「どのファイルが影響するか」は出すが、「どこがどれだけ遅いか」の数値推定は出さない |
| `observability` | パフォーマンス baseline を **設計** する責務はあるが、**既存実装の実測・改善** は範囲外（しかも Operations Flow / Full plan 専用で Maintenance Flow から起動されない） |
| `developer` | 改善実装は可能だが、計測・原因特定の前段が欠けている |

---

## 2. Current state

### 2.1 maintenance-flow における performance 案件の現在の経路

`.claude/agents/maintenance-flow.md` を読むと、`performance` trigger は
以下のいずれかの plan に流される。

- **Patch plan** (1–3 files, no breaking change):
  `change-classifier → analyst → developer → tester`
- **Minor plan** (4–10 files, no breaking change):
  `change-classifier → impact-analyzer → analyst → architect (differential) → developer → tester → reviewer`
- **Major plan** (DB schema change, 11+ files など):
  `change-classifier → impact-analyzer → analyst → security-auditor → handoff to delivery-flow`

つまり **`performance` 専用の分岐は無く、bug fix と同じ analyst ラインに合流する**。

### 2.2 `change-classifier` の `performance` カテゴリ対応状況

`change-classifier.md` Step 1 の Trigger Type Identification 表に既に
`performance` カテゴリが定義されている（行 62）。

```
| performance | Performance improvement | Query optimization, memory leak fixes, latency reduction |
```

→ trigger type の **判定**は既に対応済み。
→ ただし trigger type 判定後に **performance 専用の next agent 分岐は存在しない**。

### 2.3 `impact-analyzer` の performance impact 出力状況

`impact-analyzer.md` の AGENT_RESULT には以下が出力される（行 187–203）。

- `TARGET_FILES`, `DEPENDENCY_FILES`, `BREAKING_API_CHANGES`,
  `DB_SCHEMA_CHANGES`, `REGRESSION_RISK`, `RECOMMENDED_TEST_SCOPE`

→ **performance impact（before/after 推定）は出力していない**。
fan-in の高さで regression risk は評価するが、改善前後の latency / CPU / memory
の予測値は範囲外。

### 2.4 `observability` の performance baseline 機能

`observability.md` には `5. Performance Baseline` セクションがあり、
P50/P95/P99 baseline テーブルを `OBSERVABILITY.md` に記録する設計はある（行 126–131）。

ただし以下の制約がある：

- **Operations Flow / Full plan 専用** で、maintenance-flow からは起動されない
- 設計時の baseline 定義のみで、**実測値の取り込み・解析の責務は無い**
- パフォーマンス改善の合否判定（before/after 比較）は提供しない

### 2.5 ギャップまとめ

| 必要な機能 | 既存対応 | ギャップ |
|------------|---------|---------|
| trigger を `performance` と判定 | `change-classifier` にあり | なし |
| performance 専用 plan 分岐 | なし | **要新設** |
| 計測データ（profile / slow query log）の解釈 | なし | **要新設** |
| ボトルネック特定 | なし | **要新設** |
| 改善案の trade-off 評価 | なし | **要新設** |
| before/after 期待効果の数値推定 | なし | **要新設** |
| baseline 値の管理 | `observability` が一部 | **連携必要** |

---

## 3. Proposed approach

### 3.1 新エージェント: `performance-optimizer`

**役割:** パフォーマンス改善案件において、計測 → ボトルネック特定 →
改善案評価 → 期待効果推定までを担当し、`developer` に実装を委譲する
**設計エージェント**（実装まで完結はしない）。

**雛形:** `change-classifier.md` の構造（Mission → Procedure → Approval Gate → AGENT_RESULT）を踏襲する。

### 3.2 起動位置

`maintenance-flow` 内、`change-classifier` で `TRIGGER_TYPE: performance`
と分類されたとき、`analyst` の手前に挿入する。

#### Patch plan（performance 用に拡張）

```
Phase 1: change-classifier  (TRIGGER_TYPE=performance)        → ⏸ User approval
Phase 2: performance-optimizer (perf 計測 / ボトルネック特定)  → ⏸ User approval   [NEW]
Phase 3: analyst               (issue / 改善方針確定)          → ⏸ User approval
Phase 4: developer             (改善実装)                      → ⏸ User approval
Phase 5: tester                (ベンチマーク再走行)            → ⏸ User approval
[Final flow completion confirmation]                            ⏸ User approval
```

#### Minor plan（performance 用に拡張）

```
Phase 1: change-classifier                                   → ⏸ User approval
Phase 2: impact-analyzer                                     → ⏸ User approval
Phase 3: performance-optimizer                               → ⏸ User approval   [NEW]
Phase 4: analyst                                             → ⏸ User approval
Phase 5: architect (differential)                            → ⏸ User approval
Phase 6: developer                                           → ⏸ User approval
Phase 7: tester (ベンチマーク再走行を含む)                    → ⏸ User approval
Phase 8: reviewer                                            → ⏸ User approval
```

#### Major plan

`performance-optimizer` は `impact-analyzer` の後、`analyst` の前に挿入。
delivery-flow に handoff される `MAINTENANCE_RESULT.md` に `PERF_REPORT.md` の参照を加える。

### 3.3 既存 agent との関係

| 既存 agent | `performance-optimizer` との関係 |
|------------|--------------------------------|
| `change-classifier` | upstream。`TRIGGER_TYPE: performance` を判定し、`NEXT: performance-optimizer`（または impact-analyzer 経由）にフロー分岐 |
| `impact-analyzer` | upstream（Minor/Major のみ）。`TARGET_FILES` を入力として受け取る。**performance impact 推定セクションを新設して連携強化** |
| `observability` | sibling（Operations Flow）。`OBSERVABILITY.md` の Performance Baseline テーブルを **読み込み参照**する（baseline 値の出典として）。逆方向（Maintenance → Operations）への書き戻しは出さない |
| `analyst` | downstream。`PERF_REPORT.md` を読んで GitHub Issue 本文と SPEC.md update に反映 |
| `developer` | downstream。`PERF_REPORT.md` の改善案セクションを実装方針として受け取る |
| `tester` | downstream。`PERF_REPORT.md` の期待効果セクションを **検証 acceptance criteria** として使用しベンチマーク再走行 |

### 3.4 入出力仕様

#### 入力

- `change-classifier` AGENT_RESULT（`TRIGGER_TYPE: performance` 確認）
- `impact-analyzer` AGENT_RESULT（Minor/Major のみ — `TARGET_FILES`, `IMPACT_SUMMARY`）
- ユーザの trigger description（slow query log / latency alert / profile dump など、可能な限り data を含む）
- 既存ドキュメント:
  - `SPEC.md`（非機能要件 / NFR セクションを確認）
  - `ARCHITECTURE.md`（モジュール境界・依存関係）
  - `OBSERVABILITY.md`（存在すれば — 既存 baseline を参照）
- 任意で provided な計測データ（cProfile dump, py-spy svg, slow query log, APM export, k6 / wrk のベンチ結果など）

#### 出力ファイル: `PERF_REPORT.md`

トリアージ結果を構造化して保存する。
雛形の skeleton は §6 Acceptance criteria 内に記載する。

#### AGENT_RESULT

```
AGENT_RESULT: performance-optimizer
STATUS: success | error | blocked
TRIGGER_TYPE: performance
PERF_TIER: micro | structural | architectural
BOTTLENECKS:
  - location: {file:func or module:query}
    metric: {latency_ms | cpu_pct | mem_mb | qps}
    observed: {value}
    baseline: {value | unknown}
PROPOSED_FIXES:
  - id: FIX-1
    summary: {改善内容}
    expected_gain: {%, 絶対値, または qualitative}
    risk: {low | medium | high}
    implementation_tier: {Patch | Minor | Major}
PERF_REPORT: docs/PERF_REPORT.md
RECOMMENDED_NEXT: analyst
NEXT: analyst
```

`PERF_TIER` は triage 内訳：

| Tier | 該当例 | 推奨 plan |
|------|--------|-----------|
| `micro` | O(n²) → O(n log n) など局所修正 | Patch |
| `structural` | キャッシュ層追加、N+1 クエリ解消、非同期化 | Minor |
| `architectural` | アーキテクチャ変更（DB 分割、CQRS、shard 化） | Major（→ delivery-flow） |

これは `change-classifier.PLAN` の上書きではなく **補強** であり、
最終 plan は `change-classifier` の他次元（files, breaking, SPEC impact）と
合わせて maintenance-flow が決定する。

### 3.5 triage tier との関係（再掲・整理）

| `change-classifier.PLAN` | `performance-optimizer.PERF_TIER` 推奨 | 整合 |
|--------------------------|----------------------------------------|------|
| Patch | micro | ◎ |
| Patch | structural | △ — performance-optimizer が plan upgrade を推奨できる |
| Minor | structural | ◎ |
| Minor | architectural | △ — Major への upgrade を推奨 |
| Major | architectural | ◎（delivery-flow handoff） |

不整合を検出した場合、`performance-optimizer` は AGENT_RESULT に
`PLAN_UPGRADE_RECOMMENDED: true` フィールドと理由を含めて出力し、
maintenance-flow が再 triage する。

---

## 4. Open questions

1. **プロファイリング tool の実行主体**
   - 案 A: agent 自身が `Bash` で実行する（cProfile / pytest --profile / py-spy など）
   - 案 B: ユーザが事前に dump を提供する前提で、agent は解析のみ
   - 案 C: ハイブリッド — 簡単なケースは agent 実行、本番環境のプロファイルはユーザ提供
   - **暫定方針:** C を推奨。理由 = agent からの本番 DB 接続は sandbox-policy `prod_db` カテゴリに該当するため不可。dev 環境のマイクロベンチは agent 実行可、本番由来データはユーザ持参。

2. **言語/フレームワーク非依存性**
   - Python: cProfile, py-spy, scalene
   - Node.js: 0x, clinic.js, --prof
   - Go: pprof, runtime/trace
   - Rust: cargo flamegraph, perf
   - **暫定方針:** agent definition に「言語別プロファイラ早見表」を持ち、
     `ARCHITECTURE.md` の Tech Stack を読んで適切な tool を選択。
     未知言語の場合は AskUserQuestion で確認（standalone 起動時のみ）。

3. **ベンチマーク baseline の管理**
   - `OBSERVABILITY.md` の Performance Baseline テーブルが正本？
   - 専用の `PERF_BASELINE.md` を新設？
   - **暫定方針:** `OBSERVABILITY.md` 既存があればそれを正本に、無ければ
     `PERF_REPORT.md` 内に baseline セクションを置く（=新規ファイル増やさない）。
     後続 issue で `OBSERVABILITY.md` への back-port を検討。

4. **改善後のレグレッション防止（CI 組込）**
   - 改善後にベンチマークを CI で継続実行すべきか
   - **暫定方針:** out of scope（§7 参照）。`performance-optimizer` は report 生成までで、
     CI 組込は別 issue（`infra-builder` 拡張案件）。

5. **`PERF_REPORT.md` の保存先**
   - `docs/PERF_REPORT.md` か `docs/perf/PERF_REPORT_{date}.md` か
   - **暫定方針:** 単一ファイル `docs/PERF_REPORT.md` で履歴は git log に任せる。
     既存 maintenance ドキュメント（`MAINTENANCE_RESULT.md`）と命名規則を揃える。

6. **既存ドキュメント不在時の挙動**
   - `OBSERVABILITY.md` が無い、`SPEC.md` の NFR が空、などで baseline が取れない場合の振る舞い
   - **暫定方針:** baseline = unknown として report 出し、`OBSERVABILITY.md` 生成を
     後続タスクとして勧告（AGENT_RESULT に `BASELINE_MISSING: true` を含める）。

---

## 5. Document changes

### 5.1 新規ファイル

- `.claude/agents/performance-optimizer.md` — エージェント定義本体

### 5.2 編集ファイル

| ファイル | 変更内容 |
|---------|---------|
| `.claude/agents/maintenance-flow.md` | (a) Plan summary 表に performance-optimizer を含める旨を追記。(b) Patch / Minor / Major plan のフロー図に `Phase X: performance-optimizer` を条件付きで挿入（`TRIGGER_TYPE: performance` 時のみ）。(c) Information Passing 表に performance-optimizer 行を追加。(d) Rollback Rules に performance-optimizer 失敗時の挙動を追加（→ analyst にロールバック） |
| `.claude/agents/change-classifier.md` | NEXT 決定ルールに「`TRIGGER_TYPE: performance` かつ `PLAN: Patch` → `performance-optimizer`」を追加。Minor/Major は `impact-analyzer` 経由のままで OK |
| `.claude/agents/impact-analyzer.md` | AGENT_RESULT に optional フィールド `PERF_HOTSPOT_HINTS:` を追加（performance-optimizer への hint）。本格的な perf impact 推定は performance-optimizer に委譲する旨を明記 |
| `.claude/agents/observability.md` | "Cross-Flow Reference" セクションを新設し、`PERF_REPORT.md` の baseline 記述が `OBSERVABILITY.md` の Performance Baseline と一致することを推奨する旨を追記（読み取り側の責務として記載） |
| `.claude/rules/aphelion-overview.md` (user global) | Aphelion Workflow Model 内 Maintenance Flow の "3 new agents" 記述を "4 new agents"（change-classifier, impact-analyzer, performance-optimizer + 既存再利用）に更新。**user global file なので別 PR / 別 issue で扱うか要相談**（§4 OQ #6 とは別軸の運用課題） |

> **注意:** `aphelion-overview.md` はユーザ global rules に存在し
> `/home/ysato/git/aphelion-agents/.claude/rules/` には実体が無い
> （system-reminder 経由で内容確認済み）。
> このため本 issue 内では agent definition / maintenance-flow.md の更新に絞り、
> overview 文書側は別途同期する運用とする。

### 5.3 編集しないファイル

- `SPEC.md` — 本変更は Aphelion ワークフロー側のメタ変更で、対象プロジェクトの仕様に影響しない
- `ARCHITECTURE.md` — 同上
- `UI_SPEC.md` — UI 影響なし

---

## 6. Acceptance criteria

### 6.1 成果物存在確認

- [ ] `.claude/agents/performance-optimizer.md` が存在し、以下を含む
  - frontmatter (`name`, `description`, `tools`, `model`)
  - `## Project-Specific Behavior` セクション
  - `## Mission`
  - `## Input Requirements`
  - `## Analysis Procedure`（Step 1: 計測データ取り込み, Step 2: ボトルネック特定, Step 3: 改善案列挙, Step 4: trade-off 評価, Step 5: 期待効果推定）
  - `## User Approval Gate`
  - `## Required Output on Completion`（AGENT_RESULT block と PERF_REPORT.md skeleton）
  - `## Completion Conditions`

### 6.2 maintenance-flow への組込確認

- [ ] `.claude/agents/maintenance-flow.md` の Plan summary / フロー図 / Information Passing 表 に performance-optimizer が `TRIGGER_TYPE: performance` 条件付きで組み込まれている
- [ ] `change-classifier.md` の NEXT decision rules で performance trigger が performance-optimizer に分岐する記述がある
- [ ] フロー分岐は **`TRIGGER_TYPE: performance` のときのみ active** で、bug / feature / tech_debt / security では従来通り動作する

### 6.3 PERF_REPORT.md テンプレート

`performance-optimizer.md` 内に以下の skeleton が記載されていること：

```markdown
# Performance Report: {issue summary}

> Source: change-classifier AGENT_RESULT + impact-analyzer AGENT_RESULT + provided profile data
> Generated by: performance-optimizer
> Date: {YYYY-MM-DD}

## 1. Trigger
- Trigger type: performance
- Symptom: {observed degradation}
- Provided data: {profile dump path / slow query log path / "none"}

## 2. Baseline
| Metric | Value | Source |
|--------|-------|--------|
| P95 latency | {value} | {OBSERVABILITY.md / measured / unknown} |
| ... |

## 3. Bottlenecks
### B-1: {location}
- Metric: {latency_ms / cpu_pct / mem_mb / qps}
- Observed: {value}
- Evidence: {profile excerpt / log line / measurement command}

## 4. Proposed fixes
### FIX-1: {summary}
- Approach: {algorithmic / caching / async / batch / index / etc.}
- Expected gain: {%, abs value, or qualitative}
- Risk: {low | medium | high}
- Implementation tier: {Patch | Minor | Major}
- Trade-offs: {memory↑, code complexity↑, etc.}

## 5. Recommended fix
- Selected: FIX-{N}
- Rationale: {why this over the others}

## 6. Acceptance criteria for tester
- After implementation, P95 must be ≤ {threshold} ms (or {ratio} of baseline)
- No regression in {related metric}
- Benchmark command: {command to re-run}
```

### 6.4 整合性確認

- [ ] AGENT_RESULT の各フィールドが maintenance-flow の Information Passing 表に対応している
- [ ] `RECOMMENDED_NEXT` が Patch=analyst, Minor/Major=analyst（impact-analyzer は既に通過済み）と一致
- [ ] sandbox-policy / denial-categories / library-and-security-policy への参照行が含まれる

---

## 7. Out of scope

以下は本 issue の範囲外。別 issue で扱う。

1. **自動修正の実装** — `performance-optimizer` は report 生成までで、コード修正は `developer` に委譲する。設計エージェントとして implementation tool は持たない (`tools: Read, Write, Bash, Glob, Grep` 程度)
2. **インフラ層の最適化** — DB index 追加 / connection pool tuning / k8s pod 設定などは `db-ops` または Operations Flow の責務
3. **フロントエンド bundle size 最適化** — bundle analyzer 連携 / tree-shaking / code-splitting は別領域、別 issue
4. **CI への継続ベンチマーク組込** — regression 防止としての CI ベンチは `infra-builder` 拡張案件として別 issue
5. **APM / オブザーバビリティ SaaS 連携** — Datadog / New Relic / OpenTelemetry 等への統合は `observability` 領域
6. **`aphelion-overview.md`（user global rules）の更新** — user global ファイルの編集ポリシーが本 repo PR で完結しないため、別途同期 issue を立てる
7. **既存 maintenance-flow のパフォーマンス案件 retrofit** — 既存 PR / issue を遡って performance-optimizer 経由に書き換える作業は不要

---

## 8. Handoff brief for developer

### 8.1 推奨実装順

実装は **2 段階の PR に分割** することを推奨する。

#### Stage 1: agent definition のみ（本 issue で対応）

1. `.claude/agents/change-classifier.md` を雛形にして
   `.claude/agents/performance-optimizer.md` を作成
2. §6 Acceptance criteria の skeleton をすべて埋める
3. PERF_REPORT.md テンプレートを agent definition 内に記載
4. AGENT_RESULT block を確定させる
5. PR 作成 — このとき maintenance-flow への組込は **まだしない**
   （performance-optimizer は standalone 起動可能な状態にしておく）

#### Stage 2: maintenance-flow への組込（次の issue / PR）

1. `maintenance-flow.md` のフロー図に条件分岐を追加
2. `change-classifier.md` の NEXT decision rules を更新
3. `impact-analyzer.md` に `PERF_HOTSPOT_HINTS` フィールド追加
4. `observability.md` に Cross-Flow Reference セクション追記
5. 結合テストとして、performance trigger を投入したときに想定経路を辿ることを手動で確認

理由: Stage 1 の段階で agent 単体の品質を確認できる。
maintenance-flow の編集は他の進行中 issue (#54 / #56 等) と
コンフリクトしやすいため、scope を分けて小さく出す。

### 8.2 雛形にすべき既存 agent

最も近い構造を持つのは `change-classifier.md` と `impact-analyzer.md`。
- frontmatter / Project-Specific Behavior / sandbox-policy 参照の boilerplate は
  そのままコピペでよい
- Mission, Procedure, Approval Gate, AGENT_RESULT の 4 セクションを差し替え

### 8.3 sandbox-policy の留意点

`performance-optimizer` が `Bash` を使ってプロファイラを実行する場合、
`sandbox-policy.md` の以下カテゴリに該当する可能性がある：

- `external_net` (recommended) — `pip install py-spy` などインストール時
- `prod_db` (required) — 本番 DB に接続して slow query を取る場合（本 agent では **禁止**、ユーザに dump を提供してもらう）

agent definition には `sandbox-policy.md` への参照行を入れる。

### 8.4 言語別プロファイラ早見表（参考）

実装時に agent definition 内に表として埋め込むことを推奨：

| 言語 | プロファイラ | 起動例 |
|------|------------|--------|
| Python | cProfile / py-spy / scalene | `python -m cProfile -o out.prof script.py` |
| Node.js | --prof / 0x / clinic | `node --prof script.js` |
| Go | pprof | `go test -cpuprofile cpu.prof -bench .` |
| Rust | flamegraph / perf | `cargo flamegraph --bench mybench` |
| TypeScript (browser) | Chrome DevTools / web-vitals | manual via DevTools |

### 8.5 想定行数

`change-classifier.md` (約 235 行) と同等以上、約 250–300 行を見込む
（Procedure が 5 ステップ、PERF_REPORT.md skeleton 込み）。

---

> Implemented in: TBD
> Next: developer (Stage 1: agent definition file 作成)
