# Consolidate Aphelion documentation into .claude/rules/ (drop CLAUDE.md)

> 最終更新: 2026-04-23
> 関連 Issue: [#25](https://github.com/kirin0198/aphelion-agents/issues/25)
> ブランチ: `refactor/consolidate-rules-no-claude-md`
> Issue 分類: refactor
> 前段分析: analyst (agentId: a19733bc9f2a074f8)

## 1. ユーザー要件

Aphelion はリポジトリ直下の `.claude/CLAUDE.md` にワークフロー概要を配置し、さらに `rules-designer` を介してユーザープロジェクトのルートに `CLAUDE.md` を生成する二重構成を取っていた。しかし `CLAUDE.md` という名称は Claude Code 共通の汎用ファイル名であり、以下の問題がある。

- ユーザー個人の `~/.claude/CLAUDE.md` や他プロジェクトの `CLAUDE.md` と名前空間が衝突する
- ファイル名からは「Aphelion 由来か」「手書きか」を判別できない
- 「`.claude/rules/` に auto-load ルール群を集約している」という設計思想と矛盾する (オーバービューだけ `.claude/` 直下)

前段の analyst 分析で 4 つの選択肢を提示し、ユーザーは「抜本的対応 (案 A + 決定 2)」を選択した。本方針書はその決定事項を実装に落とし込む。

## 2. Issue 分類

**refactor** — 機能変更なし。ファイル配置とドキュメント生成ロジックの変更のみ。生成物 (`platforms/copilot/copilot-instructions.md` / `platforms/codex/AGENTS.md`) の実質内容は変わらないことを検証で担保する。

## 3. 選択肢比較 (analyst 前段の再掲)

| 案 | 内容 | 評価 |
|---|---|---|
| A | `.claude/CLAUDE.md` を `.claude/rules/aphelion-overview.md` に移動 | auto-load に統合できる。ただしプロジェクトルートの `CLAUDE.md` 生成は残る |
| B | `.claude/CLAUDE.md` をそのまま維持 | 現状維持。衝突リスク温存 |
| C | `.claude/aphelion.md` にリネーム (rules 配下には入れない) | 名称の区別はつくが auto-load されない |
| D | フラグで旧名残置 + 新名生成 | 併存期間が複雑化 |

### 決定

**案 A + 決定 2 (抜本的対応)**。プロジェクトルートの `CLAUDE.md` も廃止し、`rules-designer` の出力先を `.claude/rules/project-rules.md` に変更。`CLAUDE.md` という名称のファイルを Aphelion のプロダクト全体から消す。

## 4. 決定事項 (ユーザー承認済み 4 項目)

1. **新ファイル名**: `.claude/rules/aphelion-overview.md`
2. **ルート CLAUDE.md も廃止し rules に集約**
   - Aphelion 本体がプロジェクトルートに `CLAUDE.md` を生成する挙動を廃止
   - `rules-designer` は `.claude/rules/project-rules.md` に出力 (自動ロードされる)
   - 旧 `.claude/CLAUDE.md` → `.claude/rules/aphelion-overview.md` (自動ロード)
   - すべての Aphelion ルールは `.claude/rules/*.md` に集約
3. **移行通知**: CHANGELOG に移行先パスを明記 + wiki 更新のみ (スクリプト / 互換フラグは用意しない)
4. **実装タイミング**: PR #24 (`feat/typescript-cli`) マージ前に先行対応
   - CLI は `.claude/` 配下を丸ごとコピーする設計なので、この refactor 完了後にマージすれば新構成が自動配布される

## 5. 影響範囲

### 5.1 ファイル (移動)
- `.claude/CLAUDE.md` → `.claude/rules/aphelion-overview.md`

### 5.2 コード (ロジック変更)
- `scripts/generate.mjs`
  - L197 付近: `result.split('.claude/CLAUDE.md').join('.github/copilot-instructions.md')` → 新パス `.claude/rules/aphelion-overview.md` を対象に
  - L229-230 付近: `fs.readFileSync(path.join(CLAUDE_DIR, 'CLAUDE.md'), ...)` → `path.join(CLAUDE_DIR, 'rules', 'aphelion-overview.md')`
  - L331 付近: `result.split('.claude/CLAUDE.md').join('the global rules above')` → 新パス
  - L354-355 付近: Codex AGENTS.md 生成の読み込み元を新パスへ
  - ヘッダ置換 (L233, L365 の `# CLAUDE.md — Aphelion Workflow Common Rules`) は出力側のヘッダなのでそのまま維持 (Copilot / Codex の生成物の見出しはユーザーが直接見ないため、既存 UX と完全一致させる)

### 5.3 エージェント定義
- `.claude/agents/rules-designer.md`
  - frontmatter の `Output:` を `CLAUDE.md (project root)` → `.claude/rules/project-rules.md` に
  - 本文の「`.claude/CLAUDE.md` (Aphelion workflow rules) と分離」説明を削除 / 刷新
  - 「Claude Code が CLAUDE.md を自動ロードします」→「`.claude/rules/*.md` を自動ロードします」
  - 出力テンプレートのファイル名/ヘッダを `# Project Rules — {プロジェクト名}` 等に
  - AGENT_RESULT の `ARTIFACTS` を `.claude/rules/project-rules.md` に
- `platforms/copilot/agents/rules-designer.agent.md` は `scripts/generate.mjs` の再実行で追随

### 5.4 ドキュメント
- `README.md` / `README.ja.md`
  - L158 付近のディレクトリ構成図: `├── CLAUDE.md` を削除 / `aphelion-overview.md` を `.claude/rules/` 配下に追加
  - 本文で `.claude/CLAUDE.md` を参照している箇所の書き換え
- `docs/wiki/en/` 配下
  - `Home.md`, `Platform-Guide.md`, `Rules-Reference.md`, `Architecture.md`, `Agents-Reference.md` (`rules-designer` 節)
- `docs/wiki/ja/` 配下
  - 上記 en ページに対応する 5 ページ
- `docs/wiki/DESIGN.md`
- 既存 issues ログ (`docs/issues/unify-scripts-to-node.md`, `docs/issues/wiki-architecture-diagrams.md`) は履歴として保全。過去の記述にある `.claude/CLAUDE.md` は歴史的事実として残す

### 5.5 CHANGELOG
- `CHANGELOG.md` に `## [Unreleased]` セクションを追加 (または既存があれば追記)
- 移行先パス、削除されたパス、ユーザーアクション (なし — CLI 配布物が自動で追随) を明記

### 5.6 スコープ外
- PR #24 の CLI 実装変更
  - CLI は `.claude/` 配下を reciprocal に丸ごとコピーする設計
  - 本 refactor の完了後は新構成 (`.claude/rules/aphelion-overview.md`) がそのまま配布されるだけ
  - CLI 側に個別の変更は不要
- SPEC.md / ARCHITECTURE.md の作成 (本件は Delivery スコープ外の内部 refactor)

## 6. 実装計画

### Phase 1: `.claude/CLAUDE.md` → `.claude/rules/aphelion-overview.md`
**目的**: auto-load 対象への移動

**作業**:
1. `git mv .claude/CLAUDE.md .claude/rules/aphelion-overview.md`
2. 移動したファイルの冒頭にヘッダ追加:
   ```markdown
   # Aphelion Workflow Overview

   > **Last updated**: 2026-04-23
   > **Auto-loaded**: Yes — placed in `.claude/rules/`, loaded by Claude Code on every session start
   ```
   (タイトル行は `CLAUDE.md — Aphelion Workflow Overview` → `Aphelion Workflow Overview` に調整)
3. 本文は保持。`orchestrator-rules` への言及 (`.claude/orchestrator-rules.md`) はパス変更なしのためそのまま

**検証**: ファイルが `.claude/rules/` 配下に存在し、`.claude/CLAUDE.md` が消えていること

**コミット**: `refactor: move .claude/CLAUDE.md to .claude/rules/aphelion-overview.md`

---

### Phase 2: `scripts/generate.mjs` 更新
**目的**: 機械参照を新パスに更新しつつ、生成物の実質同一性を保つ

**作業**:
1. L229-230 の読み込みパス変更: `'CLAUDE.md'` → `path.join('rules', 'aphelion-overview.md')`
2. L354-355 の読み込みパス変更: 同上
3. L197 / L331 の `.split('.claude/CLAUDE.md')` を `.split('.claude/rules/aphelion-overview.md')` に
4. 生成物ヘッダ (`# CLAUDE.md — Aphelion Workflow Common Rules`) は `# Aphelion Workflow Common Rules` に整理 (CLAUDE.md 名称を全生成物から消すため)
5. 読み込むファイルの先頭ヘッダが Phase 1 で `# Aphelion Workflow Overview` に変わるので、置換ロジックの old 文字列も整合性を取る

**検証**:
- `node scripts/generate.mjs --clean && node scripts/generate.mjs` が正常終了
- `git diff platforms/copilot/copilot-instructions.md` と `git diff platforms/codex/AGENTS.md` が「タイトル行のみ」あるいは「実質的に同一」となること
- 他の本文・章構成に差がないこと

**コミット**: `refactor: update generate.mjs to read aphelion-overview.md`

---

### Phase 3: `rules-designer` の挙動変更
**目的**: プロジェクト固有ルールの出力先を `.claude/rules/project-rules.md` に切替

**作業** (`.claude/agents/rules-designer.md`):
1. frontmatter:
   - `description` の「generates a CLAUDE.md for the target project」→「generates `.claude/rules/project-rules.md` for the target project」
   - `Output: CLAUDE.md (project root)` → `Output: .claude/rules/project-rules.md`
2. Mission セクション:
   - 「The output `CLAUDE.md` is placed at the project root — separate from `.claude/CLAUDE.md` (Aphelion workflow rules). Claude Code loads both files automatically.」
   - → 「The output `.claude/rules/project-rules.md` is placed alongside other auto-loaded rules in `.claude/rules/`. Claude Code loads every `.md` file in this directory automatically on session start.」
3. Step 3: 「Generate CLAUDE.md」→「Generate `.claude/rules/project-rules.md`」
4. Step 4 の承認文言も合わせて `project-rules.md` に
5. 「## Output File: `CLAUDE.md` (Project Root)」セクション見出しを `## Output File: .claude/rules/project-rules.md` に変更
6. テンプレート先頭を `# CLAUDE.md — {プロジェクト名}` → `# Project Rules — {プロジェクト名}` に
7. `AGENT_RESULT` の `ARTIFACTS` 行を `.claude/rules/project-rules.md` に

**検証**: 記述に残存する `CLAUDE.md` 参照がないこと (grep で 0 件)

**コミット**: `refactor: redirect rules-designer output to .claude/rules/project-rules.md`

---

### Phase 4: README / wiki / DESIGN.md 更新
**目的**: ユーザー向けドキュメントの整合性確保

**作業**:
1. `README.md` L158 付近のディレクトリツリーから `├── CLAUDE.md` 行を削除し、`.claude/rules/` 配下に `├── aphelion-overview.md` を追加
2. `README.ja.md` も同様
3. `docs/wiki/en/` 以下のファイル:
   - `Home.md`: `.claude/CLAUDE.md` への言及を `.claude/rules/aphelion-overview.md` に
   - `Platform-Guide.md`: 同上 + 「ルートに CLAUDE.md は生成されない」旨を追記
   - `Rules-Reference.md`: `aphelion-overview.md` を rules 一覧に追加 (auto-load 対象として)
   - `Architecture.md`: `rules-designer` の出力先説明更新
   - `Agents-Reference.md`: `rules-designer` の Output 欄更新
4. `docs/wiki/ja/` の対応 5 ページも同様
5. `docs/wiki/DESIGN.md`: `.claude/CLAUDE.md` 参照を書き換え
6. 再生成される `platforms/copilot/agents/rules-designer.agent.md` は Phase 5 のコミットに含める

**検証**:
- `grep -r 'CLAUDE.md' README*.md docs/` が歴史的 issue 以外 0 件
- wiki 内部リンクが切れていないこと (相対パスの手動確認)

**コミット**: `docs: update README and wiki for rules consolidation`

---

### Phase 5: 生成物の再生成
**目的**: Phase 3 の rules-designer 変更を platforms/ に反映

**作業**:
1. `node scripts/generate.mjs --clean && node scripts/generate.mjs`
2. `platforms/copilot/` と `platforms/codex/` の差分確認
3. 想定外の変更がないこと (ヘッダ整理 + rules-designer の出力先変更 のみ)

**検証**: `git diff platforms/` が Phase 2 の検証で予期した範囲に収まる

**コミット**: `chore: regenerate platform files`

---

### Phase 6: CHANGELOG + 最終検証

**作業**:
1. `CHANGELOG.md` に `## [Unreleased]` セクション追加:
   ```markdown
   ## [Unreleased]

   ### Changed
   - `.claude/CLAUDE.md` を `.claude/rules/aphelion-overview.md` に移動 (auto-load 対象に統合)
   - `rules-designer` の出力先をプロジェクトルート `CLAUDE.md` から `.claude/rules/project-rules.md` に変更

   ### Removed
   - プロジェクトルートの `CLAUDE.md` 生成を廃止 (他 Claude Code 環境との名前空間衝突を回避)

   ### Migration
   - 既存プロジェクトで手書きの `CLAUDE.md` をルートに置いている場合は `.claude/rules/project-rules.md` への移設を推奨 (任意)
   - CLI 配布物は自動的に新構成になるため、個別のマイグレーションスクリプト実行は不要
   ```
2. 最終 `node scripts/generate.mjs --clean && node scripts/generate.mjs` で全体整合確認
3. `grep -rn 'CLAUDE.md' . --include='*.md' --exclude-dir=node_modules --exclude-dir=dist` を実行し、残存箇所が「歴史的 issue 記録」と CHANGELOG 内の説明文のみであることを確認

**コミット**: `docs: add unreleased CHANGELOG entry for consolidation`

---

## 7. コミット戦略

| # | prefix | メッセージ | 対象 |
|---|---|---|---|
| 1 | refactor | `move .claude/CLAUDE.md to .claude/rules/aphelion-overview.md` | `.claude/CLAUDE.md` → `.claude/rules/aphelion-overview.md` |
| 2 | refactor | `update generate.mjs to read aphelion-overview.md` | `scripts/generate.mjs` |
| 3 | refactor | `redirect rules-designer output to .claude/rules/project-rules.md` | `.claude/agents/rules-designer.md` |
| 4 | docs | `update README and wiki for rules consolidation` | `README*.md`, `docs/wiki/**`, `docs/wiki/DESIGN.md` |
| 5 | chore | `regenerate platform files` | `platforms/**` |
| 6 | docs | `add unreleased CHANGELOG entry for consolidation` | `CHANGELOG.md` |

**ルール**:
- 個別 `git add` のみ (`git add -A` 禁止)
- 各コミット末尾に `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` 追記
- PR 作成は本フェーズでは不要 (developer 完了後に別途)

## 8. developer 向け受入条件

- [ ] `.claude/CLAUDE.md` が存在しない
- [ ] `.claude/rules/aphelion-overview.md` が存在し `> **Auto-loaded**: Yes` ヘッダを持つ
- [ ] `scripts/generate.mjs` 内に `CLAUDE.md` リテラルが残っていない (出力ヘッダ整理も含む)
- [ ] `.claude/agents/rules-designer.md` の出力先が `.claude/rules/project-rules.md` になっている
- [ ] `node scripts/generate.mjs --clean && node scripts/generate.mjs` が成功する
- [ ] `platforms/copilot/copilot-instructions.md` および `platforms/codex/AGENTS.md` の本文が実質同等である (タイトル行の `# CLAUDE.md — ...` → `# Aphelion ...` 以外の差分なし)
- [ ] README / wiki / DESIGN.md の `.claude/CLAUDE.md` 参照が除去されている (歴史的 issue ログ除く)
- [ ] CHANGELOG に移行エントリがある
- [ ] 6 個のコミットに分割され、それぞれが単一責任を保っている

## 9. リスクと対策

| リスク | 対策 |
|---|---|
| 生成物の差分が想定より大きい | Phase 2 で diff を注視し、本文意味が変わっていたらヘッダ置換ロジックを再調整 |
| wiki のリンク切れ | Phase 4 で相対パスを目視確認。sync-wiki 実行は別作業で検証 |
| ユーザー既存プロジェクトの `CLAUDE.md` 誤消去 | CLI は `.claude/` 配下のみ同期する設計。ルート `CLAUDE.md` に触れないことを確認済み |
| rules-designer の旧エージェント呼び出し履歴が壊れる | 過去の INTERVIEW_RESULT / 生成済み CLAUDE.md には遡及しない (新規呼び出しから適用) |
