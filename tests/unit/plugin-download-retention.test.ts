/**
 * Delivery URLs are immutable promises: once a non-empty *_DOWNLOAD_URL has appeared on the
 * deployable history, the file behind it must remain in public/downloads/.  Do not replace this
 * with a snapshot of the directory — a snapshot can be edited alongside a deleted artifact.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { relative, join } from "node:path";
import { spawnSync } from "node:child_process";
import * as ts from "typescript";
import { expect, it } from "vitest";

const REPOSITORY_ROOT = process.cwd();
const FIXTURE_PATH = "tests/fixtures/download-retention.json";
const DOWNLOAD_URL_NAME = /^[A-Z][A-Z0-9_]*_DOWNLOAD_URL$/;

type Fixture = { urls: string[] };

type UrlCollection = {
  urls: Set<string>;
  unsupported: string[];
};

/** public/ is the web root, so the URL pathname is the repo path under it. */
const localPathFor = (url: string) => join(REPOSITORY_ROOT, "public", new URL(url).pathname);

function git(args: string[], optional = false): string | null {
  const result = spawnSync("git", args, {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });

  if (result.status === 0) {
    return result.stdout;
  }
  if (optional) {
    return null;
  }
  throw new Error(
    `git ${args.join(" ")} failed: ${(result.stderr || result.stdout || "unknown error").trim()}`,
  );
}

function uniqueLines(output: string | null): string[] {
  return [...new Set((output ?? "").split("\n").filter(Boolean))];
}

