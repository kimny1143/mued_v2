#!/usr/bin/env node
/**
 * Self-hosted web fonts — the ONLY place that talks to Google Fonts. The build does not.
 *
 * Why (2026-10-08): `next/font/google` fetches the stylesheet and the font files during every `next build`.
 * Google sometimes answers with a font URL Next cannot parse (vercel/next.js#99114, open), and the build dies
 * with "Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'". It hit a CI Build
 * on 2026-10-01 (Next 16.3.6) and, on 2026-10-08, one production deploy and one CI Build (16.3.8). A production
 * deploy that fails can only be retried from the Vercel dashboard. So the files live in the repo.
 *
 * What it writes (all four are generated — do not edit by hand, re-run this instead):
 *   public/fonts/<family>-<subset>.<sha256 first 16>.woff2   the files, content hash in the name
 *   lib/fonts/google-fonts.provenance.json                     source URL, sha256, size, when fetched
 *   app/fonts.css                                              the @font-face rules + the CSS variables
 *   lib/fonts/self-hosted.generated.ts                         class names + the files to preload
 *
 * ★The output reproduces what next/font/google emitted (measured on production, 2026-10-08): every subset
 *   Google serves for the family, one @font-face per requested weight, `font-display: swap`, the same
 *   unicode-range, the same "<Family> Fallback" face. `subsets: ["latin"]` in the old layout only chose what to
 *   PRELOAD — the other subsets were always in the CSS. Same here.
 *
 * Update when Google ships a new version of a family (the `v17` in the URL changes):
 *   node scripts/fonts/sync-google-fonts.mjs          # fetches, rewrites the four outputs, deletes stale files
 *   npm run test:unit -- tests/unit/self-hosted-fonts.test.ts
 *   then compare the pages by eye before merging — a new version can change glyphs.
 * Offline check (what the unit test also does):  node scripts/fonts/sync-google-fonts.mjs --check
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FONT_DIR = join(ROOT, "public", "fonts");
const CSS_PATH = join(ROOT, "app", "fonts.css");
const TS_PATH = join(ROOT, "lib", "fonts", "self-hosted.generated.ts");
const PROVENANCE_PATH = join(ROOT, "lib", "fonts", "google-fonts.provenance.json");

/** The User-Agent next/font/google sends: Google answers woff2 + unicode-range subsets to it. */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36";

/**
 * `fallback` = the "<Family> Fallback" face next/font/google emitted (its own precalculated metrics over Arial),
 * copied from production's CSS on 2026-10-08. It keeps the layout from shifting while the real font loads.
 */
export const FAMILIES = [
  {
    key: "geist-mono",
    family: "Geist Mono",
    query: "Geist+Mono:wght@100..900",
    variable: "--font-geist-mono",
    className: "font-var-geist-mono",
    fallback: { ascent: "74.67%", descent: "21.92%", lineGap: "0.0%", sizeAdjust: "134.59%" },
  },
  {
    key: "jetbrains-mono",
    family: "JetBrains Mono",
    query: "JetBrains+Mono:wght@300;400;500;600;700",
    variable: "--font-jetbrains",
    className: "font-var-jetbrains",
    fallback: { ascent: "75.79%", descent: "22.29%", lineGap: "0.0%", sizeAdjust: "134.59%" },
  },
  {
    key: "sora",
    family: "Sora",
    query: "Sora:wght@300;400;500;600;700",
    variable: "--font-sora",
    className: "font-var-sora",
    fallback: { ascent: "85.29%", descent: "25.5%", lineGap: "0.0%", sizeAdjust: "113.73%" },
  },
];

/** Only this subset is preloaded — the same three files production preloaded before. */
const PRELOAD_SUBSET = "latin";
const HASH_LEN = 16;

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const fileName = (key, subset, hash) => `${key}-${subset}.${hash.slice(0, HASH_LEN)}.woff2`;

