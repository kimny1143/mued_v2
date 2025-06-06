# Sprint 2 TODO リスト（Week3-4）

> **注意**: このファイルはSprint 2の計画を反映しています。
> 各タスクの進捗状況:
> ✅ 完了 | 🟡 進行中 | ⬜ 未着手
> スプリント目標: レッスン予約CRUDとStripe固定価格サブスク決済を実装し、支払い後のみ予約が確定するフローを作る。

## スプリント計画概要
プロジェクトは全4スプリント（2週間×4＝8週間）で構成され、Sprint 2はWeek3-4に実施します。
主要な技術スタックとして、Next.js 14、React 18、TypeScript、TailwindCSS、Prisma、Supabaseを採用しています。

### Sprint 2（Week3-4）の主要目標
- レッスン予約CRUDとStripe固定価格サブスク決済の実装
- 支払い後のみ予約が確定するフローの構築
- Google Calendarとの同期
- 合計ストーリーポイント: 28ポイント

### Definition of Done（完了の定義）
- 支払い成功時だけ予約確定メール送信
- 予約とカレンダーの整合性99%以上
- Webhook署名検証OK (Unit Test >90%カバレッジ)
- E2E: Playwright `auth→checkout→reserve` パスGREEN
- テストCoverage：BE/FE >80%
- LCP <2.5s 主要3ページ
- Google Calendar同期成功率 >99%
- Stripe決済成功後、予約確定+メール送信のE2E完了

### ストーリーポイント配分

1. データモデルとAPI実装（10ポイント）:
   - Task 6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API (5ポイント)
   - Task 10: Stripe Checkout + Webhook（Supabase Edge Functions）(5ポイント)

2. 外部サービス連携（7ポイント）:
   - Task 7: Google Calendar OAuth同期サービス (5ポイント)
   - Task 9: Stripe Price APIラッパー (2ポイント)

3. フロントエンド実装（7ポイント）:
   - Task 8: 予約UI（Table＋Modal、Smart Mobile Layout）(5ポイント)
   - Task 11: ペイウォールABテスト Feature-flag 基盤 (2ポイント)

4. 品質保証と補助機能（6ポイント）:
   - Task 12: QA & Storybookコンポーネント追加 (2ポイント)
   - Task 13: 予約確定メール & ロギング (2ポイント)
   - Task 14: 投資家向け財務メトリクス自動集計 PoC (2ポイント)

### 主要リスクと対策

1. **外部APIの依存リスク**:
   - Google Calendar APIやStripe APIの仕様変更や障害
   - 対策: モックデータでのフォールバック機能実装

2. **スケジュールリスク**:
   - 複雑なタスク（#7, #10）の遅延可能性
   - 対策: 早期着手と段階的実装

3. **技術的リスク**:
   - 連携部分のエラーハンドリング
   - 対策: 早期のチーム内共有とコードレビュー徹底

以下は詳細な実装タスクです：

---

## Week 3 タスク

