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

## 客観指紋（deliverable ④・protocol §A・**informational のみ**）

dsp 課（#174・peer `tk4s16a8`）の**汎用測定リグ `measure_master_fingerprint.py` を流用**（protocol §3「mued が Cryo を**同一指標**で測る」＝独自リグを作らず engine 間で指標を揃える）。Cryo 出力を MUEDsp 署名マスター（norm/clean/loud・`muedsp_cryo_compare_20260622/`）+ raw input と同一リグで並べた。

> ⚠️ **Cryo 行は MP3 デコード由来**（リグは PCM WAV を取るため MP3→f32 WAV にデコードして測定）。**dBTP・PSR・stereo は lossy の影響を受ける**（特に Cryo の dBTP は codec overshoot 込み＝>0 になり得る）。LRA/PLR/crest/tonal は比較的頑健だが厳密でない。**§A の公正な Cryo 指紋は Phase B の WAV**。本表は同一指標で並べた**参考値**。

### 曲1 — liberation

| master | LUFS-I | dBTP | PLR | crest | LRA | PSR(med/min) | Side/Mid | L/R corr | mono Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw input | -16.40 | -0.60 | 15.79 | 17.81 | 3.95 | 13.48/11.16 | -9.48 | +0.798 | -0.51 |
| **Cryo (MP3*)** | -12.56 | +0.65 | 13.20 | 14.96 | 3.21 | 12.41/10.81 | -7.21 | +0.681 | -0.90 |
| MUEDsp norm | -12.49 | -0.89 | 11.60 | 13.82 | 3.82 | 11.81/9.07 | -8.50 | +0.753 | -0.64 |
| MUEDsp clean | -14.20 | -1.23 | 12.97 | 15.36 | 3.78 | 12.73/10.66 | -8.50 | +0.753 | -0.64 |
| MUEDsp loud | -9.89 | -0.58 | 9.31 | 11.51 | 2.63 | 8.99/7.19 | -8.45 | +0.751 | -0.65 |

### 曲2 — forMUEDialMater 2mix

| master | LUFS-I | dBTP | PLR | crest | LRA | PSR(med/min) | Side/Mid | L/R corr | mono Δ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| raw input | -11.14 | +0.59 | 11.73 | 13.45 | 9.39 | 10.83/8.40 | -10.58 | +0.839 | -0.52 |
| **Cryo (MP3*)** | -12.53 | +0.02 | 12.54 | 14.73 | 9.77 | 11.08/8.25 | -7.82 | +0.716 | -0.97 |
| MUEDsp norm | -9.58 | -0.53 | 9.05 | 11.28 | 5.91 | 8.08/7.21 | -9.84 | +0.812 | -0.61 |
| MUEDsp clean | -10.34 | -0.53 | 9.81 | 12.08 | 7.44 | 9.04/7.51 | -9.68 | +0.805 | -0.63 |
| MUEDsp loud | -8.81 | -0.53 | 8.28 | 10.39 | 2.98 | 7.55/6.61 | -10.18 | +0.825 | -0.59 |

（octave-band tonal curve は artifact `.cryo-phase-a/out/fingerprint_song{1,2}.md` に併記。Legend は同ファイル。）

**観察（数値の事実のみ・良し悪し判定はしない＝judge は kimny の耳・protocol §B）：**
- **loudness 着地**：Cryo neutral は両曲とも LUFS-I ≈ **−12.5**（曲1 −12.56 / 曲2 −12.53）＝入力に依らず一定。曲1 では **Cryo ≈ MUEDsp norm（−12.5）**、曲2 では MUEDsp norm（−9.58）の方が大きい＝両者の loudness 関係は曲依存。（初回 ffmpeg ebur128 でも Cryo ≈ −12.5 を確認＝相互整合。）
- **dynamics**：Cryo は LRA を保持寄り（曲2 9.77＝raw 9.39 をほぼ維持、MUEDsp norm は 5.91 へ圧縮）。PLR/crest も Cryo > MUEDsp norm の傾向。
- **true peak**：MUEDsp は norm/clean/loud すべて dBTP ≤ −0.5 に制御。Cryo の dBTP（曲1 +0.65 / 曲2 +0.02）は MP3 overshoot 込み＝参考外。
- **stereo**：Cryo は Side/Mid 高め（広め）・L/R corr 低め・mono Δ やや大（曲ごと一貫）。
- ※これらは Phase B WAV で要再測定（MP3 由来の偏りを除去）。同一リグゆえ WAV が揃えば即 engine 横並び可能。

## 成果物（artifacts・全て gitignore `.cryo-phase-a/`）

- `.cryo-phase-a/in/song1_liberation_44k16.wav` / `song2_2mix_48k24.wav`（Cryo へ送った実バイト）
- `.cryo-phase-a/out/song1_liberation.mp3` / `song2_2mix.mp3`（Cryo master MP3）
- `.cryo-phase-a/out/song1_liberation_cryo.wav` / `song2_2mix_cryo.wav`（測定用に MP3→f32 デコード）
- `.cryo-phase-a/out/fingerprint_song1.md` / `fingerprint_song2.md`（dsp リグ出力＝指紋+tonal+legend）
- `.cryo-phase-a/out/phase-a-result.json`（各段成否・sessionId・download keys）
- ドライバ：`scripts/cryo-phase-a.ts`（purchase 非搭載・Phase B 再実行可）
- 測定リグ（dsp 課・流用）：`_mued-dsp/tests/standalone/measure_master_fingerprint.py`／MUEDsp 比較マスター：`_mued-dsp/plugin/reference_audio/muedsp_cryo_compare_20260622/`

## Phase B（kimny gate・Tier3）への引き継ぎ

- Phase B = **初の本番 financial action**（`POST /api/api-checkout`）。本 Phase で upload→run→poll→MP3 が clean = purchase 以外の全経路は de-risk 済。
- Phase B 追加確認点：①purchase 成功ログ（§4① を埋める）②purchase 後 `multi-download` に `.wav` キー出現 → WAV DL ③WAV で本番 blind A/B（ラウドネス整合後・kimny の耳）。
- **判定セクションは kimny の耳**（protocol 規律）＝AI は「どちらが上か」を書かない。

## blocker

**なし。** 両曲とも全段クリーン完走。