/** Google's stylesheet → [{ subset, weight, style, url, unicodeRange }] in Google's order. */
export function parseGoogleCss(css) {
  const faces = [];
  // Subset labels can carry digits ("symbols2" in Geist Mono) — a pattern without them silently drops the block.
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const m of css.matchAll(re)) {
    const body = m[2];
    const prop = (name) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();
    const url = body.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/)?.[1];
    const face = { subset: m[1], weight: prop("font-weight"), style: prop("font-style"), display: prop("font-display"), url, unicodeRange: prop("unicode-range") };
    if (!face.weight || !face.style || !face.url || !face.unicodeRange) throw new Error(`unreadable @font-face in the ${m[1]} block`);
    if (face.display !== "swap") throw new Error(`expected font-display: swap, got ${face.display}`);
    // ★vercel/next.js#99114: the shape that breaks next build. Refuse it here too — retry later.
    if (!/^https:\/\/fonts\.gstatic\.com\/s\/[^?]+\.woff2$/.test(face.url)) throw new Error(`unexpected font URL shape: ${face.url}`);
    faces.push(face);
  }
  // ★Every block Google sent must have been read: a block the pattern skipped would vanish without a trace.
  const sent = css.match(/@font-face/g)?.length ?? 0;
  if (!faces.length || faces.length !== sent) throw new Error(`read ${faces.length} of ${sent} @font-face blocks`);
  return faces;
}

export function renderCss(families) {
  const out = [
    "/*",
    " * GENERATED by scripts/fonts/sync-google-fonts.mjs — do not edit. Sources and hashes: lib/fonts/google-fonts.provenance.json.",
    " * Self-hosted copies of the faces next/font/google used to emit; nothing here points outside this site.",
    " */",
  ];
  for (const f of families) {
    for (const face of f.faces) {
      out.push(
        `/* ${face.subset} */`,
        "@font-face {",
        `  font-family: '${f.family}';`,
        `  font-style: ${face.style};`,
        `  font-weight: ${face.weight};`,
        "  font-display: swap;",
        `  src: url(/fonts/${face.file}) format('woff2');`,
        `  unicode-range: ${face.unicodeRange};`,
        "}",
      );
    }
    out.push(
      "@font-face {",
      `  font-family: '${f.family} Fallback';`,
      "  src: local('Arial');",
      `  ascent-override: ${f.fallback.ascent};`,
      `  descent-override: ${f.fallback.descent};`,
      `  line-gap-override: ${f.fallback.lineGap};`,
      `  size-adjust: ${f.fallback.sizeAdjust};`,
      "}",
      `.${f.className} {`,
      `  ${f.variable}: '${f.family}', '${f.family} Fallback';`,
      "}",
    );
  }
  return out.join("\n") + "\n";
}

export function renderTs(families) {
  const preloads = families.flatMap((f) => [...new Set(f.faces.filter((x) => x.subset === PRELOAD_SUBSET).map((x) => `/fonts/${x.file}`))]);
  const lines = [
    "// GENERATED by scripts/fonts/sync-google-fonts.mjs — do not edit.",
    "// Same shape next/font gave the layout (`.variable` is a class that sets the family's CSS variable).",
    ...families.map((f) => `export const ${camel(f.key)} = { variable: ${JSON.stringify(f.className)} } as const;`),
    "",
    "/** The latin file of each family — preloaded on every page, as next/font did. */",
    `export const FONT_PRELOADS: readonly string[] = ${JSON.stringify(preloads, null, 2)};`,
  ];
  return lines.join("\n") + "\n";
}

const camel = (key) => key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/** Rebuild the family list (with faces) from google-fonts.provenance.json — no network. */
export function familiesFromProvenance(provenance) {
  return FAMILIES.map((f) => {
    const entry = provenance.families.find((p) => p.key === f.key);
    if (!entry) throw new Error(`google-fonts.provenance.json has no ${f.key}`);
    return { ...f, faces: entry.faces };
  });
}

