/**
 * Has dsp's license-vector set moved past the generation this repo vendored?
 *
 * ★WHY THIS EXISTS. `tests/unit/masterchain-license-vectors.test.ts` hashes every vendored case
 * against `MANIFEST.tsv` — but that compares the copy to the copy's OWN manifest. A copy one
 * generation behind is internally consistent and stays green forever. The `vector-set-version` pin
 * makes a re-vendor deliberate; it is NOT a monitor, because nothing bumps it here when upstream
 * moves. Measured 2026-09-01: the copy sat at v2/14 cases while dsp was on v3/15 for ★35 days, 85
 * tests green throughout, and the miss surfaced only because an unrelated payment-E2E survey
 * happened to run the comparison by hand. This is that comparison, run on purpose.
 *
 * ★WHY NOT CI. Measured: zero of this repo's four workflows check out `mued-dsp`. Adding one needs a
 * token for a different private repo — a secrets change — and without it the job can only skip,
 * which is a green that means nothing. This runs locally from the SessionStart hook, where the two
 * existing notices are already read. ★If it is ever moved into CI it must print "cannot check here"
 * rather than pass — the trap `verify:skills` fell into (#915).
 *
 * ★WHY THE API AND NOT THE SIBLING CLONE. The first cut read `_mued-dsp` and refused to answer when
 * its `FETCH_HEAD` was older than a threshold. ★That threshold could not be defended. Measured from
 * the clone's reflog (348 entries over 90 days), the fraction of wall-clock time the clone would
 * have been "too stale to answer" is 55.8% at 1 day and still 25.2% at 7 — and those figures are an
 * UPPER bound, because a fetch that brings nothing new touches FETCH_HEAD without writing a reflog
 * entry. ★So the data could neither justify a value nor rule one out. Rather than ship a number
 * nobody could move with confidence, the dependency was removed: the API has no staleness to
 * threshold. (product課 pointed out the clone-free route in review of #952; the measurement above is
 * why it replaced the threshold rather than merely competing with it.)
 *
 * ★THE TRAP THIS SCRIPT ITSELF COULD FALL INTO. `commits?path=…` returns `[]` both when nothing has
 * changed and when the path does not exist — measured: a typo'd path returns `length=0`, not an
 * error. A wrong path would therefore report "no drift" forever, reproducing inside the detector the
 * exact failure it exists to catch. `assertUpstreamPathExists` is the positive control.
 *
 * Exit codes — ★2 is deliberately not 0:
 *   0  the vendored copy is the generation upstream is on
 *   1  upstream moved: a re-vendor is due (read the diff first, per PROVENANCE.md)
 *   2  ★the check has no trustworthy answer — either upstream is unreachable, or this repo's own
 *      record does not describe its own copy. Neither is "no drift".
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(__dirname, "../..");
const PROVENANCE = join(REPO, "tests/fixtures/license-vectors/PROVENANCE.md");
const MANIFEST = join(REPO, "tests/fixtures/license-vectors/MANIFEST.tsv");
const UPSTREAM_REPO = "kimny1143/mued-dsp";
const UPSTREAM_PATH = "plugin/MUEDsp/tests/license-vectors";
/** Bounded so an unreachable network cannot hang session start. Exceeding it is exit 2, not 0. */
const GH_TIMEOUT_MS = 8_000;
/** How far back to look for the recorded commit. Beyond this we can still say "behind", just not by how much. */
const HISTORY_DEPTH = 50;

/**
 * ★Both reasons exit 2, but they are not the same failure and must not read as one. "Upstream is
 * invisible" sends you to the network; "our own record is broken" sends you to PROVENANCE.md. A
 * diagnosis that points at the wrong half costs more than the failure it describes.
 */
type Blindness = "upstream-unreachable" | "record-broken";

function cannotCheck(why: string, fix?: string, kind: Blindness = "upstream-unreachable"): never {
  console.error(`★UNKNOWN(vectors): ${why}`);
  console.error(
    kind === "record-broken"
      ? "  ★これは「差分なし」ではありません — ★この repo 側の記録が実物と食い違っています。"
      : "  ★これは「差分なし」ではありません — 上流が見えていないだけです。",
  );
  if (fix) console.error(`  → ${fix}`);
  process.exit(2);
}

