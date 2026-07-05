"use client";

// 案C (hscnet editorial) — light theme, teal single accent. Reuses all advisory.* i18n keys
// (no hardcoded copy) and the single booking CTA (AdvisoryPrimaryCta). Section order per the
// content課 mapping: Hero → ABOUT → PROCESS → PRICING → APPROACH → FAQ → CONTACT. Staged behind
// ADVISORY_LIVE (page.tsx robots). Light styling is scoped here — the app's dark tokens are untouched.
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { AdvisoryPrimaryCta } from "./advisory-primary-cta";
import { AdvisoryHeaderImage } from "./advisory-header-image";
import { AdvisoryHeroSection } from "./advisory-hero-section";
import { AdvisoryWhoSection } from "./advisory-who-section";
import { AdvisoryStepsSection } from "./advisory-steps-section";
import { AdvisoryPricingSection } from "./advisory-pricing-section";
import { AdvisoryMyWaySection } from "./advisory-my-way-section";
import { AdvisoryFaqSection } from "./advisory-faq-section";
import { AdvisoryCtaSection } from "./advisory-cta-section";

export function AdvisoryLandingContent() {
  const locale = useLocale();
  const tf = useTranslations("advisory.footer");
  // nav link + vertical tab use the short label (avoids a 2-line wrap in the tight header/tab);
  // the Hero and CONTACT buttons keep the full hero.cta / footerCta.cta.
  const tcta = useTranslations("advisory.cta");

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header — logo mark (placeholder, mued/design owns the final SVG) + wordmark + CTA link */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href={`/${locale}`} className="flex items-center gap-2.5">
            <svg width="18" height="22" viewBox="0 0 18 22" fill="none" aria-hidden="true">
              <rect x="0" y="1" width="6" height="20" rx="1.5" fill="#0d9488" />
              <rect x="10" y="1" width="6" height="20" rx="1.5" fill="#134e4a" />
            </svg>
            <span className="text-lg font-bold tracking-wide text-neutral-900">MUED</span>
            <span className="hidden text-[11px] tracking-wider text-neutral-400 sm:inline">glasswerks inc.</span>
          </Link>
          <div className="flex items-center gap-5">
            {/* header CTA hidden on mobile (cramped) — the Hero CTA sits right below; shown md+ alongside the vertical tab */}
            <span className="hidden md:inline-block">
              <AdvisoryPrimaryCta label={tcta("short")} variant="link" />
            </span>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      {/* 案C signature: fixed right-edge vertical CTA tab */}
      <AdvisoryPrimaryCta label={tcta("short")} variant="tab" />

      <main>
        <AdvisoryHeaderImage />
        <AdvisoryHeroSection />
        <AdvisoryWhoSection />
        <AdvisoryStepsSection />
        <AdvisoryPricingSection />
        <AdvisoryMyWaySection />
        <AdvisoryFaqSection />
        <AdvisoryCtaSection />
      </main>

      <footer className="border-t border-neutral-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {tf("operator")}／{tf("contact")}
            </p>
            <nav className="flex items-center gap-6">
              <Link href={`/${locale}/tokushoho`} className="text-sm text-neutral-500 transition-colors hover:text-teal-700">
                {tf("legalLink")}
              </Link>
              <Link href={`/${locale}/privacy`} className="text-sm text-neutral-500 transition-colors hover:text-teal-700">
                {tf("privacyLink")}
              </Link>
            </nav>
            <p className="border-t border-neutral-200 pt-4 text-sm text-neutral-400">{tf("signature")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
