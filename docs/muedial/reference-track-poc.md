# MUEDial: Reference Track PoC

**ブランチ**: `feature/dial-reference-track`
**開始日**: 2026-03-19
**ステータス**: RoEx APIキー期限切れで検証中断

---

## 概要

ミックス受注時に参考音源を受け取り、その質感・音量・ラウドネスを目標にミックスを進める機能。
RoEx `/mixanalysis`（分析）と `/mixcomparison`（A/B比較）を活用。

---

## 実装済みファイル

### DB
| ファイル | 内容 |
|---------|------|
| `db/schema/dial.ts` | `dialSessions` に `reference_track_url`, `reference_track_filename`, `reference_analysis_result` 追加 |
| `db/migrations/0032_add_dial_reference_track.sql` | マイグレーション（適用済み） |

### RoEx クライアント
| ファイル | 内容 |
|---------|------|
| `lib/roex/types.ts` | `ComparisonResult` 型追加。`AnalysisResult` の `clipping` を string、`tonalProfile` を `Record<string, string>` に修正 |
| `lib/roex/analysis.ts` | `analyzeMix`: `mixDiagnosisData` ラッパー、`ANALYSIS_STYLE_MAP`（OTHER→BALANCED等）。`compareMixes`: `mixComparisonData` ラッパー。dev dummy 追加 |
| `lib/roex/index.ts` | `ComparisonResult` エクスポート追加 |

### API ルート
| ファイル | 内容 |
|---------|------|
| `app/api/dial/reference/upload/route.ts` | presign（既存ステムと同パターン） |
| `app/api/dial/reference/confirm/route.ts` | R2コピー → analyzeMix → DB保存 |
| `app/api/dial/reference/compare/route.ts` | 参考 vs プレビューの都度比較（DB保存なし） |

### プロンプト
| ファイル | 内容 |
|---------|------|
| `lib/ai/prompts/dial.ts` | v5.8.0。`DialPromptInput` に3フィールド追加。`buildReferenceSection()` で Dialogue/Omakase/Mastering 全プロンプトに注入。RoEx summary テキストも内部参考として注入 |

### Chat ルート
| ファイル | 内容 |
|---------|------|
| `app/api/dial/chat/route.ts` | セッションから参考分析を読み込み、プレビュー存在時にインラインで `compareMixes` 実行 |

### UI
| ファイル | 内容 |
|---------|------|
| `components/dial/reference-track.tsx` | サイドバーUI。アップロード→分析→サマリー表示（LUFS丸め、stereo field日本語マッピング、tonal bars可視化） |
| `app/dial/session/[id]/page.tsx` | Session 型更新、ReferenceTrack を Takes と Tracks の間に配置 |

### インフラ修正（この PR で併せて対応）
| ファイル | 内容 |
|---------|------|
| `app/api/dial/upload/confirm/route.ts` | ステムアップロード後に R2 へ即コピー → 永続 URL を DB 保存（GCS signed URL 1h 期限対策） |
| `lib/dial/r2-storage.ts` | `workerUrl`/`secret` の `.trim()` 追加（環境変数末尾改行対策） |
| `workers/upload-proxy` | `https://*.vercel.app` の CORS ワイルドカード対応 + `isOriginAllowed` 関数追加 |

---

## RoEx API 実装メモ

### `/mixanalysis` リクエスト形式

```json
{
  "mixDiagnosisData": {
    "audioFileLocation": "https://...",
    "musicalStyle": "BALANCED",
    "isMaster": false
  }
}
```

- MusicalStyle マッピング: `ROCK_INDIE→INDIE_ROCK`, `HIPHOP_GRIME→HIP_HOP_GRIME`, `OTHER→BALANCED` 等
- レスポンス: `{ mixDiagnosisResults: { payload: { ... } } }` の2段ネスト

### `/mixanalysis` レスポンスフィールド

| フィールド | 型 | 例 |
|-----------|-----|-----|
| `integrated_loudness_lufs` | number | -6.63 |
| `peak_loudness_dbfs` | number | 1.2 |
| `stereo_field` | string | `"STEREO_UPMIX"` |
| `mono_compatible` | boolean | true |
| `clipping` | string | `"MINOR"` |
| `tonal_profile` | object | `{ bass_frequency: "HIGH", high_frequency: "MEDIUM", ... }` |
| `summary` | object | 各項目のテキスト分析（clipping, mix_loudness, tonal_profile 等） |

