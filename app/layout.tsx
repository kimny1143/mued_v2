import { SHARE_IMAGES } from "@/lib/seo/share-image";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { CookieConsent } from "@/components/features/cookie-consent/cookie-consent";
import jaMessages from "@/messages/ja.json";
import enMessages from "@/messages/en.json";
import { Geist_Mono, JetBrains_Mono, Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LocaleProviderWrapper } from "@/components/providers/locale-provider-wrapper";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { structuredData } from "@/lib/seo/structured-data";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Explicit mobile viewport (was relying on the Next.js default). width=device-width + initialScale=1
// makes responsive breakpoints apply correctly on iPhone Safari. maximumScale is intentionally
// omitted so users can still pinch-zoom (accessibility).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// ★Site-wide defaults = the home page's own og/twitter (app/[locale]/page.tsx). Pages that set no twitter:* fell
//   back to the old MUED tagline here (conductor 2026-10-01); keep these in step with the home page.
export const metadata: Metadata = {
  title: "MUED — 音楽制作の道具。ミックス、マスタリング、耳の訓練。",
  description:
    "現役の作編曲家／ミックスエンジニアが作る、音楽制作のための道具。AIミックスの MUEDial、マスタリング・プラグインの MUEDsp、耳を鍛える MUEDear。",
  metadataBase: new URL("https://mued.jp"),
  openGraph: {
    title: "MUED — 音楽制作の道具。ミックス、マスタリング、耳の訓練。",
    description:
      "現役の作編曲家／ミックスエンジニアが作る、音楽制作のための道具。AIミックスの MUEDial、マスタリング・プラグインの MUEDsp、耳を鍛える MUEDear。",
    url: "https://mued.jp",
    siteName: "MUED",
    images: SHARE_IMAGES,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUED — 音楽制作の道具。ミックス、マスタリング、耳の訓練。",
    description:
      "現役の作編曲家／ミックスエンジニアが作る、音楽制作のための道具。AIミックスの MUEDial、マスタリング・プラグインの MUEDsp、耳を鍛える MUEDear。",
    images: SHARE_IMAGES,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const locale: Locale = localeCookie && locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;

  return (
    <ClerkProvider>
      <html lang={locale} className="dark">
        <head>
          {/* SEO: hreflang alternate links for international SEO */}
          <link rel="alternate" hrefLang="en" href="https://mued.jp/en" />
          <link rel="alternate" hrefLang="ja" href="https://mued.jp/ja" />
          <link rel="alternate" hrefLang="x-default" href="https://mued.jp/en" />
          {/* Theme color */}
          <meta name="theme-color" content="#0f0f0f" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData),
            }}
          />
        </head>
        <body
          className={`${geistMono.variable} ${jetbrainsMono.variable} ${sora.variable} antialiased`}
        >
          <LocaleProviderWrapper>
            {children}
          </LocaleProviderWrapper>
          <Analytics />
          <SpeedInsights />
          {/* Google Analytics 4 — loaded only after the visitor accepts (components/features/cookie-consent) */}
          <CookieConsent
            gaMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            copy={{ ja: jaMessages.cookieConsent, en: enMessages.cookieConsent }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
