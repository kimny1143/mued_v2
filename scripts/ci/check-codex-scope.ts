/**
 * Check a Codex-authored PR against the path allowlist written into its body by the ordering
 * script. This file intentionally uses JavaScript syntax that is also valid TypeScript: the CI
 * workflow can run it with Node.js without installing packages or contacting a package registry.
 */
const { execFileSync } = process.getBuiltinModule("node:child_process");
const { readFileSync } = process.getBuiltinModule("node:fs");

const DECLARATION_LINE = /^\s*-\s*編集を許した path:\s*(.*)\s*$/;
const CODEX_BRANCH_PREFIX = "fix/codex-";

/**
 * Parse the single-quoted string-list subset emitted by Python's list repr.
 *
 * @param {string} literal
 * @returns {string[] | null}
 */
function parsePythonStringList(literal = "") {
  let index = 0;

  const skipWhitespace = () => {
    while (index < literal.length && /\s/.test(literal[index])) index += 1;
  };

  /** @param {number} length @returns {string | null} */
  const readHexEscape = (length = 0) => {
    const digits = literal.slice(index, index + length);
    if (digits.length !== length || !/^[0-9a-fA-F]+$/.test(digits)) return null;
    index += length;
    const codePoint = Number.parseInt(digits, 16);
    if (codePoint > 0x10ffff) return null;
    return String.fromCodePoint(codePoint);
  };

  /** @returns {string | null} */
  const readString = () => {
    if (literal[index] !== "'") return null;
    index += 1;
    let value = "";

    while (index < literal.length) {
      const character = literal[index];
      index += 1;

      if (character === "'") return value;
      if (character !== "\\") {
        value += character;
        continue;
      }

      if (index >= literal.length) return null;
      const escaped = literal[index];
      index += 1;
      switch (escaped) {
        case "'":
        case '"':
        case "\\":
          value += escaped;
          break;
        case "a":
          value += "\u0007";
          break;
        case "b":
          value += "\b";
          break;
        case "f":
          value += "\f";
          break;
        case "n":
          value += "\n";
          break;
        case "r":
          value += "\r";
          break;
        case "t":
          value += "\t";
          break;
        case "v":
          value += "\v";
          break;
        case "x": {
          const decoded = readHexEscape(2);
          if (decoded === null) return null;
          value += decoded;
          break;
        }
        case "u": {
          const decoded = readHexEscape(4);
          if (decoded === null) return null;
          value += decoded;
          break;
        }
        case "U": {
          const decoded = readHexEscape(8);
          if (decoded === null) return null;
          value += decoded;
          break;
        }
        default:
          // Python preserves an unknown escape in the resulting string.
          value += `\\${escaped}`;
      }
    }

    return null;
  };

  skipWhitespace();
  if (literal[index] !== "[") return null;
  index += 1;
  skipWhitespace();

  const paths = literal.slice(0, 0).split("");
  if (literal[index] === "]") {
    index += 1;
    skipWhitespace();
    return index === literal.length ? paths : null;
  }

  while (index < literal.length) {
    const path = readString();
    if (path === null) return null;
    paths.push(path);
    skipWhitespace();

    if (literal[index] === "]") {
      index += 1;
      skipWhitespace();
      return index === literal.length ? paths : null;
    }
    if (literal[index] !== ",") return null;
    index += 1;
    skipWhitespace();

    // A trailing comma is valid Python list-literal syntax.
    if (literal[index] === "]") {
      index += 1;
      skipWhitespace();
      return index === literal.length ? paths : null;
    }
  }

  return null;
}

/**
 * Return the declared paths, or null when exactly one valid declaration cannot be established.
 * Treating duplicate declaration lines as invalid avoids silently choosing one of two anchors.
 *
 * @param {string} body
 * @returns {string[] | null}
 */
function parseAllowedPaths(body = "") {
  const payloads = body.slice(0, 0).split("");
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(DECLARATION_LINE);
    if (match) payloads.push(match[1].trim());
  }

  if (payloads.length !== 1) return null;
  return parsePythonStringList(payloads[0]);
}

/** @param {string} headBranch @returns {boolean} */
function shouldCheckBranch(headBranch = "") {
  return headBranch.startsWith(CODEX_BRANCH_PREFIX);
}

/**
 * Pure scope decision using the same boundary rule as the ordering script: exact path equality, or
 * a descendant separated from the declared path by "/". No path normalisation is performed.
 *
 * @param {readonly string[]} changedFiles
 * @param {readonly string[]} allowedPaths
 * @returns {string[]}
 */
