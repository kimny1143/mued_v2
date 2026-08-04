import type { Metadata } from "next";

// Own canonical. Without this file the page inherits app/dial/layout.tsx, whose canonical is
// hardcoded to "https://dial.mued.jp/" — so this page told Google it *is* the dial root. That is
// a stronger duplicate signal than having no canonical at all: a missing tag lets Google pick,
// a wrong tag asks it to drop this URL in favour of another page.
// Not in either sitemap, and not covered by robots.txt (only /dial/session/ is disallowed), so
// the canonical was the sole signal Google had for this URL.
export const metadata: Metadata = {
  alternates: {
    // ★2026-08-04 実測: dial.mued.jp/analyzer は 404（middleware が rewrite しない）。
    // 実体は mued.jp/dial/analyzer = 200。★上のコメントの「a wrong tag asks it to drop
    // this URL」が、この行自身に当たっていた —— 前回の修正は「dial root を指す誤り」を
    // 「404 を指す誤り」に置き換えていた。
    // ★dial.mued.jp/analyzer を実在させる（middleware に rewrite を足す）かは routing の
    // 判断なので、ここでは「実在する URL を指す」までに留める。
    canonical: "https://mued.jp/dial/analyzer",
  },
};

export default function AnalyzerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
