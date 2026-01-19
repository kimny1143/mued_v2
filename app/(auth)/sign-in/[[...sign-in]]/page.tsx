import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

/**
 * Sign In Page
 *
 * MUEDnote branded authentication page
 * - Split layout: branding (left) + Clerk (right)
 * - Dark theme matching MUEDnote design
 * - Responsive: stacked on mobile
 */
export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0F0F1A] flex">
      {/* Left: MUEDnote Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-[#0F0F1A] to-[#1A1A2E]">
        <div className="max-w-md text-center">
          {/* Logo */}
          <Link href="/" className="inline-block mb-8">
            <Image
              src="/logo.png"
              alt="MUEDnote"
              width={120}
              height={120}
              className="drop-shadow-2xl"
            />
          </Link>

          {/* Tagline */}
          <h1 className="text-3xl font-bold text-white mb-4">
            MUEDnote
          </h1>
          <p className="text-xl text-indigo-400 mb-6">
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
              src="/logo.png"
              alt="MUEDnote"
              width={80}
              height={80}
              className="mx-auto mb-4 drop-shadow-lg"
            />
          </Link>
          <h1 className="text-2xl font-bold text-white">MUEDnote</h1>
        </div>

        <SignIn
          forceRedirectUrl="/dashboard/muednote"
          signUpForceRedirectUrl="/dashboard/muednote"
          appearance={{
            variables: {
              colorPrimary: "#6366f1",
              colorBackground: "#1A1A2E",
              colorText: "#ffffff",
              colorTextSecondary: "#94a3b8",
              colorInputBackground: "#0F0F1A",
              colorInputText: "#ffffff",
            },
            elements: {
              rootBox: "mx-auto w-full max-w-md",
              card: "bg-[#1A1A2E] border border-white/10 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton: "bg-white/5 border-white/10 text-white hover:bg-white/10",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-white/10",
              dividerText: "text-slate-500",
              formFieldLabel: "text-slate-300",
              formFieldInput: "bg-[#0F0F1A] border-white/10 text-white placeholder:text-slate-500",
              formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 text-white",
              footerActionLink: "text-indigo-400 hover:text-indigo-300",
              identityPreviewEditButton: "text-indigo-400",
              formFieldAction: "text-indigo-400",
              alert: "bg-red-500/10 border-red-500/20 text-red-400",
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