import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { setRequestLocale } from "next-intl/server";
import { LandingContent } from "@/components/features/landing-content";
import { locales, type Locale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLandingPage({ params }: PageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale as Locale);

  const user = await currentUser();

  // Redirect to dashboard if already logged in
  if (user) {
    redirect("/dashboard");
  }

  return <LandingContent />;
}
