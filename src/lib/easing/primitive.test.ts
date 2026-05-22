/**
 * Deeper math tests for primitive easing functions.
 * Complements the boundary-condition tests in easings.test.ts by verifying
 * specific midpoint values, monotonicity, and overshoot/undershoot behavior.
 * Pure math — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import {
  backIn,
  backInOut,
  backOut,
  bounceIn,
  bounceInOut,
  bounceOut,
  circIn,
  circInOut,
  circOut,
  cubicIn,
  cubicInOut,
  cubicOut,
  elasticIn,
  elasticInOut,
  elasticOut,
  expoIn,
  expoInOut,
  expoOut,
  linear,
  quadIn,
  quadInOut,
  quadOut,
  quartIn,
  quartOut,
  quintIn,
  quintOut,
  sineIn,
  sineInOut,
  sineOut,
} from "./primitive";
import type { EasingFn } from "$lib/animate/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect 11 evenly-spaced samples including t=0 and t=1. */
const samples = (fn: EasingFn, n = 11): number[] =>
  Array.from({ length: n }, (_, i) => fn(i / (n - 1)));

/** Returns true when the sequence is non-decreasing within a tolerance. */
const isMonotone = (vals: number[], tol = 1e-9): boolean => {
  for (let i = 1; i < vals.length; i++) {
    if (vals[i]! < vals[i - 1]! - tol) return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// linear
// ---------------------------------------------------------------------------

describe("linear — identity", () => {
  it("is exactly the identity at every sampled point", () => {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      expect(linear(t)).toBe(t);
    }
  });
});

// ---------------------------------------------------------------------------
// Polynomial easings — known midpoint values
// ---------------------------------------------------------------------------

describe("quadIn — known values", () => {
  it("t=0.5 → 0.25", () => {
    expect(quadIn(0.5)).toBeCloseTo(0.25, 10);
  });
  it("t=0.25 → 0.0625", () => {
    expect(quadIn(0.25)).toBeCloseTo(0.0625, 10);
  });
  it("is monotonically increasing", () => {
    expect(isMonotone(samples(quadIn))).toBe(true);
  });
  it("is convex (accelerates — value < t for 0 < t < 1)", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(quadIn(t)).toBeLessThan(t);
    }
  });
});

describe("quadOut — known values", () => {
  it("t=0.5 → 0.75", () => {
    expect(quadOut(0.5)).toBeCloseTo(0.75, 10);
  });
  it("is monotonically increasing", () => {
    expect(isMonotone(samples(quadOut))).toBe(true);
  });
  it("decelerates — value > t for 0 < t < 1", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(quadOut(t)).toBeGreaterThan(t);
    }
  });
});

describe("quadInOut — symmetry", () => {
  it("t=0.5 → 0.5 (inflection)", () => {
    expect(quadInOut(0.5)).toBeCloseTo(0.5, 10);
  });
  it("is symmetric: f(t) + f(1-t) = 1", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(quadInOut(t) + quadInOut(1 - t)).toBeCloseTo(1, 10);
    }
  });
  it("is monotonically increasing", () => {
    expect(isMonotone(samples(quadInOut))).toBe(true);
  });
});

describe("cubicIn — known values", () => {
  it("t=0.5 → 0.125", () => {
    expect(cubicIn(0.5)).toBeCloseTo(0.125, 10);
  });
  it("is slower than quadIn for t ∈ (0,1)", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(cubicIn(t)).toBeLessThanOrEqual(quadIn(t) + 1e-9);
    }
  });
});

describe("cubicOut — known values", () => {
  it("t=0.5 → 0.875", () => {
    expect(cubicOut(0.5)).toBeCloseTo(0.875, 10);
  });
  it("is faster than quadOut for t ∈ (0,1)", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(cubicOut(t)).toBeGreaterThanOrEqual(quadOut(t) - 1e-9);
    }
  });
});

describe("cubicInOut — symmetry", () => {
  it("t=0.5 → 0.5", () => {
    expect(cubicInOut(0.5)).toBeCloseTo(0.5, 10);
  });
  it("is symmetric: f(t) + f(1-t) = 1", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(cubicInOut(t) + cubicInOut(1 - t)).toBeCloseTo(1, 10);
    }
  });
});

describe("quartIn", () => {
  it("t=0.5 → 0.0625", () => {
    expect(quartIn(0.5)).toBeCloseTo(0.0625, 10);
  });
  it("is slower than cubicIn for t ∈ (0,1)", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(quartIn(t)).toBeLessThanOrEqual(cubicIn(t) + 1e-9);
    }
  });
});

