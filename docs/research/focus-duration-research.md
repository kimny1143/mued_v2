# 集中力と休憩に関する研究調査

調査日: 2024-12-28

## 概要

MUEDnoteアプリの時間設定UIを設計するにあたり、創作活動における最適な集中時間と休憩間隔についてリサーチを実施した。

---

## 1. ウルトラディアンリズム（90分サイクル）

### 発見者
睡眠研究者 **Nathaniel Kleitman** が発見した「基本的休息活動サイクル（BRAC: Basic Rest-Activity Cycle）」

### 概要
- 人間の脳は **90〜120分の高集中期** と **15〜20分の回復期** を自然に繰り返す
- このリズムは睡眠中（REM/non-REMサイクル）だけでなく、覚醒時にも存在
- 90分サイクルで働いた専門家は、ランダムな時間間隔で働いた人より **40%高い生産性** を報告

### 90分サイクルの内訳
1. **最初の30分**: 注意ネットワークが活性化
2. **次の45分**: ピークパフォーマンスゾーン（創造的解決策が湧く）
3. **最後の15分**: マインドワンダリングなどの兆候（脳が自然に休憩を必要とする）

### ソース
- [The Science of Time Blocks - Ahead App](https://ahead-app.com/blog/procrastination/the-science-of-time-blocks-why-90-minute-focus-sessions-transform-your-productivity-20241227-203316)
- [Asian Efficiency - Ultradian Rhythms](https://www.asianefficiency.com/productivity/ultradian-rhythms/)
- [PubMed - Ultradian rhythms in task performance](https://pubmed.ncbi.nlm.nih.gov/7870505/)

---

## 2. 各種メソッドの比較

| メソッド | 集中時間 | 休憩時間 | 特徴 |
|---------|---------|---------|------|
| **ポモドーロ・テクニック** | 25分 | 5分 | 初心者向け、タスク細分化に適する |
| **DeskTime研究** | 52分 | 17分 | 2014年の生産性調査に基づく |
| **ウルトラディアン** | 90分 | 20分 | 生理学的リズムに基づく |
| **ディープワーク（Cal Newport）** | 2時間+ | - | 深い集中が必要な創造的作業向け |

### ソース
- [Todoist - Pomodoro Technique](https://www.todoist.com/productivity-methods/pomodoro-technique)
- [Inc. - Ideal Number of Hours to Work](https://www.inc.com/jessica-stillman/this-is-the-ideal-number-of-hours-a-day-ac.html)
- [Excentration - Optimal Concentration Duration](https://excentration.com/concentration-foundations/optimal-concentration-duration/)

---

## 3. クリエイティブワークの特性

### セッション長の推奨
- 完全に没入するのに **40〜50分** かかる
- **60〜90分** の途切れないセッションが最良の結果を出す
- コーディング、執筆、作曲などの「フロー状態」が必要な作業には **25分は短すぎる**

### 1日の創造的作業の上限
- **約4時間** が上限
- バイオリニストの練習スケジュール研究で発見
- エリートパフォーマーは4時間以下のチャンクで練習

### 集中力の構築
- 最初は **30〜45分** から開始
- 慣れたら **1時間** に延長
- 最終的に **90分** まで

### ソース
- [Clockwise - What is Focus Time](https://www.getclockwise.com/blog/what-is-focus-time)
- [Friday.app - Focus Time](https://friday.app/p/focus-time)

---

## 4. MUEDnoteへの適用

### 設計原則
1. **「集中力には限界がある」というメッセージを伝える**
2. **適度な休憩を促す**
3. **過度な長時間作業を防ぐ**

### 時間設定の方針

#### プリセット（推奨）
| 時間 | 用途 | 根拠 |
|------|------|------|
| 25分 | ポモドーロ | 初心者・細かいタスク向け |
| 50分 | 標準セッション | DeskTime研究に近い |
| 90分 | ディープワーク | ウルトラディアンリズム |

#### カスタム設定
- 最大 **120分** まで（ウルトラディアンサイクルの上限）
- 5分刻みで設定可能

#### 1日の累計警告
- **4時間を超えたらアラート表示**
- 「今日はよく頑張りました。明日に備えて休みましょう」

### 実装済みの良い設計
- タイマー終了後も **自動停止せず** 休憩を促すメッセージを表示
- ユーザーの自主性を尊重しつつ、適切な休憩を誘導

---

## 5. セッション継続時のモード選択

### 研究からの見解

セッション終了後に同じモードを続けるべきか、変更すべきかについて調査。

### 結論: 柔軟に変えてOK

研究では**厳格な固定時間は推奨されていない**。90分は「ルール」ではなく「ガイドライン」として扱うべき。

> 「90分は厳格なルールではなくガイドライン。身体のサインを聞いて調整することが推奨」
> — Asian Efficiency

### 主要ポイント

| 観点 | 研究の見解 |
|------|-----------|
| 固定 vs 可変 | 厳格な固定は推奨されていない |
| 個人差 | 1-2週間かけて自分のリズムを発見すべき |
| ハイブリッド | ポモドーロ×3-4 → 90分サイクルもあり |
| 調整基準 | エネルギー・集中力の変化を感じ取る |

### 身体のサインを重視

> 「集中力が途切れ始めたら、それは怠けではなく、脳が休憩を必要としているサイン」
> — Ahead App

個人のウルトラディアンリズムは以下の要因で変動する:
- 睡眠の質
- ストレスレベル
- 食事
- 運動
- 環境要因（光、温度）

### MUEDnoteへの適用

セッション終了時のUI:
1. **同じモードで続ける** - デフォルト（ワンタップで開始）
2. **モードを変える** - 柔軟性を確保
3. **休憩する** - モードに応じた推奨時間
4. **終了** - ホーム画面へ

ユーザーの自律性を尊重しつつ、研究に基づいたデフォルト値を提供。

### ソース
- [Asian Efficiency - Ultradian Rhythms](https://www.asianefficiency.com/productivity/ultradian-rhythms/)
- [Ahead App - The Science of Time Blocks](https://ahead-app.com/blog/procrastination/the-science-of-time-blocks-why-90-minute-focus-sessions-transform-your-productivity-20241227-203316)
- [NSDR - The Ideal Length of Time for Focused Work](https://www.nsdr.co/post/the-ideal-length-of-time-for-focused-work-a-neurobiological-perspective-from-andrew-huberman)

---

## 6. 今後の検討事項

- [ ] セッション終了時の休憩推奨メッセージの文言検討
- [ ] 1日の累計時間トラッキングの実装
- [ ] 4時間超過アラートのUI設計
- [ ] 休憩タイマー機能の追加検討

---

## 参考文献

1. Kleitman, N. - Basic Rest-Activity Cycle (BRAC)
2. DeskTime (2014) - 生産性調査
3. Cal Newport - Deep Work
4. Cognitive Research: Principles and Implications (2018)
5. Journal of Cognition - 90分サイクル研究
