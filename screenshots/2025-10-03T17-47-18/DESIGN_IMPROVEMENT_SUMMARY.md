# MUED LMS v2 - デザイン改善方針サマリー

📅 **更新日:** 2025-10-04
🎯 **目的:** Figma AIによるデザインの大幅改善

---

## 📌 基本方針

### ✅ 維持するもの（変更しない）

- **機能要件**: 予約、教材閲覧、メッセージ、プロフィール、サブスクリプション等
- **ページ構成**: Landing, Dashboard, Lessons, Materials, Reservations, Booking Calendar
- **レイアウト構造**: 6枚のダッシュボードカード、3カラムグリッド、フィルター、CTAボタン等
- **API連携**: Supabase, Clerk, Stripe等のバックエンド統合
- **Next.js構造**: App Router、ページルーティング、コンポーネント階層

### 🎨 刷新するもの（完全に変更OK）

- **カラーパレット**: TailwindデフォルトColor → 洗練されたグラデーション/アクセントカラー
- **タイポグラフィ**: 小さく単調 → 階層的で視認性の高いフォントシステム
- **スペーシング**: 詰まった配置 → 呼吸感のある余白設計
- **シャドウ・角丸**: フラット → 洗練されたエレベーション（奥行き）表現
- **インタラクション**: 静的 → マイクロインタラクション、ホバー、フォーカス状態
- **コンポーネント**: シンプル → リッチで洗練されたUI要素

---

## 🎨 改善の方向性

### 1. カラーパレット

**現状の課題:**
- 単色のTailwindデフォルトカラー（#2563eb, #4b5563等）
- ベタ塗りボタン
- グラデーションやアクセントカラーがない

**改善案:**
- 洗練されたブランドカラー（色相・彩度・明度の最適化）
- グラデーション対応
- Semantic Colors（Success, Warning, Error, Info）
- Accent Colors（ホバー、フォーカス用）
- 15-20色の体系的なパレット

**参考:** Stripe, Linear, Vercel

---

### 2. タイポグラフィ

**現状の課題:**
- H1が24pxと小さい
- ウェイトのバリエーションが少ない
- 行間（line-height）の考慮不足

**改善案:**
- Display/Hero: 48-64px（ランディングページ用）
- H1: 32-40px（ページタイトル）
- H2-H6: 階層的なサイズ設定
- Body/Large, Regular, Small, Caption, Overline
- 適切なline-height（1.2-1.7）
- letter-spacingの微調整
- Font Weights: Light(300) → Extrabold(800)

**参考:** Vercel, Stripe

---

### 3. スペーシング

**現状の課題:**
- 詰まった配置
- 画一的な余白

**改善案:**
- より呼吸感のある余白設計
- 8px単位のスペーシングシステム
- コンテンツに応じた可変スペーシング
- 視覚的な階層を強調する余白

**参考:** Notion, Linear

---

### 4. シャドウ・角丸・エレベーション

**現状の課題:**
- 単純なシャドウ: `0 1px 3px rgba(0,0,0,0.1)`
- 一律の角丸: 8px

**改善案:**
- 複数レイヤーのシャドウ（Elevation）
- 角丸: 12-16px（コンポーネントに応じて可変）
- ホバー時のシャドウ強調
- 微妙な上昇効果（transform）

**参考:** Stripe Dashboard, Material Design 3

---

### 5. コンポーネント設計

#### Button

**現状:** 単色ベタ塗り、シンプルなホバー

**改善案:**
- 7 variants: Primary, Secondary, Success, Warning, Danger, Ghost, Link
- 6 states: Default, Hover, Pressed, Focused, Disabled, Loading
- 3 sizes: Small(32px), Medium(40px), Large(48px)
- グラデーション対応
- アイコン配置サポート
- マイクロインタラクション

#### Card

**現状:** 白背景、グレーボーダー、フラットなシャドウ

**改善案:**
- 複数レイヤーのシャドウ
- ホバー時の上昇効果
- アクセントカラーの適用
- アイコン/イラスト領域
- バッジ/タグ対応

#### その他

- Input（複数バリエーション）
- Badge（カテゴリー別）
- Modal / Dialog
- Dropdown / Select
- Tabs / Navigation

---