/** Any gh failure — offline, unauthenticated, rate-limited, timed out — is "no answer", never "fine". */
function gh(args: string[]): string {
  try {
    return execFileSync("gh", args, { encoding: "utf8", timeout: GH_TIMEOUT_MS }).trim();
  } catch (err) {
    cannotCheck(
      `gh api failed (offline, unauthenticated, rate-limited, or slower than ${GH_TIMEOUT_MS}ms): ${String(err).split("\n")[0]}`,
      "gh auth status",
    );
  }
}

/** The commit PROVENANCE.md says this copy came from. Exactly one row may match. */
function recordedCommit(): string {
  if (!existsSync(PROVENANCE))
    cannotCheck(`PROVENANCE.md not found at ${PROVENANCE}`, undefined, "record-broken");
  const rows = readFileSync(PROVENANCE, "utf8").match(/^\| commit \| \*\*`([0-9a-f]{7,40})`\*\*/gm);
  if (!rows || rows.length !== 1) {
    // ★Ambiguity here would silently pick a commit. Refuse instead.
    cannotCheck(
      `expected exactly one recorded commit row in PROVENANCE.md, found ${rows?.length ?? 0}`,
      "restore the `| commit | **`<sha>`** |` row",
      "record-broken",
    );
  }
  return rows[0].match(/`([0-9a-f]{7,40})`/)![1];
}

/**
 * ★Positive control. A typo'd path returns an empty commit list, which is indistinguishable from
 * "nothing changed" — so prove the path resolves to case files before trusting any emptiness below.
 */
