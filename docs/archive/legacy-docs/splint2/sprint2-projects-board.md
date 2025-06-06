# Sprint 2 Projects Board

このドキュメントでは、Sprint 2のGitHub Projects Boardの設定と更新内容を記録します。

## ボード構成

Sprint 2のボードは以下の列で構成されています：

1. **Todo**: 未着手のタスク
2. **In Progress**: 作業中のタスク
3. **In Review**: レビュー中のタスク
4. **Done**: 完了したタスク

## Sprint 2 のタスク配置

現在のタスク配置状況（Week 3, Day 1時点）:

### Todo列
- Task 6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API (木村)
- Task 7: Google Calendar OAuth同期サービス (佐藤)
- Task 8: 予約UI（Table＋Modal、Smart Mobile Layout） (田中)
- Task 9: Stripe Price APIラッパー `lib/stripe.ts` (佐藤)
- Task 10: Stripe Checkout + Webhook（Supabase Edge Functions） (木村)
- Task 11: ペイウォールABテスト Feature-flag 基盤 (鈴木)
- Task 12: QA & Storybookコンポーネント追加（DatePicker, Badge） (佐藤)
- Task 13: 予約確定メール & ロギング（Supabase自動 Trigger） (佐藤)
- Task 14: 投資家向け財務メトリクス自動集計 PoC (山田, 木村)

### In Progress列
- 現在タスクなし

### In Review列
- 現在タスクなし

### Done列
- Sprint 2 チケット起票 & Projects Board 更新 (山田)

## 進捗状況バーンダウンチャート

Sprint 2の開始時点でのストーリーポイント合計: **28ポイント**

| 日付 | 残りポイント | 理想ライン | コメント |
|------|------------|------------|---------|
| Week 3, Day 1 | 28 | 28 | Sprint 開始 |

## 現在のフォーカス

Week 3, Day 1 の時点で、以下のタスクにフォーカスしています：

1. Task 6 (木村): `LessonSlot`,`Reservation` Prismaモデル実装の設計・ブランチ作成
2. Task 7 (佐藤): Google Calendar OAuth同期サービスのOAuth準備・方式比較
3. Task 9 (佐藤): Stripe Price APIラッパーの実装開始
4. Task 11 (鈴木): ペイウォールABテスト Feature-flag 基盤の設定ファイル準備
5. AI Sprint 3先行タスク (木村): Celery & Redis ENV設計 PoC

## リスク & ブロッカー

現時点での既知のリスクとブロッカー:

1. Google Calendar APIのクォータ制限 - 同期頻度の調整が必要
2. Stripe APIとの連携テスト環境の設定 - テスト用APIキーの取得と設定が必要
3. AIタスク並行実施による木村リソースの分散 - タスク優先順位の明確化が必要

## 次のアクション

1. 各担当者は、今日中に担当タスクの初期設計ドキュメントを共有Notionに記載
2. Week 3, Day 2 の朝会で、詳細設計の確認とフィードバックを実施
3. 木村・佐藤は、依存関係があるタスク6と7の設計調整を別途実施 