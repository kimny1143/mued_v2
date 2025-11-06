# API標準化の実態調査結果

**調査日**: 2025-11-06
**ドキュメント記載**: 28/28 (100%) 完了
**実際の状況**: 3/27 (11.1%) 完了

## 標準化済みAPIファイル (3ファイル)

✅ 使用している`@/lib/api-response`ヘルパー関数:
- `apiSuccess()` - 成功レスポンス
- `apiUnauthorized()` - 401エラー
- `apiValidationError()` - バリデーションエラー
- `apiForbidden()` - 403エラー
- `apiNotFound()` - 404エラー
- `apiServerError()` - 500エラー

### 1. app/api/reservations/route.ts
- GET, POST エンドポイント
- 全レスポンスが標準化済み

### 2. app/api/lessons/route.ts
- GET エンドポイント
- 全レスポンスが標準化済み

### 3. app/api/ai/materials/route.ts
- GET, POST エンドポイント
- 全レスポンスが標準化済み

## 未標準化APIファイル (24ファイル)

❌ `NextResponse.json()`を直接使用しているファイル:

1. app/api/health/route.ts
2. app/api/lessons/[id]/route.ts
3. app/api/ai/intent/route.ts
4. app/api/subscription/limits/route.ts
5. app/api/health/db/route.ts
6. app/api/subscription/checkout/route.ts
7. app/api/checkout/route.ts
8. app/api/webhooks/stripe/route.ts
9. app/api/ai/materials/[id]/route.ts
10. app/api/ai/quick-test/route.ts
11. app/api/ai/weak-drill/route.ts
12. app/api/webhooks/clerk/route.ts
13. app/api/dashboard/stats/route.ts
14. app/api/teacher/revenue/route.ts
15. app/api/materials/share-to-library/route.ts
16. app/api/admin/rag-metrics/route.ts
17. app/api/admin/provenance/route.ts
18. app/api/cron/rag-metrics/route.ts
19. app/api/admin/plugins/[source]/health/route.ts
20. app/api/admin/rag-metrics/history/route.ts
21. app/api/export/pdf/route.ts
22. app/api/ai/quick-test/pdf/route.ts
23. app/api/content/route.ts
24. app/api/metrics/save-session/route.ts

## 推奨アクション

### 優先度 High（コアビジネスロジック）
1. **AI系API** (5ファイル)
   - app/api/ai/intent/route.ts
   - app/api/ai/materials/[id]/route.ts
   - app/api/ai/quick-test/route.ts
   - app/api/ai/weak-drill/route.ts
   - app/api/ai/quick-test/pdf/route.ts

2. **決済系API** (3ファイル)
   - app/api/subscription/checkout/route.ts
   - app/api/checkout/route.ts
   - app/api/subscription/limits/route.ts

3. **レッスン・予約系API** (1ファイル)
   - app/api/lessons/[id]/route.ts

### 優先度 Medium（管理・モニタリング）
4. **Admin系API** (4ファイル)
   - app/api/admin/rag-metrics/route.ts
   - app/api/admin/provenance/route.ts
   - app/api/admin/plugins/[source]/health/route.ts
   - app/api/admin/rag-metrics/history/route.ts

5. **ダッシュボード・統計** (2ファイル)
   - app/api/dashboard/stats/route.ts
   - app/api/teacher/revenue/route.ts

### 優先度 Low（Webhook・ヘルスチェック）
6. **Webhook** (2ファイル)
   - app/api/webhooks/stripe/route.ts
   - app/api/webhooks/clerk/route.ts

7. **ヘルスチェック** (2ファイル)
   - app/api/health/route.ts
   - app/api/health/db/route.ts

8. **その他** (5ファイル)
   - app/api/content/route.ts
   - app/api/materials/share-to-library/route.ts
   - app/api/metrics/save-session/route.ts
   - app/api/export/pdf/route.ts
   - app/api/cron/rag-metrics/route.ts

## 標準化による効果

- **統一されたエラーハンドリング**: 全APIで一貫したエラーレスポンス形式
- **型安全性**: TypeScript型定義による実装時の安全性向上
- **保守性向上**: レスポンス形式の変更が一箇所で対応可能
- **ログ統合**: 統一されたロギング戦略の実装が容易
- **テスト容易性**: モック作成が簡易化

## 次ステップ

1. ドキュメントを実態に合わせて修正（28/28 → 3/27）
2. 優先度Highの9ファイルから段階的に標準化実施
3. 標準化完了後、進捗レポートを更新
