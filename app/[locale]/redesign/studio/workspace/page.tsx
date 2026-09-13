import type { Metadata } from "next";
import { WorkspacePreview } from "@/components/brand/workspace-preview";
import { LocaleProvider } from "@/lib/i18n/locale-context";

export const metadata: Metadata = {
  title: "MUED — Workspace design preview",
  robots: { index: false, follow: false },
};

// Public fictional fixtures; uses the actual workspace components with no account or API access.
export default async function WorkspacePreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <LocaleProvider initialLocale={locale === "ja" ? "ja" : "en"}>
      <WorkspacePreview />
    </LocaleProvider>
  );
}
