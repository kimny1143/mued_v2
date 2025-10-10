# Figma AI でのデザインシステム構築 - 完全ガイド

**所要時間:** 約15-20分
**必要なもの:** Figmaアカウント（有料プラン、Full seat必須）

---

## 📋 事前準備

### 1. ファイルを確認

このフォルダに以下があることを確認：
```
✅ 12枚のスクリーンショット（landing, dashboard, lessons, materials, reservations, booking-calendar）
```

---

## 🚀 Figma での操作手順

### Step 1: Figma を開く

1. ブラウザで https://www.figma.com を開く
2. ログインする
3. 左上の **「＋ New」** ボタンをクリック
4. **「Design file」** を選択

**結果:** 新しい空のFigmaファイルが開きます

---

### Step 2: ファイル名を設定

1. 左上の **「Untitled」** をクリック
2. 以下の名前に変更：
   ```
   MUED LMS v2 - Design System
   ```
3. Enter キーで確定

---

### Step 3: スクリーンショットをインポート（参考資料として）

#### 3-1. 画像を一括インポート

1. **Cmd + Shift + K** (Mac) または **Ctrl + Shift + K** (Windows)
2. ファイルエクスプローラーが開く
3. 以下のファイルを **全て選択** してドラッグ：
   ```
   dashboard-viewport.png
   lessons-viewport.png
   materials-viewport.png
   reservations-viewport.png
   booking-calendar-viewport.png
   ```
4. **「開く」** をクリック
5. カーソルが画像アイコンになるので、キャンバス上で **5回クリック** して配置

**ショートカット Tips:**
- **Space + ドラッグ**: キャンバス移動
- **Cmd/Ctrl + マウスホイール**: ズーム
- **Cmd/Ctrl + 0**: 全体表示

#### 3-2. レイアウト整理

1. 5枚の画像を縦に並べる
2. 各画像の間隔を **200px** に設定（整列ツール使用）

**重要:** これらのスクリーンショットは**参考資料**です。First Draftで新しいデザインを生成します。

---

### Step 4: First Draft を起動

#### 4-1. Actions メニューを開く

1. ツールバーの **「Actions」** ボタンをクリック
   - または **Cmd/Ctrl + K** を押す
2. **「First Draft」** を選択
3. **「Library」** で **「Website」** を選択（推奨）

**結果:** First Draftのプロンプト入力画面が開きます

---

### Step 5: First Draft プロンプトを入力

#### 5-1. 包括的なプロンプトをコピー

以下のプロンプトを **全文コピー** して、First Draftのプロンプト入力欄にペースト：

