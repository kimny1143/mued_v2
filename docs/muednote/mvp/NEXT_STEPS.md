# MUEDnote MVP - 次のステップ

> **最終更新**: 2025-12-23 02:30
> **現在地**: Phase 2 完了、TestFlight準備前

---

## 現状サマリー

### 完成しているもの
- ✅ 48kHz 録音（音楽制作品質）
- ✅ 16kHz リサンプリング（Whisper用）
- ✅ Whisper 文字起こし（ggml-small）
- ✅ DB同期（Neon PostgreSQL）
- ✅ M4A変換（容量5-6倍圧縮）
- ✅ 音声ファイル共有

### 未完成のもの
- 🔲 **本番認証**（← 次にやること）
- 🔲 TestFlight配布
- 🔲 履歴表示画面

---

## 次にやること: 本番認証の実装

### なぜ必要？

今は「開発モード」で動いている：

```
現在（開発）:
iPhone → "dev_token_kimny" → ローカルMac (localhost:3000)
                                    ↓
                            NODE_ENV=development なので OK

TestFlight（本番）:
iPhone → ??? → Vercel (mued.jp)
                    ↓
              開発トークン無効 → 401 Unauthorized エラー
```

### 選択肢は3つ

#### 選択肢1: Clerk モバイル認証（本格的）

**メリット**: MUED LMS と同じ認証基盤、将来的に統合しやすい
**デメリット**: 実装に時間がかかる

```
実装イメージ:
┌─────────────────────────────────┐
│  オンボーディング               │
│  ↓                              │
│  Clerkログイン画面              │
│  (メール/Google/Apple)          │
│  ↓                              │
│  認証完了 → メイン画面          │
└─────────────────────────────────┘
```

**必要なパッケージ**:
```bash
npm install @clerk/clerk-expo
```

**実装ファイル**:
- `src/providers/ClerkProvider.tsx` - 認証プロバイダー
- `src/screens/LoginScreen.tsx` - ログイン画面
- `App.tsx` - ルーティング変更

---

#### 選択肢2: デバイストークン（シンプル）

**メリット**: ログイン画面不要、UXがシンプル
**デメリット**: セキュリティは低め（MVP向け）

```
実装イメージ:
┌─────────────────────────────────┐
│  初回起動                       │
│  ↓                              │
│  デバイスID生成（自動）         │
│  ↓                              │
│  サーバーにデバイス登録         │
│  ↓                              │
│  トークン取得 → メイン画面      │
└─────────────────────────────────┘
```

**必要な変更**:

1. **サーバー側**: デバイス登録API追加
```typescript
// app/api/muednote/mobile/auth/device/route.ts
POST /api/muednote/mobile/auth/device
Body: { device_id: "xxx", device_name: "iPhone 15" }
Response: { token: "xxx", user_id: "device_xxx" }
```

2. **アプリ側**: 初回起動時に自動登録
```typescript
// src/services/authService.ts
- デバイスID生成（UUID）
- トークンをAsyncStorageに保存
- 以降は自動でヘッダーに付与
```

---

#### 選択肢3: 招待コード（最もシンプル・推奨）

**メリット**: 最小実装、すぐできる、テスター管理しやすい
**デメリット**: スケールしない（MVP限定）

```
実装イメージ:
┌─────────────────────────────────┐
│  オンボーディング               │
│  ↓                              │
│  「招待コードを入力」           │
│  [ MUED2024 ]                   │
│  ↓                              │
│  コード検証 → メイン画面        │
└─────────────────────────────────┘
```

**必要な変更**:

1. **サーバー側**: 招待コード検証API
```typescript
// app/api/muednote/mobile/auth/invite/route.ts
POST /api/muednote/mobile/auth/invite
Body: { code: "MUED2024", device_id: "xxx" }
Response: { token: "xxx", user_id: "invite_xxx" }
```

2. **DBテーブル**: 招待コード管理（オプション）
```sql
-- 簡易版: 環境変数で固定コード
MUEDNOTE_INVITE_CODES=MUED2024,TESTER001,BETA2025

-- 本格版: テーブル管理
CREATE TABLE muednote_invite_codes (
  code TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  used_by TEXT,
  used_at TIMESTAMP
);
```

3. **アプリ側**: 招待コード入力画面
```typescript
// src/screens/InviteCodeScreen.tsx
- テキスト入力
- 検証ボタン
- 成功したらトークン保存 → メイン画面へ
```

---

## 推奨: 選択肢3（招待コード）から始める

### 理由
1. **実装が最小**: 1-2時間で完了
2. **テスター管理**: コードを知っている人だけアクセス
3. **後から変更可能**: Clerk認証に移行しても問題なし

### 実装手順

```
Step 1: サーバー側API作成（30分）
        app/api/muednote/mobile/auth/invite/route.ts

Step 2: アプリ側画面作成（30分）
        src/screens/InviteCodeScreen.tsx

Step 3: ナビゲーション変更（30分）
        App.tsx - 認証状態でルーティング分岐

Step 4: 本番環境変数設定（10分）
        Vercel: MUEDNOTE_INVITE_CODES=xxx

Step 5: テスト（30分）
        本番URLでアプリ動作確認
```

---

## TestFlight配布の流れ

認証実装後、以下の手順でTestFlight配布：

```
1. Apple Developer Program 確認
   - https://developer.apple.com
   - 年間 $99 のメンバーシップ必要

2. App Store Connect でアプリ作成
   - Bundle ID: com.mued.muednote
   - アプリ名: MUEDnote

3. Xcode でアーカイブ
   - Product → Archive
   - Distribute App → App Store Connect

4. TestFlight 審査待ち（1-2日）

5. テスターを招待
   - メールアドレスで招待
   - TestFlightアプリからインストール
```

---

## ファイル構成（現在）

```
apps/muednote-mobile/
├── App.tsx                    # エントリーポイント
├── src/
│   ├── screens/
│   │   ├── OnboardingScreen.tsx   # オンボーディング
│   │   ├── SessionScreen.tsx      # メイン（タイマー）
│   │   └── ReviewScreen.tsx       # レビュー（文字起こし結果）
│   ├── services/
│   │   └── whisperService.ts      # 音声処理
│   ├── api/
│   │   └── client.ts              # API通信 ← 認証トークン管理
│   └── stores/
│       └── sessionStore.ts        # 状態管理
└── modules/
    ├── audio-resampler/           # 48kHz→16kHz
    └── audio-encoder/             # WAV→M4A
```

---

## 環境変数（本番で必要）

### Vercel側
```env
# すでに設定済み（MUED LMS共通）
DATABASE_URL=xxx
CLERK_SECRET_KEY=xxx

# MUEDnote用に追加
MUEDNOTE_INVITE_CODES=MUED2024,TESTER001
```

### アプリ側（ビルド時に埋め込み）
```env
# .env.production
EXPO_PUBLIC_API_URL=https://mued.jp
```

---

## 困ったときは

### ビルドエラー
```bash
# クリーンビルド
cd apps/muednote-mobile
rm -rf ios/build ios/Pods
npx expo prebuild --clean --platform ios
cd ios && pod install && cd ..
```

### モジュールがロードされない
→ `package.json` の dependencies に追加されているか確認
```json
"audio-encoder": "file:./modules/audio-encoder",
"audio-resampler": "file:./modules/audio-resampler",
```

### 認証エラー（401）
→ 本番環境で開発トークンは無効
→ 招待コード認証の実装が必要

---

*このドキュメントは次回作業開始時の引き継ぎ用です*
