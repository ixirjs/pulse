/**
 * Tests for the shared spring kernel — the single source of truth for spring
 * simulation, sampling, and `linear(...)` CSS generation used by both the
 * `animate` and `easing` packages.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import {
  getCachedSpring,
  sampleAt,
  samplesToLinearEasing,
} from "./spring-core";

// ---------------------------------------------------------------------------
// samplesToLinearEasing()
// ---------------------------------------------------------------------------

describe("samplesToLinearEasing()", () => {
  it("wraps samples in linear(...)", () => {
    const css = samplesToLinearEasing([0, 0.5, 1]);
    expect(css).toBe("linear(0.00000, 0.50000, 1.00000)");
  });

  it("formats samples to 5 decimal places", () => {
    const css = samplesToLinearEasing([0, 1]);
    expect(css).toMatch(/linear\(0\.00000, 1\.00000\)/);
  });

  it("handles single sample", () => {
    const css = samplesToLinearEasing([0]);
    expect(css).toBe("linear(0.00000)");
  });

  it("handles overshoot values > 1", () => {
    const css = samplesToLinearEasing([0, 1.2, 1]);
    expect(css).toContain("1.20000");
  });

  it("result contains n-1 commas for n samples", () => {
    const samples = [0, 0.25, 0.75, 1];
    const css = samplesToLinearEasing(samples);
    const commas = (css.match(/,/g) ?? []).length;
    expect(commas).toBe(samples.length - 1);
  });
});

// ---------------------------------------------------------------------------
// sampleAt()
// ---------------------------------------------------------------------------

describe("sampleAt()", () => {
  it("returns the first sample at t = 0", () => {
    expect(sampleAt([0, 0.5, 1], 0)).toBe(0);
  });

  it("returns the last sample at t = 1", () => {
    expect(sampleAt([0, 0.5, 1], 1)).toBe(1);
  });

  it("clamps t < 0 to the first sample", () => {
    expect(sampleAt([0.2, 0.5, 1], -5)).toBe(0.2);
  });

  it("clamps t > 1 to the last sample", () => {
    expect(sampleAt([0, 0.5, 0.9], 5)).toBe(0.9);
  });

  it("linearly interpolates between adjacent frames", () => {
    // last index = 1, t = 0.5 → midpoint of [0, 1]
    expect(sampleAt([0, 1], 0.5)).toBeCloseTo(0.5, 10);
  });

  it("interpolates within the correct segment", () => {
    // samples [0, 0.5, 1], last = 2, t = 0.25 → pos 0.5 → 0.25
    expect(sampleAt([0, 0.5, 1], 0.25)).toBeCloseTo(0.25, 10);
  });

  it("returns an exact sample when t lands on a frame boundary", () => {
    expect(sampleAt([0, 0.5, 1], 0.5)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// getCachedSpring()
// ---------------------------------------------------------------------------

describe("getCachedSpring()", () => {
  it("produces a normalized sample array (0 → 1)", () => {
    const { spring } = getCachedSpring({ stiffness: 200, damping: 24 });
    expect(spring.samples[0]).toBe(0);
    expect(spring.samples[spring.samples.length - 1]).toBe(1);
    expect(spring.duration).toBeGreaterThan(0);
  });

  it("pre-builds a linear(...) easing string", () => {
    const { linearEasingCss } = getCachedSpring({ stiffness: 150 });
    expect(linearEasingCss.startsWith("linear(")).toBe(true);
    expect(linearEasingCss.endsWith(")")).toBe(true);
  });

  it("memoizes identical option objects to the same reference", () => {
    const a = getCachedSpring({ stiffness: 170, damping: 26 });
    const b = getCachedSpring({ stiffness: 170, damping: 26 });
    expect(b).toBe(a);
  });

  it("treats omitted options as defaults (same key)", () => {
    const a = getCachedSpring();
    const b = getCachedSpring({});
    expect(b).toBe(a);
  });

  it("returns distinct entries for distinct options", () => {
    const a = getCachedSpring({ stiffness: 111 });
    const b = getCachedSpring({ stiffness: 222 });
    expect(b).not.toBe(a);
  });

  it("evicts the oldest entry once the cache limit is exceeded", () => {
    const key = { stiffness: 333, damping: 19 };
    const first = getCachedSpring(key);
    // Overflow the 128-entry cache with distinct keys so `key` is evicted.
    for (let s = 1000; s < 1200; s++) getCachedSpring({ stiffness: s });
    const reborn = getCachedSpring(key);
    // Same value, but a freshly recomputed object (proving eviction occurred).
    expect(reborn).not.toBe(first);
    expect(reborn.linearEasingCss).toBe(first.linearEasingCss);
  });
});
