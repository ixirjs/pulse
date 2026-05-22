/**
 * FLIP helpers that compose directly on top of `animate()`.
 *
 * These are pure `animate()`-layer functions — no attachment, no scope, no
 * observer wiring. Use them when you only need a one-shot position transition
 * and want a single import surface (`$lib/animate`).
 *
 * For full FLIP integration (Svelte attachments, shared-element transitions,
 * auto-tracking via rune observers) use the `$lib/flip` module instead.
 *
 * @example
 * ```ts
 * // Standard inverse-FLIP (element already moved in the DOM):
 * const from = snapshotRect(el);
 * await tick(); // let the DOM update
 * flipFrom(el, from, { duration: 320 });
 *
 * // Forward FLIP (element is still at its current position, drive it away):
 * const to = targetRect;
 * flipTo(el, to, { duration: 320 });
 * ```
 */

import { animate } from "./animate";
import { measureWithoutAncestorTransforms } from "./properties";
import type { AnimateDefaults, AnimationController } from "./types";

// ---------------------------------------------------------------------------
// Rect type
// ---------------------------------------------------------------------------

/** Axis-aligned bounding rectangle in viewport coordinates. */
export interface FlipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Capture the element's current layout rect, suppressing in-flight transforms. */
export const captureRect = (element: Element): FlipRect => {
  const { left: x, top: y, width, height } =
    measureWithoutAncestorTransforms(element);
  return { x, y, width, height };
};

const computeDelta = (
  from: FlipRect,
  to: FlipRect,
): { dx: number; dy: number; sx: number; sy: number } => ({
  dx: from.x - to.x,
  dy: from.y - to.y,
  sx: to.width > 0 ? from.width / to.width : 1,
  sy: to.height > 0 ? from.height / to.height : 1,
});

const isIdentity = (dx: number, dy: number, sx: number, sy: number): boolean =>
  dx === 0 && dy === 0 && sx === 1 && sy === 1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Animate an element from a previously captured rect to its current DOM
 * position (standard inverse-FLIP).
 *
 * Call this **after** the DOM has moved the element to its new position so
 * the "from" rect differs from the element's current rect.
 *
 * @param element  The element to animate.
 * @param from     Rect captured before the DOM update (e.g. via `snapshotRect`).
 * @param defaults Optional `animate()` defaults (duration, easing, delay, …).
 * @returns        The `AnimationController`, or `null` when no work is needed.
 */
export const flipFromRect = (
  element: HTMLElement | SVGElement,
  from: FlipRect,
  defaults: AnimateDefaults = {},
): AnimationController | null => {
  const to = captureRect(element);
  const { dx, dy, sx, sy } = computeDelta(from, to);
  if (isIdentity(dx, dy, sx, sy)) return null;

  return animate(
    element,
    {
      flipX:      [`${dx}px`, "0px"],
      flipY:      [`${dy}px`, "0px"],
      flipScaleX: [`${sx}`,   "1"],
      flipScaleY: [`${sy}`,   "1"],
    },
    { duration: 280, ...defaults },
  );
};

/**
 * Animate an element from its current DOM position toward a target rect
 * (forward FLIP).
 *
 * The DOM stays at the element's current position; only the visual
 * representation is driven toward `to`. Use this for exit/collapse
 * animations where the DOM has not yet been moved.
 *
 * @param element  The element to animate.
 * @param to       The target rect to animate toward.
 * @param defaults Optional `animate()` defaults (duration, easing, delay, …).
 * @returns        The `AnimationController`, or `null` when no work is needed.
 */
export const flipToRect = (
  element: HTMLElement | SVGElement,
  to: FlipRect,
  defaults: AnimateDefaults = {},
): AnimationController | null => {
  const from = captureRect(element);
  const { dx, dy, sx, sy } = computeDelta(from, to);
  if (isIdentity(dx, dy, sx, sy)) return null;

  return animate(
    element,
    {
      flipX:      ["0px", `${dx}px`],
      flipY:      ["0px", `${dy}px`],
      flipScaleX: ["1",   `${sx}`],
      flipScaleY: ["1",   `${sy}`],
    },
    { duration: 280, ...defaults },
  );
};
