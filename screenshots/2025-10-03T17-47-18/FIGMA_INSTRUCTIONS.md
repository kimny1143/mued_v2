# MUED LMS v2 - Figma AI Design Instructions

**生成日:** 2025-10-04
**プロジェクト:** MUED LMS v2 (Multi-User Educational Dashboard)
**目的:** 現在の実装UIをFigmaで再現し、デザインシステムとして整理

---

## 📋 プロジェクト概要

### アプリケーション情報
- **名称:** MUED LMS (Multi-User Educational Dashboard)
- **種類:** 教育管理システム（LMS: Learning Management System）
- **対象ユーザー:** 学生、講師、管理者
- **主要機能:** レッスン予約、教材管理、メッセージング、サブスクリプション管理

### 技術スタック
- **Frontend:** Next.js 15.5.4 (App Router)
- **UI Framework:** React 19
- **Styling:** TailwindCSS 4
- **Component Library:** Shadcn/UI
- **Authentication:** Clerk (Google OAuth)
- **Viewport:** 1440x900 @2x (Retina)

---

## 🎨 デザインシステム仕様

### カラーパレット

```css
/* Primary Colors */
--primary-blue: #2563eb      /* メインアクション（予約する） */
--primary-gray: #4b5563      /* セカンダリアクション（確認する） */
--primary-green: #16a34a     /* 成功・閲覧アクション */
--primary-purple: #9333ea    /* メッセージ・コミュニケーション */
--primary-orange: #ea580c    /* 警告・アップグレード */

/* Neutral Colors */
--gray-50: #f9fafb          /* 背景色 */
--gray-100: #f3f4f6         /* カード背景 */
--gray-200: #e5e7eb         /* ボーダー */
--gray-600: #4b5563         /* セカンダリテキスト */
--gray-900: #111827         /* プライマリテキスト */

/* Status Colors */
--success: #10b981
--warning: #f59e0b
--error: #ef4444
--info: #3b82f6
```

### タイポグラフィ

```css
/* Headings */
h1: text-3xl font-bold text-gray-900    /* 24px, Bold */
h2: text-xl font-semibold               /* 20px, Semibold */
h3: text-lg font-semibold               /* 18px, Semibold */

/* Body Text */
p: text-base text-gray-600              /* 16px, Regular */
small: text-sm text-gray-500            /* 14px, Regular */

/* Japanese Font Support */
font-family: system-ui, -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif
```

### スペーシング

```css
/* Container */
container: mx-auto px-4 py-8

/* Card Padding */
card-padding: p-6 (24px)

/* Grid Gap */
grid-gap: gap-6 (24px)

/* Button Padding */
button-padding: px-4 py-2 (16px 8px)
```

### コンポーネント設計

#### 1. カードコンポーネント
```css
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: 1px solid #e5e7eb;
  padding: 24px;
}
```

#### 2. ボタンスタイル
```css
/* Primary Button */
.btn-primary {
  background: #2563eb;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
}

/* Secondary Button */
.btn-secondary {
  background: #4b5563;
  color: white;
}

/* Success Button */
.btn-success {
  background: #16a34a;
  color: white;
}
```

---

## 📸 スクリーンショット一覧と指示

### 1. Landing Page (/)

**ファイル:**
- `landing-viewport.png` (メインビュー)
- `landing-fullpage.png` (全体)

**Figma AI 指示:**
```
このスクリーンショットは、MUED LMS のランディングページです。
以下の要素をFigmaで再現してください：

【レイアウト】
- フルスクリーン背景グラデーション
- センター配置のヒーローセクション
- CTA（Call To Action）ボタン配置

【デザイン要素】
- ヘッドライン: 大きな日本語テキスト
- サブテキスト: 説明文
- プライマリCTAボタン: 青色（#2563eb）
- セカンダリCTAボタン: グレー（#4b5563）

【レスポンシブ要件】
- 1440px viewport 対応
- モバイルビュー（375px）も考慮

このデザインをコンポーネント化し、再利用可能なパターンとして整理してください。
```

---

### 2. Dashboard (/dashboard)

**ファイル:**
- `dashboard-viewport.png` (メインビュー)
- `dashboard-fullpage.png` (全体)

**Figma AI 指示:**
```
このスクリーンショットは、MUED LMS のメインダッシュボードです。
以下の要素をFigmaで再現してください：

【レイアウト】
- ページヘッダー: 「ようこそ、Testさん！」
- サブヘッダー: 「MUED LMS ダッシュボード」
- 3カラムグリッドレイアウト（デスクトップ）
- 6枚のカード配置

【カード構成】
1. レッスン予約カード
   - タイトル: 日本語
   - 説明文: グレーテキスト
   - CTAボタン: 青色「予約する」

2. マイレッスンカード
   - タイトル: 日本語
   - CTAボタン: グレー「確認する」

3. 教材ライブラリカード
   - CTAボタン: 緑色「閲覧する」

4. メッセージカード
   - CTAボタン: 紫色「開く」

5. プロフィールカード
   - CTAボタン: 紫色「編集する」

6. サブスクリプションカード
   - ステータス: 「現在のプラン: フリープラン」
   - CTAボタン: オレンジ色「アップグレード」

【デザイン要素】
- カード背景: 白（#ffffff）
- カードボーダー: グレー（#e5e7eb）
- シャドウ: 0 1px 3px rgba(0,0,0,0.1)
- グリッドgap: 24px

【コンポーネント化要件】
- Card コンポーネント（再利用可能）
- Button バリアント（primary, secondary, success, warning）
- Grid レイアウトパターン

このデザインから「Dashboard Card」コンポーネントを抽出し、
バリエーションを作成してください。
```