```
Create a modern, sophisticated design system for MUED LMS v2 (Multi-User Educational Dashboard), an educational management system for students, teachers, and administrators.

PROJECT CONTEXT:
- Current screenshots show basic TailwindCSS default styles (prototype version)
- Goal: Maintain functional structure, completely redesign visual appearance
- Technology: Next.js 15.5.4, React 19, TailwindCSS 4
- Resolution: 1440x900 @2x (Retina)

DESIGN DIRECTION:
Inspired by world-class design systems like Stripe, Linear, Vercel, Notion, and Shadcn/UI.

PAGES TO DESIGN (5 main screens):
1. Dashboard Overview - 6 action cards in 3-column grid
2. Lessons Listing - filterable lesson cards with CTA buttons
3. Materials Library - downloadable materials with categories
4. Reservations - booking calendar and reservation list
5. Booking Calendar - calendar view with time slots

COLOR SYSTEM (Refined from current basic colors):
- Replace flat blue (#2563eb) with sophisticated gradient or refined primary color
- Replace basic gray (#4b5563) with elegant neutral palette (warm or cool grays)
- Replace basic green (#16a34a) with polished success color
- Replace basic purple (#9333ea) with refined accent for messaging
- Replace basic orange (#ea580c) with premium warning/upgrade color
- Add gradient support, accent colors, semantic colors (success/warning/error/info)
- Create 15-20 color palette with proper elevation hierarchy

TYPOGRAPHY (Refined from current small headings):
- Display/Hero: 48-64px (landing pages)
- H1: 32-40px (page titles)
- H2-H6: hierarchical sizes (20-28px)
- Body: Large (18-20px), Regular (16px), Small (14px), Caption (12px)
- Line heights: 1.2-1.7 for readability
- Font weights: Light(300) to Extrabold(800)
- Font family: Modern stack supporting English and Japanese

SPACING (Refined from current tight layout):
- More breathing room with 8px-based spacing system
- Generous padding for cards (24-32px instead of 16px)
- Visual hierarchy through whitespace
- Variable spacing based on content importance

SHADOWS & BORDERS (Refined from flat appearance):
- Multi-layered shadows for elevation (not just "0 1px 3px")
- Refined border radius: 12-16px (instead of 8px)
- Hover state: enhanced shadows + subtle lift effect
- Pressed/focused states with accessibility considerations

COMPONENTS TO CREATE:

1. BUTTON (7 variants × 6 states × 3 sizes):
   - Variants: Primary, Secondary, Success, Warning, Danger, Ghost, Link
   - States: Default, Hover, Pressed, Focused, Disabled, Loading
   - Sizes: Small (32px), Medium (40px), Large (48px)
   - Support gradients, icons, micro-interactions

2. CARD (5 functional variants + interaction states):
   - Lesson Booking Card (primary/blue theme)
   - My Lessons Card (neutral/gray theme)
   - Materials Card (success/green theme)
   - Messaging Card (accent/purple theme)
   - Subscription Card (warning/orange theme)
   - Features: multi-layered shadows, hover lift effect, accent color integration, optional icon/illustration area, badges/tags support

3. INPUT FIELDS:
   - Text, Password, Search, Textarea
   - Error, Success, Focused states
   - Label, Helper text, Error message layouts

4. BADGES/TAGS:
   - Category-based color coding
   - Small, Medium sizes
   - Filled and Outlined variants

5. OTHER COMPONENTS (as needed):
   - Modal/Dialog
   - Dropdown/Select
   - Tabs/Navigation
   - Date Picker (for booking calendar)

LAYOUT STRUCTURE (Maintain from screenshots):
✅ Dashboard: 6 cards in 3-column grid
✅ Lessons: Filter bar + lesson cards grid
✅ Materials: Category sidebar + materials grid
✅ Reservations: Upcoming reservations list + history
✅ Booking Calendar: Calendar view + time slot selection

RESPONSIVE BREAKPOINTS:
- Desktop: 1440px (3-column grid)
- Tablet: 768px (2-column grid)
- Mobile: 375px (1-column grid)

WHAT TO MAINTAIN:
✅ Page structure (5 main screens)
✅ Element placement (6 cards, filters, CTAs)
✅ Functional requirements (booking, materials, messaging)

WHAT TO COMPLETELY REDESIGN:
🎨 All colors (add gradients, accent colors)
🎨 All font sizes, weights, line heights
🎨 All spacing, padding, margins
🎨 All shadows, border radius, borders
🎨 All hover, focus, active states

EXPECTED OUTPUT:
A world-class LMS design system with:
- 15-20 refined color styles (including gradients)
- 8-12 hierarchical text styles
- Modern, sophisticated button components (126 variations)
- Elegant card components with rich interactions
- Complete design tokens (colors, typography, spacing, shadows)
- Responsive layouts for Desktop/Tablet/Mobile

Please create a sophisticated, modern design that significantly elevates the visual appearance while maintaining the functional structure of the current prototype.
```

#### 5-2. Make it を実行

1. プロンプトをペーストしたら、**「Make it」** ボタンをクリック
2. Figma AIが数分間でデザインを生成します
3. 生成されたデザインのテーマプレビューが表示されます

**結果:** 最初のデザイン案が生成されます

---

### Step 6: テーマとスタイルを調整

#### 6-1. テーマプレビューから選択

1. プロンプト下部の **サムネイル** をクリックして、異なるテーマを比較
2. 気に入ったテーマを選択

#### 6-2. Style Controls で微調整

**右サイドバーの Style Controls** で以下を調整：

1. **Light/Dark Mode**: ライト/ダークモード切り替え
2. **Color Palette**: カラーパレットの微調整
3. **Border Radius**: 角丸の調整（推奨: 12-16px）
4. **Spacing**: スペーシングの調整（推奨: 大きめに）
5. **Typography**: フォントスタイルの切り替え

---

### Step 7: Make Changes で反復改善

#### 7-1. デザインを改善

**「Make changes」** ボタンをクリックして、以下のような追加プロンプトで改善：

**【改善プロンプト例 1: カラーグラデーション】**
```
Add subtle gradients to the primary buttons (lesson booking, materials, messaging).
Make the gradients sophisticated like Stripe's design system.
Adjust the gradient direction from top-left to bottom-right.
```

**【改善プロンプト例 2: カードシャドウ】**
```
Enhance the card shadows with multi-layered elevation.
Add a hover state that lifts the card with stronger shadow.
Make the shadow colors match the card's accent color (e.g., blue shadow for lesson card).
```

