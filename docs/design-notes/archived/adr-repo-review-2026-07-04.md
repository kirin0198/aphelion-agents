# ADR: Aphelion 全体レビュー（2026-07-04）

> Last updated: 2026-07-04
> Status: Accepted
> Reference: feat/approval-mode-triage (HEAD 93b4f64)
> GitHub Issue: #166 #167 #168 #169 #170 #171 #172 #173 #174 #175 #176 #177 #178 #179 #180 #181 #182 #183 #184 #185 #186 #187 #188 #189 #190 #191 #192 #193 #194 #195 #196 #197 #198 #199 #200 #201 #202 #203 #204 #205 #206 #207 #208 #209 #210 #211 #212 #213 #214 #215 #216

## Context

Aphelion リポジトリ全体（42 エージェント定義・orchestrator-rules・14 ルールファイル・15 スラッシュコマンド・wiki 30 ページ・CI 3 workflow・CLI・設計ノート群）を外部レビュアー視点で横断レビューし、整合性の欠如と機能的矛盾を検出した。基準は現状ドキュメント（`docs/wiki/` および `src/.claude/rules/aphelion-overview.md`）に記載された設計。将来設計メモ（reviewer-enhancement / compliance-auditor / performance-optimizer / approval-mode / setup-improvement / has-ui-subflow / grillme（main）/ PRINCIPLES・release-automation（各 feature ブランチ））との整合も確認した。

背景として、直近の大規模リファクタ 3 件 — analyst モデル分割（#139）、エージェント定義簡素化（#131）+ token 削減（#132）、承認モードのトリアージ連動（#161、本ブランチ）— の伝播漏れが疑われた。

## Findings

### 統計

- **Critical: 7件**（#166–#172）
- **Warning: 44件**（#173–#216）
- **Info: 約25件**（下記に列挙、issue 化せず）

全 issue にラベル `review-finding` + 重大度（`critical` / `warning`）を付与。

### 領域別の所見

**agents（エージェント間整合性）** — 成果物名の受け渡しチェーン（INTERVIEW→…→DELIVERY_RESULT）は名称・docs/ 解決とも概ね健全。断層は3つのクラスタに集中する: (a) 本ブランチの approval-mode がオーケストレーター側と protocol にのみ配線され、発行側エージェントがゼロ（#166 ほか #178/#179/#180）、(b) analyst 分割の rename 未伝播（#175/#176/#177）、(c) ツール所有権と本文の矛盾 — architect の Bash 欠落（#167）、scaffolder のブランチ手順欠落（#186）、Bash 非所持 writer 群のコミット責務空白（#187）、AskUserQuestion の whitelist 全面欠落（#181）。

**flows（フロー整合性）** — Discovery / Operations の tier×agent 行列はエージェント自己申告と完全一致。一方 `.claude/orchestrator-rules.md` がフロー側ファイルの進化に追随しておらず（e2e-test-designer 欠落 #183、releaser 誤配置 #193、DELIVERY_RESULT テンプレ乖離 #192、MAINTENANCE_RESULT 仕様不在 #168）、maintenance-flow は APPROVAL_MODE・ゲート・rollback で canonical に無いローカル規則を発明している（#178/#179/#189）。

**docs（ドキュメント整合性）** — en/ja wiki の対・見出しパリティ・EN canonical マーカーは全 15 ペアで健全（明示的 pass）。最大の問題は wiki→リポジトリファイルの相対リンク約 220 件の一括リンク切れ（#169、サイト側 rewriter が隠蔽）と、CHANGELOG の運用停止状態（バージョン 0.3.2 止まり #199、実装済み issue の未記載多数 #200）。既知疑いのうち「token-reduction / agent-definition-simplification の CHANGELOG 未記載」は**否認**（両方記載あり）。

**commands / cli** — 既知疑い「/maintenance-flow の記載漏れ」は**否認**（全リストに記載）。実際の欠陥は逆方向: 手動インストール手順が壊れた環境を生成（#170）、doc-flow テンプレートの npm 未同梱（#203）、無効化フックの復活（#202）、update の削除リコンシリエーション不在（#207）、存在しないコマンドの案内（#206）。

**ci** — 突合キー（`> GitHub Issue:`）は 3 実装（2 workflow + check スクリプト）で char-for-char 一致を実測確認、全 active ノートが適合。ただし orphan アーカイブの PR 作成は存在しないラベルで必ず失敗（#171）、evergreen ノートの説明は実挙動と正反対（#208）、回帰ロックスクリプトは CI 未接続（#209）。

