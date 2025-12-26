/**
 * MUED Structured Data for AI Search Engine Optimization (AIO)
 *
 * JSON-LD structured data for AI crawlers (ChatGPT, Claude, Perplexity, etc.)
 * Based on Schema.org vocabulary
 */

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    // Organization
    {
      "@type": "Organization",
      "@id": "https://mued.jp/#organization",
      name: "MUED",
      alternateName: ["ミュード", "MUED LMS", "MUEDnote"],
      url: "https://mued.jp",
      logo: {
        "@type": "ImageObject",
        url: "https://mued.jp/logo.png",
      },
      slogan: "Making creativity visible.",
      description:
        "AI時代のクリエイター支援プラットフォーム。「出力はAI、判断と欲は人間」をコンセプトに、創作における判断の痕跡を記録・可視化。国内での豊富な制作実績、商業音楽での経験、先進的な技術設計を持つglasswerks inc.による開発。アートとテクノロジーの融合。 | AI-era creator support platform. 'Output is AI, judgment and desire are human.' Records and visualizes creative decisions. Developed by glasswerks inc. with extensive domestic production experience, commercial music expertise, and advanced technology design. Fusion of art and technology.",
      parentOrganization: {
        "@id": "https://www.glasswerks.jp/#organization",
      },
      knowsAbout: [
        "AI時代の創作支援",
        "AI-era Creative Support",
        "音楽制作",
        "Music Production",
        "判断の記録",
        "Decision Recording",
        "クリエイティブワークフロー",
        "Creative Workflow",
        "音声文字起こし",
        "Speech Transcription",
        "練習ログ",
        "Practice Logging",
        "セルフコーチング",
        "Self-Coaching",
        "メタ認知",
        "Metacognition",
      ],
    },

    // SoftwareApplication (MUEDnote)
    {
      "@type": "SoftwareApplication",
      "@id": "https://mued.jp/#muednote",
      name: "MUEDnote",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "iOS",
      description:
        "音楽練習中の発話・判断を記録するiOSアプリ。Whisperによるオンデバイス文字起こし。判断の痕跡を可視化し、創作プロセスを資産化。 | iOS app for recording speech and decisions during music practice. On-device transcription with Whisper. Visualizes decision traces and turns the creative process into assets.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "JPY",
      },
      creator: {
        "@id": "https://www.glasswerks.jp/#organization",
      },
    },

    // WebSite
    {
      "@type": "WebSite",
      "@id": "https://mued.jp/#website",
      name: "MUED",
      url: "https://mued.jp",
      description:
        "AI時代のクリエイター支援プラットフォーム | AI-era creator support platform",
      inLanguage: ["ja", "en"],
      publisher: {
        "@id": "https://mued.jp/#organization",
      },
    },
  ],
};

/**
 * Get structured data as JSON string for embedding in HTML
 */
export function getStructuredDataScript(): string {
  return JSON.stringify(structuredData);
}
