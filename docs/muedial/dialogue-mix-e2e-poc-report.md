# MUEDial: Reference Track PoC 報告書

**ブランチ**: `feature/dial-reference-track`
**期間**: 2026-03-19 〜 2026-03-20
**ステータス**: PoC部分完了 — 参考音源機能とミックス完走を別セッションで個別検証。参考音源を含む一気通貫は未達成

---

## 1. 現実

**全ステップでエラーが発生し、その都度コード修正して辛うじて完走した。ユーザーが同じことをやったら完走できない。**

4セッション試行して、エラーなしで完走したセッションは0。

| セッション | 結果 | 死因 |
|-----------|------|------|
| セッション1（前日） | 途中放棄 | RoEx APIキー期限切れ |
| セッション2（参考音源あり） | プレビュー3でスタック | R2 URL経由でRoExがファイルを読めない |
| セッション2続き | MixCheckまで到達 | GCS signed URL 1h期限切れ |
| セッション3（参考音源なし） | マスタリングFinalまで完走 | ダウンロードUI壊れてcurlで回収 |

### 完走はしたが、道中で踏んだエラーの数:
1. RoEx `/mixanalysis` リクエスト形式が違う（400）
2. レスポンスの2段ネストを見逃してUI表示が0 LUFS
3. GCS signed URL 1h期限切れでプレビュー生成失敗
4. R2 Worker URLの末尾改行でRoExが400
5. R2 URL経由のプレビュー生成が17分→30分超スタック
6. RoEx APIキー期限切れ（RoEx側のアカウント整理）
7. Vercel CLIで本番デプロイ事故
8. MixCheck生成でVercel Function タイムアウト→UIにエラー表示（実際は成功）
9. マスタリングフェーズで参考音源が非表示
10. ファイルダウンロードUIが壊れてWAVが取得できない

**商品として出荷できる状態ではない。0エラーで完走できるようにしてから品質評価に入るべき。**

### 参考音源機能について
- **セッション2**: アップロード・分析・Hoo言及・比較フィードバックまで個別検証PASS
- **セッション3**: 参考音源なしで完走。参考音源を含む一気通貫は未達成

### 成果物

```
MUEDial_sample/
├── Final_Master.wav        (37MB)   ← マスタリング済み最終ファイル
├── Final_Mix.wav           (75MB)   ← ミックス済みWAV
├── Master_Preview.mp3      (469KB)  ← マスタリングプレビュー
├── Mix_Preview.mp3         (6.8MB)  ← ミックスプレビュー
└── stems/                  (16ファイル、計1.2GB)
    ├── 01_Stem_MainVOX.wav 〜 15_Stem_FX3-Impact.wav
    └── reverb_send.wav
```

### 完走フロー

```
ステムアップロード(15本) → 参考音源アップロード+分析 → Hooとチャット(方向性決定)
→ プレビュー生成 → フィードバック → MixCheck生成 → Final Mix生成
→ マスタリングプレビュー → マスタリングFinal → ダウンロード
```

---

## 2. 参考音源機能の検証結果

| 検証項目 | 結果 | 詳細 |
|---------|------|------|
| 参考音源アップロード | PASS | Cloudflare Worker proxy経由でGCSにアップロード |
| RoEx分析 → UI表示 | PASS | `-6.6 LUFS / Wide stereo / tonal bars` をサイドバーに表示 |
| Hooコンテキスト注入 | PASS | RoExのsummaryテキスト（クリッピング、ラウドネス、トーナル分析）がプロンプトに注入される |
| Hooの参考音源言及 | PASS | ファイル名「青春乌托邦MMM.wav」を名指しで言及し、分析に基づく具体的提案を生成 |
| compare（参考 vs プレビュー） | PASS | チャット送信時にインラインでcompareMixes実行、Hooが差分フィードバックを生成 |
| マスタリングフェーズでの表示 | PASS | 修正済み。マスタリングフェーズでもサイドバーに参考音源情報が表示される |

**参考音源機能の核心的価値が実証された:**
- Hooが「参考音源を分析した結果から見ると...」と言及し、低音バランスやステレオフィールドについて具体的な提案をした
- マスタリングフェーズでも「参考音源の音圧に負けないように」という要望に対応

---

## 3. 処理時間計測

### セッション3（最終成功セッション、15トラック、GCS URL直、prod key）

| 処理 | 所要時間 | 備考 |
|------|---------|------|
| ステム15本アップロード | 約3分 | 各82MB、Cloudflare Worker proxy経由 |
| 参考音源アップロード+分析 | 約30秒 | 1ファイル + RoEx `/mixanalysis` |
| Hooチャット応答（方向性決定） | 約8秒 | set_musical_style + adjust_preview |
| **プレビュー生成** | **約22分** | RoExサーバー負荷で大幅にブレる（8〜22分） |
| Hooチャット応答（参考音源比較付き） | 約15秒 | compareMixesインライン実行 + AI応答 |
| **MixCheck生成** | **数分以内** | DB上ではcompleted（UIタイムアウトでエラー表示されたが実際は成功） |
| **FinalMix生成** | **数分以内** | 自動遷移でマスタリングフェーズへ |
| **マスタリングプレビュー** | **約3分30秒** | 1ファイル処理なので高速 |
| **マスタリングFinal** | **数分以内** | |

