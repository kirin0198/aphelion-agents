# feat: add compliance-auditor agent for NIST / PCI-DSS / SOC2 cross-phase audits

> Reference: current `main` (HEAD `9bc00e5`, 2026-04-26)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#56](https://github.com/kirin0198/aphelion-agents/issues/56)
> Implemented in: TBD

---

## 1. Background & Motivation

### 1.1 ユーザの問題意識（原文）

> Nistやpcidssなどグローバルセキュリティ規約の監査を行う複数フェーズにまたがるコンプライアンス監査Agentの新設検討。

### 1.2 なぜ単発の `security-auditor` では足りないか

Aphelion の現状の `security-auditor` は **Delivery Flow の最終段階** で起動し、
実装コードに対して **OWASP Top 10 / CWE / 依存脆弱性スキャン / ハードコードされた
シークレット / 入力バリデーション / 認証認可** を確認する。これは「実装の脆弱性」
を見るには十分だが、グローバルセキュリティ規約（NIST CSF、PCI-DSS、SOC2 Type II 等）
の準拠監査としては以下の点で構造的に不足している。

1. **規約準拠は要件定義段階から始まる**
   PCI-DSS のスコープ判定（カード会員データを保存・処理・伝送するか）や、
   SOC2 の Trust Service Criteria 選定（Security 必須 + Availability/Confidentiality 等の任意追加）は
   Discovery 完了時点で確定しているのが望ましい。
   実装後の `security-auditor` では「設計が PCI-DSS 要件を満たすトポロジになっているか」
   を判定できない（既に作られたものを見ているだけ）。

2. **複数フェーズに跨る統制項目が監査対象になる**
   例: PCI-DSS Req. 10（ログ記録と監視）は `observability` の設定、
   PCI-DSS Req. 8（ID と認証）は `architect` の認証設計、
   PCI-DSS Req. 6（安全なシステム開発）は `developer` の実装プロセス、
   PCI-DSS Req. 12（情報セキュリティポリシー）は組織ポリシー …
   と、単一フェーズの成果物を見るだけでは追跡できない。

3. **「準拠」の判定は機械チェックだけでは閉じない**
   OWASP/CWE は「コードに脆弱性パターンがあるか」のチェックリストで
   `Grep` ベースの自動検出と相性が良い。一方、NIST CSF の
   "ID.GV-1: Organizational cybersecurity policy is established and communicated"
   のような統制は、ドキュメント・ポリシー・プロセスの存在を確認する人手レビュー前提項目を多く含む。
   `security-auditor` は機械チェック中心の設計なので、ここを混在させると役割が肥大化する。

4. **規約ごとに監査ライフサイクルが異なる**
   - PCI-DSS: ASV スキャンが四半期、内部スキャンが年次、ペネトレーションテストが年次
   - SOC2 Type II: 通常 6 〜 12 ヶ月の観察期間
   - NIST CSF: 自己評価型でカスタマイズ前提
   これらを単発の `security-auditor` フェーズに押し込むと、
   「いつ・誰が・何を見るか」が曖昧になる。

### 1.3 想定ユーザ

- 金融・決済・医療・公共系など、規約準拠が法的・契約的に必要なプロジェクト
- B2B SaaS で SOC2 Type II 取得を前提に立ち上げる新規サービス
- 米国政府機関・FedRAMP を視野に入れる場合の NIST 800-53 ベースライン適合確認

`tool` / `library` / `cli` 系の Aphelion プロジェクトでは
`compliance-auditor` を起動しないのが既定（Operations Flow を Skip するのと同様の扱い）。

---

## 2. Current state

### 2.1 `security-auditor` の現在のスコープ

`.claude/agents/security-auditor.md` を実際に読み確認した結果（2026-04-26 時点）。