**【改善プロンプト例 3: タイポグラフィ階層】**
```
Increase the heading sizes:
- H1 page titles to 36px
- H2 section headings to 24px
- Add more letter-spacing to headings for a premium feel
```

**【改善プロンプト例 4: スペーシング】**
```
Increase card padding from 16px to 28px for more breathing room.
Add more vertical spacing between cards (32px instead of 24px).
```

**【改善プロンプト例 5: ボタンバリエーション】**
```
Create a complete button system with:
- Primary button with gradient
- Secondary button with outline style
- Ghost button with transparent background
- All buttons with 3 sizes: small (32px), medium (40px), large (48px)
- Add hover states with subtle lift effect
```

**【改善プロンプト例 6: ダークモード】**
```
Create a dark mode version of the entire design system.
Use sophisticated dark grays (not pure black).
Maintain proper contrast ratios for accessibility.
Adjust shadows for dark mode (lighter shadows).
```

#### 7-2. 反復的に改善

1. **「Make changes」** で上記のプロンプトを1つずつ実行
2. 各変更を確認
3. 満足できるまで繰り返す

**Tips:**
- 一度に大きな変更を加えすぎない
- 各改善ステップを確認しながら進める
- **Cmd/Ctrl + D** でフレームを複製して比較する

---

## 🎨 Part 2: デザイントークンとコンポーネントの整理

**ここからの作業目的:** First Draftで生成されたデザインを、再利用可能な「デザインシステム」として整理します。

---

### Step 8: カラースタイルを作成（色の統一管理）

**目的:** 生成されたデザインから主要な色を抽出し、「カラースタイル」として登録することで、プロジェクト全体で色を統一管理できるようにします。

#### 8-1. カラースタイルの作り方

**例: ボタンの青色をカラースタイルにする**

1. First Draftで生成されたボタン（青色）をクリックして選択
2. 右サイドバーを下にスクロールして **「塗り」** セクションを見つける
3. 「塗り」の右側にある **「⚙️」（4つの点アイコン）** をクリック
4. メニューから **「スタイルを作成」** を選択
5. スタイル名を入力：
   ```
   Primary/Blue
   ```
6. Enter キーで確定

**別の方法:**

1. 「塗り」セクションでカラー名（例: `Natural/Text/Primary`）の部分をクリック
2. カラーピッカーが開く
3. カラーピッカー右上の **「⋮」（縦3点メニュー）** をクリック
4. **「スタイルを作成」** を選択

#### 8-2. すべての主要カラーでスタイルを作成

以下の色について、同じ手順でカラースタイルを作成してください：

**作成すべきカラースタイル（15-20色）:**

| カテゴリ | スタイル名 | 使用箇所 |
|---------|-----------|---------|
| **Primary（主要色）** | Primary/Blue | レッスン予約ボタン |
| | Primary/Gray | マイレッスンボタン |
| | Primary/Green | 教材閲覧ボタン |
| | Primary/Purple | メッセージボタン |
| | Primary/Orange | サブスクリプションボタン |
| **Neutral（中立色）** | Neutral/Background | ページ背景 |
| | Neutral/Card | カード背景 |
| | Neutral/Border | ボーダー線 |
| | Neutral/Text/Primary | メインテキスト |
| | Neutral/Text/Secondary | サブテキスト |
| **Semantic（意味のある色）** | Success/Green | 成功メッセージ |
| | Warning/Yellow | 警告メッセージ |
| | Error/Red | エラーメッセージ |
| | Info/Blue | 情報メッセージ |

**Tips:**
- 生成されたデザインを見ながら、実際に使われている色を登録
- スラッシュ（/）で階層化すると管理しやすい（例: `Primary/Blue`）

---

### Step 9: テキストスタイルを作成（文字の統一管理）

**目的:** 見出しや本文のフォント設定を「テキストスタイル」として登録し、デザイン全体で文字スタイルを統一します。

#### 9-1. テキストスタイルの作り方

**例: H1見出しをテキストスタイルにする**

1. First Draftで生成されたページタイトル（大きな見出し）をクリック
2. 右サイドバーの **「タイポグラフィ」** セクションを確認
3. 右上の **「⚙️」（4つの点アイコン）** をクリック
4. メニューから **「スタイルを作成」** を選択
5. スタイル名を入力：
   ```
   Heading/H1
   ```
6. Enter キーで確定

**別の方法（もっと簡単）:**

1. テキストを選択した状態で
2. 右サイドバーの **「タイポグラフィ」** セクションの右上
3. **「⋮」（縦3点メニュー）** または **「+」アイコン** をクリック
4. **「スタイルを作成」** を選択

#### 9-2. すべての主要テキストでスタイルを作成

