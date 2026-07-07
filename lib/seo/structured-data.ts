/**
 * MUED Structured Data for AI Search Engine Optimization (AIO)
 *
 * JSON-LD structured data for AI crawlers (ChatGPT, Claude, Perplexity, etc.)
 * Based on Schema.org vocabulary
 *
 * Site identity = MUED umbrella brand (products: MUEDear / MUEDial / MUEDnote / advisory / MUEDsat).
 * "MUEDnote" retained in Organization.alternateName to preserve 1/7-launch search equity.
 */

export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    // Organization
    {
      "@type": "Organization",
      "@id": "https://mued.jp/#organization",
      name: "MUED",
      alternateName: ["ミュード", "MUEDnote", "ミュードノート"],
      url: "https://mued.jp",
      logo: {
        "@type": "ImageObject",
        url: "https://mued.jp/logo.webp",
      },
      slogan: "Making music visible.",
      description:
        "音楽クリエイターの認知特性を可視化し、AIパーソナライゼーションで制作をサポートするプロダクトスイート。 | Product suite that visualizes cognitive traits of music creators and supports production with AI personalization.",
      sameAs: [
        "https://www.threads.net/@mued.jp",
        "https://note.com/mued_glasswerks",
        "https://www.glasswerks.jp",
      ],
      parentOrganization: {
        "@id": "https://www.glasswerks.jp/#organization",
      },
      knowsAbout: [
        "認知プロファイリング",
        "Cognitive Profiling",
        "AIパーソナライゼーション",
        "AI Personalization",
        "音楽制作ログ",
        "Music Production Logging",
        "制作ワークフロー",
        "Production Workflow",
        "AIミキシング",
        "AI Mixing",
        "耳トレーニング",
        "Ear Training",
      ],
    },

    // WebSite
    {
      "@type": "WebSite",
      "@id": "https://mued.jp/#website",
      name: "MUED",
      url: "https://mued.jp",
      description:
        "音楽制作を前に進める AI プロダクトスイート | Making music visible",
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
