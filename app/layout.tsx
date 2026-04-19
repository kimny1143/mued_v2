import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Geist, Geist_Mono, JetBrains_Mono, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { LocaleProviderWrapper } from "@/components/providers/locale-provider-wrapper";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { structuredData } from "@/lib/seo/structured-data";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

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

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MUEDnote - 制作のそばに、いつもHoo。",
  description:
    "音楽クリエイターの認知特性を可視化し、AIアシスタントHooがパーソナライズされた対話で制作をサポート。完全無料。",
  metadataBase: new URL("https://mued.jp"),
  openGraph: {
    title: "MUEDnote - 制作のそばに、いつもHoo。",
    description:
      "音楽クリエイターの認知特性を可視化し、AIアシスタントHooがパーソナライズされた対話で制作をサポート。",
    url: "https://mued.jp",
    siteName: "MUEDnote",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MUEDnote - 音楽制作のおともアプリ",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUEDnote - 制作のそばに、いつもHoo。",
    description:
      "音楽クリエイターの認知特性を可視化し、AIアシスタントHooがパーソナライズされた対話で制作をサポート。",
    images: ["/og-image.jpg"],
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
          className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${inter.variable} antialiased`}
        >
          <LocaleProviderWrapper>
            {children}
          </LocaleProviderWrapper>
          <Analytics />
          <SpeedInsights />
          {/* Google Analytics 4 */}
          {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
              />
              <Script id="ga4-init" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `}
              </Script>
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