function readFixture(text: string, source: string): Set<string> {
  let fixture: Fixture;
  try {
    fixture = JSON.parse(text) as Fixture;
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${String(error)}`);
  }

  if (!Array.isArray(fixture.urls) || fixture.urls.some((url) => typeof url !== "string")) {
    throw new Error(`${source} must have a string array at urls`);
  }
  if (new Set(fixture.urls).size !== fixture.urls.length) {
    throw new Error(`${source} has duplicate URLs`);
  }

  return new Set(fixture.urls);
}

function urlsInSource(source: string, sourceName: string): UrlCollection {
  const parsed = ts.createSourceFile(sourceName, source, ts.ScriptTarget.Latest, true);
  const urls = new Set<string>();
  const unsupported: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      DOWNLOAD_URL_NAME.test(node.name.text)
    ) {
      if (node.initializer && ts.isStringLiteralLike(node.initializer)) {
        if (node.initializer.text) {
          urls.add(node.initializer.text);
        }
      } else {
        unsupported.push(`${sourceName}: ${node.name.text} is not a string literal`);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(parsed);
  return { urls, unsupported };
}

/**
 * Find files that have ever declared a download constant, then inspect every version of each file.
 * `HEAD`, rather than `--all`, intentionally limits this to deployable ancestry: an unmerged branch
 * has never sent a delivery email.
 */
function historicallyDeliveredUrls(): UrlCollection {
  const sourcePaths = uniqueLines(
    git([
      "log",
      "HEAD",
      "--format=",
      "--name-only",
      "-G",
      // ★`[[:space:]]+` rather than one literal space. Measured against the narrow form:
      //     `const X_DOWNLOAD_URL`   old 1 / new 1
      //     `const  X_DOWNLOAD_URL`  old 0 / new 1   ← closed
      //     `const\tX_DOWNLOAD_URL`  old 0 / new 1   ← closed
      //     `const\nX_DOWNLOAD_URL`  old 0 / new 0   ← ★STILL OPEN, and structurally so:
      //   git's pickaxe matches within a diff line, so no single-line regex can span the
      //   newline. ★Closing it would mean dropping -G discovery and enumerating candidate
      //   config paths across history instead — not worth it for a form no formatter emits
      //   (this repo has none) and that nobody writes by hand.
      // ★Why any of this is worth widening: the miss is SILENT. A missed file drops its URLs
      //   from the population, and the six existing URLs keep `history.urls.size > 0` green.
      "const[[:space:]]+[A-Z][A-Z0-9_]*_DOWNLOAD_URL",
      "--",
    ]),
  ).filter((path) => /\.[cm]?[jt]sx?$/.test(path));

  const urls = new Set<string>();
  const unsupported: string[] = [];

  for (const sourcePath of sourcePaths) {
    for (const commit of uniqueLines(git(["log", "HEAD", "--format=%H", "--", sourcePath]))) {
      const source = git(["show", `${commit}:${sourcePath}`], true);
      if (source === null) {
        // This is the deletion commit; an earlier revision still contains the source to inspect.
        continue;
      }
      const found = urlsInSource(source, `${commit}:${sourcePath}`);
      found.urls.forEach((url) => urls.add(url));
      unsupported.push(...found.unsupported);
    }
  }

  return { urls, unsupported };
}

function fixtureUrlsRecordedInHistory(): Set<string> {
  const urls = new Set<string>();
  for (const commit of uniqueLines(git(["log", "HEAD", "--format=%H", "--", FIXTURE_PATH]))) {
    const text = git(["show", `${commit}:${FIXTURE_PATH}`], true);
    if (text !== null) {
      readFixture(text, `${commit}:${FIXTURE_PATH}`).forEach((url) => urls.add(url));
    }
  }

  // Also cover an unstaged deletion: after this fixture has landed, the index is its immediate
  // predecessor.  A staged deletion is covered by the committed history above.
  const staged = git(["show", `:${FIXTURE_PATH}`], true);
  if (staged !== null) {
    readFixture(staged, `:${FIXTURE_PATH}`).forEach((url) => urls.add(url));
  }
  return urls;
}

function invalidDownloadUrls(urls: Iterable<string>): string[] {
  return [...urls].filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.origin !== "https://mued.jp" || !parsed.pathname.startsWith("/downloads/");
    } catch {
      return true;
    }
  });
}

function isTracked(localPath: string): boolean {
  const repositoryPath = relative(REPOSITORY_ROOT, localPath);
  // ★`isFile()` is load-bearing: `git ls-files --error-unmatch -- <dir>` SUCCEEDS for a tracked
  //   directory (measured: `public/downloads` → rc=0, 8 entries), and `existsSync` is true for it
  //   too. Without this, a delivery URL that ever ended in `/downloads/` would resolve to the
  //   directory and be reported as retained. ★Negative control: a path that does not exist → rc=1.
  return (
    existsSync(localPath) &&
    statSync(localPath).isFile() &&
    git(["ls-files", "--error-unmatch", "--", repositoryPath], true) !== null
  );
}

function missingArtifacts(urls: Iterable<string>): string[] {
  return [...urls].filter((url) => !isTracked(localPathFor(url)));
}

function filenames(urls: Iterable<string>): string[] {
  return [...urls].map((url) => new URL(url).pathname.split("/").at(-1) ?? url);
}

it(
  "retains every versioned delivery URL in git history as a tracked public/downloads artifact",
  () => {
    const fixtureUrls = readFixture(
      readFileSync(join(REPOSITORY_ROOT, FIXTURE_PATH), "utf8"),
      FIXTURE_PATH,
    );
    expect(
      git(["rev-parse", "--is-shallow-repository"])?.trim(),
      "download retention needs the complete git history; check out with fetch-depth: 0",
    ).toBe("false");
    const history = historicallyDeliveredUrls();

    expect(history.urls.size, "No non-empty *_DOWNLOAD_URL values were derived from git history").toBeGreaterThan(0);
    expect(history.unsupported, "Every *_DOWNLOAD_URL must be a static string literal").toEqual([]);
    expect(invalidDownloadUrls(history.urls), "Delivery URLs must map to /downloads/ under https://mued.jp").toEqual([]);

    // The fixture is a shallow-history backstop, not the population: a new artifact can be added
    // without editing it.  It may only contain URLs that the authoritative git-derived population has
    // actually delivered.
    expect([...fixtureUrls].filter((url) => !history.urls.has(url))).toEqual([]);

    const removedFixtureUrls = [...fixtureUrlsRecordedInHistory()].filter((url) => !fixtureUrls.has(url));
    expect(
      removedFixtureUrls,
      `download-retention fixture is append-only; restored rows required:\n${filenames(removedFixtureUrls)
        .map((name) => `- ${name}`)
        .join("\n")}`,
    ).toEqual([]);

    const missing = missingArtifacts(new Set([...history.urls, ...fixtureUrls]));
    expect(
      missing,
      `Missing retained delivery artifact(s):\n${filenames(missing).map((name) => `- ${name}`).join("\n")}`,
    ).toEqual([]);
  },
  // It walks every commit that touched a download source, so it slows as history grows: ~18 s on CI and ~24 s
  // alone locally (2026-10), and it hit 30 s in full local runs, where the other files compete for the CPU.
  90_000,
);
