# Sprint 2 キックオフミーティング議事録

**日時**: 2024年3月21日 10:00-11:30 JST  
**参加者**: 山田(PM), 木村(BE1), 佐藤(BE2), 田中(FE1), 鈴木(FE3)  
**司会**: 山田  
**記録**: 山田  

## 1. 前回スプリントの振り返り

- Sprint 1の全タスクが完了（13/13タスク）
- UI基盤とStorybookが予定より1日早く完了
- 認証フローに関する課題が解決済み

## 2. Sprint 2の概要と目標

### 主要目標
- レッスン予約CRUDとStripe固定価格サブスク決済の実装
- 支払い後のみ予約が確定するフローの構築
- Google Calendarとの同期

### ストーリーポイント
- 合計28ポイント
- バーンダウン目標：週ごとに14ポイント

## 3. タスク割り当てとスケジュール

### Week 3タスク
- **木村(BE1)**:
  - Task 6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API
  - Task 10: Stripe Checkout + Webhook
  - AI Sprint 3先行タスク: Celery & Redis ENV設計 PoC（並行作業）

- **佐藤(BE2)**:
  - Task 7: Google Calendar OAuth同期サービス
  - Task 9: Stripe Price APIラッパー
  - Task 13: 予約確定メール & ロギング

- **田中(FE1)**:
  - Task 8: 予約UI（Table＋Modal、Smart Mobile Layout）

- **鈴木(FE3)**:
  - Task 11: ペイウォールABテスト Feature-flag 基盤
  - Task 12: QA & Storybookコンポーネント追加

- **山田(PM)**:
  - Sprint 2 チケット起票 & Projects Board 更新（完了）
  - Task 14: 投資家向け財務メトリクス自動集計 PoC（木村とペア）

## 4. 技術的な検討事項

### 予約システムの設計
- レッスン枠（LessonSlot）とユーザー予約（Reservation）を分離して管理
- 競合予約の解決方法：楽観的ロック + トランザクション

### Google Calendar連携
- OAuth認証フローはログイン時に実施
- 同期方式は差分プッシュ型を採用（リソース効率化）

### Stripe連携
- 決済成功後のWebhookハンドラーを実装
- 冪等性を確保するためのイベントIDチェック機構

## 5. 依存関係と優先順位

- Task 6（モデル実装）→ Task 8（UI実装）の依存関係
- Task 9（Stripe Price API）→ Task 10（Checkout）の依存関係
- 優先度順：Task 6/7 > Task 9/10 > Task 8/11 > Task 12/13/14

## 6. リスクと対策

1. **外部APIの依存リスク**:
   - 対策: モックデータでのフォールバックと冗長化

2. **スケジュールリスク**:
   - 対策: 複雑なタスクは早期に着手、MVPを明確に定義

3. **技術的課題**:
   - 対策: 不明点は早めに共有、チームでの解決を優先

## 7. Definition of Done

- 支払い成功時だけ予約確定メール送信
- 予約とカレンダーの整合性99%以上
- Webhook署名検証OK (Unit Test >90%カバレッジ)
- E2E: Playwright `auth→checkout→reserve` パスGREEN
- テストCoverage：BE/FE >80%
- LCP <2.5s 主要3ページ
- Google Calendar同期成功率 >99%
- Stripe決済成功後、予約確定+メール送信のE2E完了

## 8. Next Steps

1. 各担当者は今日中に担当タスクの初期設計ドキュメントを共有
2. 明日の朝会で詳細設計の確認とフィードバック
3. Week 3, Day 5 (3/25)にMid-Sprintデモを実施

## 9. 質問・懸念事項

### Q: Google Calendar APIのクォータ制限は？
**A**: 無料枠で1日あたり1,000,000リクエスト。通常使用では問題ない。

### Q: Stripeのテスト環境での検証方法は？
**A**: テストモードAPIキーとテストカードを使用。Webhook転送にはngrokを使用。

### Q: AIタスクとの並行作業のバランスは？
**A**: 木村は優先度に応じて作業。Sprint 2のタスクが最優先、AIは空き時間に対応。 