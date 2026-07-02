"use client";

// Single-CTA slot for MUED advisory (free 60-min consultation).
// STAGED STUB: plain <a> mailto (not next/link — mailto is not a route). advisory #8
// (mued課) owns this component and swaps the internals to the pure-code booking flow
// (.ics + Jitsi + curated slots) once #8 lands. Keep the public surface (props: { label })
// stable so the LP PR and the #8 PR don't touch the same lines and can proceed in parallel.
const CONTACT_EMAIL = "support@mued.jp";
const SUBJECT = "無料60分相談希望";

export function AdvisoryPrimaryCta({ label }: { label: string }) {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}`}
      className="inline-flex items-center px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-lg"
    >
      {label}
    </a>
  );
}
