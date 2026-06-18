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
 * const from = captureRect(el);
 * await tick(); // let the DOM update
 * flipFromRect(el, from, { duration: 320 });
 *
 * // Forward FLIP (element is still at its current position, drive it away):
 * const to = targetRect;
 * flipToRect(el, to, { duration: 320 });
 * ```
 */

import { animate } from "./core/animate";
import { measureWithoutAncestorTransforms } from "./properties/properties";
import type { AnimateDefaults, AnimateProps, AnimationController, MotionElement } from "./types";

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

/** A pair of rects describing a layout change (`from` → `to`). */
export interface FlipRectPair {
  from: FlipRect;
  to: FlipRect;
}

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

export const DEFAULT_FLIP_DURATION = 280;

// ---------------------------------------------------------------------------
// Geometry — the single source of truth for FLIP delta math.
// ---------------------------------------------------------------------------

/** Capture the element's current layout rect, suppressing in-flight transforms. */
export const captureRect = (element: Element): FlipRect => {
  const { left: x, top: y, width, height } =
    measureWithoutAncestorTransforms(element);
  return { x, y, width, height };
};

/**
 * Compute the inverted transform that places the element back at `from`.
 * Components disabled in `opts` resolve to their identity.
 */
export const computeDelta = (
  { from, to }: FlipRectPair,
  { translate = true, scale = true }: DeltaOptions = {},
): FlipDelta => ({
  dx: translate ? from.x - to.x : 0,
  dy: translate ? from.y - to.y : 0,
  sx: scale && to.width > 0 ? from.width / to.width : 1,
  sy: scale && to.height > 0 ? from.height / to.height : 1,
});

/** True when the delta would produce no visible movement. */
export const isIdentityDelta = (delta: FlipDelta): boolean =>
  delta.dx === 0 && delta.dy === 0 && delta.sx === 1 && delta.sy === 1;

/**
 * Resolve the FLIP delta for a layout change, honoring direction.
 *
 * Inverse (`forward: false`): DOM is at `to`; the delta is the inverse
 * transform `(from − to)` that places the element back at `from`.
 * Forward (`forward: true`): DOM is at `from`; the rect pair is swapped so the
 * delta becomes `(to − from)`, driving the element visually toward `to`.
 *
 * This is the single source of truth for FLIP direction — both the
 * `animate()`-layer helpers and the `flip` animator route through it, so the
 * two layers can never disagree on which way a forward FLIP moves.
 */
export const resolveFlipDelta = (
  from: FlipRect,
  to: FlipRect,
  forward: boolean,
  opts?: DeltaOptions,
): FlipDelta => computeDelta(forward ? { from: to, to: from } : { from, to }, opts);

/**
 * Build the `animate()` props object for a FLIP delta.
 *
 * Inverse (default): DOM is at `to`; apply `[Δ→0]` to start visually at `from`.
 * Forward: DOM is at `from`; apply `[0→Δ]` to drive visually toward `to`.
 */
export const buildFlipProps = (
  { dx, dy, sx, sy }: FlipDelta,
  forward: boolean,
): AnimateProps => {
  const pair = (delta: string, identity: string): [string, string] =>
    forward ? [identity, delta] : [delta, identity];
  return {
    flipX:      pair(`${dx}px`, "0px"),
    flipY:      pair(`${dy}px`, "0px"),
    flipScaleX: pair(`${sx}`, "1"),
    flipScaleY: pair(`${sy}`, "1"),
  };
};

/** Shared kernel: animate the computed FLIP delta, forward or inverse. */
const applyFlipDelta = (
  element: MotionElement,
  from: FlipRect,
  to: FlipRect,
  forward: boolean,
  defaults: AnimateDefaults,
): AnimationController | null => {
  const delta = resolveFlipDelta(from, to, forward);
  if (isIdentityDelta(delta)) return null;
  return animate(
    element,
    buildFlipProps(delta, forward),
    { duration: DEFAULT_FLIP_DURATION, ...defaults },
  );
};

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
 * @param from     Rect captured before the DOM update (e.g. via `captureRect`).
 * @param defaults Optional `animate()` defaults (duration, easing, delay, …).
 * @returns        The `AnimationController`, or `null` when no work is needed.
 */
export const flipFromRect = (
  element: MotionElement,
  from: FlipRect,
  defaults: AnimateDefaults = {},
): AnimationController | null => applyFlipDelta(element, from, captureRect(element), false, defaults);

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
  element: MotionElement,
  to: FlipRect,
  defaults: AnimateDefaults = {},
): AnimationController | null => applyFlipDelta(element, captureRect(element), to, true, defaults);
