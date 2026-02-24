/**
 * HreflangLinks Component
 *
 * Provides hreflang alternate links for internationalized pages.
 * Use this component for page-specific hreflang links that need dynamic paths.
 *
 * For static hreflang links (root paths), the root layout already includes them.
 */

import { locales } from "@/lib/i18n/config";

interface HreflangLinksProps {
  /** Base path for the page (e.g., "/support", "/privacy") */
  path: string;
  /** Optional base URL, defaults to https://mued.jp */
  baseUrl?: string;
}

export function HreflangLinks({ path, baseUrl = "https://mued.jp" }: HreflangLinksProps) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return (
    <>
      {locales.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={`${baseUrl}/${locale}${normalizedPath}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${baseUrl}/en${normalizedPath}`}
      />
    </>
  );
}

/**
 * Generate hreflang links as an array for use in metadata
 * Useful for generateMetadata function in Next.js pages
 */
export function generateHreflangAlternates(path: string, baseUrl = "https://mued.jp") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const alternates: Record<string, string> = {};

  for (const locale of locales) {
    alternates[locale] = `${baseUrl}/${locale}${normalizedPath}`;
  }

  // x-default points to English version
  alternates["x-default"] = `${baseUrl}/en${normalizedPath}`;

  return alternates;
}
