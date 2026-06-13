> Last updated: 2026-06-14
> GitHub Issue: [#160](https://github.com/kirin0198/aphelion-agents/issues/160)
> Authored by: analyst-intake (2026-06-14); analyst-core (2026-06-14)
> Next: architect

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

## §5 Analysis

> Authored by: analyst-core (2026-06-14)

### 5.1 スコープの読み替え（重要）

intake 段階では対象を `interviewer.md` / `analyst.md` としていたが、analyst チェーンは
2026-04 のモデル分割（`analyst-model-split-design.md`）で **3層構造** に再編されている:

- `analyst.md` — top-level orchestrator。**Bash を持たず、git 操作も intake 問答も行わない**。
  実際の intake（Step A–B の `AskUserQuestion` 問答、センチネル再質問）は子エージェントが担う。
- `analyst-intake.md` — Sonnet 層。**intake 問答の実体**（Step A: 最大4問バンドル、
  Step B: センチネル再質問1回）を保持する。
- `analyst-core.md` — Opus 層。深掘り分析（Step 1–5）を担う。

したがって grill-me 思想（Wave 構造・assumption validation・合意ゲート）の取り込み先として
`analyst.md` は適切でない（問答ロジックを持たないため）。**問答の実体を持つ
`analyst-intake.md` が正しい対象**である。本件はユーザー承認済み（質問2）として
スコープを `analyst.md → analyst-intake.md` に読み替える。

### 5.2 現状分析（2エージェントの問答構造）

| 観点 | interviewer.md 現状 | analyst-intake.md 現状 |
|------|---------------------|------------------------|
| 問答の構造化 | Step 1–5 の思考プロセス（全体像→機能要件→暗黙要件→PRODUCT_TYPE→UI） | Step A（最大4問）+ Step B（センチネル再質問1回） |
| バンドル制約 | 「AskUserQuestion 最大4問」明記（L75） | 「count ≤ 3 unless 4th is load-bearing」明記（L188-189） |
| ループ | なし（基本1パス、rollback 時のみ revision） | なし（Step B は1ラウンドまで） |
| assumption validation | なし（"Do not proceed on assumptions" は受動的） | センチネル検知（TBD/不明 等）のみ。矛盾・曖昧への能動指摘なし |
| 合意ゲート | なし | なし |
| センチネル機構 | なし | あり（L196-202、grill-me の「不明点明示」と一致） |

### 5.3 取り込むべき3点と既存構造との整合

1. **Wave 構造** — interviewer の Step 1–5、analyst-intake の Step A を「Wave 1（目標・
   コンテキスト・制約）」と位置づけ、その上に Wave 2（エッジケース・矛盾・依存）・
   Wave 3+（暗黙の前提・盲点）を**追加**する（既存質問の置換ではなく上積み）。
   オープンクエスチョン（§4）「Wave 1 に位置づけるか追加するか」への回答 = **位置づけ + 上積み**。

2. **Assumption validation** — Wave 間の遷移時に、それまでのユーザー回答を走査し
   「矛盾・曖昧・リスク」があれば能動的に指摘・再質問する行動ルールを追加。
   既存のセンチネル機構（受動的・不明点の明示）とは**別物**として共存させる
   （センチネルは「空欄/TBD の検知」、assumption validation は「内容の矛盾検知」）。

3. **合意ゲート** — 全 Wave 完了後に「ユーザーの意図とエージェントの解釈が一致したか」を
   確認するゲートを設置。不一致なら該当 Wave に戻るループとする。
   オープンクエスチョン（§4）「判定基準」への回答 = **ユーザー明示承認**を採用
   （エージェント自己評価のみでは grill-me の「合意に達するまで」を満たせず、
   かつ既存の approval-gate 文化と整合するため）。

### 5.4 4問バンドル制約との両立

§4 制約のとおり、AskUserQuestion ツール仕様（1コールあたり選択肢4問まで）は変更しない。
Wave 構造は「**何回の問答ラウンドを重ねるか**」の話であり、1ラウンドあたりの設問数とは
独立。したがって「4問バンドルに縛られない」とは **Wave を重ねることでトータル設問数の
上限が事実上なくなる**ことを意味し、1コールの設問数上限（4）は維持する。
analyst-intake の「count ≤ 3」記述は Wave 1 内の初回問答に限定する旨へ補正が必要。

---

## §6 Approach

architect / developer が実装する変更方針。対象は agent 定義ファイル2点。

### 6.1 interviewer.md

- 「Interview Approach」セクションに **"Grill Mode (Wave Structure)"** サブセクションを追加。
  - 既存 Step 1–5 を Wave 1 として明示。
  - Wave 2（エッジケース・矛盾・依存）、Wave 3+（暗黙の前提・盲点）の質問観点を追加。
  - 各 Wave 遷移時の **assumption validation** 行動ルールを追加（矛盾・曖昧・リスクへの能動再質問）。
  - 全 Wave 後の **合意ゲート**（ユーザー明示承認、不一致なら該当 Wave へ戻るループ）を追加。
- 「Questioning Principles」に「トークン消費を考慮しない（4問バンドルに縛られず Wave を
  重ねてよい／ループ制限なし）」旨を追記。
- Workflow（Initial Execution）に Wave ループと合意ゲートのステップを反映。
- 既存のセンチネル相当（"Unresolved Items" 出力）・rollback モードは**変更しない**。

### 6.2 analyst-intake.md

- 「Intake during standalone invocation」に Wave 構造を導入。
  - Step A を Wave 1 と位置づけ、「count ≤ 3」制約を **Wave 1 初回問答に限定**する旨へ補正。
  - Wave 2 / Wave 3+ の追加問答ステップを新設。
  - Step B のセンチネル再質問は**維持**しつつ、別途 **assumption validation**
    （内容矛盾の能動検知・再質問）を Wave 遷移時に追加。
  - 全 Wave 後に **合意ゲート**（ユーザー明示承認、不一致なら Wave へ戻る）を追加。
- 「トークン消費を考慮しない・ループ制限なし」をこの2エージェント限定の例外として明記。
- injection-only モード・HANDOFF_PAYLOAD スキーマ（13フィールド）は**変更しない**
  （問答強化は fresh モードの Step A–B 周辺に閉じる）。

### 6.3 共通

- センチネル機構と assumption validation は**共存**（一方が他方を置換しない）。
- 「token を考慮しない」例外は interviewer / analyst-intake **限定**であることを各ファイルに明記。

---

## §7 Document Changes

- **SPEC.md**: not_exists（本件は Aphelion 自身の agent 定義変更。製品 SPEC は存在しない）
- **UI_SPEC.md**: not_exists（UI 変更なし）
- **ARCHITECTURE.md**: not_exists（agent 定義は ARCHITECTURE.md 管理外）
- 実変更対象（architect/developer が編集）:
  - `.claude/agents/interviewer.md`
  - `.claude/agents/analyst-intake.md`（intake 問答の実体。`analyst.md` ではない）

---

## §8 Handoff Brief (for architect)

- **スコープ読み替え**: 当初 `analyst.md` 想定 → **`analyst-intake.md`** が正しい対象
  （`analyst.md` は orchestrator で Bash・intake 問答を持たない／問答実体は intake 層）。
  ユーザー承認済み（質問2）。
- **3つの取り込み**: Wave 構造（既存 Step を Wave 1 に位置づけ + Wave 2/3+ を上積み）、
  assumption validation（Wave 遷移時の矛盾・曖昧への能動再質問、センチネルとは別物で共存）、
  合意ゲート（**ユーザー明示承認**方式、不一致なら Wave へ戻るループ）。
- **設計上の制約**: AskUserQuestion の1コール4問上限は維持。Wave は「ラウンド数」であり
  設問数とは独立。「token 非考慮・ループ制限なし」は本2エージェント限定の例外。
- **不変更**: センチネル機構、interviewer の rollback モード、analyst-intake の
  injection-only モード・HANDOFF_PAYLOAD 13フィールドスキーマ。
- **後続依存**: 本件完了は `approval-mode-memo.md`（autonomous モード）の前提。
  approval-mode issue は本件をブロック依存とすること。
