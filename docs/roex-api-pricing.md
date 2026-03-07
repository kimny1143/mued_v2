# RoEx Tonn API - Pricing & Credit System

> Last verified: 2026-03-07
> Sources: https://tonn-portal.roexaudio.com/pricing, https://roex.stoplight.io/docs/tonn-api

---

## Credit Packages

| Package | Credits | Price   | Unit Cost  | Discount |
|---------|---------|---------|------------|----------|
| Small   | 1,000   | $10.00  | $0.0100/cr | -        |
| Medium  | 5,000   | $45.00  | $0.0090/cr | 10% off  |
| Large   | 10,000  | $80.00  | $0.0080/cr | 20% off  |

- New accounts receive **1,000 free credits** to get started
- Payments powered by Stripe
- Auto top-up available (triggers when balance falls below threshold)

## Credit Rules

- Credits **expire 12 months** after purchase (unused credits do not carry over)
- Credits are deducted when **retrieving completed audio files**, not when submitting jobs
- All purchases are **non-refundable**
- Generated track download URLs are valid for **24 hours**
- Upload signed URLs are valid for **1 hour**

---

## Service Pricing (Multitrack Mixing)

These are the endpoints MUEDial uses:

### 1. Upload: `POST /upload` - FREE

- Returns `signed_url` (for PUT upload) and `readable_url` (for API references)
- Both URLs valid for 1 hour
- Supported formats: MP3, WAV, FLAC
- No credit cost

### 2. Mix Preview: `POST /mixpreview` - FREE (0 credits)

- Creates a preview mix task
- Max 32 tracks, each up to 8 minutes
- Min 2 tracks required
- Returns `multitrack_task_id` for polling
- **FREE for accounts with purchased credits**
- Parameters per track: `trackURL`, `instrumentGroup`, `presenceSetting`, `panPreference`, `reverbPreference`
- Session-level: `musicalStyle`, `returnStems`, `sampleRate`, `webhookURL` (required)

**IMPORTANT - Preview length (verified 2026-03-07):**
RoEx pricing page says "30-second mixed preview" but actual behavior differs by service:
- **Mixing preview = FULL LENGTH (MP3)** — verified with 90-second test tracks, file size 3MB
- **Mastering preview = 30 seconds (MP3)** — verified with same tracks, file size 469KB

This means mixing previews give users the complete song in MP3 format for free.
The value of the final mix (250 cr) is: WAV format + custom audio effect overrides.

### 3. Retrieve Preview: `POST /retrievepreviewmix` - FREE or 125 credits

- Polls/retrieves preview mix result
- Parameters: `multitrackTaskId`, `retrieveFXSettings` (boolean, required)

| retrieveFXSettings | Credits | Returns                                    |
|--------------------|---------|--------------------------------------------|
| `false`            | FREE    | Preview URL, stems URLs, status             |
| `true`             | **125** | Above + mix_output_settings (EQ, DRC, gain, pan per track) |

- FX settings include per-track: `drc_settings`, `eq_settings`, `gain_settings`, `panning`
- **IMPORTANT**: The 125cr cost for FX settings is deducted from the final mix cost (see below)

### 4. Final Mix: `POST /retrievefinalmix` - 250 credits (or 125 if FX already retrieved)

- Submits AND retrieves the final full-length mix with custom audio effects
- Request body key: `applyAudioEffectsData`
- Parameters per track: `trackURL`, `gainDb`, `panning_settings`, `eq_settings`, `compression_settings`
- Optional: `returnStems` (bool), `createMaster` (bool), `desiredLoudness`, `sampleRate`

**Preview vs Final (verified with PoC data):**
- Preview: full-length **MP3** with RoEx AI auto-settings (FREE)
- Final: full-length **WAV** with user-customized EQ/comp/gain/pan overrides (250 cr)
- Final stems: individual **WAV** tracks with processing applied (+50 cr)

| Scenario                           | Credits Charged |
|------------------------------------|-----------------|
| Final mix (no prior FX retrieval)  | **250**         |
| Final mix (FX already retrieved)   | **125** (250 - 125 already paid) |

- Doc quote: "If a preview mix already provided FX settings, only the difference in cost is charged."

### 5. Processed Stems - 50 credits (additional)

- Set `returnStems: true` in `/retrievefinalmix`
- Returns individually processed stems from the multitrack mix
- Useful for sync licensing or remixing

---

## Other Services (Not Currently Used by MUEDial)

| Service                          | Endpoint                 | Credits |
|----------------------------------|--------------------------|---------|
| Mastering - Preview              | `/masteringpreview`      | FREE    |
| Mastering - Retrieve Preview     | `/retrievepreviewmaster` | FREE    |
| Mastering - Final Track          | `/retrievefinalmaster`   | **220** |
| Mix Analysis                     | `/mixanalysis`           | **10** (※) |
| Audio/Instrument Cleanup         | (cleanup endpoint)       | **10**  |
| Mix Enhance - Preview            | (enhance preview)        | FREE    |
| Mix Enhance - Standard           | (enhance full)           | **250** |
| Mix Enhance + Stem Processing    | (enhance + stems)        | **280** |
| Mix Enhance + Stems Preview      | (enhance stems preview)  | **10**  |

---

### Mix Analysis クレジット不一致 (要検証)

