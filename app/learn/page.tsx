import Link from "next/link";
import type { Metadata } from "next";
import { getAllLearnArticles } from "@/lib/learn/articles";
import { LEARN_LIVE } from "@/lib/learn/config";

//
// /learn — EN evergreen reference index (Road to 10k 層2 #8). NON-locale route → JA face untouched.
//
const BASE = "https://mued.jp";
const TITLE = "Learn — Loudness & true peak, explained | MUED";
const DESC =
  "Plain-English reference on LUFS, true peak, and loudness for streaming — what the numbers on your meter actually measure, and how to master to them.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: `${BASE}/learn` },
  robots: { index: LEARN_LIVE, follow: LEARN_LIVE }, // staged until go-live (kimny)
  openGraph: { title: TITLE, description: DESC, url: `${BASE}/learn`, type: "website", locale: "en_US", siteName: "MUED" },
};

export default function LearnIndexPage() {
  const articles = getAllLearnArticles();
  return (
    <div className="dark min-h-screen bg-bg-primary">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-bg-primary/80 px-6 py-4 backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-white transition-colors hover:text-slate-300">
            MUED
          </Link>
          <Link href="/muedsp" className="text-sm text-slate-400 transition-colors hover:text-slate-200">
            Free plugins
          </Link>
        </div>
      </header>

      <main className="px-6 pt-24 pb-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-white">Learn</h1>
          <p className="mt-3 text-slate-400">
            Plain-English reference on loudness and true peak — what the numbers on your meter actually mean, and
            how to master to them.
          </p>

          <ul className="mt-10 space-y-6">
            {articles.map((a) => (
              <li key={a.slug} className="border-b border-white/10 pb-6 last:border-b-0">
                <Link href={`/learn/${a.slug}`} className="group block">
                  <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-amber-400">
                    {a.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{a.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-bg-primary py-8">
        <div className="container mx-auto px-6">
          <p className="mx-auto max-w-2xl text-sm text-slate-500">&copy; {new Date().getFullYear()} glasswerks inc. · mued.jp</p>
        </div>
      </footer>
    </div>
  );
}
