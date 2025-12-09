# 予約システム拡張 自己レビューレポート

**レビュー日**: 2025-12-09
**対象コミット**: `bca7c4b2` ~ `0408e146`
**レビュー方式**: 並列エージェント分析（コード品質・ドキュメント・実装状況）

---

## エグゼクティブサマリー

| 観点 | 評価 | スコア |
|------|------|--------|
| コード品質 | 良好（改善点あり） | 7.5/10 |
| 実装完成度 | 75%（本番前に追加作業必要） | 75% |
| ドキュメント | 要整理 | 6/10 |
| テストカバレッジ | 不足 | 3/10 |

**総合判定**: バックエンドは堅牢だが、フロントエンド・テスト・ドキュメントに改善が必要

---

## 1. コード品質分析

### 1.1 Critical Issues（要即時対応）

| # | 問題 | 場所 | 影響 |
|---|------|------|------|
| 1 | `formatPrice` 関数の重複 | `notification.service.ts:102`, `slot-list.tsx:39`, `book/page.tsx:121` | 保守性低下 |
| 2 | 日付フォーマット関数の重複 | `notification.service.ts:84-89` vs `lib/utils.ts:75-120` | タイムゾーン不整合 |
| 3 | `setImmediate` の Edge Runtime 非対応 | `webhooks/stripe/route.ts:263,638` | 通知が無視される可能性 |

**推奨対応**:
```typescript
// lib/utils.ts に追加
export function formatPrice(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '¥0';
  return `¥${num.toLocaleString('ja-JP')}`;
}

// setImmediate の代替
export function deferAfterResponse(fn: () => Promise<void>): void {
  Promise.resolve().then(() => fn().catch(e => console.error('Deferred task failed:', e)));
}
```

### 1.2 Medium Priority Issues

| # | 問題 | 場所 | 推奨対応 |
|---|------|------|---------|
| 4 | Webhook メタデータ検証不足 | `route.ts:147-152` | Zod スキーマで UUID 検証 |
| 5 | ログ出力の不整合 | `route.ts` 全体 | `console.error` → `logger.error` |
| 6 | スロット容量更新の競合リスク | `lesson-slots.repository.ts:486-502` | 単一の atomic SQL に統合 |
| 7 | Webhook スロット更新のロック不足 | `route.ts:594-613` | `WHERE currentCapacity > 0` 追加 |
| 8 | Hook の不要な API コール | `slot-create-form.tsx:18` | mutation 専用 hook に分離 |

### 1.3 Low Priority Issues

| # | 問題 | 推奨対応 |
|---|------|---------|
| 9 | Repository の型アサーション | メソッドチェーン改善 |
| 10 | Badge variant の null チェック | 型ガード関数追加 |
| 11 | Button variant 'primary' の確認 | 'default' に変更 |
| 12 | タイムゾーンのハードコード | 環境変数化 |

### 1.4 DRY 違反（重複コード約40行）

```
formatPrice: 3箇所で同一実装
formatDate/formatTime: 2箇所で類似実装
```

---

## 2. 実装状況分析

### 2.1 完成済み機能 ✅

| 機能 | API | Repository | UI | テスト |
|------|-----|------------|-----|--------|
| メンタースロット CRUD | ✅ | ✅ | ✅ | ❌ |
| 繰り返しスロット作成 | ✅ | ✅ | ✅ | ❌ |
| Stripe Webhook | ✅ (11イベント) | - | - | ❌ |
| メール通知 | - | - | - | ❌ |
| 予約作成 | ✅ | ✅ | ⚠️ | ❌ |

### 2.2 未完成機能 ⚠️

| 機能 | 状況 | 不足要素 |
|------|------|---------|
| 予約キャンセル | バックエンド: Webhook経由のみ | `DELETE /api/reservations/[id]` API |
| 生徒側キャンセルUI | 未実装 | キャンセルボタン・確認フロー |
| スロット編集UI | `onEdit` props のみ | 編集フォームコンポーネント |
| 決済履歴ページ | 未実装 | `/dashboard/payments` |
| メンタープロフィール | 未実装 | `/dashboard/mentors/[id]` |

### 2.3 本番リリース前の必須対応

```
Critical (ブロッカー):
├── 予約キャンセル API 追加
├── Webhook リトライ機構
├── スロット作成のレート制限 (max 100件)
├── タイムゾーン処理の統一
└── メール送信失敗時のリトライ

High Priority:
├── 生徒側キャンセル UI
├── 決済履歴ページ
├── メンタープロフィールページ
└── サーバーサイドフィルタリング・ページネーション
```

### 2.4 推定完成度

