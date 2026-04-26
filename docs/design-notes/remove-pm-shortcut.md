# refactor: remove redundant /pm shortcut (covered by /delivery-flow)

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#55](https://github.com/kirin0198/aphelion-agents/issues/55)
> Implemented in: TBD

---

## 1. Background & Motivation

ユーザ memo:

> pm スラッシュコマンドの要否再検討。delivery flow で網羅されておりすでに不要となっている認識。

### 経緯（git 履歴）

- `dda68b6 Add: Agent call commands` および `d977726 feat: 全エージェントのスラッシュコマンド定義を追加` で初期のスラッシュコマンド群が導入された。
- `ff54620 refactor: rename PM orchestrators to -flow` で「PM (project manager)」系のオーケストレータを `-flow` 命名規則に統一改名した。この時点で本流コマンドは `/delivery-flow` となり、`/pm` は **要件が既に固まっているケース向けのショートハンド** として残された。
- `76f81e1 refactor: translate all agent definition body text to English` で全エージェント定義が英訳された際、`/pm` も維持されたまま現在に至る。

### 現状の重複

`/pm` と `/delivery-flow` はどちらも「Delivery Flow agent を起動する」ショートカットで、`$ARGUMENTS` をそのまま渡すだけの薄いラッパー。実体は `delivery-flow` エージェントが受け取り、`DISCOVERY_RESULT.md` の有無を見て要件探索が必要かを内部で判断している（つまり「要件が固まっているならショートカット」という分岐は `/pm` 側ではなく Delivery Flow 内部で既に処理済み）。

### 廃止根拠

1. **機能的に冗長**: `/pm` は `/delivery-flow` と等価。`/pm "要件 X"` と `/delivery-flow "要件 X"` の挙動は同じ。
2. **命名の一貫性**: 他のオーケストレータは全て `-flow` で揃っている（`/discovery-flow`, `/delivery-flow`, `/operations-flow`, `/maintenance-flow`）。`/pm` だけが旧称（PM = Project Manager）由来のレガシー命名で、ドキュメント上の説明コストを生む。
3. **ユーザ体験**: `/aphelion-help` の Shortcuts セクションで「`/pm` は requirements が clear のときに使え」と説明しているが、これは `/delivery-flow` でも全く同じ。学習者にとってノイズ。
4. **配布物の単純化**: `bin/aphelion-agents.mjs` は `.claude/commands/` を丸ごとコピーする (skill 一覧の自動生成は無し)。`.claude/commands/pm.md` を消せば配布物・`update` コマンドからも自動的に外れる。

---

## 2. Current state

### 2.1 `pm.md` と `delivery-flow.md` の差分（バイト単位で比較済）

```
$ diff -u .claude/commands/pm.md .claude/commands/delivery-flow.md
--- .claude/commands/pm.md
+++ .claude/commands/delivery-flow.md
@@ -1,11 +1,9 @@
 Launch the Delivery Flow agent (design and implementation orchestrator).

-Manage the entire Delivery domain of the Aphelion workflow based on the following user requirements.
-Perform triage based on project characteristics, launch agents for each phase in sequence,
-and obtain user approval at the completion of each phase before proceeding to the next.
-
-Note: To start from requirements exploration (Discovery), use /discovery-flow instead.
-Note: To deploy and operate (Operations), use /operations-flow instead.
+Perform triage based on project characteristics and manage the Delivery domain flow
+(spec-designer → ux-designer → architect → scaffolder → developer → ...).
+Launch agents for each phase in sequence and obtain user approval at the completion of each phase
+before proceeding to the next.
```

両者は文言が違うだけで、最終的に launch する agent も `$ARGUMENTS` の渡し方も同一。`/pm` 側にだけ存在する独自ロジックは無し。

### 2.2 `/pm` への active な参照（grep 結果）

