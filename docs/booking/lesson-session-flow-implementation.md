# レッスンセッションフロー実装計画

## 概要
レッスン予約が承認された後の、実際のレッスン実施からフィードバックまでの一連のフローを管理するための実装計画書。

## 背景と課題
- 現在のシステムでは予約の承認と支払いまでは管理できているが、実際のレッスン実施状況を追跡する仕組みがない
- `reservations`テーブルに`COMPLETED`ステータスは定義されているが使用されていない
- MyLessonsページはモックデータのみで、実際の予約・レッスンデータと連携していない
- レッスン中に使用した教材、宿題、フィードバックなどを記録する場所がない

## 実装計画

### 1. データベース設計

#### 新規テーブル: `lesson_sessions`

```prisma
model lesson_sessions {
  id               String    @id @default(uuid())
  reservation_id   String    @unique
  reservation      reservations @relation(fields: [reservation_id], references: [id])
  
  // セッション時間管理
  scheduled_start  DateTime  // 予定開始時刻（予約から自動設定）
  scheduled_end    DateTime  // 予定終了時刻（予約から自動設定）
  actual_start     DateTime? // 実際の開始時刻
  actual_end       DateTime? // 実際の終了時刻
  
  // セッション内容
  status           SessionStatus @default(SCHEDULED)
  lesson_notes     String?   @db.Text // メンターのレッスンメモ
  homework         String?   @db.Text // 宿題・次回までの課題
  materials_used   Json?     // 使用した教材（URLリスト、記事IDなど）
  
  // フィードバック
  student_feedback String?   @db.Text // 生徒からのフィードバック
  mentor_feedback  String?   @db.Text // メンターからのフィードバック
  rating          Int?      // 5段階評価（生徒→メンター）
  
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt
  
  @@index([status])
  @@index([scheduled_start])
}

enum SessionStatus {
  SCHEDULED    // 予定済み
  IN_PROGRESS  // 進行中
  COMPLETED    // 完了
  NO_SHOW      // 欠席
}
```

#### 既存テーブルの変更

**`reservations`テーブル**
```prisma
model reservations {
  // ... 既存のフィールド ...
  
  // リレーション追加
  lesson_session lesson_sessions?
}
```

### 2. APIエンドポイント設計

#### セッション作成・管理

```typescript
// 予約承認時に自動作成（既存の承認APIを拡張）
POST /api/reservations/[id]/approve
// → 承認処理後、lesson_sessionsレコードを自動作成

// セッション一覧取得（My Lessons用）
GET /api/sessions
Query Parameters:
  - user_id?: string (生徒IDまたはメンターID)
  - status?: SessionStatus
  - from?: DateTime
  - to?: DateTime
  - limit?: number
  - offset?: number

// セッション詳細取得
GET /api/sessions/[id]

// レッスン開始
PATCH /api/sessions/[id]/start
Response: {
  id: string,
  actual_start: DateTime,
  status: "IN_PROGRESS"
}

// レッスン終了
PATCH /api/sessions/[id]/end
Body: {
  lesson_notes?: string,
  homework?: string,
  materials_used?: {
    type: "note_article" | "youtube" | "custom",
    id?: string,
    url?: string,
    title?: string
  }[]
}

// フィードバック投稿
PATCH /api/sessions/[id]/feedback
Body: {
  feedback: string,
  rating?: number, // 生徒のみ
  role: "student" | "mentor"
}
```

### 3. フロントエンド実装

#### MyLessonsページの改修

**データ構造**
```typescript
interface LessonSession {
  id: string;
  reservation: {
    id: string;
    student: User;
    slot: {
      teacher: User;
      description?: string;
    };
    booked_start_time: string;
    booked_end_time: string;
  };
  status: SessionStatus;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  lesson_notes?: string;
  homework?: string;
  materials_used?: MaterialReference[];
  student_feedback?: string;
  mentor_feedback?: string;
  rating?: number;
}
```

**機能実装**
1. セッション一覧表示
   - 予定済み（SCHEDULED）
   - 進行中（IN_PROGRESS）
   - 完了済み（COMPLETED）
   - タブまたはフィルターで切り替え

2. セッション詳細モーダル
   - セッション情報表示
   - レッスンメモ・宿題・使用教材の表示
   - フィードバック表示・投稿フォーム

