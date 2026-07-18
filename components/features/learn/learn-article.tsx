import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { LearnArticle } from "@/lib/learn/articles";

// Dark-theme long-form styling for the rendered markdown (no @tailwindcss/typography in this repo).
// `node` is dropped so it never reaches the DOM element.
const md: Components = {
  h2: ({ node: _n, ...p }) => <h2 className="mt-10 mb-3 text-xl font-semibold text-white" {...p} />,
  h3: ({ node: _n, ...p }) => <h3 className="mt-6 mb-2 text-lg font-semibold text-white" {...p} />,
  p: ({ node: _n, ...p }) => <p className="my-4 leading-relaxed text-slate-300" {...p} />,
  ul: ({ node: _n, ...p }) => <ul className="my-4 list-disc pl-6 space-y-1.5 text-slate-300" {...p} />,
  ol: ({ node: _n, ...p }) => <ol className="my-4 list-decimal pl-6 space-y-1.5 text-slate-300" {...p} />,
  li: ({ node: _n, ...p }) => <li className="leading-relaxed" {...p} />,
  a: ({ node: _n, ...p }) => <a className="text-amber-400 underline hover:text-amber-300" {...p} />,
  strong: ({ node: _n, ...p }) => <strong className="font-semibold text-white" {...p} />,
  em: ({ node: _n, ...p }) => <em className="italic text-slate-200" {...p} />,
  code: ({ node: _n, ...p }) => <code className="rounded bg-white/10 px-1.5 py-0.5 text-[0.9em] text-amber-200" {...p} />,
  blockquote: ({ node: _n, ...p }) => (
    <blockquote className="my-4 border-l-2 border-amber-500/50 pl-4 italic text-slate-400" {...p} />
  ),
  table: ({ node: _n, ...p }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm text-slate-300" {...p} />
    </div>
  ),
  th: ({ node: _n, ...p }) => (
    <th className="border border-white/15 bg-white/5 px-3 py-2 text-left font-semibold text-white" {...p} />
  ),
  td: ({ node: _n, ...p }) => <td className="border border-white/10 px-3 py-2" {...p} />,
};

/** The 1-hop gate CTA at the foot of every /learn article — reads the structured frontmatter `gate`. */
function LearnGateCta({ gate }: { gate: LearnArticle["gate"] }) {
  return (
    <aside className="mt-14 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
      <h2 className="text-lg font-semibold text-white">{gate.heading}</h2>
      <p className="mt-2 text-slate-300">{gate.body}</p>
      {gate.note ? <p className="mt-2 text-sm text-slate-400">{gate.note}</p> : null}
      <Link
        href={gate.ctaHref}
        className="mt-5 inline-block rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-black transition-colors hover:bg-amber-400"
      >
        {gate.ctaLabel}
      </Link>
    </aside>
  );
}

export function LearnArticleView({ article }: { article: LearnArticle }) {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-white">{article.title}</h1>
      {article.publishDate ? (
        <p className="mt-2 text-sm text-slate-500">
          <time dateTime={article.publishDate}>{article.publishDate}</time>
          {article.lastUpdated && article.lastUpdated !== article.publishDate ? ` · Updated ${article.lastUpdated}` : ""}
        </p>
      ) : null}
      <div className="mt-8">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
          {article.body}
        </ReactMarkdown>
      </div>
      <LearnGateCta gate={article.gate} />
    </article>
  );
}
