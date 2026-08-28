/**
 * Every skill under .claude/skills must have a recovery path. Fail if any does not.
 *
 * ★WHY. `.gitignore` excludes `.claude/skills/*` with a short allowlist. A skill that is neither a
 * symlink nor allowlisted is invisible to git: it does not appear in `git status`, not even as
 * untracked, because ignored files are not untracked. On 2026-08-29 a checkout reported "untracked
 * 0" as evidence the handoff was safe — while three mued-authored skills (43 KB, two of them named
 * in CLAUDE.md) existed on exactly one disk, in no clone and no backup.
 *
 * ★The axis that matters is NOT "is it ignored" but "does a copy exist somewhere else". Of the 28
 * ignored entries that day, 16 were symlinks into claude-code-template and 9 were byte-identical to
 * a copy there — all recoverable. Only 3 were not. Treating "ignored" as the risk signal either
 * over-collects 25 files or misses the 3.
 *
 * ★WHY A LIST AND NOT A PROBE. CI has no checkout of claude-code-template, so "is there a copy
 * upstream?" cannot be measured there, and the SKILL.md files carry no marker that separates
 * distributed from locally authored (checked 2026-08-29: same frontmatter shape, and one has no
 * frontmatter at all). So the distributed set is named explicitly in .claude/skills/DISTRIBUTED.txt.
 * That converts "everything else, ignored" — an unnamed set nobody can count — into a list that
 * goes stale loudly instead of quietly. Same move as replacing the `scripts/**` glob with a named
 * exclude list in tsconfig.scripts.json.
 *
 * ★A note in .gitignore was the first attempt. It is still there and still true, but the next
 * person to add a skill will not read it (product課, reviewing #914). A check runs whether or not
 * anyone remembers it.
 *
 * Exit codes: 0 = every skill has a recovery path · 1 = at least one does not, or the list is stale
 * · 2 = ★the check itself could not be trusted (NOT "nothing found").
 */
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = ".claude/skills";
const MANIFEST = join(SKILLS, "DISTRIBUTED.txt");

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(2);
}

if (!existsSync(SKILLS)) fail(`${SKILLS} not found — the check cannot run.`);
if (!existsSync(MANIFEST)) fail(`${MANIFEST} not found — the distributed list is the other half of this check.`);

// ★The manifest is half of this check, so it needs the same protection it grants. On first write it
//   was swallowed by the `.claude/skills/*` glob — the list of what is protected was not itself
//   protected, and nothing would have said so. Ignored files do not appear in `git status`.
const manifestTracked = execFileSync("git", ["ls-files", MANIFEST], { encoding: "utf8" }).trim();
if (!manifestTracked) {
  fail(
    `${MANIFEST} is not tracked by git — it is ignored, so it has no recovery path either.\n` +
      "  Add `!.claude/skills/DISTRIBUTED.txt` to .gitignore and commit it.",
  );
}

const distributed = new Set(
  readFileSync(MANIFEST, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#")),
);

/** Real (non-symlink) skill directories. Symlinks are excluded on purpose: git never follows them,
 *  their contents live in the template repo, and running check-ignore through a symlinked path
 *  reports "not ignored" while the contents are still untracked — an aim error, not a finding. */
const realDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !lstatSync(join(SKILLS, e.name)).isSymbolicLink())
  .map((e) => e.name)
  .sort();

// ★Assert the population before asserting anything over it. A walk that matches nothing makes every
//   per-item check pass, and the result looks identical to "all clear".
if (realDirs.length === 0) fail("no real skill directories found — the walk is not measuring anything.");

const tracked = new Set(
  execFileSync("git", ["ls-files", SKILLS], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((p) => p.slice(SKILLS.length + 1).split("/")[0]),
);

const unprotected = realDirs.filter((d) => !tracked.has(d) && !distributed.has(d));
const stale = [...distributed].filter((d) => !realDirs.includes(d)).sort();

// ★Dirent.isDirectory() uses lstat semantics, so it is FALSE for a symlink — `isDirectory() &&
//   isSymbolicLink()` can never both hold, and the first version of this line reported "0 symlinks"
//   while 16 existed. Count symlinks with isSymbolicLink() alone, and assert the parts sum to the
//   whole so a miscount cannot pass as a report again.
const entries = readdirSync(SKILLS, { withFileTypes: true });
const symlinks = entries.filter((e) => e.isSymbolicLink()).length;
const trackedHere = realDirs.filter((d) => tracked.has(d)).length;
const listed = realDirs.filter((d) => distributed.has(d)).length;
const dirsOnDisk = entries.filter((e) => e.isDirectory() || e.isSymbolicLink()).length;
if (realDirs.length + symlinks !== dirsOnDisk) {
  fail(`partition does not add up: ${realDirs.length} real + ${symlinks} symlinks != ${dirsOnDisk} on disk.`);
}
console.log(
  `  ${dirsOnDisk} skill dirs · ${trackedHere} tracked here · ${listed} distributed · ` +
    `${symlinks} symlinks · ${realDirs.length - trackedHere - listed} unclassified`,
);

if (unprotected.length === 0 && stale.length === 0) {
  console.log("✓ every skill has a recovery path (tracked here, distributed, or a symlink).");
  process.exit(0);
}

if (unprotected.length) {
  console.error(`\n✗ ${unprotected.length} skill(s) exist on this disk only — no clone, no backup:\n`);
  for (const d of unprotected) console.error(`    ${SKILLS}/${d}`);
  console.error(
    "\n  Pick one and do it in the same commit:\n" +
      "    · mued-authored → add `!.claude/skills/<name>/` to .gitignore and `git add` the files\n" +
      `    · distributed   → add the name to ${MANIFEST}`,
  );
}
if (stale.length) {
  console.error(`\n✗ ${stale.length} name(s) in ${MANIFEST} no longer exist on disk:\n`);
  for (const d of stale) console.error(`    ${d}`);
  console.error(
    "\n  A stale entry claims a recovery path for something that is gone. Remove the line, or\n" +
      "  restore the skill if the removal was accidental.",
  );
}
process.exit(1);
