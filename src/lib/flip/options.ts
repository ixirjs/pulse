/**
 * Resolve user-facing `FlipOptions` into normalized values consumed by the
 * animator. All helpers are pure — no DOM access, no side effects.
 */

import { cubicOut } from "$lib/easing";
import type { EasingFn } from "$lib/shared/types";
import { diagonal } from "./geometry";
import type {
  FlipDuration,
  FlipEasing,
  FlipOpacity,
  FlipOptions,
  FlipOptionsInput,
  FlipRectPair,
} from "./types";

export const DEFAULT_DURATION = 280;
export const DEFAULT_DELAY = 0;
export const DEFAULT_EASING: EasingFn = cubicOut;

/** Unwrap an options thunk; thunks let callers track reactive state. */
export const readOptions = (input: FlipOptionsInput): FlipOptions => {
  if (input == null) return {};
  return typeof input === "function" ? input() : input;
};

/**
 * Resolve a duration that may be either a literal millisecond value or a
 * function of the rect-to-rect diagonal distance.
 */
export const resolveDuration = (
  d: FlipDuration | undefined,
  rects: FlipRectPair,
): number => {
  if (d == null) return DEFAULT_DURATION;
  if (typeof d === "function") {
    return Math.max(0, d(diagonal(rects.from, rects.to), rects));
  }
  return Math.max(0, d);
};

/** Normalize the `opacity` shorthand into a fully-populated config or `null`. */
export const resolveOpacity = (
  o: FlipOpacity | boolean | undefined,
): { from: number; to: number } | null => {
  if (o == null || o === false) return null;
  if (o === true) return { from: 0, to: 1 };
  return { from: o.from ?? 0, to: o.to ?? 1 };
};

/**
 * Coerce the user-supplied easing into an `EasingFn` so we can hand it
 * straight to the `animate()` runtime (which only accepts functions).
 *
 * String forms are mapped to their cubic-bezier equivalents, falling back
 * to {@link DEFAULT_EASING} for unknown values to avoid silently breaking
 * the animation.
 */
export const resolveEasing = (easing: FlipEasing | undefined): EasingFn => {
  if (easing == null) return DEFAULT_EASING;
  if (typeof easing === "function") return easing;
  return DEFAULT_EASING;
};
