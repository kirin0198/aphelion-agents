# chore(i18n): convert residual Japanese strings in agent-emitted document templates

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#57](https://github.com/kirin0198/aphelion-agents/issues/57)

---

## 1. Background & Motivation

Aphelion の言語ルール（`src/.claude/rules/language-rules.md`）は次の不変条件を定めている。

- agent definition file（`.claude/agents/*.md`）は **English** 不変
- AGENT_RESULT block の key/value は **English** 不変
- ユーザ向け narrative は `Output Language` 設定に従う（`en` / `ja`）

しかし issue #40（archived `docs/design-notes/archived/ja-terminology-rebalance.md`）以降の英語化スイープでは、**agent definition file の散文（narrative）部分** の英訳に注力していた。その結果、次の盲点が残った。

> agent / rule ファイル内の **コードブロック（fenced markdown サンプル）として埋め込まれた、生成 doc の冒頭にコピーされる固定テンプレート文字列**

これらのテンプレートは agent が SPEC.md / ARCHITECTURE.md / TASK.md などのファイルを **書き出す際に literal string として複写** されるため、`Output Language: en` でも生成 doc に日本語ヘッダ（`> 最終更新:`, `## フェーズ:` など）が混入する。

ユーザの観察「ARCHITECTURE.md などのサブエージェントが出力する設計ドキュメントのテンプレートが日本語になっている」は、agent file 自身が日本語なのではなく、agent が読み込んでコピーする canonical rule (`document-versioning.md`) のテンプレート部が日本語であったことが根本原因。

これは `language-rules.md` の **Hybrid Localization Strategy** に照らせば「Fixed UI strings は dictionary 経由で参照するか、英語固定」とすべきカテゴリであり、現状は dictionary 化されていないために検出できなかった。

### 関連 PR / Issue 履歴

- #40 `ja-terminology-rebalance` — JA wiki / README narrative の用語整理（archived）
- #44 `.claude/rules/` autoload 化（rules を Claude Code が起動時に読み込む方式に）
- 現 issue #57 — **#40 の盲点を埋める** 残件処理

---

## 2. Current state

リポジトリ全体に対して以下の grep を実行し、ASCII 範囲外（Hiragana / Katakana / Han）を網羅的に検出した。

```bash
grep -rn -P "[\p{Hiragana}\p{Katakana}\p{Han}]" \
  /home/ysato/git/aphelion-agents/.claude/agents/ \
  /home/ysato/git/aphelion-agents/src/.claude/rules/
```

検出結果を以下の **4 カテゴリ** に分類する。

### カテゴリ A: テンプレート出力文字列（English 固定すべき／本 issue のスコープ）

これらは agent が生成する design doc の冒頭・骨格として **literal でコピーされる** 文字列。`Output Language: en` でも漏れる。

| ファイル | 行 | 文字列 | 用途 |
|---------|----|--------|------|
| `src/.claude/rules/document-versioning.md` | 8 | `> 最終更新: {YYYY-MM-DD}` | 全 design doc (SPEC/ARCHITECTURE/UI_SPEC/TEST_PLAN) 冒頭 |
| 〃 | 9 | `> 更新履歴:` | 〃 |
| 〃 | 10 | `>   - {YYYY-MM-DD}: {変更概要}` | 〃 |
| 〃 | 27 | `> 参照元: ARCHITECTURE.md ({バージョン or 最終更新日})` | TASK.md 冒頭 |
| 〃 | 29 | `## フェーズ: {フェーズ名}` | TASK.md セクション見出し |
| 〃 | 30 | `最終更新: {日時}` | TASK.md |
| 〃 | 31 | `ステータス: 進行中` | TASK.md |
| 〃 | 33 | `## タスク一覧` | TASK.md |
| 〃 | 36-37 | `- [ ] TASK-001: {タスク名} \| 対象ファイル: src/...` | TASK.md タスクエントリ |
| 〃 | 39 | `## 直近のコミット` | TASK.md |
| 〃 | 40 | `（タスク完了のたびに git log --oneline -3 を記録する）` | TASK.md（指示文。narrative としても英語化可） |
| 〃 | 42 | `## 中断時のメモ` | TASK.md |
| 〃 | 43 | `（セッション中断時に状況をここに記録する）` | TASK.md |
| `.claude/agents/analyst.md` | 97 | `` `TBD`, `?`, `不明`, `未定`, `なし`, `わからない`, empty string. `` | intake doc の TBD-forbidden センチネル列挙 |
| `.claude/agents/analyst.md` | 109 | `> 最終更新: <YYYY-MM-DD>` | design note 冒頭テンプレート（document-versioning.md の引用） |

