import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
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
    <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: 'var(--font-sora), system-ui, sans-serif' }}>
      {/* Left: MUED Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-[#0a0a0a] to-[#111113]">
        <div className="max-w-md text-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/logo.webp"
              alt="MUED"
              width={120}
              height={120}
              className="drop-shadow-2xl"
            />
          </Link>

          {/* Tagline */}
          <h1 className="text-3xl font-bold text-white mb-4">
            MUED
          </h1>
          <p className="text-xl text-amber-400 mb-6">
            Making music visible.
          </p>

          {/* Description */}
          <p className="text-slate-400 leading-relaxed">
            Your companion in music production.<br />
            Rest reminders, sound reactive, voice memos.
          </p>
        </div>
      </div>

      {/* Right: Clerk Sign In */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8 text-center">
          <Link href="/">
            <Image
              src="/logo.webp"
              alt="MUED"
              width={80}
              height={80}
              className="mx-auto mb-4 drop-shadow-lg"
            />
          </Link>
          <h1 className="text-2xl font-bold text-white">MUED</h1>
        </div>

        {/*
         * Passwordless hint — the door never says the password is skippable.
         *
         * The rendered form is only "Email address or username" + "Password" + Continue:
         * no "Optional" marker, no "email me a code" affordance. Meanwhile the welcome
         * email promises "your email is the key … no password to remember"
         * (`lib/services/email.service.ts`), and portal users are passwordless signups —
         * they have no password to type. That leaves Apple/Google as the only route that
         * looks usable, which is exactly what an in-app webview blocks.
         *
         * The claim here is provable from the instance config alone (Clerk FAPI
         * /v1/environment): `password.used_for_first_factor: false` with `first_factors: []`
         * means a password can never be demanded to sign in, and `password.required: false`
         * means signups aren't given one. So "no password needed" is true regardless of what
         * the next screen does.
         *
         * Deliberately says nothing about what happens after Continue ("we'll email you a
         * code"). That is a claim about the NEXT screen's behaviour and is not verified yet;
         * it lands in a follow-up once the walkthrough confirms it.
         *
         * Wording holds on every sub-route of this catch-all — /sign-in/factor-one (the code
         * entry screen, which has no password field) and /sign-in/sso-callback render this
         * same shell, so anything phrased as "leave the password blank" would appear with
         * nothing to refer to.
         *
         * NOT `localization.formFieldLabel__password`: `localization` sits on ClerkOptions
         * (ClerkProvider-wide), so it would also relabel the password field on sign-up and on
         * UserProfile's set/change-password screens, where "you don't need one" is wrong.
         * Not a placeholder either — placeholders vanish as soon as the user types.
         *
         * Right column on purpose: the left pane is `hidden lg:flex`, so anything placed
         * there is invisible to the mobile cohort this is for. Bilingual because this route
         * has no locale segment (it lives outside app/[locale]) and Clerk renders English.
         */}
        <p className="mb-4 max-w-md text-center text-sm leading-relaxed text-slate-400">
          <span className="text-slate-300">No password needed — your email address is enough.</span>
          <br />
          パスワードは不要です。メールアドレスだけでご利用いただけます。
        </p>

        <SignIn
          fallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL}
          signUpFallbackRedirectUrl={process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL}
          appearance={{
            variables: {
              colorPrimary: "#f5a524",
              colorBackground: "#111113",
              colorText: "#ffffff",
              colorTextOnPrimaryBackground: "#000000",
              colorTextSecondary: "#94a3b8",
              colorInputBackground: "#0a0a0a",
              colorInputText: "#ffffff",
              colorNeutral: "#ffffff",
            },
            elements: {
              rootBox: "mx-auto w-full max-w-md",
              card: "bg-[#111113] border border-white/10 shadow-2xl !text-white",
              headerTitle: "!text-white",
              headerSubtitle: "!text-slate-400",
              socialButtonsBlockButton: "!bg-white/5 !border-white/10 !text-white hover:!bg-white/10",
              socialButtonsBlockButtonText: "!text-white",
              dividerLine: "!bg-white/10",
              dividerText: "!text-slate-500",
              formFieldLabel: "!text-slate-300",
              formFieldInput: "!bg-[#0a0a0a] !border-white/10 !text-white placeholder:!text-slate-500",
              formButtonPrimary: "!bg-amber-500 hover:!bg-amber-400 !text-black",
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