"use client";

// Single email-only contact CTA for MUED advisory. The inquiry address is canonicalized in i18n and
// every placement (nav, tab, hero and closing contact) uses the same mailto route.
import { useLocale, useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/gtag";

type Variant = "button" | "tab" | "link";

export function AdvisoryPrimaryCta({ label, variant = "button" }: { label: string; variant?: Variant }) {
  const locale = useLocale();
  const t = useTranslations("advisory.contact");

  const onClick = () => {
    trackEvent({ action: "advisory_cta_click", params: { locale, variant } });
  };

  if (variant === "tab") {
    return (
      <a
        href={`mailto:${t("email")}`}
        onClick={onClick}
        aria-label={label}
        className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 rounded-l-lg bg-accent px-2.5 py-5 text-sm font-semibold tracking-wide text-[var(--ink-0)] shadow-md transition-colors hover:bg-[#ffc76b] [writing-mode:vertical-rl] md:block"
      >
        {label}
      </a>
    );
  }

  if (variant === "link") {
    return (
      <a
        href={`mailto:${t("email")}`}
        onClick={onClick}
        className="text-sm font-semibold text-accent transition-colors hover:text-[#ffc76b]"
      >
        {label}
      </a>
    );
  }

  return (
    <a
      href={`mailto:${t("email")}`}
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] bg-accent px-8 py-3.5 text-base font-semibold text-[var(--ink-0)] transition-colors hover:bg-[#ffc76b]"
    >
      {label}
    </a>
  );
}