| フェーズ | 内容 | 完成度 |
|---------|------|--------|
| 現状 | 基本機能 | 75% |
| Phase 1 | Critical 修正後 | 90% |
| Phase 2 | UX 改善後 | 98% |
| Phase 3 | 監視・テスト完備 | 100% |

---

## 3. ドキュメント分析

### 3.1 更新が必要なファイル

| ファイル | 問題 | 優先度 |
|---------|------|--------|
| `docs/CHANGELOG.md` | 2025-10-29 以降の更新なし | **高** |
| `docs/deployment/environment-variables.md` | `EMAIL_FROM`, `EMAIL_SUPPORT` 未記載 | **高** |
| `docs/roadmap.md` | Phase 1 進捗が古い | 中 |
| `docs/business/MUED_Unified_Strategy_2025Q4.md` | 2025-11-26 時点で停止 | 中 |

### 3.2 作成が必要なドキュメント

| ドキュメント | 内容 | 優先度 |
|-------------|------|--------|
| `docs/api/mentor-slots.md` | メンタースロット API 仕様 | **高** |
| `docs/api/webhooks-stripe.md` | Stripe Webhook イベント一覧 | **高** |
| `docs/services/email-service.md` | メールサービス使用ガイド | **高** |
| `docs/services/notification-service.md` | 通知サービスガイド | 中 |
| `docs/README.md` | ドキュメントインデックス | 中 |

### 3.3 アーカイブ推奨

| ファイル | 理由 |
|---------|------|
| `docs/development/PHASE1_CHECKLIST.md` | Phase 1 完了済み |

---

## 4. テストカバレッジ

### 4.1 不足しているテスト

| コンポーネント | テストファイル | ステータス |
|---------------|---------------|-----------|
| Stripe Webhook | `tests/unit/webhooks/stripe.test.ts` | **未作成** |
| LessonSlotsRepository | `tests/unit/repositories/lesson-slots.test.ts` | **未作成** |
| EmailService | `tests/unit/services/email.test.ts` | **未作成** |
| NotificationService | `tests/unit/services/notification.test.ts` | **未作成** |
| useMentorSlots | `tests/unit/hooks/use-mentor-slots.test.ts` | **未作成** |
| SlotCreateForm | `tests/unit/components/slot-create-form.test.tsx` | **未作成** |
| SlotList | `tests/unit/components/slot-list.test.tsx` | **未作成** |

### 4.2 E2E テストギャップ

```
不足:
├── メンタースロット CRUD フロー
├── Webhook 冪等性テスト
├── 同時予約の競合テスト
├── 決済フロー (Stripe mock)
└── 複数人スロットの容量テスト
```

---

## 5. セキュリティ・パフォーマンス

### 5.1 セキュリティ

| 項目 | ステータス |
|------|----------|
| Stripe 署名検証 | ✅ |
| API 認証 (Clerk) | ✅ |
| ロールベースアクセス制御 | ✅ |
| スロット所有権検証 | ✅ |
| レート制限 | ❌ **未実装** |
| 入力サニタイズ | ⚠️ Zod のみ |

### 5.2 パフォーマンス

| 項目 | ステータス |
|------|----------|
| DB インデックス | ✅ |
| Atomic SQL 更新 | ✅ |
| N+1 クエリ | ⚠️ `/api/lessons` で潜在的リスク |
| ページネーション | ❌ **未実装** |
| サーバーサイドフィルタ | ❌ クライアント側で実行中 |

---

## 6. 推奨アクションプラン

### Phase 1: Critical 修正（1-2週間）

```
1. formatPrice を lib/utils.ts に統合
2. setImmediate を Promise.resolve() に置換
3. DELETE /api/reservations/[id] 追加
4. Webhook リトライ機構実装
5. スロット作成上限 (100件) 追加
6. 環境変数ドキュメント更新
```

### Phase 2: UX 改善（2-3週間）

```
1. 生徒側キャンセル UI
2. スロット編集フォーム
3. 決済履歴ページ
4. サーバーサイドフィルタリング
5. ページネーション実装
```

### Phase 3: 信頼性向上（1-2週間）

```
1. ユニットテスト追加 (7ファイル)
2. E2E テスト追加 (5シナリオ)
3. Sentry 導入
4. Webhook 失敗アラート
5. API ドキュメント作成
```

---

## 7. 結論

**強み**:
- Repository パターンによる堅牢なバックエンド設計
- 冪等性を考慮した Webhook 処理
- 完全なメンタースロット管理機能
- メール通知基盤の整備

**弱み**:
- テストカバレッジの不足
- 生徒側 UI の未完成
- ドキュメントの更新遅れ
- クライアントサイドフィルタリングのパフォーマンス問題

**本番リリース判定**: Phase 1 修正完了後に限定リリース可能

---

*レビュー実施: Claude Code (codebase-optimizer, docs-curator, Explore エージェント)*
