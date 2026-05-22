/**
 * Tests for spring simulation, memoization, and sampling correctness.
 * All logic is pure (no DOM), so this runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { spring, getCachedSpring } from "./spring";

describe("spring()", () => {
  it("returns samples starting at 0 and ending at 1", () => {
    const { samples } = spring();
    expect(samples[0]).toBe(0);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it("duration is samples.length - 1 frames at 60fps", () => {
    const { samples, duration } = spring();
    expect(duration).toBeCloseTo((samples.length - 1) * (1000 / 60), 1);
  });

  it("returns positive duration", () => {
    expect(spring().duration).toBeGreaterThan(0);
  });

  it("stiffer spring settles faster", () => {
    const stiff = spring({ stiffness: 500, damping: 40 });
    const soft = spring({ stiffness: 50, damping: 8 });
    expect(stiff.duration).toBeLessThan(soft.duration);
  });

  it("respects custom restDelta / restSpeed thresholds", () => {
    const tight = spring({ restDelta: 1e-6, restSpeed: 1e-6 });
    const loose = spring({ restDelta: 0.05, restSpeed: 0.05 });
    // Tighter tolerance = more frames = longer duration
    expect(tight.duration).toBeGreaterThanOrEqual(loose.duration);
  });

  it("all samples are finite numbers", () => {
    const { samples } = spring({ stiffness: 300, damping: 18, velocity: 200 });
    for (const s of samples) {
      expect(Number.isFinite(s)).toBe(true);
    }
  });
});

describe("getCachedSpring()", () => {
  it("same options object returns identical reference", () => {
    const opts = { stiffness: 170, damping: 26 };
    const a = getCachedSpring(opts);
    const b = getCachedSpring(opts);
    expect(a).toBe(b);
  });

  it("equivalent options with different object identity returns same cached entry", () => {
    const a = getCachedSpring({ stiffness: 200, damping: 30 });
    const b = getCachedSpring({ stiffness: 200, damping: 30 });
    expect(a).toBe(b);
  });

  it("produces a pre-rendered linearEasingCss string starting with 'linear('", () => {
    const { linearEasingCss } = getCachedSpring();
    expect(linearEasingCss.startsWith("linear(")).toBe(true);
  });

  it("linearEasingCss contains the correct number of samples", () => {
    const { spring: s, linearEasingCss } = getCachedSpring({ stiffness: 170, damping: 26 });
    const commaCount = (linearEasingCss.match(/,/g) ?? []).length;
    expect(commaCount).toBe(s.samples.length - 1);
  });
});