describe("quartOut", () => {
  it("t=0.5 → 0.9375", () => {
    expect(quartOut(0.5)).toBeCloseTo(0.9375, 10);
  });
});

describe("quintIn", () => {
  it("t=0.5 → 0.03125", () => {
    expect(quintIn(0.5)).toBeCloseTo(0.03125, 10);
  });
});

describe("quintOut", () => {
  it("t=0.5 → 0.96875", () => {
    expect(quintOut(0.5)).toBeCloseTo(0.96875, 10);
  });
});

// ---------------------------------------------------------------------------
// Monotone easings
// ---------------------------------------------------------------------------

const MONOTONE_EASINGS: [string, EasingFn][] = [
  ["quadIn", quadIn],
  ["quadOut", quadOut],
  ["quadInOut", quadInOut],
  ["cubicIn", cubicIn],
  ["cubicOut", cubicOut],
  ["cubicInOut", cubicInOut],
  ["quartIn", quartIn],
  ["quartOut", quartOut],
  ["quintIn", quintIn],
  ["quintOut", quintOut],
  ["sineIn", sineIn],
  ["sineOut", sineOut],
  ["sineInOut", sineInOut],
  ["circIn", circIn],
  ["circOut", circOut],
  ["circInOut", circInOut],
  ["expoIn", expoIn],
  ["expoOut", expoOut],
  ["expoInOut", expoInOut],
];

