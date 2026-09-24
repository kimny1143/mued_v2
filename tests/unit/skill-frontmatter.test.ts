import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import matter from "gray-matter";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../..");
// Discover all tracked skills, including future additions, rather than pinning names.
const skillFiles = execFileSync(
  "git",
  ["ls-files", ".claude/skills/*/SKILL.md", ".agents/skills/*/SKILL.md"],
  { cwd: repoRoot, encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

describe("tracked skill frontmatter", () => {
  it("discovers at least 20 tracked skill files", () => {
    expect(skillFiles.length).toBeGreaterThanOrEqual(20);
  });

  for (const path of skillFiles) {
    it(`${path} has a matching name and a non-empty description of at most 1024 characters`, () => {
      const source = readFileSync(join(repoRoot, path), "utf8");
      expect(source, `${path}: missing opening or closing frontmatter delimiter`).toMatch(
        /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,
      );

      // YAML parsing handles quoted scalars and folded (>) / literal (|) blocks.
      const { name, description } = matter(source).data;
      expect(name, `${path}: name must match its directory`).toBe(basename(dirname(path)));
      expect(description, `${path}: description must be a string`).toBeTypeOf("string");
      expect(description.trim(), `${path}: description must not be empty`).not.toBe("");
      expect([...description].length, `${path}: description exceeds 1024 characters`).toBeLessThanOrEqual(1024);
    });
  }
});
