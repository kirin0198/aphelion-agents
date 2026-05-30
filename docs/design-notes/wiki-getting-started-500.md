> Last updated: 2026-05-31
> GitHub Issue: [#156](https://github.com/kirin0198/aphelion-agents/issues/156)
> Authored by: analyst-intake (2026-05-31)
> Next: analyst-core

<!-- analyst-handoff
planning_doc_path: docs/design-notes/wiki-getting-started-500.md
slug: wiki-getting-started-500
branch_name: fix/wiki-getting-started-500
issue_url: https://github.com/kirin0198/aphelion-agents/issues/156
issue_number: 156
issue_title: fix: wiki getting-started page returns HTTP 500 on production
issue_type: bug
intake_summary: |
  症状: 本番サイト（https://aphelion-agents.com）の /en/getting-started/ および
  /ja/getting-started/ が HTTP 500 Internal Server Error を返す。他のページ
  （/en/home/, /en/triage-system/, ルート /）は正常（200/302）であり、
  getting-started ページ固有の障害。
  期待動作: /en/getting-started/ および /ja/getting-started/ が正常に 200 で表示される。
  スコープ: site/ (Astro 6 + Starlight 0.38) のビルド/デプロイ層、docs/wiki/{en,ja}/Getting-Started.md、
  ホスティング（Cloudflare Pages 等）、.github/workflows/ のデプロイパイプライン。
  ローカルではビルド成功・ページ生成確認済み（本番デプロイ/ホスティング層が疑わしい）。
proposals_source: null
repo_state: github
artifact_paths:
  - SPEC: missing
  - UI_SPEC: missing
  - ARCHITECTURE: missing
auto_approve: false
output_language: ja
-->

# wiki getting-started ページ本番 500 エラー 調査・修正

## §1 背景・動機

本番サイト `https://aphelion-agents.com` において、wiki の getting-started ページが
HTTP 500 Internal Server Error を返しており、ユーザーが閲覧できない状態にある。

**確認済み症状（本番）:**

| URL | ステータス |
|-----|-----------|
| `https://aphelion-agents.com/en/getting-started/` | **HTTP 500** |
| `https://aphelion-agents.com/ja/getting-started/` | **HTTP 500** |
| `https://aphelion-agents.com/en/home/` | 200（正常） |
| `https://aphelion-agents.com/en/triage-system/` | 200（正常） |
| `https://aphelion-agents.com/`（root） | 302 → `/en/`（正常） |

**ローカルでの確認結果:**

- `node scripts/sync-wiki.mjs` → 成功（exit 0）
- `npm run build`（Astro Starlight） → 成功、`/en/getting-started/index.html` ・
  `/ja/getting-started/index.html` を含む 33 ページ生成（exit 0、エラーなし）
- → ローカルのソース・ビルドでは再現しない

**技術スタック:**

- ドキュメントサイト: `site/`（Astro 6 + @astrojs/starlight 0.38）
- wiki ソース: `docs/wiki/{en,ja}/*.md`
- 同期スクリプト: `scripts/sync-wiki.mjs`（`site/package.json` の prebuild フックで実行）
- `astro.config.mjs`: defaultLocale=en, locales={en,ja}, redirects `'/' → '/en/'`,
  remarkMermaid プラグイン使用, Head.astro で mermaid を npm バンドル
- 直近の関連変更: PR #155 (#146) で `docs/wiki/ja/Getting-Started.md` 周辺を調査
  （実変更はなし）、PR #154 で orphaned planning docs を archive

## §2 ゴール・受け入れ条件

- `https://aphelion-agents.com/en/getting-started/` が HTTP 200 を返し、コンテンツが正常表示される
- `https://aphelion-agents.com/ja/getting-started/` が HTTP 200 を返し、コンテンツが正常表示される
- 修正後、他の正常ページ（/en/home/ 等）に影響が出ていないこと
- 根本原因が特定・記録され、再発防止策が明確になること

## §3 スコープ

調査・修正対象:

1. `docs/wiki/{en,ja}/Getting-Started.md` — Markdown 構文・フロントマター・mermaid ブロック等の固有問題
2. `site/` ビルド設定 — `astro.config.mjs`、remarkMermaid、Head.astro
3. ホスティング / デプロイ層 — Cloudflare Pages（または同等）のランタイム・エッジ関数設定
4. デプロイパイプライン — `.github/workflows/`（現在 archive 系 workflow のみ確認、wiki デプロイ用 workflow 存在確認要）
5. 本番デプロイ済みバージョン vs ローカル HEAD の差分（旧い版がデプロイされている可能性）

スコープ外:

- 他の wiki ページ（500 が出ていないもの）の修正
- サイト全体のリアーキテクチャ

## §4 制約・未解決事項

**制約:**

- 本番サイトへの直接アクセス（HTTP レスポンス確認）は curl 等で可能だが、
  ホスティングダッシュボード（Cloudflare Pages 管理画面等）への直接アクセスは
  analyst-core の権限外（ユーザー確認要）
- `.github/workflows/` にデプロイ用 workflow が見当たらない点 → パイプライン構成の確認が必要

**未解決事項（analyst-core が深掘りする）:**

1. 本番デプロイのトリガー・手順（手動 or CI/CD）の特定
2. ホスティングプロバイダーの特定（Cloudflare Pages の証拠を補強 or 別プロバイダー確認）
3. Getting-Started.md 固有の Markdown 構文が本番環境でのみエラーになる条件の特定
4. 本番にデプロイされている版と現在の HEAD との差分確認
5. 500 エラーの詳細（スタックトレース・エッジ関数エラーログ）の取得方法

**初期仮説（優先度順）:**

1. Getting-Started.md 固有の構文（mermaid ブロック、コードフェンス、フロントマター）が
   本番ビルド環境でのみエラーになる
2. 本番にデプロイされている版がローカル HEAD より古い（壊れた中間状態）
3. Cloudflare Pages 等のランタイム/エッジ関数層での SSR 問題
   （静的サイトで 500 が出るのは通常異常 → ランタイムレイヤーの関与を疑う）
4. デプロイパイプラインの欠落 or 誤設定
