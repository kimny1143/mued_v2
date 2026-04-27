import { redirect } from "next/navigation";

// Root URL redirects to /en (default locale) to avoid duplicate content with /en and /ja.
// Auth and LandingContent rendering are handled by app/[locale]/page.tsx.
export default function Home() {
  redirect("/en");
}