/** Offline: the committed outputs agree with each other and with the files on disk. Returns problems. */
export function check() {
  const problems = [];
  if (!existsSync(PROVENANCE_PATH)) return ["lib/fonts/google-fonts.provenance.json is missing"];
  const provenance = JSON.parse(readFileSync(PROVENANCE_PATH, "utf8"));
  const families = familiesFromProvenance(provenance);
  const expected = new Set();
  for (const file of provenance.files) {
    expected.add(file.file);
    const path = join(FONT_DIR, file.file);
    if (!existsSync(path)) { problems.push(`missing file: ${file.file}`); continue; }
    const buf = readFileSync(path);
    const hash = sha256(buf);
    if (hash !== file.sha256) problems.push(`sha256 mismatch: ${file.file}`);
    if (!file.file.includes(`.${hash.slice(0, HASH_LEN)}.woff2`)) problems.push(`name does not carry the content hash: ${file.file}`);
    if (buf.subarray(0, 4).toString("latin1") !== "wOF2") problems.push(`not a woff2 file: ${file.file}`);
  }
  for (const name of readdirSync(FONT_DIR)) {
    if (name.endsWith(".woff2") && !expected.has(name)) problems.push(`stale file not in google-fonts.provenance.json: ${name}`);
  }
  if (!existsSync(CSS_PATH) || readFileSync(CSS_PATH, "utf8") !== renderCss(families)) problems.push("app/fonts.css is not what the generator writes from google-fonts.provenance.json");
  if (!existsSync(TS_PATH) || readFileSync(TS_PATH, "utf8") !== renderTs(families)) problems.push("lib/fonts/self-hosted.generated.ts is not what the generator writes from google-fonts.provenance.json");
  return problems;
}

async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res;
}

async function sync() {
  mkdirSync(FONT_DIR, { recursive: true });
  mkdirSync(dirname(TS_PATH), { recursive: true });
  const files = new Map(); // source url -> { file, sha256, bytes, url }
  const families = [];
  for (const f of FAMILIES) {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${f.query}&display=swap`;
    const faces = parseGoogleCss(await (await get(cssUrl)).text());
    for (const face of faces) {
      if (!files.has(face.url)) {
        const buf = Buffer.from(await (await get(face.url)).arrayBuffer());
        if (buf.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error(`not a woff2 file: ${face.url}`);
        const hash = sha256(buf);
        const file = fileName(f.key, face.subset, hash);
        writeFileSync(join(FONT_DIR, file), buf);
        files.set(face.url, { file, sha256: hash, bytes: buf.length, url: face.url });
      }
      face.file = files.get(face.url).file;
    }
    families.push({ ...f, cssUrl, faces: faces.map(({ subset, weight, style, unicodeRange, file }) => ({ subset, weight, style, unicodeRange, file })) });
  }
  const keep = new Set([...files.values()].map((x) => x.file));
  for (const name of readdirSync(FONT_DIR)) if (name.endsWith(".woff2") && !keep.has(name)) rmSync(join(FONT_DIR, name));
  const provenance = {
    note: "GENERATED by scripts/fonts/sync-google-fonts.mjs. All three families are under the SIL Open Font License 1.1 — see public/fonts/OFL-*.txt.",
    fetchedAt: new Date().toISOString(),
    userAgent: USER_AGENT,
    families: families.map(({ key, family, cssUrl, faces }) => ({ key, family, cssUrl, faces })),
    files: [...files.values()].sort((a, b) => a.file.localeCompare(b.file)),
  };
  writeFileSync(PROVENANCE_PATH, JSON.stringify(provenance, null, 2) + "\n");
  writeFileSync(CSS_PATH, renderCss(families));
  writeFileSync(TS_PATH, renderTs(families));
  console.log(`wrote ${files.size} files, ${families.reduce((n, f) => n + f.faces.length, 0)} faces`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes("--check")) {
    const problems = check();
    for (const p of problems) console.error(`✗ ${p}`);
    if (problems.length) process.exit(1);
    console.log("✓ fonts: files, google-fonts.provenance.json, app/fonts.css and the generated module agree");
  } else {
    await sync();
    const problems = check();
    for (const p of problems) console.error(`✗ ${p}`);
    if (problems.length) process.exit(1);
  }
}
