# 設計メモ: リリース自動化（GitHub Actions 方式）

> ステータス: 設計確定・未着手
> 着手予定: 任意のタイミング
> 経緯: 当初スキル方式（maintainer-release）を検討したが、GitHub Actions 方式に転換
> 関連: CHANGELOG/Wiki の更新漏れ問題の構造的解決を兼ねる

---

## 目的

1. GitHub の Release 機能を使い、リリースを視覚化する（現状は CHANGELOG のみで管理）
2. リリース時に「設計ノートアーカイブ ↔ CHANGELOG ↔ Wiki」の整合性をチェックし、更新漏れを防ぐ
3. Wiki にリリースノートを公開する

---

## スキル方式から Actions 方式への転換理由

| 観点 | スキル（旧案） | GitHub Actions（採用） |
|------|------|------|
| 混同問題 | 名前で回避（対症療法） | `.claude/` に存在しない（根本解決） |
| 自動化 | 手動実行 | タグ push でトリガー・自動 |
| 配布除外 | 除外ルール要検討 | `.github/workflows/` は配布対象外が自明 |
| 強制力 | なし | CIゲートにでき、漏れたらリリース不可 |
| 再現性 | 手元環境依存 | GitHub 上で一貫 |
| 既存CIとの整合 | — | archive-closed-plans.yml と同じ仕組み |

**スキル方式は破棄。** Actions が混同問題を構造的に消し、CIゲートとして更新漏れに強制力を持たせられる。

---

## 役割分担: 「検出と実行は Actions、判断は Claude Code」

GitHub Actions は機械的処理は得意だが、文章生成・判断は苦手。
そのため処理を2層に分ける。

| 処理 | 性質 | 担当 |
|------|------|------|
| 漏れの検出（archive ↔ CHANGELOG 突合） | 機械的 | GitHub Actions |
| 漏れの解消（CHANGELOG 追記） | 判断・文章生成 | Claude Code（開発者手元・doc-writer 等） |
| SemVer 判定 | 判断 | タグ名で明示 or Actions が前タグから提案 |
| tag 作成・gh release | 機械的 | GitHub Actions |
| Wiki リリースノート公開 | 機械的 | GitHub Actions |

---

## リリースフロー

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

### 漏れ検出時のフロー

```
Actions が漏れを検出して fail
    ↓
開発者が手元で Claude Code を使い CHANGELOG を追記（doc-writer 等）
    ↓
再度 push → Actions が通る → リリース成立
```

これにより「更新漏れがあるとそもそもリリースできない」強制力が生まれる。

---

## 整合性チェックの突合キー

- 設計ノートヘッダーの `> GitHub Issue: #N` を共通キーにする
- issue 番号で「archive 設計ノート ↔ CHANGELOG エントリ」を機械的に紐付け
- この突合はシェル/スクリプトで実装可能（AI 判断不要）

---

## SemVer の扱い

2案あり、着手時に選択する。

- **案A: タグ名で明示** — 開発者が `v1.2.0` を push する形で人間が確定（シンプル）
- **案B: Actions が提案** — 前タグからの差分・archive 内容から major/minor/patch を提案

案A をベースに、将来的に案B の提案機能を足すのが現実的。

---

## 既存 Actions との関係

`.github/workflows/archive-closed-plans.yml`（既存・issue クローズ時に設計ノートを archive へ移動）と連携。

```
archive-closed-plans.yml（既存）: issue クローズ → 設計ノートを archived/ へ
release.yml（新規）: タグ push → archived/ を CHANGELOG と突合 → リリース
```

既存の CI 文化に自然に乗る。

---

## doc-reviewer との役割分離

- doc-reviewer: 設計ドキュメント間の整合性（SPEC.md ↔ ARCHITECTURE.md 等）
- release.yml: リリース文書間の整合性（archive ↔ CHANGELOG ↔ Wiki）
- 対象が異なるため重複しない。

---

## 成果物（着手時に生成）

- `.github/workflows/release.yml`（新規・リリース自動化）
- 整合性チェックスクリプト（`scripts/check-changelog-sync.sh` 等・archive ↔ CHANGELOG 突合）
- `docs/wiki/en/Release-Notes.md` / `docs/wiki/ja/Release-Notes.md`（リリースノート公開先・新設）

## 補足

- 初回は既存の archive 済み設計ノート（token-reduction / agent-definition-simplification 等）と
  CHANGELOG の乖離を解消してからリリースする流れになる（更新漏れの解消が初回タスク）
- スキル方式（maintainer-release）は破棄したため、`.claude/` 配下への追加は不要