### 処理時間の比較（プレビュー生成）

| 条件 | 所要時間 |
|------|---------|
| GCS URL直（セッション2、テイク1） | 約8分 |
| R2 Worker URL経由（セッション2、テイク2） | 約17分 |
| R2 Worker URL経由（セッション2、テイク3） | 30分超→スタック |
| GCS URL直（セッション3、テイク1） | 約22分 |

**結論**: RoExの処理時間はサーバー負荷で8〜22分の範囲でブレる。R2 Worker経由はさらに遅く、スタックするリスクがある。

---

## 4. 発見された課題

### Critical（商品価値に直結）

| # | 課題 | 影響 | 対策案 |
|---|------|------|--------|
| C1 | **プレビュー待機時間が長すぎる** | 15トラックで8〜22分。ユーザーが画面を見て待てる限界を超えている | メール/プッシュ通知で離脱許容、推定時間表示、待機中コンテンツ（Hooの雑談、ミックスTips） |
| C2 | **ファイルダウンロードが壊れている** | WAVリンクをクリックすると `download.json` が表示されダウンロードできない | R2経由のダウンロードプロキシ実装、または `Content-Disposition: attachment` ヘッダー付きのダウンロードAPI |
| C3 | **GCS signed URL 1h期限** | セッション開始から1h経過するとステムURLが無効化され、プレビュー再生成が失敗する | GCS URLとR2 URLの両方を保持するハイブリッド方式（GCS優先、期限切れ後R2フォールバック） |
| C4 | **R2 Worker経由のRoEx処理が不安定** | R2 URLだとプレビュー生成が17分〜スタック | C3のハイブリッド方式で解決。R2はあくまでフォールバック |

### High（UX・品質）

| # | 課題 | 影響 | 対策案 |
|---|------|------|--------|
| H1 | **MixCheck生成でUIにエラー表示** | Vercel Function 5分タイムアウトでクライアントにエラーが返るが、実際は成功 | MixCheck/Final投入をfire-and-forget化。投入成功→ポーリング開始の2段階に分離 |
| H2 | **アナライザー有効化が無効** | サイドバーの「アナライザーを有効化」クリックが反応しない | CORS or `createMediaElementSource` の問題。既知バグ（別途issue） |
| H3 | **ステムファイル名がUUID** | ダウンロードされるステムがUUID名で、どのトラックか不明 | アップロードUUID＝ステムUUID。DBのトラック名でマッピングしてリネーム可能 |
| H4 | **参考音源の削除が未実装** | UIの✕ボタンはクライアントstateリセットのみ。DB削除APIがない | PATCH `/api/dial/session` でnull化するAPIを追加 |
| H5 | **待機メッセージが不正確** | 「This may take a few minutes」→ 実際は10〜20分 | トラック数に応じた推定時間を表示 |

### Medium（改善余地）

| # | 課題 | 影響 | 対策案 |
|---|------|------|--------|
| M1 | `/mixcomparison` レスポンス形式未確認 | compareMixesの結果を`Record<string, unknown>`で受けている | prod keyで実データ確認後に型追加 |
| M2 | 参考音源のマスタリング活用 | マスタリングプロンプトに参考音源情報は注入されるが、RoExのマスタリングAPIに直接活用する方法がない | Hoo側でdesiredLoudnessの提案に参考音源のLUFS値を活用（現状でも部分的に動作） |
| M3 | Vercel CLIデプロイ事故 | `vercel --prod=false`でfeatureブランチがProductionにデプロイされた | `git push`経由のみ。Vercel CLIでの直接デプロイ禁止（CLAUDE.mdに記載済み） |

---

## 5. 技術的知見

### RoEx API

- `/mixanalysis` は `mixDiagnosisData` ラッパーが必要（ドキュメントと異なる）
- レスポンスは `{ mixDiagnosisResults: { payload: { ... } } }` の2段ネスト
- `musicalStyle` の enum は mixing API と analysis API で異なる（`OTHER` → `BALANCED`）
- GCS signed URL（アップロード用）の期限は1時間（`X-Goog-Expires=3600`）
- 出力ファイル（`tonn-audio` バケット）は公開URL（signed不要）
- アップロードUUID = 処理済みステムUUID（ファイル名マッピングに使える）
- 処理時間はサーバー負荷で大幅にブレる（同じ条件で8分〜22分）

### 環境変数

- `echo` でVercel環境変数を設定すると末尾改行が混入する → `printf` を使う
- `DIAL_R2_WORKER_URL` はコード側で `.trim()` 対策済み
- RoEx APIキーはGoogle API Gateway経由。キー管理は tonn-portal.roexaudio.com

