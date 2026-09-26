// Renders parsed EULA content (lib/legal/eula-content.ts). Presentational only — no fetching, no
// translation calls — so the page decides WHICH text and this only decides HOW it looks.
// ★Inline markup is rendered from parsed nodes; no raw HTML is ever injected (a test enforces this).
import type { ReactNode } from "react";
import { isExternalHref, parseInline, type EulaArticle, type EulaBlock } from "@/lib/legal/eula-content";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((node, i): ReactNode => {
        switch (node.type) {
          case "break":
            return <br key={i} />;
          case "bold":
            return (
              <strong key={i} className="text-white font-semibold">
                {node.value}
              </strong>
            );
          case "link":
            return isExternalHref(node.href) ? (
              <a key={i} href={node.href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {node.value}
              </a>
            ) : (
              <a key={i} href={node.href} className="text-blue-400 hover:underline">
                {node.value}
              </a>
            );
          default:
            return node.value;
        }
      })}
    </>
  );
}

export function EulaBlocks({ blocks }: { blocks: EulaBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (typeof block === "string") {
          return (
            <p key={i} className="text-slate-400 mb-4">
              <Inline text={block} />
            </p>
          );
        }
        const items = "ul" in block ? block.ul : block.ol;
        const ListTag = "ul" in block ? "ul" : "ol";
        return (
          <ListTag key={i} className={`${"ul" in block ? "list-disc" : "list-decimal"} pl-6 space-y-2 text-slate-400 mb-4`}>
            {items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ListTag>
        );
      })}
    </>
  );
}

export function EulaArticles({ articles }: { articles: EulaArticle[] }) {
  return (
    <>
      {articles.map((article, i) => (
        <section key={i} className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">{article.heading}</h2>
          <EulaBlocks blocks={article.blocks} />
        </section>
      ))}
    </>
  );
}