**作成すべきテキストスタイル（8-12種類）:**

| スタイル名 | サイズ目安 | 使用箇所 |
|-----------|-----------|---------|
| Display/Hero | 48-64px | ランディングページのヒーロー見出し |
| Heading/H1 | 32-40px | ページタイトル |
| Heading/H2 | 24-28px | セクション見出し |
| Heading/H3 | 20-24px | サブセクション見出し |
| Body/Large | 18-20px | 強調テキスト |
| Body/Regular | 16px | 本文 |
| Body/Small | 14px | 補助テキスト |
| Caption | 12px | キャプション |

---

### Step 10: ボタンをコンポーネント化（再利用可能に）

**目的:** ボタンを「コンポーネント」として登録し、デザイン全体で使い回せるようにします。さらに「バリアント」機能で、色・サイズ・状態の違いを管理します。

#### 10-1. まず1つのボタンをコンポーネント化

1. First Draftで生成された青いボタン（Primary）を選択
2. 右クリック → **「コンポーネントを作成」** を選択
3. または **Cmd/Ctrl + Option + K** を押す
4. 左サイドバーのレイヤー名が **「紫のダイヤアイコン」** に変わればOK

**結果:** これが「メインコンポーネント」になりました。

#### 10-2. 他のボタンバリエーションも作成

**必要なボタンバリエーション:**

**色バリエーション（7種類）:**
1. Primary（青）- レッスン予約用
2. Secondary（グレー）- マイレッスン用
3. Success（緑）- 教材閲覧用
4. Warning（紫）- メッセージ用
5. Danger（オレンジ）- サブスクリプション用
6. Ghost（透明背景）- セカンダリアクション用
7. Link（テキストのみ）- リンク用

**サイズバリエーション（3種類）:**
- Small（高さ32px）
- Medium（高さ40px）- デフォルト
- Large（高さ48px）

**状態バリエーション（各色・サイズごとに必要）:**
- Default（通常）
- Hover（マウスオーバー）
- Pressed（押下中）
- Focused（フォーカス中）
- Disabled（無効）
- Loading（読み込み中）

**やり方:**

1. 元のボタンを **Cmd/Ctrl + D** で複製
2. 色を変更（例: グレーに）
3. これもコンポーネント化（Cmd/Ctrl + Option + K）
4. 7色 × 3サイズ = 21パターンのボタンを作成

#### 10-3. バリアントにまとめる

**すべてのボタンバリエーションを1つのコンポーネントにまとめます:**

1. すべてのボタンコンポーネント（21個）を選択
2. 右クリック → **「バリアントにまとめる」** を選択
3. 紫の点線で囲まれた「バリアントグループ」が作成されます

#### 10-4. プロパティを設定

右サイドバーの **「バリアント」** セクションで以下を設定：

1. **「プロパティを追加」** をクリック
2. プロパティ名: `Variant`
   - 値: Primary, Secondary, Success, Warning, Danger, Ghost, Link
3. **「プロパティを追加」** をクリック
4. プロパティ名: `Size`
   - 値: Small, Medium, Large
5. **「プロパティを追加」** をクリック
6. プロパティ名: `State`
   - 値: Default, Hover, Pressed, Focused, Disabled, Loading

**結果:** 7色 × 3サイズ × 6状態 = 126パターンのボタンコンポーネントが1つにまとまりました！

---

### Step 11: カードをコンポーネント化

**目的:** ダッシュボードの6枚のカードも同様にコンポーネント化します。

**⚠️ 注意:** First Draftで生成されたカードが画像として配置されている場合、そのままではコンポーネント化できません。以下の手順で再構築が必要です。

#### 11-1. First Draft生成物の確認

1. カード部分をクリックして選択
2. 左サイドバーのレイヤーツリーを確認
3. 以下のどちらかのパターンになっているはず：
   - **パターンA**: 画像として配置（`Image` レイヤー）→ **再構築が必要**
   - **パターンB**: フレーム + 要素の組み合わせ（`Frame` + テキスト + ボタン等）→ **そのままコンポーネント化可能**

#### 11-2. 画像の場合：カードを再構築する

**現状のスクリーンショットのように、カード全体が画像になっている場合:**

1. **新しいフレームを作成**
   - **F** キーを押す
   - キャンバス上でドラッグして、カードサイズのフレームを作成（例: 400px × 300px）
   - フレーム名: `Card - Lesson`