**future-design（将来設計メモ）** — 実装済みメモ（approval-mode / setup-improvement / token-reduction / #131 / grillme（main）/ has-ui（superseded））の end-state は概ね現物と一致。未着手 3 メモ（reviewer-enhancement / compliance-auditor / performance-optimizer）はいずれも 3 大リファクタ**以前**の前提で書かれており、着手前 refresh が必須（#211/#212、performance-optimizer は #131 廃止セクションを必須化しており文面どおり実装不能 #172）。ブランチ上の 2 メモ（PRINCIPLES #214 / release-automation #215）は実装可能だが強制手段・二言語生成に設計穴がある。

### Info 項目一覧（issue 化しない軽微項目）

agents:
1. `document-locations.md` の Producer 誤記 — OPS_RESULT.md は ops-planner、DISCOVERY_RESULT.md は scope-planner（Minimal のみ flow）が実producer
2. DB_OPS.md が document-locations の covered artifacts に未収載（書き手 db-ops、読み手 ops-planner/ops-manual-author/orchestrator-rules）
3. agent-communication-protocol の flow-orchestrator 例外記述が stale（maintenance-flow の Major 限定例外・doc-flow の常時 AGENT_RESULT 発行を反映せず）
4. `.claude/orchestrator-rules.md:3,331` のヘッダーが 3 フローのみ言及（maintenance / doc-flow 欠落）
5. archived 移動済みノートへの旧パス参照（protocol → analyst-model-split-design.md、6 author → doc-flow-architecture.md、check-readme-wiki-sync.yml コメント → check-readme-wiki-sync-ci-integration.md）
6. doc-flow.md の「PR 1 skeleton release」警告が stale（6 author は実装済み）
7. 細部ドリフト: analyst-intake の REPO_STATE probe に gitlab/gitea→*_scaffold マッピング欠落 / architect の手順番号「8」重複 / doc-reviewer の ARTIFACT_PATHS「Required」vs protocol「read-only は OPTIONAL」/ security-auditor の `NEXT: done`（Standard+ では doc-writer が続く）/ infra-builder の到達不能な Minimal 行（operations-flow に Minimal 無し）

flows:
8. エスカレーションゲートの AskUserQuestion が日本語ハードコード（localization-dictionary に escalation キー無し、`Output Language: en` プロジェクトで日本語ゲート）
9. 全 5 フローで APPROVAL_MODE 決定ステップがトリアージ前に番号付けされ順序実行不能（マッピングはトリアージ結果依存）、autonomous 時にトリアージ承認ゲート自体を出すかも未定義
10. maintenance Minor プランに optional security-auditor のフェーズスロット未定義 / Delivery Minimal×UI の E2E 責務が無所属
11. `orchestrator-rules.md:520` の「see §9.2-(a) in planning doc」が配布先で解決不能な宙吊り参照

docs / commands:
12. check-readme-wiki-sync.sh のコメント「31 エージェント」stale、バッジ数値・wiki ペア・フロー別数・リンク先の検査は未カバー（拡張提案は #198/#169 に記載）
13. `proposals/approval-mode-memo-archived.md` が proposals ヘッダー規約（Status/Author/Created/Last updated）に違反し、`-archived` サフィックスという未文書のライフサイクル状態を使用
14. `/delivery-flow` コマンドのチェーン表記に visual-designer / e2e-test-designer 欠落、`/maintenance-flow` コマンドが spawn 禁止の `analyst` を表記
15. `src/.claude/README.md:6-7`「rules/ のみがここにある」が stale（hooks/・settings.json も配布対象）
16. `/aphelion-check` はこのリポジトリ自身では check 2 が設計上 fail するが dogfooding 注記が無い

ci / site:
17. 突合 grep は fenced code block を除外しないため、行頭 `> GitHub Issue: [#123]` 形式の具体例をドキュメントに書くと誤マッチし得る（check-archive-match.sh Check 6 は prose 引用のみロック）
18. archive-closed-plans の未使用 `issues: read` permission / 両 workflow とも archived/ 内 basename 衝突で hard-fail / checkout がタグ pin（SHA 非固定）
19. check-readme-wiki-sync は PR-only トリガー（main 直 push は素通り）かつ advisory。GITHUB_TOKEN 作成の bot PR は pull_request workflow が走らず、週次アーカイブ PR は CI ゼロでマージ可能
20. site/ は CI ビルド・デプロイ無し（Cloudflare ダッシュボード設定のみ）。site/README:3「deployment TBD」と後段の手順記載が自己矛盾。astro.config.mjs の PAGES slug ハードコードは wiki ページ改名を検出できない

