# feat: add compliance-auditor agent for NIST / PCI-DSS / SOC2 cross-phase audits

> Last updated: 2026-08-02
> Update history:
>   - 2026-08-02: レビュー指摘 #212 に基づく前提 refresh — rules canonical パス / Operations Flow 実態 / #132 決定順守 / autonomous escalation 配線を追加
>   - 2026-04-26: 初版 (#56)
> Reference: current `main` (HEAD `7a903c8`, 2026-08-02)
> Created: 2026-04-26
> Analyzed by: analyst (2026-04-26)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `developer` phase
> GitHub Issue: [#56](https://github.com/kirin0198/aphelion-agents/issues/56)
> Next: developer (§8 Handoff brief — Phase 1 は NIST CSF v2.0 のみ)
> Implemented in: TBD

<!--
本メモは #56 の planning doc であり、handoff ブロックは意図的に置いていない。
#212（本 refresh の指摘元 issue）のクローズ時にブロックを注入すると、
issue_number フィールド（値が 212 のもの）が archive-closed-plans.yml の
大文字小文字を区別しない抽出にマッチし、#56 未実装のまま #212 のクローズで
本メモが archived/ へ退避される。
#56 に着手する際は analyst.md の Legacy Resume 経路が #56 の issue 番号でブロックを注入する。
-->

> **⚠ Refresh pass applied before implementation (#212).**
> 本メモは 2026-04-26 時点の `main` を前提に書かれており、その後のリファクタ
> （#132 PR-1 の overview スリム化、releaser/Operations Flow の位置関係整理等）で
> 前提の一部が失効していた。2026-08-02 に現在の `main` に対して issue #212 の
> 4 指摘を再検証し、失効箇所を**本文に直接反映済み**（下表は監査用の記録）。
> `developer` / `architect` は着手時点でもう一度差分を確認すること。
>
> | # | issue #212 の指摘 | 検証結果 (2026-08-02) | 本 refresh での対応 |
> |---|--------------------|------------------------|----------------------|
> | 1 | rules パスが in-repo `.claude/rules/compliance-frameworks/` 前提（旧 §3.6, §5.1-5.2 想定） | **まだ成立（要修正）**。canonical は `src/.claude/rules/` — `bin/aphelion-agents.mjs` が配布先プロジェクトの `.claude/rules/` へ展開する側であり、本 repo 自身には `.claude/rules/` の実体が無い（`ls .claude/rules/` で確認）。§3.6 (旧 268-286)、§5.1 (旧 353-354)、§5.2 (旧 363-366)、§6.1 (旧 412)、§8.2 (旧 500) の**5 箇所すべて**が誤り — issue が挙げた 2 箇所より範囲が広かった | 全 5 箇所を `src/.claude/rules/compliance-frameworks/` に訂正し、配布の非対称性（agent 定義は `.claude/agents/` が canonical、rules は `src/.claude/rules/` が canonical）を明記 |
> | 2 | Operations Flow が `db-ops → releaser → observability` で `releaser` が本番デプロイする、ops-planner との関係が未定義（旧 :97, :184） | **まだ成立（要修正）**。`.claude/agents/operations-flow.md` の実際のトリアージ表は Light `infra-builder → ops-planner` / Standard `infra-builder → db-ops → ops-planner` / Full `infra-builder → db-ops → observability → ops-planner`。`releaser` は Operations に一切存在せず、`delivery-flow.md` Full プランのエージェント（`.claude/orchestrator-rules.md` にも明記済み）。`ops-planner` は**全プラン共通の最終フェーズ** | §2.3・§3.3 を実態のトリアージ表に置き換え、`compliance-auditor` を `ops-planner` の**後**（Operations Flow 全体の最終フック）に配置する設計を明記 |
> | 3 | 受け入れ基準「`aphelion-overview.md` の Agent Directory に追記」が #132 PR-1 のスリム化に逆行（旧 :358-361, 413） | **まだ成立（要修正）**。`src/.claude/rules/aphelion-overview.md` の `## Agent Directory` は #132 PR-1 で per-agent 表を完全削除しポインタ段落のみに縮小済み（`token-reduction.md` PR-1 Acceptance criteria に明記）。「追記」できる表はもう存在しない | 受け入れ基準を「`### Cross-cutting agents` 段落に 1 文追記 + agent 総数バッジ類の bump」に縮小（§10 参照）。#132 の決定を覆さない |
> | 4 | autonomous モードで compliance BLOCKER が停止する経路が無い | **まだ成立（新規設計が必要）**。`.claude/orchestrator-rules.md` の invariant リスト・Route B ともに `doc-reviewer` / `security-auditor` / `reviewer` / `change-classifier` G1 のみを名指し、`compliance-auditor` は不在 | 新設 §9「Autonomous モード / escalation 配線」で Route B 拡張案を設計 |

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

`src/.claude/rules/library-and-security-policy.md`（canonical パス、#212）は
"# security-auditor Mandatory Execution Rule" を定義しているが、
全 6 項目とも OWASP/CWE/依存脆弱性レベルの話で、
**NIST / PCI-DSS / SOC2 / ISO 27001 / FedRAMP / HIPAA / GDPR** 等の規約名は
リポジトリ全体で一切登場しない（grep で確認済み）。

### 2.3 既存 flow 上の準拠監査の扱い

| Flow | 規約準拠監査の現状 |
|------|--------------------|
| Discovery Flow | "Complex" 判定の triage 質問に "regulatory compliance" の語が選択肢として存在するのみ（line 120）。後続のアクションは未定義。 |
| Delivery Flow | `security-auditor` が Phase 10 で全プラン実行。規約準拠は対象外。 |
| Operations Flow | 一切なし。トリアージは Light `infra-builder → ops-planner` / Standard `infra-builder → db-ops → ops-planner` / Full `infra-builder → db-ops → observability → ops-planner`（`.claude/agents/operations-flow.md` 実測、2026-08-02、`releaser` は不在 — Delivery Flow Full プランのエージェント）。`observability` がログ・メトリクス設定するが、PCI-DSS Req. 10 等の準拠確認は行わない。 |
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

#### Operations Flow フック（推奨タイミング: `ops-planner` の後、#212 で訂正）

**訂正（#212）**: 初版は Operations Flow のエージェント順序を
`db-ops → releaser → observability` と誤認していた（`releaser` は Operations に
存在しない — Delivery Flow Full プランのエージェント。詳細は refresh banner #2 参照）。
`.claude/agents/operations-flow.md` の実際のトリアージ表（2026-08-02 時点）は
プランごとに以下の通りで、**`ops-planner` が全プラン共通の最終フェーズ**である:

| Plan | エージェント列 |
|------|----------------|
| Light | `infra-builder → ops-planner` |
| Standard | `infra-builder → db-ops → ops-planner` |
| Full | `infra-builder → db-ops → observability → ops-planner` |

```
Operations Flow（実プランに応じて infra-builder / db-ops / observability を経由）
  └─ ops-planner (既存, 全プラン共通の最終フェーズ)
      └─ Phase 末尾 (新設, 条件付き): compliance-auditor
          - 条件: COMPLIANCE_REQUIRED: true
          - 入力: 全前段成果物（infra-builder / db-ops / observability の出力）+
                  ops-planner の OPS_PLAN.md（デプロイ・rollback・運用手順）
          - 出力: COMPLIANCE_AUDIT.md（更新 — 運用レベルの評価追記）
          - 重点: PCI-DSS Req. 10（ログ記録）、Req. 11（監視）等の運用統制
```

**`ops-planner` との位置関係（issue #212 が「未定義」と指摘した点への回答）:**
`compliance-auditor` は `ops-planner` の**後**に置く。理由は 2 つ:
1. `ops-planner` が生成する `OPS_PLAN.md`（デプロイ手順・rollback 手順・インシデント対応）
   自体が PCI-DSS Req. 12（情報セキュリティポリシー）や NIST CSF `RS`/`RC` 関連の
   監査対象成果物であり、`compliance-auditor` はこれを**入力として読む**必要がある。
   `ops-planner` の前に置くと参照対象が未生成になる。
2. `ops-planner` は Operations Flow の最終フェーズという位置づけが `operations-flow.md`
   側で固定されている。`compliance-auditor` を最終フェーズの前に割り込ませると、
   Operations 本体の既存フェーズ順序を変更することになり、§3.1 の「既存 agent の役割は
   侵食しない」方針に反する。

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

> **canonical パスの訂正（#212）**: 初版はここを in-repo `.claude/rules/` 前提で書いていたが、
> 本 repo（`aphelion-agents`）自身は `.claude/rules/` の実体を持たない（`ls .claude/rules/` で
> 確認済み）。rules の canonical は `src/.claude/rules/` であり、`npx aphelion-agents init/update`
> が配布先プロジェクトの `.claude/rules/` へ展開する（`hooks-policy.md` §4 "Distribution Policy"
> と同じ canonical/配布 の非対称構造）。以下は **2 つの異なるパス** を区別して記述する。

NIST/PCI-DSS/SOC2 以外の社内独自規約への対応は、**配布先プロジェクト**（`compliance-auditor`
を実行するユーザ側のリポジトリ）の `.claude/rules/compliance-frameworks/` ディレクトリに
以下の構造でチェックリスト定義 YAML/Markdown を置けるようにする。

```
（配布先プロジェクト側 — 実行時にスキャンされるパス）
.claude/rules/compliance-frameworks/
├── nist-csf-v2.md      (Phase 1 で同梱 — 本 repo の src/.claude/rules/compliance-frameworks/
│                         から npx aphelion-agents init/update が展開したもの)
├── pci-dss-v4.md       (Phase 2 で追加)
├── soc2-tsc-2017.md    (Phase 3 で追加)
└── custom/             (ユーザ定義 — gitignore 対象外。展開の対象外、ユーザが直接作成)
    └── {framework-name}.md
```

agent は**配布先プロジェクトで**起動時にこのディレクトリをスキャンし、
`COMPLIANCE_REQUIRED` で指定されたフレームワーク名と照合する。
未知のフレームワークが指定された場合は `custom/` 配下にあるかを確認し、
なければ user に確認を求める。

一方、`nist-csf-v2.md` の**同梱元**（Phase 1 で `developer` が新規作成するファイル）は
本 repo の `src/.claude/rules/compliance-frameworks/nist-csf-v2.md` である。
ここに作成しないと `init`/`update` の配布対象に含まれず、
どの配布先プロジェクトにも展開されない（§5.1 の新規ファイル表を参照）。

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
| `.claude/agents/compliance-auditor.md` | 新 agent definition（`security-auditor.md` をテンプレートにする。agent 定義は `.claude/agents/` が canonical — src/ プレフィックス不要） |
| `src/.claude/rules/compliance-frameworks/nist-csf-v2.md` | Phase 1 同梱の NIST CSF チェックリスト（front matter + 本文）。**rules の canonical は `src/.claude/rules/`（#212）** — ここに作らないと配布されない |
| `src/.claude/rules/compliance-frameworks/README.md` | フレームワーク追加方法のガイド（同上、`src/` 配下） |

### 5.2 編集ファイル

#### `src/.claude/rules/aphelion-overview.md`（#212 でパス訂正 + 変更内容を縮小）

> **訂正（#212）**: canonical パスは `src/.claude/rules/aphelion-overview.md`
> （本 repo に `.claude/rules/` の実体は無い）。さらに、初版の「`## Agent Directory`
> セクションに追記」は #132 PR-1 で per-agent 表が完全削除されポインタ段落のみに
> なった現状（`docs/design-notes/archived/token-reduction.md` PR-1 Acceptance
> criteria "Cross-cutting agents / Doc Flow agents 表 完全削除" 参照）と矛盾する。
> 追記できる表は存在しないため、#132 の決定を覆さない形に変更内容を縮小する。

- `### Cross-cutting agents` 段落に `compliance-auditor` を追加する
  （`sandbox-runner` / `doc-reviewer` と並ぶ 1 文。**per-agent 表は作らない** — #132 PR-1 の決定を維持）
- `### Domain and Flow Overview` の "Cross-cutting agents" 注記文に
  `compliance-auditor` を追加（`sandbox-runner`, `doc-reviewer` と並記）。
  `(6 agents)` / `(13 agents)` / `(4 agents)` のドメイン別内訳は**変更しない**
  — `compliance-auditor` は cross-cutting 扱いであり、`sandbox-runner` /
  `doc-reviewer` 同様にどのドメインの中核トリアージ表にも属さないため
- 更新履歴を追加
- agent 総数バッジ・本文表記の bump は §10「Propagation targets」の波及表で一括管理する

#### `src/.claude/rules/library-and-security-policy.md`（#212 でパス訂正）

> **訂正（#212）**: canonical パスは `src/.claude/rules/library-and-security-policy.md`。

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

> **訂正（#212）**: 初版は `observability` の後に置く設計だったが、
> `observability` は Full プランのみのフェーズであり、Light/Standard には存在しない
> （§3.3「Operations Flow フック」参照）。`ops-planner` は全プラン共通の最終フェーズなので、
> こちらを基準にする。

- 全プラン共通の最終フェーズ `ops-planner` の後に "Phase: compliance-auditor (条件付き)" を追加

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
- [ ] `src/.claude/rules/compliance-frameworks/nist-csf-v2.md` のチェックリストテンプレートが存在（#212: `src/` 必須 — `.claude/rules/` は本 repo に実体を持たない）
- [ ] `src/.claude/rules/aphelion-overview.md` の `### Cross-cutting agents` 段落に `compliance-auditor` を追加し、agent 総数バッジを bump（#212: per-agent 表への「追記」ではない — #132 PR-1 でその表は削除済み。§10 参照）
- [ ] `src/.claude/rules/library-and-security-policy.md` の責任分担表に追加（#212: `src/` 必須）
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
3. NIST CSF v2.0 の公式 PDF（NIST 公開）から GOVERN / IDENTIFY / PROTECT /
   DETECT / RESPOND / RECOVER の 6 functions × 約 23 categories × 約 100 subcategories を
   `src/.claude/rules/compliance-frameworks/nist-csf-v2.md` に取り込む
   （チェックリスト形式、各項目に `auto` / `assist` / `manual` ラベル。**`src/` 必須（#212）** —
   ここに作らないと `npx aphelion-agents init/update` の配布対象に入らない）
4. 既存 `security-auditor.md` の Mission セクションに境界線記述を **追記のみ** で行う（既存内容は触らない）
5. `src/.claude/rules/library-and-security-policy.md` のセクション名変更と責任分担表更新（#212: `src/` 必須）
6. `src/.claude/rules/aphelion-overview.md` の `### Cross-cutting agents` 段落へ 1 文追加 +
   agent 総数バッジの bump のみ（#212: per-agent 表は #132 PR-1 で削除済みのため「追記」は不可。§10 参照）
7. テスト: 架空のプロジェクトで `compliance-auditor` を手動起動し、
   `COMPLIANCE_AUDIT.md` が生成されることを確認

### 8.3 注意点

- **既存 `security-auditor` の動作を変えない**: 境界線記述以外は触らない。
  既存プロジェクトでの動作互換性を必ず保つ。
- **`compliance-auditor` はオプトイン**: `COMPLIANCE_REQUIRED: true` が宣言されていない
  プロジェクトで暗黙的に起動しないこと。Minimal/Light/Standard/Full のフェーズ列を
  デフォルトで変更しない。
- **NIST CSF の項目数が多い**: agent definition file が肥大化しすぎる場合は、
  チェックリスト本体を `src/.claude/rules/compliance-frameworks/nist-csf-v2.md`（#212: `src/` 必須）
  に外出しし、agent definition は処理ロジックだけを記述する（既に §3.6 で前提済み）。
- **AGENT_RESULT の STATUS 判定**: BLOCKER（規約不適合）が 1 件以上で `STATUS: failure` を提案。
  ただし Phase 1 では運用実績がないため、初期値は user 確認可能な warning 扱い（`STATUS: success` + `BLOCKER_COUNT` フィールド）にしておく方が無難。

### 8.4 architect への申し送り（PR 1 着手前に確認推奨）

- §4 Open questions の Q1（automation coverage 比率の実測）と Q5（重複検出の方針）は
  実装着手前に `architect` で方針確定するのが望ましい
- §3.4 の `COMPLIANCE_AUDIT.md` テンプレートは draft であり、
  `architect` がフォーマット最終化することを推奨

---

## 9. Autonomous モード / escalation 配線（#212 で新規追加）

issue #212 指摘 4「autonomous モードで compliance BLOCKER が停止する経路が無い」の検証結果と設計。

### 9.1 現状（`.claude/orchestrator-rules.md` 実測、2026-08-02）

- **Invariant リスト**（"must NOT be relaxed" — `autonomous` でも常に実行される agent）:
  `doc-reviewer` 自動挿入 + rollback チェーン、`security-auditor` 実行、`reviewer` 実行、
  `change-classifier` の内部 G1 ゲートの 4 つのみ。`compliance-auditor` は不在。
- **Route A（agent 自己申告 `ESCALATION_REQUIRED: true`）**:
  `agent-communication-protocol.md` の "ESCALATION_REQUIRED — Per-Agent Trigger Table" は
  `developer` / `architect` / `security-auditor` / `tester` / `reviewer` の 5 agent のみを
  カバーする専用テーブル。`compliance-auditor` の行は存在しない。
- **Route B（orchestrator 直接検出）**: 条件は「`security-auditor` の未解決 CRITICAL」と
  「共有 rollback 上限 3 回到達」の 2 つのみ。`compliance-auditor` の BLOCKER 検出は
  どちらの条件にもマッチしない。

**結論**: issue #212 の指摘は事実として成立する。`compliance-auditor` が
`COMPLIANCE_AUDIT.md` に BLOCKER を 1 件以上出力しても、`APPROVAL_MODE: autonomous` の
下では orchestrator が検出する仕組みがなく、次フェーズへ自動的に進んでしまう。

### 9.2 設計判断

**採用方針: Route A（agent 自己申告）で配線する。Route B への追加は見送る。**

理由:
- Route B は orchestrator が `AGENT_RESULT` の特定フィールド（CRITICAL_COUNT 相当）を
  直接パースするハードコード実装であり、`security-auditor` 専用の特別扱いとして設計されている
  （`agent-communication-protocol.md` の Non-duplication rule も「Route B は orchestrator が
  既に直接観測できる条件のみ」と明記）。`compliance-auditor` 用に Route B へ新条件を追加するのは
  `security-auditor` と同格の特別扱いを増やすことになり、`ESCALATION_REQUIRED` という
  汎用の Route A 機構が既に存在する以上、車輪の再発明になる。
- Route A の Per-Agent Trigger Table パターン（`docs/design-notes/archived/approval-mode-escalation-wiring.md`
  で確立された語彙・表形式）は「既存シグナルと重複させない」ことを前提に設計されており、
  `compliance-auditor` にも同じ型がそのまま適用できる: `STATUS: failure` +
  `BLOCKER_COUNT`（§8.3 で提案済みのフィールド）が既存シグナルであり、
  Route A はそれでは解決できない「規約準拠の可否判断そのものが人間の経営判断を要する」
  ケースに限定する。

**具体設計（`architect` が `.claude/orchestrator-rules.md` 改修時に反映）:**

| 項目 | 内容 |
|------|------|
| 既存シグナル（重複させない） | `STATUS: failure` + `BLOCKER_COUNT` ≥ 1 → 通常のロールバック相当の扱い（compliance-auditor には developer への自動 rollback チェーンは無いため、通常時は HITL 承認ゲートで止まる = `interactive` では従来通り機能する） |
| Route A を使う条件 | BLOCKER が「機械的に修正可能ではない」場合 — 例: スコープ判定自体が SPEC.md で確定できない（PCI-DSS の CDE 境界が曖昧、SOC2 TSC 選定が未確定）、またはフレームワーク間で矛盾する要求がある場合 | 
| `ESCALATION_REASON` の例 | `"PCI-DSS CDE スコープが SPEC.md から判定不能 — BLOCKER 3 件が未確定スコープに起因"` |
| Per-Agent Trigger Table への追加行 | `compliance-auditor` \| なし（新規 agent、既存シグナルが無い） \| スコープ判定・フレームワーク間矛盾など、`BLOCKER_COUNT` の件数閾値だけでは表現できない判断が必要な場合 |
| invariant リストへの追加 | **追加しない** — `compliance-auditor` はオプトイン（`COMPLIANCE_REQUIRED: true` 起動時のみ）であり、`security-auditor` のような全プラン必須 agent ではない。invariant は「常に実行される」ことの宣言なので、オプトイン agent を invariant に載せるのは意味的に誤り |

**却下した代替案**: Route B へ「`compliance-auditor` の未解決 BLOCKER」を追加する案。
`security-auditor` と異なり `compliance-auditor` は起動が条件付きのため、Route B の
判定ロジック（orchestrator が常時パースする前提）に条件分岐を持ち込むことになり、
既存の Route B 実装（2 条件のみのシンプルな設計）の一貫性を崩すと判断した。

---

## 10. Propagation targets（#212）

issue #212 が指摘した誤りが本メモ以外にも存在するかを検証した結果。

### 10.1 検証コマンドと結果

| 検証対象 | コマンド | 結果 |
|---------|---------|------|
| `.claude/rules/compliance-frameworks/` の他ファイルでの出現 | `grep -rln "compliance-frameworks" . --include="*.md"` | **本メモ以外に出現なし** — canonical パスの誤りは本メモ固有 |
| Operations Flow に `releaser` を含める記述の他ファイルでの出現 | `grep -rln "releaser" docs/design-notes/*.md .claude/agents/*.md .claude/orchestrator-rules.md .claude/commands/*.md`（archived/ を除く） | `.claude/orchestrator-rules.md`・`.claude/agents/delivery-flow.md`・`.claude/commands/delivery-flow.md`・`.claude/commands/aphelion-help.md`・`.claude/agents/releaser.md`・`.claude/agents/ops-manual-author.md` のみ — **いずれも `releaser` を正しく Delivery Flow Full プランのエージェントとして記述**しており、Operations Flow の一部として誤記している箇所は無い。`ops-manual-author.md` は releaser の**出力物**（RELEASE_NOTES.md）を読む旨の記述のみで、実行フローの誤認ではない |
| agent 数 | `ls .claude/agents/*.md \| wc -l` | **42**（2026-08-02 実測） |
| agent 定義 canonical のもう一方の候補 | `ls src/.claude/agents/*.md 2>/dev/null \| wc -l` | **0** — `src/.claude/agents/` は存在しない。agent 定義は `.claude/agents/` が canonical（rules と非対称。§3.6 参照） |

### 10.2 結論

**本メモ (`docs/design-notes/compliance-auditor.md`) が唯一の誤り箇所**。
rules パスの誤認・Operations Flow の誤認とも、他の active な design-notes や
`.claude/agents/` 定義ファイルには伝播していない
（`.claude/orchestrator-rules.md` の該当行 "`releaser` belongs to delivery-flow's Full
plan, not Operations" が既に正しい記述として存在しており、本メモが取り残されていただけ）。
よって他ファイルへの修正 PR は不要。

### 10.3 agent 総数 bump の扱い（#212 §5.2/§6.1 の縮小方針の裏付け）

`compliance-auditor` は `sandbox-runner` / `doc-reviewer` と同様の **cross-cutting agent**
（単一ドメインの中核トリアージ表に属さず、`COMPLIANCE_REQUIRED: true` 時にのみ複数フローへ
条件付きでフックする）として分類する。したがって:

| 更新先 | 変更内容 |
|---|---|
| `src/.claude/rules/aphelion-overview.md` | `### Cross-cutting agents` 段落に 1 文追加のみ。`### Domain and Flow Overview` の `(6 agents)` / `(13 agents)` / `(4 agents)` ドメイン別内訳は**変更しない**（cross-cutting は元々この内訳に含まれていない — `sandbox-runner` / `doc-reviewer` も同様） |
| `README.md` / `README.ja.md` | 本文 (`42 specialized agents` 等) と shields.io バッジ `agents-42` を `43` に bump（現在 `agents-42` バッジは README.md・README.ja.md に各 1 箇所ずつ存在、2026-08-02 実測） |
| `docs/wiki/{en,ja}/Home.md` | `all 42 agents` / `42 エージェント` 表記を bump |
| `docs/wiki/{en,ja}/Agents-Delivery.md` 等 | `compliance-auditor` は Delivery 専属ではないため、**Delivery ドメインのページには追加しない**。cross-cutting agent 用のページ（`sandbox-runner` / `doc-reviewer` が載っている箇所）に追加する |
| `CHANGELOG.md` | 新エージェント追加のエントリ |

> **CI による機械検証がある。** `scripts/check-readme-wiki-sync.sh` が README / wiki の
> "N agents" 表記とバッジ ↔ `.claude/agents/` の実数を検証する。bump 時は必ず
> `bash scripts/check-readme-wiki-sync.sh` をローカルで通してから push すること。

---

## Appendix A: 参考リンク（Phase 1 では本文に埋め込まない）

- NIST Cybersecurity Framework v2.0: https://www.nist.gov/cyberframework
- PCI Security Standards Council — PCI-DSS v4.0: https://www.pcisecuritystandards.org/
- AICPA SOC 2 — Trust Services Criteria: https://www.aicpa-cima.com/

各規約の正式名称・バージョン・改訂日は Phase 1 実装時に
`.claude/rules/compliance-frameworks/{name}.md` の front matter に記録する。
