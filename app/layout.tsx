import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "MUEDnote - 制作のそばに、いつもHoo。",
  description:
    "音楽制作のおともアプリ。休憩のタイミングを教えてくれて、音に反応して動く。声でメモを残すと自動で文字起こし。",
  metadataBase: new URL("https://mued.jp"),
  openGraph: {
    title: "MUEDnote - 制作のそばに、いつもHoo。",
    description:
      "音楽制作のおともアプリ。休憩のタイミングを教えてくれて、音に反応して動く。",
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
      "音楽制作のおともアプリ。休憩のタイミングを教えてくれて、音に反応して動く。",
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
      <html lang={locale}>
        <head>
          {/* SEO: hreflang alternate links for international SEO */}
          <link rel="alternate" hrefLang="en" href="https://mued.jp/en" />
          <link rel="alternate" hrefLang="ja" href="https://mued.jp/ja" />
          <link rel="alternate" hrefLang="x-default" href="https://mued.jp/en" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData),
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <LocaleProviderWrapper>
            {children}
          </LocaleProviderWrapper>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
