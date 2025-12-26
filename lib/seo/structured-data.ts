/**
 * MUEDnote Structured Data for AI Search Engine Optimization (AIO)
 *
 * JSON-LD structured data for AI crawlers (ChatGPT, Claude, Perplexity, etc.)
 * Based on Schema.org vocabulary
 *
 * 1/7 Launch: Focus on MUEDnote as decision recording tool
 */

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    // Organization
    {
      "@type": "Organization",
      "@id": "https://mued.jp/#organization",
      name: "MUEDnote",
      alternateName: ["ミュードノート", "MUED", "ミュード"],
      url: "https://mued.jp",
      logo: {
        "@type": "ImageObject",
        url: "https://mued.jp/logo.png",
      },
      slogan: "Making music visible.",
      description:
        "音楽制作中の判断を資産にするツール。「なぜそうしたか」を声で記録し、自動で文字起こし。プロの選び方が見返せる記録帳。 | Tool to turn music production decisions into assets. Record 'why you did it' by voice, with automatic transcription. A log that lets you review professional decision-making.",
      parentOrganization: {
        "@id": "https://www.glasswerks.jp/#organization",
      },
      knowsAbout: [
        "音楽制作の判断記録",
        "Music Production Decision Recording",
        "音声文字起こし",
        "Speech Transcription",
        "Whisper AI",
        "休憩タイマー",
        "Break Timer",
        "判断ログ",
        "Decision Log",
        "制作ワークフロー",
        "Production Workflow",
        "ミックス判断",
        "Mix Decisions",
        "アレンジ判断",
        "Arrangement Decisions",
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
        "音楽制作中の「なぜそうしたか」を声で記録するiOSアプリ。Whisperで自動文字起こし。休憩タイマーで集中力をキープしながら、判断の理由を残せる。2025年1月7日リリース予定。 | iOS app for recording 'why you did it' during music production. Auto-transcription with Whisper. Keep focus with break timer while recording decision reasons. Launching January 7, 2025.",
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
      name: "MUEDnote",
      url: "https://mued.jp",
      description:
        "音楽制作中の判断を資産にする | Making music visible",
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