future-design:
21. approval-mode の自認済み残ギャップ: rules-designer に `## Approval Mode` テンプレ無し（ADR-005 の永続化経路が手編集のみ）、wiki（Architecture-Operational-Rules / Triage-System）未同期 — §9.7 リスク表どおりだが follow-up issue の実起票を確認すること
22. grillme の Wave ループが intake 層（Sonnet）のコスト特性を変えるが #132 §C の経済性記述に未反映（受容済みトレードオフの明文化のみ）
23. has-ui-subflow の UI_TYPE フィールドは後継（visual-designer-extraction）で未採用 — 再開時に §9 を現行設計と誤認しないこと
24. #131 design doc の DECISION 値（execute|blocked|fallback）が出荷版（allowed|asked_and_allowed|denied|skipped）とドリフト（archived、記録のみ）
25. 既知疑いの否認記録: /maintenance-flow 記載漏れ → 否認、token-reduction 等の CHANGELOG 未記載 → 否認、check-readme-wiki-sync の paths フィルタギャップ → 設計どおり（フィルタ無しが意図）

## Decision

レビュー結果を受けた対応方針:

1. **最優先（本ブランチ or 直後の PR）**: #166（ESCALATION_REQUIRED 発行側追加 — 本ブランチが導入した機能自体の欠陥であり、マージ前修正が最も安価）、#178/#179/#180（同じく approval-mode の未決事項）。次いで #171（CI ラベル — 1 行修正で済み、放置すると安全網が初回作動時に壊れる）。
2. **高優先（独立 PR、順不同）**: #167（architect Bash）、#175/#176/#177（analyst rename 一括パス）、#168（MAINTENANCE_RESULT 契約）、#169（wiki リンク一括修正 + sync-check への検査追加）、#170（手動インストール手順）、#202（無効化フック復活 — セキュリティフックの無断再有効化はユーザー信頼に関わる）。
3. **中優先**: 配布系（#197/#203/#207）、コマンド本文乖離（#204/#205/#206）、CI 強化（#208/#209/#210）、docs 数値・CHANGELOG（#198/#199/#200/#201）、フロー細部（#173/#174/#181〜#196）。
4. **将来メモの refresh（着手前必須）**: #172/#211（performance-optimizer）、#212（compliance-auditor）、#211（reviewer-enhancement）は、いずれも実装着手前にメモ自体の更新 PR を先行させる。#213〜#216 は各メモの担当 PR に同梱。
5. **対応しない項目**: Info 全 25 件は個別 issue 化せず、関連 Warning の修正 PR に同梱するか、次回レビューまで受容する。特に Info-19（bot PR の CI 素通り）と Info-20（site の CI 不在）は現運用規模ではリスク受容とする。AskUserQuestion の whitelist 問題（#181）は Claude Code プラットフォームのサブエージェント対話仕様の検証が先であり、検証結果次第で「明文化のみ」に縮小し得る。

横断的な再発防止として、`scripts/check-readme-wiki-sync.sh` へのバッジ数値・リンク先検査の追加（#169/#198 内で対応）と、`check-archive-match.sh` の CI 接続（#209)を推奨する。3 大リファクタ（#131/#132/#139/#161）で繰り返された「canonical 側だけ・オーケストレーター側だけ更新して対向を忘れる」パターンに対しては、protocol の Field Reference に発行者ファイルへの往復リンクを義務付けるガイドライン追記を検討する。

## Consequences

- 期待効果: autonomous モードの安全機構（エスカレーション）が実際に機能するようになり、Major ハンドオフ・doc-flow 初回実行・orphan アーカイブなど「初めて踏んだ時に壊れる」潜在パスが解消される。ドキュメントの信頼性（リンク・数値・CHANGELOG）が回復し、将来メモ 3 件が実装可能な状態に更新される。
- トレードオフ: 51 issue の起票によりトラッカーのノイズが一時的に増える（`review-finding` ラベルでフィルタ可能）。Info 項目の非対応により軽微な不整合は残存する。
- 将来設計メモへの影響: reviewer-enhancement / compliance-auditor / performance-optimizer は refresh 完了まで着手ブロック。approval-mode の後続（wiki 同期・rules-designer テンプレ）は #161 の残作業として追跡が必要。
- 本 ADR は `> GitHub Issue:` ヘッダー規約に従うため、行頭直後の #166 が close された時点で archive 自動化の対象になる（先頭 issue のみが突合キーとして有効という規約仕様による）。レビュー記録としては archived/ への移動で問題ない。