| 項目 | 現状 |
|------|------|
| 起動位置 | Delivery Flow Phase 10（最終段階） |
| 対象成果物 | 実装コード + `SPEC.md` + `ARCHITECTURE.md` |
| チェック内容 | OWASP Top 10 / 依存脆弱性 / 認証認可 / ハードコードシークレット / 入力検証 / CWE |
| 出力 | `SECURITY_AUDIT.md` |
| 必須プラン | **全プラン（Minimal 含む）** |
| NIST/PCI-DSS/SOC2 への明示的言及 | **なし** |
| Discovery / Operations Flow へのフック | **なし** |
| 規約フレームワークのチェックリスト | **なし** |

### 2.2 既存ルール上の準拠監査の扱い

`.claude/rules/library-and-security-policy.md` は冒頭で
"# security-auditor Mandatory Execution Rule" を定義しているが、
全 6 項目とも OWASP/CWE/依存脆弱性レベルの話で、
**NIST / PCI-DSS / SOC2 / ISO 27001 / FedRAMP / HIPAA / GDPR** 等の規約名は
リポジトリ全体で一切登場しない（grep で確認済み）。

### 2.3 既存 flow 上の準拠監査の扱い

| Flow | 規約準拠監査の現状 |
|------|--------------------|
| Discovery Flow | "Complex" 判定の triage 質問に "regulatory compliance" の語が選択肢として存在するのみ（line 120）。後続のアクションは未定義。 |
| Delivery Flow | `security-auditor` が Phase 10 で全プラン実行。規約準拠は対象外。 |
| Operations Flow | 一切なし。`releaser` が本番デプロイし、`observability` がログ・メトリクス設定するが、PCI-DSS Req. 10 等の準拠確認は行わない。 |
| Maintenance Flow | `security-auditor` が Major triage で必須、CVE 対応で任意。規約準拠の再評価は未定義。 |

### 2.4 現状のギャップまとめ

> 規約準拠監査をフェーズ横断的に担保している場所は、現状 Aphelion には存在しない。

これが本 issue の根本動機。

---

## 3. Proposed approach

### 3.1 新 agent: `compliance-auditor`

`.claude/agents/compliance-auditor.md` として新規作成する agent。
`security-auditor` の **役割は侵食せず**、規約フレームワーク準拠を専門に見る独立 agent とする。

#### 役割境界（最重要）

| 観点 | `security-auditor` | `compliance-auditor`（新設） |
|------|--------------------|------------------------------|
| 主目的 | 実装の脆弱性検出 | 規約フレームワークへの準拠確認 |
| 主な根拠 | OWASP Top 10 / CWE | NIST CSF / PCI-DSS / SOC2 TSC |
| 主なチェック手段 | コード `Grep` + 依存スキャン | チェックリストマトリクス + フェーズ横断トレース |
| 入力フェーズ | Delivery 完了時のみ | Discovery / Delivery / Operations の **複数フック** |
| 出力 | `SECURITY_AUDIT.md` | `COMPLIANCE_AUDIT.md` |
| 必須プラン | 全 Delivery プラン | プロジェクトに `COMPLIANCE_REQUIRED: true` が宣言された場合のみ |
| 既定での起動 | Yes | **No**（オプトイン） |
| 自動修正 | しない（指摘のみ） | しない（指摘のみ） |

`compliance-auditor` は `security-auditor` の出力（`SECURITY_AUDIT.md`）を読み込み、
"OWASP A02 (Cryptographic Failures) の指摘 = PCI-DSS Req. 3.5 の不適合"
のような **クロスリファレンス** を生成する。
両者は重複するのではなく、補完関係にある。

### 3.2 対応フレームワーク（段階導入）

最初から 3 規約全てを実装すると agent definition が肥大化し、テストも難しい。
以下の段階導入を提案する。

| Phase | 対応規約 | 理由 |
|-------|----------|------|
| **Phase 1（MVP）** | NIST CSF v2.0 | 業種非依存・自己評価型・カテゴリ数が比較的少ない（6 functions × 約 23 categories）。テンプレート化に最適。 |
| **Phase 2** | PCI-DSS v4.0 | スコープ判定ロジックが必要（CDE: Cardholder Data Environment の有無）。要件 12 個 × サブ要件多数。 |
| **Phase 3** | SOC2 Type II（TSC 2017） | Trust Service Criteria 選定 UI が必要。Type II は観察期間ベースで agent 単体では完結しない（運用記録の参照が前提）。 |