```
.claude/commands/aphelion-help.md:20         | `/pm` | Quick Delivery launch when ... (skips Discovery) |
docs/wiki/ja/Home.md:49                      2. `/discovery-flow` を実行（要件が固まっている場合は `/pm`）
docs/wiki/ja/Getting-Started.md:152          /pm 連絡先管理のREST APIを作りたい
docs/wiki/ja/Getting-Started.md:229          | `/pm {説明}` | Deliveryを直接開始（ショートハンド） | 要件が固まっている場合 |
docs/wiki/en/Home.md:48                      2. Run `/discovery-flow` (or `/pm` if requirements are already clear)
docs/wiki/en/Getting-Started.md:160          /pm I want to build a REST API for managing contacts
docs/wiki/en/Getting-Started.md:237          | `/pm {description}` | Start Delivery directly (shorthand) | When requirements are clear |
README.ja.md:94                              /pm TODOアプリを作りたい
README.ja.md:121                             | `/pm` `/delivery-flow` | 設計・実装フローを開始 |
README.md:100                                /pm I want to build a TODO app
README.md:127                                | `/pm` `/delivery-flow` | Start design & implementation flow |
.claude/commands/pm.md                       (削除対象本体)
```

非アクティブ（archive 済み・履歴メモ）:

```
docs/design-notes/archived/aphelion-init-and-help-commands.md:144   | `/pm` | Quick Delivery launch ... |
docs/design-notes/remove-pm-shortcut.md                              (本ファイル)
```

archived 配下は履歴アーカイブなので変更しない。

### 2.3 配布パスの確認

`bin/aphelion-agents.mjs` (`init` / `update` コマンド) は `.claude/` を `cp -r` で配布するだけで、コマンド一覧を別途列挙したインデックスファイルは持たない。よって `.claude/commands/pm.md` を削除すれば、新規 `init` でも既存ユーザの `update` でも `/pm` は自動的に消える（`update` は既存ファイルを上書きするだけで「ターゲット側にあって source に無いファイル」を能動削除しないため、既存ユーザの環境には残り続ける点に注意 — §4 参照）。

---

## 3. Proposed approach

### 3.1 ファイル削除

- `.claude/commands/pm.md` を削除する。

### 3.2 アクティブな参照の更新

| ファイル | 変更内容 |
|----------|---------|
| `.claude/commands/aphelion-help.md` | `## Shortcuts` 表から `/pm` 行を削除。残るのは `/aphelion-init` のみ。表の見出しはそのまま維持（`/aphelion-init` が単独で残るため）。 |
| `docs/wiki/ja/Home.md` (L49) | 「（要件が固まっている場合は `/pm`）」の括弧句を削除。`/discovery-flow` 単独の説明にする。 |
| `docs/wiki/ja/Getting-Started.md` (L152) | `/pm 連絡先管理のREST APIを作りたい` を `/delivery-flow 連絡先管理のREST APIを作りたい` に置換。直後の「または同等に: /delivery-flow」のブロックは冗長になるため削除。 |
| `docs/wiki/ja/Getting-Started.md` (L229) | コマンドリファレンス表から `/pm {説明}` 行を削除。 |
| `docs/wiki/en/Home.md` (L48) | "(or `/pm` if requirements are already clear)" を削除。 |
| `docs/wiki/en/Getting-Started.md` (L160) | `/pm I want to build a REST API …` を `/delivery-flow …` に置換。直後の "Or equivalently: /delivery-flow" ブロックを削除。 |
| `docs/wiki/en/Getting-Started.md` (L237) | コマンドリファレンス表から `/pm {description}` 行を削除。 |
| `README.ja.md` (L94) | `/pm TODOアプリを作りたい` を `/delivery-flow TODOアプリを作りたい` に置換。 |
| `README.ja.md` (L121) | コマンド一覧表セルを `` `/pm` `/delivery-flow` `` から `` `/delivery-flow` `` に変更。 |
| `README.md` (L100) | `/pm I want to build a TODO app` を `/delivery-flow I want to build a TODO app` に置換。 |
| `README.md` (L127) | コマンド一覧表セルを `` `/pm` `/delivery-flow` `` から `` `/delivery-flow` `` に変更。 |

