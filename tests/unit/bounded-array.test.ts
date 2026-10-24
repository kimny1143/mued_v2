/**
 * Unit — boundedArray (lib/validation/bounded-array.ts): the length is checked before any element.
 *
 * ★The property, measured the way CCO measured the defect in #1307's first head: a 4.5 MB body of
 * 2.25M failing elements against a `.max(50)` field. A plain `z.array(el).max(50)` parses all of them
 * and returns one issue per element; boundedArray must return ONE issue, in milliseconds.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { boundedArray } from "@/lib/validation/bounded-array";

// Same field shape as app/api/muednote/profile PATCH (genres etc.).
const bounded = z.object({ genres: boundedArray(z.string(), { max: 50 }).optional() });
const plain = z.object({ genres: z.array(z.string()).max(50).optional() });

const ELEMENTS = 2_250_000;
const body = `{"genres":[${Array(ELEMENTS).fill("1").join(",")}]}`;
const issues = (r: { success: boolean; error?: z.ZodError }) => (r.success ? [] : r.error!.issues);

describe("boundedArray — ★rejects an over-long array before parsing its elements", () => {
  it("the payload is the 4.5 MB one CCO measured", () => {
    expect(body.length).toBeGreaterThan(4_400_000);
  });

  it("returns exactly 1 issue, in milliseconds, for 2.25M failing elements", () => {
    const input = JSON.parse(body);
    const t = performance.now();
    const r = bounded.safeParse(input);
    const ms = performance.now() - t;
    expect(issues(r)).toHaveLength(1);
    expect(issues(r)[0].message).toMatch(/at most 50/);
    expect(ms).toBeLessThan(50);
  });

  it("★control: a plain .max(50) does parse every element (the defect this exists for)", () => {
    // A smaller array keeps the suite fast; the shape is the same as CCO's 2.25M measurement.
    const r = plain.safeParse({ genres: Array(20_000).fill(1) });
    expect(issues(r).length).toBeGreaterThan(20_000);
  });
});

describe("boundedArray — within the bound it behaves like z.array", () => {
  const codes = (x: unknown) => issues(bounded.safeParse(x)).map((i) => `${i.path.join(".")}:${i.code}`);

  it("accepts a normal list, a missing field, and exactly max", () => {
    expect(codes({ genres: ["pop", "rock"] })).toEqual([]);
    expect(codes({})).toEqual([]);
    expect(codes({ genres: Array(50).fill("a") })).toEqual([]);
  });

  it("rejects max + 1", () => {
    expect(codes({ genres: Array(51).fill("a") })).toEqual(["genres:custom"]);
  });

  it("still reports a bad element with its path", () => {
    expect(codes({ genres: ["a", 1] })).toEqual(["genres.1:invalid_type"]);
  });

  it("still rejects a non-array", () => {
    expect(codes({ genres: "pop" })).toEqual(["genres:invalid_type"]);
  });

  it("applies min", () => {
    const s = boundedArray(z.string(), { min: 2, max: 3 });
    expect(s.safeParse(["a"]).success).toBe(false);
    expect(s.safeParse(["a", "b"]).success).toBe(true);
    expect(s.safeParse(["a", "b", "c", "d"]).success).toBe(false);
  });

  it("keeps the inferred type", () => {
    const s = boundedArray(z.number(), { max: 3 });
    const v: number[] = s.parse([1, 2]);
    expect(v).toEqual([1, 2]);
  });
});
