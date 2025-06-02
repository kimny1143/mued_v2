---
description: 
globs: 
alwaysApply: true
---
---
description: セキュリティとUI/UXポリシー
globs: 
alwaysApply: True
priority: 4
---
まず、このファイルを参照したら、「セキュリティUX！！」と叫んでください。

# セキュリティとUI/UXポリシー

## このファイルの重要ポイント
- セキュリティ: Supabase Auth（MVP）→ NextAuth.js認証 + RBAC + CSRF トークン（Phase1 移行後）
- 入力検証: Zod/Yupでクライアント・サーバー両方で検証
- UI: 7段階のテキストサイズスケール、8pxグリッドシステム
- アクセシビリティ: WCAG 2.1 AAレベル準拠

この文書は、MUED LMS プロジェクトにおけるセキュリティとUI/UXの実装に関する具体的なガイドラインとスタイルルールを定義しています。

---

## セキュリティポリシー

### 1. 認証・認可

#### 1.1 ユーザー認証

- **NextAuth.js** - 認証フレームワークとしてNextAuth.jsを使用
- **多要素認証** - 将来的に二要素認証をサポート
- **パスワード要件** - 最低8文字、数字・大文字・小文字・特殊文字を含む
- **セッション管理** - JWTベースのセッション、適切な有効期限設定

```typescript
// 認証設定例
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      // 認証ロジック
    }),
    // その他のプロバイダー
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },
  callbacks: {
    // カスタムコールバック
  }
};

export default NextAuth(authOptions);
```

#### 1.2 認可 (RBAC)

- **ロール定義** - Student, Mentor, Admin の3つの基本ロール
- **権限チェック** - ミドルウェアまたはHOCでルートごとの権限チェック
- **UI適応** - ユーザーロールに基づいたUI要素の表示/非表示

```typescript
// ミドルウェアでの権限チェック例
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // 保護されたルートへのアクセスをチェック
  if (req.nextUrl.pathname.startsWith('/admin') && token?.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  
  return NextResponse.next();
}
```

### 2. データ保護

#### 2.1 入力検証

- **クライアント側** - Formik/React Hook Form + Zodでフォーム検証
- **サーバー側** - API Routes内での再検証
- **SQLインジェクション対策** - Prismaの使用とパラメータ化クエリ

```typescript
// 入力検証例
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
});

// API Routeでの使用
export async function POST(req: Request) {
  const data = await req.json();
  const result = UserSchema.safeParse(data);
  
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  
  // 処理を続行
}
```

#### 2.2 API保護

- **CSRF対策** - CSRFトークンの使用
- **レート制限** - 重要なエンドポイントにはレート制限を実装
- **APIキー** - 外部APIアクセス用のAPIキーは環境変数で管理

#### 2.3 機密データ

- **暗号化** - ユーザーパスワードはbcryptでハッシュ化
- **最小権限** - 必要最小限のデータのみをクライアントに返す
- **PII (個人識別情報)** - 適切に保護し、不要なPIIは収集しない

### 3. フロントエンドセキュリティ

#### 3.1 XSS対策

- **エスケープ処理** - ユーザー入力データの表示時は適切にエスケープ
- **CSP** - Content-Security-Policyヘッダーの設定
- **サニタイズ** - ユーザー生成コンテンツのサニタイズ

#### 3.2 その他のヘッダー

- **HTTPS強制** - Strict-Transport-Securityヘッダー
- **クリックジャッキング対策** - X-Frame-Optionsヘッダー
- **MIME Sniffing対策** - X-Content-Type-Optionsヘッダー

