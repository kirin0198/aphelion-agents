> Last updated: 2026-06-14
> GitHub Issue: [#161](https://github.com/kirin0198/aphelion-agents/issues/161)
> Authored by: analyst-intake (2026-06-14)
> Next: analyst-core

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
- **スコープ外**: 個別エージェントの動作変更（AGENT_RESULT への ESCALATION フィールド
  追加を除く）・新規エージェント追加・triage 判定ロジック自体の変更。
