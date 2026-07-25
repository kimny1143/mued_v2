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
         * Passwordless hint — the door never names the email-code route.
         *
         * What prod actually renders on first paint (measured, screenshot): Apple, Google,
         * a divider, "Email address or username", Continue. The password row IS in the DOM
         * but is collapsed — `opacity: 0` with `height: 0`, i.e. progressive disclosure, not
         * `display: none` (which is why innerText reports it and an earlier reading of this
         * page wrongly called it visible). So nothing on this screen says "we can email you a
         * code": the email route has to be inferred from a field labelled "Email address or
         * username" sitting under two prominent OAuth buttons.
         *
         * That matters because the welcome email promises "your email is the key … no
         * password to remember" (`lib/services/email.service.ts`) and portal users arrive as
         * passwordless signups. The route that *looks* actionable is Apple/Google, which is
         * exactly what an in-app webview blocks.
         *
         * The claim here is provable from the instance config alone (Clerk FAPI
         * /v1/environment): `password.used_for_first_factor: false` with `first_factors: []`
         * means a password can never be demanded to sign in, and `password.required: false`
         * means signups are never forced to set one (some accounts may still have one). So
         * "no password needed" is true regardless of what the next screen does.
         *
         * That also means this copy's truth lives in the Clerk Dashboard, not in this repo:
         * flipping `password.used_for_first_factor` to true would make the line silently
         * false, and no diff, CI run or review here would catch it. The pointer back the
         * other way — "changing this setting invalidates the /sign-in copy" — is carried in
         * the change request for that setting, since whoever edits it is not reading this file.
         *
         * ★ TWO Dashboard settings hold this line up, not one. `email_address.required` is the
         * other: it was turned ON on 2026-07-25, which is what put an email field on /sign-up.
         * If it is turned back OFF, /sign-up loses that field and "your email address is enough"
         * becomes a dead end for anyone without an account again — see PR #757 for what that
         * looked like and what it cost. Same fragility, same reason it is written down here.
         *
         * Deliberately says nothing about what happens after Continue ("we'll email you a
         * code"). That is a claim about the NEXT screen's behaviour and is still unverified —
         * `first_factors: ["email_code"]` makes it the only possible first factor, but that is
         * an inference from config, not an observation of the screen.
         *
         * Wording holds on every sub-route of this catch-all — /sign-in/factor-one (the code
         * entry screen) and /sign-in/sso-callback render this same shell, so anything phrased
         * as "leave the password blank" would appear with nothing to refer to. It also holds
         * if the collapsed password row expands after Continue, since the claim is about what
         * can be demanded, not about which fields are on screen.
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
        {/* ★ THE HEIGHT OF THIS BLOCK IS LOAD-BEARING. Before adding a line here, run:
         *      node scripts/verify/signin-fold.mjs          (defaults to prod)
         *    It fails if the social buttons or the identifier input fall below the fold. This does NOT
         *    run in CI (it needs a real browser) — nothing else will catch it for you. The 2026-07-25
         *    version of this block was 4 lines and pushed the identifier past the fold at 375x559
         *    (Safari's real viewport, not the 667 screen height).
         *
         *    ★ Numbers here are environment-dependent — quote them with the machine, not as facts.
         *    Same prod URL, same day, two people in real Chrome: copy block 141px vs 163px, mobile logo
         *    block 98px vs 128px. deviceScaleFactor was tested (1/2/3) and does NOT explain it. So run
         *    the script yourself rather than trusting a number written here.
         *
         *    If you need vertical room, take it from the `lg:hidden mb-8` logo block above (~98-128px of
         *    decoration — a logo and the word "MUED") before you shorten this text, which is what stops
         *    the door from misleading people.
         *
         * 2026-07-25: this went back to a single line once `email_address.required` was turned on in
         * the Clerk Dashboard. Before that, /sign-up rendered NO identifier field at all (only Apple and
         * Google), so "your email address is enough" was true for existing accounts and a dead end for
         * everyone else — the ~311 plugin owners hold `plugin_entitlements` rows written by the
         * UNAUTHENTICATED email gate (lib/plugins/entitlements.ts) and had no Clerk account. A temporary
         * "New here? Sign up with Apple or Google" half covered that gap. With email sign-up open, the
         * one line is true on both paths again and the split is gone.
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