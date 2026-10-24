/**
 * A zod array whose length is checked BEFORE any element is parsed.
 *
 * ★Why not `z.array(el).max(n)`: in zod 3 the length check runs after every element has been parsed,
 * so `.max(50)` on a 4.5 MB body of failing elements still parses all of them and builds one issue per
 * element (CCO measured on 3.25.76: 2.25M issues, 1.2 s and 838 MB RSS for one request). That is the
 * shape of zod GHSA-mrhx-c7xc-m3w5, which lib/ci/audit-allowlist.ts allows until zod 4.
 *
 * Here a refine on the raw value rejects an over-long array first, and `.pipe()` does not run the
 * array schema after a failed refine: one issue, no element work. Within the bound, errors are the
 * same as a plain z.array (including the element issues).
 *
 * ★Every z.array in app/api and lib goes through this — tests/unit/zod-array-bounds.test.ts.
 */
import { z } from "zod";

export function boundedArray<T extends z.ZodTypeAny>(
  element: T,
  bounds: { max: number; min?: number },
) {
  const { max, min } = bounds;
  let array = z.array(element).max(max);
  if (min !== undefined) array = array.min(min);
  return z
    .any()
    .refine((v) => !Array.isArray(v) || v.length <= max, {
      message: `Array must contain at most ${max} element(s)`,
    })
    .pipe(array);
}
