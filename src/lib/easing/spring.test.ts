/**
 * Tests for the spring easing factory.
 * Pure math — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { springEasing } from "./spring";

describe("springEasing()", () => {
  it("maps t=0 to 0", () => {
    const fn = springEasing();
    expect(fn(0)).toBe(0);
  });

  it("maps t=1 to the final sample value", () => {
    const fn = springEasing();
    // The last sample of a settling spring should be very close to 1
    expect(fn(1)).toBeCloseTo(1, 3);
  });

  it("clamps at t < 0 → 0", () => {
    const fn = springEasing();
    expect(fn(-0.5)).toBe(0);
  });

  it("returns a positive duration", () => {
    const fn = springEasing();
    expect(fn.duration).toBeGreaterThan(0);
  });

  it("returns a _linearEasing string starting with 'linear('", () => {
    const fn = springEasing();
    expect(fn._linearEasing.startsWith("linear(")).toBe(true);
  });

  it("returns finite values for all t in [0, 1]", () => {
    const fn = springEasing({ stiffness: 300, damping: 20 });
    for (let t = 0; t <= 1; t += 0.05) {
      expect(Number.isFinite(fn(t))).toBe(true);
    }
  });

  it("stiffer springs have shorter duration", () => {
    const stiff = springEasing({ stiffness: 600, damping: 50 });
    const soft = springEasing({ stiffness: 50, damping: 8 });
    expect(stiff.duration).toBeLessThan(soft.duration);
  });

  it("returns different durations for different options", () => {
    const a = springEasing({ stiffness: 100 });
    const b = springEasing({ stiffness: 400 });
    expect(a.duration).not.toBe(b.duration);
  });

  it("interpolates smoothly between samples (no large jumps)", () => {
    const fn = springEasing({ stiffness: 200, damping: 20 });
    const MAX_JUMP = 0.1;
    let prev = fn(0);
    for (let t = 0.01; t <= 1; t += 0.01) {
      const curr = fn(t);
      expect(Math.abs(curr - prev)).toBeLessThan(MAX_JUMP);
      prev = curr;
    }
  });

  it("returns a callable function", () => {
    const fn = springEasing();
    expect(typeof fn).toBe("function");
  });
});
