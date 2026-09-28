// Decide whether a PR changes ONLY documentation, so CI can skip the heavy Validate/Test/Build steps.
//
// ★WHY (conductor, 2026-09-28): the Actions budget ran out. In 2026-09, 109 of 211 PRs changed only
//   .md / docs/ files, yet each ran all three jobs (~11 min, three `npm ci`) — ≈1,600 wasted minutes.
//
// ★Plain JavaScript on purpose: the `changes` job runs this with the runner's own Node, BEFORE (and
//   instead of) `npm ci`. No dependencies, no TypeScript.
//
// ★The rule is by PATH, never by branch name: 8 PRs on docs/* branches in 2026-09 contained code.
//
// ★Docs-only means EVERY changed file is one of:
//     docs/** with a DOCUMENT extension (.md .txt .html .csv .pdf and images) — ★not any file: tsconfig
//                                  includes **/*.ts / **/*.tsx and excludes only docs/archive/**, so a .ts
//                                  under docs/ IS typechecked (CCO #1156). Everything else under docs/ is code.
//     <root>/*.md                  EXCEPT CLAUDE.md and AGENTS.md — tests/unit/claude-md-stack-facts
//                                  reads both
//     <root>/*.jsonl, docs/**      (jsonl under docs/ is already covered above)
//   Anything else runs the full pipeline. In particular these .md files are NOT docs here:
//     .claude/** .agents/**        skill files: read by skill-frontmatter / skill-facts-vs-code tests and
//                                  by the Validate "Skill durability" step
//     content/**                   rendered into /learn pages at build time
//     tests/**, app/**, lib/**, …  anything inside code directories
// ★An empty or unknown file list is NOT docs-only: when in doubt, run everything.
// ★The caller must pass BOTH sides of a rename (previous_filename too): `git mv lib/x.ts docs/x.md`
//   deletes code, and only the old path says so (CCO #1156).
// ★3000+ files is the files-endpoint cap — the list may be truncated, so it is treated as code.

const ROOT_DOCS_EXCEPTIONS = new Set(["CLAUDE.md", "AGENTS.md"]);
const DOC_EXTENSIONS = /\.(md|markdown|txt|html|csv|tsv|pdf|png|jpe?g|gif|svg|webp|jsonl)$/i;
const API_FILE_CAP = 3000;

/** @param {string} file */
export function isDocFile(file) {
  if (file.startsWith("docs/")) return DOC_EXTENSIONS.test(file);
  if (file.includes("/")) return false;
  if (ROOT_DOCS_EXCEPTIONS.has(file)) return false;
  return file.endsWith(".md") || file.endsWith(".jsonl");
}

/** @param {readonly string[]} files */
export function isDocsOnly(files) {
  const list = files.map((f) => f.trim()).filter(Boolean);
  return list.length > 0 && list.length < API_FILE_CAP && list.every(isDocFile);
}

// CLI: newline-separated file list on stdin → prints `code=true|false` for $GITHUB_OUTPUT.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import("node:fs");
  const files = readFileSync(0, "utf8").split("\n");
  const docsOnly = isDocsOnly(files);
  const count = files.filter((f) => f.trim()).length;
  console.error(`changed files: ${count} — docs-only: ${docsOnly ? "yes (heavy steps skipped)" : "no (full pipeline)"}`);
  console.log(`code=${docsOnly ? "false" : "true"}`);
}
