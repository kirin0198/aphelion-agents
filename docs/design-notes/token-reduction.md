> Last updated: 2026-05-15
> GitHub Issue: [#132](https://github.com/kirin0198/aphelion-agents/issues/132)
> Authored by: analyst (2026-05-15)
> Promoted from: docs/design-notes/proposals/token-reduction-memo.md
> Related: [agent-definition-simplification.md](./agent-definition-simplification.md) (#131) — §B と §② が aphelion-overview.md 上で衝突
> Next: architect (mandatory — §C agent split / §E cache 戦略は設計判断)

# トークン消費削減

本書は user 起票の proposal を analyst が promotion したもの。
proposal 段階で「設計確定・未着手」と評価されていたため、内容は元メモを保持し、
ヘッダのみ標準フォーマットへ書き換えている。

## #131 との座標合わせ

| 本 issue (#132) | agent-definition-simplification (#131) | 衝突点 |
|---|---|---|
| §B aphelion-overview.md 軽量化 (**削減**) | §② Project-Specific Behavior → aphelion-overview.md (~390 行 **追加**) | 同一ファイルへの相反する変更 |

→ どちらの issue を先に着手する場合も、もう一方の architect 設計を読んでから着手する。
PR を切る順序は architect 段階で確定する。

## architect が answer すべき open question

1. **§E (Prompt Cache)**: Claude Code の prompt cache 制御 API が利用可能か?
   利用可能なら sub-PR 1 として最優先 (実装コスト低)。
2. **§C (Model split)**: `analyst-intake` (Sonnet) / `analyst-core` (Opus) 分割の妥当性。
   ユーザ体感は変えない前提だが、agent 定義ファイル数増・delivery-flow 配線変更を伴うため要設計判断。

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
