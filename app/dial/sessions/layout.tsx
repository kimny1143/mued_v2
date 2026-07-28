import type { Metadata } from "next";

// Own canonical — see app/dial/analyzer/layout.tsx for why inheriting app/dial/layout.tsx is
// wrong here (it hardcodes the dial root, so this page claimed to be that root).
//
// Whether this URL should be indexed at all is a separate product question: it lists a viewer's
// own sessions. If the answer is no, the fix is `robots: { index: false }`, not a canonical that
// points somewhere else — pointing elsewhere is how a page gets silently dropped.
export const metadata: Metadata = {
  alternates: {
    canonical: "https://dial.mued.jp/sessions",
  },
};

export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