3. アクションボタン
   - メンター向け: 「レッスン開始」「レッスン終了」
   - 共通: 「詳細を見る」「フィードバックを書く」
   - 予約変更・キャンセル（reservationsページへ遷移）

#### レッスン実施画面（メンター向け）

**レッスン開始時**
- 「レッスン開始」ボタンをクリック
- 確認ダイアログ表示
- セッションステータスを`IN_PROGRESS`に更新

**レッスン終了時**
- 「レッスン終了」ボタンをクリック
- レッスン終了フォーム表示
  - レッスンメモ（必須）
  - 宿題（任意）
  - 使用教材（任意・複数選択可）
- 保存後、セッションを`COMPLETED`に更新
- 予約も`COMPLETED`に更新

### 4. 実装フェーズ

#### Phase 1: データベース・バックエンド基盤（必須）✅ 完了
1. Prismaスキーマ更新・マイグレーション ✅
2. 基本的なCRUD API実装 ✅
3. 承認時の自動セッション作成機能 ✅

#### Phase 2: MyLessonsページ基本機能（必須）✅ 完了
1. セッション一覧表示（実データ）✅ 完了
2. セッション詳細表示 🚧 モーダル未実装
3. 基本的なフィルタリング ✅ タブによる分類実装済み

#### Phase 3: レッスン実施機能（必須）✅ 完了
1. レッスン開始・終了API ✅
2. メンター向けレッスン管理UI ✅ 完了
3. レッスンメモ・宿題記録機能 ✅ 完了

#### Phase 4: フィードバック機能（推奨）✅ 完了
1. フィードバック投稿API ✅
2. 双方向フィードバックUI ✅
3. 評価システム 🚧 未実装（rating機能は定義済み）

#### Phase 5: 拡張機能（オプション）
1. 教材使用履歴の詳細管理
2. レッスンレポート自動生成
3. 進捗トラッキング機能

### 5. 移行計画

1. 新規予約から適用
   - デプロイ後の新規承認分からセッション作成開始
   
2. 既存の確定済み予約への対応
   - 過去の`CONFIRMED`予約用の移行スクリプト作成
   - 予約日時をそのままセッション予定時刻として設定

### 6. テスト計画

#### ユニットテスト
- セッション作成・更新ロジック
- ステータス遷移の妥当性検証
- 権限チェック（メンターのみレッスン開始可能など）

#### 統合テスト
- 予約承認→セッション作成フロー
- レッスン開始→終了→フィードバックフロー
- エラーケース（重複開始、不正な状態遷移など）

#### E2Eテスト
- 完全なレッスンライフサイクル
- ユーザー種別による表示・操作の違い

### 7. セキュリティ考慮事項

- メンターは自分が担当するセッションのみ開始・終了可能
- 生徒は自分が参加するセッションのみ閲覧・フィードバック可能
- レッスンメモはメンターと該当生徒のみ閲覧可能
- 評価は生徒→メンターの一方向のみ

### 8. パフォーマンス考慮事項

- セッション一覧は適切なインデックスとページネーション
- 頻繁にアクセスされるデータはキャッシュ活用
- リアルタイム更新は必要な画面のみ（レッスン実施中など）

### 9. 今後の拡張可能性

- ビデオ通話連携（Zoom、Google Meetなど）
- 自動文字起こし・要約機能
- AI による学習進捗分析
- カリキュラム管理機能との連携

## 実装状況（2024年12月更新）

### 完了した機能
- ✅ データベーススキーマ（lesson_sessionsテーブル）
- ✅ セッションCRUD API（作成、取得、更新）
- ✅ レッスン開始・終了API
- ✅ フィードバック投稿API
- ✅ 予約承認時の自動セッション作成
- ✅ MyLessonsページの実データ接続
- ✅ ステータス別タブ表示（予定/進行中/完了）
- ✅ メンター向けレッスン管理UI
- ✅ 双方向フィードバック機能

### 未実装機能
- 🚧 セッション詳細モーダル
- 🚧 評価（rating）システムのUI
- 🚧 既存予約の移行スクリプト
- 🚧 教材使用履歴の詳細管理
- 🚧 レッスンレポート自動生成

## まとめ

本実装により、予約から実際のレッスン実施、フィードバックまでの完全なライフサイクル管理が可能になりました。主要機能は実装完了し、運用可能な状態です。今後は詳細モーダルや評価システムなどの追加機能を段階的に実装していく予定です。