Phase 1 のみで本 issue を Close し、Phase 2/3 は別 issue に分割する。
これは "§8 Handoff brief for developer" の scope 分割方針と一致する。

### 3.3 起動位置（フェーズ横断フック）

`compliance-auditor` は **3 つの flow から呼ばれる可能性がある** agent として設計する。

#### Discovery Flow フック（推奨タイミング: triage 後）

```
Discovery Flow
  └─ triage で COMPLIANCE_REQUIRED: true が選択された場合
      └─ Phase 完了直前に compliance-auditor を起動
          - 入力: SPEC.md（要件定義段階）
          - 出力: COMPLIANCE_AUDIT.md（初版 — スコープ判定 + 該当規約のチェックリスト雛形）
          - 重点: 要件レベルでの準拠評価
                  例 PCI-DSS: 「カード会員データを扱う設計か？ 扱うなら CDE 境界が SPEC.md で定義されているか？」
```

#### Delivery Flow フック（推奨タイミング: `security-auditor` の直後）

```
Delivery Flow Phase 10: security-auditor (既存)
  └─ Phase 10.5 (新設, 条件付き): compliance-auditor
      - 条件: COMPLIANCE_REQUIRED: true
      - 入力: SPEC.md, ARCHITECTURE.md, 実装コード, SECURITY_AUDIT.md
      - 出力: COMPLIANCE_AUDIT.md（更新 — 設計・実装レベルの評価追記）
      - 重点: SECURITY_AUDIT.md の指摘を規約条項にマップ
```

`security-auditor` の **前段ではなく後段** に置く理由:
- OWASP/CWE 指摘を入力として規約条項にマップする方が、独立に評価するより精度が高い
- `security-auditor` は全プラン必須、`compliance-auditor` はオプトインなので、
  順序的にもこちらが自然

#### Operations Flow フック（推奨タイミング: `observability` の後）

```
Operations Flow
  └─ db-ops → releaser → observability (既存)
      └─ Phase 末尾 (新設, 条件付き): compliance-auditor
          - 条件: COMPLIANCE_REQUIRED: true
          - 入力: 全前段成果物 + デプロイ後のインフラ設定 + ログ・監視設定
          - 出力: COMPLIANCE_AUDIT.md（更新 — 運用レベルの評価追記）
          - 重点: PCI-DSS Req. 10（ログ記録）、Req. 11（監視）等の運用統制
```

#### Maintenance Flow フック（オプション）

```
Maintenance Flow
  └─ TRIGGER_TYPE: compliance_alert を新設（CVE alert と並列）
      └─ Major triage 時に compliance-auditor を必須化
      └─ Patch/Minor では SPEC.md 影響有無で判定
```

これは Phase 2 以降の扱いとし、Phase 1 では Open question として §4 で議論を保留する。

### 3.4 出力ファイル: `COMPLIANCE_AUDIT.md`

