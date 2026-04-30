# feat: add doc-flow orchestrator for customer-deliverable doc generation (MVP=6 types)

> Last updated: 2026-04-30
> Update history:
>   - 2026-04-26: Initial draft (HLD/LLD + Aphelion meta-doc maintenance, 系統 A/B/C × 種別 P/M)
>   - 2026-04-30: reframe to focus on customer-deliverable generation per #54 user clarification (MVP=6 types)
>
> Reference: current `main` (HEAD `e56a58d`, 2026-04-30)
> Created: 2026-04-26
> Reframed: 2026-04-30
> Analyzed by: analyst (2026-04-26 / reframed 2026-04-30)
> Author: analyst (design-only phase — no implementation yet)
> Scope: design / planning document; the change will be executed in a follow-up `architect` → `developer` phase
> GitHub Issue: [#54](https://github.com/kirin0198/aphelion-agents/issues/54)
> Next: architect
> Implemented in: TBD

---

## 1. Background & Motivation

### 1.1 ユーザの再整理（2026-04-30 ヒアリング）

初版 (2026-04-26) は「Aphelion 自身の wiki/rules 改訂」と「プロジェクトの HLD/LLD 起票」を等価並列で扱っていたが、
ユーザの追加コンテキストで主軸が再定義された:

> **doc-flow の主軸は、Aphelion で実装した顧客プロジェクトの "納品物 / ユーザ向け補足資料" を、
> Discovery/Delivery/Operations が産んだ artifact から派生生成すること。**

つまり Aphelion 内部の SPEC.md / ARCHITECTURE.md / SECURITY_AUDIT.md / TEST_PLAN.md などは
**社内設計成果物 (intra-team)** であり、それを **顧客 / 運用担当 / エンドユーザ向けに再パッケージ** する経路が
従来 Aphelion には存在しない。doc-flow の MVP はこの再パッケージ責務に特化する。

### 1.2 既存 4 フローではカバーしきれない隙間（再整理）

| 顧客成果物 | 現状の取り扱い | 不足点 |
|---|---|---|
| **HLD** (顧客提示用システム全体設計書) | architect が ARCHITECTURE.md（実装直前 LLD 寄り）を出すのみ | 顧客への設計説明粒度の doc が無い |
| **LLD** (詳細設計書) | ARCHITECTURE.md が部分的に兼ねるが、顧客提出形式に整っていない | 顧客テンプレ準拠の体裁 / 章立てが無い |
| **運用マニュアル** (運用担当者向け) | Operations Flow が runbook を出すが、社内向け | 顧客運用部門への引き渡し体裁が無い |
| **API リファレンス** (顧客開発者向け) | doc-writer が API doc を生成するが、内部開発者視点 | 外部向け SDK / API 利用ガイドの粒度が無い |
| **エンドユーザ利用マニュアル** | UI_SPEC.md は設計仕様 | 操作手順 / スクリーンショット入りの利用者向け doc が無い |
| **引継ぎ資料** (案件クローズ時) | 該当 agent なし | プロジェクト終了時の保守引継ぎパッケージが無い |

### 1.3 既存 doc 関連 agent との位置関係（重複を避ける境界線）

| 既存 agent | 既存責務 | doc-flow との境界 |
|---|---|---|
| `spec-designer` | SPEC.md (社内仕様) | doc-flow は SPEC.md を **入力** として読むのみ |
| `architect` | ARCHITECTURE.md (社内設計) | doc-flow は ARCHITECTURE.md を **入力** として読み、HLD/LLD に再パッケージ |
| `ux-designer` | UI_SPEC.md (社内画面設計) | doc-flow は UI_SPEC.md を **入力** として読み、エンドユーザ利用マニュアルに再パッケージ |
| `doc-writer` | README / CHANGELOG / 内部開発者向け API doc | doc-flow の API リファレンス（顧客向け）とは粒度・読者が違う。re-use せず並列 |
| `codebase-analyzer` | リバース SPEC/ARCH | doc-flow の前段として呼ぶ可能性はあるが MVP では呼ばない |

doc-flow は **既存 agent の出力を入力に取り、顧客向け doc を派生生成するだけ** で、既存 agent と generation 責務が重複しないよう設計する。

### 1.4 初版 (2026-04-26) からの変更点

| 項目 | 初版 (2026-04-26) | reframe 後 (2026-04-30) |
|---|---|---|
| 主軸 | 「Aphelion 自身の wiki 維持」と「HLD/LLD 起票」の等価並列 | **顧客納品物の派生生成** に一本化 |
| 種別 P/M 軸 | プロジェクト / Aphelion 自身を 1 flow で吸収 | M (Aphelion 自身) は **Phase 2 以降に降格** |
| 系統 A/B/C 軸 | 新規 / 更新 / 再構成の 3 系統 | MVP では doc type ごとに新規生成のみ。差分更新は Phase 2 |
| MVP scope | HLD/LLD + Aphelion 自身 | **6 doc type** (HLD / LLD / 運用マニュアル / API リファレンス / エンドユーザ利用マニュアル / 引継ぎ資料) |
| 位置付け | 5 番目のフロー | 5 番目のフロー（変更なし） |
| テンプレ | 暫定定義のみ | **Aphelion 内蔵テンプレ + プロジェクト側カスタムテンプレ優先** のハイブリッド |
| 言語切替 | 未定 | **起動時引数 `--lang`**、未指定時は project-rules.md の Output Language |

---

## 2. Current state evidence

### 2.1 入力可能な Aphelion artifact 一覧

| Source agent | Artifact | doc-flow の入力としての利用 |
|---|---|---|
| `spec-designer` | `SPEC.md` | HLD, LLD, エンドユーザ利用マニュアル, 引継ぎ資料 |
| `architect` | `ARCHITECTURE.md` | HLD, LLD, 引継ぎ資料 |
| `ux-designer` | `UI_SPEC.md` | エンドユーザ利用マニュアル |
| `developer` | `TASK.md`（履歴）, src/* | LLD（実装確認用）, 引継ぎ資料 |
| `tester` | `TEST_PLAN.md`, テスト結果 | 引継ぎ資料 |
| `security-auditor` | `SECURITY_AUDIT.md` | 引継ぎ資料 |
| `infra-builder` / `releaser` | infra スクリプト, deploy 手順 | 運用マニュアル |
| `observability` | runbook, アラート定義 | 運用マニュアル |
| `doc-writer` | README, CHANGELOG, 内部 API doc | API リファレンス（参考のみ。再生成） |
| `analyst` | `docs/design-notes/<slug>.md` | 引継ぎ資料の補足 |

### 2.2 既存 doc 関連 agent との重複回避

doc-flow が **新規生成** する doc と、既存 agent が **既に生成している** doc は明確に分離する:

- **doc-flow が生成する** (顧客 / 運用担当 / エンドユーザ向け): HLD, LLD, 運用マニュアル, API リファレンス（顧客向け）, エンドユーザ利用マニュアル, 引継ぎ資料
- **既存 agent が生成する** (社内向け): SPEC.md, ARCHITECTURE.md, UI_SPEC.md, README, CHANGELOG, 内部 API doc, SECURITY_AUDIT.md, TEST_PLAN.md, runbook（社内向け）, design-notes

### 2.3 既に存在する周辺仕組み

- `.claude/orchestrator-rules.md`: orchestrator 共通ルールの集約点。新フロー登録時に追記
- `.claude/rules/aphelion-overview.md`: Domain 紹介・Agent Directory・Branching by Product Type の集約点
- `.claude/commands/`: slash command 定義置き場（`/doc-flow` 新設）
- `.claude/templates/`: 既存テンプレ置き場（doc-flow 用サブディレクトリを新設）

---

## 3. Constraints

- **入力は既存 Aphelion artifact のみ**: doc-flow は外部システムへのアクセスや新規ヒアリングを行わない。すべて Aphelion 内 artifact の再パッケージで完結する
- **bilingual sync 対象外**: 顧客納品物は単一言語で生成する。`docs/wiki/{en,ja}/` のような en/ja 同時更新ルールは適用しない
- **既存 agent との generation 重複禁止**: doc-writer / architect / spec-designer 等が既に生成する成果物を二重生成しない。既存 artifact を入力に取り、再パッケージのみ
- **コードファイルを変更しない**: doc-flow 内で `developer` agent を呼ばない。`src/**`, `bin/**` 等は Read のみ
- **MVP scope 固定**: 6 doc type に絞る。Phase 2 以降に拡張する doc type は §4.6 で明示
- **テンプレ resolution 順序固定**: プロジェクト側カスタムテンプレが Aphelion 内蔵テンプレに優先する（カスタムが無ければ内蔵を採用）
- **言語切替**: 起動時引数 `--lang` で per-invocation 切替。未指定時は project-rules.md の Output Language

---

## 4. Approach (Decided)

ユーザ判断 (2026-04-30):
- **Q1 (MVP doc type set)** = **B**: 標準 6 種
- **Q2 (位置づけ)** = **α**: 第 5 のフロー（独立 orchestrator）
- **Q3 (テンプレート方針)** = **ii+iii ハイブリッド**: 内蔵デフォルト + プロジェクトカスタム優先
- **Q4 (出力言語切替方針)** = **II**: 起動時引数 `--lang`

### 4.1 MVP scope: 6 doc types

| # | Doc type | 派生元 (入力 artifact) | 想定読者 | 出力 path（暫定） | 採用テンプレ章立て（暫定） |
|---|---|---|---|---|---|
| 1 | **HLD (High-Level Design)** | SPEC.md, ARCHITECTURE.md | 顧客プロジェクト統括 / 顧客アーキテクト | `docs/deliverables/{slug}/hld.md` | 1. システム概要 / 2. システム全体構成 / 3. サブシステム分割 / 4. 外部連携 / 5. 非機能要件 / 6. 採用技術 / 7. 制約・前提 |
| 2 | **LLD (Low-Level Design)** | ARCHITECTURE.md, src/*, TASK.md（履歴） | 顧客開発者 / 保守担当 | `docs/deliverables/{slug}/lld.md` または `docs/deliverables/{slug}/lld/<module>.md` | 1. モジュール構成 / 2. クラス・関数仕様 / 3. データ構造 / 4. API シグネチャ / 5. アルゴリズム / 6. エラーハンドリング |
| 3 | **運用マニュアル** | infra スクリプト, deploy 手順, observability runbook | 顧客運用担当者 | `docs/deliverables/{slug}/ops-manual.md` | 1. システム構成図 / 2. 起動・停止手順 / 3. デプロイ手順 / 4. 監視・アラート対応 / 5. バックアップ・リストア / 6. トラブルシュート / 7. 連絡先 |
| 4 | **API リファレンス** (顧客開発者向け) | SPEC.md (UC), ARCHITECTURE.md, src/* (signature) | 顧客側で API を利用する開発者 | `docs/deliverables/{slug}/api-reference.md` | 1. 認証 / 2. 共通仕様（リクエスト・レスポンス・エラー）/ 3. エンドポイント別仕様 / 4. サンプルコード / 5. レート制限 / 6. 変更履歴 |
| 5 | **エンドユーザ利用マニュアル** | UI_SPEC.md, SPEC.md (UC) | 業務システムの実利用者 | `docs/deliverables/{slug}/user-manual.md` | 1. はじめに / 2. ログイン・基本操作 / 3. 機能別操作手順 / 4. よくある質問 / 5. 用語集 |
| 6 | **引継ぎ資料** (案件クローズ時パッケージ) | SPEC.md, ARCHITECTURE.md, SECURITY_AUDIT.md, TEST_PLAN.md, design-notes/* | 後任保守チーム / 顧客 | `docs/deliverables/{slug}/handover.md` | 1. プロジェクト概要 / 2. 設計判断履歴 / 3. 既知の課題・宿題 / 4. テスト・セキュリティ監査結果サマリ / 5. 運用申し送り / 6. 関連 doc 索引 |

> **§7 Open question**: 出力 path を `docs/deliverables/{slug}/` で固定するか、プロジェクト側で override 可能にするかは architect で確定する。

### 4.2 位置付け: 第 5 のフロー (α)

doc-flow は **Discovery / Delivery / Operations / Maintenance と並列の独立 orchestrator** として新設する。

```
Discovery Flow ──[DISCOVERY_RESULT.md]──▶ Delivery Flow ──[DELIVERY_RESULT.md]──▶ Operations Flow
                                          (design & impl)                       (deploy & ops)

                    Maintenance Flow ──[MAINTENANCE_RESULT.md]──▶ Delivery Flow (Major only)
                    (existing project maintenance)

                    doc-flow (NEW)
                    (顧客納品物 / ユーザ向け補足資料の派生生成)
                    入力: 既存 Aphelion artifact / 出力: docs/deliverables/{slug}/*.md
```

- 起動方法: スラッシュコマンド `/doc-flow [--lang {ja|en}] [--types {hld,lld,...}]`
- 他フローからの自動連鎖はしない（既存 4 フローと同じ方針）。ユーザが明示起動する
- triage は doc type 数 / 出力規模で Minimal/Light/Standard/Full を判定（詳細は architect へ）

### 4.3 テンプレ方針: 内蔵デフォルト + プロジェクトカスタム優先 (ii+iii ハイブリッド)

#### 4.3.1 配置

```
.claude/templates/doc-flow/         # Aphelion 内蔵デフォルト（リポジトリ同梱）
├── hld.md
├── lld.md
├── ops-manual.md
├── api-reference.md
├── user-manual.md
└── handover.md

{project_root}/.claude/templates/doc-flow/   # プロジェクト固有カスタム（任意）
├── hld.md          # 同名ファイルがあればこちらが優先
└── ...
```

#### 4.3.2 Resolution order (確定)

各 author agent は以下の順序でテンプレを解決する:

1. `{project_root}/.claude/templates/doc-flow/{doc-type}.md` が存在 → これを採用
2. それが無ければ Aphelion 内蔵 `.claude/templates/doc-flow/{doc-type}.md` を採用
3. どちらも無ければ author agent 内蔵フォールバックテンプレ（最低限の章立てのみ）

> **§7 Open question**: テンプレ自体に変数 (`{{project_name}}`, `{{slug}}`) を埋める方式にするか、author agent が章立てだけ参照して各章の本文を artifact から組み立てる方式にするかは architect で確定する。

### 4.4 言語切替: 起動時引数 (II)

#### 4.4.1 引数仕様（暫定）

```
/doc-flow                      # project-rules.md の Output Language を採用
/doc-flow --lang ja            # 強制 ja
/doc-flow --lang en            # 強制 en
/doc-flow --lang ja --types hld,lld   # 種類も限定
```

#### 4.4.2 言語適用範囲

- 出力 doc 本文の自然言語: `--lang` 値
- skeleton heading（`## 1. システム概要` 等）: テンプレが en/ja 両方を持つか runtime 翻訳するかは §7 で論点化
- 既存 artifact から引用するコード片・ID・固有名詞: そのまま転載（言語切替対象外）

> **§7 Open question**: テンプレを en/ja 別ファイルにする (`hld.en.md` / `hld.ja.md`) か、単一テンプレで章タイトルを runtime 翻訳するかは architect で確定する。

### 4.5 構成 agent

#### 4.5.1 新規 agent

| Agent | 目的 | tools (暫定) | 出力 |
|---|---|---|---|
| `doc-flow` (orchestrator) | フロー全体の統括、triage、author 群への dispatch | Read, Write, Bash, Glob, Grep, Agent | `DOC_FLOW_RESULT.md` |
| `hld-author` | HLD 生成 | Read, Write, Glob, Grep | `docs/deliverables/{slug}/hld.md` |
| `lld-author` | LLD 生成 | Read, Write, Glob, Grep | `docs/deliverables/{slug}/lld.md` |
| `ops-manual-author` | 運用マニュアル生成 | Read, Write, Glob, Grep | `docs/deliverables/{slug}/ops-manual.md` |
| `api-reference-author` | API リファレンス生成 | Read, Write, Glob, Grep | `docs/deliverables/{slug}/api-reference.md` |
| `user-manual-author` | エンドユーザ利用マニュアル生成 | Read, Write, Glob, Grep | `docs/deliverables/{slug}/user-manual.md` |
| `handover-author` | 引継ぎ資料生成 | Read, Write, Glob, Grep | `docs/deliverables/{slug}/handover.md` |

> **§7 Open question**: Bash / Edit を author agent に持たせるか（例: 既存 deliverable の差分更新時に Edit が必要）は architect で確定する。

#### 4.5.2 既存 agent の再利用

MVP では既存 agent を **doc-flow 内から呼び出さない**（入力 artifact を Read するのみ）。
理由: 既存 agent (architect, spec-designer 等) は社内向け artifact の生成 / 更新を責務とし、
顧客向け doc 生成は責務範囲外。再利用すると責務境界が曖昧になる。

ただし `reviewer` を **doc-flow の最終フェーズ** で呼び出し、
6 doc 間の整合性レビュー（HLD ↔ LLD の矛盾、API リファレンスと SPEC.md の乖離など）を行うことは検討に値する。

> **§7 Open question**: reviewer を doc-flow の最終フェーズに組み込むか、独立 review として後段で呼ぶかは architect で確定する。

### 4.6 Phase 2 以降に降格した doc type / 機能

本 MVP では扱わず、後続 issue で再検討する:

- **追加 doc type 候補**:
  - SRS (Software Requirements Specification, 顧客提出形式)
  - セキュリティレポート (顧客版): SECURITY_AUDIT.md の顧客向けサマリ
  - テスト結果報告書: TEST_PLAN.md + 実行結果の顧客向けサマリ
  - SLA / SLO 定義書
  - 移行計画書 (旧システムからの移行手順)
  - 設計レビュー資料 (顧客レビュー用プレゼン)
  - トレーニング資料 (顧客側担当者向けハンズオン)
  - ADR (Architecture Decision Records) 集約
  - CMDB (構成管理情報の顧客提出形式)
- **追加機能**:
  - **Aphelion 自身のメタ doc 維持系統** (旧 design-note の系統 B + 種別 M): wiki ja/en 同期チェック / rules 改訂支援 / agent 定義棚卸し。Phase 2 以降で再検討、または別 issue 切り出し
  - **既存 doc の差分更新モード** (系統 B): MVP は新規生成のみ。差分更新は Phase 2
  - **doc 再構成モード** (系統 C): 複数 md の分割 / 統合 / リネーム。Phase 2
  - **archive された artifact (例: 過去版 SECURITY_AUDIT.md) の読み取り**: §7 で論点化
  - **過去 deliverable の再生成 (re-pack)**: バージョン違いでの再パッケージ

---

## 5. Document changes

### 5.1 新規ファイル

| ファイル | 内容 |
|---|---|
| `.claude/agents/doc-flow.md` | orchestrator 定義 |
| `.claude/agents/hld-author.md` | HLD author agent |
| `.claude/agents/lld-author.md` | LLD author agent |
| `.claude/agents/ops-manual-author.md` | 運用マニュアル author agent |
| `.claude/agents/api-reference-author.md` | API リファレンス author agent |
| `.claude/agents/user-manual-author.md` | エンドユーザ利用マニュアル author agent |
| `.claude/agents/handover-author.md` | 引継ぎ資料 author agent |
| `.claude/templates/doc-flow/hld.md` | HLD デフォルトテンプレ |
| `.claude/templates/doc-flow/lld.md` | LLD デフォルトテンプレ |
| `.claude/templates/doc-flow/ops-manual.md` | 運用マニュアルデフォルトテンプレ |
| `.claude/templates/doc-flow/api-reference.md` | API リファレンスデフォルトテンプレ |
| `.claude/templates/doc-flow/user-manual.md` | エンドユーザ利用マニュアルデフォルトテンプレ |
| `.claude/templates/doc-flow/handover.md` | 引継ぎ資料デフォルトテンプレ |
| `.claude/commands/doc-flow.md` | slash command 定義 |

> en/ja 両言語サポートのためテンプレ命名 (`hld.md` 単一 vs `hld.en.md` / `hld.ja.md`) は §7 Open questions で architect が決める。本 §5.1 は単一ファイル前提で記載しているが、二言語ファイル方式採用時は同名 + 言語サフィックスで増える。

### 5.2 修正ファイル

| ファイル | 変更内容 |
|---|---|
| `.claude/orchestrator-rules.md` | doc-flow を 5 番目のフローとして登録、triage 表追加 |
| `.claude/rules/aphelion-overview.md` | Domain 紹介に doc-flow 追記、Agent Directory に 7 agent 追記、Branching by Product Type 表に doc-flow 列追加 |
| `.claude/commands/aphelion-help.md` | Orchestrators 表に `/doc-flow` 追加 |
| `docs/wiki/en/Home.md` | agent count 更新、5th flow 追加 |
| `docs/wiki/ja/Home.md` | 同上 (ja) |
| `docs/wiki/en/Triage-System.md` | doc-flow Triage 表追加 |
| `docs/wiki/ja/Triage-System.md` | 同上 (ja) |
| `docs/wiki/en/Architecture-Domain-Model.md` | 4 フロー前提を 5 フロー前提に更新 |
| `docs/wiki/ja/Architecture-Domain-Model.md` | 同上 (ja) |
| `docs/wiki/en/Agents-Orchestrators.md` | doc-flow セクション追加 |
| `docs/wiki/ja/Agents-Orchestrators.md` | 同上 (ja) |
| `README.md` | フロー数表記 (4 → 5)、agent count 更新、概要表更新 |
| `README.ja.md` | 同上 (ja) |

> **新ページ案** (architect 判断): `docs/wiki/{en,ja}/Agents-Doc.md` を新設し、6 author agent を Discovery/Delivery と同じ位置づけで独立ページ化する案あり。Agents-Orchestrators.md にまとめるか分離するかは architect で確定。

### 5.3 更新しないファイル

- `SPEC.md` / `ARCHITECTURE.md` （aphelion-agents 自身は agent 定義集約 repo であり、自身の SPEC/ARCH を持たない方針）
- 既存 4 フローの agent 定義（責務境界は doc-flow 側で吸収）

---

## 6. PR Strategy

MVP 完成までに 3 つの PR を直列で merge する。

### PR 1: Orchestrator skeleton + agent skeleton + slash command 登録

- 新規: `.claude/agents/doc-flow.md`（本実装）+ `hld-author.md`〜`handover-author.md`（skeleton のみ、生成ロジックは PR 2）
- 新規: `.claude/commands/doc-flow.md`
- 修正: `.claude/orchestrator-rules.md`, `.claude/rules/aphelion-overview.md`, `.claude/commands/aphelion-help.md`
- 検証: `/doc-flow` 起動 → triage 質問 → DOC_FLOW_RESULT.md 生成（中身は空でも可）まで
- branch: `feat/doc-flow-orchestrator-skeleton`

### PR 2: 6 種テンプレ + 各 author agent 本実装

- 新規: `.claude/templates/doc-flow/{6 種}.md`
- 修正: `.claude/agents/{6 author agent}.md`（本実装、テンプレ resolution + artifact 読み取り + doc 生成）
- 検証: 既存 Aphelion artifact を入力に 6 doc を生成できるか dogfooding（aphelion-agents repo 自身を顧客プロジェクトに見立てて 1 doc を試行）
- branch: `feat/doc-flow-authors`

### PR 3: wiki + README sync

- 修正: `docs/wiki/{en,ja}/Home.md`, `Triage-System.md`, `Architecture-Domain-Model.md`, `Agents-Orchestrators.md`
- 修正: `README.md`, `README.ja.md`
- 新規（任意・architect 判断）: `docs/wiki/{en,ja}/Agents-Doc.md`
- 検証: `scripts/check-readme-wiki-sync.*` 等の advisory が通る
- branch: `docs/doc-flow-wiki-readme`

各 PR は MVP 完成までに直列 merge。PR 1 だけが merge された段階では機能未完だが、orchestrator 雛形のみ取り込まれる中間状態を許容する。

---

## 7. Open questions（architect 判断に残す）

本 issue の analyst 範囲では決着させない。architect が確定し ARCHITECT_BRIEF として developer に渡す。

### Q-A. 各 author agent の Tools 構成

- Read / Write は必須。Bash は不要に思えるが、テンプレ resolution の `ls` や git log 引用で必要かも
- Edit は MVP では不要 (新規生成のみ) だが、Phase 2 で差分更新を入れる際に追加する想定
- 推奨: MVP は `Read, Write, Glob, Grep` のみ。Bash は orchestrator (`doc-flow`) のみ持つ

### Q-B. 出力 path 戦略

- `docs/deliverables/{slug}/{doc-type}.md` で固定するか、プロジェクト側で override 可能にするか
- `{slug}` の決定方法（プロジェクト名から派生 / `--slug` 引数で明示 / 起動時に対話質問）
- 推奨: MVP は `docs/deliverables/{slug}/` 固定、`{slug}` は `--slug` 引数 + 未指定時は起動時質問

### Q-C. テンプレ言語切替方式

- (i) en/ja 別テンプレファイル方式: `.claude/templates/doc-flow/hld.en.md` / `hld.ja.md`
- (ii) 単一テンプレ + runtime 翻訳: テンプレは en 固定、章タイトルを runtime に `--lang ja` 指定で翻訳
- 推奨: (i) 別ファイル方式（カスタムテンプレ作成時にユーザが章名を翻訳しやすい）

### Q-D. テンプレ変数埋め込み方式

- (a) テンプレ自体に `{{project_name}}` 等の placeholder を持たせ author agent が置換
- (b) author agent が章立てのみ参照し、本文は artifact から都度組み立て
- 推奨: (a) を基本。固定値は placeholder で、artifact 由来の長文本文は agent 動的生成

### Q-E. エンドユーザ利用マニュアルの section 構成

- 画面別 (SCR-001 ごとに 1 章) vs UC 別 (UC-001 ごとに 1 章)
- UI_SPEC.md が無いプロジェクト (UI 無しツール / ライブラリ) では user-manual-author をどう振る舞わせるか
- 推奨: UC 別を基本、UI_SPEC.md がある場合は画面操作スクショ案内を補足。UI 無しプロジェクトでは user-manual-author を skip し、`AGENT_RESULT: skipped (no UI)` を返す

### Q-F. アーカイブされた artifact の読み取り戦略

- 引継ぎ資料は `docs/design-notes/archived/` 以下の過去ノートも参照したいか、最新 artifact のみか
- 推奨: MVP は最新 artifact のみ。`archived/*.md` 参照は Phase 2

### Q-G. reviewer を doc-flow 最終フェーズに組み込むか

- HLD ↔ LLD ↔ API リファレンスの整合性チェックは reviewer の責務に入るか
- 推奨: MVP は組み込まず、`/reviewer` を別途呼ぶ運用。doc-flow の AGENT_RESULT で reviewer 起動を suggest

### Q-H. ARCHITECT_BRIEF / agent skeleton の段階で確定すべき互換性

- テンプレ format が将来 PR で更新された際、既に生成済みの deliverable をどう扱うか（再生成 / 差分マージ / 放置）
- 推奨: MVP は再生成を前提。既存 deliverable を上書きする際は AskUserQuestion で確認

---

## 8. Handoff brief for architect

### 8.1 HANDOFF_TO

`architect`

### 8.2 architect で確定すべきこと

- §7 Open questions Q-A〜Q-H の全項目（推奨案を採用するか、別案を選ぶか）
- 各 author agent の入出力契約 (`AGENT_RESULT` の必須フィールド)
- doc-flow orchestrator の triage 仕様 (Minimal/Light/Standard/Full の判定軸)
- `--types` 引数で doc type を限定起動した場合の依存関係 (例: `--types lld` 単独起動時に HLD 不在のままでよいか)
- PR 分割の最終確定（§6 案を採用するか、PR 数を増減するか）
- テンプレ命名規則と en/ja 切替方式の確定

### 8.3 リスク / 留意点

- **テンプレ更新時の互換性**: PR 2 以降でテンプレ章立てを変えると、過去 deliverable と齟齬が出る。テンプレに version 番号を持たせるか検討
- **エンドユーザマニュアルの UI fallback**: UI_SPEC.md が無いプロジェクト（CLI / library）で user-manual-author を呼ぶと空の doc になる。skip 戦略を確定すること
- **API リファレンスと doc-writer の重複**: doc-writer が既に内部 API doc を出している場合、顧客向け API リファレンスとの差分（公開範囲・粒度）を author agent でどう判定するか
- **`{slug}` の衝突**: 同じ project_root で複数の slug が指定されると `docs/deliverables/{slug}/` が枝分かれする。既存 deliverable があった場合の上書き挙動を確定
- **Aphelion 自身を dogfooding する場合**: aphelion-agents 自身は SPEC.md を持たない方針。dogfooding 時は doc-flow に「アーキテクト構成書」のみを生成させる等の特例を architect で設計

### 8.4 参照すべきファイル

- 既存 orchestrator: `.claude/agents/discovery-flow.md`, `delivery-flow.md`, `operations-flow.md`, `maintenance-flow.md`
- 既存 doc 関連 agent: `.claude/agents/doc-writer.md`, `architect.md`, `spec-designer.md`, `ux-designer.md`
- ルール: `.claude/rules/aphelion-overview.md`, `.claude/orchestrator-rules.md`, `.claude/rules/agent-communication-protocol.md`, `.claude/rules/language-rules.md`
- テンプレ系: `.claude/templates/`（既存 layout 把握）
- wiki テンプレート: `docs/wiki/en/Agents-Orchestrators.md`（en/ja 構造把握）
