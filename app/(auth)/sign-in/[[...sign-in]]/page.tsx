import { BrandMark } from "@/components/brand/brand-mark";
import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Sign In Page
 *
 * MUED branded authentication page
 * - Split layout: branding (left) + Clerk (right)
 * - Dark theme matching MUED design
 * - Responsive: stacked on mobile
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex" style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif' }}>
      {/* Left: MUED Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 brand-auth-art">
        <div className="max-w-md text-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <BrandMark />
          </Link>

          {/* Tagline */}
          {/* The mark above already reads "MUED." — the visible heading duplicated it (kimny 2026-09-30).
              Kept for screen readers so the page still has its h1. */}
          <h1 className="sr-only">MUED</h1>
          <p className="text-xl text-amber-400 mb-6">
            Making music visible.
          </p>
        </div>
      </div>

      {/* Right: Clerk Sign In */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8 text-center">
          <Link href="/">
            <BrandMark />
          </Link>
        </div>

        {/* ★Nothing above the Clerk card (kimny 2026-09-30: 「こんないらないこと、書くんじゃない！」). The
           note about passwords that used to sit here was removed (it was not a fact: Google / Apple
           sign-in keeps a password behind it). Clerk's own card is the page. */}

        <SignIn
          fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
          signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}
          appearance={{
            variables: {
              colorPrimary: "#f5a524",
              colorBackground: "#1a1b18",
              colorText: "#f0eee7",
              colorTextOnPrimaryBackground: "#000000",
              colorTextSecondary: "#c1c2b8",
              colorInputBackground: "#111210",
              colorInputText: "#ffffff",
              colorNeutral: "#ffffff",
            },
            elements: {
              rootBox: "mx-auto w-full max-w-md",
              card: "bg-[var(--bg-surface)] border border-white/10 shadow-2xl !text-white",
              headerTitle: "!text-white",
              headerSubtitle: "!text-slate-400",
              socialButtonsBlockButton: "!bg-white/5 !border-white/10 !text-white hover:!bg-white/10",
              socialButtonsBlockButtonText: "!text-white",
              // Apple's mark ships black; on this dark card it disappears. Apple's guidelines allow the white
              // logo on dark backgrounds. Google's multicolour "G" stays as it is (its dark-theme button keeps it).
              socialButtonsProviderIcon__apple: "!invert",
              dividerLine: "!bg-white/10",
              dividerText: "!text-slate-500",
              formFieldLabel: "!text-slate-300",
              formFieldInput: "!bg-[var(--bg-base)] !border-white/10 !text-white placeholder:!text-slate-500",
              formButtonPrimary: "!bg-accent hover:!bg-[#ffc76b] !text-black",
              footerActionLink: "!text-amber-400 hover:!text-amber-300",
              footerActionText: "!text-slate-400",
              footer: "!text-slate-400",
              identityPreviewEditButton: "!text-amber-400",
              identityPreviewText: "!text-white",
              formFieldAction: "!text-amber-400",
              formFieldInputShowPasswordButton: "!text-slate-400",
              alert: "!bg-red-500/10 !border-red-500/20 !text-red-400",
              alertText: "!text-red-400",
              otpCodeFieldInput: "!border-white/20 !text-white",
            },
          }}
        />

        {/* Back to home */}
        <Link
          href="/"
          className="mt-8 text-slate-500 hover:text-white text-sm transition-colors"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}