```markdown
# Compliance Audit Report: {Project Name}

> Frameworks: {NIST CSF v2.0 | PCI-DSS v4.0 | SOC2 TSC 2017}
> Audit phases: {Discovery | Delivery | Operations}
> Last updated: {YYYY-MM-DD}
> Source artifacts: SPEC.md@{date}, ARCHITECTURE.md@{date}, SECURITY_AUDIT.md@{date}

## Executive Summary
{Pass / Conditional / Fail} — {1〜3 行のサマリー}

## Scope Determination
- Project type: {service | tool | library | cli}
- Compliance scope: {例: PCI-DSS — 該当 / SOC2 — 該当 / NIST CSF — 自己評価}
- CDE boundary (PCI-DSS の場合のみ): {ARCHITECTURE.md のどのモジュールが CDE か}

## Cross-Reference Map (security-auditor → compliance)
| SEC ID | OWASP/CWE | Compliance impact |
|--------|-----------|-------------------|
| SEC-001 | A02 / CWE-327 | PCI-DSS Req. 3.5 (Protect cryptographic keys) — Not Met |

## NIST CSF v2.0 Checklist
| Function | Category | Subcategory | Status | Evidence | Gap |
|----------|----------|-------------|--------|----------|-----|
| GOVERN | GV.OC | GV.OC-01 | ✅ Met | SPEC.md §1 | — |
| GOVERN | GV.OC | GV.OC-02 | ⚠️ Partial | ARCHITECTURE.md §3 | ポリシー文書化が未完 |
| ... | ... | ... | ... | ... | ... |

## PCI-DSS v4.0 Checklist (Phase 2 以降)
{Phase 2 で実装}

## SOC2 TSC Checklist (Phase 3 以降)
{Phase 3 で実装}

## Findings by Severity
### 🔴 BLOCKER (規約不適合 — 是正必須)
### 🟡 GAP (部分適合 — 改善推奨)
### 🟢 OBSERVATION (情報提供)

## Manual Review Required
{機械チェック不可で人手レビューが必要な統制項目のリスト}

## Audit Lifecycle Recommendations
- 次回監査推奨時期: {YYYY-MM-DD}
- 観察期間ベースの統制（SOC2 Type II 等）: {あり/なし、内容}
```

### 3.5 機械チェック vs 人手レビューの分離

`compliance-auditor` の各統制項目には以下のラベルを付与する。

| ラベル | 意味 | agent の振る舞い |
|--------|------|------------------|
| `auto` | コード/設定/成果物から機械的に検証可能 | `Grep` / `Read` で検証し Pass/Fail を出力 |
| `assist` | 部分的に機械検証 + 人手確認 | 機械検証結果を提示し、人手確認を促すマーカーを出力 |
| `manual` | 人手レビュー必須 | チェックリスト項目として出力するのみ（Pass/Fail は付けない） |

これにより agent の出力は「全項目自動判定済み」を装わず、
人手レビューが必要な項目を明示する。これは PCI-DSS QSA 監査や
SOC2 監査人の審査を想定した実用的な設計。

### 3.6 拡張性（カスタムフレームワーク）

NIST/PCI-DSS/SOC2 以外の社内独自規約への対応は、
`.claude/rules/compliance-frameworks/` ディレクトリに以下の構造で
チェックリスト定義 YAML/Markdown を置けるようにする。

```
.claude/rules/compliance-frameworks/
├── nist-csf-v2.md      (Phase 1 で同梱)
├── pci-dss-v4.md       (Phase 2 で追加)
├── soc2-tsc-2017.md    (Phase 3 で追加)
└── custom/             (ユーザ定義 — gitignore 対象外)
    └── {framework-name}.md
```

agent は起動時にこのディレクトリをスキャンし、
`COMPLIANCE_REQUIRED` で指定されたフレームワーク名と照合する。
未知のフレームワークが指定された場合は `custom/` 配下にあるかを確認し、
なければ user に確認を求める。

ただし Phase 1 では `nist-csf-v2.md` のみ同梱し、`custom/` の正式サポートは Phase 2 以降。

---

## 4. Open questions

すべて Auto mode のため AskUserQuestion せず、ここに記録する。
`developer` 着手前に `architect` または user とすり合わせる。

### Q1. 全コントロール項目を機械チェック可能か

**仮説**: NIST CSF v2.0 の約 100 サブカテゴリのうち、`auto` で評価可能なのは
30〜40% 程度。残りは `assist` または `manual`。
PCI-DSS は技術統制が多いため `auto` 比率が上がる（推定 50〜60%）。
SOC2 は組織統制が多く `auto` 比率はさらに低い（推定 20〜30%）。

**判断保留点**: Phase 1 実装時に NIST CSF の各項目を実際にラベリングして
比率を計測し、`compliance-auditor.md` に "expected automation coverage" として記録する。

### Q2. Maintenance Flow での compliance 再評価のタイミング

**選択肢**:
- A. CVE alert と並列に `compliance_alert` という TRIGGER_TYPE を新設し、
  規約改訂（PCI-DSS v3.2.1 → v4.0 のような major version up）で起動
