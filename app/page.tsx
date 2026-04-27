import { permanentRedirect } from "next/navigation";

// Root URL permanently redirects to /en (default locale) to avoid duplicate content with /en and /ja.
// 308 Permanent Redirect signals to crawlers that mued.jp/ canonical is mued.jp/en.
// Auth and LandingContent rendering are handled by app/[locale]/page.tsx.
export default function Home() {
  permanentRedirect("/en");
}
