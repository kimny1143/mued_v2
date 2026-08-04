import type { Metadata } from "next";

// Own canonical — see app/dial/analyzer/layout.tsx for why inheriting app/dial/layout.tsx is
// wrong here (it hardcodes the dial root, so this page claimed to be that root).
//
// Whether this URL should be indexed at all is a separate product question: it lists a viewer's
// own sessions. If the answer is no, the fix is `robots: { index: false }`, not a canonical that
// points somewhere else — pointing elsewhere is how a page gets silently dropped.
// ★2026-08-04 実測: この canonical 先は 404 だった。
//   dial.mued.jp/sessions        → 404（middleware が rewrite するのは / と /waitlist と
//                                  /readiness の3つだけ・middleware.ts:68,73）
//   mued.jp/dial/sessions        → 200（実体はこちら）
//   陰性対照 dial.mued.jp/no-such → 404（＝上の 404 は「実在しない」を意味する）
// ★上のコメントが言うとおり「wrong tag asks it to drop this URL」なので、404 を指す
//   canonical は、この URL を捨てろと言い続けていた。
//
// ★index するべきかという「別の product 判断」には、ここで答えを出す:
//   サインイン前に見えるのはサインイン導線だけで、クローラに出せる中身が無い。
//   ∴ robots: { index: false }。
//
// ★★canonical は「置かない」ではなく「実在する自 URL を置く」。
//   一度 外して本番で実測したら、app/dial/layout.tsx:90 の
//   canonical: "https://dial.mued.jp/" を★継承して「このページは dial root である」と
//   宣言していた —— analyzer/layout.tsx のコメントが警告していた、まさにその状態。
//   ★「外す」は「無くなる」ではなく「親を継ぐ」。metadata は継承される。
// ★robots.txt の `Disallow: /dial/session/` は★単数形で、この `/dial/sessions` に
//   当たらない（実測）。かつ Disallow は crawl を止めるので noindex が読まれなくなる
//   ——ここでは noindex 側を採り、robots.txt は触らない。
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: {
    // ★実在する URL（mued.jp/dial/sessions = 200）。dial.mued.jp/sessions は 404。
    canonical: "https://mued.jp/dial/sessions",
  },
};

export default function SessionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
