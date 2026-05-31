# Security Audit Report: Aphelion Wiki — rehype-external-links 導入 (Issue #158)

> Source: docs/design-notes (wiki external links new-tab), 実装コミット 6e584ed
> Audit date: 2026-05-31
> Audit scope: 3 files (site/astro.config.mjs, site/package.json, site/package-lock.json) + ビルド成果物 site/dist/ (33 ページ, HTML)
> Plan: Minimal (security-auditor は全プラン必須)
> 監査の性質: Astro 静的ドキュメントサイトのビルド設定変更。rehype プラグイン 1 件追加 + 依存 1 件。アプリの認証・入力処理・DB は対象外。

## Overall Assessment

✅ 本変更に起因する CRITICAL / WARNING なし

本変更（rehype-external-links 導入による外部リンクの新タブ化）は、reverse tabnabbing 対策が
正しく実装されており、追加依存に脆弱性はなく、サプライチェーン妥当性も基準を満たす。
本変更を起因とするブロッカーは存在しない。

既存の無関係な依存脆弱性（astro / mermaid / devalue / fast-uri / uuid / yaml 系、合計 10 件）が
存在するが、いずれも本変更以前から存在し、本変更で新たに導入されたものではない。INFO/WARNING として
記録するが本変更のブロッカーではない。

---

## 🔴 CRITICAL (immediate fix required)

本変更に起因する CRITICAL: **0 件**

---

## 🟡 WARNING (recommended fix)

本変更に起因する WARNING: **0 件**

### [SEC-001] 既存依存に high 深刻度の脆弱性が 2 件存在（本変更とは無関係）
- **Category:** OWASP A06 Vulnerable Components
- **File:** `site/package-lock.json`（devalue, fast-uri — いずれも本変更以前から存在）
- **Issue:**
  - `devalue` 5.6.3–5.8.0: 疎配列のデシリアライズによる DoS (GHSA-77vg-94rm-hx3p, high)
  - `fast-uri` <=3.1.1: percent-encoded ドットセグメントによるパストラバーサル / authority 区切りの host confusion (GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc, high)
- **本変更との関係:** いずれも astro 本体の推移的依存であり、**本コミット 6e584ed で追加されたものではない**。
  rehype-external-links@3.0.0 とその推移的依存（is-absolute-url, hast-util-is-element, space-separated-tokens,
  @ungap/structured-clone）はすべて npm audit で clean。
- **影響範囲:** 本サイトはビルド時のみ依存を使用する静的サイト。実行時にユーザー入力を処理しないため
  実害は限定的だが、ビルドツールチェーンの健全性のため別タスクでの対応を推奨。
- **Remediation:** 本変更のスコープ外。別途 `cd site && npm audit fix` の適用可否を検討（破壊的変更を伴う
  `--force` は要レビュー）。Issue #158 のブロッカーにはしない。

---

## 🟢 INFO (informational / recommendations)

### [SEC-002] reverse tabnabbing 対策は完全（CWE-1022）— 重点検証項目
- **Detail:** ビルド成果物 `site/dist/` の全 HTML を grep 検証。`target="_blank"` を持つアンカーは
  **200 件**、そのすべてが `rel="noopener noreferrer"` を保持。`noopener` 欠落 0 件、`noreferrer` 欠落 0 件。
  rel 値の分布も `200 × rel="noopener noreferrer"` で完全に均一。target=_blank だけで rel が欠落した
  リンクは 1 件も存在しない。CWE-1022 (Use of Web Link to Untrusted Target with window.opener Access) は
  確実に対策済み。

### [SEC-003] rehype-external-links サプライチェーン妥当性 — 採用基準を全項目クリア
- **Detail:** library-and-security-policy.md の採用基準に照らし以下を確認:
  - **License 互換:** rehype-external-links@3.0.0 = MIT。推移的依存も MIT (is-absolute-url@4.0.1,
    hast-util-is-element@3.0.0, space-separated-tokens@2.0.2) / ISC (@ungap/structured-clone@1.3.0)。
    いずれも permissive でプロジェクトと互換。
  - **Widely adopted / actively maintained:** unified/rehype エコシステムの定番プラグイン。funding は
    opencollective.com/unified（unified collective）であり、エコシステム公式の保守体制下にある。
  - **No known CVE:** npm audit で本パッケージおよび全推移的依存が clean。
  - **依存深度:** 推移的依存 5 件のみで浅い。過剰な依存ツリーなし。

### [SEC-004] Starlight 社会的リンク（GitHub）は同一タブのまま（仕様どおり）
- **Detail:** サイトクロムの GitHub social リンク（`rel="me"`, target なし）は Starlight 自身の
  コンポーネントが描画しており、markdown rehype パイプラインの処理対象外。rehype-external-links は
  markdown コンテンツ内のリンクのみを処理する設計のため、テーマ chrome のリンクが同一タブのまま残るのは
  期待動作。脆弱性ではない（`rel="me"` は identity 用途で window.opener を渡さない文脈）。

### [SEC-005] ハードコード秘密情報なし
- **Detail:** 変更ファイル（astro.config.mjs, package.json）を api_key / secret / password / token /
  AWS access key / DB 接続文字列のパターンで走査。検出 0 件。astro.config.mjs に含まれる唯一の URL は
  公開 GitHub リポジトリ URL のみ。

---

## Audit Checklist

