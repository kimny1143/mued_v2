import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LICENSE_FILES, LICENSE_KINDS, LICENSE_PLUGINS, readLicense } from "@/lib/licenses/third-party";

const ROOT = process.cwd();
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

describe("/licenses — third-party licenses shipped in the plugins", () => {
  it.each(LICENSE_PLUGINS)("★%s: both copies are byte-identical to the pinned upstream files (lib/licenses/third-party.ts says which commit)", (plugin) => {
    for (const kind of LICENSE_KINDS) {
      const text = readLicense(plugin, kind);
      expect(text.length, `${plugin}/${kind} is empty`).toBeGreaterThan(100);
      expect(sha(text), `${plugin}/${kind} changed without its pin — re-copy from the source named in lib/licenses/third-party.ts (the dsp repo; ★not from an installer on the shelf, which may be OLDER) and update LICENSE_FILES`).toBe(
        LICENSE_FILES[plugin][kind],
      );
    }
  });

  it("the pins are distinct per file (a copy pasted into the wrong plugin cannot pass)", () => {
    const all = LICENSE_PLUGINS.flatMap((p) => LICENSE_KINDS.map((k) => LICENSE_FILES[p][k]));
    expect(new Set(all).size).toBe(all.length);
  });

  it("★the files are bundled for the request-time read (without this, production is ENOENT — same as /learn)", () => {
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    expect(config).toContain('"/[locale]/licenses": ["./content/licenses/**/*.md"]');
  });

  it("the page exists for both locales and the chrome is translated in both", () => {
    const page = readFileSync(join(ROOT, "app", "[locale]", "licenses", "page.tsx"), "utf8");
    expect(page).toContain("locales.map((locale) => ({ locale }))");
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).licenses;
    const ja = load("ja");
    const en = load("en");
    const keys = (o: Record<string, unknown>, pre = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" && v ? keys(v as Record<string, unknown>, `${pre}${k}.`) : [`${pre}${k}`]));
    expect(keys(ja).sort()).toEqual(keys(en).sort());
    for (const p of LICENSE_PLUGINS) expect(ja.plugins[p]).toBeTruthy();
  });
});
