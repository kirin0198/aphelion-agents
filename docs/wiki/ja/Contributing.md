# コントリビューティング

> **Language**: [English](../en/Contributing.md) | [日本語](../ja/Contributing.md)
> **Last updated**: 2026-04-24
> **EN canonical**: 2026-04-24 (updated 2026-04-24) of wiki/en/Contributing.md
> **Audience**: エージェント開発者

このページはAphelionへの貢献方法をカバーします：エージェントの追加・変更、ルールの更新、Wikiのメンテナンス。プルリクエストを開く前にこのページを読んでください。

## 目次

- [貢献の種類](#貢献の種類)
- [新しいエージェントの追加](#新しいエージェントの追加)
- [既存エージェントの変更](#既存エージェントの変更)
- [ルールの更新](#ルールの更新)
- [Wikiのメンテナンス](#wikiのメンテナンス)
- [バイリンガル同期ポリシー](#バイリンガル同期ポリシー)
- [プルリクエストチェックリスト](#プルリクエストチェックリスト)
- [関連ページ](#関連ページ)
- [正規ソース](#正規ソース)

---

## 貢献の種類

| 種類 | 必要な変更 |
|-----|---------|
| 新しいエージェント | `.claude/agents/{name}.md` + Agents-Reference（en+ja） |
| エージェントの変更 | `.claude/agents/{name}.md` + Agents-Referenceのエントリ（en+ja） |
| 新しいルール | `.claude/rules/{name}.md` + Rules-Reference（en+ja） |
| ルールの変更 | `.claude/rules/{name}.md` + Rules-Referenceのエントリ（en+ja） |
| オーケストレータールールの変更 | `.claude/orchestrator-rules.md` + Architecture.md / Triage-System.md（en+ja） |
| 新フロー (オーケストレーター) | `.claude/agents/{flow}.md` + `.claude/commands/{flow}.md` + Architecture.md (図と本文) + Triage-System.md (新セクション) + Agents-Reference.md (新オーケストレーター + ドメインセクション) + Home.md (ペルソナ + 用語集) + index.mdx (カード) |
| Wikiページの更新 | `wiki/en/{page}.md` + `wiki/ja/{page}.md`（同一PR） |

---

## 新しいエージェントの追加

1. **`.claude/agents/{name}.md`にエージェント定義ファイルを作成します。**

   既存エージェントで使用されている標準フロントマター形式に従います：
   ```
   ---
   name: {agent-name}
   description: |
     {オーケストレーター検出用の1行説明}
   tools: Read, Write, Edit, Bash, Glob, Grep
   ---
   ```
   以下のセクションを含めてください：Mission、Inputs、Workflow、Outputs、AGENT_RESULT（全フィールド）、NEXT条件。

2. **Agents-Referenceを更新します**（`wiki/en/Agents-Reference.md`と`wiki/ja/Agents-Reference.md`）。標準スキーマ（正規、ドメイン、責務、入力、出力、AGENT_RESTULTフィールド、NEXT条件）に従って新しいエントリを追加します。適切なドメインセクションにエントリを追加してください。

3. **エージェントをスタンドアロンスラッシュコマンドとして起動可能にする場合**、`.claude/commands/{name}.md`に対応するコマンドファイルを追加します。

4. **エージェントが新しいフローオーケストレーターの場合**、新しいエージェントをトリアージまたはフェーズシーケンスに含めるよう`.claude/orchestrator-rules.md`を更新します。

5. **Agents-Referenceの分割しきい値**：エージェントの合計数が40を超える場合、またはAgents-Reference.md内のいずれかのセクションが300行を超える場合は、エージェントごとの`wiki/en/agents/{name}.md`ファイルへの分割とAgents-Reference.mdをリスト+リンクハブに変換することを検討してください。これは将来の決定事項です — まずissueを開いて議論してください。

---

## 既存エージェントの変更

1. **`.claude/agents/{name}.md`の正規ファイルを編集します。**

2. **`wiki/en/Agents-Reference.md`と`wiki/ja/Agents-Reference.md`の両方のAgents-Referenceエントリを更新して**変更を反映させます。

   > Agents-Referenceの同期維持は必須です。Wikiエントリを更新せずにエージェント定義を更新すると、レビュアーが修正を要求します。

---

## ルールの更新

1. **`.claude/rules/{name}.md`の正規ファイルを編集します。**

2. **`wiki/en/Rules-Reference.md`と`wiki/ja/Rules-Reference.md`の両方のRules-Referenceエントリを更新します。**

3. **ルールの変更がオーケストレーターの動作に影響する場合**、`wiki/en/Architecture.md`と`wiki/ja/Architecture.md`も更新します。

4. **ルールがトリアージに影響する場合**、`wiki/en/Triage-System.md`と`wiki/ja/Triage-System.md`も更新します。


---

## Wikiのメンテナンス

### 既存ページの編集

- 常にまず英語ページ（`wiki/en/`）を編集してください — それが正規ソースです。
- 英語ページの先頭の`> Last updated:`を更新します。
- 同一PRで対応する日本語ページを更新します。`> EN canonical:`を現在の日付に更新します。

### 新しいページの追加

1. 標準フロントマターで`wiki/en/{slug}.md`を作成します。
2. `wiki/ja/{slug}.md`を`EN canonical: {date} of wiki/en/{slug}.md`で作成します。
3. 両方のページを`wiki/en/Home.md`と`wiki/ja/Home.md`の`## Pages`セクションに追加します。
4. 関連するページに`Related Pages`リンクを追加します。

### 未翻訳ページのフォールバック

新しい英語ページを追加するが同一PRで日本語翻訳を提供できない場合は、`wiki/ja/{slug}.md`にスタブを配置してください：

```markdown
> 本ページは英語版が先行しています。[English version](../en/{slug}.md) を参照してください。
```

30日以内に翻訳し、スタブのissueをフォローアップPRにリンクしてください。

### READMEとWikiの棲み分け

- **README**：エントリーポイントとクイックスタート。短くまとめてください — セットアップ、シナリオ、コマンドリファレンス。
- **Wiki**：詳細リファレンス。エージェントスキーマ、ルール説明、トリアージロジック。
- 詳細なリファレンスコンテンツをREADMEに追加しないでください。クイックスタートコンテンツをwikiのHome.mdに追加しないでください。

---

## バイリンガル同期ポリシー

Wikiは英語を正規とするバイリンガルです。以下のルールはPRレビューで強制されます：

**必須：**
- `wiki/en/{page}.md`を変更するPRはすべて、同一PRで`wiki/ja/{page}.md`も更新**しなければなりません**。
- 英語のみのマージは禁止されています（軽微な修正を除く — 以下参照）。
- 英語ページが変更された場合、すべての`wiki/ja/`ページの`> EN canonical: {date}`行を現在の日付に合わせて更新しなければなりません。

**軽微な修正の例外：**
- 英語のみのtypo修正とリンク切れ修正は、同一PRでの日本語同期なしにマージできます。
- 7日以内に日本語更新のためのフォローアップissueを開いてアサインしなければなりません。

**レビュアーの責任：**
- レビュアーは`wiki/en/`と`wiki/ja/`の構造的な同等性（同じセクション、同じ見出し、一致するTOC）が維持されていることを確認します。

---

## プルリクエストチェックリスト

PRを開く前に確認してください：

- [ ] 正規ソース（`.claude/agents/`または`.claude/rules/`）を更新済み
- [ ] 変更がWikiコンテンツに影響する場合、`wiki/en/`ページを更新済み
- [ ] 同一PRで`wiki/ja/`ページを更新済み（バイリンガル同期）
- [ ] 変更したWikiページの`> Last updated:`行を更新済み
- [ ] 対応する`wiki/ja/`ページの`> EN canonical:`行を更新済み
- [ ] エージェント/ルールが変更された場合、Agents-ReferenceまたはRules-Referenceのエントリを更新済み
- [ ] 新しいフロー / オーケストレーターを追加した場合、4 箇所の統合ポイントをすべて更新済み: Architecture.md の図、Triage-System.md のセクション、Agents-Reference.md のドメインセクション、Home.md のペルソナエントリ

---

## 関連ページ

- [アーキテクチャ](./Architecture.md)
- [エージェントリファレンス](./Agents-Reference.md)
- [ルールリファレンス](./Rules-Reference.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — エージェント定義ファイル（正規）
- [.claude/rules/](../../.claude/rules/) — ルールファイル（正規）
- [wiki/DESIGN.md](../DESIGN.md) — Wiki情報アーキテクチャ設計