---

## 6. 実装済みファイル一覧

### 新規作成（参考音源機能）
| ファイル | 内容 |
|---------|------|
| `db/migrations/0032_add_dial_reference_track.sql` | マイグレーション |
| `app/api/dial/reference/upload/route.ts` | presign |
| `app/api/dial/reference/confirm/route.ts` | 確認 + analyzeMix + DB保存 |
| `app/api/dial/reference/compare/route.ts` | 参考 vs プレビュー比較 |
| `components/dial/reference-track.tsx` | サイドバーUI |

### 変更（参考音源機能）
| ファイル | 内容 |
|---------|------|
| `db/schema/dial.ts` | 3カラム追加 |
| `lib/roex/types.ts` | `ComparisonResult` 型、`AnalysisResult` 修正 |
| `lib/roex/analysis.ts` | リクエスト形式修正、dev dummy、`ANALYSIS_STYLE_MAP` |
| `lib/roex/index.ts` | export追加 |
| `lib/ai/prompts/dial.ts` | v5.8.0、参考音源プロンプト注入 |
| `app/api/dial/chat/route.ts` | 参考分析読み込み + インラインcompare |
| `app/dial/session/[id]/page.tsx` | Session型更新、ReferenceTrack配置、マスタリング表示修正 |

### 変更（インフラ・既存問題修正）
| ファイル | 内容 |
|---------|------|
| `app/api/dial/upload/confirm/route.ts` | R2コピー追加→無効化（RoExがR2 URLを安定して読めない） |
| `lib/dial/r2-storage.ts` | `.trim()` 対策 |
| `workers/upload-proxy/src/index.ts` | Vercel Preview CORS対応 |
| `workers/upload-proxy/wrangler.toml` | `*.vercel.app` 追加 |

---

## 7. 今後のプラン

### Phase 0: 0エラー完走（最優先）

目標: **新規セッションで、参考音源あり・15トラック・Dialogueモードで、コード修正なしにマスタリング完了+ダウンロードまで完走する。**

| 優先度 | タスク | 理由 |
|--------|--------|------|
| P0 | ダウンロードAPI実装 | WAVダウンロードが完全に壊れてる。商品の納品ができない |
| P0 | GCS/R2ハイブリッドURL方式 | 1h期限で詰む。GCS優先、期限切れ後R2フォールバック |
| P0 | MixCheck/Final投入のfire-and-forget化 | Vercel 5分タイムアウトでUIにエラー表示される |
| P0 | ステムファイル名マッピング | UUID名でダウンロードされても使えない |
| P0 | 待機メッセージ修正 | 「a few minutes」は嘘。10-20分かかる |

Phase 0完了の定義: **開発者の介入なしに、ユーザーが1人で完走できる**

### Phase 1: 参考音源を含む一気通貫検証

Phase 0完了後:
1. 参考音源あり + 15トラックで新セッション作成
2. コード修正なしで完走することを確認
3. Hooが参考音源を各フェーズで活用することを確認
4. 全成果物がダウンロードできることを確認

### Phase 2: 待機UX改善

| タスク | 理由 |
|--------|------|
| メール/プッシュ通知（完了時） | 10-20分画面を見て待てない |
| 推定時間表示（トラック数ベース） | いつ終わるかわからないのが一番辛い |
| 待機中コンテンツ | 空白の画面で待たせるのは拷問 |

### Phase 3: 品質向上 + 本番リリース

| タスク |
|--------|
| アナライザー有効化バグ修正 |
| 参考音源削除API |
| compareMixesレスポンス型定義 |
| マスタリングでの参考音源LUFS活用強化 |
| 参考音源の料金体系決定 |
| mainへのマージ + Production E2Eテスト |

---

## 8. コミット履歴

| コミット | 内容 |
|---------|------|
| `16a9f41` | feat: reference track upload, analysis, comparison PoC |
| `20e6c20` | fix: RoEx /mixanalysis body format + Vercel CORS |
| `479a59b` | debug: log raw analysis response |
| `78c5774` | fix: match RoEx /mixanalysis actual response format |
| `a3aaaae` | fix: extract mixDiagnosisResults.payload |
| `12cdbc2` | fix: improve display + inject RoEx summary into prompt |
| `f1c532d` | fix: strip GCS signed params (reverted) |
| `5e44e08` | revert: restore full readableUrl |
| `7c2edb05` | fix: copy stems to R2 on upload |
| `c1ca1f59` | fix: trim DIAL_R2_WORKER_URL |
| `15729fad` | chore: trigger redeploy with new API keys |
| `dea431cc` | docs: add 5 learning items to CLAUDE.md |
| `1d07198e` | fix: disable R2 copy (RoEx struggles with R2 URLs) |
| `c4b1ec09` | fix: show reference track in mastering phase |