```typescript
// next.config.js でのヘッダー設定例
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 4. AIマイクロサービスのセキュリティ

- **認証トークン** - Next.jsフロントエンドとPythonバックエンド間の通信には認証トークンを使用
- **IP制限** - 本番環境では特定のIPからのアクセスのみを許可
- **データ漏洩防止** - 学習データに個人情報が含まれないよう注意
- **入力サニタイズ** - AIモデルへの入力データの適切なサニタイズ
- **出力制限** - AIモデルからの出力を適切にフィルタリング

---

## UI/UXデザインポリシー

### 1. デザイン哲学

- **シンプル性**: 視覚的ノイズを最小限に抑え、コンテンツに集中できるUIを提供する
- **一貫性**: 同様の要素は常に同じ見た目と振る舞いを維持する
- **階層性**: 視覚的階層を通じて情報の重要度を明確に伝える
- **レスポンシブ**: 様々な画面サイズやデバイスで最適な表示を実現する

### 2. タイポグラフィ

文書で定義された7段階のテキストサイズスケールを使用する:
- `text-xxs` (10.4px)
- `text-xs` (12px)
- `text-sm` (14px)
- `text-base` (16px)
- `text-md` (16.8px)
- `text-lg` (18px)
- `text-xl` (20px)

フォントレンダリングの最適化設定を必ず適用:
```css
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
font-feature-settings: "palt"; /* 日本語プロポーショナルメトリクス */
```

### 3. レイアウトとスペーシング

- ベースを8pxとするグリッドシステムを採用
- スペーシングは0.5単位 (2px) で段階的に設定
- 区切り線は可能な限り避け、必要な場合は透明度0.05-0.1の範囲で設定

```tsx
// スペーシングの例
<div className="p-4 mb-6">
  <h2 className="mb-2">タイトル</h2>
  <p className="mb-4">コンテンツ</p>
</div>
```

### 4. コンポーネント設計

#### 4.1 標準化されたサイズ体系

すべてのコンポーネントは、小(sm)、中(md)、大(lg)の3つのサイズバリエーションに対応させる

```tsx
// ボタンコンポーネントの例
const buttonSizes = {
  sm: "px-2 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg"
};

<Button size="md">送信</Button>
```

#### 4.2 コンポーネント実装

- カードコンポーネントの垂直配置は、固定高さとFlexboxを組み合わせて完全中央揃えを実現
- アイコンサイズは標準化された7段階のスケールに従い、コンテナサイズとの比率を保つ

```tsx
// カードコンポーネントの例
<div className="h-64 flex flex-col justify-between p-4 rounded-lg border border-gray-200">
  <div className="flex-1">
    <h3 className="text-lg font-medium">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
  <div className="flex justify-end">
    <button className="text-blue-500 hover:underline">詳細</button>
  </div>
</div>
```

### 5. アクセシビリティ

- **セマンティックHTML** - 適切なHTML要素を使用
- **ARIA属性** - 必要に応じてARIA属性を追加
- **キーボードナビゲーション** - すべての機能をキーボードで操作可能に
- **コントラスト比** - WCAG 2.1 AA準拠のコントラスト比を確保

```tsx
// アクセシブルなタブ実装例
<div role="tablist">
  <button
    role="tab"
    id="tab-1"
    aria-controls="panel-1"
    aria-selected={activeTab === 'tab-1'}
    onClick={() => setActiveTab('tab-1')}
  >
    Tab 1
  </button>
  <div
    role="tabpanel"
    id="panel-1"
    aria-labelledby="tab-1"
    hidden={activeTab !== 'tab-1'}
  >
    Panel 1 content
  </div>
</div>
```

### 6. ダークモード対応

- Tailwind CSSの`dark:`バリアントを使用してダークモード対応を実装
- セマンティックな色名を避け、用途に基づいた命名を使用

```tsx
// ダークモード対応の例
<div className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100">
  <h1 className="text-black dark:text-white">タイトル</h1>
  <p className="text-gray-700 dark:text-gray-300">コンテンツ</p>
</div>
```

### 7. 検証プロセス

- 実装後は必ずFigmaデザインと比較し、視覚的一貫性を確認
- 3つのサイズバリエーションすべてでレンダリングし、バランスを検証
- ダークモード/ライトモードの両方での表示とコントラストを確認
- モバイル、タブレット、デスクトップでのレスポンシブ対応を確認

---

詳細な実装ガイドラインについては `003-implementation-guidelines.mdc` を参照してください。
テスト戦略については `005-test-bestpractice.mdc` を参照してください。