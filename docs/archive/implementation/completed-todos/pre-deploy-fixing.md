

Read file: next.config.js


Read file: app/page.tsx


Read file: lib/supabase-browser.ts

基本は大事！！  
アーキテクト確認！！  
セキュリティUX！！  

---

## 📋 「Export encountered errors…」の精査結果

| パス | 主な原因候補 | 今デプロイ前に**必ず**直すべき? |
|------|--------------|--------------------------------|
| `/login` (`/(auth)/login/page`) | `use client` だが **Supabase 環境変数** が build 時に undefined → SSG 時に失敗 | **要対応** |
| `/auth/callback` | 同上（Supabase & window 参照） | **要対応** |
| `/checkout/success` | Stripe セッション取得を build 時に実行しようとする | **要対応** |
| `/dashboard/*` 一式 | SSR 依存／ユーザー session 依存で SSG 失敗 | **要対応** |
| `/reservation/page` | `use client` だが Supabase env 参照で失敗 | **要対応** |
| ルート `/` (`/page`) | 同上 | **要対応** |
| `_error` / `_not-found` | 例外扱いなので無視可 | ❌（修正不要） |

### なぜ失敗するか
Next.js 14 の **App Router は「静的プリレンダ」** をデフォルトで試行します。  
しかし上記ページはすべて **ユーザーごとの動的データ (Supabase/Stripe)** に依存。  
そのままでは `next build` 時に

```
Error: Export encountered errors on following paths:
```

が発生し、ビルドが **fail** します。

---

## 🛠️ 最小修正方針

> “プリレンダをやめて常に動的レンダリングにする”

各ページ（サーバーコンポーネント側）冒頭に  
```ts
export const dynamic = 'force-dynamic';
```
を宣言するだけで **静的化スキップ → ビルド成功** になります。

1. **対象**  
   - `app/(auth)/login/page.tsx`
   - `app/auth/callback/page.tsx`
   - `app/checkout/success/page.tsx`（ある場合）
   - `app/dashboard/**/page.tsx`（11 ファイル）
   - `app/reservation/page.tsx`
   - `app/page.tsx` (トップページ)

2. **追加例**（サーバー側ファイルの先頭）  
```tsx
// app/dashboard/page.tsx
export const dynamic = 'force-dynamic';

'use client';
...
```
> ファイルが完全クライアント (`'use client'`) の場合は、  
> そのファイルではなく **上位のレイアウト or 親サーバーコンポーネント** に追加する。

3. **_error / _not-found** は Next.js が自動で処理するので放置で可。

---

## 🔥 今回デプロイ前に必須の修正一覧

| ファイル | 具体的修正 | 備考 |
|----------|-----------|------|
| `app/page.tsx` | 先頭に `export const dynamic = 'force-dynamic';` | 直書きで OK |
| `app/(auth)/login/page.tsx` | 同上 | |
| `app/auth/callback/page.tsx` | 同上 | |
| `app/checkout/success/page.tsx` | 同上 | |
| `app/reservation/page.tsx` | 同上（or 親レイアウト） | |
| `app/dashboard/**/page.tsx` | 各ファイルに追加 or `app/dashboard/layout.tsx` に 1 行追加して一括 | `layout.tsx` があればそこに書くと楽 |

---

## 👍 修正後に期待される結果
1. `npm run build` が **“Export encountered errors” なしで完了**  
2. Standalone 出力 (`output: 'standalone'`) に問題なし  
3. Supabase/Stripe など動的機能は **ランタイムに実行** → 予約フローは従来通り動作  

---

## すぐに適用する？  
- 変更は**宣言 1 行ずつ**なのでデグレリスク小。  
- デプロイ検証前に入れることで **ビルド落ちを確実に除去**。  

→ **実装を推奨**します。
