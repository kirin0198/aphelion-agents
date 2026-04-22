# Wiki 情報アーキテクチャ設計メモ

> 参照元: ISSUE.md (2026-04-18)
> 作成日: 2026-04-18
> 最終更新: 2026-04-18
> 更新履歴:
>   - 2026-04-18: 初版作成（architect による情報アーキテクチャ確定）

本ドキュメントは Aphelion リポジトリの `docs/wiki/` ディレクトリ（バイリンガル wiki）に関する**軽量な情報アーキテクチャ設計メモ**である。
通常の `ARCHITECTURE.md`（データモデル / API 設計 / 依存関係）は不要であり、本ファイルのみで developer がページ本体を執筆可能な粒度にまとめる。

---

## 0. 設計原則

1. **canonical source は `.claude/` 配下の既存ファイル** — Wiki はそれらを読みやすく再編した二次ドキュメントであり、仕様を新規に作らない
2. **英語 canonical / 日本語同期翻訳** — PR 単位で必ず両言語を揃える（§4 参照）
3. **ページ本体に手書き内容を最小化** — エージェント / ルールの詳細は原則 canonical へのリンクと要約に留め、Wiki 側での書き下しを避ける
4. **ナビゲーションは軽量** — `_Sidebar.md` 等の GitHub Wiki 固有仕組みには依存せず、各ページ冒頭の TOC と相対リンクで完結させる（GitHub 通常リポジトリとしても閲覧可能にするため）
5. **Triage の精神を踏襲** — 主読者（エージェント開発者）に対して深く、副読者（新規ユーザー / プラットフォーム移植者）に対しては必要最小限

---

## 1. 情報アーキテクチャの確定

### 1.1 ページ構成

ISSUE.md §5 の **8 ページ構成を維持**する。ただし `Agents-Reference` は 26 エージェント × 2 言語 = 52 ファイルに分割すると保守負荷が高く、目次性も損なわれるため、**1 ページ内でドメイン別セクション化**する方針とする。

| # | slug | 言語別パス | 主読者 |
|---|------|-----------|--------|
| 1 | `Home` | `docs/wiki/en/Home.md` / `docs/wiki/ja/Home.md` | 全員 |
| 2 | `Getting-Started` | `docs/wiki/en/Getting-Started.md` / `docs/wiki/ja/Getting-Started.md` | 新規ユーザー |
| 3 | `Architecture` | `docs/wiki/en/Architecture.md` / `docs/wiki/ja/Architecture.md` | エージェント開発者 |
| 4 | `Triage-System` | `docs/wiki/en/Triage-System.md` / `docs/wiki/ja/Triage-System.md` | 新規ユーザー / エージェント開発者 |
| 5 | `Agents-Reference` | `docs/wiki/en/Agents-Reference.md` / `docs/wiki/ja/Agents-Reference.md` | エージェント開発者 |
| 6 | `Rules-Reference` | `docs/wiki/en/Rules-Reference.md` / `docs/wiki/ja/Rules-Reference.md` | エージェント開発者 |
| 7 | `Platform-Guide` | `docs/wiki/en/Platform-Guide.md` / `docs/wiki/ja/Platform-Guide.md` | プラットフォーム移植者 |
| 8 | `Contributing` | `docs/wiki/en/Contributing.md` / `docs/wiki/ja/Contributing.md` | エージェント開発者 |

### 1.2 Agents-Reference を 1 ページにまとめる根拠

- **読みやすさ**: 26 件程度であれば単一ファイルでも Ctrl+F 検索で十分ナビゲート可能
- **保守負荷**: 分割すると 26 × 2 言語 = 52 ファイルとなり、バイリンガル同期のレビュー負荷が 4〜5 倍に跳ね上がる
- **相互参照**: NEXT で他エージェントを指す頻度が高く、同一ファイル内アンカーの方が切れにくい
- **ドメイン区切り**: ページ内を `## Discovery Domain` / `## Delivery Domain` / `## Operations Domain` / `## Standalone` の 4 セクションで分け、各エージェントは `### <agent-name>` 見出しとする

