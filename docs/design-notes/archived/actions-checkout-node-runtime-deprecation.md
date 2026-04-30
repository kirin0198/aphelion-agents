> Last updated: 2026-04-30
> GitHub Issue: [#89](https://github.com/kirin0198/aphelion-agents/issues/89)
> Analyzed by: analyst (2026-04-29, re-analyzed 2026-04-30)
> Next: developer (ready to bump)

## 1. Problem statement

PR #88 が追加した `.github/workflows/check-readme-wiki-sync.yml` の CI 実行で、
`actions/checkout@v4` が依存している Node.js 20 ランタイムについて GitHub から
非推奨警告が出力された。当初 (2026-04-29 分析) は GitHub 側の後継版公開を
待つ watch-and-wait issue として open していたが、2026-04-30 の再分析で
**安定した後継版が既に存在する** ことを確認したため、actionable に昇格させる。

## 2. Current state evidence

### 2.1 Repo 内 pin (変更不要分は無し)

`grep -rn "actions/checkout\|actions/setup-node\|actions/cache\|actions/upload-artifact\|actions/download-artifact" .github/workflows/` の結果:

- `.github/workflows/check-readme-wiki-sync.yml:48` → `uses: actions/checkout@v4`
- `.github/workflows/archive-closed-plans.yml:39` → `uses: actions/checkout@v4`

repo 内の Node 系 action pin は上記 2 ファイルの `actions/checkout@v4` のみ。
`setup-node` / `cache` / `upload-artifact` / `download-artifact` は未使用。

### 2.2 Upstream (`actions/checkout`) の最新状況 — 2026-04-30 確認

`gh api repos/actions/checkout/releases` で取得:

| Tag      | Released   | Runtime  | Status                |
|----------|------------|----------|-----------------------|
| `v6.0.2` | 2026-01-09 | node24   | latest stable         |
| `v6.0.1` | 2025-12-02 | node24   | stable                |
| `v6.0.0` | 2025-11-20 | node24   | stable                |
| `v5.0.1` | 2025-11-17 | node24   | stable                |
| `v4.3.1` | 2025-11-17 | (node20) | last v4 line          |

`v6.0.2` の `action.yml` の `runs.using` は `node24`。GitHub は Node 22 を
飛ばして Node 24 ランタイムへ直接移行しており、当初の design-note が
想定していた「Node 22 後継版」というトリガー条件は、より新しい Node 24
版として既に満たされている。

### 2.3 Out-of-scope: `package.json` の `engines.node`

`package.json` の `engines.node` は `>=20`。これは `scripts/sync-wiki.mjs` など
ローカル Node スクリプト用で、actions runner 上の Node ランタイムとは
非連動。Node 24 でも動作するため本 issue では touch しない。
ローカル Node の bump 要否は別 issue で扱う。

## 3. Constraints

- `actions/checkout@v6` 系列は v6.0.0 リリース (2025-11-20) から約 5 ヶ月
  経過しており、`v6.0.2` まで patch が出ている。安定性の観点で
  bump 先として妥当。
- 現状 `@v4` の floating major で運用しているため、`@v6` の floating major
  への踏襲が一貫性の点で自然 (open question 7.1 を踏襲方針で解消)。
- `archive-closed-plans.yml` は `permissions: contents: write` を持ち、
  PR ブランチへ push back する。bump 後の smoke test は 1 PR
  (本件の close PR 自体) で兼ねられる。

## 4. Success criteria

- `.github/workflows/check-readme-wiki-sync.yml` の `actions/checkout@v4` が
  `actions/checkout@v6` に更新されている。
- `.github/workflows/archive-closed-plans.yml` の `actions/checkout@v4` が
  `actions/checkout@v6` に更新されている。
- bump PR の CI Annotations から Node 20 deprecation warning が消えている。
- 両 workflow が機能回帰なく動作する:
  - `check-readme-wiki-sync.yml` (read-only) — bump PR 自体の CI 実行で確認。
  - `archive-closed-plans.yml` (writes back to PR branch) — bump PR が
    `Closes #89` で merge される際の動作で確認。

## 5. Approach

### 5.1 Bump 方針

両 workflow の `actions/checkout@v4` を `actions/checkout@v6` に同一 PR で
更新する。floating major pin (`@v6`) を採用し、SHA pin への移行は
別議論として本 PR の scope 外に置く。

### 5.2 具体的変更

```diff
# .github/workflows/check-readme-wiki-sync.yml
       - name: Checkout PR head
-        uses: actions/checkout@v4
+        uses: actions/checkout@v6
         with:
           ref: ${{ github.event.pull_request.head.sha }}
           fetch-depth: 1
```

```diff
# .github/workflows/archive-closed-plans.yml
       - name: Checkout PR branch
-        uses: actions/checkout@v4
+        uses: actions/checkout@v6
         with:
           ref: ${{ github.event.pull_request.head.ref }}
           fetch-depth: 0
           persist-credentials: true
```

Out of scope: CI プロバイダ変更、workflow ロジックの書き換え、
SHA pin への移行、`engines.node` の更新。

## 6. Document changes

更新対象は以下の YAML 行のみ:

- `.github/workflows/check-readme-wiki-sync.yml:48`
- `.github/workflows/archive-closed-plans.yml:39`

SPEC.md / UI_SPEC.md / ARCHITECTURE.md への影響なし
(いずれも本 repo に存在しない — Aphelion ワークフロー定義 repo 自体である
ため、application 用 design docs は持たない)。

## 7. Resolved questions (was Open in 2026-04-29 analysis)

- **Pin 戦略**: floating major (`@v6`) を採用。既存 `@v4` 運用との一貫性を
  優先。SHA pin への移行は supply-chain hardening として別 issue で扱う。
- **bump をまとめるか分けるか**: 同一 PR にまとめる。対象 2 ファイル、
  両方とも同一の `actions/checkout` pin、smoke test も bump PR 自体で
  兼ねられるため分割するメリットなし。
- **Node 22 vs Node 24**: 当初想定 (Node 22) は不要。GitHub は Node 22 を
  飛ばして Node 24 へ移行済み (`v5.0.0` 以降が `using: node24`)。
  ユーザー要望「Node 24 に上げる」と完全に一致。

## 8. Handoff brief for developer

### 何をすべきか

1. 既存ブランチ無し → `feat/checkout-v6-bump` (または同等の `chore/...`)
   を main から切る。本件は refactor/chore 的だが、bump prefix としては
   `chore:` が自然。
2. 上記 §5.2 の 2 行 diff を適用してコミット:
   - commit message: `chore: bump actions/checkout to v6 (Node 24 runtime)`
   - body: `Closes #89` を含める。
3. push して PR 作成。PR 本文に:
   - `Closes #89`
   - `Linked Plan: docs/design-notes/actions-checkout-node-runtime-deprecation.md`
   - smoke test として「本 PR の `check-readme-wiki-sync` job が緑になり、
     Annotations から Node 20 deprecation warning が消えていること」を
     test plan checklist に入れる。
4. merge 後、`archive-closed-plans.yml` が本 PR の close を契機に
   design-note を `docs/design-notes/archived/` に自動移動する
   (これが `archive-closed-plans.yml` 側の smoke test を兼ねる)。

### 注意点

- `actions/checkout@v6` は `node24` runtime を要求する。GitHub-hosted
  runner (`ubuntu-latest` を使用) は既に node24 をサポート済み (v6 が
  2025-11 に GA している実績)。self-hosted runner は本 repo では未使用
  なので考慮不要。
- 実装側で追加の WebSearch / version 再確認は不要。本 design-note の
  §2.2 で 2026-04-30 時点の確定情報を提供済み。
- skeleton 修正のみ (YAML 1 行 × 2 ファイル) なので、tester / reviewer
  / security-auditor フェーズは triage 上スキップ可能 (Patch 相当)。
  CI の green 確認で十分。
