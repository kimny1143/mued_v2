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

describe("/licenses — the note while the shelf is behind the page (kimny 2026-10-13)", () => {
  // ★Temporary by design: the page lists sections the installers on the shelf do not carry yet. Remove the
  //   sentence — and this test — when the four products' 1.0.2 installers are on the shelf.
  it("says, in both languages, that some sections ship from the next installer version", () => {
    const load = (l: string) => JSON.parse(readFileSync(join(ROOT, "messages", `${l}.json`), "utf8")).licenses.note as string;
    expect(load("ja")).toContain("一部の節は、次の版のインストーラーから同梱されます。");
    expect(load("en")).toContain("Some sections will be included in the installers from the next version.");
    expect(load("ja")).not.toContain("と同じ内容"); // the old claim that the page equals the shipped files
  });
});