---

### 3. Lessons Page (/dashboard/lessons)

**ファイル:**
- `lessons-viewport.png`
- `lessons-fullpage.png`

**Figma AI 指示:**
```
このスクリーンショットは、レッスン一覧ページです。

【レイアウト】
- ページヘッダー: 「レッスン予約」
- サブヘッダー: 説明文
- メンターフィルター: ドロップダウン
- レッスンカードリスト

【レッスンカードデザイン】
- カードレイアウト: 水平
- 左側: メンター情報
  - アバター画像（円形）
  - メンター名
  - 専門分野タグ
- 右側: レッスン詳細
  - 日時情報（アイコン付き）
  - 時間（Clock アイコン）
  - 「予約する」ボタン

【空状態デザイン】
- メッセージ: 「利用可能なレッスンがありません」
- 中央配置
- グレーテキスト

【コンポーネント要件】
- LessonCard コンポーネント
- EmptyState コンポーネント
- FilterDropdown コンポーネント

リスト表示とグリッド表示の両方のバリエーションを作成してください。
```

---

### 4. Materials Page (/dashboard/materials)

**ファイル:**
- `materials-viewport.png`
- `materials-fullpage.png`

**Figma AI 指示:**
```
このスクリーンショットは、教材一覧ページです。

【レイアウト】
- ページヘッダー: 「教材ライブラリ」
- 「新しい教材を作成」ボタン（右上）
- 教材カードグリッド（3カラム）

【教材カードデザイン】
- カード構成:
  - 教材タイトル（太字）
  - カテゴリータグ（色分け）
  - 作成日時
  - ファイル情報（アイコン + サイズ）
  - アクションボタン（「開く」「編集」「削除」）

【空状態】
- メッセージ: 「教材がまだありません」
- 「作成する」CTAボタン

【カテゴリータグ】
- Programming: 青色
- Design: 紫色
- Business: 緑色
- Language: オレンジ色

【コンポーネント要件】
- MaterialCard コンポーネント
- CategoryTag コンポーネント
- ActionMenu コンポーネント

グリッドレイアウトの responsive バリエーションを含めてください。
```

---

### 5. Reservations Page (/dashboard/reservations)

**ファイル:**
- `reservations-viewport.png`
- `reservations-fullpage.png`

**Figma AI 指示:**
```
このスクリーンショットは、予約一覧ページです。

【レイアウト】
- ページヘッダー: 「マイレッスン」
- ステータスフィルター: タブ形式（全て / 予定 / 完了 / キャンセル）
- 予約カードリスト

【予約カードデザイン】
- 横長カードレイアウト
- 左側: レッスン情報
  - タイトル
  - メンター名
  - 日時（Calendar アイコン）
- 右側: ステータスバッジ + アクション
  - ステータス:
    - 予定: 青色バッジ
    - 完了: 緑色バッジ
    - キャンセル: 赤色バッジ
  - アクションボタン:
    - 「参加する」（予定のみ）
    - 「キャンセル」（予定のみ）
    - 「レビューする」（完了のみ）

【空状態】
- メッセージ: 「予約がありません」
- 「レッスンを予約」CTAボタン

【コンポーネント要件】
- ReservationCard コンポーネント
- StatusBadge バリアント（scheduled, completed, cancelled）
- TabFilter コンポーネント

ステータスごとの表示バリエーションを作成してください。
```

---

### 6. Booking Calendar Page (/dashboard/booking-calendar)

**ファイル:**
- `booking-calendar-viewport.png`
- `booking-calendar-fullpage.png`

**Figma AI 指示:**
```
このスクリーンショットは、予約カレンダーページです。

【レイアウト】
- ページヘッダー: 「予約カレンダー」
- 月次カレンダービュー
- 利用可能スロット表示

【カレンダーデザイン】
- グリッドレイアウト: 7列（日〜土）
- ヘッダー: 曜日表示
- セル:
  - 日付番号
  - 利用可能スロット数（バッジ）
  - ホバー状態: 詳細表示
- 今日: ハイライト表示（青色ボーダー）
- 過去の日付: グレーアウト

【空状態】
- メッセージ: 「利用可能なスロットがありません」
- 中央配置

【インタラクション要件】
- セルクリック: 詳細モーダル表示
- スロット選択: ハイライト
- 日付ナビゲーション: 前月/次月ボタン

【コンポーネント要件】
- Calendar コンポーネント
- CalendarCell コンポーネント
- DatePicker コンポーネント
- SlotBadge コンポーネント

月次ビューと週次ビューのバリエーションを含めてください。
```