### 3.3 archived / 設計ノートの扱い

- `docs/design-notes/archived/aphelion-init-and-help-commands.md` の `/pm` 言及は **当時の設計記録** であり改変しない（履歴アーカイブの不変性を保つ）。
- 本ファイル `docs/design-notes/remove-pm-shortcut.md` は `/pm` を扱う設計ドキュメントなので grep にヒットするのは正常。

### 3.4 既存ユーザへの影響

- `npx aphelion-agents update` を再実行したユーザの環境では、`.claude/commands/pm.md` は **そのまま残る** (`update` は source 側に無いファイルの能動削除を行わないため)。挙動は変わらず Delivery Flow が起動するので破壊的影響は無い。
- ただし新規 `init` ユーザには `/pm` が存在しなくなる。ドキュメント・wiki 上の表記は全て `/delivery-flow` に揃うため、「ドキュメントと環境のギャップ」が一部既存ユーザで生じうる。これは許容範囲（実害なし、`/aphelion-help` は新版で `/pm` を表示しなくなるため、ドキュメントとして見えなくなる方向で揃う）。
- 周知は CHANGELOG / リリースノートで「Removed: `/pm` shortcut. Use `/delivery-flow` (functionally identical).」と一行記載すれば十分。

---

## 4. Open questions

以下は本フェーズで判断を保留した項目。実装フェーズ（developer）に持ち越し、または別途確認する。

1. **既存ユーザ環境の旧 `pm.md` を `update` で能動削除すべきか？**
   現在の `bin/aphelion-agents.mjs` は overlay (上書き) のみで削除はしない。`/pm` が「実害なく動き続ける」ことは許容できるが、もし「ドキュメント記載と環境のずれを完全に消したい」なら、`update` コマンドに「source に存在しないファイルをターゲット側からも削除する」モードを追加する必要がある。本 issue ではスコープ外として扱い、必要なら別 issue で扱う方針を提案する。
2. **`/pm` の利用頻度に関する実データなし。**
   ユーザ memo では「すでに不要」との認識のみ。エイリアス維持のニーズは無いと解釈して進める。もしテレメトリ等で「`/pm` が実際に多用されている」と分かった場合は、削除ではなくドキュメント上の二重記載のみ整理する代替案に切り替える。
3. **`README.md` / `README.ja.md` の Command Reference 表で `/pm` `/delivery-flow` がセル内に併記されている件**：単純に `/pm ` を消すだけで OK だが、行全体を `/delivery-flow` のみに残す形で問題ないか。→ 提案ではそうする（§3.2）。

---

## 5. Document changes

### 削除

- `.claude/commands/pm.md`

### 編集（11 箇所、6 ファイル）

- `.claude/commands/aphelion-help.md` — Shortcuts 表から `/pm` 行削除
- `docs/wiki/ja/Home.md` — L49 括弧句削除
- `docs/wiki/ja/Getting-Started.md` — L152 コマンド置換 + 「または同等に」ブロック削除、L229 表行削除
- `docs/wiki/en/Home.md` — L48 括弧句削除
- `docs/wiki/en/Getting-Started.md` — L160 コマンド置換 + "Or equivalently" ブロック削除、L237 表行削除
- `README.ja.md` — L94 コマンド置換、L121 表セルから `/pm` 削除
- `README.md` — L100 コマンド置換、L127 表セルから `/pm` 削除

### 変更しない

- `SPEC.md`, `ARCHITECTURE.md`, `UI_SPEC.md` — 当該リポジトリには Aphelion 自身を運用するための SPEC.md は無く、また `/pm` は仕様レベルではなく配布スラッシュコマンドのレイヤなので影響なし。
- `docs/design-notes/archived/**` — 履歴アーカイブの不変性を保つ。
- `bin/aphelion-agents.mjs` — `.claude/` の構造変更は不要（ファイル削除だけで自動追従）。

