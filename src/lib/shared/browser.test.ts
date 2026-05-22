/**
 * Tests for browser environment detection utilities.
 * Runs in the `server` (node) vitest project where `window` is undefined,
 * so isBrowser() is always false and prefersReducedMotion() always false.
 */

import { describe, expect, it } from "vitest";
import { isBrowser, prefersReducedMotion } from "./browser";

describe("isBrowser()", () => {
  it("returns false in node environment", () => {
    expect(isBrowser()).toBe(false);
  });

  it("returns a boolean", () => {
    expect(typeof isBrowser()).toBe("boolean");
  });
});

describe("prefersReducedMotion()", () => {
  it("returns false in node environment (no matchMedia)", () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns a boolean", () => {
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });

  it("calling it multiple times returns the same value", () => {
    const a = prefersReducedMotion();
    const b = prefersReducedMotion();
    expect(a).toBe(b);
  });
});
