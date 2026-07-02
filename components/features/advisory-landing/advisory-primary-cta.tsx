"use client";

// Single-CTA slot for MUED advisory (free 60-min consultation).
// advisory #8 swap (mued課): opens the pure-code booking modal (curated slots → .ics + fixed
// Google Meet link). Public surface (props: { label }) is unchanged from the staged mailto stub, so
// the LP is untouched — only this component's internals changed. Used in both the hero and footer
// CTA; each instance owns its own modal state (only one is open at a time).
import { useState } from "react";
import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/gtag";
import { AdvisoryBookingModal } from "./advisory-booking-modal";

export function AdvisoryPrimaryCta({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackEvent({ action: "advisory_cta_click", params: { locale } });
          setOpen(true);
        }}
        className="inline-flex min-h-[44px] items-center rounded-xl bg-amber-500 px-8 py-4 text-lg font-bold text-black transition-colors hover:bg-amber-400"
      >
        {label}
      </button>
      <AdvisoryBookingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
