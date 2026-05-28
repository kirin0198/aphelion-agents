<!-- analyst-handoff
ISSUE_NUMBER: 130
ISSUE_TITLE: 初期セットアップ改善 (7サブ課題バンドル)
ISSUE_URL: https://github.com/kirin0198/aphelion-agents/issues/130
ISSUE_TYPE: feature
ISSUE_SUMMARY: |
  セットアップ体験の7つのDX改善をバンドル。/aphelion-init必須化、/aphelion-check新設、
  既存PJ導線強化、npxキャッシュ自動化、--userフラグ説明、PRODUCT_TYPE事前確認、
  init未実行警告hook。
PLANNING_DOC: docs/design-notes/setup-improvement.md
MAINTENANCE_TIER: Minor
PLAN: Standard
HANDOFF_TO: developer
CURRENT_PR: PR-4
PHASING: |
  PR-1: ① /aphelion-init必須化 (feat/aphelion-init-mandatory) — merged (#142)
  PR-2: ⑥ /aphelion-check新設 (feat/aphelion-check) — merged (#143)
  PR-3: ④⑤ 既存PJ導線+--user説明 (feat/setup-docs-existing-project) — bilingual sync required
  PR-4: ② npxキャッシュ自動化 (feat/npx-cache-auto) — zero-dependency, use node:https
  PR-5: ③ PRODUCT_TYPE事前確認 (feat/rules-designer-product-type)
  PR-6: ⑦ init未実行警告hook (feat/init-warning-hook) — SessionStart hook, advisory-only
DOCS_UPDATED:
  - docs/design-notes/setup-improvement.md
ARCHITECT_BRIEF: not-needed
STATUS: complete
-->
> Last updated: 2026-05-28
> Update history:
>   - 2026-05-28: PR-3 merged (#145); CURRENT_PR → PR-4; add PR-4 design decisions appendix (課題②)
>   - 2026-05-17: Add sub-item ⑦ (init未実行警告hook) as PR-6; PR-1/PR-2 merged; CURRENT_PR → PR-3
>   - 2026-05-17: Inject analyst-handoff block; update agent count 39→42; all PRs developer-direct (no architect)
>   - 2026-05-15: Initial promotion from proposals/setup-improvement-memo.md
> GitHub Issue: [#130](https://github.com/kirin0198/aphelion-agents/issues/130)
> Authored by: analyst (2026-05-15)
> Promoted from: docs/design-notes/proposals/setup-improvement-memo.md
> Next: developer (current PR per `CURRENT_PR` in the analyst-handoff block above. All sub-items go directly to developer; architect not needed.)

# 初期セットアップ改善 (7 サブ課題のバンドル)

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
| ⑦ init 未実行警告 hook | 中 | PR-6 | developer (SessionStart hook 新設) |

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

### 課題⑦: init 未実行時の警告 hook の新設

**問題**
課題① で `/aphelion-init` を「必須」に格上げしたが、実行を強制する仕組みはドキュメント上の文言のみ。
`project-rules.md` が未生成のままフローを起動しても警告が出ず、各エージェントが
デフォルト値にフォールバックして品質ばらつきが生じる。課題① の「out of scope (deferred)」
として残していた orchestrator-level 警告を hook 層で実現する。

**対応方針**
- Claude Code の `SessionStart` event を使った新規 hook `aphelion-project-rules-check.sh` を新設
- セッション開始時に `.claude/rules/project-rules.md` の有無を確認
  - 存在しない場合: stderr に `/aphelion-init` 実行を促す警告を 1 度出力
  - **advisory-only**: 常に `exit 0`。セッション開始をブロックしない (hook A/B の `exit 2` とは異なる)
- 既存 hook 群 (A: secrets-precommit / B: sensitive-file-guard / E: deps-postinstall) と同じ
  配布方式 (`src/.claude/hooks/` → overlay copy) に従う
- `hooks-policy.md` に hook D (project-rules-check) として追記
- `docs/wiki/{en,ja}/Hooks-Reference.md` の hook 表に追加

**設計上の留意点 (edge case)**
- `--user` グローバルインストール時: グローバル `~/.claude/rules/project-rules.md` が
  存在する場合は警告を抑制するか検討 (誤検出回避)
- evaluation mode (お試し利用) の利用者には冗長になりうる → bypass 手段 (環境変数 or
  marker ファイル) の要否を実装時に判断
- `SessionStart` event の Claude Code サポート状況を実装着手時に確認

---

## 優先度

| 課題 | 優先度 |
|------|------|
| ①`/aphelion-init` の必須化 | 高 |
| ⑥`/aphelion-check` の新設 | 高 |
| ④既存プロジェクト導線強化 | 高 |
| ②npxキャッシュ自動化 | 中 |
| ⑤`--user` フラグ説明 | 中 |
| ⑦init 未実行警告 hook | 中 |
| ③PRODUCT_TYPE 事前確認 | 低 |

## 成果物（着手時に生成）

- `.claude/commands/aphelion-check.md`（新設・⑥ — PR-2 で対応済み）
- `bin/` スクリプトの update コマンド修正（②）
- `.claude/agents/rules-designer.md`（PRODUCT_TYPE 質問追加・③）
- `docs/wiki/en/Getting-Started.md`（④⑤の説明追加）
- First Run Walkthrough の改訂（① — PR-1 で対応済み）
- `src/.claude/hooks/aphelion-project-rules-check.sh`（新設・⑦）
- `src/.claude/settings.json`（SessionStart event 追加・⑦）
- `src/.claude/rules/hooks-policy.md`（hook D 追記・⑦）

---

## PR-4 設計判断 (課題② 着手時メモ)

> 追記日: 2026-05-28
> 着手前の analyst-core レビューにより、元方針の前提が distribution 形態と
> 不一致だったため、以下の設計判断を明文化する。

### 配布形態の再確認

- `package.json` は `"private": true`。npm registry には公開されていない。
- ユーザーへの推奨経路は **`npx github:kirin0198/aphelion-agents <command>`** (Getting-Started L40, L46-53 参照)。
- 「npx キャッシュ問題」が実際に発生するのは、npm が GitHub tarball を `_npx/` 配下にキャッシュし、
  `#main` などの ref を指定しない場合に古い tarball を再利用する状況。Getting-Started L56-58 に
  既に "Cache caveat" として手動回避手順 (`#main` ref pin / `npm cache clean --force`) が記載されている。

### リモートバージョン取得先

| 候補 | 採否 | 理由 |
|---|---|---|
| `https://registry.npmjs.org/aphelion-agents/latest` | **不採用** | パッケージは private; npm に公開されていない (404) |
| `https://raw.githubusercontent.com/kirin0198/aphelion-agents/main/package.json` | **採用** | 実際の配布元 (GitHub main branch) と一致。`node:https` のみで取得可能 |

### キャッシュクリア戦略

3 案を検討した結果、以下を採用する。

- **Approach B (採用)**: 差異検知 → 情報メッセージ + 手動コマンド案内 → 通常の update 処理を続行。
  - 利点: 再帰 npx 呼び出しなし、スクリプトの単純さを保つ、ユーザーが何が起きるかを完全に把握できる。
  - 出力例:
    ```
    ⚠ 新しいバージョンが利用可能です: aphelion-agents@0.3.7 → 0.4.0 (remote)
      現在のキャッシュには古い tarball が残っている可能性があります。
      最新版で再実行する場合:
        npm cache clean --force && npx github:kirin0198/aphelion-agents#main update
      （今回はキャッシュ済みバージョンで update を続行します）
    ```
- Approach A (再帰 npx 呼び出しによる自動再実行): 不採用。`spawn` で自プロセスを上書き再起動する
  挙動は cross-platform で fragile。ユーザーが「何が起きたか」を追跡しにくい。
- Approach C (毎回キャッシュクリア): 不採用。常に低速化し、オフライン update を破壊する。

### --force-refresh フラグ

将来拡張として `--force-refresh` を予約 (今回は実装しない)。
今回の PR ではバージョン差異検知時の advisory メッセージのみ実装し、ユーザーが手動で
キャッシュをクリアする経路を残す。フラグ導入は実利用フィードバックを待ってから判断する。

### ネットワーク失敗時の挙動

- リモート `package.json` 取得に失敗した場合 (DNS / オフライン / GitHub 障害):
  - **silent skip**: バージョン比較を行わず通常の update 処理を続行する。
  - stderr に 1 行 informational ログのみ (`バージョン確認をスキップしました (offline?)`)
  - update 本体は決して block しない。

### 実装上の注意点

- `node:https` の `GET` で `User-Agent` ヘッダ必須 (GitHub raw は UA なしで 403 を返す場合あり)。
- レスポンスは streaming で受け取り、`.on("data")` で chunk を蓄積、`.on("end")` で `JSON.parse`。
- タイムアウト 3 秒程度を設定 (`req.setTimeout(3000)`)。長時間ハングを防ぐ。
- ローカル version は既存の `getVersion()` を再利用 (新規ヘルパーは追加しない)。
- 「source: aphelion-agents@X.Y.Z → updated to X.Y.Z」の表示は、差異がない場合は単一 version
  表示 (現状の `source: aphelion-agents@${version}` を維持) で十分。差異がある場合のみ
  `→ X.Y.Z available` を append する。

### スコープアウト

- npm registry への publish (パッケージ private 解除) — 別議論。今回の PR では扱わない。
- `~/.npm/_npx/` を直接削除する処理 — npm の内部構造に依存しすぎる。`npm cache clean --force` 経由のみ。