## 📋 Figma AI への指示フロー

1. **プロンプト 0**: デザイン改善方針を明確に伝える
   - 機能維持、ビジュアル刷新の方針
   - 参考デザインシステム（Stripe, Linear, Vercel, Notion, Shadcn/UI）

2. **プロンプト 1**: プロジェクト初期化
   - プロジェクト情報の共有

3. **プロンプト 2**: カラーシステムの提案を求める
   - 現状の課題を明示
   - 改善案を提案させる

4. **プロンプト 3**: タイポグラフィシステムの提案を求める
   - 階層的なフォントシステム
   - 適切な行間・ウェイト

5. **プロンプト 4**: Cardコンポーネントの改善提案
   - シャドウ、インタラクション、バリエーション

6. **プロンプト 5**: Buttonコンポーネントの改善提案
   - サイズ、カラー、ステート、マイクロインタラクション

7. **プロンプト 6**: レスポンシブレイアウト
   - Desktop(1440px), Tablet(768px), Mobile(375px)

8. **プロンプト 7**: Auto Layout設定
   - コンポーネントの自動調整

---

## 🎯 期待される成果物

### Design Tokens

- **Color Palette**: 15-20色（グラデーション含む）
- **Typography**: 8-12種類の階層的なスタイル
- **Spacing**: 8px単位のシステム
- **Shadow**: 複数レベルのエレベーション
- **Border Radius**: コンポーネント別の角丸

### Components

- **Button**: 7 variants × 6 states × 3 sizes = 126パターン
- **Card**: 5 functional variants + interaction states
- **Input**: テキスト、パスワード、検索、エラー状態
- **Badge**: カテゴリー別の色分け
- **その他**: Modal, Dropdown, Tabs等（Figma AIが提案）

### Screens

- **Desktop**: 6画面（モダンレイアウト）
- **Tablet**: 6画面（2カラムグリッド）
- **Mobile**: 6画面（1カラムグリッド）

---

## 📚 参考デザインシステム

1. **Stripe**
   - 洗練されたグラデーション
   - 繊細なスペーシング
   - 高級感のあるカラーパレット

2. **Linear**
   - ミニマルで高級感のあるUI
   - シャープなタイポグラフィ
   - 洗練されたインタラクション

3. **Vercel**
   - モダンなタイポグラフィ
   - 明快な階層構造
   - 黒とアクセントカラーの対比

4. **Notion**
   - 使いやすさと美しさのバランス
   - 柔軟なコンポーネント設計
   - 親しみやすいインタラクション

5. **Shadcn/UI**
   - モダンなコンポーネントライブラリ
   - TailwindCSSとの親和性
   - アクセシビリティ対応

---

## ✅ 実装時の注意点

### Figma → Next.js/TailwindCSS への変換

1. **Color Styles** → Tailwind Config の `colors`
2. **Text Styles** → Tailwind Config の `fontSize`, `fontWeight`, `lineHeight`
3. **Spacing** → Tailwind Config の `spacing`
4. **Shadow** → Tailwind Config の `boxShadow`
5. **Border Radius** → Tailwind Config の `borderRadius`

### コンポーネント実装

- Shadcn/UIベースのコンポーネントを拡張
- Radix UIのアクセシビリティ機能を活用
- Figma Dev Modeでコード参照
- TailwindCSS Variantsで状態管理

### レスポンシブ対応

- `sm:`, `md:`, `lg:`, `xl:` ブレークポイントを活用
- モバイルファーストのアプローチ
- Grid/Flexboxの組み合わせ

---

## 🚀 次のステップ

1. **Figmaでデザイン生成**
   - `FIGMA_SETUP_GUIDE.md` に従ってFigma AIに指示
   - デザインシステムを自動生成

2. **デザインレビュー**
   - 開発チームとデザイン確認
   - フィードバック収集

3. **実装計画**
   - Tailwind Config更新
   - Shadcn/UIコンポーネントのカスタマイズ
   - 段階的な実装（Design Tokens → Components → Pages）

4. **継続的改善**
   - ユーザーフィードバックの収集
   - A/Bテスト
   - デザインシステムのバージョン管理

---

**作成:** MUED LMS v2 Development Team
**更新:** 2025-10-04
**バージョン:** 1.0.0
