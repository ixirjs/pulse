/**
 * Tests for timeline planning helpers (computeAnimateDuration, offsetProps).
 * No DOM access — numeric timings never touch the element, so a stub is fine.
 * Runs in the `server` vitest project.
 */

import { describe, expect, it } from "vitest";
import { computeAnimateDuration, offsetProps } from "./timeline-internals";
import type { AnimateProps, PropConfig } from "../types";

const el = {} as HTMLElement;

describe("computeAnimateDuration()", () => {
  it("returns the largest delay + duration across props", () => {
    const props: AnimateProps = {
      opacity: { to: 1, duration: 300, delay: 100 }, // 400
      x: { to: 50, duration: 500, delay: 0 }, // 500
    };
    expect(computeAnimateDuration(el, props, {})).toBe(500);
  });

  it("falls back to defaults for unspecified timing", () => {
    const props: AnimateProps = { y: [0, 10] };
    expect(computeAnimateDuration(el, props, { duration: 200, delay: 50 })).toBe(250);
  });

  it("returns 0 for empty props", () => {
    expect(computeAnimateDuration(el, {}, {})).toBe(0);
  });
});

describe("offsetProps()", () => {
  it("returns the same object when offset is 0", () => {
    const props: AnimateProps = { opacity: 1 };
    expect(offsetProps(props, {}, 0)).toBe(props);
  });

  it("wraps a scalar input with the offset as delay", () => {
    const out = offsetProps({ opacity: 1 }, {}, 100);
    expect(out.opacity).toEqual({ to: 1, delay: 100 });
  });

  it("adds the default delay to the offset for tuple inputs", () => {
    const out = offsetProps({ x: [0, 50] }, { delay: 20 }, 100);
    expect(out.x).toEqual({ from: 0, to: 50, delay: 120 });
  });

  it("preserves a per-prop delay and adds the offset to it", () => {
    const out = offsetProps({ y: { to: 10, delay: 5 } }, { delay: 20 }, 100);
    // Per-prop delay (5) wins over defaults.delay (20), plus offset (100).
    expect((out.y as PropConfig).delay).toBe(105);
  });

  it("uses the default delay when a PropConfig omits its own", () => {
    const out = offsetProps({ y: { to: 10 } }, { delay: 20 }, 100);
    expect((out.y as PropConfig).delay).toBe(120);
  });
});
