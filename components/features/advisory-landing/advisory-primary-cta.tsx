"use client";

// Single-CTA for MUED advisory (free 60-min consultation). Opens the #8 booking modal.
// 案C reuses this ONE component for all CTA placements (nav link / right-edge vertical tab / hero
// + contact buttons) via `variant` — every trigger opens the same booking flow (single-CTA rule).
// Each instance owns its own modal state (only one open at a time). Warm paper surfaces with the shared amber accent.
import { useState } from "react";
import { useLocale } from "next-intl";
import { trackEvent } from "@/lib/analytics/gtag";
import { AdvisoryBookingModal } from "./advisory-booking-modal";

type Variant = "button" | "tab" | "link";

export function AdvisoryPrimaryCta({ label, variant = "button" }: { label: string; variant?: Variant }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();

  const onClick = () => {
    trackEvent({ action: "advisory_cta_click", params: { locale, variant } });
    setOpen(true);
  };

  let trigger;
  if (variant === "tab") {
    // 案C signature: fixed right-edge vertical tab, scroll-following.
    trigger = (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 rounded-l-lg bg-accent px-2.5 py-5 text-sm font-semibold tracking-wide text-[var(--ink-0)] shadow-md transition-colors hover:bg-[#ffc76b] [writing-mode:vertical-rl] md:block"
      >
        {label}
      </button>
    );
  } else if (variant === "link") {
    trigger = (
      <button
        type="button"
        onClick={onClick}
        className="text-sm font-semibold text-accent transition-colors hover:text-[#ffc76b]"
      >
        {label}
      </button>
    );
  } else {
    trigger = (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] bg-accent px-8 py-3.5 text-base font-semibold text-[var(--ink-0)] transition-colors hover:bg-[#ffc76b]"
      >
        {label}
      </button>
    );
  }

  return (
    <>
      {trigger}
      <AdvisoryBookingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
