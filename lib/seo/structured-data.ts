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
        url: "https://mued.jp/logo.webp",
      },
      slogan: "Making music visible.",
      description:
        "音楽クリエイターの認知特性を可視化し、AIパーソナライゼーションで制作をサポートするプロダクトスイート。 | Product suite that visualizes cognitive traits of music creators and supports production with AI personalization.",
      sameAs: [
        "https://www.threads.net/@mued.jp",
        "https://note.com/glasswerks",
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

    // SoftwareApplication (MUEDnote)
    {
      "@type": "SoftwareApplication",
      "@id": "https://mued.jp/#muednote",
      name: "MUEDnote",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "iOS",
      description:
        "音楽クリエイターの認知特性を7つのゲームで可視化し、AIアシスタントHooがパーソナライズされた対話で制作をサポートするiOSアプリ。完全無料。 | iOS app that maps cognitive traits of music creators through 7 games, with AI assistant Hoo providing personalized dialogue to support production. Completely free.",
      featureList: [
        "7種の耳トレゲームで音楽認知プロファイルを可視化",
        "AIアシスタントHooとのパーソナライズ対話",
        "MUEDlobeスコアリング（音程・リズム・和声・空間定位等）",
        "制作ログ・会話履歴の蓄積",
        "MUEDialとのシームレス連携",
        "Hoo MCPによる外部AIツール連携",
      ],
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