**将来の分割判断**: エージェント数が 40 を超える、または個別ページ当たり 300 行超となった場合は `docs/wiki/en/agents/<name>.md` 形式への分割を再検討する。その場合でも Agents-Reference.md は一覧 + 各ページへのリンク集として残す。

### 1.3 ナビゲーション

- `_Sidebar.md` は**作成しない**（リポジトリ内閲覧との両立を優先）
- 代わりに以下の方針でナビゲーションを提供:
  - **Home.md** が唯一の目次ハブ。8 ページ全てへのリンクと 1〜2 行の要約を記載
  - 各ページ末尾に `## Related Pages` セクションを置き、関連ページへの相対リンクを列挙
  - ページ内目次（TOC）は 80 行超のページで必須、それ未満では任意

### 1.4 内部リンク規約

| 対象 | 記法 | 例 |
|------|------|----|
| 同一言語の他 wiki ページ | 相対パス（同一ディレクトリ内） | `[Triage System](./Triage-System.md)` |
| 同一ページ内のアンカー | GitHub 小文字スラッグ | `[architect](#architect)` |
| canonical agent 定義 | リポジトリルートからの相対パス | `[.claude/agents/architect.md](../../.claude/agents/architect.md)` |
| canonical rule | 同上 | `[.claude/rules/git-rules.md](../../.claude/rules/git-rules.md)` |
| 他言語版への切替 | ページ冒頭のヘッダーに 1 箇所のみ配置 | `[日本語 / English]` リンク（§2.1 参照） |

**禁止事項**:
- 絶対 URL でリポ内リンクを書かない（fork / ミラー時に壊れるため）
- `docs/wiki/en/` と `docs/wiki/ja/` 相互のクロスリンクは「言語切替ヘッダー」以外では使わない

---

## 2. ページテンプレート

### 2.1 共通フロントマター

全ページ共通で以下のブロックを冒頭に配置する（Markdown 引用ブロックで表現）。

```markdown
# <Page Title>

> Language: [English](../en/<slug>.md) | [日本語](../ja/<slug>.md)
> Last updated: <YYYY-MM-DD>
> EN canonical: <YYYY-MM-DD> of docs/wiki/en/<slug>.md (or commit SHA)
> Audience: <primary reader>
```

- **EN canonical** 行は `docs/wiki/ja/` 側のみで意味を持つ（英語版がどの時点に追随しているかを示す）。英語版では `EN canonical: self` または行を省略してよい
- **Last updated** はそのファイル自身の最終更新日
- **Audience** は ISSUE.md §5 の主読者列を転記

### 2.2 標準セクション構造

全ページで以下の順序を推奨（不要な節は省略可）:

1. タイトル＋フロントマター
2. 1〜3 行のページ要約（何を知るためのページか）
3. （80 行超の場合）目次 `## Table of Contents`
4. 本文（ページ固有構造）
5. `## Related Pages`（他ページへの相対リンク）
6. `## Canonical Sources`（参照した `.claude/` 配下ファイルへのリンク）

### 2.3 Agents-Reference の 1 エントリ統一スキーマ

各エージェントは以下の 5 項目で揃える（ISSUE.md §7.2 の指示に準拠）。

```markdown
### <agent-name>

- **Canonical**: [.claude/agents/<agent-name>.md](../../.claude/agents/<agent-name>.md)
- **Domain**: Discovery | Delivery | Operations | Standalone
- **Responsibility**: <1〜3 行で責務を要約>
- **Inputs**: <読み込むファイル / 前段エージェントの出力>
- **Outputs**: <生成する成果物ファイル>
- **AGENT_RESULT fields**: <agent 固有フィールドの列挙>
- **NEXT conditions**:
  - `success` → <next-agent | done>
  - `failure` / `blocked` → <orchestrator action>
```