function assertUpstreamPathExists(): number {
  // ★Own try/catch, not the shared gh() helper. A missing path answers 404 here, and gh()'s message
  // would blame the network or the token — sending the reader to `gh auth status` for a typo. The
  // wrong diagnosis costs more than the failure it describes.
  let raw: string;
  try {
    raw = execFileSync(
      "gh",
      [
        "api",
        `repos/${UPSTREAM_REPO}/contents/${UPSTREAM_PATH}/cases`,
        "--jq",
        '[.[] | select(.name | endswith(".key"))] | length',
      ],
      { encoding: "utf8", timeout: GH_TIMEOUT_MS, stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
  } catch (err) {
    const msg = String(err);
    cannotCheck(
      /404|Not Found/.test(msg)
        ? `${UPSTREAM_PATH}/cases does not exist in ${UPSTREAM_REPO} — the upstream layout moved, or UPSTREAM_PATH is wrong`
        : `could not read ${UPSTREAM_PATH}/cases: ${msg.split("\n")[0]}`,
      /404|Not Found/.test(msg)
        ? "fix UPSTREAM_PATH in this script — do NOT read the empty result below as 'no drift'"
        : "gh auth status",
    );
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) {
    cannotCheck(
      `${UPSTREAM_PATH}/cases holds no .key files upstream — an empty commit list below would be meaningless`,
      "the upstream layout moved; fix UPSTREAM_PATH in this script",
    );
  }
  return n;
}

/**
 * ★Does PROVENANCE.md describe the copy sitting next to it?
 *
 * Everything below compares the RECORDED commit against upstream — so a record that has drifted from
 * the files it claims to describe makes the whole comparison answer the wrong question. Editing only
 * the commit row forward, without re-vendoring, leaves this script saying "current" while the copy is
 * a generation behind, and `masterchain-license-vectors.test.ts` green as well (the copy and its own
 * manifest still agree, and `vector-set-version` did not move). ★That is the 35-day hole reproduced
 * WITH the monitor in place. (product課, review of #954.)
 *
 * PROVENANCE.md already asserts this in prose — "Verified at vendoring time: the MANIFEST.tsv blob
 * hash above matches this copy exactly". ★A sentence is not a check: it holds only for whoever read
 * it on the day they read it, which is the same shape as a hand-run RED nobody re-runs.
 *
 * ★Runs before any network call, and needs none: when `gh` is unreachable this is still answerable,
 * so an offline session gets a real verdict on the half that does not need upstream.
 */
function assertRecordFitsCopy(): void {
  if (!existsSync(MANIFEST))
    cannotCheck(`MANIFEST.tsv not found at ${MANIFEST}`, undefined, "record-broken");
  const rows = readFileSync(PROVENANCE, "utf8").match(
    /^\| `MANIFEST\.tsv` git blob \| \*\*`([0-9a-f]{40})`\*\*/gm,
  );
  if (!rows || rows.length !== 1) {
    cannotCheck(
      `expected exactly one recorded MANIFEST blob row in PROVENANCE.md, found ${rows?.length ?? 0}`,
      "restore the ``| `MANIFEST.tsv` git blob | **`<sha>`** |`` row",
      "record-broken",
    );
  }
  const recorded = rows[0].match(/`([0-9a-f]{40})`/)![1];
  const actual = execFileSync("git", ["hash-object", MANIFEST], {
    encoding: "utf8",
    cwd: REPO,
  }).trim();
  if (recorded !== actual) {
    cannotCheck(
      `PROVENANCE.md records MANIFEST blob ${recorded.slice(0, 12)} but the vendored file hashes to ${actual.slice(0, 12)} — the record does not describe the copy, so "which generation is this?" has no trustworthy answer`,
      "re-vendor per PROVENANCE.md § Re-vendoring, or correct the recorded blob — do NOT read the upstream comparison below until they agree",
      "record-broken",
    );
  }
}

function main(): void {
  // ★First, and network-free: everything after this trusts PROVENANCE to describe the copy.
  assertRecordFitsCopy();

  const recorded = recordedCommit();
  const upstreamCases = assertUpstreamPathExists();

  const history = gh([
    "api",
    `repos/${UPSTREAM_REPO}/commits?path=${UPSTREAM_PATH}&per_page=${HISTORY_DEPTH}`,
    "--jq",
    '.[] | "\\(.sha[0:7]) \\(.commit.author.date[0:10]) \\(.commit.message | split("\\n")[0])"',
  ])
    .split("\n")
    .filter(Boolean);

  if (history.length === 0) {
    // Cannot happen once the positive control passed, but a silent 0 here would be the whole bug.
    cannotCheck(`no commits touch ${UPSTREAM_PATH} even though ${upstreamCases} cases exist there`);
  }

  const ahead = history.findIndex((l) => l.startsWith(recorded.slice(0, 7)));
  const seen = `${UPSTREAM_REPO}@${history[0].slice(0, 7)}, ${upstreamCases} cases upstream`;

  if (ahead === 0) {
    console.log(`✓ vendored vectors are current (${recorded} · ${seen}).`);
    process.exit(0);
  }

  if (ahead < 0) {
    // ★Only now is it worth a round trip: "behind by more than HISTORY_DEPTH" and "PROVENANCE records
    // a commit that does not exist" look identical from here and want opposite responses. Checking
    // this eagerly would cost every run an API call to answer a question almost no run asks.
    try {
      execFileSync("gh", ["api", `repos/${UPSTREAM_REPO}/commits/${recorded}`, "--jq", ".sha"], {
        encoding: "utf8",
        timeout: GH_TIMEOUT_MS,
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      cannotCheck(
        `PROVENANCE.md records ${recorded}, which is not a commit in ${UPSTREAM_REPO}`,
        "fix the recorded commit in tests/fixtures/license-vectors/PROVENANCE.md",
        "record-broken",
      );
    }
  }

  const moved = ahead > 0 ? history.slice(0, ahead) : history;
  console.error(
    ahead > 0
      ? `★DRIFT(vectors): upstream moved ${ahead} commit(s) past ${recorded}.`
      : `★DRIFT(vectors): ${recorded} is a real commit but is not among the last ${HISTORY_DEPTH} touching this path — the copy is further behind than that.`,
  );
  for (const line of moved.slice(0, 10)) console.error(`    ${line}`);
  console.error(`  ${seen}`);
  console.error(
    "  → ★Read the diff before copying bytes — an added case can encode a decision this repo has not made:",
  );
  console.error(
    `     gh api repos/${UPSTREAM_REPO}/compare/${recorded}...${history[0].slice(0, 7)} --jq '.files[].filename'`,
  );
  console.error("     then follow tests/fixtures/license-vectors/PROVENANCE.md § Re-vendoring");
  process.exit(1);
}

main();