RoEx価格ページでは Mix Analysis = 10 credits と記載があるが、ダッシュボードの実績では
「Mix Diagnosis」として **5 credits** ずつ消費されている (2026-03-05 PoC テスト)。

考えられる原因:
- RoEx側の文書の誤記 (実際は5cr)
- 内部的に2回APIコールで合計10cr (ただしダッシュボード上は1件=5crで個別表示)
- 「Mix Diagnosis」と「Mix Analysis」が別サービスの可能性

MUEDialで本格利用する際に実測で確定させること。

---

## MUEDial Credit Cost per Session

### Omakase Mode (fully automated)

| Step                          | Endpoint              | Credits |
|-------------------------------|-----------------------|---------|
| Upload tracks                 | `/upload`             | 0       |
| Generate preview              | `/mixpreview`         | 0       |
| Poll preview (no FX settings) | `/retrievepreviewmix` | 0       |
| Generate final mix            | `/retrievefinalmix`   | **250** |
| **Total**                     |                       | **250** |

### Dialogue Mode (user adjusts via Hoo chat)

| Step                          | Endpoint              | Credits |
|-------------------------------|-----------------------|---------|
| Upload tracks                 | `/upload`             | 0       |
| Generate preview              | `/mixpreview`         | 0       |
| Poll preview (no FX)          | `/retrievepreviewmix` | 0       |
| Re-generate preview (after chat adjustments) | `/mixpreview` | 0 |
| Poll again (still no FX)      | `/retrievepreviewmix` | 0       |
| ... (user can iterate previews unlimited times for FREE) |  | 0 |
| Retrieve FX settings (for final) | `/retrievepreviewmix` (retrieveFXSettings=true) | **125** |
| Generate final mix            | `/retrievefinalmix`   | **125** (250-125) |
| **Total**                     |                       | **250** |

### Optional Add-ons

| Add-on              | Additional Credits | Total with Mixing |
|---------------------|--------------------|-------------------|
| Processed Stems     | +50                | 300               |
| Mastering           | +220               | 470               |
| Stems + Mastering   | +270               | 520               |

### Cost in USD (per session)

| Mode      | Small pkg ($0.01/cr) | Large pkg ($0.008/cr) |
|-----------|----------------------|-----------------------|
| Mix only  | $2.50                | $2.00                 |
| + Stems   | $3.00                | $2.40                 |
| + Master  | $4.70                | $3.76                 |
| + Both    | $5.20                | $4.16                 |

---

## Code Issue: `/applyaudioeffects` Endpoint

**CRITICAL**: Our `lib/roex/mixing.ts` has `mixFinalBasic()` and `mixFinalAdvanced()` calling
`POST /applyaudioeffects`, but this endpoint is **NOT listed in the Stoplight API documentation**.

The documented endpoint for final mix is `POST /retrievefinalmix`:
- Same request body structure (`applyAudioEffectsData`)
- Same response structure (`applyAudioEffectsResults`)

Our `pollMixFinal()` correctly uses `/retrievefinalmix`.

**Status**: `/applyaudioeffects` appears to work (dev key tests pass), likely an older alias.
However, it's undocumented and may be deprecated without notice.

**Recommendation**: Change `mixFinalBasic` and `mixFinalAdvanced` to use `/retrievefinalmix`
to align with the documented API. Since the body/response format is identical, this should be
a drop-in replacement.

---

## API Constraints

| Constraint              | Value                    |
|-------------------------|--------------------------|
| Max tracks per session  | 32                       |
| Min tracks per session  | 2                        |
| Max track duration      | 8 minutes                |
| Upload URL validity     | 1 hour                   |
| Download URL validity   | 24 hours                 |
| Supported formats       | WAV, MP3, FLAC           |
| Sample rates            | 44100 (16-bit), 48000 (24-bit) |
| Credit expiry           | 12 months after purchase |

## Webhook vs Polling

- `webhookURL` is **mandatory** in `/mixpreview` and `/retrievefinalmix` requests
- MUEDial uses a dummy webhook (`https://httpbin.org/post`) and polls instead
- Polling is done via `/retrievepreviewmix` (preview) and `/retrievefinalmix` (final)
- Webhook approach is recommended for production; polling is for debugging per RoEx docs

## Known Issues (Resolved)

### Polling bug: unnecessary FX retrieval (Fixed 2026-03-07)

`GET /api/dial/preview` was polling with `retrieveFxSettings: true`, causing 125 credits
to be consumed on every first successful preview poll — even in omakase mode where FX
settings are not needed.

Dashboard evidence: Mar 05 (08:05, 08:24) and Mar 07 (01:33) show FX Settings charges
with no subsequent Final Mix, wasting ~375 credits total.

Fix: Changed to `retrieveFxSettings: false`. FX settings are now only retrieved in
`/api/dial/final` when needed (dialogue mode).

---

## Account Info

- Current balance: 4,735 credits (as of 2026-03-07)
- Dev key (`ROEX_DEV_API_KEY`): Returns dummy URLs, no credit consumption, final mix fails
- Production key (`ROEX_API_KEY`): Real processing, credits consumed

## RoEx Contact

- Support: support@roexaudio.com
- Enterprise (500+ requests/month): Custom pricing available
- Discord community available for support