**記述の粒度方針**:
- Responsibility は canonical の "Mission" セクションを 3 行以内に圧縮
- Inputs/Outputs は canonical の "Workflow" または "Output" セクションから抽出
- AGENT_RESULT fields は canonical の完了時出力ブロックから機械的に列挙
- 長文の説明は書かず、詳細は canonical リンクに誘導

### 2.4 Rules-Reference の 1 エントリ統一スキーマ

各ルールは以下の 3 項目で揃える。

```markdown
### <rule-file-name>

- **Canonical**: [.claude/rules/<rule-file>.md](../../.claude/rules/<rule-file>.md)
- **Scope**: <どのエージェント / 工程に適用されるか>
- **Auto-load behavior**: <自動ロードされるか / 明示参照が必要か>
- **Interactions**: <他ルール・エージェントとの関係、上書きポリシー>
- **Summary**: <3〜5 行でルールの要旨>
```

### 2.5 Triage-System のテーブル統一形式

4 ティア × 対象エージェント × 対象プロダクトタイプを 1 つのマトリクスで表現する。判定ロジックは `.claude/orchestrator-rules.md` から引用し、改変を加えない。

```markdown
| Plan | Agents included | Typical trigger | Product type |
|------|----------------|-----------------|--------------|
| Minimal | ... | ... | ... |
| Light | ... | ... | ... |
| Standard | ... | ... | ... |
| Full | ... | ... | ... |
```

---

## 3. バイリンガル同期モデル

### 3.1 同期ポリシー

- **英語 canonical、日本語は同 PR で追随必須**
- 英語先行マージは**原則禁止**とする。理由:
  - 英語のみマージすると `ja/` 側が「翻訳待ち」状態で放置されやすい
  - Aphelion は日本のユーザー比率が高く、日本語が遅れるとユーザー体験が劣化する
- 例外: 英語版に軽微修正（typo / リンク修正）を行う場合のみ、ja/ 側の同期は後続 PR で可。ただし同一 issue を後続 PR に引き継ぐこと

### 3.2 同期状態の可視化

各ページ冒頭のフロントマター（§2.1）に以下を含める:

```markdown
> EN canonical: 2026-04-18 of docs/wiki/en/Home.md
```

- `docs/wiki/ja/` 側のみ記載
- フォーマット: `<date> of <relative-path>`（コミット SHA は任意、ブランチ運用上は日付で十分）
- 英語版を更新したら、同 PR 内で該当 ja ページのこの行も更新する（実運用の合意点）

### 3.3 未翻訳ページのフォールバック

- ISSUE.md §5 で両言語同時作成が決まっているため、**初版リリース時点で未翻訳ページは存在しない**
- 将来的に英語先行で新規ページを追加する場合のフォールバック:
  - `docs/wiki/ja/<slug>.md` にスタブページを置く
  - 内容は `> 本ページは英語版が先行しています。[English version](../en/<slug>.md) を参照してください。` の 1 行
  - 30 日以内の翻訳を目安とし、Contributing ページにこのルールを明記する

### 3.4 レビュー運用

- PR では `docs/wiki/en/` と `docs/wiki/ja/` を同一 PR に含めることを必須とする
- CI チェックは本 issue のスコープ外（手動レビューで担保）

---

## 4. `scripts/generate.py` 拡張の是非

### 4.1 判断: **今回は拡張しない**（Wiki を生成物に配布しない）

### 4.2 根拠

| 観点 | 判断理由 |
|------|---------|
| 読者モデル | Wiki の主読者は「Aphelion のエージェント開発者」であり、配布先（Copilot/Codex 生成物）のエンドユーザーではない |
| 生成物の目的 | `platforms/copilot/` `platforms/codex/` は各 AI プラットフォームで動作する**実行用エージェント定義**。ドキュメント二次資料を含めると生成物サイズが肥大化し、プラットフォーム固有制約（Codex のサブエージェント不可など）と無関係なノイズになる |
| アクセシビリティ | Wiki は GitHub 上で直接閲覧可能。Copilot/Codex ユーザーも URL でアクセスすれば十分 |
| 保守負荷 | 生成パイプラインにリンク書き換え / 画像パス変換を追加すると `generate.py` の責務が膨張する |