---

## 6. Acceptance criteria

実装完了時、以下が全て満たされること:

1. `git ls-files .claude/commands/pm.md` の出力が空（ファイルが index から削除されている）。
2. アクティブパスでの参照が 0 件:
   ```bash
   grep -rn '/pm\b' .claude/ docs/wiki/ README.md README.ja.md
   ```
   出力が空であること。`docs/design-notes/remove-pm-shortcut.md`（本ファイル）と `docs/design-notes/archived/**` は grep 対象から除外して評価する。
3. `/aphelion-help` を起動した際の出力テーブルに `/pm` 行が含まれない（`.claude/commands/aphelion-help.md` をレンダリングした結果で確認）。
4. README / wiki の Command Reference 表が `/delivery-flow` のみを示し、矛盾なく読める。
5. `npx aphelion-agents init`（fresh clone を想定）した結果の `.claude/commands/` 配下に `pm.md` が存在しない。

---

## 7. Out of scope

- `/delivery-flow` 自体の機能拡張・命名見直し。
- `/pm` 以外の重複コマンド・エイリアスの整理（例: 他のショートカット候補の追加・削除）。
- `bin/aphelion-agents.mjs update` への「source に無いファイルをターゲットから削除するモード」の追加（§4.1）。必要なら別 issue を立てる。
- CHANGELOG.md の管理運用ルール変更（リリースノートに 1 行追記する程度はスコープ内）。
- 既存ユーザへの能動的な周知（Discord / メール等）。リリースノート記載のみで足りる前提。

---

## 8. Handoff brief for developer

### 作業概要

`/pm` スラッシュコマンドを廃止し、`/delivery-flow` への一本化に伴うドキュメント更新を行う。機能変更は無く、純粋な refactor / docs 作業。

### 推奨ブランチ名

`refactor/remove-pm-shortcut`

### 推奨コミット粒度（2 コミット案）

1. `refactor: remove /pm slash command file (#55)`
   - 削除: `.claude/commands/pm.md`
2. `docs: drop /pm references from help, README, and wiki (#55)`
   - 編集: `.claude/commands/aphelion-help.md`, `README.md`, `README.ja.md`, `docs/wiki/ja/Home.md`, `docs/wiki/ja/Getting-Started.md`, `docs/wiki/en/Home.md`, `docs/wiki/en/Getting-Started.md`

1 コミットにまとめても可（refactor の影響範囲が docs のみで完結するため）。プロジェクトの commit 慣習（Conventional Commits + `Co-Authored-By: Claude`）に従うこと。

### 検証手順

```bash
# 1. ファイル削除確認
git ls-files .claude/commands/pm.md       # 出力空であること

# 2. active path に /pm 参照が残っていないこと
grep -rn '/pm\b' .claude/ docs/wiki/ README.md README.ja.md \
  | grep -v 'docs/design-notes/'           # 出力空であること

# 3. aphelion-help.md のレンダリング確認 (目視)
cat .claude/commands/aphelion-help.md | grep -A2 'Shortcuts'

# 4. 配布物確認 (任意)
node bin/aphelion-agents.mjs --help        # CLI 自体の挙動が壊れていないこと
```

### PR 作成

- ベースブランチ: `main`
- タイトル例: `refactor: remove redundant /pm shortcut (#55)`
- 本文には `Closes #55` を含める。
- リリースノート 1 行案: `Removed: /pm shortcut. Use /delivery-flow (functionally identical).`

### 注意事項

- `docs/design-notes/archived/**` には触れない（履歴アーカイブ不変性）。
- `bin/aphelion-agents.mjs` は触らない（ファイル削除だけで配布物が自動更新される）。
- `update` 済み既存ユーザの環境に残る `pm.md` は本 PR では扱わない（§4.1）。