### OWASP Top 10
| # | Category | Result | Notes |
|---|---------|--------|-------|
| A01 | Broken Access Control | ✅ | 静的サイト。アクセス制御の対象なし |
| A02 | Cryptographic Failures | ✅ | 暗号処理を伴わない変更 |
| A03 | Injection | ✅ | リンク属性付与のみ。ユーザー入力の動的処理なし |
| A04 | Insecure Design | ✅ | rel=noopener noreferrer を明示設定した安全な設計 |
| A05 | Security Misconfiguration | ✅ | rehype プラグイン設定は最小・適切。新たな攻撃面なし |
| A06 | Vulnerable Components | ⚠️ | 本変更の追加依存は clean。既存に high×2/moderate×7/low×1（無関係） |
| A07 | Auth Failures | ✅ | 認証機構なし |
| A08 | Data Integrity Failures | ✅ | package-lock.json に integrity ハッシュ記録あり。デシリアライズ処理の追加なし |
| A09 | Logging Failures | ✅ | ログ処理の変更なし |
| A10 | SSRF | ✅ | サーバサイドの外部リクエスト追加なし（ビルド時静的処理のみ） |

### Dependency Vulnerability Scanning
- Scan tool: `npm audit`（`cd site && npm audit`）
- 全体脆弱性数: **10 件**（critical 0 / high 2 / moderate 7 / low 1）
- **本変更で新たに追加された脆弱性: 0 件**
- 追加依存（clean 確認済み）: rehype-external-links, is-absolute-url, hast-util-is-element,
  space-separated-tokens, @ungap/structured-clone
- 既存脆弱性パッケージ（本変更と無関係）: astro, devalue, fast-uri, mermaid, uuid,
  yaml / yaml-language-server / volar-service-yaml / @astrojs/language-server / @astrojs/check

#### npm audit 実出力
```
# npm audit report

astro  <6.1.10
Astro: Server island encrypted parameters vulnerable to cross-component replay - https://github.com/advisories/GHSA-xr5h-phrj-8vxv
fix available via `npm audit fix`
node_modules/astro

devalue  5.6.3 - 5.8.0
Severity: high
Svelte devalue: DoS via sparse array deserialization - https://github.com/advisories/GHSA-77vg-94rm-hx3p
fix available via `npm audit fix`
node_modules/devalue

fast-uri  <=3.1.1
Severity: high
fast-uri vulnerable to path traversal via percent-encoded dot segments - https://github.com/advisories/GHSA-q3j6-qgpj-74h6
fast-uri vulnerable to host confusion via percent-encoded authority delimiters - https://github.com/advisories/GHSA-v39h-62p7-jpjc
fix available via `npm audit fix`
node_modules/fast-uri

mermaid  11.0.0-alpha.1 - 11.14.0
Severity: moderate
Mermaid Gantt Charts are vulnerable to an Infinite Loop DoS - https://github.com/advisories/GHSA-6m6c-36f7-fhxh
Mermaid: Improper sanitization of `classDefs` in diagrams leads to CSS injection - https://github.com/advisories/GHSA-xcj9-5m2h-648r
Mermaid: Improper sanitization of configuration leads to CSS injection - https://github.com/advisories/GHSA-87f9-hvmw-gh4p
Mermaid: Improper sanitization of `classDef` in state diagrams leads to HTML injection - https://github.com/advisories/GHSA-ghcm-xqfw-q4vr
fix available via `npm audit fix`
node_modules/mermaid

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix`
node_modules/uuid

yaml  2.0.0 - 2.8.2
Severity: moderate
yaml is vulnerable to Stack Overflow via deeply nested YAML collections - https://github.com/advisories/GHSA-48c2-rrv3-qjmp
fix available via `npm audit fix --force`
Will install @astrojs/check@0.9.2, which is a breaking change
node_modules/yaml-language-server/node_modules/yaml
  yaml-language-server  1.11.1-08d5f7b.0 - 1.21.1-f1f5a94.0 || 1.22.1-0ae5603.0 - 1.22.1-fc5f874.0
  Depends on vulnerable versions of yaml
  node_modules/yaml-language-server
    volar-service-yaml  <=0.0.70
    Depends on vulnerable versions of yaml-language-server
    node_modules/volar-service-yaml
      @astrojs/language-server  >=2.14.0
      Depends on vulnerable versions of volar-service-yaml
      node_modules/@astrojs/language-server
        @astrojs/check  >=0.9.3
        Depends on vulnerable versions of @astrojs/language-server
        node_modules/@astrojs/check

10 vulnerabilities (1 low, 7 moderate, 2 high)
```

### Authentication / Authorization
| Endpoint | Authentication | Authorization | Notes |
|---|---|---|---|
| (なし) | N/A | N/A | 静的ドキュメントサイト。API エンドポイント・認証機構なし |

### Hardcoded Secrets
- 検出数: **0 件**
- 走査対象: site/astro.config.mjs, site/package.json
- 検出パターン: api_key / secret / password / token / AKIA / DB 接続文字列
- 除外: .env, .env.example, テストフィクスチャ（本変更には該当ファイルなし）

### Input Validation
| Input point | Validation | Notes |
|---|---|---|
| (なし) | N/A | ユーザー入力を受け付けるコードの追加なし。ビルド時の markdown 静的変換のみ |

### CWE Check
| CWE | Result | Notes |
|-----|--------|-------|
| CWE-1022 | ✅ | reverse tabnabbing: 全 200 件の target=_blank に noopener+noreferrer 付与済み |
| CWE-89 | N/A | DB 操作なし |
| CWE-79 | ✅ | rehype-external-links は属性付与のみ。HTML インジェクション経路の追加なし |
| CWE-352 | N/A | フォーム処理なし |
| CWE-798 | ✅ | ハードコード認証情報なし |
| CWE-22 | ⚠️ | fast-uri（既存・無関係依存）に該当。本変更とは無関係 |
| CWE-502 | ✅ | デシリアライズ処理の追加なし |
| CWE-918 | ✅ | サーバサイド外部リクエストの追加なし |