- B. SPEC.md/ARCHITECTURE.md 変更時に常に再評価（ただし重い）
- C. 年次タイマー的な扱いで、user が手動起動する

**仮の方針**: Phase 1 では C（手動起動のみ）。
Phase 2 で A の `compliance_alert` を導入する設計とする。

### Q3. カスタムフレームワークの拡張性をどこまで担保するか

**選択肢**:
- A. YAML スキーマで定義（厳密だが書きにくい）
- B. Markdown チェックリスト形式（柔軟だが機械処理しにくい）
- C. ハイブリッド（Front matter で機械可読部分、本文で人間可読部分）

**仮の方針**: C を採用。`nist-csf-v2.md` のテンプレートで実例を示す。
ただし Phase 1 ではテンプレート提示のみで、`custom/` の動作確認は Phase 2。

### Q4. SOC2 Type II の観察期間ベース統制

**問題**: SOC2 Type II は「過去 6〜12 ヶ月間の運用実績」を見るため、
single-shot の agent では本質的にカバーできない。

**仮の方針**: Phase 3 では Type II 完全対応は諦め、Type I（特定時点での設計適合性）
までを agent のスコープとする。Type II は agent の出力を入力として
SOC2 監査人が判断する前提。`COMPLIANCE_AUDIT.md` の "Audit Lifecycle Recommendations"
セクションで継続的監査の必要性を明記する。

### Q5. `security-auditor` との重複検出は許容範囲か

**問題**: 一部チェック項目（ハードコードシークレット、暗号鍵管理等）は
両 agent で重複する。

**仮の方針**: 重複は許容する。`compliance-auditor` は `security-auditor` の
`SECURITY_AUDIT.md` を入力として読み、重複箇所は "see SEC-XXX" で参照する。
独立して再スキャンはしない（パフォーマンス・一貫性の両面で有利）。

---

## 5. Document changes

### 5.1 新規ファイル

| パス | 内容 |
|------|------|
| `.claude/agents/compliance-auditor.md` | 新 agent definition（`security-auditor.md` をテンプレートにする） |
| `.claude/rules/compliance-frameworks/nist-csf-v2.md` | Phase 1 同梱の NIST CSF チェックリスト（front matter + 本文） |
| `.claude/rules/compliance-frameworks/README.md` | フレームワーク追加方法のガイド |

### 5.2 編集ファイル

#### `.claude/rules/aphelion-overview.md`
- `## Agent Directory` セクションに `compliance-auditor` を追記
- `### Domain and Flow Overview` の図に `compliance-auditor` のフック箇所を補足
- 更新履歴を追加

#### `.claude/rules/library-and-security-policy.md`
- `## Responsibility Distribution` テーブルに `compliance-auditor` 行を追加
- `# security-auditor Mandatory Execution Rule` を `# Audit Agents Responsibility Split` に名称変更し、
  `security-auditor` と `compliance-auditor` の役割境界を明記

#### `.claude/agents/security-auditor.md`
- ファイル冒頭の "Mission" セクションに以下を追記:

```markdown
> **Boundary with `compliance-auditor`:** This agent focuses on implementation
> vulnerabilities (OWASP/CWE/dependency scans). Regulatory framework compliance
> (NIST CSF / PCI-DSS / SOC2) is owned by `compliance-auditor`, which reads this
> agent's `SECURITY_AUDIT.md` as input.
```

#### `.claude/agents/discovery-flow.md`
- triage 質問の "Complex" 選択肢に対応する後続フェーズ定義を追加
- `COMPLIANCE_REQUIRED: true` の場合に Discovery 完了直前で `compliance-auditor` を起動するフェーズ列を追記

#### `.claude/agents/delivery-flow.md`
- 各プランのフェーズ列に "Phase 10.5: compliance-auditor (条件付き)" を追加
- "全プラン必須" のリストに `compliance-auditor` は **含めない**（オプトイン）

