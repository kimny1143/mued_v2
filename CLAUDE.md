# MUED LMS プロジェクト Claude Code ルール

基本は大事！！

## プロジェクト概要

- **プロジェクト名**: MUED LMS (音楽レッスン用学習管理システム)
- **開発会社**: glasswerks inc.（代表：木村）
- **主要機能**: 
  - 基本的なLMS機能（スケジューリング、ユーザーコミュニケーション、支払い管理、教材ナレッジ管理）
  - AIによる教材生成・パーソナライズされたメンターマッチング機能
- **ビジネスモデル**: フリーミアム・基本プラン・プレミアムプランの3つのサブスクリプションモデル
- **展開計画**: glasswerks自社展開レッスン事業の管理および、他社サービスへのパッケージ販売

## 技術スタック

### フロントエンド
- Next.js 14 + React 18 + TypeScript + TailwindCSS
- App Routerディレクトリ構造に準拠
- 状態管理: React Context API + SWR/React Query
- UIコンポーネント: Shadcn UIベース

### バックエンド・インフラ
- データベース: PostgreSQL (Supabase)
- ORM: Prisma
- リアルタイム機能: Supabase Realtime
- 認証: Supabase Auth → NextAuth.js (将来)
- 決済: Stripe
- AIサービス: Python/FastAPI (独立サービス)

### 開発環境
- パッケージマネージャー: npm
- ビルドツール: Next.js内蔵
- テスト: Vitest + React Testing Library + Playwright
- CI/CD: GitHub Actions + Vercel

## ディレクトリ構造

```
/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 認証関連ページ
│   │   └── login/            # ログインページ
│   ├── api/                  # API Routes
│   │   ├── billing-portal/   # 請求ポータル
│   │   ├── calendar/         # カレンダー同期
│   │   ├── checkout/         # 決済関連
│   │   ├── lesson-slots/     # レッスンスロット管理
│   │   ├── reservations/     # 予約管理
│   │   ├── subscription/     # サブスクリプション
│   │   └── webhooks/         # Webhook処理
│   ├── auth/                 # 認証コールバック
│   ├── checkout/             # チェックアウト成功ページ
│   ├── dashboard/            # ダッシュボード関連ページ
│   │   ├── booking-calendar/ # 予約カレンダー
│   │   ├── exercises/        # 練習記録
│   │   ├── materials/        # 教材管理
│   │   ├── messages/         # メッセージング
│   │   ├── reservations/     # 予約管理
│   │   └── slots-calendar/   # スロットカレンダー
│   ├── new-landing/          # ランディングページ
│   └── components/           # appディレクトリ内のコンポーネント
├── components/               # 共通コンポーネント
│   ├── ui/                   # Shadcn UIベースのコンポーネント
│   ├── chat/                 # チャットコンポーネント
│   └── dashboard/            # ダッシュボード共通コンポーネント
├── lib/                      # ユーティリティ関数
│   ├── client/               # クライアントサイド関数
│   ├── hooks/                # カスタムフック
│   │   ├── mutations/        # 更新系フック
│   │   └── queries/          # 取得系フック
│   └── types/                # TypeScript型定義
├── prisma/                   # Prismaスキーマと設定
│   ├── migrations/           # データベースマイグレーション
│   └── seed/                 # シードデータ
├── ai-service/               # Python AIサービス（独立）
│   ├── app/                  # FastAPIアプリケーション
│   ├── tests/                # Pytestテスト
│   └── openapi/              # OpenAPI仕様
├── scripts/                  # 管理・メンテナンススクリプト
├── tests/                    # テストファイル
│   ├── e2e/                  # E2Eテスト（Playwright）
│   ├── lib/                  # テストユーティリティ
│   └── load/                 # 負荷テスト
├── docs/                     # プロジェクトドキュメント
│   ├── rules/                # Cursorルール（元ファイル）
│   ├── architecture/         # アーキテクチャ文書
│   ├── booking/              # 予約システム仕様
│   └── stripe/               # Stripe連携ドキュメント
├── public/                   # 静的ファイル
│   └── materials/            # 教材用静的コンテンツ
└── types/                    # グローバル型定義
```

## コーディング規約

### TypeScript/React

