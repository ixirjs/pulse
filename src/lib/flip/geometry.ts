/**
 * Pure geometry primitives for FLIP — no DOM mutation, no side effects.
 *
 * The only DOM read here is the `measure()` helper, which delegates to the
 * `animate()` package's transform-aware rect reader so a parent that's mid
 * `animate()` transform still yields the element's "at rest" rect.
 */

import { measureWithoutAncestorTransforms } from "$lib/animate/properties";
import type { FlipRect, FlipRectPair } from "./types";

/**
 * Read the element's layout rect, suppressing any motion transforms applied
 * by ancestors so the value is the resting layout (not the visual one).
 */
export const measure = (el: Element): FlipRect => {
  const { left: x, top: y, width, height } = measureWithoutAncestorTransforms(el);
  return { x, y, width, height };
};

/** Approximate equality so sub-pixel jitter doesn't trigger reflows. */
export const rectsEqual = (
  a: FlipRect,
  b: FlipRect,
  epsilon = 0.5,
): boolean =>
  Math.abs(a.x - b.x) < epsilon &&
  Math.abs(a.y - b.y) < epsilon &&
  Math.abs(a.width - b.width) < epsilon &&
  Math.abs(a.height - b.height) < epsilon;

/** Diagonal distance between two rects' top-left corners. */
export const diagonal = (a: FlipRect, b: FlipRect): number =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

export interface FlipDelta {
  /** Horizontal translate component (`from.x - to.x`). */
  dx: number;
  /** Vertical translate component (`from.y - to.y`). */
  dy: number;
  /** Horizontal scale component (`from.width / to.width`). */
  sx: number;
  /** Vertical scale component (`from.height / to.height`). */
  sy: number;
}

export interface DeltaOptions {
  translate?: boolean;
  scale?: boolean;
}

/**
 * Compute the inverted transform that places the element back at `from`.
 * Components disabled in `opts` resolve to their identity.
 */
export const computeDelta = (
  pair: FlipRectPair,
  opts: DeltaOptions = {},
): FlipDelta => {
  const translate = opts.translate ?? true;
  const scale = opts.scale ?? true;
  const { from, to } = pair;
  return {
    dx: translate ? from.x - to.x : 0,
    dy: translate ? from.y - to.y : 0,
    sx: scale && to.width > 0 ? from.width / to.width : 1,
    sy: scale && to.height > 0 ? from.height / to.height : 1,
  };
};

/** True when the delta would produce no visible movement. */
export const isIdentityDelta = (delta: FlipDelta): boolean =>
  delta.dx === 0 && delta.dy === 0 && delta.sx === 1 && delta.sy === 1;