#### `.claude/agents/operations-flow.md`
- `observability` の後に "Phase: compliance-auditor (条件付き)" を追加

#### `.claude/agents/maintenance-flow.md`
- TRIGGER_TYPE に `compliance_alert` を Phase 2 で導入予定として記載（Phase 1 では未実装）

### 5.3 影響を受けない箇所

- `db-ops`, `observability` の既存役割は変更しない（`compliance-auditor` がこれらの出力を「読む」だけ）
- `security-auditor` の主要なチェック項目・出力フォーマットは変更しない（境界線追記のみ）
- 既存 `SECURITY_AUDIT.md` を生成しているプロジェクトには後方互換

---

## 6. Acceptance criteria

### 6.1 必須（Phase 1 完了条件）

- [ ] `.claude/agents/compliance-auditor.md` が存在し、以下を含む
  - YAML front matter（name, description, tools, model）
  - Mission セクションで `security-auditor` との境界を明示
  - 入力ファイル一覧と起動条件（`COMPLIANCE_REQUIRED: true`）
  - NIST CSF v2.0 のチェックリスト処理ロジック
  - `auto` / `assist` / `manual` ラベルの定義と扱い
  - `COMPLIANCE_AUDIT.md` の出力テンプレート
  - AGENT_RESULT ブロック仕様
- [ ] `.claude/rules/compliance-frameworks/nist-csf-v2.md` のチェックリストテンプレートが存在
- [ ] `.claude/rules/aphelion-overview.md` の Agent Directory に追記
- [ ] `.claude/rules/library-and-security-policy.md` の責任分担表に追加
- [ ] `.claude/agents/security-auditor.md` に境界線記述を追加
- [ ] サンプル `COMPLIANCE_AUDIT.md`（架空のプロジェクト想定）を `docs/examples/` 配下に配置

### 6.2 推奨（Phase 1 で達成できれば望ましい）

- [ ] 既存 `delivery-flow.md` に `compliance-auditor` のフック位置が明記されている
- [ ] `discovery-flow.md` の triage で `COMPLIANCE_REQUIRED` を確定するフローが定義されている
- [ ] AGENT_RESULT の `STATUS: success | failure | error` 判定基準（BLOCKER 件数閾値等）が明記されている

### 6.3 Phase 1 では不要（Phase 2/3 へ繰越）

- PCI-DSS / SOC2 のチェックリスト同梱
- `custom/` フレームワーク機能の動作保証
- `compliance_alert` TRIGGER_TYPE の Maintenance Flow 統合
- `operations-flow.md` への正式統合（Phase 1 では設計記述のみ、実フェーズ列追加は Phase 2）

---

## 7. Out of scope

明示的にスコープ外とするもの。

1. **自動修正（auto-remediation）**
   `compliance-auditor` は監査と指摘のみ。修正コミットは行わない。
   修正は別 agent（`developer` 等）または人手で行う。

2. **個別フレームワーク全コントロールの機械チェック実装**
   §3.2 の段階導入方針に従い、Phase 1 は NIST CSF のみ。
   全コントロールを `auto` ラベルにする努力もしない（§3.5 の通り、
   `manual` 項目を明示することが本 agent の価値）。

3. **監査ログの長期保管インフラ**
   `COMPLIANCE_AUDIT.md` をリポジトリ内に置く以上のインフラは提供しない。
   PCI-DSS Req. 10.7（1 年以上保管）等の要求は user の運用責任。

4. **規約のリアルタイム更新追従**
   PCI-DSS v4.0.1 のような minor 改訂への自動追従は行わない。
   フレームワーク定義ファイルは手動更新（ただし更新タイミングをドキュメント化）。

5. **法的・契約的な準拠保証**
   `compliance-auditor` の "Pass" 判定は QSA/監査人の正式評価を代替しない。
   user 自身がプロジェクト固有の規制要件を確認する責任は依然として残る。

6. **多言語チェックリスト**
   フレームワーク定義は英語のみで提供。日本語訳は将来検討。
   ただし `Output Language: ja` のプロジェクトでは
   サマリー・指摘文は日本語生成（agent 共通の language-rules に従う）。

