> Last updated: 2026-06-14
> GitHub Issue: [#162](https://github.com/kirin0198/aphelion-agents/issues/162)
> Authored by: analyst-intake (2026-06-14)
> Next: analyst-core

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

## §5–8

（analyst-core が記入）
