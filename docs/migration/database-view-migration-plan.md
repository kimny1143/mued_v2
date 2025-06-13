# データベースビュー移行計画書

## 概要
アプリケーション層でのタイムゾーン処理と過去データフィルタリングを、データベースビューに移行する段階的計画です。

## 現在の状況

### 作成済みのビュー
1. **active_lesson_slots**
   - 現在時刻以降のレッスンスロットのみを返す
   - `is_available = true`のスロットのみ
   - 現在7件のアクティブスロット

2. **active_reservations**
   - 現在時刻以降の予約のみを返す
   - `CANCELED`と`COMPLETED`以外のステータス
   - 現在1件のアクティブ予約

### 作成済みのインデックス
- `idx_lesson_slots_end_time`
- `idx_lesson_slots_start_time`
- `idx_reservations_booked_end_time`
- `idx_reservations_booked_start_time`

## 移行計画

### Phase 1: 権限設定と動作確認（即時実行可能）

#### 1.1 Supabaseダッシュボードでの権限付与
```sql
-- ビューへのアクセス権限を付与
GRANT SELECT ON active_lesson_slots TO anon, authenticated;
GRANT SELECT ON active_reservations TO anon, authenticated;

-- 権限確認
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name IN ('active_lesson_slots', 'active_reservations');
```

#### 1.2 v2 APIエンドポイントのテスト
- `/api/lesson-slots-v2` の動作確認
- 既存APIとの結果比較
- パフォーマンス測定

### Phase 2: 並行稼働期間（1-2日）

#### 2.1 フロントエンドでの切り替えフラグ実装
```typescript
// lib/config/features.ts
export const FEATURES = {
  USE_DB_VIEWS: process.env.NEXT_PUBLIC_USE_DB_VIEWS === 'true'
};
```

#### 2.2 条件付きAPI呼び出し
```typescript
// hooks/queries/useLessonSlots.ts
const endpoint = FEATURES.USE_DB_VIEWS 
  ? '/api/lesson-slots-v2' 
  : '/api/lesson-slots';
```

#### 2.3 ログとモニタリング
- 両APIの応答時間を記録
- エラー率の比較
- データ整合性の確認

### Phase 3: 段階的移行（3-5日）

#### 3.1 読み取り専用APIから移行
1. **lesson-slots API**
   ```typescript
   // 変更前
   .from('lesson_slots')
   .gte('end_time', now)
   
   // 変更後
   .from('active_lesson_slots')
   ```

2. **reservations 一覧API**
   ```typescript
   // 変更前
   prisma.reservations.findMany({ /* 複雑な条件 */ })
   
   // 変更後
   supabase.from('active_reservations').select('*')
   ```

#### 3.2 モバイル版から段階的適用
- `/m/dashboard/booking-calendar` → ビュー使用
- PC版は安定性確認後に移行

### Phase 4: 完全移行（1週間後）

#### 4.1 全APIのビュー移行
- すべての時間フィルタリングをビューに委譲
- アプリケーション層のフィルタロジック削除

#### 4.2 コード簡素化
```typescript
// 削除可能になるコード例
const activeSlots = slots.filter(slot => {
  const endTime = new Date(slot.end_time);
  return endTime > now;
});
```

#### 4.3 タイムゾーン処理の統一
- 表示層のみで日本時間変換
- APIレスポンスはUTCのまま

### Phase 5: 最適化と拡張（2週間後）

#### 5.1 追加ビューの作成
```sql
-- メンター別アクティブスロット
CREATE VIEW mentor_active_slots AS
SELECT * FROM active_lesson_slots
WHERE teacher_id = current_user_id();

-- 今日のレッスン
CREATE VIEW todays_lessons AS
SELECT * FROM active_lesson_slots
WHERE DATE(start_time) = CURRENT_DATE;
```

#### 5.2 パフォーマンスチューニング
- ビューのマテリアライズ化検討
- 追加インデックスの作成

## リスク管理

### 想定されるリスクと対策

1. **権限エラー**
   - 事前に権限付与SQLを実行
   - エラーログの監視

2. **パフォーマンス劣化**
   - 並行稼働期間で測定
   - インデックス最適化

3. **データ不整合**
   - 両API結果の定期比較
   - 自動テストの実装

## 成功指標

1. **パフォーマンス向上**
   - API応答時間 30%以上改善
   - データベースクエリ数 50%削減

2. **コード品質向上**
   - フィルタリングロジックの一元化
   - コード行数 20%削減

3. **保守性向上**
   - タイムゾーン関連のバグゼロ
   - 新機能追加時の工数削減

## タイムライン

| 週 | タスク | 担当 | ステータス |
|---|---|---|---|
| Week 1 | Phase 1-2: 権限設定と並行稼働 | Backend | 準備完了 |
| Week 1-2 | Phase 3: 段階的移行 | Full Stack | 計画中 |
| Week 2 | Phase 4: 完全移行 | Full Stack | 未着手 |
| Week 3-4 | Phase 5: 最適化 | Backend | 未着手 |

## 次のアクション

1. **即時実行**
   - Supabaseダッシュボードで権限付与SQLを実行
   - v2 APIのcurlテストを実施

2. **今日中**
   - フィーチャーフラグの実装
   - モニタリングダッシュボードの準備

3. **今週中**
   - モバイル版での試験運用開始
   - パフォーマンス測定の自動化

## 付録: テストコマンド

```bash
# v2 APIの動作確認
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-app.vercel.app/api/lesson-slots-v2

# 既存APIとの比較
diff <(curl .../api/lesson-slots | jq .) \
     <(curl .../api/lesson-slots-v2 | jq .)
```