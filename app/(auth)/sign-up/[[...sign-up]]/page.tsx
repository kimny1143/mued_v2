import { SignUp } from "@clerk/nextjs";

/**
 * Sign Up Page
 *
 * Redirects to MUEDnote dashboard after sign-up (1/7 launch strategy)
 * - Focus on MUEDnote, not LMS
 * - LMS features accessible later via dashboard navigation
 */
export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F0F1A]">
      <SignUp
        forceRedirectUrl="/dashboard/muednote"
        signInForceRedirectUrl="/dashboard/muednote"
      />
    </div>
  );
}