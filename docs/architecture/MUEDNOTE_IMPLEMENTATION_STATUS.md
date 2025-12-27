# MUEDnote 実装状況・方針ドキュメント

作成日: 2025-12-27
ステータス: 確定

---

## 1. エグゼクティブサマリー

MUEDnoteは音楽制作中の「判断」を記録・資産化するツール。1/7リリースに向けて、**Mobile (iOS) + Webダッシュボード**の構成で展開する。

### 確定事項

| 項目 | 判断 |
|-----|------|
| 1/7リリース対象 | Mobile (iOS) + Webダッシュボード |
| Desktop (Tauri v3) | アーカイブ（現実装は不要） |
| 将来のDesktop | DAWプラグイン連携時に別設計 |
| 認証基盤 | Clerk（Web/Mobile共通） |
| データベース | Neon PostgreSQL |

---

## 2. プラットフォーム別実装状況

### 2.1 Mobile (Expo) - v7 MVP

**ステータス: ✅ 機能実装完了、認証統合が必要**

| 機能 | 状況 | 詳細 |
|-----|------|------|
| 音声録音 | ✅ 完了 | 48kHz WAV（音楽制作品質） |
| Whisper文字起こし | ✅ 完了 | 16kHzリサンプリング、ハルシネーション除去 |
| ローカルキャッシュ | ✅ 完了 | AsyncStorage |
| サーバー同期 | ✅ 完了 | API実装済み |
| 認証 | ❌ 未完了 | dev_token固定、Clerk統合必要 |

**主要ファイル:**
```
apps/muednote-mobile/
├── src/services/whisperService.ts   # 音声処理エンジン
├── src/services/syncService.ts      # サーバー同期
├── src/api/client.ts                # APIクライアント（要認証統合）
└── src/cache/storage.ts             # AsyncStorageラッパー
```

### 2.2 Web (Next.js)

**ステータス: ✅ LMS稼働中、MUEDnote専用ダッシュボード追加が必要**