### 4.3 運用上の対処

- `scripts/generate.py` が `docs/wiki/` を誤って走査しないよう、**既存スクリプトの除外設定を確認のみ行う**（このタスクは developer が Platform-Guide 執筆時に確認し、問題があれば別 issue 化）
- README または Platform-Guide に「Wiki は配布対象外。オンラインで参照してください」と 1 行明記する
- `.gitignore` への追加は不要（Wiki は git 管理対象）

### 4.4 将来の再検討トリガー

以下のいずれかが発生した場合、`generate.py` 拡張を再検討する:
- ユーザーから「オフライン環境で Wiki を読みたい」というフィードバックが複数件発生
- Codex/Copilot 側でコンテキスト窓に Wiki を自動注入する需要が出てきたとき

---

## 5. ディレクトリレイアウト最終案

```
docs/wiki/
├── DESIGN.md                    # 本ファイル（architect 成果物）
├── en/
│   ├── Home.md
│   ├── Getting-Started.md
│   ├── Architecture.md
│   ├── Triage-System.md
│   ├── Agents-Reference.md
│   ├── Rules-Reference.md
│   ├── Platform-Guide.md
│   └── Contributing.md
└── ja/
    ├── Home.md
    ├── Getting-Started.md
    ├── Architecture.md
    ├── Triage-System.md
    ├── Agents-Reference.md
    ├── Rules-Reference.md
    ├── Platform-Guide.md
    └── Contributing.md
```

- 合計 17 ファイル（DESIGN.md + 8 × 2）
- Agents-Reference の分割は行わない（§1.2 の根拠参照）
- 画像 / 図表が必要になった場合は `docs/wiki/assets/` を後続 PR で追加する（今回のスコープ外）

---

## 6. 実装順序（developer への指示）

Wiki ページ本体の執筆は本 DESIGN.md を基に developer が実施する。推奨する執筆順序は以下のとおり。

```
Phase 1: 骨格と主要ナビゲーション
  ├─ Task 1-1: docs/wiki/en/Home.md（目次ハブ。全ページへのリンク雛形を先に置く）
  └─ Task 1-2: docs/wiki/ja/Home.md（1-1 と同 PR）

Phase 2: コア解説ページ（canonical からの要約主体）
  ├─ Task 2-1: docs/wiki/en/Architecture.md + docs/wiki/ja/Architecture.md
  ├─ Task 2-2: docs/wiki/en/Triage-System.md + docs/wiki/ja/Triage-System.md
  └─ Task 2-3: docs/wiki/en/Getting-Started.md + docs/wiki/ja/Getting-Started.md

Phase 3: 大型リファレンス（フォーマット統一が重要）
  ├─ Task 3-1: docs/wiki/en/Agents-Reference.md + docs/wiki/ja/Agents-Reference.md
  └─ Task 3-2: docs/wiki/en/Rules-Reference.md + docs/wiki/ja/Rules-Reference.md

Phase 4: 周辺ページ
  ├─ Task 4-1: docs/wiki/en/Platform-Guide.md + docs/wiki/ja/Platform-Guide.md
  └─ Task 4-2: docs/wiki/en/Contributing.md + docs/wiki/ja/Contributing.md

Phase 5: 仕上げ
  └─ Task 5-1: README に Wiki エントリへのリンクを 1 箇所追加
```

各タスクは「英語版 + 日本語版 + 関連リンク更新」を 1 コミットにまとめる（git-rules.md の「One commit per task」原則に従う）。

---

