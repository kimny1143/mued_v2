# Cryo Mix — Phase A 疎通レポート（MUEDsp vs Cryo 実音比較・mued 担当分）

*2026-06-22 / mued課 / Chief protocol [`protocol-muedsp-vs-cryo-compare-20260622`](../../../_chief/decisions/protocol-muedsp-vs-cryo-compare-20260622.md) Phase A（Tier2・conductor dispatch・kimny gate 不要）/ 関連 refresh `reference-cryomix-refresh-20260622`*

## スコープと安全境界

- **Phase A = 無料部分のみ**：`upload → run mastering → poll → download MP3`。**MP3 取得で停止**。
- **purchase は構造的に呼ばない**：本検証は専用スクリプト `scripts/cryo-phase-a.ts` で実行。同スクリプトは `client.purchase()` / `POST /api/api-checkout` を一切参照しない（既存 `app/api/cryomix/poc/route.ts` は Step5 で purchase を呼ぶため**不使用**）。Tier3 gate を「規律で呼ばない」ではなく「**構造的に呼べない**」にした。
- **実コスト $0（三重）**：①no-purchase ②`CRYOMIX_ORIGIN=https://dial.mued.jp`（Cryo integration-settings 登録済 = billing 対象外）③grace period（〜2026-07 中旬）。
- **結果：両曲 clean 完走・blocker 0・purchase 未発火（`purchaseCalled: false`）。**

## 素材と format 処理（deliverable ①）

| 曲 | 元 spec | Cryo へ送った spec | 変換 |
|----|---------|--------------------|------|
| 曲1 liberation | 44.1kHz / 16bit int / 30s / 5.0MB | **そのまま** 44.1k/16bit WAV | 無変換（既に int） |
| 曲2 forMUEDialMater_2mix | 48kHz / **Float32** / 201s / 77.5MB | 48kHz / **24bit int** WAV / 55.2MB | F32→`pcm_s24le`（**SR 維持・bit深のみ・lossless扱い**。protocol「事前リサンプルなし」遵守） |

**Cryo upload format 要件（実証）**：`content_type: audio/wav` + GCS 署名URL 上限 250MB（`x-goog-content-length-range: 0,262144000`）。**44.1k/16bit と 48k/24bit の両方を Cryo が受理し master 完走**。SR/bit深の事前統一は不要（曲ごと同一入力を両エンジンへ＝protocol どおり）。

## フロー疎通結果（deliverable ②③・Phase B de-risk の核心）

各段すべて成功。`scripts/cryo-phase-a.ts` 実行ログより：

| 段 | エンドポイント | 曲1 liberation | 曲2 2mix |
|----|----------------|----------------|----------|
| 1 upload presign | `POST /api/signed-url/multi-upload` | ✓（初回 ~15s = cold start） | ✓ ~0.7s |
| 2 upload PUT | 署名 GCS URL `PUT` | ✓ 5.0MB | ✓ 55.2MB ~4s |
| 3 run mastering | `POST /api/mastering`（neutral マクロ） | ✓ | ✓ |
| 4 poll | `GET /api/percentage` | ✓ completed ~16s | ✓ completed ~111s（201s 尺） |
| 5 download | `POST /api/signed-url/multi-download` | ✓ | ✓ |
| — MP3 取得 | 署名URL `GET` | ✓ 0.57MB | ✓ 3.84MB |

**de-risk 確定事項（Phase B = §4① purchase 未実証 へ向けて）：**

1. **MP3 は purchase 前に無料取得可**を実証。`multi-download` が purchase なしで返したキー：
   `FinalMaster.mp3`, `OriginalMix.mp3`, `MasteringReport.json`（両曲とも同一）。
2. **WAV は purchase 前の download 応答に現れない**（`.wav` キー無し）。→ **Phase B の purchase が WAV キーを解錠する**機構を裏付け（refresh §21「MP3無料／WAVはpurchase後」と一致）。Phase B は「purchase → 再 download で `.wav` キー出現 → DL」を確認すればよい。
3. **おまけ：`OriginalMix.mp3` も無料**で返る（入力の MP3 版）＝Cryo 側でも before/after プレビューが無料で揃う。
4. **`MasteringReport.json`**（Cryo 自己分析）も無料応答に含まれる（本 Phase では未取得・Phase B で参照可）。
5. **purchase 未発火**：スクリプトに purchase 経路が存在しない（構造的保証）。

## 粗 objective（deliverable ④・informational のみ）

ffmpeg `ebur128 peak=true`。**MP3 は lossy** ゆえ参考値（true peak は codec のインターサンプル overshoot を含む）。**本番 blind A/B は Phase B の WAV**。

| 曲 | 区分 | Integrated LUFS | LRA (LU) | True peak (dBTP) |
|----|------|-----------------|----------|------------------|
| 曲1 liberation | 入力 WAV | −16.4 | 3.7 | −0.6 |
| 曲1 liberation | **Cryo master MP3** | **−12.5** | 3.1 | +0.7※ |
| 曲2 2mix | 入力 WAV | −11.1 | 9.3 | +0.6 |
| 曲2 2mix | **Cryo master MP3** | **−12.5** | 9.8 | 0.0 |

※曲1 の +0.7 dBTP は MP3 デコードの overshoot 込み（informational）。

**観察（数値の事実のみ・良し悪し判定はしない＝judge は kimny の耳）：**
- **Cryo neutral master は両曲とも integrated ≈ −12.5 LUFS に着地**（入力 −16.4 でも −11.1 でも同一）。→ Cryo default の loudness target が ≈ −12.5 LUFS である示唆。
- LRA：曲1 3.7→3.1（やや圧縮）、曲2 9.3→9.8（ほぼ保持）。dynamics を強く潰してはいない。
- true peak：曲2 は 0.0 dBTP に制御。曲1 の MP3 値は overshoot 込みで参考外。

## 成果物（artifacts・全て gitignore `.cryo-phase-a/`）

- `.cryo-phase-a/in/song1_liberation_44k16.wav` / `song2_2mix_48k24.wav`（Cryo へ送った実バイト）
- `.cryo-phase-a/out/song1_liberation.mp3` / `song2_2mix.mp3`（Cryo master MP3）
- `.cryo-phase-a/out/phase-a-result.json`（各段成否・sessionId・download keys）
- ドライバ：`scripts/cryo-phase-a.ts`（purchase 非搭載・Phase B 再実行可）

## Phase B（kimny gate・Tier3）への引き継ぎ

- Phase B = **初の本番 financial action**（`POST /api/api-checkout`）。本 Phase で upload→run→poll→MP3 が clean = purchase 以外の全経路は de-risk 済。
- Phase B 追加確認点：①purchase 成功ログ（§4① を埋める）②purchase 後 `multi-download` に `.wav` キー出現 → WAV DL ③WAV で本番 blind A/B（ラウドネス整合後・kimny の耳）。
- **判定セクションは kimny の耳**（protocol 規律）＝AI は「どちらが上か」を書かない。

## blocker

**なし。** 両曲とも全段クリーン完走。
