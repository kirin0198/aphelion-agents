# Contributing

> **Language**: [English](../en/Contributing.md) | [日本語](../ja/Contributing.md)
> **Last updated**: 2026-04-30
> **Update history**:
>   - 2026-04-30: Agents-Reference 分割しきい値を 6 ページに更新 + 新フローチェックリスト (#54)
>   - 2026-04-30: README ↔ Wiki 責任分担を明文化 (#76)
>   - 2026-04-29: wiki/design-notes/README の言語ポリシーを明確化 (#75)
> **EN canonical**: 2026-04-30 of wiki/en/Contributing.md
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
| 新しいエージェント | `.claude/agents/{name}.md` + 該当する Agents-{Domain}.md ページ（en+ja） |
| エージェントの変更 | `.claude/agents/{name}.md` + 該当する Agents-{Domain}.md のエントリ（en+ja） |
| 新しいルール | `.claude/rules/{name}.md` + Rules-Reference（en+ja） |
| ルールの変更 | `.claude/rules/{name}.md` + Rules-Referenceのエントリ（en+ja） |
| Flow Orchestrator ルールの変更 | `.claude/orchestrator-rules.md` + Architecture-Operational-Rules.md / Triage-System.md（en+ja） |
| 新フロー（Flow Orchestrator） | `.claude/agents/{flow}.md` + `.claude/commands/{flow}.md` + Architecture-Domain-Model.md（図と本文）+ Architecture-Operational-Rules.md（Phase Execution Loop）+ Triage-System.md（新セクション）+ Agents-Orchestrators.md（新 Flow Orchestrator エントリ）+ 該当する Agents-{Domain}.md（新ドメインページ、例：Agents-Doc.md）+ Home.md（ペルソナ + 用語集 + ページ数更新）+ index.mdx（カード） |
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

2. **該当する Agents-{Domain} ページを更新します** — `wiki/{en,ja}/` 配下の `Agents-Discovery.md` / `Agents-Delivery.md` / `Agents-Operations.md` / `Agents-Maintenance.md`、または横断系エージェント（Flow Orchestrator、sandbox-runner、analyst、codebase-analyzer）の場合は `Agents-Orchestrators.md`。標準スキーマ（正規、ドメイン、責務、入力、出力、`AGENT_RESULT` フィールド、NEXT 条件）に従って新しいエントリを追加します。

3. **エージェントをスタンドアロンスラッシュコマンドとして起動可能にする場合**、`.claude/commands/{name}.md`に対応するコマンドファイルを追加します。

4. **エージェントが新しい Flow Orchestrator の場合**、新しいエージェントをトリアージまたはフェーズシーケンスに含めるよう `.claude/orchestrator-rules.md` を更新します。

5. **Agents-Reference の分割しきい値**：Agents-Reference は #42 で最初の 5 ドメインページに分割し、#54 で Agents-Doc.md を 6 つ目のページとして追加しました。いずれか 1 ドメインページが ~250 行を超えた場合、またはエージェント合計数が 50 を超えた場合は、エージェントごとのファイル（`wiki/en/agents/{name}.md`）へのさらなる分割を検討してください。これは将来の決定事項です — まず issue を開いて議論してください。

---

## 既存エージェントの変更

1. **`.claude/agents/{name}.md`の正規ファイルを編集します。**

2. **該当する Agents-{Domain} ページのエントリを更新して**（en+ja）変更を反映させます。

   > Agents-{Domain} ページと `.claude/agents/` の同期維持は必須です。該当する Wiki エントリを更新せずにエージェント定義を更新すると、レビュアーが修正を要求します。

---

## ルールの更新

1. **`src/.claude/rules/{name}.md`の正規ファイルを編集します**（配置の根拠は下記「Aphelion 自身のルールを編集する」を参照）。

2. **`wiki/en/Rules-Reference.md`と`wiki/ja/Rules-Reference.md`の両方のRules-Referenceエントリを更新します。**

3. **ルールの変更が Flow Orchestrator の動作に影響する場合**、該当する Architecture サブページも更新します（ランタイム挙動なら `wiki/{en,ja}/Architecture-Operational-Rules.md`、概念モデルなら `Architecture-Domain-Model.md`、`AGENT_RESULT` /ハンドオフスキーマなら `Architecture-Protocols.md`）。

4. **ルールがトリアージに影響する場合**、`wiki/en/Triage-System.md`と`wiki/ja/Triage-System.md`も更新します。

### Aphelion 自身のルールを編集する

`rules/*.md` の正規ソースは `src/.claude/rules/` にあり、`.claude/rules/` ではありません。これは意図的な配置です。

Claude Code は `rules/*.md` を `~/.claude/rules/`（user-global）と `<project>/.claude/rules/`（project-local）の双方から **加算的に** auto-load します。Aphelion メンテナにとって、これは「リポジトリ内でセッションを開くたびに同じルールが二重に読み込まれる」状態を意味し、ルール編集中には**矛盾する 2 版が同時供給される**事態に至っていました。正規ソースを repo-root の `.claude/rules/` から退かすことで、構造的に二重ロードを排除します。詳細は `docs/design-notes/archived/claude-rules-isolation.md` (#44) を参照。

**実務上の影響**: `src/.claude/rules/` 配下のルールを編集しても、編集中のセッションには即座に反映されません。セッションは `~/.claude/rules/`（user-global mirror = デプロイ済みスナップショット）に従って動作します。編集を反映させるには:

1. 下記のポリシーに従い `package.json` の `version` を bump する。
2. `node bin/aphelion-agents.mjs update --user`（または merge 後は `npx github:kirin0198/aphelion-agents#main update --user`）を実行する。
3. 新しい Claude Code セッションを開く。

この edit-vs-effect の分離は意図的です — ルールを編集している最中に、編集中のルールに自身が拘束されるのは chicken-and-egg 問題であり、避けるべきだからです。

> `src/.claude/rules/` を `<repo>/.claude/rules/` にシンボリックリンクしないでください。この配置が解消した二重ロードが再発します。

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

### README ↔ Wiki 責任分担

**役割定義**

- **README** (`README.md` / `README.ja.md`) — ランディングページ。Wiki の事実のうち、厳選された小さなサブセットのスナップショットです：タグライン + エージェント数、Quick Start コマンド、Features（5 項目）、Learn-more リンク集。README はこれらのいずれに対しても**正規ソースではなく**、Wiki のミラーです。
- **Wiki** (`docs/wiki/{en,ja}/`) — 正規リファレンス。エージェントスキーマ、ルール説明、トリアージロジック、コマンドリファレンス、トラブルシューティングはすべてここに置きます。Wiki は README が言及するすべての情報の信頼できる唯一の情報源です。

**境界線運用ルール**

README に**置いてよい**もの：
- 1 行 tagline + エージェント数（landing snapshot の対象）
- 3-domain mermaid 図 1 つ（プロジェクト一目把握用）
- Quick Start 3 コマンド（`npx … init` / `cd && claude` / `/aphelion-init`）
- Features 箇条書き（5 項目以下、各 1 行）
- Wiki 主要 5 ページへのリンク群

README に**置かない**もの（= Wiki に送る）：
- スラッシュコマンドの網羅表（`/aphelion-help` への参照に留める）
- インストール代替手段の詳細（`--user` / git clone 等）
- cache caveat やトラブルシューティング
- triage plan 選択ロジックの解説
- エージェント別の入出力 / NEXT 条件
- 任意の persona-based entry point

判定基準：**「3 行を超える解説」「条件分岐ロジック」「網羅 reference」は Wiki 側**。

**同時更新セット（co-update set）**

以下の情報は README と Wiki の間で意図的に重複しています。
一方を更新して他方を更新しないのは欠陥です。レビュアーは PR をブロックします。

| 情報 | README の場所 | Wiki の場所 | その他 |
|------|--------------|------------|--------|
| エージェント数（`31`、`32`、…） | `README.md`、`README.ja.md` | `docs/wiki/en/Home.md`（×2）、`docs/wiki/ja/Home.md`（×2） | — |
| スラッシュコマンド名 | （なし — README は `/aphelion-help` に委譲） | `docs/wiki/{en,ja}/Getting-Started.md` §Command Reference | `.claude/commands/aphelion-help.md` |
| Quick Start コマンド（`npx … init`） | `README.md`、`README.ja.md`（Quick Start セクション） | `docs/wiki/{en,ja}/Getting-Started.md` §Quick Start | — |
| 3-domain mermaid 図 | `README.md`、`README.ja.md` | （Wiki はプロズ + Architecture 図を使用） | — |
| Features 箇条書き（5 項目） | `README.md`、`README.ja.md` | （Wiki Home の Persona-Based Entry Points が同内容を散文で記述） | — |
| プランティア名（Minimal/Light/Standard/Full） | （現在なし） | `docs/wiki/{en,ja}/Triage-System.md`、`Home.md` 用語集 | `.claude/rules/aphelion-overview.md` |

**README en ↔ ja のパリティ**

`README.md` と `README.ja.md` はリポジトリルートに英語正規のバイリンガルで置かれています。
同期規約は[`language-rules.md` → "Hand-authored canonical narrative"](../../src/.claude/rules/language-rules.md)
と repo-root README sync convention によって管理されており、**この Wiki バイリンガル同期ポリシーではありません**。
権威あるルールは `language-rules.md` を参照してください。(#75)

---

## バイリンガル同期ポリシー

Wikiは英語を正規とするバイリンガルです。以下のルールはPRレビューで強制されます：

> **正規ソース**: hand-authored な正規ナラティブ（Wiki、design notes、README）全体を覆う言語ポリシーは
> [`language-rules.md` → "Hand-authored canonical narrative"](../../src/.claude/rules/language-rules.md) に
> 宣言されています。本セクションは Wiki バイリンガル部分のみを強制します。
> `docs/design-notes/` の単一ファイル規約や README 同期については `language-rules.md` を直接参照してください。

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
- [ ] エージェント/ルールが変更された場合、該当する `Agents-{Domain}.md` または `Rules-Reference.md` のエントリを更新済み
- [ ] 新しいフロー / Flow Orchestrator を追加した場合、統合ポイントをすべて更新済み: Architecture-Domain-Model.md の図、Architecture-Operational-Rules.md（Phase Execution Loop）、Triage-System.md のセクション、Agents-Orchestrators.md（横断系エージェントエントリ）、Home.md のペルソナエントリ
- [ ] `.claude/commands/` に新しいファイルを追加した場合、静的一覧と同期させるため `.claude/commands/aphelion-help.md` にも該当行を追記する（#39）
- [ ] `.claude/agents/`、`.claude/rules/`、`.claude/commands/`、`.claude/orchestrator-rules.md` のいずれかを変更した場合、`package.json` の `version` を bump 済み（下記「バージョンbumpポリシー」参照）
- [ ] **README ↔ Wiki co-update set** に含まれる情報を変更した場合（「README ↔ Wiki 責任分担」参照）、
      重複しているすべての場所を同一 PR で更新済み。以下を実行して確認してください：
      ```
      bash scripts/check-readme-wiki-sync.sh
      ```
      差分が報告されないことを確認します。
- [ ] `bash scripts/smoke-update.sh` が正常終了する（リリース前ゲート）

### バージョンbumpポリシー

正規ソース（`.claude/agents/`、`.claude/rules/`、`.claude/commands/`、`.claude/orchestrator-rules.md`）を変更する PR は、必ず `package.json` の `version` を bump してください。これが下流の `npx` キャッシュを無効化する唯一の手段です。bump しないと、`main` に push した後でも `npx ... update` 利用者には引き続き古いスナップショットが配布されます。

- デフォルト: patch を 1 上げる（`0.2.0` → `0.2.1`）。
- minor bump: 新しいエージェント追加、新フロー追加、破壊的なルール変更の場合。
- `CHANGELOG.md` の `## [Unreleased]` セクションに変更内容を記載する。

### Settings deny-list policy

`<project>/.claude/settings.local.json` は deny-list 形式で配布されます: `allow: ["*"]` に加えて、破壊的操作を明示的に列挙する `deny` エントリ群です。カテゴリは `destructive_fs`、`destructive_git`、`privilege_escalation`、`secret_access`、`prod_db`、`external_publish` の 6 種類で、`.claude/rules/sandbox-policy.md` §1 のカテゴリと一致しています。

カスタマイズ: ローカルワークフローで deny されているコマンドが必要になった場合（自分のフォークに対する `git push --force-with-lease` など）、該当エントリをローカルで削除しても構いません。`npx aphelion-agents update` 実行時に書き戻しは発生しません — copy 時の filter が既存の `settings.local.json` を保護します。

### コマンドが拒否されたとき

完全なプロトコルは `.claude/rules/denial-categories.md` を参照してください。以下はクイックリファレンスです:

- **Sandbox / policy denial** → `AskUserQuestion` で意図を確認します。承認後も再実行が拒否される場合は、チャット入力に `!cmd` を貼り付けて手動フォールバックを実行してください。Claude Code は会話内承認を一回限りの allowlist として扱う仕組みを現状提供していません。
- **POSIX `Permission denied`** → `ls -la {path}` で所有者を確認し、`root` 所有なら `sudo chown -R $USER {path}` の後に再実行してください。これは sandbox-policy 起因ではないため、承認フローでは解消しません。
- **Claude Code auto-mode の拒否**（sub-agent 境界、branch-protection ヒューリスティック、"External System Write" など）→ `settings.local.json` では制御不能です。invocation ごとに承認するか、親セッションでコマンドを実行するか、ヒューリスティックが発動しないようにワークフローを分割してください。

### クローズ済み planning doc のアーカイブ

`docs/design-notes/` 内の planning doc は、対応する GitHub issue がクローズ (実装完了) されたら `docs/design-notes/archived/` に移動します。これにより active なディレクトリには進行中の計画だけが残ります。

移動は自動化されており、**変更を行う PR と同じ PR にコミット** されます (追従 PR は作りません)。 [`archive-closed-plans` ワークフロー](../../../.github/workflows/archive-closed-plans.yml) は `pull_request: opened` / `edited` / `synchronize` で発火し、PR 本文から `Closes #N` / `Fixes #N` / `Resolves #N` キーワードを抽出し、`GitHub Issue: [#N]` ヘッダーで該当 issue を参照する planning doc を `git mv` で `docs/design-notes/archived/` に移動、結果のコミットを PR ブランチに push し戻します。レビュアーは作業と archive 移動が同居する 1 件の diff を確認するだけで済みます。

ワークフローは冪等です — 既にアーカイブ済み・該当無しの場合は no-op になります。bot 自身の push に対するループ防止は actor filter (`github.actor != 'github-actions[bot]'`) と冪等性チェックで担保しています。

> **エッジケース**: ワークフローは *PR open 時点* でアーカイブを実行し、`Closes #N` キーワードを「マージすれば issue が閉じる」というコミットメントとして信頼します (GitHub がマージ時に自動で閉じる)。PR が **マージされずに close** された場合は、移動を手動で取り消してください (`git mv docs/design-notes/archived/<slug>.md docs/design-notes/<slug>.md` してから小さな chore PR を開く)。トレードオフは意図的なものです — マージ時 trigger ではすべての変更が 2 PR に分かれてしまい、PR 乱立の方が大きな運用負荷になるためです。

手動フォールバック: `git mv docs/design-notes/<slug>.md docs/design-notes/archived/`。ワークフローが issue 参照を検出できなかった場合 (planning doc が GitHub issue と紐付いていない、PR 本文にキーワードが無い、など) はこの方法を使ってください。

> アーカイブ済み planning doc は **read-only** として扱います。アーカイブ済みドキュメント間の相互参照 (旧来の相対パス) は意図的にそのまま残します — 後追いで書き換えないでください。アクティブなドキュメントからアーカイブにリンクする際は明示的に `docs/design-notes/archived/<slug>.md` のパスを使用します。

---

## 関連ページ

- [Architecture: Domain Model](./Architecture-Domain-Model.md)
- [Architecture: Protocols](./Architecture-Protocols.md)
- [Architecture: Operational Rules](./Architecture-Operational-Rules.md)
- [エージェントリファレンス：Flow Orchestrator](./Agents-Orchestrators.md)
- [Rules Reference](./Rules-Reference.md)

## 正規ソース

- [.claude/agents/](../../.claude/agents/) — エージェント定義ファイル（正規）
- [.claude/rules/](../../.claude/rules/) — ルールファイル（正規）
- [docs/design-notes/archived/wiki-information-architecture.md](../../design-notes/archived/wiki-information-architecture.md) — Wiki 情報アーキテクチャ設計（archived; #75 で `wiki/DESIGN.md` から移設）
