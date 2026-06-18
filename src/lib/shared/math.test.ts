/**
 * Tests for the shared numeric clamp helpers.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { atLeast0, clamp01 } from "./math";

describe("atLeast0()", () => {
  it("passes through positive values", () => {
    expect(atLeast0(5)).toBe(5);
    expect(atLeast0(0.001)).toBe(0.001);
  });

  it("clamps negatives to 0", () => {
    expect(atLeast0(-1)).toBe(0);
    expect(atLeast0(-0.0001)).toBe(0);
  });

  it("returns 0 unchanged", () => {
    expect(atLeast0(0)).toBe(0);
  });
});

describe("clamp01()", () => {
  it("passes through values within [0, 1]", () => {
    expect(clamp01(0)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1)).toBe(1);
  });

  it("clamps values above 1 to 1", () => {
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(100)).toBe(1);
  });

  it("clamps values below 0 to 0", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(-100)).toBe(0);
  });
});
