# データベースビューの使用方法

## 概要
データベースビューを使用することで、アプリケーションレベルのフィルタリングをデータベース側で行い、パフォーマンスを向上させます。

## 設定方法

### 1. Prismaクライアントの生成
```bash
npx prisma generate
```

### 2. 環境変数の設定
```bash
# .env.local
NEXT_PUBLIC_USE_DB_VIEWS=true  # ビューを使用
# または
NEXT_PUBLIC_USE_DB_VIEWS=false # 従来のテーブルアクセス
```

### 3. 開発サーバーの再起動
```bash
npm run dev
```

## 実装されたビュー

### 1. active_lesson_slots
アクティブなレッスンスロット（終了時刻が未来 & 予約可能）

### 2. active_reservations  
アクティブな予約（キャンセル・拒否以外）

### 3. active_lesson_sessions
アクティブなレッスンセッション（予定・進行中）

### 4. todays_lesson_sessions
今日のレッスンセッション（メンター名・学生名含む）

## 使用例

### フック
```typescript
import { useActiveSlots, useTodaysSessions } from '@/lib/hooks/queries/useActiveSlots';

function MyComponent() {
  const { data: slots } = useActiveSlots();
  const { data: sessions } = useTodaysSessions();
  // ...
}
```

### API（Prisma）
```typescript
// ビューを使用（シンプル）
const activeSlots = await prisma.active_lesson_slots.findMany();

// 従来の方法（複雑）
const activeSlots = await prisma.lesson_slots.findMany({
  where: {
    end_time: { gt: new Date() },
    is_available: true
  }
});
```

## パフォーマンステスト

### ローカルでのテスト
```bash
# ビュー無効で起動
NEXT_PUBLIC_USE_DB_VIEWS=false npm run dev

# ビュー有効で起動  
NEXT_PUBLIC_USE_DB_VIEWS=true npm run dev
```

### ネットワークタブで確認
1. Chrome DevToolsを開く
2. Networkタブを選択
3. APIリクエストの時間を比較
   - `/api/lesson-slots/active` (従来)
   - `/api/lesson-slots/v2/active` (ビュー)

## A/Bテストの実施

### Vercelでの設定
1. Vercel Dashboardで環境変数を設定
2. 一部のユーザーに対してフラグを有効化
3. パフォーマンスメトリクスを収集

### メトリクス確認ポイント
- API応答時間
- データベースクエリ時間
- ページロード時間
- ユーザー体験の変化

## トラブルシューティング

### ビューが見つからない
```bash
# Supabaseでビューを確認
SELECT viewname FROM pg_views WHERE schemaname = 'public';
```

### Prismaで型エラー
```bash
# Prismaクライアントを再生成
npx prisma generate
```

### 環境変数が反映されない
```bash
# 開発サーバーを完全に再起動
npm run dev
```