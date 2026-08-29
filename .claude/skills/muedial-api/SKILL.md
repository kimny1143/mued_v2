# MUEDial API Reference

MUEDial（AIミキシング/マスタリング）の技術リファレンス。RoEx Tonn API仕様、認証、決済フロー、価格体系。

**トリガー:** MUEDial、RoEx、ミキシングAPI、マスタリングAPI、Dial API、`/api/dial`、`lib/roex/`、withDialAuth

---

## 概要
AIミキシング/マスタリングサービス。RoEx Tonn APIを使用。ゲストアクセス対応（ログイン不要で単品購入可能）。

## アーキテクチャ
- **認証**: `withDialAuth` — Clerk auth と `X-Dial-Guest-Token` ヘッダーの両対応
- **ミドルウェア**: `/dial` と `/api/dial` は Clerk middleware matcher から**完全除外**（`clerkMiddleware`はpublicルートでもCookie存在時にハンドシェイクリダイレクトするため）
- **決済**: Stripe先払い → webhook (`metadata.service === 'dial'`) → `paymentStatus: paid` → Upload解放
- **価格 (USD表示のみ, JPYハードコード撤廃済み)**: ★**正本＝`lib/dial/pricing.ts` の `DIAL_SINGLE_PRICES`**。★値をここに書き写さない——この行は 2026-05〜06 の改定後も $8/$15/$6/$10 のまま残り、4/4 が誤っていた。（2026-08-30 時点の実測: Omakase $7.49 / Dialogue $13.99 / Mastering +$5.99 / Retake $9.99）
- ★**サブスク4層 (`hoo_pass` / `basic` / `pro` / `studio`) は退役済み**（`DIAL_SUB_PLANS` の全4層に `deprecated: true`・2026-07 Phase2）。★**購入導線は存在しない**。定数が残っているのは webhook の後方互換のためで、★live の商品ではない。
- **クレジットポリシー (Spliceモデル)**: ★**サブスクが退役済みなので、この節はサブスク購入者にはもう適用されない**（記述は履歴として残す）。Credit Pack 12ヶ月有効の部分は継続。
- **クライアント**: `lib/roex/` — upload, mixing, mastering, analysis

## RoEx Tonn API
- **認証**: Google API key をクエリパラメータで渡す (`?key=API_KEY`)。Bearer tokenではない
- **全エンドポイントPOST only**（GETは405）
- **devキー**: ダミーデータ返却。**prodキー**: 実オーディオ処理（クレジット消費）

| 操作 | エンドポイント | ボディのラッパーキー |
|------|-------------|-------------------|
| Upload URL | `/upload` | なし (`{ filename, contentType }`) |
| Mix Preview 投入 | `/mixpreview` | `multitrackData` |
| Mix Preview 取得 | `/retrievepreviewmix` | `multitrackData` |
| Final Mix 投入 | `/applyaudioeffects` | `applyAudioEffectsData` |
| Final Mix 取得 | `/retrievefinalmix` | `applyAudioEffectsData` (trackData min 2) |
| Mastering Preview 投入 | `/masteringpreview` | `masteringData` |
| Mastering Preview 取得 | `/retrievepreviewmaster` | `masteringData` |
| Mastering Final 取得 | `/retrievefinalmaster` | `masteringData` |

## Enum マッピング（UI → RoEx）
- **Musical Style**: `pop`→`POP`, `rock`→`ROCK_INDIE`, `hiphop`→`HIPHOP_GRIME`, `electronic`→`ELECTRONIC`, `classical`→`ORCHESTRAL`, `metal`→`METAL`, etc.
- **Instrument Group**: ★**正本＝`lib/roex/mappings.ts` の `INSTRUMENT_GROUP_MAP`**。★不規則な2つに注意——`DRUMS`→`DRUMS_GROUP`（★`DRUM_GROUP` ではない）／`GUITAR`→`E_GUITAR_GROUP`（★`GUITAR_GROUP` ではない）。他は `VOCAL`/`BASS`/`KEYS`/`SYNTH`/`STRINGS`/`BRASS`→`*_GROUP`、`OTHER`→`OTHER_GROUP1`。

## Gotchas (RoEx固有)
- **RoEx APIのリクエスト形式はドキュメントを信用せず実測で確認**: `/mixanalysis` は `mixDiagnosisData` ラッパーが必要、フィールド名はキャメルケース（`audioFileLocation`）、レスポンスは `{ mixDiagnosisResults: { payload: { ... } } }` の2段ネスト。`musicalStyle` の enum も mixing API とは異なる（`OTHER` → `BALANCED`）
- **GCS signed URLは1時間で期限切れ**: RoEx `/upload` が返す `readableUrl` は `X-Goog-Expires=3600` の signed URL。DBに保存して後で使うと期限切れ。対策: アップロード直後にR2にコピーして永続URLに差し替える (`copyToR2`)