| 機能 | 状況 | 詳細 |
|-----|------|------|
| Clerk認証 | ✅ 完了 | middleware.ts で保護 |
| Mobile API | ✅ 完了 | /api/muednote/mobile/* |
| LMSダッシュボード | ✅ 稼働中 | /dashboard/* |
| MUEDnoteダッシュボード | ❌ 未実装 | 新規作成が必要 |

**主要ファイル:**
```
app/api/muednote/mobile/
├── sessions/route.ts           # セッション作成・一覧
├── logs/route.ts               # ログ保存
└── sessions/[id]/logs/route.ts # ログ取得
```

### 2.3 Desktop (Tauri v3)

**ステータス: アーカイブ決定**

| 判断 | 理由 |
|-----|------|
| 現実装は不要 | 1/7はMobileのみで展開 |
| 役割が異なる | 録音機能ではなく、将来はCompanion App |
| 別設計が必要 | DAWプラグイン連携時に改めて設計 |

**アーカイブ対象:**
```
apps/muednote-v3/  # Tauri実装
```

---

## 3. アーキテクチャ

### 3.1 1/7リリース構成

```
┌─────────────────────────────────────────────────────────┐
│                    ユーザー                              │
└─────────────────┬───────────────────┬───────────────────┘
                  │                   │
                  ↓                   ↓
┌─────────────────────────┐   ┌─────────────────────────┐
│   Mobile App (iOS)      │   │   Web Dashboard         │
│   - 音声録音            │   │   - 判断ログ閲覧        │
│   - 文字起こし          │   │   - セッション履歴      │
│   - ローカル保存        │   │   - Clerk認証           │
│   - サーバー同期        │   │                         │
└───────────┬─────────────┘   └───────────┬─────────────┘
            │                             │
            │      Clerk認証（共通）       │
            └──────────────┬──────────────┘
                           │
                           ↓
            ┌─────────────────────────────┐
            │   Next.js API Routes        │
            │   /api/muednote/mobile/*    │
            └──────────────┬──────────────┘
                           │
                           ↓
            ┌─────────────────────────────┐
            │   Neon PostgreSQL           │
            │   - muednoteMobileSessions  │
            │   - muednoteMobileLogs      │
            └─────────────────────────────┘
```

### 3.2 将来構成（Phase 2+: DAWプラグイン展開時）

```
┌─────────────────────────────────────────────────────────┐
│  DAW (Pro Tools / Logic / Ableton)                      │
│  ┌───────────────────────────────────┐                 │
│  │ MUEDnote Plugin (VST/AU/AAX)      │                 │
│  │ - 判断ポイント記録                 │                 │
│  │ - OSC/MIDI受信                     │                 │
│  └───────────────┬───────────────────┘                 │
└──────────────────│──────────────────────────────────────┘
                   │ ローカル通信
                   ↓
┌─────────────────────────────────────────────────────────┐
│  MUEDnote Desktop Companion App                         │
│  - 認証管理（Clerk）                                     │
│  - プラグイン管理（更新/ライセンス）                      │
│  - ダッシュボード                                        │
│  - クラウド同期                                          │
└─────────────────────────────────────────────────────────┘
```

**Note:** Desktop Companion AppはPhase 2+で別途設計。現Tauri v3実装とは別物。

---

## 4. データフロー

### 4.1 Mobile録音→保存フロー

```
①録音開始
  └─ whisperService.startRecording()
  └─ 48kHz WAV形式

②セッション終了
  └─ whisperService.stopRecording()
  └─ 録音ファイル取得

③文字起こし
  └─ whisperService.transcribe()
  └─ 48kHz → 16kHz リサンプリング
  └─ Whisper処理
  └─ ハルシネーション除去

④ローカル保存
  └─ AsyncStorage に保存
  └─ オフラインでも動作

⑤サーバー同期
  └─ syncService.syncPendingSessions()
  └─ POST /api/muednote/mobile/sessions
  └─ POST /api/muednote/mobile/logs
  └─ Neon PostgreSQL に永続化
```

### 4.2 DBスキーマ

```typescript
// muednoteMobileSessions
{
  id: uuid (PK)
  userId: text (Clerk user_id)  // ← 認証統合後はClerk IDが入る
  durationSec: integer
  startedAt: timestamp
  endedAt: timestamp
  sessionMemo: text
  status: enum('active' | 'completed' | 'synced')
}

// muednoteMobileLogs
{
  id: uuid (PK)
  sessionId: uuid (FK)
  timestampSec: real
  text: text
  confidence: real (0-1)
}
```

---

## 5. 1/7リリースまでの実装タスク

### 5.1 Mobile: Clerk認証統合

**現状:**
```typescript
// apps/muednote-mobile/src/api/client.ts
const DEV_TOKEN = 'dev_token_kimny';
const DEV_USER_ID = 'dev_user_kimny';
```

**目標:**
```typescript
// Clerk React Native SDK使用
import { useAuth } from '@clerk/clerk-expo';
const { getToken, userId } = useAuth();
```

**タスク:**
1. `@clerk/clerk-expo` インストール
2. ClerkProvider設定
3. api/client.ts の認証ロジック置換
4. サインイン/サインアップUI追加

### 5.2 Web: MUEDnote専用ダッシュボード

**目標構成:**
```
app/dashboard/muednote/
├── page.tsx           # メインダッシュボード
├── sessions/
│   └── page.tsx       # セッション一覧
├── logs/
│   └── page.tsx       # 判断ログ一覧
└── layout.tsx         # MUEDnote専用レイアウト（LMSメニュー非表示）
```

**表示内容:**
- セッション一覧（日付、時間、メモ）
- 判断ログ詳細（文字起こしテキスト、タイムスタンプ）
- 同期状態

### 5.3 ルーティング調整

**現状:**
```
サインアップ → /dashboard (LMSダッシュボード)
```

**目標:**
```
サインアップ → /dashboard/muednote (MUEDnote専用)
```

**実装箇所:**
- Clerk afterSignUpUrl / afterSignInUrl 設定
- middleware.ts のリダイレクトロジック

---

## 6. 将来のDesktop Companion App（参考）

1/7リリースには含まないが、Phase 2+で必要になる機能:

| 機能 | 説明 |
|-----|------|
| 認証管理 | Clerk認証、トークン保持 |
| プラグイン管理 | VST/AU/AAXプラグインのインストール・更新 |
| ライセンス管理 | サブスク状態の確認 |
| ダッシュボード | 判断ログ閲覧（Webと同等） |
| DAW連携 | ローカル通信でプラグインとデータ交換 |

**技術選定（候補）:**
- Tauri 2.0（Rust + Web UI）
- Electron（Node.js + Chromium）
- 別途検討

---

## 7. 変更履歴

| 日付 | 変更内容 | 決定者 |
|-----|---------|-------|
| 2025-12-27 | 初版作成、Desktop (Tauri v3) アーカイブ決定 | Kimny + Claude |

---

*このドキュメントは1/7リリースに向けた実装方針の正式な記録です。*
