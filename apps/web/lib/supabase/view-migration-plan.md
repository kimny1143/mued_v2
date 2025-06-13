# Supabaseビュー移行計画

## 目的
- パフォーマンスの向上（DBレベルでの過去データフィルタリング）
- コードの簡素化（アプリケーション層でのフィルタリング削除）
- タイムゾーン処理の統一

## 現在の状況
- ✅ `active_lesson_slots` ビュー作成済み（7件のアクティブスロット）
- ✅ `active_reservations` ビュー作成済み（1件のアクティブ予約）
- ✅ インデックス作成済み（パフォーマンス最適化）

## 移行ステップ

### Step 1: テスト用の並行実装（リスク最小化）
1. 既存のAPIはそのまま維持
2. 新しいビューを使用するテスト用エンドポイントを作成
3. 動作確認後、段階的に切り替え

### Step 2: lesson-slots APIの移行
```typescript
// 現在の実装
let query = supabase
  .from('lesson_slots')
  .select('*')
  .gte('end_time', now);  // アプリケーション層でのフィルタ

// ビューを使った新実装
let query = supabase
  .from('active_lesson_slots')  // ビューで自動的にフィルタリング
  .select('*');
```

### Step 3: reservations APIの移行
```typescript
// 現在の実装
const reservations = await prisma.reservations.findMany({
  where: { /* 複雑な条件 */ }
});
// その後、アプリケーション層でフィルタ

// ビューを使った新実装
const { data: reservations } = await supabase
  .from('active_reservations')
  .select('*');
```

### Step 4: フロントエンドの調整
- APIレスポンスの形式は変わらないため、最小限の変更
- タイムゾーン表示ロジックの簡素化

## 利点
1. **パフォーマンス**: インデックスを活用したDBレベルのフィルタリング
2. **保守性**: 過去データフィルタのロジックが一箇所に集約
3. **拡張性**: ビューの定義を変更するだけで、全体の動作を調整可能

## リスクと対策
- **リスク**: ビューへのアクセス権限の問題
  - **対策**: 権限付与SQLを実行
- **リスク**: 既存機能への影響
  - **対策**: 並行実装でテスト後に切り替え