import fs from "node:fs";
import path from "node:path";

// The MUEDvox user manual on mued.jp (conductor 2026-10-16: a tester asked for one; web only — putting it in the
// pkg would mean signing again). ★The text is VOX's: content/muedvox/manual/MUEDvox-manual.<locale>.md are byte
// copies of mued-vox docs/manual/ (sha256 pinned in tests/unit/muedvox-manual.test.ts). Fix the text in mued-vox
// and copy it again — never edit the copies here, or the web and VOX's source drift apart.
// ★Read at request time like /licenses, so next.config.ts traces the folder into the function.
export const MUEDVOX_MANUAL_DIR = path.join(process.cwd(), "content", "muedvox", "manual");

export type ManualLocale = "ja" | "en";

export function readMuedvoxManual(locale: ManualLocale): string {
  return fs.readFileSync(path.join(MUEDVOX_MANUAL_DIR, `MUEDvox-manual.${locale}.md`), "utf8");
}

/** The file's own `# ` title (the page heading and the <title>); the body is everything after it. */
export function splitManual(markdown: string): { title: string; body: string } {
  const match = /^# (.+)\n/.exec(markdown);
  if (!match) throw new Error("[muedvox manual] the file must start with a '# ' title line");
  return { title: match[1].trim(), body: markdown.slice(match[0].length) };
}