2. **カード内の要素を作成**
   - **背景**:
     - **R** キーで長方形を作成
     - フレーム全体に広げる
     - 塗り: 白（#FFFFFF）
     - 角丸: 12-16px
     - シャドウ: 複数レイヤー（「エフェクト」→「ドロップシャドウ」）

   - **画像領域**（オプション）:
     - **R** キーで長方形を作成
     - サイズ: 400px × 180px
     - 上部に配置
     - 塗り: グレー（#E5E7EB）またはプレースホルダー画像
     - 角丸: 上側のみ 12-16px

   - **タイトル**:
     - **T** キーでテキストを作成
     - テキスト: 「My Courses」
     - スタイル: Heading/H3 を適用（作成済みの場合）
     - または: 24px, Semibold

   - **説明文**:
     - **T** キーでテキストを作成
     - テキスト: 「View and manage your enrolled courses」
     - スタイル: Body/Regular を適用

   - **ボタン**:
     - 既に作成したButtonコンポーネントのインスタンスを配置
     - または一時的に長方形 + テキストで作成

3. **すべての要素を選択してフレーム内に配置**
   - すべての要素を選択（Cmd/Ctrl + A）
   - 右クリック → **「フレームで選択範囲を囲む」**
   - または **Cmd/Ctrl + Option + G**

4. **これでフレームができたので、コンポーネント化**
   - フレームを選択
   - 右クリック → **「コンポーネントを作成」**
   - または **Cmd/Ctrl + Option + K**

#### 11-3. フレーム構造の場合：そのままコンポーネント化

**First Draftでフレームとしてカードが生成されている場合:**

1. カード全体のフレームを選択
2. 右クリック → **「コンポーネントを作成」**
3. または **Cmd/Ctrl + Option + K**
4. 左サイドバーのレイヤー名が **「紫のダイヤアイコン」** に変われば成功

#### 11-4. 簡易版：画像カードをそのまま使う場合

**時間がない場合や、まずは動作確認したい場合:**

First Draftで生成されたカード画像を、以下のように扱います：

1. **カード画像をフレームで囲む**
   - カード画像（例: My Courses）を選択
   - 右クリック → **「フレームで選択範囲を囲む」**
   - または **Cmd/Ctrl + Option + G**
   - フレーム名: `Card - My Courses`

2. **このフレームをコンポーネント化**
   - フレームを選択
   - 右クリック → **「コンポーネントを作成」**
   - **Cmd/Ctrl + Option + K**

3. **6枚のカードすべてで繰り返す**

**制限事項:**
- ⚠️ テキストや色の編集ができない（画像のため）
- ⚠️ レスポンシブ対応が難しい
- ⚠️ 開発時に再現が困難

**推奨:** 後ほど時間を取って、11-2の手順で再構築することをおすすめします。

---

#### 11-5. 5種類のカードバリアントを作成（再構築した場合）

**必要なカードバリエーション（5種類）:**

1. **My Courses Card**（青系）- コース一覧
2. **Assignments Card**（グレー系）- 課題管理
3. **Grades Card**（紫系）- 成績確認
4. **Materials Card**（緑系）- 教材閲覧
5. **Calendar Card**（オレンジ系）- カレンダー

**色の違いを付ける:**

各カードで、以下の要素に色を適用：
- ボタンの色（Primary/Blue, Primary/Gray等）
- カード左側のアクセントバー（オプション）
- アイコンの色（オプション）

**状態バリエーション（各カード共通）:**
- Default（通常）
- Hover（マウスオーバー時、シャドウ強調、微妙に上昇）
- Pressed（押下中、シャドウ減少）

#### 11-6. バリアントにまとめる（再構築した場合）

1. 5種類のカードコンポーネントを選択
2. 右クリック → **「バリアントにまとめる」**
3. 紫の点線で囲まれた「バリアントグループ」が作成される
4. プロパティ設定：
   - **プロパティを追加** → `Type`
     - 値: MyCourses, Assignments, Grades, Materials, Calendar
   - **プロパティを追加** → `State`
     - 値: Default, Hover, Pressed

**結果:** 5種類 × 3状態 = 15パターンのカードコンポーネントが完成！

---

### Step 12: オートレイアウトを設定（自動調整機能）

**目的:** コンポーネント内の要素を「オートレイアウト」で配置すると、テキストの長さが変わっても自動的にサイズ調整されます。

#### 12-1. ボタンにオートレイアウトを適用

**なぜ必要？** → ボタンのテキストが「予約する」から「レッスンを予約する」に変わっても、自動的に幅が広がるようにするため。

