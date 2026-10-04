/**
 * The paid BUY button — one look for every product that sells (masterchain now, MUEDvox at launch).
 *
 * kimny 2026-10-04 (conductor の窓):「購入とデモ（および無料）とで区別したい」. The buy button is brighter
 * (#ffbe3d) and glows; the demo's Try and the free three's download stay #f5a524 with no glow. Same shape as the
 * free button (radius, padding, weight, full width on a phone) — only the colour and the glow differ.
 * Rejected: white, red-orange, outline only (「白じゃあ重要度が下がっちゃう」「赤もダメ」「中抜きもダメ」).
 * Mock: _conductor/designsystem/muedsp-buy-button/D4-bright-glow.png.
 * ★The sales-path guard (e2e/sales-path/cta.spec.ts) pins these values: change them there too.
 */
export const BUY_BUTTON_CLASS =
  "w-full sm:w-auto rounded-[var(--radius-lg)] bg-[#ffbe3d] px-6 py-3.5 font-semibold text-black " +
  "shadow-[0_0_18px_rgba(255,190,61,0.55)] transition-[background-color,box-shadow] " +
  "hover:bg-[#ffc95e] hover:shadow-[0_0_24px_rgba(255,190,61,0.7)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#ffbe3d] " +
  "focus-visible:shadow-[0_0_24px_rgba(255,190,61,0.7)]";
