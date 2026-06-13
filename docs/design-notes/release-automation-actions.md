> Last updated: 2026-06-14
> GitHub Issue: [#162](https://github.com/kirin0198/aphelion-agents/issues/162)
> Authored by: analyst-intake (2026-06-14); §5-8 by analyst-core (2026-06-14)
> Next: architect

<!-- analyst-handoff
planning_doc_path: docs/design-notes/release-automation-actions.md
slug: release-automation-actions
branch_name: feat/release-automation-actions
issue_url: https://github.com/kirin0198/aphelion-agents/issues/162
issue_number: 162
issue_title: feat: GitHub Actions によるリリース自動化
issue_type: feature
intake_summary: |
  【背景・動機】
  現状はリリース管理が CHANGELOG のみで行われており、GitHub Release 機能が未活用。
  また「設計ノートアーカイブ ↔ CHANGELOG ↔ Wiki」の整合性を人手で担保しており、
  更新漏れが起きやすい構造になっている。旧案（スキル方式 maintainer-release）は
  `.claude/` 配下での混同問題・手動実行・強制力なしの課題があり破棄。
  GitHub Actions 方式を採用することで構造的に問題を解決する。

  【目標・完了条件】
  (1) GitHub Release 機能でリリースを視覚化する。
  (2) タグ push 時に release.yml が「archived 設計ノート ↔ CHANGELOG ↔ Wiki」整合性を
      CIゲートとしてチェックし、漏れがあればリリースを止める。
  (3) Wiki に Release-Notes.md（en/ja）を公開する。
  役割分担: 検出・実行は GitHub Actions（機械的）、判断・文章生成は Claude Code（手元）。

  【スコープ】
  .github/workflows/release.yml 新規作成、scripts/check-changelog-sync.sh 新規作成、
  docs/wiki/en/Release-Notes.md / docs/wiki/ja/Release-Notes.md 新設。
  既存 archive-closed-plans.yml との連携。スキル方式（maintainer-release）は対象外。
proposals_source: docs/design-notes/proposals/release-automation-memo.md
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# GitHub Actions によるリリース自動化

## §1 背景・動機

現状のリリース管理は CHANGELOG のみで運用されており、以下の課題がある。

- **GitHub Release 未活用**: リリースの視覚化ができておらず、ユーザーや貢献者が確認しにくい
- **整合性担保が人手依存**: 設計ノートアーカイブ・CHANGELOG・Wiki の3者間の更新漏れを人手で防ぐしかない構造
- **旧案（スキル方式）の問題**: 当初 `.claude/` 配下に `maintainer-release` スキルを追加する案を検討したが、以下の理由で破棄
  - `.claude/` 内での混同問題（対症療法にしかならない）
  - 手動実行で強制力なし
  - 再現性が手元環境依存

GitHub Actions 方式を採用することでこれらを構造的に解決する。`.github/workflows/` は配布対象外であることが自明で、既存の `archive-closed-plans.yml` と同じ CI 文化に乗ることができる。

### スキル方式 vs Actions 方式 比較

| 観点 | スキル（旧案・破棄） | GitHub Actions（採用） |
|------|------|------|
| 混同問題 | 名前で回避（対症療法） | `.claude/` に存在しない（根本解決） |
| 自動化 | 手動実行 | タグ push でトリガー・自動 |
| 強制力 | なし | CIゲートにでき、漏れたらリリース不可 |
| 再現性 | 手元環境依存 | GitHub 上で一貫 |
| 既存CIとの整合 | — | archive-closed-plans.yml と同じ仕組み |

---

## §2 目標・受け入れ基準

### 目標

1. **GitHub Release の視覚化**: タグ push → `gh release create` で自動的に Release ページを作成
2. **整合性チェック CIゲート**: タグ push 時に archived 設計ノートと CHANGELOG の突合を行い、漏れがあればリリースを止める
3. **Wiki リリースノート公開**: CHANGELOG 内容を `docs/wiki/en/Release-Notes.md` / `docs/wiki/ja/Release-Notes.md` に自動反映

### 受け入れ基準

- [ ] `v*` パターンのタグ push で `release.yml` が起動する
- [ ] archived 設計ノートの `> GitHub Issue: #N` を突合キーとして CHANGELOG エントリの有無を検証し、漏れがあれば CI が fail する
- [ ] CI pass 後に GitHub Release が作成される
- [ ] Release Notes ページが Wiki に追加される
- [ ] 漏れ検出時のフロー（開発者が CHANGELOG 追記 → 再 push → CI pass → リリース成立）が機能する

### 役割分担

| 処理 | 性質 | 担当 |
|------|------|------|
| 漏れの検出（archive ↔ CHANGELOG 突合） | 機械的 | GitHub Actions |
| 漏れの解消（CHANGELOG 追記） | 判断・文章生成 | Claude Code（開発者手元・doc-writer 等） |
| SemVer 判定 | 判断 | タグ名で明示（案A）|
| tag 作成・gh release | 機械的 | GitHub Actions |
| Wiki リリースノート公開 | 機械的 | GitHub Actions |

---

## §3 スコープ

### 対象（in-scope）

- `.github/workflows/release.yml` — タグ push トリガーのリリース自動化ワークフロー（新規）
- `scripts/check-changelog-sync.sh` — archived 設計ノート ↔ CHANGELOG 突合スクリプト（新規）
- `docs/wiki/en/Release-Notes.md` — Wiki リリースノート英語版（新設）
- `docs/wiki/ja/Release-Notes.md` — Wiki リリースノート日本語版（新設）
- 既存 `.github/workflows/archive-closed-plans.yml` との連携確認

### 対象外（out-of-scope）

- スキル方式（`maintainer-release`）— 破棄済み、`.claude/` 配下への追加なし
- `doc-reviewer` の役割範囲（設計ドキュメント間整合性）との重複なし
- リリース前の CHANGELOG 追記作業そのもの（開発者 or Claude Code が手動対応）

### リリースフロー

```
開発者がリリースタグを push（例: v1.2.0）
    ↓
GitHub Actions（release.yml）:
  Step 1: 整合性チェック（CIゲート）
    - docs/design-notes/archived/ の設計ノートを列挙
    - 各ヘッダーの `> GitHub Issue: #N` をキーに CHANGELOG.md と突合
    - 漏れがあれば fail（リリースを止める）
  Step 2: tag に基づき gh release 作成
  Step 3: CHANGELOG 該当セクションをリリースノート化
  Step 4: Wiki の Release-Notes.md（en/ja）を更新
```

### SemVer の扱い

- **案A（採用ベース）**: 開発者が `v1.2.0` を push する形で人間が確定（シンプル）
- **案B（将来）**: Actions が前タグからの差分・archive 内容から major/minor/patch を提案

---

## §4 制約・未解決事項

### 制約

- 突合キーは設計ノートヘッダーの `> GitHub Issue: #N` — この形式を維持する必要がある（既存 archive-closed-plans.yml も同形式を前提）
- GitHub Actions の `GITHUB_TOKEN` 権限で `wiki` リポジトリへの push が必要（Wiki が別 repo の場合はトークン設定が必要）
- リリース対象の CHANGELOG フォーマットは既存形式に合わせる

### 初回タスク（着手時の前提作業）

既存の archived 設計ノートと CHANGELOG の乖離を解消してから初回リリースを行う流れになる。
現時点で archived 設計ノートに対応する CHANGELOG エントリが欠落しているものがある可能性があり、
整合性チェックスクリプト導入後に一度棚卸しが必要。

### 依存関係

- #160 / #161 への依存なし（独立案件）
- 既存 `archive-closed-plans.yml` の動作を前提とする（破壊しない）

### 未解決事項

- Wiki への自動 push に使う認証方式（`GITHUB_TOKEN` 標準スコープ vs PAT）の確認が必要
- `scripts/check-changelog-sync.sh` の具体的な突合ロジック詳細（analyst-core フェーズで設計）
- リリースノートの自動生成フォーマット（CHANGELOG セクション全体 or 要約）
- 案B（SemVer 自動提案）の採用タイミング

---

## §5 詳細分析（analyst-core）

> Updated: 2026-06-14 (GitHub Actions によるリリース自動化)

コードベース実調査により以下を確認した。

### 既存 CI 文化との整合

既存ワークフローと連携・流儀を踏襲する。

| 既存資産 | 役割 | 本件との関係 |
|----------|------|--------------|
| `.github/workflows/archive-closed-plans.yml` | PR open 時に `Closes #N` で設計ノートを `archived/` へ移動 | 移動された archived ノートが本件の突合対象になる。前段として依存 |
| `.github/workflows/archive-orphan-plans.yml` | merge 後の孤児設計ノートを archive | 同じ grep 正準表現を使用 |
| `.github/workflows/check-readme-wiki-sync.yml` | README ↔ Wiki 整合の advisory CI | per-page parity は強制しない → Release-Notes.md 追加で壊れない |
| `scripts/check-archive-match.sh` | archive grep 表現の回帰テスト | **正準 grep 表現の単一ソース。新スクリプトはこれを再利用する** |
| `scripts/sync-wiki.mjs` | `docs/wiki/{en,ja}/*.md` を全 glob して Starlight サイトへ発行 | Release-Notes.md を両ロケールに置けば自動公開される |

### 突合キーの正準表現（再利用必須）

`check-archive-match.sh` / 両 archive ワークフローで char-for-char 同期されている正準表現を再利用する。

```
^>[[:space:]]*(GitHub Issue:|Issue)[[:space:]]*\[?#${n}\b
| ^[[:space:]]*ISSUE_NUMBER:[[:space:]]*${n}\b
| ^[[:space:]]*ISSUE_URL:.*/issues/${n}\b
```

行頭アンカーにより prose / テーブルセル内の `#N` 誤マッチを防ぐ。新スクリプトでもこの慣習（char-for-char 同期コメント）を踏襲する。

### CHANGELOG の現状

- `CHANGELOG.md` は `## [Unreleased]` セクションのみ。バージョン付きセクション（`## [vX.Y.Z]`）は皆無。
- issue 参照形式は `(#N)`。

### 【最重要制約】既存の archive ↔ CHANGELOG 乖離 20 件

調査結果（2026-06-14 時点）:

- archived 設計ノートでヘッダーから issue 番号を抽出できたもの: **47 件**
- CHANGELOG に `(#N)` 参照がある issue: **53 件**
- **archived だが CHANGELOG に参照が無い issue: 20 件**
  → #40 #42 #59 #65 #71 #73 #77 #84 #89 #94 #105 #108 #109 #114 #130 #141 #146 #150 #156 #158

含意: 「全 archived ノートに CHANGELOG エントリ必須」という素朴な CI ゲートは**初回から即 fail する**。
突合は **リリースウィンドウ（前タグ〜今回タグの差分に含まれる archived ノート）にスコープ**しなければならない。
初回リリース前にこの 20 件を棚卸しするか、あるいは差分スコープにより構造的に回避するかは architect が設計する。

---

## §6 アプローチ詳細

### 成果物

| ファイル | 種別 | 内容 |
|----------|------|------|
| `.github/workflows/release.yml` | 新規 | `v*` タグ push トリガーのリリース自動化 |
| `scripts/check-changelog-sync.sh` | 新規 | リリースウィンドウにスコープした archive ↔ CHANGELOG 突合 |
| `docs/wiki/en/Release-Notes.md` | 新設 | リリースノート英語版（canonical） |
| `docs/wiki/ja/Release-Notes.md` | 新設 | リリースノート日本語版（同 PR 同期） |
| `docs/wiki/{en,ja}/Home.md` | 更新 | Table of Contents に Release-Notes へのリンク追記 |

### release.yml フロー（案A: SemVer はタグ名で人間確定）

```
開発者が v1.2.0 を push
    ↓
release.yml:
  Step 1: check-changelog-sync.sh（CI ゲート）
          - リリースウィンドウ内の archived ノートを列挙
          - 各 `> GitHub Issue: #N` をキーに CHANGELOG と突合
          - 漏れがあれば fail（リリースを止める）
  Step 2: gh release create（タグ名ベース）
  Step 3: CHANGELOG 該当セクション → リリースノート化
  Step 4: Wiki Release-Notes.md（en/ja）更新
```

### 漏れ検出時のフロー

```
Actions が漏れを検出して fail
  → 開発者が手元で Claude Code を使い CHANGELOG を追記（doc-writer 等）
  → 再 push → CI pass → リリース成立
```

「更新漏れがあるとそもそもリリースできない」強制力が生まれる。

### doc-reviewer との役割分離

- doc-reviewer: 設計ドキュメント間整合（SPEC.md ↔ ARCHITECTURE.md 等）
- release.yml: リリース文書間整合（archive ↔ CHANGELOG ↔ Wiki）
- 対象が異なり重複しない。

---

## §7 ドキュメント変更

| ドキュメント | 変更 | 理由 |
|--------------|------|------|
| SPEC.md | no change（不在） | 本件は CI/リリース基盤であり、機能仕様 UC の追加対象外 |
| UI_SPEC.md | no change（不在） | UI なし |
| ARCHITECTURE.md | no change（不在） | architect が必要に応じて判断（本リポジトリは Aphelion 自身でありアプリ ARCHITECTURE.md を持たない） |

bilingual sync: `Release-Notes.md` en/ja および `Home.md` TOC は同一 PR で同期する（language-rules.md §"Repo-root README sync convention" に準じた wiki Bilingual Sync Policy）。

---

## §8 architect への引き継ぎ

architect が設計すべき未解決事項:

1. **突合スクリプトのスコープ設計（最重要）**: リリースウィンドウ（前タグ〜今回タグの git 差分に含まれる archived ノートのみ）に限定するか、archive 全体を対象に既存 20 件を許容リスト化するか。前者を推奨（既存乖離を構造的に回避）。
2. **release.yml のトークン権限**: GitHub Release 作成（`contents: write`）と、Wiki Release-Notes.md コミットの認証方式。本リポジトリの Wiki は `docs/wiki/` 配下のリポジトリ内ファイルであり別 Wiki repo ではないため、`GITHUB_TOKEN` 標準スコープで足りる見込み（PAT 不要）。
3. **リリースノート自動生成フォーマット**: CHANGELOG セクション全体をそのまま転記するか、要約するか。
4. **既存資産の再利用**: `scripts/check-archive-match.sh` の正準 grep 表現を再利用し、char-for-char 同期コメントの慣習を踏襲すること。`check-changelog-sync.sh` にも回帰テストを設けるのが既存流儀。
5. **初回リリース前の棚卸し**: 既存 20 件の archive↔CHANGELOG 乖離をどう扱うか（差分スコープなら不要、archive 全体スコープなら初回タスク化）。
6. **SemVer**: 案A（タグ名で人間確定）を採用。案B（自動提案）は将来拡張。

### 設計制約（不変）

- 突合キーは設計ノートヘッダー `> GitHub Issue: #N` 形式（既存 archive ワークフローと共有。変更不可）。
- `.github/workflows/` および `scripts/` は npm 配布対象外であることが自明。
- 既存 archive-closed-plans.yml の動作を破壊しないこと（archived/ への移動は前段依存）。