1. ボタンコンポーネント（Primaryのデフォルト）を選択
2. **Shift + A** を押す（オートレイアウトを追加）
3. 右サイドバーの **「オートレイアウト」** セクションで設定：
   - **方向**: 横方向（→）
   - **アイテム間のスペース**: 8px（アイコンとテキストの間隔）
   - **パディング**:
     - 横（左右）: 16-24px
     - 縦（上下）: 8-12px
   - **幅のサイズ変更**: 内容に合わせる
   - **高さのサイズ変更**: 内容に合わせる

**結果:** ボタンのテキストを変更すると、自動的にボタン幅が調整されます！

#### 12-2. カードにオートレイアウトを適用

**なぜ必要？** → カード内の説明文が長くなっても、自動的にカードの高さが調整されるようにするため。

1. カードコンポーネントを選択
2. **Shift + A** を押す
3. 設定：
   - **方向**: 縦方向（↓）
   - **アイテム間のスペース**: 16-20px（タイトルと説明文の間隔）
   - **パディング**: 24-32px（カード内側の余白）
   - **幅のサイズ変更**: 固定（400px程度）
   - **高さのサイズ変更**: 内容に合わせる

**結果:** 説明文が増えても、カードが自動的に伸びます！

---

### Step 13: レスポンシブレイアウトを作成（オプション）

**目的:** デスクトップ・タブレット・モバイルの3種類のレイアウトを作成します。

#### 13-1. デスクトップレイアウト（1440px）

1. **F** キーを押してフレームツールを起動
2. キャンバス上でクリック
3. 右サイドバーでサイズ設定：
   - **幅**: 1440px
   - **高さ**: 900px
4. フレーム名: `Desktop - Dashboard`
5. First Draftで生成されたカードを6枚配置
6. 3カラムグリッド（2行×3列）に配置
7. カード間隔: 24-32px

#### 13-2. タブレットレイアウト（768px）

1. デスクトップフレームを **Cmd/Ctrl + D** で複製
2. フレーム名: `Tablet - Dashboard`
3. サイズ変更：
   - **幅**: 768px
   - **高さ**: 1024px
4. カードを2カラムグリッド（3行×2列）に再配置
5. カード間隔: 20px

#### 13-3. モバイルレイアウト（375px）

1. タブレットフレームを **Cmd/Ctrl + D** で複製
2. フレーム名: `Mobile - Dashboard`
3. サイズ変更：
   - **幅**: 375px
   - **高さ**: 812px
4. カードを1カラムグリッド（6行×1列）に再配置
5. カード間隔: 16px

---

## 🎯 完了確認チェックリスト

### Design Tokens

- [ ] **Color Styles**: 15-20色（Primary, Neutral, Semantic, Accent）
- [ ] **Text Styles**: 8-12種類（Display, Headings, Body, Caption）
- [ ] **Shadow Styles**: 複数レベルのエレベーション
- [ ] **Border Radius**: コンポーネント別の設定

### Components

- [ ] **Button**: 7 variants × 6 states × 3 sizes
- [ ] **Card**: 5 functional variants + interaction states
- [ ] **Input**: Text, Password, Search, Error states
- [ ] **Badge**: カテゴリー別の色分け

### Screens

- [ ] **Desktop**: 5画面（Dashboard, Lessons, Materials, Reservations, Booking）
- [ ] **Tablet**: 5画面（2カラムグリッド）
- [ ] **Mobile**: 5画面（1カラムグリッド）

### Interaction States

- [ ] Hover states（シャドウ強調、上昇効果）
- [ ] Pressed states
- [ ] Focused states（アクセシビリティ）
- [ ] Disabled states

---

## 💡 便利なショートカット

### 基本操作
```
Cmd/Ctrl + K          Actions メニューを開く
F                     Frame tool
T                     Text tool
R                     Rectangle
Cmd/Ctrl + D          Duplicate
Cmd/Ctrl + G          Group
Cmd/Ctrl + Shift + K  画像を配置
```

### レイヤー操作
```
Cmd/Ctrl + ]          前面へ
Cmd/Ctrl + [          背面へ
Cmd/Ctrl + Shift + ]  最前面へ
Cmd/Ctrl + Shift + [  最背面へ
```

### Auto Layout
```
Shift + A             Auto Layout を追加
Cmd/Ctrl + Option + P  Padding を調整
```

### Components
```
Cmd/Ctrl + Option + K  Create component
Cmd/Ctrl + Option + B  Combine as variants
```

---

## 🔧 トラブルシューティング

### Q: First Draft が表示されない
**A:** 有料プラン（Full seat）が必要です。プランを確認してください。
ブラウザをリロード（Cmd/Ctrl + R）してみてください。

### Q: "Make changes" でデザインが壊れる
**A:** 変更範囲を小さくしてください。一度に大きな変更を加えると崩れる可能性があります。
Cmd/Ctrl + Z でやり直すか、以前のバージョンをDuplicateしておきましょう。

