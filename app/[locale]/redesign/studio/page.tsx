import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { StudioShowroom } from "@/components/features/landing/studio-showroom";
interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "studioShowroom" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  };
}
// A reviewable proposal, including for signed-in reviewers. Home cutover is a separate decision.
export default async function StudioPreviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StudioShowroom locale={locale} />;
}
