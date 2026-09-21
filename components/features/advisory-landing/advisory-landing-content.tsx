"use client";

// Editorial layout — warm paper, shared amber accent. Reuses all advisory.* i18n keys
// (no hardcoded copy) and the single booking CTA (AdvisoryPrimaryCta). Section order per the
// content課 mapping: Hero → ABOUT → PROCESS → PRICING → APPROACH → FAQ → CONTACT. Staged behind
// ADVISORY_LIVE (page.tsx robots). Light styling is scoped here — the app's dark tokens are untouched.
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BrandHeader } from "@/components/brand/brand-header";
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
  const tContact = useTranslations("advisory.contact");
  // nav link + vertical tab use the short label (avoids a 2-line wrap in the tight header/tab);
  // the Hero and CONTACT buttons keep the full hero.cta / footerCta.cta.
  const tcta = useTranslations("advisory.cta");

  return (
    <div className="min-h-screen bg-[var(--brand-paper)] text-neutral-900">
      {/* Shared Hoo mark, navigation and booking CTA */}
      <BrandHeader locale={locale} product="MUED advisory">
        <span className="hidden lg:inline-block"><AdvisoryPrimaryCta label={tcta("short")} variant="link" /></span>
      </BrandHeader>

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

      <footer className="border-t border-neutral-200 bg-[var(--brand-paper)] py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {tf("operator")}／{tf("contactLabel")} {" "}
              <a href={`mailto:${tContact("email")}`} className="text-[#865109] hover:underline">
                {tContact("email")}
              </a>
            </p>
            <nav className="flex items-center gap-6">
              <Link href={`/${locale}/tokushoho`} className="text-sm text-neutral-500 transition-colors hover:text-[#865109]">
                {tf("legalLink")}
              </Link>
              <Link href={`/${locale}/privacy`} className="text-sm text-neutral-500 transition-colors hover:text-[#865109]">
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