### Q: 画像がぼやける
**A:** 画像を選択 → 右サイドバー → 「2x」に設定

### Q: 日本語が表示されない
**A:** テキストを選択 → Font を「Noto Sans JP」または「Hiragino Sans」に変更

### Q: カラースタイルが適用されない
**A:** 手動で作成する場合:
1. 任意の図形を選択
2. Fill に色を設定（例: #2563eb）
3. Fill の右側の「⚫︎」アイコンをクリック
4. 「＋」ボタン → 「Create style」
5. 名前を入力（例: Primary/Blue）

### Q: Component Variants が作成できない
**A:**
1. 複数のコンポーネントを選択
2. すべて同じ基本構造である必要があります
3. 右クリック → 「Combine as variants」
4. Properties パネルで設定

---

## 🎨 期待される成果物

このガイドを完了すると、**現状のプロトタイプを大幅に改善した**デザインシステムが得られます：

```
📁 MUED LMS v2 - Design System (Refined)
  ├── 🎨 Design Tokens
  │   ├── Color Styles（15-20色、グラデーション含む）
  │   ├── Text Styles（8-12種類、階層的）
  │   ├── Shadow Styles（複数レベル）
  │   └── Border Radius（コンポーネント別）
  ├── 🧩 Components
  │   ├── Button（7 variants × 6 states × 3 sizes = 126）
  │   ├── Card（5 functional variants + states）
  │   ├── Input（複数バリエーション）
  │   ├── Badge（カテゴリー別）
  │   └── その他（Modal, Dropdown等）
  ├── 💻 Desktop Screens（5画面、3カラム）
  ├── 📱 Tablet Screens（5画面、2カラム）
  └── 📱 Mobile Screens（5画面、1カラム）
```

**重要:** First Draftが生成するデザインは、現状のスクリーンショットを**大幅に上回る洗練されたもの**になります。

---

## 🚀 次のステップ

### オプション A: 手動でコードに変換

1. **デザインを確認**
   - 各コンポーネントが正しく作成されているか確認
   - カラーとタイポグラフィが一貫しているか確認
   - レスポンシブレイアウトが適切か確認

2. **チームと共有**
   - 右上の **「Share」** ボタン
   - メールアドレスまたはリンクで共有

3. **開発に引き渡し**
   - Figma Dev Mode を有効化（右上のトグル）
   - コンポーネントの CSS/React コードを確認
   - Design Tokens を TailwindCSS Config に変換

4. **継続的な更新**
   - 新機能追加時にコンポーネントを追加
   - デザインシステムのバージョン管理
   - ユーザーフィードバックの収集

---

### オプション B: Figma MCP + Claude Code で自動コード生成 🔥

**より効率的な方法:** Figma MCPサーバーを使って、Claude Codeで直接コードを生成できます！

#### 前提条件

- ✅ Claude Code インストール済み
- ✅ Figma Desktop アプリ（最新版）
- ✅ Figma Dev seat または Full seat（Professional/Organization/Enterprise プラン）

---

#### セットアップ手順

**1. Figma Desktop でMCPサーバーを有効化**

1. Figma Desktop アプリを開く
2. 最新版にアップデート
3. デザインファイルを開く
4. **メニュー** → **「環境設定」（Preferences）**
5. **「Dev Mode MCP Server を有効化」** をONにする

**結果:** ローカルMCPサーバーが `http://127.0.0.1:3845/sse` で起動します

---

**2. Claude Code に Figma MCP を接続**

ターミナルで以下のコマンドを実行：

```bash
claude mcp add --transport sse figma-dev-mode-mcp-server http://127.0.0.1:3845/sse
```

**結果:** Claude Code が Figma に接続されます

---

**3. 接続を確認**

```bash
claude mcp list
```

**出力例:**
```
figma-dev-mode-mcp-server (connected)
```

---

#### 使い方

**方法1: 選択ベース（推奨）**

1. Figma Desktop で実装したいフレームを選択
2. Claude Code で以下のようにプロンプト：
   ```
   Figmaで選択中のカードコンポーネントを、
   Next.js + TailwindCSS でReactコンポーネントとして実装してください。

   要件:
   - shadcn/ui の Card コンポーネントをベースに
   - Figmaのカラー、スペーシング、タイポグラフィを正確に再現
   - レスポンシブ対応
   ```

**方法2: リンクベース**

1. Figma でフレームを右クリック → **「リンクをコピー」**
2. Claude Code でプロンプト：
   ```
   以下のFigmaデザインをコードに変換してください：
   https://www.figma.com/file/...

   Next.js 15 + TailwindCSS 4 で実装してください。
   ```

