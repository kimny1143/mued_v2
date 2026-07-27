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
| commit | **`88e2b83`** — *test(license): stamp the vector set with a version (#235)*, on top of `d37ee7a` *land the 14th vector on trunk (#234)* |
| path | `plugin/MUEDsp/tests/license-vectors/` |
| `MANIFEST.tsv` git blob | **`15b3e05438fb1786a619f588ae7229856459e46e`** |
| cases | **14** |
| `vector-set-version` | **2** (pinned in `masterchain-license-vectors.test.ts`) |
| vendored | 2026-07-27 (re-vendored; first copy was `463d3f8` / 13 cases) |

Verified at vendoring time: the `MANIFEST.tsv` blob hash above matches this copy exactly, and all 14
case files are byte-identical to `main`.

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