### `/mixcomparison` リクエスト形式（未検証）

```json
{
  "mixComparisonData": {
    "mixAUrl": "https://...",
    "mixBUrl": "https://...",
    "musicalStyle": "BALANCED",
    "isMaster": false
  }
}
```

レスポンス形式は未確認（`Record<string, unknown>` で受けている）。

---

## 検証状況

| 項目 | 状態 | 備考 |
|------|------|------|
| typecheck / lint / build | PASS | |
| DB マイグレーション | 適用済み | |
| 参考音源アップロード | PASS | Vercel Preview |
| RoEx 分析 → UI 表示 | PASS | `-6.6 LUFS \| Wide stereo \| tonal bars` |
| Hoo コンテキスト注入 | PASS | RoEx summary 含む |
| プレビュー生成（R2 URL経由） | PASS | 約8分（15トラック、prod key） |
| compare（参考 vs プレビュー） | PASS | チャット内でインライン実行 |
| Hoo の参考音源言及 | PASS | ファイル名「青春乌托邦MMM.wav」を名指しで言及、分析に基づく具体的提案あり |
| R2 永続 URL | PASS | ステム15本がR2 URL経由でRoExに渡り、プレビュー生成成功 |
| 1h 経過後のプレビュー再生成 | **未検証** | セッション継続中 |

---

## 処理時間計測（15トラック、prod key、Vercel Preview）

| 処理 | 所要時間 | 備考 |
|------|---------|------|
| ステム15本アップロード（GCS + R2コピー） | 約3分 | 各ファイル約82MB |
| 参考音源アップロード + RoEx分析 | 約30秒 | 1ファイル + `/mixanalysis` |
| Hoo チャット応答（初回） | 約5秒 | ジャンル確認 |
| Hoo チャット応答（方向性決定 + adjust_preview） | 約8秒 | set_musical_style + adjust_preview ツール呼び出し |
| プレビュー生成 テイク1（GCS URL経由） | **約8分** | 15トラック。GCS signed URLが生きてる間 |
| プレビュー生成 テイク2（R2 URL経由） | **約17分** | 15トラック。R2 Worker経由のダウンロードがボトルネック |
| Hoo チャット応答（参考音源比較付き） | 約15秒 | compareMixes インライン実行 + AI応答 |

---

## 解決済みブロッカー

### RoEx API キー期限切れ（2026-03-19 解決済み）
- **原因**: RoEx が古いアカウントの API キーを無効化
- **対応**: RoEx ポータルで新キー発行、Vercel 環境変数を更新
- **教訓**: RoEx は Google API Gateway 経由。キー管理は tonn-portal.roexaudio.com で行う

---

## Vercel 環境変数メモ

- **Preview** の `ROEX_API_KEY` を本番キーに差し替え済み（テスト用）
- テスト完了後に元の dev key に戻す or そのまま
- `DIAL_R2_WORKER_URL` に末尾改行が入りやすい → コード側で `.trim()` 対策済み

---

## 既知のリスク・未対応

| 項目 | 対策 |
|------|------|
| `/mixcomparison` レスポンス形式未確認 | `Record<string, unknown>` で受けて raw ログ確認後に型追加 |
| `/mixcomparison` クレジットコスト不明 | prod key テスト時に確認 |
| 参考音源の削除 | クライアント state リセットのみ。DB 削除 API 未実装 |
| 料金体系 | PoC 範囲外。後回し |
| アナライザー有効化ボタンが無効 | サイドバーの「アナライザーを有効化」クリックが反応しない。R2 URL経由の音声でCORS or `createMediaElementSource` の問題の可能性 |
| プレビュー待機時間のUX | 15トラックで8〜17分。「This may take a few minutes」では不十分。推定時間表示、通知、待機中コンテンツが必要 |
| R2 URL経由のプレビュー生成が遅い | GCS直: 約8分、R2経由: 約17分。GCS URLが生きてる間はGCSを優先し、期限切れ後にR2フォールバックするハイブリッド方式を検討 |
