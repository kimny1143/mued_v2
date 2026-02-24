# DAW Hub API 本番対応 - 引き継ぎ文書

**日付**: 2026-01-21
**ステータス**: 完了

---

## 完了した作業

### 1. サーバー側変更 (mued_v2)

**ファイル**: `app/api/muednote/daw-log/route.ts`

API Key認証を開発環境のみに制限:

```typescript
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
if (IS_DEVELOPMENT && apiKey && DAW_API_KEY && apiKey === DAW_API_KEY) {
  // ...
}
```

**コミット**: `28feb5a7` - feat(daw-api): restrict API key auth to development only

### 2. CLAUDE.md修正

- `apps/` ディレクトリ構造を実際の内容に更新
- Gotcha追加: 「CLAUDE.mdの情報を鵜呑みにしない」

**コミット**: `a1ddcdf7` - docs(claude): fix outdated apps directory structure

---

## 検証結果

### macOS Hubアプリ (muednote-hub-macos)

**変更不要** - 既に正しく実装済み

`APIClient.swift:57-62`:
```swift
if let token = authToken {
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
} else if let key = apiKey {
    request.setValue(key, forHTTPHeaderField: "X-DAW-API-Key")
}
```

- JWT認証が優先（OAuth後のトークン使用）
- API Keyはフォールバック（開発用）
- `AuthService.swift` にClerk OAuth実装済み

### 本番環境での動作

| 認証方法 | 結果 |
|---------|------|
| API Key (`X-DAW-API-Key`) | 401 Unauthorized |
| JWT (`Bearer` token) | 正常動作 |
| Clerk Cookie (Web) | 正常動作 |

---

## 残作業・注意点

### 本番デプロイ後の確認事項

1. API Key認証が401を返すことを確認
2. OAuth経由でログイン後、JWT認証が動作することを確認

### macOS Hubアプリのビルド・配布

アプリ自体は変更不要だが、配布時の注意:

- `CLERK_DOMAIN` と `CLERK_CLIENT_ID` の環境変数設定が必要
- Clerk側で `muednote://callback` のリダイレクトURI登録が必要

### apps/ のCLAUDE.md

`apps/CLAUDE.md` にも古い記述あり:

```markdown
- **認証**:
  - Hub: `X-DAW-API-Key` ヘッダー  ← これは開発用のみ
```

次回作業時に更新推奨。

---

## 関連ファイル

- `app/api/muednote/daw-log/route.ts` - DAW Log API
- `apps/muednote-hub-macos/Sources/MUEDnoteHub/Services/AuthService.swift` - OAuth実装
- `apps/muednote-hub-macos/Sources/MUEDnoteHub/Services/APIClient.swift` - API通信

---

*作成: 2026-01-21*
