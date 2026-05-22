/**
 * Tests for pure animate utilities.
 * No DOM access — runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_DURATION,
  DEFAULT_EASING,
  DEFAULT_EASING_CSS,
  easingToCss,
  formatValue,
  isAutoKeyword,
  resolveProp,
  samplesToLinearEasing,
} from "./utils";
import { isBrowser, prefersReducedMotion } from "$lib/shared/browser";
import { springEasing } from "$lib/easing/spring";
import type { PropDef } from "./properties";

const def = (unit: string): PropDef => ({
  css: "opacity",
  unit,
  initial: "0",
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("DEFAULT_DURATION", () => {
  it("is 300ms", () => {
    expect(DEFAULT_DURATION).toBe(300);
  });
});

describe("DEFAULT_EASING", () => {
  it("is a function", () => {
    expect(typeof DEFAULT_EASING).toBe("function");
  });

  it("maps 0 → 0", () => {
    expect(DEFAULT_EASING(0)).toBeCloseTo(0, 10);
  });

  it("maps 1 → 1", () => {
    expect(DEFAULT_EASING(1)).toBeCloseTo(1, 10);
  });

  it("returns finite values throughout [0, 1]", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(Number.isFinite(DEFAULT_EASING(t))).toBe(true);
    }
  });

  it("is monotonically non-decreasing (ease-out characteristic)", () => {
    let prev = DEFAULT_EASING(0);
    for (let t = 0.1; t <= 1; t += 0.1) {
      const curr = DEFAULT_EASING(t);
      expect(curr).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = curr;
    }
  });
});

describe("DEFAULT_EASING_CSS", () => {
  it("is a string starting with 'linear('", () => {
    expect(typeof DEFAULT_EASING_CSS).toBe("string");
    expect(DEFAULT_EASING_CSS.startsWith("linear(")).toBe(true);
  });

  it("ends with ')'", () => {
    expect(DEFAULT_EASING_CSS.endsWith(")")).toBe(true);
  });

  it("matches easingToCss(DEFAULT_EASING)", () => {
    expect(DEFAULT_EASING_CSS).toBe(easingToCss(DEFAULT_EASING));
  });
});

// ---------------------------------------------------------------------------
// formatValue()
// ---------------------------------------------------------------------------

describe("formatValue()", () => {
  it("appends unit to a number", () => {
    expect(formatValue(42, def("px"))).toBe("42px");
  });

  it("appends empty unit when unit is ''", () => {
    expect(formatValue(1.5, def(""))).toBe("1.5");
  });

  it("returns string values unchanged", () => {
    expect(formatValue("50%", def("px"))).toBe("50%");
    expect(formatValue("auto", def("px"))).toBe("auto");
  });

  it("handles 0 with unit", () => {
    expect(formatValue(0, def("deg"))).toBe("0deg");
  });

  it("handles negative numbers", () => {
    expect(formatValue(-10, def("px"))).toBe("-10px");
  });

  it("handles fractional numbers", () => {
    expect(formatValue(0.75, def(""))).toBe("0.75");
  });
});

// ---------------------------------------------------------------------------
// resolveProp()
// ---------------------------------------------------------------------------

describe("resolveProp()", () => {
  it("returns known prop definition for 'x'", () => {
    const d = resolveProp("x");
    expect(d.css).toBe("--motion-x");
    expect(d.transform).toBe(true);
  });

  it("returns known prop definition for 'opacity'", () => {
    const d = resolveProp("opacity");
    expect(d.css).toBe("opacity");
    expect(d.unit).toBe("");
    expect(d.transform).toBeFalsy();
  });

  it("returns known prop definition for 'scale'", () => {
    const d = resolveProp("scale");
    expect(d.css).toBe("--motion-scale");
    expect(d.transform).toBe(true);
  });

  it("converts camelCase unknown key to kebab-case CSS", () => {
    const d = resolveProp("someCustomProp");
    expect(d.css).toBe("some-custom-prop");
  });

  it("handles already kebab-cased unknown key", () => {
    const d = resolveProp("background-color");
    expect(d.css).toBe("background-color");
  });

  it("caches unknown prop definitions by reference", () => {
    const a = resolveProp("fooBarBaz");
    const b = resolveProp("fooBarBaz");
    expect(a).toBe(b);
  });

  it("returns a definition with empty unit and initial for unknown props", () => {
    const d = resolveProp("xyzUnknown");
    expect(d.unit).toBe("");
    expect(d.initial).toBe("");
  });

  it("known props always return the same reference", () => {
    expect(resolveProp("opacity")).toBe(resolveProp("opacity"));
  });
});

// ---------------------------------------------------------------------------
// isAutoKeyword()
// ---------------------------------------------------------------------------

describe("isAutoKeyword()", () => {
  it("returns true for 'auto'", () => {
    expect(isAutoKeyword("auto")).toBe(true);
  });

  it("returns true for 'fit-content'", () => {
    expect(isAutoKeyword("fit-content")).toBe(true);
  });

  it("returns true for 'min-content'", () => {
    expect(isAutoKeyword("min-content")).toBe(true);
  });

  it("returns true for 'max-content'", () => {
    expect(isAutoKeyword("max-content")).toBe(true);
  });

  it("returns true for 'intrinsic'", () => {
    expect(isAutoKeyword("intrinsic")).toBe(true);
  });

  it("returns true for 'fit-content(50%)' functional form", () => {
    expect(isAutoKeyword("fit-content(50%)")).toBe(true);
  });

  it("is case-insensitive — 'AUTO' returns true", () => {
    expect(isAutoKeyword("AUTO")).toBe(true);
    expect(isAutoKeyword("Fit-Content")).toBe(true);
  });

  it("returns false for plain pixel values", () => {
    expect(isAutoKeyword("42px")).toBe(false);
    expect(isAutoKeyword("100%")).toBe(false);
    expect(isAutoKeyword("2em")).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isAutoKeyword(42)).toBe(false);
    expect(isAutoKeyword(0)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAutoKeyword(undefined)).toBe(false);
  });

  it("handles leading/trailing whitespace", () => {
    expect(isAutoKeyword("  auto  ")).toBe(true);
  });
});

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
// easingToCss()
// ---------------------------------------------------------------------------

describe("easingToCss()", () => {
  it("returns DEFAULT_EASING_CSS when called with undefined", () => {
    expect(easingToCss(undefined)).toBe(DEFAULT_EASING_CSS);
  });

  it("returns a linear(...) CSS string for a plain function", () => {
    const css = easingToCss((t) => t);
    expect(css.startsWith("linear(")).toBe(true);
    expect(css.endsWith(")")).toBe(true);
  });

  it("caches result for the same function reference", () => {
    const fn = (t: number) => t * t;
    const a = easingToCss(fn);
    const b = easingToCss(fn);
    expect(a).toBe(b);
  });

  it("different function references produce independent results", () => {
    // Same math, different object — still separate entries.
    const fn1 = (t: number) => t;
    const fn2 = (t: number) => t;
    const a = easingToCss(fn1);
    const b = easingToCss(fn2);
    // Strings happen to be identical in value since math is the same:
    expect(a).toBe(b);
    // But the results are produced independently (no cross-reference sharing).
  });

  it("uses SpringEasingFn._linearEasing directly (bypasses resampling)", () => {
    const seFn = springEasing({ stiffness: 200, damping: 24 });
    const css = easingToCss(seFn);
    expect(css).toBe(seFn._linearEasing);
  });

  it("linear identity easing produces 25-sample string", () => {
    const fn = (t: number) => t;
    const css = easingToCss(fn);
    const commas = (css.match(/,/g) ?? []).length;
    // 25 samples → 24 commas
    expect(commas).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// isBrowser() / prefersReducedMotion() in Node env
// ---------------------------------------------------------------------------

describe("isBrowser()", () => {
  it("returns false in the Node.js test environment", () => {
    expect(isBrowser()).toBe(false);
  });
});

describe("prefersReducedMotion()", () => {
  it("returns false in the Node.js test environment", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});
