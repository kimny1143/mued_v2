// Usage: npx tsx scripts/legal/eula-md-to-messages.ts <EULA-ja.md> <EULA-en.md>
//
// Writes the EULA draft into messages/{ja,en}.json → `eula.title` / `eula.intro` / `eula.articles`.
// The conversion itself is lib/legal/eula-markdown.ts (typed + tested); this file only does I/O.
//
// ★Only the `"eula": { … }` block is rewritten, by line range — the rest of each messages file is
//   left byte-for-byte (this repo has no formatter; see CLAUDE.md "messages/*.json に formatter を当てない").
// ★Refuses to write when the draft HAS a "Version" line that differs from EULA_VERSION (the page shows
//   EULA_VERSION and checkout records it). dsp's English text carries no version line — then the
//   version is EULA_VERSION alone, which must equal dsp's RTF generator VERSION (checked by hand).
// ★effectiveDate is written from the draft's date line, verbatim; no date line → the key is removed.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eulaFromMarkdown } from "../../lib/legal/eula-markdown";
import { parseEulaContent } from "../../lib/legal/eula-content";
import { EULA_VERSION } from "../../lib/legal/eula";

const [jaPath, enPath] = process.argv.slice(2);
if (!jaPath || !enPath) {
  console.error("usage: npx tsx scripts/legal/eula-md-to-messages.ts <EULA-ja.md> <EULA-en.md>");
  process.exit(2);
}

for (const [locale, mdPath] of [["ja", jaPath], ["en", enPath]] as const) {
  const draft = eulaFromMarkdown(readFileSync(mdPath, "utf8"));
  if (draft.version !== undefined && draft.version !== EULA_VERSION) {
    console.error(`${locale}: draft Version "${draft.version}" ≠ EULA_VERSION "${EULA_VERSION}" (lib/legal/eula.ts) — change both together`);
    process.exit(1);
  }

  const file = join(process.cwd(), "messages", `${locale}.json`);
  const lines = readFileSync(file, "utf8").split("\n");
  const start = lines.indexOf('  "eula": {');
  const end = lines.findIndex((l, i) => i > start && /^  \},?$/.test(l));
  if (start < 0 || end < 0) {
    console.error(`${locale}: could not find the top-level "eula" block`);
    process.exit(1);
  }

  const current = JSON.parse(readFileSync(file, "utf8")).eula;
  const { effectiveDate: _old, ...rest } = current as Record<string, unknown>;
  void _old;
  const next = {
    ...rest,
    title: draft.title,
    ...(draft.effectiveDate === undefined ? {} : { effectiveDate: draft.effectiveDate }),
    intro: draft.intro,
    articles: draft.articles,
  };
  parseEulaContent(next); // ★same strict parse the page runs at build time
  const body = JSON.stringify(next, null, 2).split("\n").slice(1, -1).map((l) => `  ${l}`);
  const trailing = lines[end].endsWith(",") ? "," : "";
  lines.splice(start, end - start + 1, '  "eula": {', ...body, `  }${trailing}`);
  JSON.parse(lines.join("\n")); // still valid JSON
  writeFileSync(file, lines.join("\n"));
  console.log(`${locale}: ${draft.articles.length} articles, ${draft.intro.length} intro block(s) → ${file}`);
}