### カテゴリ B: ja narrative 例示（仕様どおり、スコープ外）

`Output Language: ja` の振る舞いを **rule ファイル内で例示する** ための ja サンプルブロック。ja narrative であり、英語化すると例示の意味が失われる。

| ファイル | 行 | 文字列 | 種別 |
|---------|----|--------|------|
| `src/.claude/rules/user-questions.md` | 13-17 | AskUserQuestion JSON 内の `{具体的な質問文}` 等プレースホルダ | プレースホルダ例（`{}` 内は narrative） |
| `src/.claude/rules/user-questions.md` | 36 | `` `(推奨)` suffix `` | これは `localization-dictionary.md` の ja 値の参照説明 |
| `src/.claude/rules/user-questions.md` | 43-47 | `⏸ 確認事項があります` 等の Text Output Fallback 例 | ja 表示例（dictionary 値そのもの） |

### カテゴリ C: rules ファイル自身のメタデータ（スコープ外）

rules / agent ファイルそのものの `> 最終更新 / 更新履歴` ヘッダ。これは canonical doc 自体のメタデータ narrative。issue #57 のスコープは「agent が **生成する** doc」であり、canonical doc 自身の言語は別問題。

| ファイル | 行 | 文字列 |
|---------|----|--------|
| `src/.claude/rules/aphelion-overview.md` | 5-6 | `> 更新履歴:` / `>   - 2026-04-24: Maintenance Flow (第4フロー) を追加` |
| `src/.claude/rules/sandbox-policy.md` | 123-126 | `⚠️ 警告: このコマンドは sandbox-policy の ...` （Output Language=ja 時の警告例） |

### カテゴリ D: localization-dictionary.md の ja 列（仕様どおり、スコープ外）

`localization-dictionary.md` の ja 列に ja 値が入るのは設計どおり。English と ja の対応表である本ファイルは英訳対象ではない。

### 主要 agent 出力テンプレート部の検証

`architect.md`, `spec-designer.md`, `developer.md`, `ux-designer.md`, `test-designer.md`, `tester.md`, `reviewer.md`, `doc-writer.md` の Output File セクションを `grep -P "[\p{Hiragana}\p{Katakana}\p{Han}]"` で確認 → **ヒット 0 件**。すなわち agent file 内のテンプレートは既に英語化済みで、残るのは canonical rule ファイル（document-versioning.md）と analyst.md の 2 行のみ。

### `docs/wiki/DESIGN.md` について

ユーザ memo の「DESIGN.md が日本語」は `docs/wiki/DESIGN.md`（Aphelion 自身の wiki 情報アーキテクチャ設計メモ）を指すと考えられる。これは Aphelion リポジトリ自身の canonical narrative doc であり、bilingual wiki 戦略（#40）に従い ja 版が正規。Output Language=ja の本リポジトリでは ja で正しい。**本 issue のスコープではない**。

---

## 3. Proposed approach

`language-rules.md` の Hybrid Localization Strategy を **テンプレート出力にも徹底適用** する。

### 採用案: 案 C — テンプレート文字列は英語固定

| 案 | 概要 | 評価 |
|----|------|------|
| 案 A: ja 翻訳をキャッシュする hook を追加 | テンプレート二重管理。実装複雑 | 不採用 |
| 案 B: localization-dictionary.md にテンプレート用 i18n table を追加 | dictionary 肥大、key 参照のためにテンプレート可読性悪化 | 不採用 |
| **案 C: テンプレートはすべて英語固定** | 既存 Hybrid Localization Strategy と整合。Output Language=ja のユーザは生成後に narrative のみ ja で書く（既存挙動どおり） | **採用** |

### 案 C の根拠

- `language-rules.md` 既定の "Fixed UI strings" は静的 dictionary 経由 + 残りは Output Language で agent が生成、という二段構成。**テンプレート骨格は前者寄り** だが、現状 dictionary 化されていない。
- design doc のヘッダ（`> Last updated`, `> Update History`, `## Phase`, `## Tasks` など）は機械可読性も求められるため英語固定が望ましい。
- Output Language=ja のユーザは、骨格（英語）+ 内容記述（ja）という混在で問題ない（README.md などで既に同パターン）。

### 具体的な置換マッピング（案）

