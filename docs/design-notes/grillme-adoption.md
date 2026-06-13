> Last updated: 2026-06-14
> GitHub Issue: [#160](https://github.com/kirin0198/aphelion-agents/issues/160)
> Authored by: analyst-intake (2026-06-14)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/grillme-adoption.md
slug: grillme-adoption
branch_name: feat/grillme-adoption
issue_url: https://github.com/kirin0198/aphelion-agents/issues/160
issue_number: 160
issue_title: feat: grill-me 思想（Wave構造・assumption validation・合意ゲート）を interviewer/analyst に取り込む
issue_type: feature
intake_summary: |
  【背景・症状】
  Aphelion の interviewer / analyst は基本1パスで完了し、ユーザーの意図とエージェントの解釈が
  一致しているか確認する仕組みがない。grill-me 思想が持つ「問答ループ」「能動的な assumption
  validation（矛盾・曖昧への指摘・再質問）」「Wave 構造による段階的深掘り」の3点が欠如している。
  これにより、上流での認識齟齬が後続フェーズ（architect 以降）に伝播し、rollback・手戻りが発生する。

  【期待する動作・ゴール】
  interviewer.md と analyst.md（analyst-intake を含む）に以下を導入する:
  1. Wave 構造: Wave1（目標・コンテキスト・制約）→ Wave2（エッジケース・矛盾・依存）→ Wave3+（暗黙の前提・盲点）
  2. Assumption validation: ユーザー回答に矛盾・曖昧・リスクがあれば能動的に指摘・再質問
  3. 合意ゲート: 「意図とエージェントの解釈が一致したか」を確認し、不一致なら Wave に戻るループ
  トークン消費は考慮しない（最上流工程での投資が全体効率を最適化するため）。
  後続の approval-mode-memo（autonomous モード）の前提となる変更である。

  【スコープ】
  .claude/agents/interviewer.md、.claude/agents/analyst.md（analyst-intake 相当の intake 強化）。
  他エージェント（architect 等）は対象外。
proposals_source: docs/design-notes/proposals/grillme-adoption-memo.md
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# grill-me 思想の取り込み — interviewer / analyst 強化

## §1 背景・動機

Aphelion の interviewer エージェントおよび analyst（analyst-intake）は、
ユーザーへの問答を「最大4問バンドル＋センチネル再質問1回」という1パス構造で完了させる設計になっている。

一方、[grill-me](https://github.com/mattpocock/skills) が提唱する思想では:

- **問答はユーザーの意図とエージェントの解釈が一致するまで継続する**
- 一度に1つの質問で情報過多を避ける
- 曖昧・矛盾・リスクある発言には **能動的に反論・再質問**（assumption validation）
- アーキテクチャ・データ・UX のあらゆる分岐を体系的に網羅する（**Wave 構造**）

この思想との Aphelion 現状の乖離が最も大きい3点は以下の通り（proposals/grillme-adoption-memo.md より）:

| 乖離点 | 現状 | grill-me の理想 |
|--------|------|----------------|
| 問答ループ | 1パスで終了 | 合意に達するまでループ |
| Assumption validation | 仕組みなし | 矛盾・曖昧に能動的に指摘・再質問 |
| Wave 構造 | 構造化質問にとどまる | 基礎→エッジケース→暗黙の前提の段階的深掘り |

上流での認識齟齬は architect 以降の全フェーズに伝播し、rollback・手戻りによって
遥かに大きなコストが発生する。interviewer / analyst での十分な問答投資が全体効率を最適化する。

既に一致している点（取り込み不要）:
- センチネル機構（TBD 等の明示的追跡）= 不明点の明示
- codebase-analyzer の存在 = コードで分かることはコードを参照
- interviewer / analyst という問答専任エージェントの存在

---

## §2 ゴール・受け入れ条件

以下の変更を interviewer.md および analyst.md に導入する:

**Wave 構造の導入**
```
Wave 1（3-5問）: 目標・コンテキスト・制約
      ↓
Wave 2（2-4問）: エッジケース・矛盾・依存関係
      ↓ assumption validation（矛盾・曖昧があれば指摘・再質問）
Wave 3+（1-3問）: 暗黙の前提・盲点
      ↓
合意ゲート: 意図と解釈が一致したか確認
      ↓ 不一致なら Wave に戻る（ループ）
確定 → 次フェーズへ
```

**受け入れ条件**:
- [ ] interviewer.md に Wave 構造・assumption validation・合意ゲートの行動ルールが追記されている
- [ ] analyst.md（analyst-intake 相当）の intake 強化として同等の取り込みが行われている
- [ ] トークン消費を考慮しない旨の明示的な記載がある（「4問バンドル制約なし」「ループ制限なし」）
- [ ] 既に一致している点（センチネル機構等）は変更しない

---

## §3 スコープ

**対象ファイル**:
- `.claude/agents/interviewer.md` — Wave 構造・assumption validation・合意ゲートの追加
- `.claude/agents/analyst.md` — standalone invocation の intake 強化（同等の Wave 構造）

**対象外**:
- architect、developer 等の他エージェント（token-reduction-memo の削減方針に従う）
- Discovery Flow オーケストレーター本体（interviewer 呼び出しフローは変更しない）
- codebase-analyzer（「コードで分かることは聞かない」原則はすでに一致）

---

## §4 制約・オープンクエスチョン

**制約**:
- トークン消費は考慮しない（interviewer / analyst に限定。他エージェントはこの例外を適用しない）
- 既存の AskUserQuestion ツール仕様（選択肢4問まで等）は変更しない
  Wave 構造は「何 Wave 行うか」であり、1回の AskUserQuestion で何問送るかは別問題
- センチネル機構（sentinel re-ask rule）は維持・廃止しない

**依存関係**:
- 本 issue の完了は `docs/design-notes/proposals/approval-mode-memo.md` が提案する
  「autonomous モード」の前提条件となっている。approval-mode の issue は本 issue をブロック依存とすること。

**オープンクエスチョン**（analyst-core が深掘りすべき点）:
- 合意ゲートの判定基準をどう定義するか（エージェントによる自己評価 vs. ユーザー明示承認）
- Wave 2 以降に進む条件（Wave 1 完了の判定は何か）
- analyst-intake の「Step A-B」構造（最大4問+センチネル再質問）との整合性をどう取るか
- 既存の interviewer.md の質問セットを Wave 1 に位置づけるか、追加するか

---

*§5-8（分析・アプローチ・ドキュメント変更・ハンドオフ概要）は analyst-core が記述する*
