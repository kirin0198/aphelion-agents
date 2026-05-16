<!-- analyst-handoff
ISSUE_NUMBER: 130
ISSUE_TITLE: 初期セットアップ改善 (6サブ課題バンドル)
ISSUE_URL: https://github.com/kirin0198/aphelion-agents/issues/130
ISSUE_TYPE: feature
ISSUE_SUMMARY: |
  セットアップ体験の6つのDX改善をバンドル。/aphelion-init必須化、/aphelion-check新設、
  既存PJ導線強化、npxキャッシュ自動化、--userフラグ説明、PRODUCT_TYPE事前確認。
PLANNING_DOC: docs/design-notes/setup-improvement.md
MAINTENANCE_TIER: Minor
PLAN: Standard
HANDOFF_TO: developer
CURRENT_PR: PR-1
PHASING: |
  PR-1: ① /aphelion-init必須化 (feat/aphelion-init-mandatory)
  PR-2: ⑥ /aphelion-check新設 (feat/aphelion-check) — developer-direct, no architect
  PR-3: ④⑤ 既存PJ導線+--user説明 (feat/setup-docs-existing-project) — bilingual sync required
  PR-4: ② npxキャッシュ自動化 (feat/npx-cache-auto) — zero-dependency, use node:https
  PR-5: ③ PRODUCT_TYPE事前確認 (feat/rules-designer-product-type)
DOCS_UPDATED:
  - docs/design-notes/setup-improvement.md