describe("monotonicity — simple easings never go backwards", () => {
  it.each(MONOTONE_EASINGS)("%s is monotonically non-decreasing", (_name, fn) => {
    expect(isMonotone(samples(fn, 51))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sine easings — known relationship to π
// ---------------------------------------------------------------------------

describe("sineIn — known values", () => {
  it("t=0.5 → 1 - cos(π/4) ≈ 0.2929", () => {
    const expected = 1 - Math.cos(Math.PI / 4);
    expect(sineIn(0.5)).toBeCloseTo(expected, 10);
  });
});

describe("sineOut — known values", () => {
  it("t=0.5 → sin(π/4) ≈ 0.7071", () => {
    const expected = Math.sin(Math.PI / 4);
    expect(sineOut(0.5)).toBeCloseTo(expected, 10);
  });
});

describe("sineInOut — symmetry", () => {
  it("t=0.5 → 0.5", () => {
    expect(sineInOut(0.5)).toBeCloseTo(0.5, 10);
  });
  it("f(t) + f(1-t) = 1", () => {
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(sineInOut(t) + sineInOut(1 - t)).toBeCloseTo(1, 10);
    }
  });
});

// ---------------------------------------------------------------------------
// Circular easings — geometric identity
// ---------------------------------------------------------------------------

describe("circIn — known values", () => {
  it("t=0.5 → 1 - sin(π/3) ≈ 0.134", () => {
    // circIn(0.5) = 1 - sqrt(1 - 0.25) = 1 - sqrt(0.75)
    const expected = 1 - Math.sqrt(0.75);
    expect(circIn(0.5)).toBeCloseTo(expected, 10);
  });
  it("is monotone", () => {
    expect(isMonotone(samples(circIn, 51))).toBe(true);
  });
});

describe("circOut — geometric complement of circIn", () => {
  it("circIn(t) + circOut(1-t) ≈ 1 (complement)", () => {
    // circIn and circOut are reflections through (0.5, 0.5)
    for (let t = 0.1; t < 1; t += 0.1) {
      expect(circIn(t) + circOut(1 - t)).toBeCloseTo(1, 10);
    }
  });
});

describe("circInOut — symmetry", () => {
  it("t=0.5 → 0.5", () => {
    expect(circInOut(0.5)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// Exponential easings — boundary behavior
// ---------------------------------------------------------------------------

describe("expoIn — exact boundaries", () => {
  it("t=0 returns exactly 0 (special case)", () => {
    expect(expoIn(0)).toBe(0);
  });
  it("t=1 returns exactly 1 (special case)", () => {
    expect(expoIn(1)).toBe(1);
  });
});

describe("expoOut — exact boundaries", () => {
  it("t=0 returns exactly 0", () => {
    expect(expoOut(0)).toBe(0);
  });
  it("t=1 returns exactly 1 (special case)", () => {
    expect(expoOut(1)).toBe(1);
  });
});

describe("expoInOut — boundaries and symmetry", () => {
  it("t=0 returns exactly 0", () => {
    expect(expoInOut(0)).toBe(0);
  });
  it("t=1 returns exactly 1", () => {
    expect(expoInOut(1)).toBe(1);
  });
  it("t=0.5 → 0.5", () => {
    expect(expoInOut(0.5)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// Back easings — overshoot
// ---------------------------------------------------------------------------

describe("backOut — overshoots 1", () => {
  it("produces values > 1 in the mid-range", () => {
    const max = Math.max(...samples(backOut, 51));
    expect(max).toBeGreaterThan(1);
  });
  it("is not monotone (it overshoots)", () => {
    // backOut goes beyond 1 then returns to 1 — so not monotone near the end.
    // Check that it has values > 1
    let found = false;
    for (let i = 0; i <= 100; i++) {
      if (backOut(i / 100) > 1) { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

describe("backIn — undershoots 0", () => {
  it("produces values < 0 in the early range", () => {
    const min = Math.min(...samples(backIn, 51));
    expect(min).toBeLessThan(0);
  });
});

describe("backInOut — overshoots both ends", () => {
  it("produces values < 0 near start and > 1 near end", () => {
    const vals = samples(backInOut, 51);
    expect(Math.min(...vals)).toBeLessThan(0);
    expect(Math.max(...vals)).toBeGreaterThan(1);
  });
  it("t=0.5 → 0.5 (symmetric midpoint)", () => {
    expect(backInOut(0.5)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// Elastic easings — overshoot + oscillation
// ---------------------------------------------------------------------------

describe("elasticOut — oscillates around 1", () => {
  it("t=0 exactly 0", () => {
    expect(elasticOut(0)).toBe(0);
  });
  it("t=1 exactly 1", () => {
    expect(elasticOut(1)).toBe(1);
  });
  it("produces values > 1 during oscillation", () => {
    const vals = samples(elasticOut, 101);
    expect(Math.max(...vals)).toBeGreaterThan(1);
  });
});

describe("elasticIn — oscillates below 0 at start", () => {
  it("t=0 exactly 0", () => {
    expect(elasticIn(0)).toBe(0);
  });
  it("t=1 exactly 1", () => {
    expect(elasticIn(1)).toBe(1);
  });
  it("produces values < 0 during oscillation", () => {
    const vals = samples(elasticIn, 101);
    expect(Math.min(...vals)).toBeLessThan(0);
  });
});

describe("elasticInOut — oscillates both ends", () => {
  it("t=0 exactly 0", () => {
    expect(elasticInOut(0)).toBe(0);
  });
  it("t=1 exactly 1", () => {
    expect(elasticInOut(1)).toBe(1);
  });
  it("t=0.5 → 0.5", () => {
    expect(elasticInOut(0.5)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// Bounce easings — multiple bounces, continuity
// ---------------------------------------------------------------------------

describe("bounceOut — multiple bounce segments", () => {
  it("first segment (t < 1/2.75): parabolic from near 0", () => {
    // At t=0.1: n1 * t^2 = 7.5625 * 0.01 = 0.075625
    expect(bounceOut(0.1)).toBeCloseTo(7.5625 * 0.01, 5);
  });

  it("reaches 1 at t=1", () => {
    expect(bounceOut(1)).toBeCloseTo(1, 10);
  });

  it("is continuous — no jump between t=0.5 and t=0.51", () => {
    expect(Math.abs(bounceOut(0.51) - bounceOut(0.5))).toBeLessThan(0.1);
  });

  it("all values are in [0, 1]", () => {
    for (let t = 0; t <= 1; t += 0.01) {
      expect(bounceOut(t)).toBeGreaterThanOrEqual(-1e-9);
      expect(bounceOut(t)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("bounceIn — mirror of bounceOut", () => {
  it("bounceIn(t) === 1 - bounceOut(1 - t)", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(bounceIn(t)).toBeCloseTo(1 - bounceOut(1 - t), 10);
    }
  });

  it("all values are in [0, 1]", () => {
    for (let t = 0; t <= 1; t += 0.01) {
      expect(bounceIn(t)).toBeGreaterThanOrEqual(-1e-9);
      expect(bounceIn(t)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("bounceInOut", () => {
  it("t=0.5 → 0.5", () => {
    expect(bounceInOut(0.5)).toBeCloseTo(0.5, 5);
  });
  it("all values are in [0, 1]", () => {
    for (let t = 0; t <= 1; t += 0.01) {
      expect(bounceInOut(t)).toBeGreaterThanOrEqual(-1e-9);
      expect(bounceInOut(t)).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