## 7. 既知のリスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| canonical（`.claude/agents/*.md`）が更新された際、Wiki の要約が陳腐化する | 中 | Contributing ページに「エージェント定義を更新したら Agents-Reference の該当節も同 PR で更新する」旨を明記 |
| 日本語訳の遅延で `ja/` が放置される | 中 | §3.1 の「英語先行マージ原則禁止」で一次防御。Contributing に違反時のフォロー手順を記載 |
| Agents-Reference.md が肥大化し編集競合が多発 | 低〜中 | §1.2 の「40 超 or 300 行超で分割再検討」ルールを Contributing に記載 |
| README と Wiki の内容が重複し矛盾する | 中 | README は「入口と Quick Start」、Wiki は「詳細リファレンス」という役割分担を Home.md と Contributing.md の両方に明記 |
| プラットフォーム生成物（Copilot/Codex）側のユーザーが Wiki の存在に気づかない | 低 | Platform-Guide に「Wiki は GitHub 側で参照」のセクションを置き、生成物から誘導する |

---

## 8. 設計判断の記録（ADR）

### ADR-001: Agents-Reference を単一ファイル構成とする

- **状況**: 26 個のエージェント詳細をどう配置するか。単一ファイル vs ドメイン別 vs 個別ファイル
- **決定**: 単一ファイル `Agents-Reference.md` 内にドメイン別セクションを設ける
- **理由**:
  - 件数（26）は単一ファイルで Ctrl+F ナビゲート可能な上限内
  - バイリンガル同期の PR レビュー負荷を最小化（52 → 2 ファイル）
  - 相互リンクの保守性が高い
- **却下した代替案**:
  - ドメイン別 4 ファイル: ドメインを跨ぐ NEXT 参照が多く切断されやすい
  - 個別 26 ファイル: PR レビュー・翻訳同期の負荷が過大

### ADR-002: `_Sidebar.md` を採用しない

- **状況**: GitHub Wiki と GitHub リポジトリの両方から閲覧されることを想定
- **決定**: `_Sidebar.md` 等の GitHub Wiki 固有機構は使わず、Home.md を目次ハブとする
- **理由**:
  - 配信先は「リポジトリ内 `docs/wiki/` ディレクトリ」（ISSUE.md §4）であり、GitHub Wiki ではない
  - リポジトリ閲覧時には Sidebar が描画されないため、別途 Home.md があれば十分
  - ツール非依存のプレーンな Markdown 階層に留められる
- **却下した代替案**: `_Sidebar.md` 併用 — メンテ箇所が 2 倍になるため見送り

### ADR-003: 英語 canonical / 日本語同 PR 同期

- **状況**: バイリンガル運用の同期ポリシー
- **決定**: 英語 canonical、日本語は同一 PR で必ず同期。軽微修正のみ例外（後続 PR 許容）
- **理由**:
  - 翻訳遅延による日本語読者体験の劣化を防ぐ
  - PR レビュー時点で両言語揃うため、差分レビューが容易
- **却下した代替案**: 英語先行で `ja/` は任意追随 — 放置リスクが高い

### ADR-004: Wiki を `scripts/generate.py` の配布対象に含めない

- **状況**: Copilot/Codex 生成物に Wiki を含めるか
- **決定**: 含めない（オンライン参照に限定）
- **理由**: §4.2 を参照
- **却下した代替案**: 生成時に全 Wiki ページをコピー — 生成物の肥大化と `generate.py` の責務膨張を避ける

---

## 9. Canonical Sources（本設計の参照元）

- `/home/ysato/git/aphelion-agents/ISSUE.md`（analyst 成果物、承認済み方針）
- `.claude/rules/aphelion-overview.md`（Aphelion ワークフロー全体像）
- `.claude/agents/*.md`（26 エージェント定義、Agents-Reference の原典）
- `.claude/rules/*.md`（8 ルール定義、Rules-Reference の原典）
- `.claude/orchestrator-rules.md`（Triage-System の原典。存在確認は developer が行う）
- `platforms/copilot/` / `platforms/codex/`（Platform-Guide の原典）
- `scripts/generate.py`（Platform-Guide の原典）
- `README.md`（Getting-Started の原典）