ARCHITECT_BRIEF: not-needed
STATUS: complete
-->
> Last updated: 2026-05-17
> Update history:
>   - 2026-05-17: Inject analyst-handoff block; update agent count 39→42; all PRs developer-direct (no architect)
>   - 2026-05-15: Initial promotion from proposals/setup-improvement-memo.md
> GitHub Issue: [#130](https://github.com/kirin0198/aphelion-agents/issues/130)
> Authored by: analyst (2026-05-15)
> Promoted from: docs/design-notes/proposals/setup-improvement-memo.md
> Next: developer (current PR per `CURRENT_PR` in the analyst-handoff block above. All sub-items go directly to developer; architect not needed.)

# 初期セットアップ改善 (6 サブ課題のバンドル)

本書は user 起票の proposal を analyst が promotion したもの。
proposal 段階で「設計確定・未着手」と評価されていたため、内容は元メモを保持し、
ヘッダのみ標準フォーマットへ書き換えている。

## 実装フェージング

| サブ課題 | 優先度 | 想定 PR | 次エージェント |
|---|---|---|---|
| ① `/aphelion-init` 必須化 | 高 | PR-1 | developer (CLI + walkthrough 修正) |
| ⑥ `/aphelion-check` 新設 | 高 | PR-2 | developer (新 slash command 設計) |
| ④ 既存プロジェクト導線強化 | 高 | PR-3 | developer (wiki Getting-Started 拡張) |
| ② npx キャッシュ自動化 | 中 | PR-4 | developer (bin/ スクリプト修正) |
| ⑤ `--user` フラグ説明 | 中 | PR-3 と同梱可 | developer (wiki) |
| ③ PRODUCT_TYPE 事前確認 | 低 | PR-5 | developer (rules-designer 質問追加) |

---

## 課題と対応方針

### 課題①: `/aphelion-init` の必須化

**問題**
現状「Step 1.5（推奨）」として任意扱い。スキップされると全エージェントがデフォルト値で動作し品質にばらつきが生じる。

**対応方針**
- First Run Walkthroughで「Step 1（必須）」に格上げ
- `init` コマンド実行後に `/aphelion-init` の実行を促すメッセージを表示
- `rules-designer` が未実行の場合、各フロー起動時に警告を出す

---

### 課題②: npxキャッシュ問題の自動化

**問題**
`update` 実行時にキャッシュが古い場合、ユーザーが手動で `npm cache clean --force` を実行する必要がある。気づかずに古いバージョンを使い続けるリスクがある。

**対応方針**
- `update` コマンド内でリモートの `package.json` バージョンとローカルのバージョンを自動比較
- 差異がある場合は自動でキャッシュクリアして再取得
- 実行後に「source: aphelion-agents@X.Y.Z → updated to X.Y.Z」を表示して確認できるようにする

---

### 課題③: PRODUCT_TYPE の事前確認

**問題**
インストール直後にユーザーが PRODUCT_TYPE を意識しないまま `/discovery-flow` を起動できる。Operations フローのスキップ有無に影響する重要な設定。

**対応方針**
- `/aphelion-init`（rules-designer）の質問項目に PRODUCT_TYPE を追加
  - `service / tool / library / cli` から選択
- 選択結果を `project-rules.md` に記録
- 各フローオーケストレーターが `project-rules.md` から PRODUCT_TYPE を読み取れるようにする

---

### 課題④: 既存プロジェクトへの導入フロー強化

**問題**
Quick Startが新規プロジェクト前提の記述中心。既存プロジェクト導入時の手順（codebase-analyzerを先に走らせるべきか等）のガイダンスが薄い。

**対応方針**
- Getting Started に「既存プロジェクト向けクイックスタート」セクションを独立して追加
- 導入フローを明示:
  ```
  1. npx init
  2. /aphelion-init
  3. /codebase-analyzer  ← SPEC.md/ARCHITECTURE.md がない場合
  4. /analyst または /maintenance-flow
  ```
- SPEC.md の有無で分岐するフローチャートをドキュメントに追加

---

### 課題⑤: `--user` フラグの使い分け説明

**問題**
グローバルインストール（`~/.claude/`）とプロジェクトローカルインストールの使い分け基準が不明確。`project-rules.md` がグローバルに置かれると意図しない挙動になる可能性がある。

**対応方針**
- Getting Started に使い分けガイドを追加:

  | ケース | 推奨 |
  |------|------|
  | 特定プロジェクトで使う | `init`（プロジェクトローカル） |
  | 複数プロジェクトで共通利用 | `init --user`（グローバル） |
  | project-rules.md を使う | 必ずプロジェクトローカル |

- `init --user` 実行時に「project-rules.md はプロジェクトごとに設定してください」という注意を表示

---

### 課題⑥: ヘルスチェックコマンド（`/aphelion-check`）の新設

**問題**
セットアップ後に正しく設定されているかを確認する手段がない。ファイル配置・hooks設定・gh CLI認証・Claude Code バージョンを一括確認できるコマンドが必要。

**対応方針**
- `/aphelion-check` コマンドを新設
- チェック項目:
  - [ ] `.claude/agents/` に42ファイルが存在するか
  - [ ] `.claude/rules/aphelion-overview.md` が存在するか
  - [ ] `.claude/rules/project-rules.md` が存在するか（未設定の場合は警告）
  - [ ] hooks 設定が有効か（`.claude/settings.json` 確認）
  - [ ] `gh auth status` が通るか
  - [ ] `git` が使えるか
  - [ ] `docker info` が通るか（sandbox-runner の container モード用）
- チェック結果をサマリー表示し、問題があれば対処方法を案内

---

## 優先度

| 課題 | 優先度 |
|------|------|
| ①`/aphelion-init` の必須化 | 高 |
| ⑥`/aphelion-check` の新設 | 高 |
| ④既存プロジェクト導線強化 | 高 |
| ②npxキャッシュ自動化 | 中 |
| ⑤`--user` フラグ説明 | 中 |
| ③PRODUCT_TYPE 事前確認 | 低 |

## 成果物（着手時に生成）

- `.claude/commands/aphelion-check.md`（新設）
- `bin/` スクリプトの update コマンド修正（②）
- `.claude/agents/rules-designer.md`（PRODUCT_TYPE 質問追加・③）
- `docs/wiki/en/Getting-Started.md`（④⑤の説明追加）
- First Run Walkthrough の改訂（①）
