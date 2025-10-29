import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { LandingContent } from "@/components/features/landing-content";

export default async function Home() {
  const user = await currentUser();

  // Redirect to dashboard if already logged in
  if (user) {
    redirect("/dashboard");
  }

  return <LandingContent />;
}