### Day 1 (Sprint Kick-off)
- [✅] **Sprint 2 チケット起票 & Projects Board 更新** (PM: 山田)
  - チケット発行 (#6-14)
  - Story Point設定
  - WBS再計算
  - キックオフミーティング実施：技術方針の合意
- [✅] **Task 6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API - 設計・ブランチ作成** (BE1: 木村)
  - ブランチ `feature/reservation-model` 作成
  - 技術要点: RLS設定、競合解決ロジック
- [⬜] **Task 7: Google Calendar OAuth同期サービス - OAuth準備・方式比較** (BE2: 佐藤)
  - OAuthクレデンシャル準備
  - プル型→プッシュ型同期方式比較
  - 技術要点: トークン管理、差分同期最適化
- [⬜] **Task 9: Stripe Price APIラッパー `lib/stripe.ts` - 実装開始** (FE2: 佐藤)
  - 月額/年額プラン取得関数＋UT
  - 技術要点: APIレート制限対応、キャッシング
- [⬜] **Task 11: ペイウォールABテスト Feature-flag 基盤 - 設定ファイル準備** (FE3: 鈴木)
  - Feature-flag設定（`lib/flags.ts`）作成
  - 技術要点: パフォーマンス影響最小化
- [⬜] **AI Sprint 3先行タスク: Celery & Redis ENV設計 PoC** (AI: 木村)
  - 並列3h

### Day 2
- [✅] **Task 6: `LessonSlot`,`Reservation` Prismaモデル実装 & CRUD API - 実装** (BE1: 木村)
  - APIテスト全通過 / RLS設定
  - 実装概要: Prismaスキーマに両モデルを追加し、CRUD APIを実装。`app/api/lesson-slots/route.ts`(一覧・作成)、`app/api/lesson-slots/[id]/route.ts`(詳細・更新・削除)、`app/api/reservations/route.ts`(一覧・作成)、`app/api/reservations/[id]/route.ts`(詳細・更新・削除)の4つのエンドポイントを実装。権限管理(ロール別アクセス制限)、競合解決(重複予約防止)、入力検証を実装済み。
- [✅] **Task 7: Google Calendar OAuth同期サービス - 実装** (BE2: 佐藤)
  - ①OAuth認可 ②差分同期 ③単体テストCoverage>80%
  - 実装概要: NextAuth.jsを使用したGoogle OAuth認証の設定、`googleCalendar.ts`モジュールでカレンダーイベントとレッスン枠の双方向同期機能の実装。差分検出による効率的な同期処理、トークン自動更新機能を含む。Vitestを使用した単体テストを実装し、カバレッジ95%達成。`app/api/calendar/sync/route.ts`エンドポイントで同期APIを提供。
- [✅] **Task 9: Stripe Price APIラッパー `lib/stripe.ts` - Jestテスト・レビュー依頼** (FE2: 佐藤)
  - 実装概要: Stripe Price APIの主要機能をラップしてTypeScript型安全かつ使いやすいインターフェースを提供するモジュールを実装。料金プラン一覧、製品一覧、月額/年額プラン取得、製品と料金のマージなど、フロントエンドで必要な操作を網羅。10分間のキャッシュ機能を実装してAPIコール数を削減。Vitestによる単体テストで全機能をカバー。既存のチェックアウトセッション作成機能との統合も完了。

### Day 3
- [⬜] **Task 8: 予約UI（Table＋Modal、Smart Mobile Layout）- Wireframe・Figma確認** (FE1: 田中)
- [⬜] **Task 10: Stripe Checkout + Webhook（Supabase Edge Functions）- 設計書ドラフト** (BE1: 木村)

### Day 4
- [⬜] **Task 8: 予約UI（Table＋Modal、Smart Mobile Layout）- 実装開始** (FE1: 田中)
  - LCP<2.5s / スマホPC双方レイアウトOK
- [⬜] **Task 10: Stripe Checkout + Webhook（Supabase Edge Functions）- 実装** (BE1: 木村)
  - 決済成功 → `Subscription`更新／署名検証OK

### Day 5 (Mid-Sprint Demo)
- [⬜] **Mid-Sprintデモ準備** (全員)
  - Checkout→予約確定フロー暫定デモ
- [⬜] **Task 11: ペイウォールABテスト Feature-flag 基盤 - Next Config Injection・レビュー依頼** (FE3: 鈴木)
  - Toggleに応じUI/ルート制御
- [⬜] **Task 12: QA & Storybookコンポーネント追加（DatePicker, Badge）- 実装開始** (FE2: 佐藤)
  - Docs / Mobile SnapShot (8の再利用)

---

## Week 4 タスク

### Day 1
- [⬜] **Task 8: 予約UI（Table＋Modal、Smart Mobile Layout）- 実装継続・Lighthouseレポート共有** (FE1: 田中)
- [⬜] **Task 13: 予約確定メール & ロギング（Supabase自動 Trigger）- Trigger SQL定義・実装** (BE2: 佐藤)
  - 検証メール受信 / メタデータ記録

### Day 2
- [⬜] **Task 12: QA & Storybookコンポーネント追加（DatePicker, Badge）- 実装完了・レビュー依頼** (FE2: 佐藤)
- [⬜] **Task 14: 投資家向け財務メトリクス自動集計 PoC - 要件定義・連携方法検討** (PM: 山田, BE1: 木村)
  - Stripe売上→Metabase連携レポ

### Day 3 (QA BugFix〆)
- [⬜] **QAバグフィックス** (FE1, FE2, BE1, BE2)
- [⬜] **E2Eテストシナリオ Playwright `auth→checkout→reserve` 作成・実行** (FE3: 鈴木)

### Day 4
- [⬜] **投資家アップデートDraft提出準備** (PM: 山田)
- [⬜] **Task 14: 投資家向け財務メトリクス自動集計 PoC - 実装・レポート作成** (PM: 山田, BE1: 木村)

### Day 5 (Sprint Review & Retrospective)
- [⬜] **Sprint 2 レビュー準備** (全員)
- [⬜] **Sprint 2 リトロスペクティブ準備** (全員)
- [⬜] **投資家向け財務メトリクス自動集計 PoC - 最終確認** (PM: 山田)

---

## 📅 イベント

- **Daily Standup**: 平日毎朝10:00 JST (Week3 Day1から開始)
- **Mid-Sprint Demo**: Week3 Day5 午後
- **QA BugFix〆**: Week4 Day3
- **Sprint 2 レビュー**: Week4 Day5 午後
- **Sprint 2 リトロスペクティブ**: レビュー直後
- **投資家アップデートDraft提出**: Week4 Day5

---

## 🌿 ブランチ管理方針

- 新規機能開発は `feature/` プレフィックスを使用します。
  - 例: `feature/reservation-ui`, `feature/stripe-checkout`
- バグ修正は `fix/` プレフィックスを使用します。
- 各PRはターゲットブランチ（通常は `main` またはリリースブランチ）に向けて作成します。
- PR作成時には、関連するチケット番号を必ず記載してください。

---
## 🔗 関連ドキュメント
- Sprint 2 議事録: `docs/dailyconf/20250507daily-1.md` 
- 依存関係: Task 6 → Task 8、Task 9 → Task 10
- 優先順位: Task 6/7 > Task 9/10 > Task 8/11 > Task 12/13/14 