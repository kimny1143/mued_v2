# MUED LMS v2 - Figma Design Screenshots

📅 **生成日:** 2025-10-04
🎨 **目的:** Figma AI での**洗練されたデザインシステム構築**
📱 **解像度:** 1440x900 @2x (Retina)
🖼️ **画面数:** 6画面 (各2種類: Viewport + Full Page = 合計12枚)

⚠️ **重要:** これらのスクリーンショットは基本的なTailwindCSSデフォルトスタイルの
プロトタイプ版です。Figma AIに「機能を維持しながらビジュアルを大幅に改善」させる
ための**参考資料**として使用します。

---

## 📁 ファイル構成

```
screenshots/2025-10-03T17-47-18/
├── README.md                         # このファイル
├── FIGMA_INSTRUCTIONS.md             # Figma AI への詳細指示書
├── index.html                        # スクリーンショットビューアー
│
├── landing-viewport.png              # 1. ランディングページ (Viewport)
├── landing-fullpage.png              # 1. ランディングページ (Full Page)
│
├── dashboard-viewport.png            # 2. ダッシュボード (Viewport)
├── dashboard-fullpage.png            # 2. ダッシュボード (Full Page)
│
├── lessons-viewport.png              # 3. レッスン一覧 (Viewport)
├── lessons-fullpage.png              # 3. レッスン一覧 (Full Page)
│
├── materials-viewport.png            # 4. 教材一覧 (Viewport)
├── materials-fullpage.png            # 4. 教材一覧 (Full Page)
│
├── reservations-viewport.png         # 5. 予約一覧 (Viewport)
├── reservations-fullpage.png         # 5. 予約一覧 (Full Page)
│
├── booking-calendar-viewport.png     # 6. 予約カレンダー (Viewport)
└── booking-calendar-fullpage.png     # 6. 予約カレンダー (Full Page)
```

---

## 🚀 クイックスタート

### 1. スクリーンショットを確認

HTMLビューアーをブラウザで開く：

```bash
open index.html
```

または直接パスを開く：
```
/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/screenshots/2025-10-03T17-47-18/index.html
```

### 2. Figma AI で使用

1. `FIGMA_INSTRUCTIONS.md` を開く
2. 内容をコピー
3. Figma の新規ファイルを作成
4. Figma AI に指示書をペースト
5. スクリーンショットをインポート
6. デザインシステムを自動生成

---

## 📖 スクリーンショット詳細

### 1. Landing Page (/)

**ファイル:** `landing-viewport.png`, `landing-fullpage.png`

**内容:**
- ヒーローセクション
- CTAボタン配置
- ブランドメッセージ

**サイズ:**
- Viewport: 304 KB
- Full Page: 464 KB

---

### 2. Dashboard (/dashboard)

**ファイル:** `dashboard-viewport.png`, `dashboard-fullpage.png`

**内容:**
- ウェルカムメッセージ: 「ようこそ、Testさん！」
- 6枚のダッシュボードカード
  1. レッスン予約 (青ボタン)
  2. マイレッスン (グレーボタン)
  3. 教材ライブラリ (緑ボタン)
  4. メッセージ (紫ボタン)
  5. プロフィール (紫ボタン)
  6. サブスクリプション (オレンジボタン)
- 3カラムグリッドレイアウト

**サイズ:**
- Viewport: 162 KB
- Full Page: 162 KB

**重要:** このページがデザインシステムの基礎となるコンポーネント（Card, Button, Grid）を含んでいます。

---

### 3. Lessons List (/dashboard/lessons)

**ファイル:** `lessons-viewport.png`, `lessons-fullpage.png`

**内容:**
- ページヘッダー: 「レッスン予約」
- メンターフィルター（ドロップダウン）
- Empty State: 「利用可能なレッスンがありません」

**サイズ:**
- Viewport: 88 KB
- Full Page: 88 KB

**将来の実装:**
- レッスンカードリスト
- メンター情報（アバター、名前、専門分野）
- 日時情報
- 「予約する」ボタン

---

### 4. Materials Library (/dashboard/materials)

**ファイル:** `materials-viewport.png`, `materials-fullpage.png`

**内容:**
- ページヘッダー: 「教材ライブラリ」
- 「新しい教材を作成」ボタン（右上）
- Empty State: 「教材がまだありません」

**サイズ:**
- Viewport: 104 KB
- Full Page: 104 KB

**将来の実装:**
- 教材カードグリッド（3カラム）
- カテゴリータグ（色分け）
- ファイル情報
- アクションメニュー（開く、編集、削除）

---

### 5. Reservations (/dashboard/reservations)

**ファイル:** `reservations-viewport.png`, `reservations-fullpage.png`

**内容:**
- ページヘッダー: 「マイレッスン」
- Empty State: 「予約がありません」
- 「レッスンを予約する」CTAボタン

**サイズ:**
- Viewport: 68 KB
- Full Page: 68 KB

**将来の実装:**
- ステータスフィルタータブ（全て / 予定 / 完了 / キャンセル）
- 予約カードリスト
- ステータスバッジ
- アクションボタン（参加、キャンセル、レビュー）

---

### 6. Booking Calendar (/dashboard/booking-calendar)

**ファイル:** `booking-calendar-viewport.png`, `booking-calendar-fullpage.png`

**内容:**
- ページヘッダー: 「予約カレンダー」
- Empty State: 「利用可能なスロットがありません」

**サイズ:**
- Viewport: 91 KB
- Full Page: 91 KB

**将来の実装:**
- 月次カレンダーグリッド（7列 x 5行）
- 利用可能スロット数バッジ
- 今日のハイライト
- 日付ナビゲーション（前月/次月）

---

## 🎨 デザイン仕様

### カラーパレット