| 現在（ja） | 置換後（en） |
|-----------|-------------|
| `> 最終更新: {YYYY-MM-DD}` | `> Last updated: {YYYY-MM-DD}` |
| `> 更新履歴:` | `> Update history:` |
| `>   - {YYYY-MM-DD}: {変更概要}` | `>   - {YYYY-MM-DD}: {summary of change}` |
| `> 参照元: ARCHITECTURE.md ({バージョン or 最終更新日})` | `> Source: ARCHITECTURE.md ({version or last-updated date})` |
| `## フェーズ: {フェーズ名}` | `## Phase: {phase name}` |
| `最終更新: {日時}` | `Last updated: {timestamp}` |
| `ステータス: 進行中` | `Status: in-progress` |
| `## タスク一覧` | `## Task list` |
| `- [ ] TASK-001: {タスク名} \| 対象ファイル: src/...` | `- [ ] TASK-001: {task name} \| Target file: src/...` |
| `## 直近のコミット` | `## Recent commits` |
| `（タスク完了のたびに git log --oneline -3 を記録する）` | `(Record `git log --oneline -3` after each task completion.)` |
| `## 中断時のメモ` | `## Suspension notes` |
| `（セッション中断時に状況をここに記録する）` | `(Record session-suspension status here.)` |
| `analyst.md` L97: `不明`, `未定`, `なし`, `わからない` | `unknown`, `tbd`, `n/a`, `idk` （または英語版センチネル一式） |

> 注: ja narrative としての文字列（`localization-dictionary.md` の `ja` 列）は変更しない。Output Language=ja のユーザがテンプレートに narrative を追記する場合は ja でよい。

---

## 4. Open questions

1. **後方互換性**: 既存ユーザプロジェクトの `TASK.md` / `SPEC.md` などには `> 最終更新:` 形式のヘッダが残っている可能性がある。新規生成は英語ヘッダだが、既存 doc を読み取る side（`developer` が TASK.md を resume する処理）で `> Last updated:` / `> 最終更新:` のどちらにも match できるよう regex を寛容にすべきか、それとも一括移行に任せるか。
   - 推奨: **読み取り側は英語 prefix のみ認識**。既存 ja ヘッダは migration の問題としてユーザ任せ（doc-writer 側で警告のみ）。
2. **`analyst.md` L97 のセンチネル列挙**: ja センチネル（`不明`, `未定`, `なし`, `わからない`）は **ja Output Language でユーザが intake で書きそうな表現** を捕捉するためにある。英語化すると `Output Language: ja` 環境での検出力が下がる。
   - 案 C-1: ja 環境では ja センチネルも追加するロジックを `language-rules.md` に書く
   - 案 C-2: テンプレート列挙は英語固定とし、ja 環境では analyst が個別に判断
   - 推奨: **C-1**（dictionary 拡張で multi-locale センチネルを許容）
3. **`docs/wiki/DESIGN.md`**: 本 issue スコープ外と整理したが、もし「リポジトリ canonical doc は英語、ja は同期翻訳」という方針（#40）と矛盾するなら、別 issue で扱うべきか。
   - 推奨: **別 issue**。本 issue は agent-emitted template に限定。
4. **`document-versioning.md` の TASK.md フォーマット書き換えと既存 `/home/ysato/git/aphelion-agents/TASK.md`**: リポジトリ root に `TASK.md` が存在する。本変更により今後生成される TASK.md は英語化されるが、既存 TASK.md（おそらく ja）はどう扱うか。
   - 推奨: **既存 TASK.md は触らない**（developer が次の phase で reset する際に英語テンプレートで再生成される）。

---

## 5. Document changes

### 編集対象（developer phase）

1. **`src/.claude/rules/document-versioning.md`**
   - L8-10: design doc 冒頭メタデータブロックを英語化
   - L27-43: TASK.md フォーマット全体を英語化
   - 同期コピー先: `~/.claude/rules/document-versioning.md`（autoload 元のユーザ home）も合わせて更新する必要あり（installer 経由か手動か要確認）

2. **`.claude/agents/analyst.md`**
   - L97: TBD-forbidden センチネル列挙の ja 部分を Open question §4-2 の方針に従い処理
   - L109: `> 最終更新:` → `> Last updated:` に置換

3. **`src/.claude/rules/language-rules.md`**（追記）
   - "Hybrid Localization Strategy" セクションに以下を明記:
     > **Template skeleton strings (markdown headings, metadata blocks, task-list scaffolding) are English-fixed**, regardless of Output Language. Free-form narrative inside the template is generated in the resolved Output Language.

### 編集しないもの

- `localization-dictionary.md` ja 列（仕様どおり）
- `aphelion-overview.md` / `sandbox-policy.md` の ja 例示ブロック（rule の説明としての narrative）
- `user-questions.md` の Text Output Fallback 例（ja narrative 例示）
- `docs/wiki/DESIGN.md` および `docs/design-notes/*.md`（本 issue スコープ外）