function findOutOfScopeFiles(changedFiles = [""], allowedPaths = [""]) {
  return changedFiles.filter(
    (file) =>
      !allowedPaths.some((allowedPath) => {
        const directory = allowedPath.replace(/\/+$/, "");
        return file === allowedPath || file.startsWith(`${directory}/`);
      }),
  );
}

/**
 * Pure end-to-end decision, exported so branch selection and parse failures can be tested without
 * a GitHub API call.
 *
 * @param {string} headBranch
 * @param {string} body
 * @param {readonly string[]} changedFiles
 * @returns {{kind: "skipped"} | {kind: "passed", outsideFiles: string[]} | {kind: "failed", reason: "invalid_declaration" | "out_of_scope", outsideFiles: string[]}}
 */
function evaluateScope(headBranch = "", body = "", changedFiles = [""]) {
  if (!shouldCheckBranch(headBranch)) return { kind: "skipped" };

  const allowedPaths = parseAllowedPaths(body);
  if (allowedPaths === null) {
    return { kind: "failed", reason: "invalid_declaration", outsideFiles: [] };
  }

  const outsideFiles = findOutOfScopeFiles(changedFiles, allowedPaths);
  if (outsideFiles.length > 0) {
    return { kind: "failed", reason: "out_of_scope", outsideFiles };
  }
  return { kind: "passed", outsideFiles: [] };
}

/** @param {string} name @returns {string} */
function requiredEnvironment(name = "") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/** @returns {{number: number, headBranch: string, body: string}} */
function readPullRequestEvent() {
  const eventPath = requiredEnvironment("GITHUB_EVENT_PATH");
  const event = JSON.parse(readFileSync(eventPath, "utf8"));
  const pullRequest = event.pull_request;

  if (
    !pullRequest ||
    !Number.isInteger(pullRequest.number) ||
    pullRequest.number < 1 ||
    !pullRequest.head ||
    typeof pullRequest.head.ref !== "string"
  ) {
    throw new Error("GITHUB_EVENT_PATH does not contain a valid pull_request event");
  }

  return {
    number: pullRequest.number,
    headBranch: pullRequest.head.ref,
    body: typeof pullRequest.body === "string" ? pullRequest.body : "",
  };
}

/**
 * @param {string} repository
 * @param {number} pullRequestNumber
 * @returns {string[]}
 */
function fetchChangedFiles(repository = "", pullRequestNumber = 0) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY is not a valid owner/repository name");
  }

  const endpoint = `repos/${repository}/pulls/${pullRequestNumber}/files`;
  const output = execFileSync("gh", ["api", endpoint, "--paginate", "--slurp"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  const pages = JSON.parse(output);

  if (!Array.isArray(pages)) throw new Error("GitHub API pagination result is not an array");

  const filenames = repository.slice(0, 0).split("");
  for (const page of pages) {
    if (!Array.isArray(page)) throw new Error("GitHub API page is not an array");
    for (const file of page) {
      if (!file || typeof file !== "object" || typeof file.filename !== "string") {
        throw new Error("GitHub API returned a pull-request file without a filename");
      }
      filenames.push(file.filename);
    }
  }
  return filenames;
}

function main() {
  const pullRequest = readPullRequestEvent();

  // AC: selection is based only on the head branch, and non-Codex branches pass silently.
  if (!shouldCheckBranch(pullRequest.headBranch)) return;

  const allowedPaths = parseAllowedPaths(pullRequest.body);
  if (allowedPaths === null) {
    console.error("Codex scope check failed: the PR body has no single parseable '編集を許した path' line.");
    process.exitCode = 1;
    return;
  }

  const repository = requiredEnvironment("GITHUB_REPOSITORY");
  const changedFiles = fetchChangedFiles(repository, pullRequest.number);
  const outsideFiles = findOutOfScopeFiles(changedFiles, allowedPaths);

  if (outsideFiles.length > 0) {
    console.error("Codex scope check failed: files outside the declared paths:");
    for (const file of outsideFiles) console.error(`  - ${JSON.stringify(file)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Codex scope check passed: ${changedFiles.length} changed file(s) are within scope.`);
}

module.exports = {
  evaluateScope,
  findOutOfScopeFiles,
  parseAllowedPaths,
  shouldCheckBranch,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Codex scope check could not run: ${message}`);
    process.exitCode = 1;
  }
}
