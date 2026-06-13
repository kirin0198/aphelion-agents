# 設計メモ: grill-me 思想の取り込み

> ステータス: 調査完了・設計未着手
> 着手予定: Claude Code に依頼予定
> 対象エージェント: interviewer（Discovery）/ analyst

---

## 目的

「ユーザーの意図とエージェントの解釈が一致するまで問答を行う」という
grill-me の思想を interviewer / discovery-flow / analyst に取り込む。

---

## grill-me の核心思想（調査結果）

出典: mattpocock/skills, Jekudy/grillme-skill 他

- Claude Code は早い段階でプランを吐き出し、相互理解の前にドキュメント化してしまう傾向がある。grill-me はその会話を強制する
- 一度に1つずつ的を絞った質問をして情報過多を避ける
- 曖昧・リスキー・矛盾した発言には積極的に反論する（assumption validation）
- アーキテクチャ・データ・UX のあらゆる分岐を体系的に特定する（決定木の網羅）
- 構造化された質問の波（Wave）:
  - Wave 1（3-5問）: 目標・コンテキスト・制約
  - Wave 2（2-4問）: エッジケース・矛盾・依存関係
  - Wave 3+（1-3問）: 矛盾・暗黙の前提・盲点
- コードベースで答えられる質問は、ユーザーに聞かずコードベースを探索する
- 「The Design of Design」(Frederick P. Brooks) の design tree が概念的背景

---

## Aphelion 現状との一致度

| grill-me 要素 | Aphelion 現状 | 一致度 |
|------|------|------|
| 問答で意図を引き出す | interviewer が要件インタビュー実施 | 部分的 |
| 1問ずつ質問 | AskUserQuestion 最大4問バンドル | 逆方向 |
| 曖昧・矛盾への能動的反論 | メカニズムなし | なし |
| 決定木の全分岐を体系的に探索 | 構造化質問はあるが網羅概念なし | 部分的 |
| Wave 構造（段階的深掘り） | フェーズ分けはあるが Wave 的深掘りなし | 部分的 |
| 「合意に達するまで」継続 | 1パスで完了・ループなし | なし |
| コードで分かることは聞かない | codebase-analyzer が別途存在 | 一致 |
| 不明点の明示 | analyst のセンチネル機構が類似 | 一致 |

---

## 最も乖離している3点（取り込み候補）

### 1. 問答ループの欠如
grill-me は「合意に達するまで」繰り返すが、interviewer は基本1パスで終了。
→ 「意図とエージェントの解釈が一致したか」を確認する合意ゲートの導入を検討。

### 2. 能動的な反論（assumption validation）
grill-me は曖昧・矛盾・リスクある発言に積極的に反論するが、Aphelion にはない。
→ ユーザー回答に矛盾・曖昧さがあれば能動的に指摘・再質問する仕組みを追加。

### 3. 決定木の網羅性
grill-me は「あらゆる分岐を解決するまで」を目標にするが、Aphelion は構造化質問にとどまる。
→ Wave 構造（基礎 → エッジケース → 暗黙の前提）の段階的深掘りを導入。

---

## 既に一致している点（取り込み不要）

- センチネル機構（`Unknown — to be confirmed by analyst`）= 不明点の明示的追跡
- codebase-analyzer の存在 = コードで分かることは聞かない
- interviewer / analyst という問答専任エージェントの存在自体

---

## 取り込み時の前提

### トークン消費は考慮しない
interviewer / analyst が担うのは「設計の核となる意図のすり合わせ」であり、
最上流の工程である。ここでの認識のズレは後続全フェーズ（architect以降）に伝播し、
rollback・手戻りで遥かに大きなトークンを消費する。
**上流の問答に投資することが全体のトークン効率を最適化する** という構造のため、
interviewer / analyst の問答に関してはトークン消費量を考慮しない。

- 「1問ずつ」の grill-me 流をそのまま採用してよい（4問バンドルに縛られない）
- 問答ループ・assumption validation を制約なく実装してよい
- トリアージによる grill 深度の調整も不要（常に十分な深さで問答する）

> 注: この前提は interviewer / analyst に限定。他エージェントは
> token-reduction-memo / agent-definition-simplification-memo の削減方針に従う。

---

## 取り込み方向性（予備設計）

```
interviewer / analyst（grill モード強化）
  Wave 1: 目標・コンテキスト・制約
      ↓
  Wave 2: エッジケース・矛盾・依存関係
      ↓ assumption validation: 矛盾・曖昧があれば指摘・再質問
  Wave 3+: 暗黙の前提・盲点（1問ずつでも可）
      ↓
  合意ゲート: 「意図と解釈が一致したか」を確認
      ↓ 不一致なら Wave に戻る（ループ）
  確定 → 次フェーズへ
```

問答はトークン消費を気にせず、合意に達するまで十分に深掘りする。

---

## 成果物（着手時に生成・想定）

- `.claude/agents/interviewer.md`（Wave 構造・assumption validation・合意ゲートの追加）
- `.claude/agents/analyst.md`（同上・standalone invocation の intake 強化）

## 参考リンク

- https://github.com/mattpocock/skills （grill-me 本家）
- https://github.com/Jekudy/grillme-skill （Wave 構造の参考）
- The Design of Design (Frederick P. Brooks) — design tree の概念的背景
