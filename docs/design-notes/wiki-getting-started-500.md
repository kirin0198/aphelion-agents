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

---

## §5 深掘り調査結果（analyst-core, 2026-05-31）— 確定

> Updated: 2026-05-31 (analyst-core deep analysis; APPROVED by user — 方針A 採用)

### 5.1 確認した事実（このリポジトリ HEAD = `e983758`, fix/wiki-getting-started-500）

1. **ビルドは完全に静的出力**。`site/dist/` に SSR/エッジ関数の痕跡は皆無:
   `_routes.json` / `_worker.js` / `functions/` いずれも存在しない。
   `astro.config.mjs` に `output` / `adapter` 指定なし → Astro 6 既定の **static** 出力。
   → 静的 HTML を配信するだけのサイトで特定2ページのみ **500**（404 でなく）は構造的に異常。
2. **getting-started の生成物は正常な完全 HTML**。`dist/en/getting-started/index.html`（96KB）・
   `dist/ja/getting-started/index.html`（99KB）とも `</html>` で正しく閉じる、妥当な静的 HTML。
3. **getting-started は構造的に特異ではない**。
   - 同サイズ帯の `contributing`（100KB）・`triage-system`（96KB）は本番で **200**。サイズ起因ではない
     （Cloudflare Pages の単一静的アセット上限 25 MiB に遠く及ばない）。
   - コンテンツは **プレーン Markdown のみ**: Starlight コンポーネント / aside(`:::`) / `import` / 生 HTML /
     mermaid いずれも 0 件（EN/JA とも）。コードフェンス46個は通常の Markdown で、ローカル & Docker ビルドで問題なし。
   - frontmatter YAML は妥当（EN は ASCII コロンを含むためクォート済み、JA の本文コロンは全角`：`でYAMLキー以外にASCIIコロンなし）。
4. **同期コンテンツは Git 管理外**。`site/.gitignore` が `src/content/docs/{en,ja}/*.md` を無視。
   本番ビルドは **prebuild フック**（`site/package.json` → `"prebuild": "node ../scripts/sync-wiki.mjs"`）が
   wiki ソースから毎回再生成する前提。ローカルでは `sync-wiki.mjs` 成功・`astro build` 成功・33ページ生成済み。
5. **リポジトリ内に Cloudflare Pages 設定は一切ない**。`wrangler.toml` / `_routes.json` / `_redirects` / `.cloudflare`
   いずれも不在。`Dockerfile` のコメントどおり、CF Pages のビルド設定はダッシュボード管理
   （Framework preset: Astro / Node 22）。`.github/workflows/` に wiki デプロイ用 workflow は無し
   （archive-closed-plans / archive-orphan-plans / check-readme-wiki-sync の3つのみ）→ CF Pages の push トリガ自動ビルド前提。
6. **ブランチ差分は planning doc 1ファイルのみ**。`main..HEAD` の差分は本 planning doc の追加だけで、
   site/scripts/wiki の実体は main と同一。main 上で site/scripts/wiki を最後に触ったのは #145（getting-started に
   既存プロジェクト Quick Start 追記）で、それ自体はローカルで正常ビルドできる。

### 5.2 root cause の結論（高確度）

**現在のリポジトリ HEAD のソース／ビルドに 500 を引き起こす欠陥は見当たらない。**
ローカル & Docker（Node 22）での `sync-wiki + astro build` は完全静的・正常出力で、失敗2ページは構造的に無害。
→ **root cause は Cloudflare Pages のホスティング/デプロイ層にある**と判断する。静的サイトで 404 でなく 500 が
特定ルートのみ返る事象は、以下のいずれかの **インフラ側状態**で説明できる:

- **(A) 壊れた/不完全なデプロイ成果物の配信（最有力）**: 直近の CF Pages ビルドが部分失敗または
  途中で中断し、getting-started の2アセットだけが欠落/破損したままアトミックに切り替わらず配信されている。
  あるいは prebuild（sync-wiki.mjs）が CF 環境で部分失敗し、当該2ファイルが生成されなかった。
- **(B) CF Pages のエッジキャッシュに 500 がスタックしている**: 過去の一時的ビルド不全時に生成された
  500 レスポンスがエッジでキャッシュされ、その後の正常デプロイ後も無効化されず残存。
- **(C) ビルド成功だが配信レイヤのルーティング/サイズ/タイムアウト個別事象**: 可能性は低い
  （他の同等ページが 200 のため）が、当該アセット固有の配信エラーは排除しきれない。

ソースコード側は再発防止の観点で**堅牢化の余地はある**が、500 の直接原因ではない。

---

## §6 採用方針（確定: 方針A）

