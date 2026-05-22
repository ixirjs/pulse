/**
 * Tests for pure FLIP option resolution helpers.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_DELAY,
  DEFAULT_DURATION,
  DEFAULT_EASING,
  readOptions,
  resolveDuration,
  resolveEasing,
  resolveOpacity,
} from "./options";
import type { FlipRectPair } from "./types";

const pairAt = (dx = 0, dy = 0): FlipRectPair => ({
  from: { x: 0, y: 0, width: 100, height: 50 },
  to: { x: dx, y: dy, width: 100, height: 50 },
});

describe("constants", () => {
  it("DEFAULT_DURATION is a positive number", () => {
    expect(DEFAULT_DURATION).toBeGreaterThan(0);
  });

  it("DEFAULT_DELAY is 0", () => {
    expect(DEFAULT_DELAY).toBe(0);
  });

  it("DEFAULT_EASING is a function", () => {
    expect(typeof DEFAULT_EASING).toBe("function");
  });
});

describe("readOptions()", () => {
  it("returns {} for null input", () => {
    expect(readOptions(null)).toEqual({});
  });

  it("returns {} for undefined input", () => {
    expect(readOptions(undefined)).toEqual({});
  });

  it("returns the object directly for plain object input", () => {
    const opts = { duration: 300 };
    expect(readOptions(opts)).toBe(opts);
  });

  it("calls a thunk and returns the result", () => {
    const opts = { duration: 200 };
    const thunk = () => opts;
    expect(readOptions(thunk)).toBe(opts);
  });

  it("thunk returning undefined returns undefined", () => {
    expect(readOptions(() => undefined as never)).toBeUndefined();
  });
});

describe("resolveDuration()", () => {
  const rects = pairAt();

  it("returns DEFAULT_DURATION when undefined", () => {
    expect(resolveDuration(undefined, rects)).toBe(DEFAULT_DURATION);
  });

  it("returns the literal value for a number", () => {
    expect(resolveDuration(400, rects)).toBe(400);
  });

  it("clamps negative literal to 0", () => {
    expect(resolveDuration(-100, rects)).toBe(0);
  });

  it("calls a function with diagonal distance and rect pair", () => {
    const pair = pairAt(30, 40); // diagonal = 50
    let calledDistance = 0;
    let calledPair: FlipRectPair | undefined;
    const fn = (d: number, p: FlipRectPair) => {
      calledDistance = d;
      calledPair = p;
      return 123;
    };
    const result = resolveDuration(fn, pair);
    expect(result).toBe(123);
    expect(calledDistance).toBeCloseTo(50, 1); // 3-4-5 * 10 triangle
    expect(calledPair).toBe(pair);
  });

  it("clamps function return value to 0 when negative", () => {
    expect(resolveDuration(() => -99, rects)).toBe(0);
  });
});

describe("resolveOpacity()", () => {
  it("returns null for undefined", () => {
    expect(resolveOpacity(undefined)).toBeNull();
  });

  it("returns null for false", () => {
    expect(resolveOpacity(false)).toBeNull();
  });

  it("returns {from:0, to:1} for true", () => {
    expect(resolveOpacity(true)).toEqual({ from: 0, to: 1 });
  });

  it("fills defaults for empty object", () => {
    expect(resolveOpacity({})).toEqual({ from: 0, to: 1 });
  });

  it("uses explicit from/to values", () => {
    expect(resolveOpacity({ from: 0.3, to: 0.8 })).toEqual({ from: 0.3, to: 0.8 });
  });

  it("fills missing from with 0", () => {
    expect(resolveOpacity({ to: 0.7 })).toEqual({ from: 0, to: 0.7 });
  });

  it("fills missing to with 1", () => {
    expect(resolveOpacity({ from: 0.2 })).toEqual({ from: 0.2, to: 1 });
  });
});

describe("resolveEasing()", () => {
  it("returns DEFAULT_EASING for undefined", () => {
    expect(resolveEasing(undefined)).toBe(DEFAULT_EASING);
  });

  it("returns the function directly when given a function", () => {
    const fn = (t: number) => t * t;
    expect(resolveEasing(fn)).toBe(fn);
  });

  it("unknown CSS string falls back to DEFAULT_EASING", () => {
    // String easing strings are not yet mapped, should fall back gracefully
    expect(resolveEasing("ease-out")).toBe(DEFAULT_EASING);
  });
});