---

#### 実践例

**例1: ボタンコンポーネントの生成**

```
Figmaで選択中のPrimaryボタンを、
/components/ui/button.tsx として実装してください。

要件:
- 7つのvariant（Primary, Secondary, Success, Warning, Danger, Ghost, Link）
- 3つのサイズ（sm, md, lg）
- Hover、Pressed、Disabled状態をすべて実装
- FigmaのカラースタイルをTailwind Configに反映
```

**例2: カードコンポーネントの生成**

```
Figmaで選択中の「My Courses」カードを、
/components/features/course-card.tsx として実装してください。

要件:
- TypeScript + React 19
- オートレイアウト（Figmaのパディング・スペーシングを再現）
- シャドウ、角丸、ホバー効果を正確に再現
- アクセシビリティ対応（aria-label等）
```

**例3: デザイントークンの抽出**

```
Figmaのカラースタイルとテキストスタイルをすべて抽出して、
/tailwind.config.ts に反映してください。

形式:
- colors: Primary, Neutral, Semantic
- fontSize: Display, Heading, Body, Caption
- fontWeight: Light, Regular, Medium, Semibold, Bold
```

---

#### できること

✅ **フレーム→コード変換**: Figmaデザインを React/Next.js コンポーネントに自動変換
✅ **デザイントークン抽出**: カラー、タイポグラフィ、スペーシングをTailwind Configに
✅ **コンポーネント一貫性**: Code Connect でデザインシステムとコードを同期
✅ **レイアウト情報**: Auto Layout、制約、グリッドを正確に再現
✅ **変数・スタイル取得**: Figma Variables を CSS Variables や Tailwind Tokens に変換

---

#### 制限事項

⚠️ **ベータ版**: 現在オープンベータ中、バグが存在する可能性あり
⚠️ **プラン制限**: Dev seat または Full seat が必要（Professional/Organization/Enterprise）
⚠️ **複雑なデザイン**: 複数フレームにまたがる複雑なデザインは一度に変換困難
⚠️ **画像**: First Draft生成の画像ベースのカードは、テキスト情報が取得できない可能性

---

#### トラブルシューティング

**Q: `claude mcp list` で接続が表示されない**

**A:** 以下を確認：
1. Figma Desktop アプリが起動しているか
2. Figma の「環境設定」で MCP Server が有効化されているか
3. `http://127.0.0.1:3845/sse` にアクセスできるか（ブラウザで確認）
4. Claude Code を再起動

**Q: 「選択中のデザインが見つかりません」エラー**

**A:**
1. Figma Desktop でフレームを**確実に選択**してから Claude Code を実行
2. または、リンクベースの方法を使用（Figmaリンクをコピー）

**Q: 生成されたコードが期待と異なる**

**A:**
1. プロンプトをより具体的に（技術スタック、要件を明確に）
2. Figma側でコンポーネント化、バリアント設定が適切か確認
3. デザイントークン（カラースタイル、テキストスタイル）が登録されているか確認

---

#### おすすめワークフロー

1. **Figma でデザインシステムを完成させる**
   - カラースタイル、テキストスタイルをすべて登録
   - コンポーネント化、バリアント設定を完了
   - レスポンシブレイアウトを作成

2. **Claude Code でデザイントークンを抽出**
   ```
   FigmaのデザイントークンをすべてTailwind Configに変換してください
   ```

3. **コンポーネントを1つずつコード化**
   - まずButtonコンポーネント
   - 次にCardコンポーネント
   - 最後にページ全体

4. **デザインとコードを同期**
   - Figma でデザイン変更したら、Claude Code で再生成
   - Code Connect で一貫性を維持

---

**結論:** Figma MCP を使えば、手動でのコード変換作業が大幅に削減され、デザイン→コードのワークフローが劇的に効率化されます！

---

## 📖 参考リソース

- [Figma First Draft 公式ドキュメント](https://help.figma.com/hc/en-us/articles/23955143044247-Use-First-Draft-with-Figma-AI)
- [Figma AI Tools 公式ドキュメント](https://help.figma.com/hc/en-us/articles/23870272542231-Use-AI-tools-in-Figma-Design)
- [Stripe Design System](https://stripe.com/docs/design)
- [Linear Design System](https://linear.app/design)
- [Vercel Design System](https://vercel.com/design)
- [Shadcn/UI Components](https://ui.shadcn.com/)

---

**作成:** MUED LMS v2 Development Team
**更新:** 2025-10-04
**バージョン:** 2.0.0（First Draft対応版）
