import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ja from "@/messages/ja.json";

function paths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) => paths(child, `${prefix}.${key}`));
}

describe("trial translations", () => {
  it("keeps both new blocks in ja/en key parity", () => {
    expect(paths(ja.muedsp.trial).sort()).toEqual(paths(en.muedsp.trial).sort());
    expect(paths(ja.pluginPortal).sort()).toEqual(paths(en.pluginPortal).sort());
  });
  it.each([en, ja])("never directs users into hidden folders", (messages) => {
    for (const block of [messages.pluginPortal, messages.muedsp.trial]) {
      expect(JSON.stringify(block)).not.toMatch(/Application Support|~\/Library/);
    }
  });
  it.each([en, ja])("explains drag & drop first, then the two buttons, on every key surface (conductor 2026-10-01)", (messages) => {
    for (const copy of [messages.pluginPortal.purchased.howto, messages.pluginPortal.trial.howto, messages.muedsp.trial.howToUse]) {
      expect(copy).toContain("license.key");
      expect(copy).toContain("Drop license.key here");
      expect(copy).toContain("Load license file…");
      expect(copy).toContain("Paste license key");
      expect(copy.indexOf("Drop license.key here")).toBeLessThan(copy.indexOf("Load license file…"));
      expect(copy.indexOf("Load license file…")).toBeLessThan(copy.indexOf("Paste license key"));
      if (messages === ja) {
        expect(copy).toContain("ドラッグ&ドロップ");
        expect(copy).toContain("「Load license file…」");
        expect(copy).toContain("「Paste license key」");
      }
    }
  });
  it.each([en, ja])("FAQ q9 says how to put the key in (drag & drop, else the two buttons)", (messages) => {
    const a = messages.support.faq.q9.answer;
    expect(a).toContain("license.key");
    expect(a).toContain("Load license file…");
    expect(a).toContain("Paste license key");
  });
  it.each([en, ja])("never describes the bypass as lost audio", (messages) => {
    for (const block of [messages.muedsp.trial, messages.pluginPortal.trial]) {
      expect(JSON.stringify(block)).not.toMatch(/mute|silent|無音|音が出ない/i);
      // ★The plugin's own words since 1.0.1 (dsp 2026-09-30): "DEMO EXPIRED", and no "bypass" for the demo state.
      expect(block.bypass).toContain("DEMO EXPIRED");
      expect(block.bypass).not.toMatch(/bypass|バイパス/i);
    }
  });
});