```css
/* Primary Colors */
--blue: #2563eb      /* レッスン予約 */
--gray: #4b5563      /* マイレッスン */
--green: #16a34a     /* 教材閲覧 */
--purple: #9333ea    /* メッセージ、プロフィール */
--orange: #ea580c    /* サブスクリプション */

/* Neutral */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-600: #4b5563
--gray-900: #111827
```

### タイポグラフィ

```css
/* Headings */
h1: text-3xl font-bold (24px)
h2: text-xl font-semibold (20px)
h3: text-lg font-semibold (18px)

/* Body */
p: text-base (16px)
small: text-sm (14px)
```

### スペーシング

```css
container: px-4 py-8 (16px 32px)
card-padding: p-6 (24px)
grid-gap: gap-6 (24px)
button-padding: px-4 py-2 (16px 8px)
```

---

## 📋 Figma AI 使用方法

### Step 1: ファイルインポート

1. Figma で新規ファイルを作成
2. すべてのスクリーンショット（12枚）をドラッグ&ドロップ
3. 各画像を 1440x900 のフレームに配置

### Step 2: 指示書読み込み

1. `FIGMA_INSTRUCTIONS.md` を開く
2. 全内容をコピー
3. Figma AI チャットにペースト
4. "この指示に従ってデザインシステムを構築してください" と入力

### Step 3: コンポーネント生成

Figma AI が自動的に以下を生成します：

- ✅ Color Styles（9色）
- ✅ Text Styles（6種類）
- ✅ Button Components（5 variants）
- ✅ Card Components（3 types）
- ✅ Layout Components（Page Container, Grid）

### Step 4: レスポンシブ対応

Figma AI に追加指示：

```
これらのデスクトップビュー（1440px）に加えて、
タブレット（768px）とモバイル（375px）の
バリエーションを作成してください。
```

---

## 🔧 技術詳細

### 撮影環境

```yaml
Browser: Chromium (Playwright)
Viewport: 1440 x 900
Device Scale: 2 (Retina)
User Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
Wait Strategy: networkidle + 2秒
```

### E2E Test Mode

これらのスクリーンショットは、E2Eテストモードで撮影されています：

```javascript
NEXT_PUBLIC_E2E_TEST_MODE=true
```

**効果:**
- ✅ Clerk OAuth 認証をバイパス
- ✅ モックユーザー「Test」で表示
- ✅ 全ダッシュボードページへアクセス可能

### 撮影コマンド

```bash
# 手動実行
node scripts/test-screenshot.js

# MCP経由（Claude Desktop）
Capture MUED screenshots for Figma
```

---

## 📊 ファイルサイズ一覧

| ファイル | サイズ | 説明 |
|---------|--------|------|
| `landing-viewport.png` | 304 KB | ランディング（Viewport） |
| `landing-fullpage.png` | 464 KB | ランディング（Full Page） |
| `dashboard-viewport.png` | 162 KB | ダッシュボード（Viewport） |
| `dashboard-fullpage.png` | 162 KB | ダッシュボード（Full Page） |
| `lessons-viewport.png` | 88 KB | レッスン一覧（Viewport） |
| `lessons-fullpage.png` | 88 KB | レッスン一覧（Full Page） |
| `materials-viewport.png` | 104 KB | 教材一覧（Viewport） |
| `materials-fullpage.png` | 104 KB | 教材一覧（Full Page） |
| `reservations-viewport.png` | 68 KB | 予約一覧（Viewport） |
| `reservations-fullpage.png` | 68 KB | 予約一覧（Full Page） |
| `booking-calendar-viewport.png` | 91 KB | カレンダー（Viewport） |
| `booking-calendar-fullpage.png` | 91 KB | カレンダー（Full Page） |
| **合計** | **1.77 MB** | 12枚 |

---

## ✅ チェックリスト

### 撮影完了
- [x] ランディングページ
- [x] ダッシュボード
- [x] レッスン一覧
- [x] 教材一覧
- [x] 予約一覧
- [x] 予約カレンダー

### ドキュメント作成完了
- [x] README.md
- [x] FIGMA_INSTRUCTIONS.md
- [x] index.html（ビューアー）

### 品質確認
- [x] 全画像が 1440x900 @2x
- [x] 認証バイパス成功（ダッシュボードアクセス可能）
- [x] Viewport版とFull Page版の両方撮影
- [x] 日本語テキスト正常表示
- [x] モックユーザー「Test」表示確認

---

## 🚀 次のステップ

### 1. Figma デザイン生成
- [ ] Figma に全スクリーンショットをインポート
- [ ] `FIGMA_INSTRUCTIONS.md` を Figma AI に入力
- [ ] デザインシステムを自動生成
- [ ] コンポーネントライブラリを整理

### 2. デザインレビュー
- [ ] 開発チームとデザイン確認
- [ ] フィードバック収集
- [ ] 必要に応じて調整

### 3. 実装へのハンドオフ
- [ ] Figma Dev Mode 有効化
- [ ] コンポーネント仕様書作成
- [ ] TailwindCSS クラス対応表作成
- [ ] 開発者にデザインファイル共有

### 4. 継続的更新
- [ ] 新機能追加時にスクリーンショット更新
- [ ] デザインシステムのバージョン管理
- [ ] Figma ファイルとコードベースの同期

---

## 📞 サポート

質問や問題がある場合は、以下を参照してください：

- **E2Eテスト設定:** `/docs/e2e-test-setup.md`
- **MCPコマンド:** `/docs/claude-desktop-commands.md`
- **スクリーンショット再生成:** `node scripts/test-screenshot.js`

---

**作成者:** MUED LMS v2 Development Team
**バージョン:** 1.0.0
**最終更新:** 2025-10-04
