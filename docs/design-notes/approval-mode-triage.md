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

*§5–8（詳細分析・アプローチ・ドキュメント変更計画・ハンドオフブリーフ）は analyst-core が追記する。*
