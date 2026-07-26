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
| commit | **`463d3f8`** — *docs+test(license): 形式 v2 凍結 + golden vector (#232)* |
| path | `plugin/MUEDsp/tests/license-vectors/` |
| `MANIFEST.tsv` git blob | **`16d8905bd2ba31498472384f0e647dd6921ee957`** |
| cases | **13** |
| vendored | 2026-07-26 |

Verified at vendoring time: the `MANIFEST.tsv` blob hash above matches this copy exactly, and all 13
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

★**This is not hypothetical here.** A 14th vector (`injected_field` — an injected duplicate
`expires_at` that turns a lapsed key perpetual) exists on dsp's **unmerged** `feat/license-verifier`
branch, not on `main`. dsp is deliberately preserving that branch's history, so if it is later
squashed or rebased the vector bytes can change **for a legitimate reason**. Without this file, that
would surface as an indistinguishable red.

## Re-vendoring

```sh
D=/path/to/_mued-dsp
cp "$D/plugin/MUEDsp/tests/license-vectors/MANIFEST.tsv" tests/fixtures/license-vectors/
cp "$D"/plugin/MUEDsp/tests/license-vectors/cases/*.key tests/fixtures/license-vectors/cases/
git hash-object tests/fixtures/license-vectors/MANIFEST.tsv   # record this here
```

Then update the table above and run `npx vitest run --config vitest.config.unit.ts tests/unit/masterchain-license-vectors.test.ts`.

## Pending

- ★**14th vector (`injected_field`)** — awaiting land on dsp `main`. The attack it covers is already
  pinned by a local regression test in `tests/unit/masterchain-license.test.ts`, but that test uses
  our own bytes; the vector is what proves **both implementations reject the same bytes**.
