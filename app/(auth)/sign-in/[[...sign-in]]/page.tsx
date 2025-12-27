import { SignIn } from "@clerk/nextjs";

/**
 * Sign In Page
 *
 * Redirects to MUEDnote dashboard after sign-in (1/7 launch strategy)
 * - Focus on MUEDnote, not LMS
 * - LMS features accessible later via dashboard navigation
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A]">
      <SignIn
        forceRedirectUrl="/dashboard/muednote"
        signUpForceRedirectUrl="/dashboard/muednote"
      />
    </div>
  );
}