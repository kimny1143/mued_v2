import type { Metadata } from "next";

// Own canonical. Without this file the page inherits app/dial/layout.tsx, whose canonical is
// hardcoded to "https://dial.mued.jp/" — so this page told Google it *is* the dial root. That is
// a stronger duplicate signal than having no canonical at all: a missing tag lets Google pick,
// a wrong tag asks it to drop this URL in favour of another page.
// Not in either sitemap, and not covered by robots.txt (only /dial/session/ is disallowed), so
// the canonical was the sole signal Google had for this URL.
export const metadata: Metadata = {
  alternates: {
    canonical: "https://dial.mued.jp/analyzer",
  },
};

export default function AnalyzerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
