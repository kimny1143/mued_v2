# MUED 週次アクションプラン — 2026-03-16

**基づく情報:** mued-weekly-2026-03-16.md（競合・市場調査レポート）

---

## 優先度マトリクス

| プロダクト | アクション | 優先度 | 工数 | 期限 |
|-----------|----------|--------|------|------|
| MUEDear | 進捗可視化（スコア推移・弱点特定） | **高** | 中 | 3/23 |
| MUEDear | ASO最適化（EQ耳トレKW） | **高** | 小 | 3/23 |
| MUEDial | LP メッセージング改善（意図反映訴求） | **中** | 小 | 3/23 |
| MUEDial | RoEx 競合詳細調査 | **中** | 小 | 3/23 |
| MUEDnote | 制作ログUI設計・DAW連携仕様 | **中** | 大 | 4月 |

---

## MUEDear — 進捗可視化で Quiztones を超える

### 背景
- Quiztones: 475K+ ユーザーだが進捗トラッキング機能なし（ユーザー不満が顕在化）
- HearEQ: アプリ内課金で30バンド拡張可能だが、学習進捗の可視化は弱い
- SoundGym: Web専用でモバイル不在 → iOS の EQ 耳トレはブルーオーシャン

### 実装内容
→ 詳細は `apps/muedear/docs/2026-03-16-progress-tracking-proposal.md`

### ASO対策
- Primary KW: `ear training EQ`, `frequency training`, `mixing ear training`
- Subtitle変更案: "Train your ears for mixing" → "EQ ear training with progress tracking"
- スクショ1枚目に進捗グラフを配置（Quiztones との差別化ポイント）

---

## MUEDial — 「対話型ミキシング」の訴求強化

### 背景
- AI マスタリングはコモディティ化（LANDR $15-25/月、BandLab 無料）
- ステムからの自動ミックス提供はまだ少ない（RoEx, Automix のみ）
- ユーザー最大の懸念: 「アーティストの意図が反映されるか」

### LP メッセージング改善
現在の訴求: 「ミックス、フェーダーに触らなくていい。」
追加すべき視点:
- **意図の反映**: 「あなたの言葉で伝えれば、Hooが汲み取る」
- **対話体験**: AIマスタリングの一方通行ではなく、対話で仕上げていく
- Before/After デモ（実装済み）が体験の裏付けになる

### RoEx 競合調査（来週まで）
- 価格体系（クレジット制 vs サブスク）
- ミキシング品質の評価（レビュー・比較記事）
- API提供の有無（MUEDial が RoEx を使っていることの開示方針）

---

## MUEDnote — 制作ログのカテゴリ確立

### 背景
- 練習ログアプリは複数存在（Andante, Instrumentive, Modacity, tuneUPGRADE）
- DTM/音楽制作セッション特化のログアプリは 2026年3月時点でゼロ
- ブルーオーシャンだが、カテゴリ自体の認知がない

### 方向性
→ 詳細は `apps/muednote-mobile/docs/2026-03-16-production-log-proposal.md`

---

## 来週のチェックポイント

- [ ] MUEDear: 進捗可視化の設計レビュー完了
- [ ] MUEDear: ASO KW/Subtitle 更新
- [ ] MUEDial: LP の訴求テキスト改善案
- [ ] MUEDial: RoEx 競合調査完了
- [ ] MUEDnote: 制作ログUI方針決定

---

*作成: 2026-03-16*
