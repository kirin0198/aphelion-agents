> Last updated: 2026-06-30
> Update history:
>   - 2026-06-30: architect adds §9 implementation design — ADR-001 (mode casing = Case B),
>     three-tier Phase Execution Loop, escalation state machine, ESCALATION field design,
>     7-file TASK breakdown, risks (#161)
>   - 2026-06-14: analyst-core completes §5–8 detailed analysis
>   - 2026-06-14: analyst-intake creates §1–4 draft
> GitHub Issue: [#161](https://github.com/kirin0198/aphelion-agents/issues/161)
> Authored by: analyst-intake (2026-06-14)
> Next: developer

<!-- analyst-handoff
planning_doc_path: docs/design-notes/approval-mode-triage.md
slug: approval-mode-triage
branch_name: feat/approval-mode-triage
issue_url: https://github.com/kirin0198/aphelion-agents/issues/161
issue_number: 161
issue_title: feat: 承認モード（autonomous/interactive）のトリアージ連動とエスカレーション機構
issue_type: feature
intake_summary: |
  【背景・動機】
  grill-me 強化（#160）により上流（interviewer / analyst）で不確定要素を潰せるようになることを前提に、
  下流フロー（delivery-flow 等）の自走（autonomous）を可能にする承認モード機構を導入する。
  現状は全フェーズ境界で HITL 承認ゲートが挟まれており、規模やリスクにかかわらず一律 interactive
  のため、小規模タスクでも人間の承認待ちが多発している。

  【目標 / 受け入れ条件】
  - トリアージ（Minimal/Light/Standard/Full）に連動したデフォルト承認モードを各フローオーケストレーターに組み込む
  - Minimal/Light=autonomous、Standard=interactiveかつ明示指定でautonomous緩和可、Full=強制interactive
  - 全モード共通不変ルール: doc-reviewer / security-auditor / reviewer は autonomous でも必ず実行
  - エスカレーション機構: SPEC外判断・破壊的変更・CRITICAL検出・rollback上限・複数妥当方針で一時停止
  - AGENT_RESULT に ESCALATION_REQUIRED / ESCALATION_REASON フィールドを追加
  【スコープ】
  - .claude/agents/ 配下の全フローオーケストレーター（delivery-flow, discovery-flow, operations-flow, maintenance-flow, doc-flow）
  - .claude/rules/orchestrator-rules.md の承認ゲートルール更新
  - agent-communication-protocol.md の ESCALATION_REQUIRED/ESCALATION_REASON フィールド追加
proposals_source: docs/design-notes/proposals/approval-mode-memo.md
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# 承認モード（autonomous / interactive）のトリアージ連動とエスカレーション機構

## §1 背景・動機

grill-me 強化（#160）により Aphelion の上流エージェント（interviewer / analyst）で不確定要素を
上流で潰せるようになることを前提に、下流フロー（delivery-flow 等）の自走（autonomous）を可能にする。

現状、Aphelion の全フローオーケストレーターは全フェーズ境界で HITL 承認ゲートを通しており、
一律 interactive である。Minimal / Light スケールのような小規模タスクでも人間の承認待ちが多発し、
CI 的な自走ユースケースで障壁になっている。

承認ゲートを「緩める」際に、無制限に緩めると失敗コストが規模に応じて大きくなる問題がある。
そこでトリアージ（規模軸）と エスカレーション（リスク軸）の二層で安全網を構成する。

## §2 目標 / 受け入れ条件

1. **トリアージ連動デフォルト**：以下の対応表を全フローオーケストレーターが実装する

   | トリアージ | デフォルト承認モード | ユーザーによる緩和 |
   |------|------|------|
   | Minimal | autonomous | — |
   | Light | autonomous | — |
   | Standard | interactive | 可（明示指定で autonomous に緩和） |
   | Full | interactive | 不可（強制 interactive） |

2. **不変ルール**：autonomous モードでも doc-reviewer / security-auditor / reviewer は必ず実行する。
   緩和対象は「人間の HITL 承認ゲート」のみ。自動チェックは緩めない。

3. **エスカレーション機構**：以下の条件に該当した場合、autonomous モードでも一時停止し
   ユーザーへ確認する。
   - SPEC.md に記載のない技術判断が必要
   - 破壊的変更が必要（DB スキーマ・API 互換性）
   - security-auditor が CRITICAL を検出
   - rollback が上限（3回）に達した
   - 複数の妥当な実装方針があり SPEC.md の範囲で判断がつかない

4. **AGENT_RESULT 拡張**：`ESCALATION_REQUIRED: true/false` と `ESCALATION_REASON: <string>` を
   agent-communication-protocol.md のフィールドリファレンスに追加する。

## §3 スコープ

**影響ファイル:**
- `.claude/agents/delivery-flow.md` — 承認ゲートルールに autonomous/interactive 分岐を追加
- `.claude/agents/discovery-flow.md` — 同上
- `.claude/agents/operations-flow.md` — 同上
- `.claude/agents/maintenance-flow.md` — 同上
- `.claude/agents/doc-flow.md` — 同上
- `.claude/rules/orchestrator-rules.md` — 承認ゲート仕様にトリアージ連動モードを追記
- `.claude/rules/agent-communication-protocol.md` — ESCALATION_REQUIRED/ESCALATION_REASON フィールド追加

**スコープ外:**
- 個別エージェント（developer, architect 等）の動作変更: AGENT_RESULT への ESCALATION_REQUIRED フィールド追加のみ
- 新規エージェント追加なし
- triage 判定ロジック自体の変更なし（既存ロジックに承認モード決定を追加するのみ）

## §4 制約 / オープン課題

**前提依存:**
- この機能は #160（grill-me 強化）の完了を前提とする。Blocked by #160。
  grill-me 強化で上流の不確定要素を潰せることが autonomous 化の根拠であるため、
  #160 がマージされる前に本機能を有効化すべきではない。

**オープン課題:**
- `--autonomous` フラグの UX 設計: CLI オプションとして渡すか、プロジェクト設定ファイルで
  永続化するか検討が必要。
- autonomous → interactive への一時復帰後の「autonomous 復帰トリガー」の詳細設計
  （ユーザー確認完了をどのように検知するか）。
- AGENT_RESULT シンプル化（別提案）との整合: ESCALATION_REQUIRED フィールドの追加が
  シンプル化方針と矛盾しないか確認が必要。

---

## §5 詳細分析（analyst-core）

> Updated: 2026-06-14 (承認モードのトリアージ連動とエスカレーション機構)

本件は Aphelion 自身のワークフロー定義を変更する**メタ変更**である。対象プロダクトの
`SPEC.md` / `UI_SPEC.md` / `ARCHITECTURE.md` は存在せず（intake の `artifact_paths` は
すべて `missing`、これは正しい）、変更対象は規約ファイルとフローオーケストレーター定義。

### 5.1 二層安全網モデルの妥当性

提案メモ（`docs/design-notes/proposals/approval-mode-memo-archived.md`）の論理を踏襲する。

| 層 | 判定軸 | 役割 |
|----|--------|------|
| トリアージ | 規模 | デフォルト承認モードを決定（Minimal/Light=autonomous、Standard=interactive緩和可、Full=強制interactive） |
| エスカレーション | リスク | 規模に関係なく危険な判断を捕捉し一時停止 |

規模とリスクは比例しない（例: Minimal な設定変更が本番DB接続先だった）。トリアージだけ
では拾えないリスクをエスカレーションが補完する。両層の併用が妥当。

### 5.2 既存 `AUTO_APPROVE` モードとの重複（最重要論点 / intake 未指摘）

`.claude/orchestrator-rules.md` には既に `.aphelion-auto-approve` ファイルによる
`AUTO_APPROVE: true` モードが存在し、全承認ゲートを自動承認する（外部評価システム
Ouroboros 向け）。新規 `autonomous` モードはこれと機能が重なる。両者を整理しないと
二重定義になる。

**推奨する階層化:**

| モード | トリガー | HITL 承認ゲート | エスカレーション | 位置づけ |
|--------|----------|-----------------|------------------|----------|
| `interactive` | 既定 / Standard・Full | 通す | （該当時のみ停止） | 現状動作 |
| `autonomous` | Minimal/Light、または Standard で明示緩和 | スキップ | **該当時は停止しユーザー確認** | 新規・一般機構 |
| `AUTO_APPROVE` | `.aphelion-auto-approve` ファイル存在 | スキップ | **自動確認（停止しない）** | 既存・外部評価用の特殊上位ケース |

優先順位は `AUTO_APPROVE` > `APPROVAL_MODE(autonomous/interactive)`。`AUTO_APPROVE` は
エスカレーションすら自動確認する最上位、`autonomous` はエスカレーションで必ず止まる点が
本質的差異。Phase Execution Loop の分岐をこの優先順で記述する。

### 5.3 不変ルールと既存実装の整合

`doc-reviewer` / `security-auditor` / `reviewer` は既に Rollback Rules（自動 rollback）で
実行される。autonomous で「緩めない」とは、**HITL 承認ゲート（Approval Gate）のみをスキップ**
し、自動 rollback／自動レビューは維持する意。既存構造と矛盾しない。

### 5.4 エスカレーション機構

autonomous でも以下に該当したら一時停止しユーザー確認する。

- SPEC.md に記載のない技術判断が必要
- 破壊的変更が必要（DBスキーマ・API互換性）
- security-auditor が CRITICAL を検出
- rollback が共有上限（3回）に達した
- 複数の妥当な実装方針があり SPEC.md の範囲で判断がつかない

エージェントは AGENT_RESULT に `ESCALATION_REQUIRED: true/false` と
`ESCALATION_REASON: <string>` を載せ、オーケストレーターが検知して autonomous を
一時中断 → ユーザー確認 → autonomous 復帰。なお rollback 上限はエスカレーション条件と
重なるため、既存 Rollback Limit（共有3回）の流用で実装でき矛盾しない。

### 5.5 ファイルパスの実態（intake 想定とのずれ・要修正）

- `orchestrator-rules.md` → 実体は **`.claude/orchestrator-rules.md`**（`.claude/rules/` ではない）
- `agent-communication-protocol.md` → canonical source は **`src/.claude/rules/agent-communication-protocol.md`**
  （`rules/` のみ二重 auto-load 回避のため `src/.claude/` 配下へ再配置済み。`src/.claude/README.md` 参照）
- フローオーケストレーター 5本 → **`.claude/agents/{delivery,discovery,operations,maintenance,doc}-flow.md`**（git-tracked・実在）
- proposal source 名は intake の `approval-mode-memo.md` ではなく **`approval-mode-memo-archived.md`**（リネーム済み）

### 5.6 モード名 casing の不統一（ユーザー指摘 / 要解消）

現状、承認系モードの命名規約が混在している。

| 名前 | 規約 | 軸 | 出典 |
|------|------|----|------|
| `AUTO_APPROVE` | 大文字スネーク（boolean フラグ） | 特殊上位ケース軸 | `.claude/orchestrator-rules.md` L363 ほか |
| `autonomous` / `interactive` | 小文字（列挙値スタイル） | APPROVAL_MODE 軸（新規） | 本提案 §5.2 |

`AUTO_APPROVE` は `AUTO_APPROVE: true/false` という **boolean フラグ**として AGENT_RESULT /
Phase Execution Loop で参照され、`autonomous` / `interactive` は **列挙値**（取りうる状態の名前）
である。両者は厳密には「軸が異なる」ため、単純に同一規約へ寄せると意味論が崩れる懸念がある。
本フェーズでは casing を独断で確定せず、論点と候補方針を整理して architect に最終決定を委ねる。

**候補方針（architect が最終決定）:**

| 案 | 内容 | 長所 | 短所 / 後方互換影響 |
|----|------|------|---------------------|
| A: 全て大文字スネークに統一 | `AUTO_APPROVE` / `AUTONOMOUS` / `INTERACTIVE` を対等な「モード」として扱い、`APPROVAL_MODE: AUTONOMOUS\|INTERACTIVE` のように値も大文字化 | 規約が一目で統一。AGENT_RESULT のキー/値が全て英大文字（既存 STATUS 値は小文字なので逆に不整合化のリスクあり要確認） | 既存 STATUS 値（`success` 等）は小文字。大文字寄せは AGENT_RESULT 全体の規約と衝突しうる |
| B（推奨候補）: 軸を分離。`APPROVAL_MODE` の**値**は小文字 `autonomous`/`interactive`、`AUTO_APPROVE` は別軸の boolean フラグとして温存 | 既存 STATUS 値（小文字）との一貫性を保てる。`AUTO_APPROVE`(キー=大文字スネーク) と `APPROVAL_MODE`(キー=大文字スネーク、値=小文字) で「キーは大文字スネーク／値は小文字」という既存 AGENT_RESULT 規約に合致 | `AUTO_APPROVE` と `APPROVAL_MODE` が別軸で併存するため、両者の優先順位（§5.2）の明文化が必須 |
| C: `AUTO_APPROVE` を `APPROVAL_MODE: auto` の一値に統合 | モード軸を一本化（auto / autonomous / interactive の3値） | 概念が単一軸に集約され分かりやすい | `.aphelion-auto-approve` ファイルとの対応が崩れる。既存外部評価（Ouroboros）の参照箇所すべての改修が必要で破壊的 |

**後方互換上の論点（必ず検討）:**
- 既存ファイル名 `.aphelion-auto-approve`（および legacy `.telescope-auto-approve`）は
  `AUTO_APPROVE` モードのトリガー。命名統一で `AUTO_APPROVE` のキー名を変える場合、
  **ファイル名は変えない**（ファイル名変更は外部評価システムの破壊的変更）。キー名と
  ファイル名の対応注記を残すこと。
- `.claude/orchestrator-rules.md` 内の既存 `AUTO_APPROVE` 参照箇所（L363, L367, L428, L430,
  L432, L460, L461 等）と、`agent-communication-protocol.md` の Field Reference（`DECISION`
  値に `allowed`/`asked_and_allowed` 等を持つ既存記述）への波及を grep で洗い出してから改名する。
- 案 B を推奨候補とするのは、既存 AGENT_RESULT 規約（キー=大文字スネーク、STATUS 等の値=小文字）
  との整合と、後方互換破壊の最小化を両立するため。ただし最終決定権は architect にある。

## §6 アプローチ

architect への設計指針（本フェーズは計画のみ。実装は architect→developer 段）。

1. **`.claude/orchestrator-rules.md`** に新セクション「Approval Mode (autonomous / interactive)」を追加：
   トリアージ連動デフォルト表、モード決定ロジック、`AUTO_APPROVE` との優先順位（§5.2）、
   不変ルール（§5.3）、エスカレーション条件と中断/復帰フロー（§5.4）。
2. **`.claude/orchestrator-rules.md`** の Phase Execution Loop（現状 line 410-434 付近）を改訂：
   既存の `AUTO_APPROVE: true/false` 二分岐を
   `AUTO_APPROVE > APPROVAL_MODE(autonomous/interactive)` の三段判定へ拡張。
3. **`src/.claude/rules/agent-communication-protocol.md`** の Field Reference 表に
   `ESCALATION_REQUIRED`（true/false）と `ESCALATION_REASON`（freeform）を追加。
   「How to add a new canonical field」基準を満たす（複数エージェントが emit、
   オーケストレーターが routing 判断に使用）。
4. **`.claude/agents/{delivery,discovery,operations,maintenance,doc}-flow.md`** ×5 に、
   トリアージ判定直後の承認モード決定ステップと、AGENT_RESULT 受領時のエスカレーション
   検知ステップを追記。
5. **モード名 casing 統一（§5.6）**：architect が候補方針 A/B/C から確定。推奨候補は案 B
   （`APPROVAL_MODE` の値は小文字 `autonomous`/`interactive`、`AUTO_APPROVE` は別軸 boolean
   フラグとして温存、既存 AGENT_RESULT 規約「キー=大文字スネーク／値=小文字」に合致）。
   確定後、`.claude/orchestrator-rules.md` と `agent-communication-protocol.md` の該当箇所を
   一括改修。`.aphelion-auto-approve` ファイル名は不変（外部評価互換）。
6. オープン課題（`--autonomous` UX、autonomous 復帰トリガー、AGENT_RESULT シンプル化との
   整合）は architect 設計時に方針決定。

**確定済み事項（ユーザー承認 2026-06-14）:**
- 承認ゲート方針: 「承認して続行」。
- モード階層化: **三段階層化**（`AUTO_APPROVE` > `autonomous` > `interactive` の共存）で確定。
  §5.2 の優先順位を前提とし、architect は Phase Execution Loop の三段判定として実装設計する。

## §7 ドキュメント変更計画

| ドキュメント | 変更 |
|--------------|------|
| SPEC.md | 変更なし（本リポジトリに存在しないメタ変更のため対象外） |
| UI_SPEC.md | 変更なし（同上） |
| ARCHITECTURE.md | 変更なし（architect が必要なら更新） |
| `.claude/orchestrator-rules.md` | 新セクション追加 + Phase Execution Loop 改訂（architect→developer 段） |
| `src/.claude/rules/agent-communication-protocol.md` | Field Reference に 2 フィールド追加（同段） |
| `.claude/agents/*-flow.md` ×5 | 承認モード決定 + エスカレーション検知ステップ追記（同段） |
| モード名 casing 統一 | `.claude/orchestrator-rules.md` の `AUTO_APPROVE` 参照箇所 + `agent-communication-protocol.md` Field Reference を §5.6 確定方針で一括改修（同段）。`.aphelion-auto-approve` ファイル名は不変 |

> 本フェーズ（analyst-core）では上記実ファイルは編集せず、計画のみ記録する。

## §8 architect ハンドオフブリーフ

- **性質**: SPEC.md が存在しないメタ変更。architect は ARCHITECTURE.md ではなく
  「規約ファイル・オーケストレーター定義の設計判断」を担う。
- **ユーザー確定事項（2026-06-14）**: モード階層化は**三段階層化**
  （`AUTO_APPROVE` > `autonomous` > `interactive` 共存）で確定済み。承認ゲートは「承認して続行」。
- **最重要決定事項**:
  1. 既存 `AUTO_APPROVE` モードと新 `autonomous` モードの三段階層化（§5.2 の優先順位
     `AUTO_APPROVE > APPROVAL_MODE(autonomous/interactive)` を前提に Phase Execution Loop へ実装）。
  2. Phase Execution Loop の三段判定への拡張設計。
  3. エスカレーション中断 → ユーザー確認 → autonomous 復帰の状態遷移設計
     （復帰トリガーの検知方式を含む）。
  4. **【命名統一タスク — 必須】モード名 casing 不統一の解消（§5.6）**。現状
     `AUTO_APPROVE`（大文字スネーク・boolean フラグ）と `autonomous`/`interactive`
     （小文字・列挙値）の規約が混在。architect が候補方針 A/B/C から最終確定する：
     - 案 A: 全て大文字スネーク（`AUTONOMOUS`/`INTERACTIVE` + 値も大文字）。STATUS 値が小文字
       である既存規約と衝突する懸念あり。
     - **案 B（推奨候補）**: `APPROVAL_MODE` の値は小文字 `autonomous`/`interactive`、
       `AUTO_APPROVE` は別軸 boolean フラグとして温存。既存 AGENT_RESULT 規約
       「キー=大文字スネーク／値=小文字」に合致し後方互換破壊が最小。
     - 案 C: `AUTO_APPROVE` を `APPROVAL_MODE: auto` へ統合（単一軸化）。破壊的のため非推奨。
     - **後方互換論点**: `.aphelion-auto-approve`（および legacy `.telescope-auto-approve`）
       ファイル名は**不変**（外部評価 Ouroboros 互換）。キー名を変える場合もファイル名は維持し
       対応注記を残す。改名前に `.claude/orchestrator-rules.md` の `AUTO_APPROVE` 全参照箇所と
       `agent-communication-protocol.md` の波及を grep で洗い出すこと。
- **不変ルール**: autonomous でも doc-reviewer / security-auditor / reviewer は必ず実行。
  緩和対象は HITL 承認ゲートのみ。
- **新規フィールド**: `ESCALATION_REQUIRED` / `ESCALATION_REASON` を
  `src/.claude/rules/agent-communication-protocol.md` に追加。
- **前提依存**: Blocked by #160（grill-me 強化）。#160 マージ前に本機能を有効化しない。
  （注: #160 は 2026-06-30 時点で main にマージ済み。Blocked 解消。）
- **スコープ外**: 個別エージェントの動作変更（AGENT_RESULT への ESCALATION フィールド
  追加を除く）・新規エージェント追加・triage 判定ロジック自体の変更。

---

## §9 実装設計（architect）

> Source: 本 planning doc §1–8（2026-06-14, analyst-core 完成）
> Authored by: architect (2026-06-30)
> 性質: SPEC.md が存在しないメタ変更のため ARCHITECTURE.md は生成しない。本 §9 が
> developer 着手用の唯一の技術リファレンスである。

### 9.0 設計サマリー（developer 向け要点）

- casing は **案 B で確定**（ADR-001）。`AUTO_APPROVE` は改名しない。新規に
  `APPROVAL_MODE`（キー=大文字スネーク、値=小文字 `autonomous` / `interactive`）を導入する。
  → 結果として「一括改名」は発生しない。casing 作業の実体は「新規トークンを全 7 ファイルで
  小文字一貫で導入し、既存 `AUTO_APPROVE` が無傷であることを grep で検証する」こと。
- 承認判定は **三段優先順位** `AUTO_APPROVE > APPROVAL_MODE(autonomous/interactive)` で確定（ADR-002）。
- エスカレーションは **2 経路**（エージェント自己申告 / オーケストレーター検知）に整理（ADR-003）。
  復帰トリガーは「エスカレーションゲートでのユーザー応答そのもの」＝同期的・セッション内で完結（ADR-004）。
- Standard の autonomous 緩和指定方式は「起動時明示要求 + project-rules.md 永続化」で確定（ADR-005）。
- 個別エージェントの emit 指示追記は本 issue スコープ外。プロトコルの Field Reference 記述で
  emit ガイダンスを与え、未 emit リスクはフォローアップに切り出す（ADR-006）。

### 9.1 ADR（アーキテクチャ決定記録）

#### ADR-001: モード名 casing は案 B で確定

- **Context**: `AUTO_APPROVE`（大文字スネーク boolean フラグ）と新規 `autonomous`/`interactive`
  （小文字列挙値）の casing が混在し、ユーザーから統一要求があった（§5.6）。
- **Decision**: **案 B を採用**。
  - 新規キー `APPROVAL_MODE`（大文字スネーク）を導入し、値は小文字 `autonomous` / `interactive`。
  - 既存 `AUTO_APPROVE`（`true`/`false` の boolean フラグ）は**そのまま温存**し改名しない。
  - 既存 `.aphelion-auto-approve` / legacy `.telescope-auto-approve` ファイル名も**不変**。
- **Rationale**:
  - 既存 AGENT_RESULT 規約は「キー=大文字スネーク／値=小文字」（`STATUS: success`、
    `DECISION: allowed` 等、protocol §Field Reference 実態）。案 B はこの規約に厳密合致する。
  - `AUTO_APPROVE` と `APPROVAL_MODE` は **軸が異なる**（前者=外部評価用の最上位特殊フラグ、
    後者=規模連動の通常モード）。別キーとして併存させ §5.2 の優先順位を明文化すれば意味論が崩れない。
  - 改名ゼロのため後方互換破壊が最小。Ouroboros 外部評価の参照（`.aphelion-auto-approve`）は無傷。
- **Rejected alternatives**:
  - 案 A（全大文字化 `AUTONOMOUS`/`INTERACTIVE` + 値大文字）: 既存の小文字値規約（`success` 等）と
    衝突し、AGENT_RESULT 全体の不整合を新たに生む。却下。
  - 案 C（`AUTO_APPROVE` を `APPROVAL_MODE: auto` へ統合）: `.aphelion-auto-approve` ファイルとの
    対応が崩れ、Ouroboros 参照箇所すべての破壊的改修が必要。却下。

#### ADR-002: 承認判定は三段優先順位 `AUTO_APPROVE > APPROVAL_MODE`

- **Context**: 既存 Phase Execution Loop は `AUTO_APPROVE: true/false` の二分岐。三段階層化が
  ユーザー確定済み（§6 確定済み事項）。
- **Decision**: Phase Execution Loop の承認判定を次の優先順位で評価する。
  1. `AUTO_APPROVE == true` → 全ゲート（エスカレーション含む）を自動確認。最上位。
  2. `APPROVAL_MODE == autonomous` → HITL 承認ゲートをスキップ。ただし
     **エスカレーション該当時は必ず停止**。
  3. `APPROVAL_MODE == interactive` → 現行どおり承認ゲートで停止（既定）。
- **Rationale**: `AUTO_APPROVE` はエスカレーションすら自動確認する外部評価専用の最上位ケース、
  `autonomous` はエスカレーションで必ず止まる通常自走モード。この一点が両者の本質的差異であり、
  優先順位として明示することで二重定義を回避する（§5.2）。
- **Rejected alternatives**: `autonomous` を `AUTO_APPROVE` に吸収（= 案 C 相当）→ エスカレーション
  停止の有無という本質差を失う。却下。

#### ADR-003: エスカレーションは「自己申告」と「オーケストレーター検知」の 2 経路に整理

- **Context**: §2-3 のエスカレーション 5 条件のうち、一部はエージェントが自己判断する必要があるが、
  一部（security CRITICAL 検出・rollback 上限到達）は既にオーケストレーター側ロジックで検知済み。
- **Decision**: エスカレーションを次の 2 経路で実装する。
  - **経路 A（エージェント自己申告）**: developer / architect / security-auditor / tester / reviewer
    が AGENT_RESULT に `ESCALATION_REQUIRED: true` + `ESCALATION_REASON` を載せる。対象条件＝
    「SPEC 外の技術判断」「破壊的変更（DB スキーマ・API 互換性）」「複数妥当方針で SPEC 内判断不能」。
  - **経路 B（オーケストレーター検知）**: 「security-auditor CRITICAL 検出」「共有 rollback 上限
    (3 回) 到達」は既存の Rollback Rules / Rollback Limit ロジックで検知済み。autonomous モードでは
    これらが発火した時点でエスカレーションゲートへ遷移する（従来 interactive 専用だった
    「Approval Gate after Doc Review FAIL（rollback limit exceeded）」を autonomous でも発火させる）。
- **Rationale**: 既存ロジックの再利用で実装量を最小化し（§5.4 と一致）、二重カウントを避ける。
- **Rejected alternatives**: 全条件をエージェント自己申告に寄せる → security CRITICAL/rollback 上限を
  エージェントが知り得ず実装不能。却下。

#### ADR-004: autonomous 復帰トリガーは「エスカレーションゲートでのユーザー応答」（同期・セッション内完結）

- **Context**: オープン課題「autonomous 復帰トリガーの検知方式」（§4）。
- **Decision**: エスカレーション一時停止時、オーケストレーターは `AskUserQuestion`（エスカレーション
  ゲート）でユーザーに確認する。**この応答そのものが復帰トリガー**である。
  - 「承認して続行」選択 → `RUNNING_AUTONOMOUS` へ復帰し次フェーズへ進む。
  - 「修正を指示」選択 → 現フェーズエージェントを修正指示付きで再実行。再実行結果が
    `ESCALATION_REQUIRED: false` になれば autonomous 復帰。
  - 「中断」選択 → ワークフロー停止。
- **Rationale**: Aphelion のフローは Claude Code メインコンテキストで同期実行される。復帰は
  out-of-band シグナルでなく、既存 `AskUserQuestion` 機構で完結する。新規機構を追加しない。
- **Rejected alternatives**: ファイルやフラグによる非同期復帰検知 → セッション同期モデルに不要な
  複雑性を持ち込む。却下。

#### ADR-005: Standard の autonomous 緩和は「起動時明示要求 + project-rules.md 永続化」

- **Context**: オープン課題「`--autonomous` フラグの UX」（§4）。Claude Code には下流サブフローへ
  CLI フラグを流す配管が無い。
- **Decision**: `APPROVAL_MODE` の解決順を次に定める（フロー起動時に 1 回解決）。
  1. `AUTO_APPROVE == true` の場合、`APPROVAL_MODE` は判定に使わない（ログ用に記録のみ）。
  2. トリアージ規定値（Minimal/Light=autonomous、Standard=interactive、Full=interactive）。
  3. **Standard 限定の緩和**: (a) 起動プロンプトでユーザーが autonomous を明示要求、または
     (b) `project-rules.md` の新セクション `## Approval Mode` に `Standard: autonomous` 記載、の
     いずれかがあれば autonomous に緩和。**Full は緩和不可**（緩和要求があっても warning を出し
     interactive を維持）。
- **Rationale**: 既存 `.aphelion-auto-approve` がファイルベース永続なのと整合する形で、永続化は
  project-rules.md に寄せる。実 CLI フラグを発明しない。
- **Rejected alternatives**: 新規 `.aphelion-autonomous` センチネルファイル → ファイル種別が
  増え管理が煩雑。project-rules.md への集約を優先し却下。

#### ADR-006: 個別エージェントへの emit 指示追記は本 issue スコープ外（プロトコル記述で代替）

- **Context**: §3 スコープ外に「個別エージェントの動作変更（ESCALATION フィールド追加を除く）」とある。
  一方、経路 A のエージェントが実際にフィールドを emit するには各エージェント定義への追記が要る。
- **Decision**: 本 issue では **agent-communication-protocol.md の Field Reference に emit 主体と
  emit 条件を明記**することで emit ガイダンスを与える。各エージェント定義ファイルへの個別 emit
  トリガー追記は行わず、フォローアップ issue に切り出す。
- **Rationale**: §3 の 7 ファイルスコープを厳守し blast radius を最小化する。プロトコル駆動で
  「該当時に emit せよ」という規範は成立する。
- **Risk / Mitigation**: §9.5 リスク表に「未 emit リスク」として記載。実運用で under-emit が
  観測されたらフォローアップで developer/architect/security-auditor/tester/reviewer の各定義へ
  emit トリガーを追記する。

### 9.2 Phase Execution Loop 三段判定設計

既存 `.claude/orchestrator-rules.md` の `### Phase Execution Loop`（現 L410–434）の
**step 5–6** を以下へ置換する。step 1–4・7 は不変。

```
[Phase N]（step 1–4 は現行どおり：起動通知 / ARTIFACT_PATHS 伝搬 / AGENT_RESULT 検証 /
          STATUS 評価（error・blocked・failure は既存ハンドリング、failure は rollback rules））

  5. 承認判定を次の優先順位で評価する（三段判定）:

     (a) AUTO_APPROVE == true:
         → エスカレーション含め全ゲートを自動確認。"Approve and continue" を自動選択し
           テキスト出力のみ（AskUserQuestion はスキップ）。
           ※ AGENT_RESULT に ESCALATION_REQUIRED: true があってもログに記録して自動続行する
             （外部評価データとして ESCALATION_REASON を必ず出力）。

     (b) AUTO_APPROVE == false かつ APPROVAL_MODE == autonomous:
         → 直近 AGENT_RESULT の ESCALATION_REQUIRED と、オーケストレーター検知条件
           （security CRITICAL 未解決 / 共有 rollback 上限到達）を確認:
            - いずれか該当（経路 A or B）→ エスカレーションゲートで【停止】
              （§9.3 状態遷移へ）。自動続行しない。
            - 非該当 → HITL 承認ゲートをスキップ。フェーズ完了サマリーをテキスト出力し
              次フェーズへ進む。
         ※ 不変ルール: autonomous でも doc-reviewer / security-auditor / reviewer の
           auto-insertion と自動 rollback は維持（緩和対象は HITL 承認ゲートのみ）。

     (c) AUTO_APPROVE == false かつ APPROVAL_MODE == interactive:
         → 現行どおり Approval Gate で【停止】し、ユーザー承認を要求。

  6. step 5 で停止した場合のみ（(b) のエスカレーション停止 / (c) の通常ゲート）:
     ユーザー応答を待つ（自動で進めない）。(a) と (b) の非該当ケースは待たずに次フェーズへ。

  7. 次フェーズへ進む（現行どおり）。
```

補足:
- `APPROVAL_MODE` はフロー起動時に 1 回解決し（§9.1 ADR-005 の解決順）、セッション変数として保持。
  既存 `AUTO_APPROVE` セッション変数と同列で扱う（Field Reference 行は追加しない。両者とも
  orchestrator-rules.md 管理のオーケストレーター内部変数）。
- 既存の `### Common Error Handling`（L460–461 の `AUTO_APPROVE: true/false` 分岐）は**不変**。
  error retry は承認モードと独立の挙動であり改修不要（autonomous でも error 時はユーザー判断、
  AUTO_APPROVE 時のみ自動 retry という現行を維持）。

### 9.3 エスカレーション状態遷移設計（中断 → 確認 → 復帰）

```
        ┌──────────────────────┐
        │  RUNNING_AUTONOMOUS   │  ← APPROVAL_MODE==autonomous かつ AUTO_APPROVE==false
        └──────────┬───────────┘
                   │ フェーズ完了 AGENT_RESULT 受領
                   ▼
        ┌──────────────────────────────────────────────┐
        │ エスカレーション判定                          │
        │  経路A: AGENT_RESULT.ESCALATION_REQUIRED==true │
        │  経路B: security CRITICAL 未解決               │
        │         / 共有 rollback 上限(3)到達            │
        └───────┬──────────────────────┬───────────────┘
         非該当 │                該当   │
                ▼                       ▼
     次フェーズへ自動進行     ┌────────────────────────┐
     (HITL ゲート skip)       │   ESCALATION_PAUSED     │
                              │  AskUserQuestion で      │
                              │  ESCALATION_REASON を    │
                              │  verbatim 提示           │
                              └──────────┬─────────────┘
                                         │ ユーザー応答 = 復帰トリガー
                ┌────────────────────────┼────────────────────────┐
       「承認して続行」              「修正を指示」              「中断」
                │                        │                          │
                ▼                        ▼                          ▼
        RUNNING_AUTONOMOUS へ復帰   現フェーズエージェント再実行   ワークフロー停止
        → 次フェーズへ              → 結果 ESCALATION_REQUIRED      （resume 手順を提示）
                                       ==false なら autonomous 復帰、
                                       true なら再び ESCALATION_PAUSED
```

エスカレーションゲートの `AskUserQuestion`（Output Language=ja 解決時の表示文言例）:

```json
{
  "questions": [{
    "question": "autonomous 実行中にエスカレーション条件に該当しました: {ESCALATION_REASON}。どう進めますか？",
    "header": "エスカレーション",
    "options": [
      {"label": "承認して続行", "description": "判断を承認し autonomous 実行を再開"},
      {"label": "修正を指示", "description": "現フェーズに修正を指示して再実行"},
      {"label": "中断", "description": "ワークフローを停止"}
    ],
    "multiSelect": false
  }]
}
```

- 復帰トリガー＝この応答（ADR-004）。out-of-band 検知は行わない。
- `AUTO_APPROVE == true` の場合は本ゲートを表示せず「承認して続行」を自動選択し、
  `ESCALATION_REASON` をログ出力（§9.2-(a)）。
- 経路 B の rollback 上限到達は既存「Approval Gate after Doc Review FAIL」と同型。autonomous でも
  発火するよう、Rollback Rules 側に「autonomous/interactive いずれでも上限到達ゲートを通す」旨を
  1 行追記する（TASK-003 内で対応）。

### 9.4 ESCALATION_REQUIRED / ESCALATION_REASON フィールド追加設計

対象: `src/.claude/rules/agent-communication-protocol.md`（canonical。`.claude/rules/` 配下には
deploy のみ。編集は src を正とする）。

**追加位置**: `## Field Reference` 表（現 L68–83）の最終行 `DENIAL_CATEGORY ...`（L83）の**直後**に
2 行追加する。アンカー見出し: `## Field Reference`。

**追加する表行（英語固定。AGENT_RESULT キー/値は機械可読のため英語）:**

```
| `ESCALATION_REQUIRED` | true \| false | Emitted by implementation/design agents (developer, architect, security-auditor, tester, reviewer) when an autonomous-mode escalation condition is hit (SPEC-external technical decision, destructive change to DB schema / API compatibility, or multiple valid approaches undecidable within SPEC). The orchestrator pauses the autonomous flow at an escalation gate. Default / omitted = false (no escalation). Not consulted when `APPROVAL_MODE: interactive`. See `orchestrator-rules.md` §"Approval Mode (autonomous / interactive)". |
| `ESCALATION_REASON` | freeform string | Required when `ESCALATION_REQUIRED: true`. One-line human-readable reason surfaced verbatim in the escalation gate (e.g., "destructive DB schema migration required", "two valid auth approaches, SPEC does not disambiguate"). Omit when `ESCALATION_REQUIRED` is false/absent. |
```

**`### How to add a new canonical field`（現 L85–89）への適合根拠を 1 文追記**（基準 (a)+(b) 充足）:

```
> `ESCALATION_REQUIRED` qualifies under both (a) — emitted by ≥2 agents
> (developer, architect, security-auditor, tester, reviewer) — and (b) —
> parsed by every flow orchestrator to decide whether to pause an autonomous run.
```

注:
- `APPROVAL_MODE` / `AUTO_APPROVE` は AGENT_RESULT フィールドではなくオーケストレーター内部の
  セッション変数のため、Field Reference には**追加しない**（AUTO_APPROVE が現状ここに無いのと整合）。
- 個別エージェント定義への emit 指示追記は ADR-006 によりスコープ外。

### 9.5 TASK 分解（developer 着手用）

実装フェーズ・依存・対象ファイル・アンカー（見出しテキスト）を明示する。全 TASK は既存
`feat/approval-mode-triage` ブランチ上で作業。1 TASK = 1 コミット（prefix `docs:` 不可、
規約変更のため `feat:`。ただしフローオーケストレーター/規約は実装コードなので `feat:` が妥当）。

> 注: 本 §9 追記コミットのみ architect が `docs:` で行う。TASK-001 以降は developer が `feat:` で行う。

#### Phase 1: プロトコル & 規約基盤（casing 確定の土台）

- **TASK-001**: `src/.claude/rules/agent-communication-protocol.md` の Field Reference に
  `ESCALATION_REQUIRED` / `ESCALATION_REASON` 2 行を追加し、How to add a new canonical field に
  適合根拠 1 文を追記。
  - 対象ファイル: `src/.claude/rules/agent-communication-protocol.md`
  - アンカー: `## Field Reference`（表末尾 `DENIAL_CATEGORY` 行の直後） / `### How to add a new canonical field`
  - 依存: なし
  - 受け入れ: §9.4 の表行・根拠文がそのまま入っていること。

- **TASK-002**: `.claude/orchestrator-rules.md` に新セクション
  `## Approval Mode (autonomous / interactive)` を追加。内容＝トリアージ連動デフォルト表（§2-1）、
  `APPROVAL_MODE` 解決順（ADR-005）、`AUTO_APPROVE` との三段優先順位（ADR-002/§5.2）、
  不変ルール（§5.3）、エスカレーション 2 経路（ADR-003）と状態遷移（§9.3）。
  - 対象ファイル: `.claude/orchestrator-rules.md`
  - 挿入位置: `### Auto-Approve Mode`（現 L353–406）の直後、`### Phase Execution Loop`（現 L410）の直前
  - アンカー: `### Auto-Approve Mode` / `### Phase Execution Loop`
  - 依存: TASK-001（ESCALATION フィールドを参照するため）
  - 受け入れ: 三段優先順位・不変ルール・casing（APPROVAL_MODE キー大文字／値小文字）が明記。
    `.aphelion-auto-approve` ファイル名不変の注記を含む。

- **TASK-003**: `.claude/orchestrator-rules.md` の `### Phase Execution Loop` step 5–6 を §9.2 の
  三段判定へ置換。併せて `## Rollback Rules` の rollback 上限到達ゲートが autonomous でも発火する旨を
  1 行追記（§9.3 経路 B）。
  - 対象ファイル: `.claude/orchestrator-rules.md`
  - アンカー: `### Phase Execution Loop` / `### Approval Gate after Doc Review FAIL (rollback limit exceeded)`
  - 依存: TASK-002
  - 受け入れ: step 5 が (a)(b)(c) の三段。`### Common Error Handling` は不変であること。

#### Phase 2: フローオーケストレーター 5 本への結線

各ファイルに (i) トリアージ判定直後の `APPROVAL_MODE` 決定ステップ（解決順 ADR-005 を参照、
詳細は orchestrator-rules.md へ委譲する短い記述）、(ii) AGENT_RESULT 受領時のエスカレーション
検知ステップ、を追記。既存 `AUTO_APPROVE` 設定行（grep で特定済み）の近傍に置く。

- **TASK-004**: `.claude/agents/delivery-flow.md`
  - アンカー: 既存 auto-approve チェック行（`set AUTO_APPROVE: true` 付近, 現 L29）/ トリアージ表直後
  - 依存: TASK-002, TASK-003
- **TASK-005**: `.claude/agents/discovery-flow.md`
  - アンカー: 同上（現 L37 付近）
  - 依存: TASK-002, TASK-003
- **TASK-006**: `.claude/agents/operations-flow.md`
  - アンカー: 同上（現 L36 付近）
  - 依存: TASK-002, TASK-003
- **TASK-007**: `.claude/agents/maintenance-flow.md`
  - アンカー: 同上（現 L34 付近）
  - 追加注意: maintenance-flow の「2 つの必須 HITL ゲート」（change-classifier 後 / フロー完了時）は
    既存ルールどおり autonomous/AUTO_APPROVE でも「ログ付き自動確認」を維持する（新規挙動を足さない）。
  - 依存: TASK-002, TASK-003
- **TASK-008**: `.claude/agents/doc-flow.md`
  - アンカー: 同上（現 L55 付近）
  - 依存: TASK-002, TASK-003

> Phase 2 の 5 TASK は相互独立（並行可）。すべて Phase 1 完了が前提。

#### Phase 3: casing 一括検証（grep sweep）

- **TASK-009**: casing 全参照検証。案 B のため**改名は発生しない**が、新規トークンの小文字一貫性と
  既存 `AUTO_APPROVE` 無傷を機械検証する。
  - 手順:
    1. 実装前インベントリ（着手時に実行し基準を確認）:
       `grep -rn -E 'AUTO_APPROVE|APPROVAL_MODE|autonomous|interactive|AUTONOMOUS|INTERACTIVE|auto-approve' .claude/ src/.claude/rules/`
    2. 実装後検証（TASK-001〜008 完了後）:
       - `APPROVAL_MODE` は常にキー＝大文字スネーク、値＝小文字 `autonomous` / `interactive`。
       - `AUTONOMOUS` / `INTERACTIVE`（大文字値）が新規混入していないこと（= 0 件）。
       - 既存 `AUTO_APPROVE` の出現数・文言が改修前と一致（改名されていない）。
       - `.aphelion-auto-approve` / `.telescope-auto-approve` ファイル名文字列が不変。
       - スコープ外で `AUTO_APPROVE` を参照する `.claude/agents/analyst-intake.md:78` が**未改変**で
         あること（案 B では触らない）。
  - 対象ファイル: 検証のみ（必要時に straggler 修正）
  - 依存: TASK-001〜008
  - 受け入れ: 上記 5 チェックがすべてパス。差分が出た箇所のみ修正コミット。

### 9.6 実装順序・依存関係

```
Phase 1（基盤・直列）
  └─ TASK-001 (protocol: ESCALATION fields)            … 依存なし
  └─ TASK-002 (orchestrator: Approval Mode section)    … after TASK-001
  └─ TASK-003 (orchestrator: Phase Loop 三段判定)       … after TASK-002

Phase 2（結線・並行可）  すべて after Phase 1
  ├─ TASK-004 (delivery-flow)
  ├─ TASK-005 (discovery-flow)
  ├─ TASK-006 (operations-flow)
  ├─ TASK-007 (maintenance-flow) … 2 必須ゲートの扱い注意
  └─ TASK-008 (doc-flow)

Phase 3（検証）  after Phase 1+2
  └─ TASK-009 (casing grep sweep)
```

循環依存なし。クリティカルパスは TASK-001 → 002 → 003 →（Phase 2 並行）→ 009。

### 9.7 リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 個別エージェントへ emit 指示を追記しない（ADR-006）ため、経路 A の ESCALATION_REQUIRED が実運用で under-emit される | autonomous 時に危険判断を停止できず素通りする可能性 | プロトコル Field Reference に emit 主体・条件を明記。経路 B（security CRITICAL / rollback 上限）はオーケストレーター検知のため emit 非依存で機能。under-emit 観測時は各エージェント定義へ emit トリガー追記のフォローアップ issue を起票 |
| `.claude/orchestrator-rules.md` と `src/.claude/rules/agent-communication-protocol.md` が別ツリー（前者に src 複製なし、後者は src が canonical） | 編集対象の取り違え | TASK ごとに対象パスを明記済み（§9.5）。protocol は **src を正**として編集、orchestrator-rules は `.claude/` 直下が canonical |
| user-facing ミラー（`docs/wiki/{en,ja}/Architecture-Operational-Rules.md`, `Triage-System.md`, `site/.../architecture-operational-rules.md` 等）が承認ゲート挙動を記述しており未同期になる | ドキュメント不整合 | 本 issue の §3 スコープ外。doc-reviewer がフロー内で拾う／別途 wiki 同期フォローアップに切り出す（language-rules の bilingual sync 対象） |
| Standard の autonomous 緩和に project-rules.md `## Approval Mode` セクションを新設（ADR-005） | 既存 project-rules.md テンプレに無いキーを参照 | 不在時は既定（Standard=interactive）にフォールバック。rules-designer テンプレ更新は将来作業として明記（本 issue では参照ロジックのみ） |
| autonomous で HITL を飛ばすことによる品質劣化 | 小規模でも誤実装が無検査で進む懸念 | 不変ルール（doc-reviewer / security-auditor / reviewer は必ず実行）＋エスカレーション 2 経路で二層防御（§5.1）。緩和対象は HITL 承認ゲートのみで自動検査は不変 |
| AUTO_APPROVE と APPROVAL_MODE の優先順位誤実装 | autonomous がエスカレーションで止まらない／AUTO_APPROVE が止まってしまう | ADR-002 の三段優先順位を Phase Loop step 5 に (a)(b)(c) 順で明記。TASK-003 受け入れ条件で検証 |
