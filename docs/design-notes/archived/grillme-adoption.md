> Last updated: 2026-06-14
> GitHub Issue: [#160](https://github.com/kirin0198/aphelion-agents/issues/160)
> Authored by: analyst-intake (2026-06-14); analyst-core (2026-06-14); architect (2026-06-14)
> Next: developer

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

---

## §9 Implementation Design

> Authored by: architect (2026-06-14)
> ユーザー確認済み（論点 A〜F、全て推奨案で確定）。

この章は developer が逐語コピペで実装できる粒度の設計である。
解説文は日本語、agent 定義ファイルへ挿入する本文ブロックは英語（論点F）。
挿入ブロックは fenced code（```text）で囲んで示す。**fence 自体はファイルに挿入しない** —
中身のみを対象ファイルへ転記する。

### 9.0 確定した設計判断（論点 A〜F）

| 論点 | 決定 | 設計への反映 |
|------|------|-------------|
| A | interviewer の合意ゲートはエージェント内部ループ。オーケストレーターの approval-gate とは**別物**。 | 9.1 の Agreement Gate は INTERVIEW_RESULT.md 生成の**前段**に置く。AGENT_RESULT は出さない。 |
| B（B1）| 不一致時は `AskUserQuestion` で戻り先 Wave をユーザーに選ばせ、不一致点は自由記述で述べてもらい、該当 Wave を再実行。 | 9.1 / 9.2 の Agreement Gate に Wave 選択肢付き `AskUserQuestion` + 自由記述受領を定義。 |
| C | assumption validation は**矛盾検知時のみ発火**。矛盾・曖昧・リスクが無ければ素通り（必須 reflection はしない）。 | 9.1 / 9.2 の Assumption Validation を "fire only when a contradiction/ambiguity/risk is detected" と明記。 |
| D | `count ≤ 3` を「**Wave 1 初回 AskUserQuestion 限定**」に補正。Wave 2 以降は1コール4問上限のみ。 | 9.2 で L188-189 を置換。Wave 2+ は per-call ≤ 4 のみ。 |
| E | planning doc §9 に逐語の英文挿入ブロックを含める（本章）。 | 本章 9.1 / 9.2 に挿入ブロックを完備。 |
| F | agent 定義ファイル本文は英語、planning doc 解説文は ja。 | 挿入ブロックは英語、本章解説は日本語。 |

### 9.1 interviewer.md の実装

#### 9.1-A 挿入: "Grill Mode (Wave Structure)" サブセクション

**挿入位置**: `### Interview Thought Process` の Step 1–5 コードブロック（L43-69、` ``` ` で閉じる行）
の**直後**、`### Questioning Principles`（L71）の直前。新しい `###` 見出しとして挿入する。

**挿入する本文（英語、逐語）**:

```text
### Grill Mode (Wave Structure)

The interview proceeds in **waves** — successive rounds of questioning that go
from foundational to edge-case to implicit. This is an internal questioning loop;
it is NOT the orchestrator approval gate. Token cost is not a consideration for
this agent (see Questioning Principles): keep waving until intent and
interpretation converge.

```
Wave 1 (3-5 questions): goals, context, constraints
  → maps to Step 1-5 of the Interview Thought Process above
      ↓
Wave 2 (2-4 questions): edge cases, contradictions, dependencies
      ↓ assumption validation (only fires if a contradiction/ambiguity/risk is found)
Wave 3+ (1-3 questions): implicit assumptions, blind spots
      ↓
Agreement Gate: confirm intent and interpretation match
      ↓ on mismatch, return to the wave the user selects (loop)
Finalize → generate INTERVIEW_RESULT.md
```

**Wave 1** — Existing Step 1-5 (overall picture, functional requirements,
implicit requirements, PRODUCT_TYPE, HAS_UI) IS Wave 1. Do not replace it;
treat it as the foundational wave.

**Wave 2** — After Wave 1 answers are in, probe edge cases and seams:
- Boundary / error conditions the user has not mentioned
- Contradictions or tensions between Wave 1 answers
- Dependencies on external systems, data sources, or other features

**Wave 3+** — Surface implicit assumptions and blind spots:
- "What did the user assume without stating?"
- Operational, security, or scaling concerns implied but not raised
- Continue adding waves while genuine unknowns remain.

#### Assumption Validation (between waves)

When transitioning between waves, scan all answers gathered so far.
**Fire only when you detect a contradiction, ambiguity, or risk** — if none is
found, pass through silently to the next wave (no mandatory reflection step).

On detection, raise it actively to the user before continuing:
- State the specific contradiction / ambiguity / risk you observed.
- Ask a focused follow-up (`AskUserQuestion` or text) to resolve it.

This is distinct from, and coexists with, the "Unresolved Items" sentinel
output (which tracks blank/TBD points). Assumption validation inspects the
*content* of answers for inconsistency; the sentinel detects *absence* of an
answer. Neither replaces the other.

#### Agreement Gate (after all waves)

Once waves are exhausted, run an explicit agreement gate **before** writing
INTERVIEW_RESULT.md:

1. Summarize your interpretation of the user's intent (goals, scope, key
   requirements) in concise prose.
2. Ask the user whether your interpretation matches theirs:

   ```json
   {
     "questions": [{
       "question": "Does this interpretation match your intent? If not, which wave should we revisit?",
       "header": "Agreement Gate",
       "options": [
         {"label": "Matches — proceed", "description": "Interpretation is correct; finalize INTERVIEW_RESULT.md"},
         {"label": "Revisit Wave 1", "description": "Goals / context / constraints need correction"},
         {"label": "Revisit Wave 2", "description": "Edge cases / contradictions / dependencies need correction"},
         {"label": "Revisit Wave 3+", "description": "Implicit assumptions / blind spots need correction"}
       ],
       "multiSelect": false
     }]
   }
   ```

3. **On "Matches — proceed"**: finalize and generate INTERVIEW_RESULT.md.
4. **On any "Revisit Wave N"**: ask the user (free-text) to describe the
   specific mismatch points, then re-run that wave incorporating their
   correction. Loop back through subsequent waves and the agreement gate again.
   There is no loop-count limit.

This agreement gate is an internal questioning loop and emits no AGENT_RESULT.
The orchestrator-level approval gate is a separate, downstream mechanism.
```

#### 9.1-B 置換: "Questioning Principles" にトークン非考慮ルールを追記

**対象**: `### Questioning Principles`（L71-76）の箇条書きリスト。
4つ目の項目（`- **Use the user's language**` … L76）の**直後**に新規項目を1つ追加する。

**追加する1行（英語、逐語）**:

```text
- **Token cost is not a consideration (this agent only)** — Unlike most Aphelion agents, interviewer is exempt from token-reduction. You may run as many waves as needed and are not bound to a single 4-question bundle. The per-call AskUserQuestion limit (max 4 questions per call) still applies, but there is no limit on the number of waves or the total number of questions across waves. This exemption applies to interviewer and analyst-intake ONLY; do not generalize it to other agents.
```

#### 9.1-C 置換: Workflow → Initial Execution に Wave ループと合意ゲートを反映

**対象**: `### Initial Execution`（L222-232）の番号付きリスト。
現行の step 3 と step 8 の間（要件構造化〜HAS_UI 判定）が Wave 1 に相当する。
step 7（`Determine UI presence`）と step 8（`Generate INTERVIEW_RESULT.md`）の**間**に、
Wave 2 以降と合意ゲートのステップを挿入する。

**現行 step 7 と step 8 の間に挿入する本文（英語、逐語）**。挿入後、後続の番号は繰り下がる
（developer はリスト全体を振り直すこと）:

```text
7.5. **Run Wave 2 (edge cases / contradictions / dependencies)** — Probe boundaries, tensions between Wave 1 answers, and external dependencies (see Grill Mode → Wave 2).
7.6. **Run assumption validation** — Scan all answers; if (and only if) a contradiction/ambiguity/risk is found, raise it and resolve via follow-up before continuing.
7.7. **Run Wave 3+ (implicit assumptions / blind spots)** — Continue adding waves while genuine unknowns remain (see Grill Mode → Wave 3+).
7.8. **Run the Agreement Gate** — Summarize your interpretation and confirm with the user via AskUserQuestion. On mismatch, ask which wave to revisit, collect free-text correction, re-run that wave, and re-gate. Loop until the user selects "Matches — proceed". No loop-count limit.
```

> **不変更**: 既存の `## Rollback Mode`、`## Output File`、`Unresolved Items`
> 出力（センチネル相当）は一切変更しない。

### 9.2 analyst-intake.md の実装

#### 9.2-A 挿入: Wave 構造の導入見出し

**挿入位置**: `## Intake during standalone invocation`（L159）の見出し直後、
`### Promotion from proposals/`（L161）の直前。Wave 構造の総論を新規 `###` で挿入する。

**挿入する本文（英語、逐語）**:

```text
### Grill Mode (Wave Structure)

Standalone intake proceeds in **waves** — successive rounds of questioning from
foundational to edge-case to implicit, looping until intent and interpretation
converge. Token cost is not a consideration for this agent (see "Token cost
exemption" below). Waves apply to fresh mode only; injection-only mode is
unaffected.

```
Wave 1 (Step A): goals, context, constraints  → existing minimum intake
      ↓
Wave 2: edge cases, contradictions, dependencies
      ↓ assumption validation (only fires if a contradiction/ambiguity/risk is found)
Wave 3+: implicit assumptions, blind spots
      ↓
Agreement Gate: confirm intent and interpretation match
      ↓ on mismatch, return to the wave the user selects (loop)
Finalize → write §1-4 stub (Step C) → create issue (Step D)
```

Step A below IS Wave 1 (foundational). Step B (sentinel re-ask) is retained
unchanged and runs as part of Wave 1. Waves 2 and 3+ are added after Step B.
The sentinel mechanism (absence detection) and assumption validation
(content-contradiction detection) coexist; neither replaces the other.

#### Token cost exemption (analyst-intake only)

Unlike most Aphelion agents, analyst-intake is exempt from token-reduction
during standalone fresh intake. You may run as many waves as needed; there is
no limit on the number of waves or the total number of questions across waves.
The per-call AskUserQuestion limit (max 4 questions per call) still applies.
This exemption applies to analyst-intake and interviewer ONLY; do not
generalize it to other agents (including analyst-core).
```

#### 9.2-B 置換: Step A の "count ≤ 3" 制約を Wave 1 初回問答に限定（論点D）

**対象**: `### Step A: Minimum intake questions` 内の最終段落（L188-189）:

```text
Adapt the wording to bug / feature / refactor as needed, but keep the count
≤ 3 unless a fourth question is clearly load-bearing.
```

**この2行を以下の本文（英語、逐語）で置換する**:

```text
Adapt the wording to bug / feature / refactor as needed, but keep the count
≤ 3 unless a fourth question is clearly load-bearing. **This count ≤ 3 guidance
applies to the Wave 1 initial AskUserQuestion call only.** Subsequent waves
(Wave 2, Wave 3+) are bound solely by the per-call AskUserQuestion limit (max 4
questions per call); they are not capped at 3.
```

#### 9.2-C 挿入: Wave 2 / Wave 3+ / assumption validation / 合意ゲートのステップ

**挿入位置**: `### Step B: TBD / sentinel re-ask rule` の本文末尾（L202、
`design note rather than blocking the flow.` の行）の**直後**、
`### Step C: Write the planning doc`（L204）の直前。新規 `###` ステップ群として挿入する。

**挿入する本文（英語、逐語）**:

```text
### Step A2: Wave 2 and Wave 3+ (fresh mode)

After Step A (Wave 1) and Step B (sentinel re-ask) complete, continue into
additional waves. Each wave is one or more `AskUserQuestion` calls (max 4
questions per call); there is no cap on the number of waves.

**Wave 2 — edge cases, contradictions, dependencies:**
- Boundary / error conditions not yet covered
- Contradictions or tensions between Wave 1 answers
- Dependencies on existing SPEC.md / ARCHITECTURE.md, external systems, or
  other in-flight work

**Wave 3+ — implicit assumptions, blind spots:**
- Assumptions the user made without stating
- Operational / security / scaling concerns implied but not raised
- Continue adding waves while genuine unknowns remain.

### Step A3: Assumption validation (between waves)

When transitioning between waves, scan all answers gathered so far.
**Fire only when you detect a contradiction, ambiguity, or risk** — if none is
found, pass through silently to the next wave (no mandatory reflection step).

On detection:
- State the specific contradiction / ambiguity / risk to the user.
- Ask a focused follow-up (`AskUserQuestion` or text) to resolve it before
  continuing.

This is distinct from the Step B sentinel rule (which detects blank/TBD
*absence* of an answer). Assumption validation inspects the *content* of
answers for inconsistency. Both coexist; neither replaces the other.

### Step A4: Agreement Gate (after all waves)

Once waves are exhausted, run an explicit agreement gate **before** Step C
(writing the §1-4 stub):

1. Summarize your interpretation of the user's intent (background, goal, scope)
   in concise prose.
2. Confirm via `AskUserQuestion`:

   ```json
   {
     "questions": [{
       "question": "Does this interpretation match your intent? If not, which wave should we revisit?",
       "header": "Agreement Gate",
       "options": [
         {"label": "Matches — proceed", "description": "Interpretation is correct; write the §1-4 stub"},
         {"label": "Revisit Wave 1", "description": "Background / goal / scope need correction"},
         {"label": "Revisit Wave 2", "description": "Edge cases / contradictions / dependencies need correction"},
         {"label": "Revisit Wave 3+", "description": "Implicit assumptions / blind spots need correction"}
       ],
       "multiSelect": false
     }]
   }
   ```

3. **On "Matches — proceed"**: continue to Step C.
4. **On any "Revisit Wave N"**: ask the user (free-text) to describe the
   specific mismatch points, then re-run that wave incorporating their
   correction. Loop back through subsequent waves and the agreement gate again.
   There is no loop-count limit.

This agreement gate is an internal intake loop within analyst-intake. It does
not emit AGENT_RESULT and is unrelated to the orchestrator-level approval gate.

**Injection-only mode**: Steps A2 / A3 / A4 are SKIPPED entirely (same as Steps
A / B / D), because the existing planning doc already provides §1-4 content.
```

> **不変更**: `## Injection-only Mode`、`## Commit on Work Branch`、
> `## Required Output on Completion` の HANDOFF_PAYLOAD 13フィールドスキーマ、
> Step C / Step D の本文は一切変更しない。問答強化は fresh モードの
> Step A–B 周辺（新設 Step A2–A4）に閉じる。

#### 9.2-D 補足: Completion Conditions への反映（任意）

`## Completion Conditions`（L408 以降）の fresh モード項目に、Wave 2+ / assumption
validation / 合意ゲートのチェック項目を追加してもよい。最小実装では必須ではないが、
追加する場合の文言（英語、逐語）:

```text
- [ ] (Normal fresh mode only) Step A2: Wave 2 / Wave 3+ run as needed
- [ ] (Normal fresh mode only) Step A3: assumption validation run (fires only on detected contradiction/ambiguity/risk)
- [ ] (Normal fresh mode only) Step A4: Agreement Gate confirmed (looped on mismatch until user selects "Matches — proceed")
```

### 9.3 実装順序・依存関係

```
実装フェーズ 1: interviewer.md
  └─ TASK-001: 9.1-A "Grill Mode (Wave Structure)" サブセクション挿入（依存なし）
  └─ TASK-002: 9.1-B Questioning Principles にトークン非考慮ルール追記（TASK-001 後）
  └─ TASK-003: 9.1-C Workflow Initial Execution に Wave/合意ゲートステップ反映（TASK-001 後）

実装フェーズ 2: analyst-intake.md
  └─ TASK-004: 9.2-A "Grill Mode (Wave Structure)" + token exemption 挿入（依存なし）
  └─ TASK-005: 9.2-B Step A の count≤3 制約を Wave 1 限定へ補正（TASK-004 後）
  └─ TASK-006: 9.2-C Step A2/A3/A4（Wave2+/assumption validation/合意ゲート）挿入（TASK-004 後）
  └─ TASK-007: 9.2-D（任意）Completion Conditions 追記（TASK-006 後）
```

フェーズ1とフェーズ2は相互独立（別ファイル）。同一ブランチ `feat/grillme-adoption` 上で
逐次コミットする。両ファイルとも純粋な markdown agent 定義であり、
ビルド/テスト工程は不要（lint 対象外）。developer は git diff の目視と、
挿入した英文ブロックが既存の見出し階層（`###` レベル）と整合しているかを確認する。

### 9.4 リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 行番号ドリフト | §9 の挿入位置に記した行番号（L75 等）が、先行 TASK の挿入でずれる | 行番号は初期状態基準。developer は**見出しテキスト**（"### Questioning Principles" 等）をアンカーに位置決めする。番号は補助情報。 |
| センチネルと assumption validation の混同 | 実装者が両者を統合してしまい片方が失われる | 挿入ブロック内に "coexist; neither replaces the other" を明記済み。 |
| token 例外の波及 | 他エージェントへ「token 非考慮」が誤適用される | 挿入ブロックに "this agent only / do not generalize" を明記済み。 |
| 合意ゲートと approval-gate の混同 | エージェント内ループが AGENT_RESULT を誤って出す | 挿入ブロックに "emits no AGENT_RESULT / internal loop" を明記済み（論点A）。 |

### 9.5 architect の確認結果（ADR 相当）

- **ADR-1（論点A）**: 合意ゲートはエージェント内部ループとして実装。INTERVIEW_RESULT.md /
  §1-4 stub 生成の前段に置き、AGENT_RESULT を出さない。却下案: オーケストレーター
  approval-gate との統合（責務が異なり、Discovery/analyst フロー本体の変更が必要になるため却下）。
- **ADR-2（論点B=B1）**: 不一致時は Wave 選択肢付き `AskUserQuestion` + 自由記述で
  戻り先と不一致点を取得し該当 Wave を再実行。却下案: 全 Wave 一律再実行（コスト過大）、
  自動再解釈（grill-me の「ユーザー合意」原則に反する）。
- **ADR-3（論点C）**: assumption validation は矛盾検知時のみ発火。却下案: 全 Wave 遷移で
  必須 reflection（素通りケースで無駄な往復が発生するため却下）。
- **ADR-4（論点D）**: `count ≤ 3` は Wave 1 初回限定に補正、Wave 2+ は per-call ≤ 4 のみ。
  却下案: 全 Wave で count≤3 維持（Wave 深掘りの趣旨に反する）。
