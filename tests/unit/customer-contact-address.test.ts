import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// kimny, 2026-09-24: 「アドレスの件は全てsupport@mued.jpね」. The glasswerks.jp mailboxes belong to
// the music-production company's own admin (hiring etc.) and have no role on MUED. Every address a
// MUED customer can see — support page, 特商法, llms.txt, mail — is support@mued.jp.
//
// ★Population is cut by EXCLUSION: every source file under the shipped roots is read, so a new
// surface is covered the day it is added (an include-list only covers the places someone remembered).
const ROOTS = ["app", "components", "lib", "messages"];
const EXTENSIONS = /\.(tsx?|jsx?|json|md|txt)$/;
const GLASSWERKS_MAILBOX = /[A-Za-z0-9._%+-]+@glasswerks\.jp/g;

function walk(dir: string, out: string[]): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTENSIONS.test(name)) out.push(path);
  }
  return out;
}

describe("customer-facing contact address", () => {
  const files = ROOTS.flatMap((root) => walk(root, []));

  it("no shipped source names a glasswerks.jp mailbox", () => {
    // Liveness: a broken walk would read nothing and pass the check below vacuously.
    expect(files.length).toBeGreaterThan(200);
    const hits = files.flatMap((file) =>
      (readFileSync(file, "utf8").match(GLASSWERKS_MAILBOX) ?? []).map((address) => `${file}: ${address}`),
    );
    expect(hits).toEqual([]);
  });

  it("the replacement address is actually read by the same walk (positive control)", () => {
    const withSupport = files.filter((file) => readFileSync(file, "utf8").includes("support@mued.jp"));
    for (const expected of [
      join("app", "[locale]", "support", "page.tsx"),
      join("app", "llms.txt", "route.ts"),
      join("messages", "ja.json"),
      join("messages", "en.json"),
    ]) {
      expect(withSupport).toContain(expected);
    }
  });
});
