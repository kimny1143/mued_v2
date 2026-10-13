# license-vectors — where these bytes came from

**Vendored copy. Do not edit in place.** These files are the shared contract between the TypeScript
issuer (`lib/masterchain/license.ts`) and the plugin's C++ verifier, which are written in different
languages. Editing this copy would make the two sides agree with *this repo* instead of with *each
other*, which is the one thing the vectors exist to prevent.

## Source

| | |
|---|---|
| repo | `mued-dsp` (`_mued-dsp`) |
| ref | `main` |
| commit | **`b5b72d0`** — *test(license): --check で MANIFEST も全文比較・--self-test を CI へ (#873)*, on top of `744e57a` *同じ product で scope だけ違う鍵（MUEDvox の形）を拒否する vector と試験 (#872)* |
| path | `plugin/MUEDsp/tests/license-vectors/` |
| `MANIFEST.tsv` git blob | **`ce19185a2e80f61e8dfe5df5f9b97b0a86d42ade`** |
| cases | **16** |
| `vector-set-version` | **4** (pinned in `masterchain-license-vectors.test.ts`) |
| vendored | 2026-10-13 (re-vendored; earlier copies were `f207182` / 15 cases, `88e2b83` / 14 cases and `463d3f8` / 13 cases) |

★**The blob row above is checked, not merely asserted.** `npm run verify:vector-drift` re-hashes
`MANIFEST.tsv` against it on every run (and at session start), and refuses to compare against upstream
when they disagree. ★Until 2026-09-02 this was prose only — which meant editing the commit row forward
without re-vendoring left both the drift check and the vector suite green while the copy was a
generation behind. ★A sentence holds only for whoever read it on the day they read it.

Verified at vendoring time: the `MANIFEST.tsv` blob hash above matches this copy exactly, and all 16
case files are byte-identical to `b5b72d0`. The upstream diff was read before copying: **it adds
only** — one case (`same_product_sibling_scope`, verdict `reject`: product `MUEDsp`, scope `muedvox`,
a valid signature — the key a MUEDvox buyer holds, which masterchain must not open) and the set
version 3 → 4; **no existing verdict moved**, which `git status` showed independently (one `M` on the
manifest, one `??` on the new case, nothing else touched). ★The decision the new case encodes was
already made here: the webhook issues MUEDvox keys as product `MUEDsp` + scope `muedvox`
(`lib/plugins/paid-products.ts`, #1218).

## ★Why the commit and blob are recorded, not just the sha256

`masterchain-license-vectors.test.ts` already re-hashes every case against `MANIFEST.tsv` on each
run. That catches drift — but **a sha256 mismatch alone cannot tell you WHICH drift happened**, and
the two demand opposite responses:

- **this copy went stale** → re-vendor from upstream; nothing to think about
- **upstream changed** → the expected verdicts may have changed too; ★**read the diff before
  re-vendoring**, because a vector's verdict flipping is a change to the contract itself

With `repo@commit` + blob recorded, whoever hits the red can answer that in one command instead of
guessing.

★**This is not hypothetical — it already happened, on the "upstream changed" side.** The first copy
here took the 13-case set at `463d3f8` on 2026-07-26 at 01:58 JST. **Eleven minutes later** dsp
landed the 14th vector (`injected_field` — an injected duplicate `expires_at` that turns a lapsed key
perpetual) on `main` as `d37ee7a`, then stamped the set with a version as `88e2b83`. Because this
file recorded `repo@commit`, product課 could tell in one command that the copy was a generation
behind rather than corrupt, and this directory was re-vendored to `88e2b83` on 2026-07-27.

## ★★A hash cannot see a case that is not here

Note what the sha256 checks did *not* catch above: for eleven minutes and then some, this copy was
**internally consistent** — 13 files, 13 manifest rows, every hash matching — and therefore green,
while the one vector that pins the duplicate-field escalation was simply absent. ★**The failure mode
of a vendored set is not a changed byte, it is a missing case, and there is nothing to hash.**

That is what `# vector-set-version` in `MANIFEST.tsv` is for: upstream bumps it when the SET changes,
and `masterchain-license-vectors.test.ts` pins the expected value. It is the only assertion in that
file that a self-consistent stale copy cannot satisfy. ★**When it fails, do not just copy the files
over — read dsp's diff first**, because an added case can encode a decision this repo has not made.

## ★★The version pin fires when you re-vendor. Nothing here fires when upstream moves.

It happened a second time, and this time it is worth reading how it was found — because it was not
found by anything in this repo.

dsp landed `valid_issued_at_millis` on 2026-07-27 (`7194b39`, #242) — ★**the shape the production
path actually emits**: `fastspring-webhook.ts` passes only `{owner, order}` to `issueLicense`, so
`issued_at` is `new Date().toISOString()` and carries milliseconds, and every hand-written vector
until then used whole seconds. This copy stayed at 14 cases and ★**stayed green for 35 days** — 85
tests passing the entire time — while the one vector pinning the production shape was absent.

★**No assertion here could have failed.** The set-version pin compares this copy against ★*this
copy's own* manifest; both were version 2 and internally consistent. The pin is what makes a
re-vendor deliberate — ★**it is not a monitor, and reading it as one is the mistake.** What actually
surfaced the drift was an unrelated survey (2026-09-01) that ran the command in *Re-vendoring* below
against upstream.

★**So: `git log <recorded-commit>..main` on the upstream path is not only the first step of
re-vendoring — it is the only thing in this procedure that can tell you a re-vendor is due.**

★**Since 2026-09-02 something does run it**: `npm run verify:vector-drift` (#954) asks upstream
directly and prints the answer at session start — `0` current, `1` re-vendor due, ★`2` no trustworthy
answer, which is deliberately not `0`. ★It is not in CI: no workflow here checks out `mued-dsp`, and
giving CI a token to another private repo is a secrets change, while a skipping job would be a green
that means nothing.

★**It removes the "nobody is watching" half, not the "green means current" caveat.** When it cannot
reach upstream it says so instead of passing, so a quiet session start is still only as good as the
last run that actually answered.

(For the record, the drift was benign: the current issuer accepts the millis form — verified by
running the new case through `evaluateLicense` before vendoring, with `valid_no_expiry` as a positive
control and a tampered payload as a negative one. ★**A coverage hole, not a break** — but the hole
was invisible, and that is the part worth keeping.)

## Re-vendoring

Read the upstream diff first (`git -C "$D" log --oneline <recorded-commit>..main -- plugin/MUEDsp/tests/license-vectors/`),
then copy from a commit rather than from a working tree — a working tree can be on any branch:

```sh
D=/path/to/_mued-dsp
REF=main                                    # or the specific commit you just read
V=plugin/MUEDsp/tests/license-vectors
git -C "$D" show "$REF:$V/MANIFEST.tsv" > tests/fixtures/license-vectors/MANIFEST.tsv
for f in $(git -C "$D" ls-tree --name-only "$REF" "$V/cases/"); do
  git -C "$D" show "$REF:$f" > "tests/fixtures/license-vectors/cases/$(basename "$f")"
done
git hash-object tests/fixtures/license-vectors/MANIFEST.tsv   # record this in the table above
```

Then update the table above (including `vector-set-version`), bump `EXPECTED_SET_VERSION` in
`tests/unit/masterchain-license-vectors.test.ts` if the set changed, and run
`npx vitest run --config vitest.config.unit.ts tests/unit/masterchain-license-vectors.test.ts`.

★**`git status` after copying is itself evidence**: a re-vendor that only adds files (and does not
modify the existing ones) shows that upstream *added* cases without editing the old ones — which is a
different, and much smaller, thing to review than verdicts moving underneath you.