---

## 6. Acceptance criteria

1. 以下の grep がゼロ件:

   ```bash
   grep -rn -P "[\p{Hiragana}\p{Katakana}\p{Han}]" \
     /home/ysato/git/aphelion-agents/src/.claude/rules/document-versioning.md
   ```

2. `analyst.md` 内の non-ASCII は **localization-dictionary.md key 参照 か narrative 説明文のみ**（テンプレート出力文字列はゼロ）。

3. `language-rules.md` に「テンプレート骨格は英語固定」の明示が追加されている。

4. （手動確認）`developer` agent が新規プロジェクトで TASK.md を生成すると、ヘッダが `## Phase:` / `## Task list` / `## Recent commits` 等の英語になる。Output Language=ja でも変わらない。

5. （手動確認）`spec-designer` / `architect` / `ux-designer` などが生成する SPEC.md / ARCHITECTURE.md / UI_SPEC.md の冒頭が `> Last updated: ...` / `> Update history:` の英語形式になる。

---

## 7. Out of scope

- 既に生成された **ユーザプロジェクト側の** ARCHITECTURE.md / SPEC.md / TASK.md の遡及修正（migration はユーザ責務）
- ユーザ向け narrative（説明文）の英語化 — Output Language で制御済み
- `docs/wiki/DESIGN.md` 等 Aphelion リポジトリ自身の bilingual wiki / canonical doc の言語方針見直し（必要なら別 issue）
- `localization-dictionary.md` の ja 列改訂
- `aphelion-overview.md` / `sandbox-policy.md` 内の ja 例示ブロックの英訳

---

## 8. Handoff brief for developer

### 着手手順

1. **準備**: 本設計ノート §2, §5 を読み、置換マッピング（§3）を確認。
2. **`src/.claude/rules/document-versioning.md` の英語化**:
   - §3 のマッピング表に従い L8-10, L27-43 を編集。
   - autoload 元（ユーザ home `~/.claude/rules/document-versioning.md`）にも同じ変更を適用。両者の同期は既存 install / sync スクリプト（`scripts/` 配下）で行うか、なければ developer が手動で 2 ファイル編集する。
3. **`.claude/agents/analyst.md` の修正**:
   - L97 のセンチネル列挙: §4 Open question 2 の方針に従う。default 推奨は C-1（ja センチネル維持 + 英語追加）だが、本 issue では **simpler な C-2（英語のみ）に倒し**、ja 環境対応は別 issue にする方が PR が小さくまとまる。最終判断は developer。
   - L109: `> 最終更新: <YYYY-MM-DD>` → `> Last updated: <YYYY-MM-DD>`
4. **`src/.claude/rules/language-rules.md` への追記**:
   - "Hybrid Localization Strategy" セクション末尾に "Template skeleton strings are English-fixed" の段落を追加。
5. **検証**: §6 Acceptance criteria の grep が 0 件であることを確認。
6. **コミット**: agent ファイル単位で逐次コミットしてもよい（`docs:` または `chore:` prefix）。

### コミット粒度の推奨

```
docs(rules): switch document-versioning.md template to English-fixed (#57)
docs(rules): clarify English-fixed template skeleton in language-rules.md (#57)
docs(agents): English-fix analyst.md template metadata (#57)
```

または 1 コミットにまとめても可（変更行数が少ないため）。

### 検証 grep（developer 実行用）

```bash
# テンプレート行ゼロ確認
grep -n -P "[\p{Hiragana}\p{Katakana}\p{Han}]" \
  /home/ysato/git/aphelion-agents/src/.claude/rules/document-versioning.md

# analyst.md 内 non-ASCII 残存確認
grep -n -P "[\p{Hiragana}\p{Katakana}\p{Han}]" \
  /home/ysato/git/aphelion-agents/.claude/agents/analyst.md
```

### Open questions に対する初期回答（developer 判断材料）

- §4-1 後方互換性: **読み取り側は英語のみ認識** で進める。
- §4-2 ja センチネル: **本 issue では英語化のみ**、ja 検出は別 issue。
- §4-3 wiki/DESIGN.md: **本 issue スコープ外**。
- §4-4 既存 TASK.md: **触らない**。

---

## Linked

- GitHub Issue: #57
- 関連 archived note: `docs/design-notes/archived/ja-terminology-rebalance.md` (#40)
- 関連 rule: `src/.claude/rules/language-rules.md`, `src/.claude/rules/localization-dictionary.md`, `src/.claude/rules/document-versioning.md`
