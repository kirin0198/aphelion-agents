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
CURRENT_PR: PR-6
PHASING: |
  PR-1: ① /aphelion-init必須化 (feat/aphelion-init-mandatory) — merged (#142)
  PR-2: ⑥ /aphelion-check新設 (feat/aphelion-check) — merged (#143)
  PR-3: ④⑤ 既存PJ導線+--user説明 (feat/setup-docs-existing-project) — merged (#145)
  PR-4: ② npxキャッシュ自動化 (feat/npx-cache-auto) — merged (#147)
  PR-5: ③ PRODUCT_TYPE事前確認 (feat/rules-designer-product-type) — merged (#148)
  PR-6: ⑦ init未実行警告hook (feat/init-warning-hook) — current (FINAL; #130 closeable after merge)
DOCS_UPDATED:
  - docs/design-notes/setup-improvement.md
ARCHITECT_BRIEF: not-needed
STATUS: in-progress
-->
> Last updated: 2026-05-30
> Update history:
>   - 2026-05-30: PR-5 merged (#148); CURRENT_PR → PR-6 (FINAL); add PR-6 design decisions appendix (課題⑦, SessionStart spec + decisions A-G)
>   - 2026-05-30: PR-4 merged (#147); CURRENT_PR → PR-5; add PR-5 design decisions appendix (課題③)
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

---

## PR-5 設計判断 (課題③ 着手時メモ)

> 追記日: 2026-05-30
> 着手前の analyst-core レビューにより、現状の PRODUCT_TYPE フローを再確認し、
> 「rules-designer で質問追加」というメモの正確な作業範囲を以下に明文化する。

### 現状フローの再確認

PRODUCT_TYPE は現状以下の経路で決まる:

1. **Discovery Flow 経由**: `interviewer` が triage Round 2 で質問 → `INTERVIEW_RESULT.md`
   と `DISCOVERY_RESULT.md` に記録 → `spec-designer` が `SPEC.md` に転記。
   `rules-designer` は INTERVIEW_RESULT.md から PRODUCT_TYPE を抽出する (現行 L33)。
2. **既存リポジトリ経由**: `codebase-analyzer` が指標 (バイナリ/ライブラリ構造) から
   推測 → `SPEC.md` に記録 (codebase-analyzer.md L299-310)。
3. **フローオーケストレーターの読み取り**: 各 flow は `DISCOVERY_RESULT.md` /
   `DELIVERY_RESULT.md` / `SPEC.md` から PRODUCT_TYPE を読む。`project-rules.md`
   からは現状 **読んでいない** (`grep -rn "PRODUCT_TYPE" .claude/` で確認済み;
   project-rules.md 参照は 0 件)。

### 課題の本質再定義

メモの「インストール直後にユーザーが PRODUCT_TYPE を意識しないまま `/discovery-flow`
を起動できる」は、より厳密には次のケースを指す:

- **standalone `/aphelion-init` 実行時**: INTERVIEW_RESULT.md が存在せず、
  rules-designer が PRODUCT_TYPE を抽出する経路がない。Discovery を経由しない
  ユーザー (既存 PJ への aphelion 後付け導入など) では PRODUCT_TYPE が永続的に
  記録されない。
- 結果: maintenance-flow / operations-flow が SPEC.md 経由で PRODUCT_TYPE を読もうと
  しても、SPEC.md がまだ無いケースでフォールバック先が無く、暗黙的に `service`
  扱いになるか、エラー停止する。

→ 解決策: **`project-rules.md` に PRODUCT_TYPE を canonical かつ long-lived な
場所として記録する**。Discovery 経由で確定済みの値があれば rules-designer は
追加質問せずに引き継ぎ、無ければ rules-designer が単独で質問する。

### 設計判断 A: project-rules.md 内の配置

**採用**: 既存の `## Project Overview` セクションに `Product Type:` 行を追加する。

```markdown
## Project Overview

{1–3 line summary from INTERVIEW_RESULT.md}

Product Type: {service | tool | library | cli}
```

- 採用理由: Project Overview はプロジェクトの根幹属性を記す自然な意味的配置。
  新規セクションを増やすより既存構造への組み込みが望ましい。
- 不採用案: 専用 `## Product` セクションを新設する → セクション増殖を避けるため却下。
- 不採用案: `## Tech Stack` 内に含める → PRODUCT_TYPE は tech stack より上位概念なので不適切。

### 設計判断 B: 既存 project-rules.md に PRODUCT_TYPE が無い場合のフォールバック

**採用**: 読み手 (各 flow orchestrator) は以下の優先順位で PRODUCT_TYPE を解決する。

```
1. DISCOVERY_RESULT.md (Discovery Flow セッション中のみ)
2. SPEC.md
3. project-rules.md (新規追加)
4. default: service (フルパイプライン許容で最も安全)
```

- 採用理由: 既存読み取り経路 (1, 2) を維持しつつ、3 を低位フォールバックとして
  追加。既存 PJ で project-rules.md にも未記載のレガシー状態でも、`service`
  デフォルトでフルパイプラインが動くため破壊的変更にならない。
- 不採用案: 「project-rules.md に PRODUCT_TYPE が無ければエラー停止」→ 既存ユーザーの
  プロジェクトを破壊するため不採用。

### 設計判断 C: 自動検出 vs 質問のみ

**採用**: 質問のみ (pure ask-only)。

- 採用理由: rules-designer は対話エージェントであり、自動検出ロジックを追加すると
  責務が膨らむ。`codebase-analyzer` が既に自動推測機能を持っており、機能重複を避ける。
- 例外: INTERVIEW_RESULT.md が存在し PRODUCT_TYPE が抽出可能な場合は、それを
  デフォルト選択肢として確認 (現行の "Skip question if already determined" パターンに
  従う)。
- 推奨デフォルト (INTERVIEW_RESULT.md 無し時): `service`。最も一般的でフル
  パイプラインが動くため。

### 設計判断 D: フローオーケストレーター側の plumbing 範囲

**採用**: ドキュメント追記のみ。個別 orchestrator ファイルへの読み取りロジック
追加は最小限。

具体的には次のスコープ:

| ファイル | 変更内容 |
|---|---|
| `.claude/agents/rules-designer.md` | Round 0 を "Project Overview" に拡張し PRODUCT_TYPE 質問を追加 / Output template に Product Type 行を追加 / Skip 条件 (INTERVIEW_RESULT.md で既に決定済みの場合) を明記 |
| `.claude/rules/aphelion-overview.md` | "Branching by Product Type" 表の直下に "PRODUCT_TYPE Resolution Order" 小節を追加し、4 段フォールバックを明文化 |
| `.claude/agents/maintenance-flow.md` | "## PRODUCT_TYPE" セクション (L233) のソース順を「SPEC.md → project-rules.md → default service」に更新 |
| `.claude/agents/operations-flow.md` | startup validation (L39) の PRODUCT_TYPE 確認に「DELIVERY_RESULT.md に無い場合は project-rules.md を fallback として読む」を追記 |

- **変更しないファイル**:
  - `interviewer.md` — Discovery セッションで PRODUCT_TYPE を取得する責務は維持
    (Discovery Flow は最も早い PRODUCT_TYPE 確定経路として残す)
  - `discovery-flow.md` — triage Round 2 の質問は維持 (ただし rules-designer が
    project-rules.md に書き込む経路ができる)
  - `delivery-flow.md` — 現行は DISCOVERY_RESULT.md / SPEC.md 経由で読んでおり、
    Discovery 経由のケースでは PRODUCT_TYPE が必ず手に入るため fallback 不要
  - `codebase-analyzer.md` — 自動推測機能はそのまま維持。書き込み先に
    project-rules.md を追加するかは PR スコープ外 (codebase-analyzer は
    SPEC.md / ARCHITECTURE.md 専門エージェントとする原則を維持)
  - 残りの orchestrator (`doc-flow.md` 等) — PRODUCT_TYPE 直接参照なし

- 採用理由: 課題③ の本質は「rules-designer が PRODUCT_TYPE を ask & record する」
  ことであり、全 orchestrator を書き換える話ではない。最小修正で意味のある
  改善を達成する。
- 不採用案: 全 5 orchestrator に project-rules.md からの読み取りコードを追加する
  → 過剰スコープ。実害がある経路 (Discovery を経由しない maintenance-flow と
  operations-flow standalone 実行) のみ修正する。

### rules-designer 修正詳細

**Round 0 を "Project Overview" に拡張** (現行は "Repository" 単独質問):

```json
{
  "questions": [
    {
      "question": "What type of artifact will this project produce?",
      "header": "Product Type",
      "options": [
        {"label": "service (recommended)", "description": "Network service: Web API, web app, microservice. Operations Flow will run."},
        {"label": "tool", "description": "Locally running utility (GUI / TUI). Operations Flow skipped."},
        {"label": "library", "description": "Library / SDK consumed by other code. Operations Flow skipped."},
        {"label": "cli", "description": "Command-line tool. Operations Flow skipped."}
      ],
      "multiSelect": false
    },
    {
      "question": "Where will the project's remote repository be hosted?",
      "header": "Remote repository",
      "options": [
        {"label": "GitHub (recommended)", "description": "GitHub.com or GHES — uses gh CLI for PR/issue ops"},
        {"label": "GitLab", "description": "..."},
        {"label": "Gitea / Forgejo", "description": "..."},
        {"label": "local-only", "description": "..."},
        {"label": "none", "description": "..."}
      ],
      "multiSelect": false
    }
  ]
}
```

- 2 質問を 1 つの `AskUserQuestion` バッチで提示する (Aphelion の max 4 questions
  ルールに収まる)。
- PRODUCT_TYPE 質問はスキップ条件: INTERVIEW_RESULT.md / POC_RESULT.md /
  既存 SPEC.md のいずれかに PRODUCT_TYPE が記載されている場合、その値を提示して
  確認するのみ (新規質問なし)。
- Output Template の `## Project Overview` セクションに `Product Type:` 行を
  追加 (template L266 周辺)。

### バックワード互換性

- 既存プロジェクトの `project-rules.md` には Product Type 行が無い。これは
  設計判断 B のフォールバック (default: service) で吸収される。
- ユーザーが `npx aphelion-agents update` を実行しても project-rules.md は
  保護対象 (`hooks-policy.md` § 4.2 と同様の方針) のため、自動マイグレーション
  は行わない。次回 `/aphelion-init` 実行時に明示的に再構築される。

### スコープアウト

- `codebase-analyzer` が PRODUCT_TYPE を project-rules.md にも書き込むようにする
  → 別 PR で検討。現行は SPEC.md 専門。
- 既存 project-rules.md への自動マイグレーションコマンド → 別 PR (`/aphelion-check`
  で警告を出すのが妥当か検討)。
- 全 flow orchestrator への project-rules.md PRODUCT_TYPE 読み取りロジック追加
  → 設計判断 D により対象を 2 ファイルに絞る。
- `discovery-flow.md` Round 2 の PRODUCT_TYPE 質問削除 → Discovery 経由の最初の
  確定経路として維持。重複質問にはならない (rules-designer は INTERVIEW_RESULT.md
  経由で受け取り、再質問しない)。

---

## PR-6 設計判断 (課題⑦ 着手時メモ)

> 追記日: 2026-05-30
> 着手前の analyst-core レビュー。#130 バンドルの最終 PR (PR-1〜PR-5 = #142/#143/#145/#147/#148 マージ済み)。
> 本 PR マージ後に #130 をクローズ可能。

### SessionStart event 仕様の確定 (claude-code-guide で検証済み — 再調査不要)

実装着手時に確認すべきとしていた「SessionStart の Claude Code サポート状況」(課題⑦ 留意点)
を確定させた。

1. **イベント名**: `SessionStart` (大文字 S、ハイフンなし)。`settings.json` の top-level
   `hooks.SessionStart` 配列に登録する。**matcher フィールドは無い** (PreToolUse/PostToolUse
   を使う hook A/B/E とは異なる)。
2. **stdin JSON**: `cwd` (絶対パス)、`source` (`startup`|`resume`|`clear`|`compact`)、
   `session_id`、`hook_event_name`、`model` を含む。
3. **出力**: stderr はユーザーに直接表示される。**非ゼロ exit は非ブロッキング**
   (セッション開始をブロックできない)。stdout を JSON 形式で
   `hookSpecificOutput.additionalContext` として返すと Claude のコンテキストに注入される
   (本 hook では未使用 — stderr 通知のみ)。
4. **発火タイミング**: 4 ソース (startup/resume/clear/compact) すべてで発火。`source`
   フィールドでフィルタ可能。
5. **留意点**: 60s タイムアウト / CLAUDE.md・memory ロードの **前** に実行 / hook は
   subprocess で動くため `PWD` でなく JSON の `cwd` を使う。

### 設計判断 (A-G)

advisory-only (常に `exit 0`) は **hard requirement**。以下は推奨採用 (analyst-core 判断)。
トレードオフのある A/C/D/E は親エージェント経由でユーザー確認に出す。

| ID | 判断項目 | 採用方針 | 根拠 |
|----|---------|---------|------|
| A | source フィルタ | `startup` のみで警告 | `/clear`・`/compact` のたびに警告するのは冗長。`resume` は既に作業中で導入済み前提。`source != "startup"` なら静かに `exit 0` |
| B | JSON パース | bash-only (`grep`/`sed`)、python3 非依存 | 既存 A/B/E は全て bash + grep/sed で実装 (hook E L30-33 の `command` 抽出パターンを踏襲)。依存を増やさない |
| C | global チェック | `${cwd}/.claude/rules/project-rules.md` のみ確認 | `--user` global インストール時の `~/.claude/rules/project-rules.md` は確認しない。known limitation として hooks-policy.md に明記。HOME 展開を避け bash-only を維持 |
| D | bypass 機構 | 環境変数 `APHELION_SKIP_RULES_CHECK=1` を PR-6 に含める | 評価利用 (お試し) 者向けに冗長さを抑制。実装コスト小。設定時は冒頭で `exit 0` |
| E | settings.json merge | hooks-policy.md §4 に limitation 明記 (update コマンド改修は defer) | `npx aphelion-agents update` は既存 settings.json を保護 (§4.2) → 既存ユーザーは SessionStart ブロックを自動取得できない。fresh init のみ取得。手動追記手順を §4 に記載。bin/ 改修はスコープ拡大のため別途 |
| F | hook ID | `D` | A/B/E のみ使用中、C/D は予約スキップ済み。リポジトリ全文 grep で D 未使用を確認。planning doc 課題⑦ の指定とも一致 |
| G | 警告文 (英語) | 下記ドラフト確定 | hook stderr は英語 (hook 規約)。`[aphelion-hook:project-rules-check]` prefix を A/B/E と統一 |

**G: 警告文ドラフト (developer はこの文面を実装に使う)**

```
[aphelion-hook:project-rules-check] No project-rules.md found at .claude/rules/project-rules.md.
  Aphelion agents will fall back to defaults (Output Language: en, Co-Authored-By: enabled,
  Remote type: github) which may not match this project.
  Recommended: run /aphelion-init to generate project-rules.md for this repository.
  (This is an advisory only; it never blocks session start.)
  To silence this check, set APHELION_SKIP_RULES_CHECK=1 in your environment.
```

### exit semantics (hook D)

hook E と同形 (advisory-only)。

- `0` — 常に。`project-rules.md` 不在で警告を出した場合も、存在して何もしない場合も、
  `source != startup` でスキップした場合も、`APHELION_SKIP_RULES_CHECK=1` でスキップした
  場合もすべて `exit 0`。
- `1` — スクリプト内部エラー (`trap ERR` で捕捉 → `exit 0` に fall-through、fail-open)。
- `2` — **使用しない** (SessionStart は非ゼロでもブロックしないが、規約上 advisory hook は
  ブロック意図を持たない)。

### 成果物 (developer 着手リスト)

| 操作 | ファイル | 内容 |
|------|---------|------|
| CREATE | `src/.claude/hooks/aphelion-project-rules-check.sh` | hook E をテンプレートに、bash-only。`set -euo pipefail` + `trap ERR`→exit0、stdin から `source`/`cwd` を grep/sed 抽出、`APHELION_SKIP_RULES_CHECK` 確認、`source==startup` 以外スキップ、`${cwd}/.claude/rules/project-rules.md` 不在時に G の警告を stderr 出力、常に exit 0 |
| EDIT | `src/.claude/settings.json` | top-level `hooks.SessionStart` 配列を新設。matcher 無し。`type: command` / `command: ${CLAUDE_PROJECT_DIR}/.claude/hooks/aphelion-project-rules-check.sh` |
| EDIT | `src/.claude/rules/hooks-policy.md` | §2 表に hook D 行追加 (Event=SessionStart, Matcher=—, Block?=No (exit 0 + stderr), Bypass=`APHELION_SKIP_RULES_CHECK=1`) / §2.4 hook D 詳細サブセクション (Purpose/Operation/Exit semantics/stderr format、A/B/E と同形式) / §3 bypass 表に D 行 / §4 distribution note に settings.json merge limitation 追記 (既存ユーザー手動追記手順) / 冒頭 update history 行追加 |
| EDIT | `docs/wiki/en/Hooks-Reference.md` | TOC に Hook D 追加、Hook E の後に `## Hook D — aphelion-project-rules-check` セクション (Script/Event=SessionStart/Matcher=none/Activates on=session start (startup source)/Blocks=No、What it does/Bypass)。bilingual sync 必須 |
| EDIT | `docs/wiki/ja/Hooks-Reference.md` | en と同一構造で日本語訳追加 (見出し skeleton は英語固定、本文のみ和訳)。language-rules.md §3.2 により同一 PR で必須同期 |

### スコープアウト (PR-6)

- `bin/` の update コマンド改修 (新 hook 検知案内) → 設計判断 E により defer。既存ユーザーへの
  周知は hooks-policy.md §4 の手動追記手順で代替。
- global `~/.claude` チェック → 設計判断 C により known limitation。
- agent 数は 42 のまま変更しない (hook は agent ではない)。