---

## 🔧 Figma設定推奨事項

### アートボードサイズ
```
Desktop: 1440 x 900 (Retina @2x)
Tablet: 768 x 1024
Mobile: 375 x 812
```

### グリッドシステム
```
Columns: 12
Gutter: 24px
Margin: 32px (Desktop), 16px (Mobile)
```

### デザイントークン設定

```json
{
  "colors": {
    "primary": {
      "blue": "#2563eb",
      "gray": "#4b5563",
      "green": "#16a34a",
      "purple": "#9333ea",
      "orange": "#ea580c"
    },
    "neutral": {
      "50": "#f9fafb",
      "100": "#f3f4f6",
      "200": "#e5e7eb",
      "600": "#4b5563",
      "900": "#111827"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px",
    "2xl": "48px"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "6px",
    "lg": "8px",
    "full": "9999px"
  }
}
```

---

## 📦 コンポーネントライブラリ構成

### 必須コンポーネント

1. **Layout Components**
   - PageContainer
   - PageHeader
   - GridLayout (2col, 3col variants)

2. **Card Components**
   - DashboardCard (6 variants)
   - LessonCard
   - MaterialCard
   - ReservationCard

3. **Button Components**
   - Button (primary, secondary, success, warning, danger)
   - IconButton
   - LinkButton

4. **Form Components**
   - Input
   - Select/Dropdown
   - DatePicker
   - FileUpload

5. **Data Display**
   - Table
   - List
   - Calendar
   - EmptyState

6. **Feedback**
   - Badge (status variants)
   - Tag (category variants)
   - Toast/Notification
   - Modal

---

## 🎯 Figma AI 実行手順

### Step 1: プロジェクト初期化
```
"screenshots/2025-10-03T17-47-18/" フォルダ内の全スクリーンショットを
Figma にインポートし、1440x900 のフレームに配置してください。

各スクリーンショットを個別のページとして整理し、
以下の命名規則で管理してください：
- 01_Landing
- 02_Dashboard
- 03_Lessons
- 04_Materials
- 05_Reservations
- 06_Booking_Calendar
```

### Step 2: デザインシステム構築
```
上記のカラーパレット、タイポグラフィ、スペーシングの仕様に基づいて、
Figma のローカルスタイルを作成してください。

Color Styles:
- Primary/Blue
- Primary/Gray
- Primary/Green
- Primary/Purple
- Primary/Orange
- Neutral/50-900

Text Styles:
- Heading/H1
- Heading/H2
- Heading/H3
- Body/Regular
- Body/Small
```

### Step 3: コンポーネント抽出
```
スクリーンショットから以下のコンポーネントを抽出し、
Figma Components として作成してください：

優先度1（必須）:
- Button (5 variants)
- Card (3 types)
- Input
- Badge

優先度2（推奨）:
- Calendar
- List Item
- Empty State
- Page Header

各コンポーネントに variants と properties を設定し、
Auto Layout を適用してください。
```

### Step 4: レスポンシブ対応
```
各ページのデスクトップビュー（1440px）に加えて、
タブレット（768px）とモバイル（375px）のバリエーションを作成してください。

レスポンシブ対応のポイント：
- グリッドを 3列 → 2列 → 1列 に調整
- フォントサイズをスケールダウン
- スペーシングを調整
- ナビゲーションをハンバーガーメニューに変更
```

---

## 📊 期待される成果物

### Figmaファイル構成
```
📁 MUED LMS v2 Design System
  ├── 📄 00_Cover (プロジェクト概要)
  ├── 📄 01_Design_Tokens (カラー、タイポグラフィ等)
  ├── 📄 02_Components (全コンポーネント)
  ├── 📄 03_Screens_Desktop (6画面)
  ├── 📄 04_Screens_Tablet (6画面)
  ├── 📄 05_Screens_Mobile (6画面)
  └── 📄 06_User_Flows (ユーザーフロー図)
```

### デザインドキュメント
- [ ] Design System Overview
- [ ] Component Library Documentation
- [ ] Responsive Guidelines
- [ ] Accessibility Checklist
- [ ] Export Assets (SVG, PNG @2x)

---

## 🚀 次のステップ

1. **Figma AI でデザイン生成**
   - この FIGMA_INSTRUCTIONS.md を Figma AI に入力
   - スクリーンショットをインポート
   - デザインシステムを構築

2. **デザインレビュー**
   - 開発チームとデザイン確認
   - フィードバック反映

3. **実装へのハンドオフ**
   - Figma Dev Mode 有効化
   - コンポーネント仕様書作成
   - TailwindCSS クラス対応表作成

4. **継続的な更新**
   - 新機能追加時にデザインシステム更新
   - スクリーンショット定期更新
   - コンポーネントバージョン管理

---

**作成者:** MUED LMS v2 Development Team
**更新日:** 2025-10-04
**バージョン:** 1.0.0
