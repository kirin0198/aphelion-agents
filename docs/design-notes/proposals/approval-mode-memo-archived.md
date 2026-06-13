# 設計メモ: 承認モード（autonomous / interactive）のトリアージ連動

> ステータス: 設計確定・未着手
> 着手予定: 任意のタイミング
> 前提: grill-me 思想の取り込み（grillme-adoption-memo.md）が完了していること

---

## 背景・論理

grill-me 強化により上流（interviewer / analyst）で不確定要素を潰せるため、
下流フロー（delivery-flow 等）の自走（autonomous）が可能になる。
承認ゲート（人間の HITL）を緩める設定を導入する。

ただし規模が大きいほど失敗コストが高いため、トリアージに連動させて
承認モードを決定する。さらに設計時の考慮漏れに備えてエスカレーション機構を持つ。

---

## 承認モードのトリアージ連動（確定）

| トリアージ | デフォルト承認モード | ユーザーによる緩和 |
|------|------|------|
| Minimal | autonomous | — |
| Light | autonomous | — |
| Standard | **interactive** | 可（明示指定で autonomous に緩和） |
| Full | **interactive** | **不可（強制 interactive）** |

**基本方針**: デフォルトは interactive 寄り。Standard のみ明示緩和可。Full は強制。

### 承認モード決定ロジック

```
1. ユーザーが明示指定 → それに従う（ただし Full の autonomous 指定は拒否）
2. 指定なし & Minimal/Light → autonomous
3. 指定なし & Standard → interactive（デフォルト）
   - ユーザーが --autonomous を明示 → autonomous に緩和可
4. 指定なし & Full → interactive（強制・緩和不可）
```

---

## モードの定義

| モード | 動作 |
|------|------|
| `interactive`（現状） | 各フェーズ境界で HITL 承認ゲートを通す |
| `autonomous`（新設） | 自走。エスカレーション条件に該当した場合のみ停止 |

---

## 全モード共通の不変ルール（重要）

**自動チェック（エージェント）は緩めない。緩めるのは人間の HITL 承認ゲートのみ。**

- `doc-reviewer` / `security-auditor` / `reviewer` は autonomous でも必ず実行
- これにより autonomous でも品質を担保する
- 「人間の承認を緩める」と「自動レビューを緩める」は別問題として扱う

---

## エスカレーション機構

autonomous モードでも、以下に該当したら規模に関係なく一時停止しユーザーへ確認する。

### エスカレーション条件

- SPEC.md に記載のない技術判断が必要になった
- 破壊的変更が必要（DB スキーマ・API 互換性）
- security-auditor が CRITICAL を検出
- rollback が上限（3回）に達した
- 複数の妥当な実装方針があり SPEC.md の範囲で判断がつかない

### エスカレーションの伝播

AGENT_RESULT に `ESCALATION_REQUIRED` フィールドを追加。

```
developer AGENT_RESULT:
  STATUS: pass
  ESCALATION_REQUIRED: true
  ESCALATION_REASON: "SPEC.md に記載のない認証方式の選択が必要"
  → オーケストレーターが自走を中断し interactive に一時復帰
  → ユーザー確認後、autonomous に復帰
```

---

## 二層の安全網

| 層 | 判定軸 | 役割 |
|------|------|------|
| トリアージ | 規模 | デフォルト承認モードを決定 |
| エスカレーション | リスク | 規模に関係なく危険な判断を捕捉 |

規模とリスクは必ずしも比例しない（例: Minimal な設定変更が本番DB接続先だった等）。
トリアージだけでは拾えないリスクをエスカレーションが補完する。

---

## 成果物（着手時に生成）

- 各フローオーケストレーターへの承認モード機構の追加:
  - `.claude/agents/delivery-flow.md`
  - `.claude/agents/discovery-flow.md`
  - `.claude/agents/operations-flow.md`
  - `.claude/agents/maintenance-flow.md`
  - `.claude/agents/doc-flow.md`
- 全エージェントの AGENT_RESULT に `ESCALATION_REQUIRED` / `ESCALATION_REASON` 追加
  （※ AGENT_RESULT シンプル化メモと整合を取ること）
- トリアージ判定ロジックへの承認モード決定の組み込み
- ユーザー向けドキュメントに `--autonomous` 指定方法を追記