> Updated: 2026-05-31 (analyst-core; user-approved approach)

ユーザー承認により **方針A** を採用する:

> **インフラ確認 → 再デプロイ/キャッシュパージで解消確認 → 再発防止に site ビルド検証 CI を追加**

### 6.1 即時解消フェーズ（ユーザー作業 — analyst/architect 権限外）

ローカル & Docker（Node 22）で `sync-wiki + astro build` が完全静的・正常出力（33ページ、getting-started 2ファイル健全）
であるため、コードの盲目的修正は行わない。500 の即時解消は Cloudflare Pages 側の以下の操作に依存する:

1. CF Pages ダッシュボードで最新デプロイの **ビルドログ**（prebuild/sync-wiki.mjs と astro build の成否、
   getting-started 2ファイルの生成ログ）と **デプロイ済み commit SHA**（現 main HEAD と一致するか）を確認。
2. **再デプロイ**（最新ソースのクリーン再ビルド）をトリガし、500 が解消するか確認。
3. 解消しない場合 **CF エッジキャッシュをパージ**。
4. 解消すれば root cause は §5.2 の (A) 壊れた/不完全なデプロイ成果物 もしくは (B) エッジキャッシュ滞留 として確定。

> **重要**: 上記 1-3 は Cloudflare Pages ダッシュボードへのアクセスを要し、analyst-core / architect の
> 権限外である。**500 の即時解消はユーザーの CF 操作に依存する**。

### 6.2 再発防止フェーズ（architect → developer に委譲）

即時解消の成否にかかわらず、再発防止として **CI に site ビルド検証 workflow を追加**する。
現状 `.github/workflows/` には site ビルドの PR ゲートが存在せず、壊れたデプロイを事前検知できないため。

- `.github/workflows/site-build.yml`: PR / push で `site/` の `npm ci && npm run build`
  （prebuild フックで sync-wiki.mjs が走る）を実行し、ビルド失敗を PR ゲートで検知。
- （オプション）`sync-wiki.mjs` の生成ファイル数 = **33** を検証するステップを追加し、prebuild の
  部分失敗（一部ファイル未生成）を機械検知する。

---

## §7 ドキュメント変更（確定: N/A）

- **SPEC.md**: 不在 → 変更なし（N/A）
- **UI_SPEC.md**: 不在 → 変更なし（N/A）
- **ARCHITECTURE.md**: 不在 → 変更なし（N/A）

本リポジトリには設計ドキュメント（SPEC/UI_SPEC/ARCHITECTURE）が存在しないため、Step 4 のドキュメント更新は
スキップする。再発防止 CI の最小設計は architect の design note に記録される。

---

## §8 architect への引き継ぎ brief（確定）

- **設計ドキュメント更新は N/A**（SPEC/ARCHITECTURE 不在）。
- **委譲対象**: 再発防止 CI の最小設計 `.github/workflows/site-build.yml`。
  - トリガ: PR（site/ 配下 or scripts/sync-wiki.mjs 変更時）+ main への push。
  - ジョブ: Node 22 セットアップ → `cd site && npm ci && npm run build`（prebuild で sync-wiki.mjs 実行）。
  - PR ゲート化（ビルド失敗で merge ブロック）。
  - オプション検証: `site/dist` 配下の生成ページ数 = 33（または sync 後の `src/content/docs/{en,ja}` の md 総数 = 33）。
- **developer（または直接ユーザー作業）への含意**:
  - CF Pages ダッシュボード確認・再デプロイ・キャッシュパージ（ユーザー依頼必須・権限外）。
  - 採用時: site ビルド検証 workflow の実装 + sync-wiki 生成ファイル数検証。
- **前提注記**: **500 の即時解消はユーザーの Cloudflare Pages 操作（再デプロイ/キャッシュパージ）に依存する**。
  architect が委譲される CI 追加は再発防止のみを担い、本番 500 を直接解消するものではない。

### 8.1 ユーザーへの確認依頼事項（root cause 確定に必須）

analyst-core / architect は Cloudflare Pages ダッシュボードおよび本番 HTTP ヘッダに直接アクセスできないため、
以下はユーザー側での確認が必要:

1. CF Pages 最新デプロイの **ビルドログ全文**（prebuild と astro build の成否、生成ページ数 = 33 か）
2. **デプロイ済み commit SHA**（現 main HEAD と一致するか）
3. 本番 `/en/getting-started/` の **レスポンスヘッダ**（`cf-cache-status`, `server`, エラーボディの文言）
   — 500 が CF のキャッシュ由来かビルド成果物欠落由来かを切り分けるため
4. 再デプロイ/キャッシュパージ実施後に 500 が解消するか