1. **命名規則**
   - 変数・関数: キャメルケース（例: `fetchUserData`, `userList`）
   - クラス・型・インターフェース: パスカルケース（例: `User`, `OrderItem`）
   - ファイル名:
     - コンポーネント: パスカルケース（例: `UserCard.tsx`）
     - ユーティリティ: キャメルケース（例: `formatDate.ts`）
     - App Router: 規定のファイル名（`page.tsx`, `layout.tsx`）

2. **型定義**
   - 明示的な型記述を優先（`any`の使用は最小限に）
   - 共通モデル型はインターフェースで定義
   - ユーティリティ型は型エイリアスを使用

3. **コンポーネント**
   - 関数コンポーネントを使用
   - 必要に応じて`useMemo`、`useCallback`、`React.memo`でメモ化
   - 再利用可能なロジックはカスタムフックとして抽出

### CSS/スタイリング

- TailwindCSSを優先的に使用
- cn関数による条件付きクラス結合
- 8pxグリッドシステムを採用
- ダークモード対応（`dark:`バリアント使用）

### Python (AIサービス)

- PEP8準拠
- 変数・関数: スネークケース
- クラス: パスカルケース
- 型ヒントの積極的な使用

## セキュリティポリシー

1. **認証・認可**
   - Supabase Auth（現在）→ NextAuth.js（将来）
   - JWTベースのセッション管理
   - RBAC（Role-Based Access Control）実装

2. **データ保護**
   - 入力検証: Zod/Yupでクライアント・サーバー両方で検証
   - SQLインジェクション対策: Prismaの使用
   - XSS対策: 適切なエスケープ処理

3. **API保護**
   - CSRF対策
   - レート制限
   - 環境変数での機密情報管理

## UI/UXガイドライン

1. **デザイン原則**
   - シンプル性と一貫性を重視
   - レスポンシブデザイン対応
   - アクセシビリティ: WCAG 2.1 AA準拠

2. **タイポグラフィ**
   - 7段階のテキストサイズスケール使用
   - フォントレンダリング最適化設定を適用

3. **コンポーネント設計**
   - 小(sm)、中(md)、大(lg)の3サイズバリエーション
   - 8pxグリッドシステムでのスペーシング

## テスト戦略

- **ユニット/統合テスト**: Vitest + React Testing Library
- **E2Eテスト**: Playwright（@coreタグ付きクリティカルパスのみ）
- **カバレッジ目標**: 80%以上
- **実行時間目標**: CI全体で8-10分以内

## 開発ワークフロー

1. **タスク管理**
   - TodoWrite/TodoReadツールを使用してタスク管理
   - 複雑なタスクは小さなステップに分解

2. **コード変更時**
   - 既存のコーディング規約に従う
   - 必要に応じてlint/typecheckを実行
   - テストが存在する場合は実行

3. **環境変数**
   - `.env.local`: ローカル開発用（Gitにコミットしない）
   - `.env`: プレースホルダー値（Gitにコミット）
   - `NEXT_PUBLIC_`プレフィックス: クライアントサイド公開可能

4. **Git使用時**
   - コミットメッセージは明確で簡潔に
   - 開発サーバーの再起動が必要な場合は明示

## 重要な注意事項

1. **開発サーバー**
   - 自動起動は行わない
   - 必要な場合のみユーザーに再起動を促す

2. **ファイル作成**
   - 既存ファイルの編集を優先
   - 新規ファイルは必要最小限に

3. **ドキュメント**
   - READMEやドキュメントファイルは明示的に要求された場合のみ作成

4. **外部サービス連携**
   - Supabase: リアルタイム機能、認証、データベース
   - Stripe: 決済処理
   - Cloudinary: 画像管理
   - YouTube: 動画埋め込み

## プロジェクト固有の実装パターン

1. **予約システム**
   - レッスンスロット管理
   - 承認フロー（メンター承認 → 学生支払い）
   - キャンセル・リスケジュール機能

2. **支払いフロー**
   - Stripe Checkoutセッション
   - サブスクリプション管理
   - Webhook処理

3. **リアルタイム機能**
   - Supabase Realtimeでのメッセージング
   - 予約ステータス更新通知

## 開発時の確認事項

実装前に以下を確認：
1. 既存のコンポーネントや関数との重複がないか
2. プロジェクトの命名規則との一貫性
3. 型の安全性の確保
4. セキュリティ上の懸念点
5. エラー処理の適切性
6. パフォーマンスへの影響

---

*このドキュメントは継続的に更新されます。新機能追加や構成変更時は必ず更新してください。*