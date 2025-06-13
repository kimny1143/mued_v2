# メンター単位カレンダー表示のAPIエンドポイント設計

## 1. メンター情報取得API

### エンドポイント
```
GET /api/mentors
```

### クエリパラメータ
| パラメータ | 型 | 説明 | 必須 |
|------------|---------|------|------|
| withAvailability | boolean | 利用可能時間スロットも同時に取得するか | いいえ |
| from | string | 空き枠検索開始日（YYYY-MM-DD形式） | withAvailability=trueの場合 |
| to | string | 空き枠検索終了日（YYYY-MM-DD形式） | withAvailability=trueの場合 |
| skills | string | カンマ区切りのスキル一覧（例: "music,piano"） | いいえ |
| subjects | string | カンマ区切りの科目一覧（例: "jazz,classical"） | いいえ |
| sortBy | string | ソート方法（"name", "rating", "availability"） | いいえ（デフォルト: "name"） |

### レスポンス例
```json
[
  {
    "id": "user_123",
    "name": "田中先生",
    "email": "tanaka@example.com",
    "image": "https://example.com/tanaka.jpg",
    "availableSlots": [
      {
        "id": "slot_123",
        "startTime": "2024-05-15T09:00:00Z",
        "endTime": "2024-05-15T12:00:00Z",
        "hourlyRate": 6000,
        "minDuration": 60,
        "maxDuration": 90,
        "reservations": []
      }
    ],
    "availableSlotsCount": 1
  }
]
```

## 2. レッスンスロット取得API

### エンドポイント
```
GET /api/lesson-slots
```

### クエリパラメータ
| パラメータ | 型 | 説明 | 必須 |
|------------|---------|------|------|
| from | string | 検索開始日（YYYY-MM-DD形式） | いいえ |
| to | string | 検索終了日（YYYY-MM-DD形式） | いいえ |
| teacherId | string | メンターID（特定メンターのみ取得） | いいえ |
| minDuration | number | 最小予約時間（分） | いいえ |
| maxDuration | number | 最大予約時間（分） | いいえ |
| availableOnly | boolean | 利用可能なスロットのみ取得 | いいえ（デフォルト: true） |

### レスポンス例
```json
[
  {
    "id": "slot_123",
    "teacherId": "user_123",
    "startTime": "2024-05-15T09:00:00Z",
    "endTime": "2024-05-15T12:00:00Z",
    "hourlyRate": 6000,
    "currency": "JPY",
    "minHours": 1,
    "maxHours": 3,
    "minDuration": 60,
    "maxDuration": 90,
    "isAvailable": true,
    "teacher": {
      "id": "user_123",
      "name": "田中先生",
      "image": "https://example.com/tanaka.jpg"
    },
    "reservations": [],
    "hourlySlots": [...],
    "durationConstraints": {
      "minDuration": 60,
      "maxDuration": 90,
      "minHours": 1,
      "maxHours": 3
    }
  }
]
```

## 3. 予約作成API

### エンドポイント
```
POST /api/reservations
```

### リクエストボディ
```json
{
  "slotId": "slot_123",
  "duration": 60,
  "bookedStartTime": "2024-05-15T09:00:00Z",
  "bookedEndTime": "2024-05-15T10:00:00Z",
  "notes": "初回レッスンです"
}
```

### パラメータ
| パラメータ | 型 | 説明 | 必須 |
|------------|---------|------|------|
| slotId | string | 予約するレッスンスロットのID | はい |
| duration | number | 予約時間（分）、60-90分の範囲 | はい |
| bookedStartTime | string | 予約開始時間（ISO 8601形式） | はい |
| bookedEndTime | string | 予約終了時間（ISO 8601形式） | はい |
| notes | string | 備考・メモ | いいえ |

### レスポンス例
```json
{
  "success": true,
  "reservation": {
    "id": "reservation_123",
    "slotId": "slot_123",
    "studentId": "user_456",
    "status": "PENDING",
    "bookedStartTime": "2024-05-15T09:00:00Z",
    "bookedEndTime": "2024-05-15T10:00:00Z",
    "hoursBooked": 1,
    "durationMinutes": 60,
    "totalAmount": 6000,
    "notes": "初回レッスンです"
  },
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

## データモデル拡張

### LessonSlot（レッスンスロット）
```prisma
model LessonSlot {
  id          String       @id @default(cuid())
  teacherId   String       // User.id を参照
  teacher     User         @relation("TeacherSlots", fields: [teacherId], references: [id])
  startTime   DateTime     // 開始時間
  endTime     DateTime     // 終了時間
  hourlyRate  Int          @default(6000)  // 時間単価（デフォルト: 6000円）
  currency    String       @default("JPY") // 通貨
  minHours    Int          @default(1)     // 最小予約時間（単位：時間）
  maxHours    Int?         // 最大予約時間（nullの場合は制限なし）
  minDuration Int          @default(60)    // 最小予約時間（単位：分）
  maxDuration Int          @default(90)    // 最大予約時間（単位：分）
  isAvailable Boolean      @default(true)  // 予約可能かどうか
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  reservations Reservation[]
}
```

### Reservation（予約）
```prisma
model Reservation {
  id              String           @id @default(cuid())
  slotId          String           // LessonSlot.id を参照
  slot            LessonSlot       @relation(fields: [slotId], references: [id])
  studentId       String           // User.id を参照
  student         User             @relation("StudentReservations", fields: [studentId], references: [id])
  status          ReservationStatus @default(PENDING)
  payment         Payment?         @relation(fields: [paymentId], references: [id])
  paymentId       String?          @unique // Payment.id を参照
  bookedStartTime DateTime         // 予約開始時間
  bookedEndTime   DateTime         // 予約終了時間
  hoursBooked     Int              @default(1) // 予約時間数（時間単位）
  durationMinutes Int              @default(60) // 予約時間数（分単位）
  totalAmount     Int              // 合計金額（固定料金）
  notes           String?          @db.Text // 備考・メモ
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
}
``` 