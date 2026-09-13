"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLocale } from "@/lib/i18n/locale-context";
import { HooMasthead } from "@/components/dashboard/hoo-masthead";
import { BrandMark } from "@/components/brand/brand-mark";

/**
 * MUEDnote Header
 *
 * Simplified header for MUEDnote dashboard
 * - MUEDnote branding (not LMS)
 * - Language switcher for i18n
 * - No subscription info (handled separately)
 */
export function MuednoteHeader() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { t } = useLocale();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="brand-workspace-header sticky top-0 z-50">
      <div className="brand-workspace-main px-5 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <BrandMark compact />
          </Link>

          {/* Right side actions. min-w-0 lets the credit line absorb a narrow viewport by
              ellipsizing; shrink-0 keeps the two controls at their natural width so they
              never restack into vertical single-character columns. */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <HooMasthead />
            <div className="shrink-0">
              <LanguageSwitcher />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0 whitespace-nowrap"
            >
              {t.muednote.header.signOut}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
