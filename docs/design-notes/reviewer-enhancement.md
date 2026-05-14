> Last updated: 2026-05-15
> GitHub Issue: [#133](https://github.com/kirin0198/aphelion-agents/issues/133)
> Authored by: analyst (2026-05-15)
> Promoted from: docs/design-notes/proposals/reviewer-enhancement-memo.md
> Next: architect (mandatory — 3 新 agent + delivery-flow triage/rollback への横断的影響)

# 専門レビュアー追加 — ui-reviewer / performance-reviewer / dependency-reviewer

本書は user 起票の proposal を analyst が promotion したもの。
proposal 段階で「設計確定・未着手」と評価されていたため、内容は元メモを保持し、
ヘッダのみ標準フォーマットへ書き換えている。

## エージェント数 bump の波及範囲 (architect / developer 確認用)

3 エージェント追加で agent count 39 → 42。波及する更新先 (#54 doc-flow と同パターン):

- `README.md` / `README.ja.md` 本文 + shields.io バッジ
- `docs/wiki/{en,ja}/Home.md`
- `docs/wiki/{en,ja}/Agents-Delivery.md`
- `.claude/rules/aphelion-overview.md`
- `site/src/content/docs/{en,ja}/index.mdx`
- `CHANGELOG.md`

## doc-reviewer / security-auditor との役割分離 (再掲・厳守)

| 領域 | 担当 |
|---|---|
| 実装コード ↔ UI_SPEC.md 準拠 | **ui-reviewer** (新規) |
| UI_SPEC.md ↔ SPEC.md 整合 | **doc-reviewer** (既存) |
| ライセンス競合 / 依存陳腐化 | **dependency-reviewer** (新規) |
| 脆弱性検出 (CVE) | **security-auditor** (既存) — dependency-reviewer は触らない |

---

## 方針

現状の `reviewer` は変更せず、専門レビュアーをトリアージで追加選択する構成にする。

## 現状の reviewer（変更なし）

- 起動条件: Light+（全プラン）
- 観点: UC適合性・アーキテクチャ準拠・コード品質・テストカバレッジ・API契約

## 追加する専門レビュアー（3つ）

### `ui-reviewer`
- 起動条件: HAS_UI: true · Light+
- 観点: UI実装 ↔ UI_SPEC.md / VISUAL_SPEC.md 準拠・アクセシビリティ・レスポンシブ
- 注意: doc-reviewerとの役割分離
  - 「実装コードがUI_SPEC.mdに準拠しているか」→ ui-reviewer
  - 「UI_SPEC.md自体がSPEC.mdと整合しているか」→ doc-reviewer

### `performance-reviewer`
- 起動条件: Standard+
- 観点: 静的解析によるパフォーマンスアンチパターン検出
  （N+1クエリ・不要ループ・キャッシュ戦略・クエリ効率）
- 制約: 静的解析の限界を明示すること（実測値は保証しない）

### `dependency-reviewer`
- 起動条件: Full
- 観点: ライセンス競合・依存関係の陳腐化
- 注意: 脆弱性検出は security-auditor に委譲（重複させない）

## rollback 制御

delivery-flow が `CRITICAL_COUNT > 0` を判定して一元管理する。
複数レビュアーが失敗した場合も、オーケストレーターが統合して developer へ rollback 指示。

## 成果物（着手時に生成）

- `.claude/agents/ui-reviewer.md`
- `.claude/agents/performance-reviewer.md`
- `.claude/agents/dependency-reviewer.md`
- `.claude/agents/delivery-flow.md`（トリアージ条件・rollback制御の更新）
