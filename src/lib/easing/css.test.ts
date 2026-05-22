/**
 * Tests for CSS-named easing functions (ease, easeIn, easeOut, easeInOut).
 * Pure math — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { ease, easeIn, easeOut, easeInOut } from "./css";
import type { EasingFn } from "$lib/animate/types";

const EASINGS: [string, EasingFn][] = [
  ["ease", ease],
  ["easeIn", easeIn],
  ["easeOut", easeOut],
  ["easeInOut", easeInOut],
];

describe.each(EASINGS)("%s", (_name, fn) => {
  it("maps t=0 to 0", () => {
    expect(fn(0)).toBeCloseTo(0, 10);
  });

  it("maps t=1 to 1", () => {
    expect(fn(1)).toBeCloseTo(1, 10);
  });

  it("returns finite values throughout [0, 1]", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(Number.isFinite(fn(t))).toBe(true);
    }
  });

  it("returns values in [0, 1] for inputs in [0, 1]", () => {
    for (let t = 0; t <= 1; t += 0.05) {
      expect(fn(t)).toBeGreaterThanOrEqual(-0.001);
      expect(fn(t)).toBeLessThanOrEqual(1.001);
    }
  });
});

describe("ease vs easeIn", () => {
  it("are distinct at t=0.5", () => {
    expect(ease(0.5)).not.toBeCloseTo(easeIn(0.5), 3);
  });
});

describe("easeIn vs easeOut", () => {
  it("are symmetric: easeOut(t) === 1 - easeIn(1 - t)", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(easeOut(t)).toBeCloseTo(1 - easeIn(1 - t), 10);
    }
  });
});

describe("easeInOut", () => {
  it("is symmetric around t=0.5", () => {
    for (let t = 0; t <= 0.5; t += 0.05) {
      expect(easeInOut(t)).toBeCloseTo(1 - easeInOut(1 - t), 10);
    }
  });

  it("passes through t=0.5 ≈ 0.5", () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 3);
  });
});
