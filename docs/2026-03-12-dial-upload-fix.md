# [CRITICAL] MUEDial ステムアップロード — 大容量ファイル対応

**日付:** 2026-03-12
**優先度:** P0（サービス利用不可）
**発見経緯:** Suno Studio で生成した 9 ステム（各 59.8 MB / 24bit WAV）をアップロードしたところ、最初のファイル（0 Drums.wav）で `Upload error for "0 Drums.wav"` が発生。以降のファイルも全てアップロード不可。

---

## 問題

### 根本原因: Vercel Serverless Function の body size 制限（4.5MB）

現在のアップロードフローはファイル本体を Vercel API ルートに POST しているため、4.5MB を超えるファイルは全て失敗する。

```
現在のフロー:
Client ---(FormData 59.8MB)---> POST /api/dial/upload ---> RoEx署名URL取得 ---> PUT to GCS
                                    ↑
                              ここで 4.5MB 制限に引っかかる
```

### 影響範囲

- **24bit/44.1kHz WAV** （業界標準）: 1分あたり約 15MB。4分の曲で ~60MB → **全滅**
- **16bit/44.1kHz WAV**: 1分あたり約 10MB。30秒でも ~5MB → **ほぼ全滅**
- **MP3 320kbps**: 1分あたり約 2.4MB。2分以上で超過
- **実質的に WAV ステムのアップロードが一切できない**

MUEDial のターゲットユーザー（DTMer）はステムを WAV で書き出すのが標準。つまり現状のサービスは **実質使用不可能**。

---

## 修正方針: クライアントサイド直接アップロード

```
修正後のフロー:
1. Client ---(メタデータのみ)---> POST /api/dial/upload/presign
   → sessionId, fileName, contentType, instrumentGroup を送信（ファイル本体なし）
   → サーバーが RoEx API から署名付き URL を取得して返却

2. Client ---(ファイル本体)---> PUT to RoEx GCS 署名付き URL
   → Vercel を経由しない。ブラウザから RoEx の GCS に直接アップロード
   → ファイルサイズ制限なし（GCS 側の制限は 5TB）
   ※ ストレージは全て RoEx 側。自前の GCS/S3 は不要

3. Client ---(完了通知)---> POST /api/dial/upload/confirm
   → サーバーが dial_tracks テーブルにレコード保存
```

### 関連ファイル

| ファイル | 変更内容 |
|---------|---------|
| `app/api/dial/upload/route.ts` | 既存ルート。廃止 or presign + confirm に分割 |
| `app/dial/session/[id]/page.tsx` | クライアントの `uploadFiles()` 関数（L312-370）。FormData 送信を署名 URL 直接 PUT に変更 |
| `lib/roex/upload.ts` | RoEx API との通信。署名 URL 取得ロジックはここに既存 |
| `middleware.ts` | `/api/dial/upload` の除外設定。新エンドポイントに合わせて更新 |

### RoEx API 既存ロジック（再利用可能）

`lib/roex/upload.ts` に既に以下が実装済み:
- `POST https://tonn.roexaudio.com/upload` → 署名付き URL + readable URL を返す
- content-type マッピング（WAV, MP3, FLAC, AIFF）

サーバー側で PUT していた部分をクライアントに移すだけ。署名 URL 取得ロジックはそのまま使える。

### クライアント側の追加考慮

- **プログレスバー**: `XMLHttpRequest` の `upload.onprogress` でアップロード進捗を表示（59MB のファイルは時間がかかる。進捗なしだとユーザーが不安になる）
- **リトライ**: ネットワークエラー時に 1 回自動リトライ
- **CORS**: RoEx GCS 署名付き URL への PUT でブラウザから直接リクエストするため、RoEx 側の CORS 設定確認が必要。RoEx がブラウザ直接アップロードを想定していない場合は要問い合わせ

### 認証

現在のフローでは Bearer token / X-Dial-Guest-Token でセッション所有権を検証している。presign エンドポイントでも同じ検証を維持すること。

---

## テスト手順

1. 59.8MB の WAV ファイルをアップロード → 成功すること
2. 複数ファイル（9 ステム、合計 ~540MB）を連続アップロード → 全て成功すること
3. MP3 ファイル（小さいサイズ）もアップロード可能なこと（リグレッション防止）
4. 不正なセッション ID でのアップロード → 拒否されること
5. プログレスバーが正しく動作すること

---

## ストレージ構成の補足

MUEDial は自前のオブジェクトストレージ（GCS/S3/R2等）を持っていない。全てのファイルは RoEx のインフラ上に保存される。

```
RoEx API (https://tonn.roexaudio.com)
├── POST /upload → 署名付き URL + readable URL を返す（RoEx の GCS）
├── 処理（MixCheck, AutoMix, Mastering）も GCS 上のファイルを参照
└── 処理結果も GCS に書き出される

MUEDial (Vercel) は指示役のみ:
├── 署名 URL の取得・クライアントへの中継
├── RoEx 処理の開始指示
├── セッション管理・DB操作
└── 大きいバイナリは一切通さない
```

ダウンロード（preview / final mix / mastering / stem DL）も同様に、RoEx が返す readable URL をクライアントに渡して直接ダウンロードさせる。Vercel を経由する必要はない。

---

## 暫定対応（もし修正に時間がかかる場合）

エラーメッセージを改善し、対応中であることを伝える。MP3 変換の案内は行わない（ミキシングサービスで非可逆圧縮を強いるのは論外）。

```
現在: "Upload error for \"0 Drums.wav\""
暫定: "現在、大容量ファイルのアップロードに対応中です。しばらくお待ちください。"
```
