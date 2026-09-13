import Image from "next/image";

// Full-width atmospheric header band (below the sticky nav, above the hero). 案C concept image
// (waveform → faint blueprint grid + diagonal studio light) — it sets mood, not information; the
// hero copy carries the message, so alt="" keeps this decorative image out of the a11y tree.
//
// Source is 21:9 (crop-safe: key elements sit in the central horizontal band with top/bottom margin),
// so object-cover crops gracefully — taller 16:9 on mobile (crops the sides), a slim ~3:1 band on
// desktop (minimal top/bottom crop). object-center keeps the crop on the safe center.
export function AdvisoryHeaderImage() {
  return (
    <div className="relative w-full overflow-hidden aspect-[16/9] sm:aspect-[21/9] md:aspect-[3/1]">
      <Image
        src="/images/advisory-header.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center sepia-[0.8] saturate-50"
      />
    </div>
  );
}