---

## 8. Handoff brief for developer

### 8.1 PR 分割方針

本 issue は **Phase 1 のみ** を対象とし、以下の単位で PR を分割する。

| PR | 内容 | 依存関係 |
|----|------|---------|
| **PR 1（本 issue で着手）** | `compliance-auditor.md` agent definition + `nist-csf-v2.md` チェックリストテンプレート + 責任分担表更新 + `security-auditor.md` への境界記述追加 | なし |
| **PR 2（別 issue）** | `delivery-flow.md` への正式 hook 追加 + サンプル `COMPLIANCE_AUDIT.md` | PR 1 |
| **PR 3（別 issue, Phase 2）** | PCI-DSS v4.0 チェックリスト + `discovery-flow.md` の triage 統合 | PR 1, PR 2 |
| **PR 4（別 issue, Phase 3）** | SOC2 TSC + `operations-flow.md` への正式 hook + Maintenance Flow `compliance_alert` | PR 3 |

### 8.2 着手手順

1. `developer` は本ノート §3.1 の役割境界表を最優先で読む
2. `.claude/agents/security-auditor.md` をテンプレートとして
   `.claude/agents/compliance-auditor.md` を新規作成
3. NIST CSF v2.0 v2.0 の公式 PDF（NIST 公開）から GOVERN / IDENTIFY / PROTECT /
   DETECT / RESPOND / RECOVER の 6 functions × 約 23 categories × 約 100 subcategories を
   `nist-csf-v2.md` に取り込む（チェックリスト形式、各項目に `auto` / `assist` / `manual` ラベル）
4. 既存 `security-auditor.md` の Mission セクションに境界線記述を **追記のみ** で行う（既存内容は触らない）
5. `library-and-security-policy.md` のセクション名変更と責任分担表更新
6. `aphelion-overview.md` の Agent Directory 部分のみ更新
7. テスト: 架空のプロジェクトで `compliance-auditor` を手動起動し、
   `COMPLIANCE_AUDIT.md` が生成されることを確認

### 8.3 注意点

- **既存 `security-auditor` の動作を変えない**: 境界線記述以外は触らない。
  既存プロジェクトでの動作互換性を必ず保つ。
- **`compliance-auditor` はオプトイン**: `COMPLIANCE_REQUIRED: true` が宣言されていない
  プロジェクトで暗黙的に起動しないこと。Minimal/Light/Standard/Full のフェーズ列を
  デフォルトで変更しない。
- **NIST CSF の項目数が多い**: agent definition file が肥大化しすぎる場合は、
  チェックリスト本体を `.claude/rules/compliance-frameworks/nist-csf-v2.md` に外出しし、
  agent definition は処理ロジックだけを記述する（既に §3.6 で前提済み）。
- **AGENT_RESULT の STATUS 判定**: BLOCKER（規約不適合）が 1 件以上で `STATUS: failure` を提案。
  ただし Phase 1 では運用実績がないため、初期値は user 確認可能な warning 扱い（`STATUS: success` + `BLOCKER_COUNT` フィールド）にしておく方が無難。

### 8.4 architect への申し送り（PR 1 着手前に確認推奨）

- §4 Open questions の Q1（automation coverage 比率の実測）と Q5（重複検出の方針）は
  実装着手前に `architect` で方針確定するのが望ましい
- §3.4 の `COMPLIANCE_AUDIT.md` テンプレートは draft であり、
  `architect` がフォーマット最終化することを推奨

---

## Appendix A: 参考リンク（Phase 1 では本文に埋め込まない）

- NIST Cybersecurity Framework v2.0: https://www.nist.gov/cyberframework
- PCI Security Standards Council — PCI-DSS v4.0: https://www.pcisecuritystandards.org/
- AICPA SOC 2 — Trust Services Criteria: https://www.aicpa-cima.com/

各規約の正式名称・バージョン・改訂日は Phase 1 実装時に
`.claude/rules/compliance-frameworks/{name}.md` の front matter に記録する。
