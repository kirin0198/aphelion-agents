> Last updated: 2026-05-16
> GitHub Issue: [#132](https://github.com/kirin0198/aphelion-agents/issues/132)
> Authored by: analyst (2026-05-15, refined 2026-05-16 post-#131 merge)
> Promoted from: docs/design-notes/proposals/token-reduction-memo.md
> Related: [agent-definition-simplification.md](./archived/agent-definition-simplification.md) (#131, closed) — §B baseline 確定
> Next: developer for PR-1 (§B mechanical), architect for PR-2 (§C model split)

# トークン消費削減

本書は user 起票の proposal を analyst が promotion したもの。
proposal 段階で「設計確定・未着手」と評価されていたため、内容は元メモを保持し、
ヘッダのみ標準フォーマットへ書き換えている。
2026-05-16: #131 マージ後の baseline で refined design を追加。

## #131 との座標合わせ (Resolved — 2026-05-16)

#131 マージ完了状態で aphelion-overview.md は 131 行 (Project-rules consultation 節 6 行
を含む)。#131 §② で agent から削除された Project-Specific Behavior の代替として、
auto-load される rule (git-rules / language-rules / denial-categories / document-locations)
が機能を引き継いだ。#132 §B はこの baseline をスタート地点として軽量化を行う。

**触らない箇所**: `### Project-rules consultation (all agents)` 節 (#131 で追加された 6 行)。

## Refined design (2026-05-16)

### PR-1 = §B aphelion-overview.md slim (本フェーズ着手)

`src/.claude/rules/aphelion-overview.md` 131 → 81 行 (**-50 行, -38%**) を目指す。
全 agent 起動時に auto-load されるため、削減効果は invocation × tokens で累積。

#### 削減対象一覧

| 候補 | 現在 | 提案 | 削減 | 理由 |
|---|---|---|---|---|
| Update history (l.5-12) | 8 行 | 1 行 (`git log` 参照) | -7 | 履歴は git log で十分 |
| Cross-cutting agents 表 (l.74-79) | 6 行 | 削除 | -6 | 各 agent (sandbox-runner.md / doc-reviewer.md) に同情報あり |
| Doc Flow agents 表 (l.81-91) | 11 行 | 削除 | -11 | 各 agent (hld-author.md 他) に同情報あり |
| Hook layer 節 (l.93-102) | 10 行 | 2 行 pointer (`hooks-policy.md` 参照) | -8 | hooks-policy.md (auto-load) に同情報あり |
| Document locations rule 参照 (l.104-113) | 10 行 | 2 行 pointer | -8 | document-locations.md (auto-load) に同情報あり |
| Tech Stack Flexibility (l.125-131) | 7 行 | 3 行 | -4 | 重複した bullet 表現を圧縮 |
| Domain Flow ASCII 図 (l.36-49) | 14 行 | 8 行 | -6 | 圧縮可能 (重要な情報を保持) |
| **合計** | | | **-50 行** | |

#### 削減の安全性確認

- すべての削除対象は、参照先の他ファイル (auto-load 済 rule または各 agent 定義) で
  完全にカバーされる
- aphelion-overview.md は「**workflow の全体像**」の役割に集中させ、agent 個別情報や
  rule 詳細は dedicated ファイルへ譲る
- developer 直行可 (architect スキップ): mechanical 削除のみ。新規追加なし

#### PR-1 Acceptance criteria

- [ ] `src/.claude/rules/aphelion-overview.md` 行数 ≤ 85 (現 131 から ~-46 以上の削減)
- [ ] `### Project-rules consultation (all agents)` 節は完全保持 (#131 で追加)
- [ ] Workflow Model + Design Principles + Branching by Product Type 表は保持
- [ ] Hook layer / Document locations rule への参照は 2 行 pointer 形式で残す (完全削除はしない)
- [ ] Cross-cutting agents / Doc Flow agents 表 完全削除 (agent 数 bump 時の二重メンテも解消)
- [ ] Update history は 1 行に圧縮 (`See git log for change history`)
- [ ] CHANGELOG.md Unreleased エントリ追加
- [ ] TASK.md reset (#128 rule per phase completion)
- [ ] PR body `Linked Issue: #132 (PR-1 of 2)` — **`Closes #132` は付けない** (PR-2 で close)

#### PR-1 リスク

| Risk | Impact | Mitigation |
|---|---|---|
| 削除した内容を必要とする agent が出現 | 低 | 削除対象は全て他ファイルで auto-load 済。実害なし |
| Wiki ページ (Home.md 等) が aphelion-overview.md の特定行を参照している | 低 | 行参照ではなく内容参照 (検索可能) のため影響軽微。`grep -r "aphelion-overview" docs/wiki/` で確認 |
| Doc Flow agents 表削除で Doc Flow の存在が見えにくくなる | 低 | Domain and Flow Overview 図に "Doc Flow" は明記済 (l.46) |

---

### PR-2 = §C Model split (次フェーズ)

`analyst` を `analyst-intake` (Sonnet) + `analyst-core` (Opus) に分割。
architect 設計必須。PR-1 マージ後に別 issue として詳細設計を進めるか、
または同 issue 内 PR-2 として進める (PR body で `Closes #132` を付与)。

**PR-2 で answer すべき open question**:

1. agent 分割の境界線 (どこまで Sonnet で処理するか)
2. `delivery-flow.md` / `maintenance-flow.md` の analyst 呼び出し配線
3. ユーザ体感を変えない前提の wrapping 設計

### §E Prompt Cache (調査タスク, 並列可)

Claude Code の prompt cache 制御 API が利用可能かを調査。利用可能なら別 PR で実装。
本書では未確定事項として残置。

### §A / §D (長期, defer)

- §A: AGENT_RESULT に `RELEVANT_UCS` を追加して後続 agent が SPEC.md の必要 UC のみ読む
  → 全 agent への波及が大きいため、運用負荷確認後に再検討
- §D: `SPEC_SUMMARY.md` の 2 段階参照方式 → spec-designer 含む全後続 agent への波及が
  大きいため、現状のプロジェクト規模では cost が benefit を上回る可能性

---

## 現状のトークン消費構造

### 主な消費源

| 消費源 | 説明 |
|------|------|
| 共通ルールの全エージェントロード | aphelion-overview.md・project-rules.md が全エージェント起動時に毎回ロードされる |
| 成果物の全文読み込み | SPEC.md・ARCHITECTURE.md を各エージェントが全文読む |
| delivery-flow の直列実行 | 12エージェントが順番に起動し各々が同じドキュメントを全文読む |
| rollback時の再実行 | max 3回のrollbackで同じコンテキストを最大3回ロード |
| doc-reviewerの横断チェック | 複数ドキュメントを全文比較するため入力が大きい |
| opusモデルの使用 | analyst はopus指定。高精度不要なフェーズでもopusが走る |

---

## 削減アイデア一覧

### A. 関連UCのみ参照（長期）

**概要**
AGENT_RESULTに「関連UCのID」を含め、次のエージェントはSPEC.md全文ではなく該当セクションのみ読む。

```
developer AGENT_RESULT:
  RELEVANT_UCS: [UC-001, UC-003, UC-007]
  → tester は SPEC.md 全文ではなく UC-001/003/007 のみ読む
```

**削減効果**: ○ 大規模SPEC.mdに効く
**実装コスト**: 高（全39エージェントのAGENT_RESULT定義への追加が必要）
**優先度**: 長期

---

### B. aphelion-overview.md の軽量化（最優先）

**概要**
全エージェントが自動ロードする共通ルールを「本当に全エージェントが必要な情報」のみに絞る。
ドメイン固有のルールはドメイン別ファイルに分離し、必要なエージェントだけが読む。

**削減効果**: ◎ 全エージェントのベースコストに直結
**実装コスト**: 低（既存ファイルの整理のみ）
**優先度**: 最優先

---

### C. モデルの使い分け（中期）★詳細設計

**概要**
現状 analyst は opus 指定だが、フェーズによって必要な精度が異なる。
フェーズごとにモデルを使い分けることでコストを削減する。

**フェーズ別モデル設計**

| フェーズ | 現状 | 推奨モデル | 理由 |
|------|------|------|------|
| Phase A: インテーク収集（タイプ分類・質問） | opus | Sonnet | 構造化質問の収集は高精度不要 |
| Phase B: TBD再質問・センチネル処理 | opus | Sonnet | ルールベースの処理 |
| 深掘り分析（§5–§8生成） | opus | Opus | 設計判断・根本原因分析が必要 |
| SPEC.md差分更新 | opus | Sonnet | テンプレート的な書き込み |
| GitHub issue作成 | opus | Sonnet | フォーマット整形のみ |

**実装方法**

Claude Codeではエージェント内でフェーズごとにモデルを切り替える仕組みがないため、**エージェントをフェーズで分割**してモデル指定を変える。

```
analyst-intake（Sonnet）
  - Phase A: タイプ分類・タイトル・スラグ収集
  - Phase B: タイプ別構造化質問・TBD禁止処理
  - docs/design-notes/<slug>.md §1–§4 生成
  - GitHub issue 作成
      ↓
analyst-core（Opus）
  - 深掘り分析（§5–§8生成）
  - ユーザー承認取得
  - SPEC.md / UI_SPEC.md 差分更新
  - AGENT_RESULT 出力 → NEXT: architect
```

**ユーザー体験への影響**
- なし。`/analyst` 起動後の動作は変わらない
- フロー内部でanalyst-intakeがanalyst-coreを呼び出す構造になる

**以前の「分割不要」判断との関係**
- 以前の判断: 「分類→トリアージ→経路確定という責任分割は不要」（機能的分割）
- 今回の分割: コスト最適化が目的（技術的分割）
- ユーザーから見た動作・フローは変わらないため、以前の判断に反しない

**他のエージェントへの展開候補**

| エージェント | 分割候補 | 効果 |
|------|------|------|
| architect | 設計方針決定（Opus）/ ARCHITECTURE.md書き込み（Sonnet） | 中 |
| developer | タスク計画（Sonnet）/ 実装（Sonnet）/ 品質チェック（Sonnet） | 小（元々Sonnet相当） |
| doc-reviewer | 整合性チェック（Opus）/ レポート生成（Sonnet） | 中 |

**削減効果**: ○ opus使用箇所に効く
**実装コスト**: 中（analyst定義ファイルの分割・delivery-flowの呼び出し更新）
**優先度**: 中期

---

### D. SPEC_SUMMARY の導入（長期）

**概要**
SPEC.mdが大きくなるにつれ全文読み込みコストが増大する問題に対し、サマリーファイルを導入する2段階参照方式。

```
SPEC.md（フルバージョン）
SPEC_SUMMARY.md（各UCの1行サマリー・自動生成）
  → 後続エージェントはまずSPEC_SUMMARYを読み
  → 必要なUCのみSPEC.mdから詳細を取得
```

**削減効果**: ○ 大規模SPEC.mdに効く
**実装コスト**: 高（spec-designer + 全後続エージェントの更新が必要）
**優先度**: 長期

---

### E. Prompt Cache の活用（最優先・要調査）

**概要**
Claude Codeはprompt cachingをサポートしている。変更頻度の低いファイルをキャッシュ対象として明示することでトークンコストを削減できる。

**キャッシュ候補ファイル**
- `.claude/rules/aphelion-overview.md`（全セッション共通・変更なし）
- `.claude/rules/project-rules.md`（プロジェクト内で変更なし）
- `SPEC.md`（フェーズ内では変更なし）

**要調査事項**
- Claude Code上でのprompt caching制御の可否
- キャッシュの有効期間・無効化タイミング

**削減効果**: ◎ 変更不要ファイルに大きく効く
**実装コスト**: 低（設定変更のみ・調査後に判断）
**優先度**: 最優先（ただし調査が先）

---

## 優先度まとめ

| アイデア | 削減効果 | 実装コスト | 優先度 |
|------|------|------|------|
| B: aphelion-overview.md 軽量化 | ◎ | 低 | 最優先 |
| E: Prompt Cache 活用 | ◎ | 低 | 最優先（要調査） |
| C: モデル使い分け（analyst分割） | ○ | 中 | 中期 |
| A: 関連UCのみ参照 | ○ | 高 | 長期 |
| D: SPEC_SUMMARY 導入 | ○ | 高 | 長期 |

## 成果物（着手時に生成）

**B（最優先）**
- `.claude/rules/aphelion-overview.md` の精査・軽量化
- ドメイン別ルールファイルの分離（必要に応じて）

**E（最優先・調査後）**
- prompt caching 設定の追加（Claude Code対応範囲の調査）

**C（中期）**
- `.claude/agents/analyst-intake.md`（新設・Sonnet）
- `.claude/agents/analyst-core.md`（新設・Opus）
- `.claude/agents/analyst.md` の廃止または薄いラッパーへの変更
- `.claude/agents/delivery-flow.md` / `maintenance-flow.md` の呼び出し更新
