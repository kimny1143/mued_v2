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
    expect(paths(ja.pluginPortal.trial).sort()).toEqual(paths(en.pluginPortal.trial).sort());
  });
  it.each([en, ja])("never describes the bypass as lost audio", (messages) => {
    for (const block of [messages.muedsp.trial, messages.pluginPortal.trial]) {
      expect(JSON.stringify(block)).not.toMatch(/mute|silent|無音|音が出ない/i);
      expect(block.bypass).toContain("Demo expired");
    }
  });
});
